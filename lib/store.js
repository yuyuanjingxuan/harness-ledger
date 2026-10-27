/**
 * harness-ledger. Persistent store for folded session entries.
 *
 * Each session keeps one JSON file in the plugin's own cache dir. On boot the
 * host loads these files so past sessions are not replayed from scratch, and
 * writes them back after each fold so progress survives a restart.
 *
 * Layout on disk, per file: the full serializeable shape of one ledger entry.
 */

import { join, dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promises as fs } from 'node:fs'

const CACHE_DIR = 'cache'
const FOLD_VERSION = 4

// The cache lives next to the plugin package itself, so it survives any
// profile layout and is easy to find when things go wrong. The legacy
// DSH_LEDGER_CACHE name remains supported so existing installations keep their
// cache location after the package rename.
function packageRoot() {
  return resolvePath(dirname(fileURLToPath(import.meta.url)), '..')
}

function resolveRoot() {
  const override = process.env.HARNESS_LEDGER_CACHE || process.env.DSH_LEDGER_CACHE
  if (override && override.trim().length > 0) return resolvePath(override)
  return join(packageRoot(), CACHE_DIR)
}

function fileFor(root, id) {
  return join(root, encodeURIComponent(id) + '.json')
}

/** Rebuild a fresh entry from a stored one. */
export function hydrateEntry(stored) {
  if (!stored || typeof stored !== 'object' || typeof stored.id !== 'string') return null
  const needsRefold = stored.foldVersion !== FOLD_VERSION
  const previousTotals = stored.totals || zeroBucket()
  const hasPreviousUsage = ['input', 'output', 'cacheRead', 'cacheWrite'].some((key) =>
    Number.isFinite(previousTotals[key]) && previousTotals[key] > 0)
  const refoldFallback = needsRefold && hasPreviousUsage
    ? {
      foldVersion: stored.foldVersion,
      lastRev: stored.lastRev,
      lastSeq: Number.isFinite(stored.lastSeq) ? stored.lastSeq : 0,
      totals: { ...previousTotals },
      providers: mapOf(stored.providers),
      models: mapOf(stored.models),
      days: mapOf(stored.days),
      steps: Number.isFinite(stored.steps) ? stored.steps : 0,
      turns: Number.isFinite(stored.turns) ? stored.turns : 0,
      requests: Array.isArray(stored.requests) ? stored.requests : [],
    }
    : null
  const entry = {
    id: stored.id,
    header: stored.header || { id: stored.id, title: '', createdAt: null },
    live: !!stored.live,
    foldVersion: needsRefold ? stored.foldVersion : FOLD_VERSION,
    refoldPending: needsRefold,
    refoldFallback,
    lastRev: needsRefold ? undefined : stored.lastRev,
    cold: needsRefold ? false : !!stored.cold,
    lastSeq: needsRefold ? 0 : Number.isFinite(stored.lastSeq) ? stored.lastSeq : 0,
    error: null,
    totals: needsRefold ? zeroBucket() : stored.totals || zeroBucket(),
    providers: needsRefold ? new Map() : mapOf(stored.providers),
    models: needsRefold ? new Map() : mapOf(stored.models),
    days: needsRefold ? new Map() : mapOf(stored.days),
    steps: needsRefold ? 0 : Number.isFinite(stored.steps) ? stored.steps : 0,
    turns: needsRefold ? 0 : Number.isFinite(stored.turns) ? stored.turns : 0,
    requests: needsRefold ? [] : Array.isArray(stored.requests) ? stored.requests : [],
  }
  return entry
}

function zeroBucket() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
}

function mapOf(obj) {
  const m = new Map()
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (v && typeof v === 'object') m.set(k, { ...v })
    }
  }
  return m
}

function plainOf(map) {
  const out = {}
  for (const [k, v] of map) out[k] = { ...v }
  return out
}

/** Shape of one entry as it is written to disk. */
export function serializeEntry(entry) {
  return {
    foldVersion: entry.foldVersion ?? FOLD_VERSION,
    id: entry.id,
    header: entry.header,
    live: entry.live,
    lastRev: entry.lastRev,
    cold: entry.cold,
    lastSeq: entry.lastSeq,
    totals: { ...entry.totals },
    providers: plainOf(entry.providers),
    models: plainOf(entry.models),
    days: plainOf(entry.days),
    steps: entry.steps,
    turns: entry.turns,
    requests: entry.requests.slice(-64),
  }
}

export class LedgerStore {
  constructor(root) {
    this.root = root || resolveRoot()
  }

  async init() {
    await fs.mkdir(this.root, { recursive: true })
  }

  /** Load every stored entry, keyed by session id. Skips unreadable files. */
  async loadAll() {
    const out = new Map()
    let names = []
    try {
      names = await fs.readdir(this.root)
    } catch {
      return out
    }
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      try {
        const raw = await fs.readFile(join(this.root, name), 'utf8')
        const parsed = JSON.parse(raw)
        const entry = hydrateEntry(parsed)
        if (entry) out.set(entry.id, entry)
      } catch {
        // one bad file must not sink the whole load
      }
    }
    return out
  }

  async save(id, entry) {
    try {
      const file = fileFor(this.root, id)
      await fs.mkdir(dirname(file), { recursive: true })
      await fs.writeFile(file, JSON.stringify(serializeEntry(entry)), 'utf8')
    } catch {
      // persistence is best effort, a failed write must not break the app
    }
  }

  async remove(id) {
    try {
      const file = fileFor(this.root, id)
      await fs.unlink(file)
    } catch {
      // already gone or unremovable
    }
  }
}
