/* dsh-ledger. Browser half.
 *
 * A floating draggable panel that polls the host route /ledger/stats and
 * renders totals, providers, the current month calendar, session detail and
 * the request trail. Loaded by the shell in module table format.
 */
window.__ModuleLoader__.load({
  id: 'dsh-ledger',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement

    const css = [
      '.ldg{--bg:#17181c;--bg1:#1d1f25;--bg2:#141519;--line1:rgba(255,255,255,.08);--line2:rgba(255,255,255,.16);--text:#e9eaee;--text2:#9ba1ac;--brand:#4f8dff;--warn:#e0a83e;--err:#f2555a;--ok:#4cb782;--shadow:0 10px 32px rgba(0,0,0,.6);font-size:13px;color:var(--text);position:fixed;width:600px;max-width:calc(100vw - 24px);max-height:min(720px,88vh);display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--line2);border-radius:12px;box-shadow:var(--shadow);z-index:1000;overflow:hidden;pointer-events:auto}',
      '.ldg-light{--bg:#ffffff;--bg1:#f6f7f9;--bg2:#eef0f3;--line1:rgba(20,24,32,.1);--line2:rgba(20,24,32,.2);--text:#1c2028;--text2:#6b7280;--brand:#2f6bff;--warn:#b57d12;--err:#d92d32;--ok:#1f9d61;--shadow:0 10px 32px rgba(15,20,30,.16)}',
      '.ldg-head{display:flex;align-items:center;gap:6px;padding:9px 12px;cursor:move;user-select:none;background:var(--bg1);border-bottom:1px solid var(--line1);flex:none}',
      '.ldg-title{font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}',
      '.ldg-btn{border:1px solid var(--line1);background:transparent;color:var(--text2);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:12px;line-height:1.6;flex:none}',
      '.ldg-btn:hover{color:var(--text);border-color:var(--line2)}',
      '.ldg-body{overflow-y:auto;padding:12px;min-height:0}',
      '.ldg-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
      '.ldg-card{background:var(--bg1);border:1px solid var(--line1);border-radius:8px;padding:7px 9px;min-width:0}',
      '.ldg-card .k{color:var(--text2);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ldg-card .v{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ldg-sec{margin:12px 0 6px;font-weight:600;color:var(--text2);font-size:12px;text-transform:uppercase;letter-spacing:.04em}',
      '.ldg-cur{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg1);border:1px solid var(--line1);border-radius:8px;margin-top:10px}',
      '.ldg-cur .name{font-weight:600}',
      '.ldg-cur .nums{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--text2);white-space:nowrap}',
      '.ldg-prov{display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px dashed var(--line1);cursor:pointer}',
      '.ldg-prov.cur{background:rgba(79,141,255,.08)}',
      '.ldg-prov .pname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ldg-prov .pnums{font-variant-numeric:tabular-nums;color:var(--text2);white-space:nowrap}',
      '.ldg-prov .parrow{color:var(--text2);flex:none}',
      '.ldg-modelrow{display:flex;align-items:center;gap:8px;padding:3px 2px 3px 16px;border-bottom:1px solid var(--line1)}',
      '.ldg-modelrow .mname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text2)}',
      '.ldg-prov-detail{padding:4px 0 8px 16px;color:var(--text2);font-size:12px;font-variant-numeric:tabular-nums}',
      '.ldg-days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:6px}',
      '.ldg-day{border-radius:6px;padding:4px 2px;text-align:center;cursor:pointer;font-size:11px;font-variant-numeric:tabular-nums;background:var(--bg2);border:1px solid var(--line1)}',
      '.ldg-day.off{opacity:.35;pointer-events:none}',
      '.ldg-day.sel{outline:2px solid var(--brand)}',
      '.ldg-sess{display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px dashed var(--line1);cursor:pointer}',
      '.ldg-sess.cur{background:rgba(79,141,255,.08)}',
      '.ldg-sess .sname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ldg-sess .snums{font-variant-numeric:tabular-nums;color:var(--text2);white-space:nowrap}',
      '.ldg-req{border-top:1px solid var(--line1);padding:3px 2px;color:var(--text2);font-size:11px;font-variant-numeric:tabular-nums;display:flex;gap:6px;flex-wrap:wrap}',
      '.ldg-empty{color:var(--text2);padding:8px 2px}',
      '.ldg-err{color:var(--err);padding:8px 2px}',
      '.ldg-foot{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--line1);color:var(--text2);font-size:11px;flex:none}',
      '.ldg-foot .sp{flex:1}',
      '.ldg-load{color:var(--text2);padding:20px 2px;text-align:center}',
    ].join('\n')

    const I18N = {
      zh: {
        title: 'Token 账本',
        openTitle: '打开 Token 账本',
        input: '输入', output: '输出', total: '总计', cache: '缓存',
        cacheRead: '缓存读', cacheWrite: '缓存写', hit: '命中率',
        sessions: '会话', steps: '步数', turns: '轮数',
        provs: '提供商', configured: '已配置 ',
        models: '模型', current: '当前会话', dayMainProv: '当日主力',
        allDays: '全部用量', refresh: '刷新', collapse: '折叠', close: '关闭',
        eng: 'EN', chn: '中',
        updatedAt: '更新于 ', auto: '每10秒', loading: '计算中...',
        error: '加载失败: ', retry: '，稍后重试',
        noProv: '暂无数据', empty: '（无标题）',
        month: '当月', dayView: '日视图',
      },
      en: {
        title: 'Token Ledger',
        openTitle: 'Open Token Ledger',
        input: 'Input', output: 'Output', total: 'Total', cache: 'Cache',
        cacheRead: 'Cache read', cacheWrite: 'Cache write', hit: 'Hit rate',
        sessions: 'Sessions', steps: 'Steps', turns: 'Turns',
        provs: 'Providers', configured: 'Configured ',
        models: 'Models', current: 'Current session', dayMainProv: 'Top provider',
        allDays: 'All days', refresh: 'Refresh', collapse: 'Collapse', close: 'Close',
        eng: 'EN', chn: '中',
        updatedAt: 'Updated ', auto: 'every 10s', loading: 'Calculating...',
        error: 'Load failed: ', retry: ', will retry',
        noProv: 'No data yet', empty: '(untitled)',
        month: 'Month', dayView: 'Day view',
      },
    }

    let ctxRef = null
    let cssId = null

    function ensureCss() {
      if (cssId) return
      cssId = 'dsh-ledger/panel.css'
      const old = document.getElementById(cssId)
      if (old) old.remove()
      const style = document.createElement('style')
      style.id = cssId
      style.textContent = css
      document.head.appendChild(style)
    }

    function fmt(n) {
      if (!Number.isFinite(n)) return '0'
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
      return String(Math.round(n))
    }

    function fmtFull(n) {
      if (!Number.isFinite(n)) return '0'
      return n.toLocaleString()
    }

    function fmtDate(ms) {
      if (!Number.isFinite(ms)) return ''
      const d = new Date(ms)
      const p = (x) => String(x).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    }

    function dayKey(ms) {
      const d = new Date(ms)
      const p = (x) => String(x).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    }

    function hitRate(input, cr, cw) {
      const total = input + cr + cw
      if (total <= 0) return 0
      return ((cr + cw) / total) * 100
    }

    function short(s, n) {
      const str = s || ''
      return str.length > n ? str.slice(0, n - 1) + '…' : str
    }

    function fetchStats() {
      return fetch('/ledger/stats', { cache: 'no-store' }).then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
    }

    function Card(props) {
      return h('div', { className: 'ldg-card', title: props.title || '' },
        h('div', { className: 'k' }, props.k),
        h('div', { className: 'v' }, props.v))
    }

    function LedgerPanel(props) {
      const { useState, useEffect, useRef, useCallback } = React
      const [data, setData] = useState(null)
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(false)
      const [mode, setMode] = useState('expanded')
      const [pos, setPos] = useState(() => {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1280
        return { x: Math.max(16, w - 616), y: 88 }
      })
      const [openProv, setOpenProv] = useState(null)
      const [openSess, setOpenSess] = useState(null)
      const [selectedDay, setSelectedDay] = useState(null)
      const [showAll, setShowAll] = useState(false)
      const [lang, setLang] = useState(() => {
        try { return localStorage.getItem('dsh-ledger-lang') || 'zh' } catch { return 'zh' }
      })
      const panelRef = useRef(null)

      const t = I18N[lang] || I18N.zh

      const theme = ctxRef ? ctxRef.get('theme') : null
      const [themeId, setThemeId] = useState(() => {
        try {
          const s = theme && theme.getTheme ? theme.getTheme() : null
          return (s && s.active && s.active.id) || (s && s.preference) || ''
        } catch { return '' }
      })
      useEffect(() => {
        if (!ctxRef || typeof ctxRef.on !== 'function') return undefined
        return ctxRef.on('theme/change', (snap) => {
          try {
            const id = (snap && snap.active && snap.active.id) || (snap && snap.preference) || ''
            if (id) setThemeId(id)
          } catch { /* ignore */ }
        })
      }, [])
      const dark = themeId !== 'light'
      const themeClass = dark ? 'ldg' : 'ldg ldg-light'

      let currentId
      try {
        if (props.useSessions) {
          const cur = props.useSessions((s) => (s ? s.current : undefined))
          if (cur !== undefined) currentId = cur
        }
      } catch { currentId = undefined }
      const currentIdRef = useRef(currentId)

      const refresh = useCallback(() => {
        setLoading(true)
        return fetchStats().then((result) => {
          if (result && result.error) { setError(String(result.error)); return }
          setData(result)
          setError(null)
        }, (e) => {
          setError((e && e.message) || String(e))
        }).finally(() => setLoading(false))
      }, [])

      useEffect(() => {
        refresh()
        const timer = window.setInterval(refresh, 10000)
        return () => window.clearInterval(timer)
      }, [refresh])

      useEffect(() => {
        if (currentId !== undefined && currentIdRef.current !== currentId) {
          currentIdRef.current = currentId
          refresh()
        }
      }, [currentId, refresh])

      function toggleLang() {
        const next = lang === 'zh' ? 'en' : 'zh'
        setLang(next)
        try { localStorage.setItem('dsh-ledger-lang', next) } catch { /* ignore */ }
      }

      function onDragStart(e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        e.preventDefault()
        const startX = e.clientX, startY = e.clientY
        const startPos = pos
        function move(ev) {
          setPos({
            x: Math.max(0, startPos.x + ev.clientX - startX),
            y: Math.max(0, startPos.y + ev.clientY - startY),
          })
        }
        function up() {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }

      function stop(e) { e.stopPropagation() }

      if (!data) {
        ensureCss()
      }
      ensureCss()

      const totals = data ? data.totals : null
      const providers = data ? data.providers || [] : []
      const days = data ? data.days || [] : []
      const sessions = data ? data.sessions || [] : []
      const pricing = data ? data.pricing || [] : []
      const isDayMode = selectedDay !== null
      const dayView = isDayMode ? days.find((d) => d.date === selectedDay) : null
      const todayKey = dayKey(Date.now())

      // Visible data depends on day mode.
      const viewProviders = isDayMode && dayView ? dayView.providers || [] : providers
      const viewSessions = isDayMode && dayView
        ? sessions.filter((s) => s.createdAt && dayKey(s.createdAt) === selectedDay).slice(0, 50)
        : (showAll ? sessions : sessions.slice(0, 50))
      const viewTotals = isDayMode && dayView
        ? { input: dayView.input, output: dayView.output, cacheRead: dayView.cacheRead, cacheWrite: dayView.cacheWrite, total: dayView.total, steps: dayView.steps }
        : totals

      const currentProviderId = (() => {
        if (!currentId) return null
        const sess = sessions.find((s) => s.id === currentId)
        if (!sess) return null
        let best = null, bestTot = -1
        for (const p of sess.providers || []) {
          if (p.total > bestTot) { best = p.id; bestTot = p.total }
        }
        return best
      })()

      const currentProv = viewProviders.find((p) => p.id === currentProviderId) || null
      const currentRow = sessions.find((s) => s.id === currentId) || null

      let head = h('div', { className: 'ldg-head', onPointerDown: onDragStart },
        h('span', { className: 'ldg-title' }, t.title),
        h('button', { className: 'ldg-btn', onPointerDown: stop, onClick: refresh, title: t.refresh }, '⟳'),
        h('button', { className: 'ldg-btn', onPointerDown: stop, onClick: toggleLang, title: lang === 'zh' ? 'English' : '中文' }, lang === 'zh' ? 'EN' : '中'),
        h('button', { className: 'ldg-btn', onPointerDown: stop, onClick: () => setMode(mode === 'expanded' ? 'collapsed' : 'expanded'), title: t.collapse }, mode === 'expanded' ? '▾' : '▸'),
        h('button', { className: 'ldg-btn', onPointerDown: stop, onClick: () => setMode('hidden'), title: t.close }, '×'),
      )

      let content
      if (error) {
        content = h('div', { className: 'ldg-err' }, t.error + error + t.retry)
      } else if (!data) {
        content = h('div', { className: 'ldg-load' }, t.loading)
      } else {
        const cards = h('div', { className: 'ldg-cards' },
          Card({ k: t.input, v: fmt(viewTotals.input) }),
          Card({ k: t.output, v: fmt(viewTotals.output) }),
          Card({ k: t.total, v: fmt(viewTotals.total) }),
          Card({ k: t.cache, v: fmt((viewTotals.cacheRead || 0) + (viewTotals.cacheWrite || 0)), title: t.cacheRead + ' ' + fmtFull(viewTotals.cacheRead) + ' · ' + t.cacheWrite + ' ' + fmtFull(viewTotals.cacheWrite) }),
          Card({ k: t.hit, v: hitRate(viewTotals.input - (viewTotals.cacheRead || 0) - (viewTotals.cacheWrite || 0), viewTotals.cacheRead, viewTotals.cacheWrite).toFixed(1) + '%' }),
          Card({ k: t.sessions, v: isDayMode ? (dayView ? dayView.sessionCount : 0) : sessions.length }),
          Card({ k: t.steps, v: viewTotals.steps || 0 }),
        )
        const cur = currentProv
          ? h('div', { className: 'ldg-cur' },
            h('span', { className: 'name' }, (isDayMode ? t.dayMainProv : t.current) + ': ' + currentProv.id),
            h('span', { className: 'nums' }, t.input + ' ' + fmt(currentProv.input) + ' · ' + t.output + ' ' + fmt(currentProv.output) + ' · ' + t.total + ' ' + fmt(currentProv.total)))
          : (currentRow ? h('div', { className: 'ldg-cur' }, h('span', { className: 'name' }, t.current + ': ' + (currentRow.title || t.empty)), h('span', { className: 'nums' }, t.total + ' ' + fmt(currentRow.total))) : null)

        const dayScale = (() => {
          let max = 0
          for (const d of days) if (d.total > max) max = d.total
          return max || 1
        })()
        const dayCells = h('div', { className: 'ldg-days' },
          days.map((d) => {
            const intensity = d.total > 0 ? Math.max(0.12, Math.log(1 + d.total / dayScale * 9) / Math.log(10)) : 0
            const selCls = selectedDay === d.date ? ' sel' : ''
            const offCls = d.total === 0 ? ' off' : ''
            return h('div', {
              key: d.date,
              className: 'ldg-day' + selCls + offCls,
              title: d.date + ' · ' + fmtFull(d.total),
              onClick: () => setSelectedDay(selectedDay === d.date ? null : d.date),
              style: { background: d.total > 0 ? 'rgba(79,141,255,' + intensity.toFixed(2) + ')' : undefined },
            }, String(d.day))
          }),
        )

        const provList = viewProviders.map((p) => {
          const expanded = openProv === p.id
          const row = h('div', {
            className: 'ldg-prov' + (p.id === currentProviderId ? ' cur' : ''),
            key: p.id,
            onClick: (e) => { e.stopPropagation(); setOpenProv(expanded ? null : p.id) },
          },
            h('span', { className: 'pname' }, p.id),
            h('span', { className: 'pnums' }, t.total + ' ' + fmt(p.total)),
            h('span', { className: 'parrow' }, expanded ? '▾' : '▸'),
          )
          if (!expanded) return row
          const detail = h('div', { className: 'ldg-prov-detail', key: p.id + '-d' },
            t.input + ' ' + fmt(p.input) + ' · ' + t.output + ' ' + fmt(p.output) + ' · ' +
            t.cacheRead + ' ' + fmt(p.cacheRead) + ' · ' + t.cacheWrite + ' ' + fmt(p.cacheWrite) + ' · ' +
            t.hit + ' ' + hitRate(p.input - (p.cacheRead || 0) - (p.cacheWrite || 0), p.cacheRead, p.cacheWrite).toFixed(1) + '%',
          )
          const models = (p.models || []).map((m) =>
            h('div', { className: 'ldg-modelrow', key: p.id + ':' + m.model },
              h('span', { className: 'mname' }, m.model),
              h('span', { className: 'snums' }, t.total + ' ' + fmt(m.total)),
            ),
          )
          let priceNote = null
          if (p.price && (p.price.inputPerM || p.price.outputPerM)) {
            const est = ((p.input / 1e6) * (p.price.inputPerM || 0)) + ((p.output / 1e6) * (p.price.outputPerM || 0))
            priceNote = h('div', { className: 'ldg-modelrow', key: p.id + '-price' },
              h('span', { className: 'mname' }, '≈ ¥' + est.toFixed(2)),
            )
          }
          return [row, detail, models, priceNote]
        })

        const dayBar = isDayMode
          ? h('button', { className: 'ldg-btn', onClick: () => setSelectedDay(null) }, '← ' + t.allDays)
          : null

        const sessList = viewSessions.map((s) => {
          const expanded = openSess === s.id
          const row = h('div', {
            className: 'ldg-sess' + (s.id === currentId ? ' cur' : ''),
            key: s.id,
            onClick: (e) => { e.stopPropagation(); setOpenSess(expanded ? null : s.id) },
          },
            h('span', { className: 'sname' }, s.title || t.empty),
            h('span', { className: 'snums' }, fmt(s.total) + ' · ' + s.steps + t.steps),
          )
          if (!expanded) return row
          const detail = h('div', { className: 'ldg-prov-detail', key: s.id + '-d' },
            t.input + ' ' + fmt(s.input) + ' · ' + t.output + ' ' + fmt(s.output) + ' · ' +
            t.cacheRead + ' ' + fmt(s.cacheRead) + ' · ' + t.cacheWrite + ' ' + fmt(s.cacheWrite) + ' · ' +
            t.turns + ' ' + (s.turns || 0),
          )
          const reqs = (s.requests || []).map((r, i) =>
            h('div', { className: 'ldg-req', key: s.id + ':req' + i },
              h('span', null, fmtDate(r.time)),
              h('span', null, r.provider),
              r.model ? h('span', null, r.model) : null,
              h('span', null, t.input + ' ' + fmt(r.usage.input)),
              h('span', null, t.output + ' ' + fmt(r.usage.output)),
            ),
          )
          return [row, detail, reqs]
        })

        const pricingBar = pricing.length > 0
          ? h('div', null, pricing.map((pr) => h('div', { className: 'ldg-modelrow', key: pr.id },
            h('span', { className: 'mname' }, pr.id),
            h('span', { className: 'snums' }, (pr.inputPerM != null ? 'in ¥' + pr.inputPerM + '/M' : '') + (pr.outputPerM != null ? ' out ¥' + pr.outputPerM + '/M' : ''))))
          )
          : null

        const daySwitch = h('div', null,
          h('span', { className: 'ldg-sec' }, (isDayMode ? t.dayView : t.month) + ' · ' + (isDayMode ? selectedDay : dayKey(Date.now()).slice(0, 7))),
          dayBar,
          dayCells,
        )

        content = h('div', null,
          cards,
          cur,
          h('div', { className: 'ldg-sec' }, t.provs + ' · ' + viewProviders.length),
          provList.length ? provList : h('div', { className: 'ldg-empty' }, t.noProv),
          pricingBar,
          daySwitch,
          h('div', { className: 'ldg-sec' }, t.sessions),
          sessList.length ? sessList : h('div', { className: 'ldg-empty' }, t.noProv),
        )
      }

      if (mode === 'hidden') {
        return h('div', {
          className: themeClass + ' ldg-mini',
          style: { position: 'fixed', right: '20px', bottom: '20px', width: 'fit-content' },
          onClick: () => setMode('expanded'),
          title: t.openTitle,
        },
          h('div', { className: 'ldg-head', style: { cursor: 'pointer' } },
            h('span', { className: 'ldg-title' }, fmt(totals ? totals.total : 0) + ' tokens'),
          ),
        )
      }

      if (mode === 'collapsed') {
        return h('div', { className: themeClass, style: { left: pos.x, top: pos.y, width: '340px' } },
          head,
          h('div', { className: 'ldg-body' },
            totals ? h('div', { className: 'ldg-cards' },
              Card({ k: t.total, v: fmt(totals.total) }),
              Card({ k: t.steps, v: totals.steps }),
              Card({ k: t.sessions, v: sessions.length }),
            ) : h('div', { className: 'ldg-load' }, t.loading),
          ),
        )
      }

      return h('div', { ref: panelRef, className: themeClass, style: { left: pos.x, top: pos.y } },
        head,
        h('div', { className: 'ldg-body' }, content),
        h('div', { className: 'ldg-foot' },
          h('span', null, t.updatedAt + (data ? fmtDate(data.generatedAt) : '')),
          h('span', { className: 'sp' }, null),
          h('span', null, t.auto + (loading ? '·' + t.loading : '')),
        ),
      )
    }

    function apply(ctx) {
      ctxRef = ctx
      ctx.slots.inject('shell.overlay', () => {
        return ctx.slots.register(
          { name: 'shell.overlay', id: 'dsh-ledger-panel', order: 0 },
          (props) => React.createElement(LedgerPanel, props),
        )
      })
    }

    exports.apply = apply
    exports.inject = ['slots']
    return module.exports
  },
})
