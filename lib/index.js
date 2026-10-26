/**
 * dsh-ledger. Host half.
 *
 * Walks dsh session logs and folds every token usage sample into a compact
 * in-memory ledger: totals, per provider and per model buckets, a current
 * month calendar, and per session plus per request records.
 *
 * The plugin serves a single JSON route (/ledger/stats) that the browser half
 * polls. All reads go through dsh public services (sessionQuery, the jsonl
 * persistence handle, and the projection cache), so it stays compatible with
 * the host it runs on instead of trusting raw storage formats.
 */

import { LedgerStore } from './store.js'

const STEP_END = 'step/end'
const TURN_END = 'turn/end'
const USAGE_EVENTS = new Set(['assistant/message', 'assistant/attempt'])

const DAILY_LIMIT = 64
const POOL_SIZE = 6
const MAX_SESSIONS = 4000

/** A blank usage bucket. */
function zero() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
}

function cloneBucket(b) {
  return { ...b }
}

/** Sum b into a (mutates a, returns a). */
function addInto(a, b) {
  a.input += b.input || 0
  a.output += b.output || 0
  a.cacheRead += b.cacheRead || 0
  a.cacheWrite += b.cacheWrite || 0
  a.reasoning += b.reasoning || 0
  return a
}

/**
 * Normalize whatever a provider reports for one request into the bucket shape.
 * Handles both the raw usage object and the token-meter style totals.
 */
function usageToBucket(u) {
  const out = zero()
  if (!u || typeof u !== 'object') return out
  const input = u.uncachedInputTokens ?? u.inputTokens ?? u.promptTokens
  const output = u.outputTokens ?? u.completionTokens
  if (Number.isFinite(input) && input > 0) out.input = Math.round(input)
  if (Number.isFinite(u.cacheReadTokens)) out.cacheRead = Math.round(u.cacheReadTokens)
  if (Number.isFinite(u.cacheWriteTokens)) out.cacheWrite = Math.round(u.cacheWriteTokens)
  if (Number.isFinite(output) && output > 0) out.output = Math.round(output)
  if (Number.isFinite(u.reasoningTokens)) out.reasoning = Math.round(u.reasoningTokens)
  return out
}

function bucketTotal(b) {
  return b.input + b.cacheRead + b.cacheWrite + b.output
}

function localDay(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function monthKeyOf(day) {
  return day.slice(0, 7)
}

function runPool(items, limit, fn) {
  const queue = items.slice()
  const workers = []
  const n = Math.min(limit, queue.length)
  for (let i = 0; i < n; i++) {
    workers.push((async () => {
      while (queue.length) {
        const item = queue.shift()
        await fn(item)
      }
    })())
  }
  return Promise.all(workers)
}

/**
 * The per session ledger entry. `cold` means the full log was folded once;
 * afterwards only new events past `lastSeq` are replayed.
 */
function makeEntry(header) {
  return {
    id: header.id,
    header,
    live: false,
    lastRev: undefined,
    cold: false,
    lastSeq: 0,
    error: null,
    totals: zero(),
    providers: new Map(), // provider id -> bucket
    models: new Map(), // provider\0model -> bucket
    days: new Map(), // YYYY-MM-DD -> bucket
    steps: 0,
    turns: 0,
    requests: [], // capped ring of per request ({ time, provider, model, usage })
  }
}

function providerOf(event) {
  const d = event.data
  if (!d) return null
  const provider = d.message?.source?.provider ?? d.provider ?? d.providerId ?? d.route
  return typeof provider === 'string' && provider ? provider : null
}

function modelOf(event) {
  const d = event.data
  if (!d) return null
  const model = d.message?.source?.model ?? d.model ?? d.modelId
  return typeof model === 'string' && model ? model : null
}

function foldSample(entry, event) {
  const usage = usageToBucket(event.data.usage ?? event.data.tokenUsage ?? event.data)
  const total = bucketTotal(usage)
  if (total <= 0) return
  addInto(entry.totals, usage)
  const prov = providerOf(event) || 'unknown'
  addInto(entry.providers.get(prov) || entry.providers.set(prov, zero()).get(prov), usage)
  const model = modelOf(event)
  if (model) {
    const mk = prov + '\u0000' + model
    addInto(entry.models.get(mk) || entry.models.set(mk, zero()).get(mk), usage)
  }
  const time = event.time || event.timestamp || Date.now()
  if (Number.isFinite(time)) {
    const day = localDay(time)
    addInto(entry.days.get(day) || entry.days.set(day, zero()).get(day), usage)
  }
  entry.requests.push({
    time: Number.isFinite(time) ? time : Date.now(),
    provider: prov,
    model: model || null,
    usage: cloneBucket(usage),
  })
  if (entry.requests.length > DAILY_LIMIT) entry.requests.shift()
}

function foldEvent(entry, event) {
  switch (event.type) {
    case STEP_END:
      entry.steps += 1
      break
    case TURN_END:
      entry.turns += 1
      break
    default:
      if (USAGE_EVENTS.has(event.type)) foldSample(entry, event)
  }
}

function foldEvents(entry, events) {
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    foldEvent(entry, ev)
    if (typeof ev.seq === 'number' && ev.seq > entry.lastSeq) entry.lastSeq = ev.seq
  }
}

function toRecords(maps, keyOf) {
  const out = []
  for (const [k, b] of maps) {
    out.push({ key: keyOf(k), ...cloneBucket(b), total: bucketTotal(b) })
    maps.delete(k)
  }
  return out
}

/**
 * Build the response payload from the folded entries plus the configured
 * provider roster. Pure function over state.
 */
function sessionLabel(header) {
  const raw = typeof header?.title === 'string' ? header.title.trim() : ''
  if (raw) return raw
  const cwd = typeof header?.cwd === 'string' ? header.cwd.trim() : ''
  if (cwd) {
    const name = cwd.split(/[\\/]/).filter(Boolean).pop()
    if (name && name !== '.') return name
    return cwd
  }
  const id = typeof header?.id === 'string' ? header.id : ''
  if (id) return id.slice(0, 8)
  return '(untitled)'
}

function buildReport(entries, configured, pricing, now) {
  const totals = zero()
  const providers = new Map()
  const models = new Map()
  const days = new Map()
  const stepAgg = new Map()
  const turnAgg = new Map()
  const sessions = []
  const monthPrefix = monthKeyOf(localDay(now))
  let stepTotal = 0
  let turnTotal = 0

  for (const e of entries) {
    addInto(totals, e.totals)
    stepTotal += e.steps
    turnTotal += e.turns
    for (const [p, b] of e.providers) {
      addInto(providers.get(p) || providers.set(p, zero()).get(p), b)
    }
    for (const [mk, b] of e.models) {
      addInto(models.get(mk) || models.set(mk, zero()).get(mk), b)
    }
    for (const [d, b] of e.days) {
      if (!d.startsWith(monthPrefix)) continue
      addInto(days.get(d) || days.set(d, zero()).get(d), b)
      stepAgg.set(d, (stepAgg.get(d) || 0) + e.steps)
      turnAgg.set(d, (turnAgg.get(d) || 0) + e.turns)
    }
    sessions.push({
      id: e.id,
      title: sessionLabel(e.header),
      createdAt: e.header.createdAt || null,
      live: !!e.live,
      error: e.error,
      ...cloneBucket(e.totals),
      total: bucketTotal(e.totals),
      steps: e.steps,
      turns: e.turns,
      requests: e.requests.slice(-20),
      providers: toRecords(new Map(e.providers), (k) => k),
    })
  }

  sessions.sort((a, b) => b.total - a.total)

  const providerRows = []
  for (const id of configured) {
    if (!providers.has(id)) providers.set(id, zero())
  }
  for (const [id, b] of providers) {
    const modelRows = []
    for (const [mk, mb] of models) {
      const sep = mk.indexOf('\u0000')
      if (sep === -1 || mk.slice(0, sep) !== id) continue
      modelRows.push({ model: mk.slice(sep + 1), ...cloneBucket(mb), total: bucketTotal(mb) })
    }
    modelRows.sort((a, b) => b.total - a.total)
    const price = pricing ? pricing[id] || null : null
    providerRows.push({
      id,
      ...cloneBucket(b),
      total: bucketTotal(b),
      models: modelRows,
      price,
    })
  }
  providerRows.sort((a, b) => b.total - a.total)

  // Calendar: full current month, empty future days omitted from clients by total.
  const daysOut = []
  const nowD = new Date(now)
  const dim = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate()
  for (let d = 1; d <= dim; d++) {
    const date = new Date(nowD.getFullYear(), nowD.getMonth(), d)
    const key = localDay(date.getTime())
    const b = days.get(key) || zero()
    daysOut.push({
      date: key,
      day: d,
      ...cloneBucket(b),
      total: bucketTotal(b),
      steps: stepAgg.get(key) || 0,
      turns: turnAgg.get(key) || 0,
      sessions: sessions.filter((s) => s.createdAt && localDay(s.createdAt) === key).length,
    })
  }

  const pricingRows = pricing
    ? Object.keys(pricing).map((id) => ({ id, ...pricing[id] }))
    : []

  return {
    generatedAt: now,
    totals: { ...cloneBucket(totals), total: bucketTotal(totals), steps: stepTotal, turns: turnTotal },
    providers: providerRows,
    days: daysOut,
    sessions,
    pricing: pricingRows,
  }
}

export function apply(ctx) {
  const books = new Map()
  const titleChecks = new Map()
  const store = new LedgerStore()
  let inflight = null
  let ready = null
  const dirty = new Set()
  let saveTimer = null

  const ensureReady = () => {
    if (!ready) {
      ready = store.init().then(() => store.loadAll()).catch(() => new Map())
    }
    return ready
  }

  const markDirty = (id) => {
    dirty.add(id)
    if (!saveTimer) {
      saveTimer = setTimeout(() => {
        saveTimer = null
        const ids = [...dirty]
        dirty.clear()
        Promise.all(ids.map((id) => {
          const entry = books.get(id)
          if (!entry) return null
          return store.save(id, entry)
        })).finally(() => {})
      }, 2500)
    }
  }

  const readFresh = async (id, fromSeq) => {
    const persistence = ctx.get('sessionPersistence')
    if (!persistence || typeof persistence.open !== 'function') return { events: [] }
    let handle = null
    try {
      handle = await persistence.open(id, 'read')
      const { events } = await handle.read(Math.max(0, fromSeq))
      return { events: events || [] }
    } finally {
      if (handle && typeof handle.close === 'function') {
        try { await handle.close() } catch { /* ignore */ }
      }
    }
  }

  const readFull = async (id) => {
    const sessionQuery = ctx.get('sessionQuery')
    if (!sessionQuery || typeof sessionQuery.readSession !== 'function') return { header: null, events: [] }
    const log = await sessionQuery.readSession(id)
    return {
      header: log.session || null,
      inheritedEventCount: log.inheritedEventCount || 0,
      events: log.events || [],
    }
  }

  const compute = async () => {
    const sessionQuery = ctx.get('sessionQuery')
    const sessions = ctx.get('sessions')
    const llm = ctx.get('llm')
    const settings = ctx.get('settings')
    const cache = ctx.get('sessionProjectionCache')
    if (!sessionQuery || !sessions || !llm) return { error: 'service-unavailable' }

    // Configured provider roster, purely for display ordering.
    const configured = []
    try {
      const pi = settings ? settings.get('llm-pi-ai') : null
      if (pi && pi.providers && typeof pi.providers === 'object') {
        for (const k of Object.keys(pi.providers)) configured.push(k)
      }
      const dl = settings ? settings.get('llm-deepseek') : null
      if (dl && typeof dl === 'object') configured.push('deepseek-official')
    } catch { /* settings read is best-effort */ }

    const records = await sessionQuery.listSessions()
    const liveSet = new Set(sessions.list().map((s) => s.id))
    const totalCount = records.length
    const covered = records.slice(0, MAX_SESSIONS)

    // Load persisted folds once (first round), then reuse them so old sessions
    // are not replayed from the logs after a restart.
    const stored = await ensureReady()
    for (const [id, entry] of stored) {
      if (!books.has(id)) books.set(id, entry)
    }

    const stamp = Date.now()

    await runPool(covered, POOL_SIZE, async (rec) => {
      const id = rec.header.id
      let entry = books.get(id)
      if (!entry) {
        entry = makeEntry(rec.header)
        books.set(id, entry)
      }
      entry.header = {
        ...entry.header,
        ...rec.header,
        title: rec.header.title || entry.header.title || '',
      }
      entry.live = liveSet.has(id)
      const live = entry.live
      const changed = rec.revision === undefined || entry.lastRev === undefined || entry.lastRev !== rec.revision

      if (!live) {
        // Cold sessions fold once, then never change. A restored entry is
        // already folded, so nothing to do unless it is marked dirty again.
        if (!entry.cold) {
          try {
            const full = await readFull(id)
            if (full.header) entry.header = full.header
            foldEvents(entry, full.events)
            if (cache && typeof cache.coldSnapshot === 'function') {
              try {
                cache.coldSnapshot(full.header, full.inheritedEventCount, full.events)
              } catch (e) {
                entry.error = 'coldSnapshot: ' + (e && e.message ? e.message : String(e))
              }
            }
            entry.cold = true
            markDirty(id)
          } catch (e) {
            entry.error = e && e.message ? e.message : String(e)
          }
        }
        if (rec.revision !== undefined) entry.lastRev = rec.revision
      } else if (changed || !entry.cold) {
        try {
          if (!entry.cold) {
            const full = await readFull(id)
            if (full.header) entry.header = full.header
            foldEvents(entry, full.events)
            if (cache && typeof cache.coldSnapshot === 'function') {
              try { cache.coldSnapshot(full.header, full.inheritedEventCount, full.events) } catch { /* best-effort */ }
            }
            entry.cold = true
          } else {
            // Only new events past the watermark, incremented from where the
            // last fold (in memory or restored from disk) stopped.
            const tail = await readFresh(id, entry.lastSeq + 1)
            foldEvents(entry, tail.events)
          }
          markDirty(id)
        } catch (e) {
          entry.error = e && e.message ? e.message : String(e)
        }
        if (rec.revision !== undefined) entry.lastRev = rec.revision
      }
    })

    const known = new Set(covered.map((r) => r.header.id))
    if (typeof sessionQuery.readTitleSnapshots === 'function') {
      const candidates = [...books.values()].filter((entry) =>
        known.has(entry.id) && (!titleChecks.has(entry.id) || titleChecks.get(entry.id) !== entry.lastRev))
      if (candidates.length) {
        try {
          const snapshots = await sessionQuery.readTitleSnapshots(candidates.map((entry) => entry.id))
          for (let i = 0; i < candidates.length; i++) {
            const result = snapshots[i]
            if (!result || result.status !== 'fulfilled') continue
            const entry = candidates[i]
            titleChecks.set(entry.id, entry.lastRev)
            const title = typeof result.value?.title === 'string' ? result.value.title.trim() : ''
            if (title && title !== entry.header.title) {
              entry.header = { ...entry.header, title }
              markDirty(entry.id)
            }
          }
        } catch { /* title lookup is best-effort */ }
      }
    }

    // Drop books and their persisted files when sessions are gone.
    for (const id of books.keys()) {
      if (!known.has(id)) {
        books.delete(id)
        titleChecks.delete(id)
        store.remove(id)
      }
    }

    // Pricing extension: per provider per-million-token rates. Empty until the
    // user configures them, but the shape is part of the contract.
    const pricing = {}
    try {
      const cfg = settings ? settings.get('dsh-ledger') : null
      if (cfg && cfg.pricing && typeof cfg.pricing === 'object') {
        for (const [k, v] of Object.entries(cfg.pricing)) {
          if (v && typeof v === 'object') pricing[k] = { inputPerM: v.inputPerM || null, outputPerM: v.outputPerM || null }
        }
      }
    } catch { /* best-effort */ }

    return buildReport([...books.values()], configured, pricing, stamp)
  }

  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(() => httpCtx.webServer.register({
      kind: 'exact',
      path: '/ledger/stats',
      handler: async (req, res) => {
        try {
          let task = inflight
          if (!task) {
            task = compute().finally(() => { inflight = null })
            inflight = task
          }
          const payload = await task
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.end(JSON.stringify(payload))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: e && e.message ? e.message : String(e) }))
        }
      },
    }), 'dsh-ledger: /ledger/stats route')
  })
}

export const name = 'ledger'
