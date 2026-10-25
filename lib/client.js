/* dsh-ledger. Browser half.
 *
 * A floating draggable panel that polls the host route /ledger/stats and
 * renders a polished account: a hero donut with totals, stat cards, provider
 * rows with share bars, a monthly heatmap with a custom tooltip, and session
 * detail with the request trail. Loaded by the shell in module table format.
 */
window.__ModuleLoader__.load({
  id: 'dsh-ledger',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement

    const css = [
      /* base look: a soft glass panel with a murmur of gradient light */
      '.ldg{--bg:#0f1117;--bg2:#171a22;--bg3:#1e222c;--line1:rgba(255,255,255,.07);--line2:rgba(255,255,255,.14);--text:#eef0f6;--text2:#9aa1b0;--text3:#6f7684;--brand:#4f8dff;--brand2:#7aa7ff;--input:#fea75b;--output:#5cc9a0;--cache:#8f7bff;--cache2:#c7b9ff;--shadow:0 18px 50px rgba(0,0,0,.55),0 4px 14px rgba(0,0,0,.35);font-size:13px;color:var(--text);position:fixed;width:600px;max-width:calc(100vw - 24px);max-height:min(760px,90vh);display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(30,34,44,.92),rgba(15,17,23,.96));border:1px solid var(--line2);border-radius:18px;box-shadow:var(--shadow);z-index:1000;overflow:hidden;pointer-events:auto;backdrop-filter:blur(2px)}',
      '.ldg-light{--bg:#fbfbfd;--bg2:#f3f4f8;--bg3:#eceef4;--line1:rgba(20,28,45,.09);--line2:rgba(20,28,45,.16);--text:#20242e;--text2:#5b6472;--text3:#98a0ad;--brand:#3368f5;--brand2:#5b86f8;--input:#f0803c;--output:#2e9d70;--cache:#7456e6;--cache2:#a98ff0;--shadow:0 18px 44px rgba(35,45,75,.22),0 4px 12px rgba(35,45,75,.1)}',
      '.ldg *{scrollbar-width:thin;scrollbar-color:var(--line2) transparent}',
      '.ldg *::-webkit-scrollbar{width:8px;height:8px}',
      '.ldg *::-webkit-scrollbar-thumb{background:var(--line2);border-radius:8px}',
      '.ldg-head{display:flex;align-items:center;gap:8px;padding:12px 14px;cursor:move;user-select:none;background:linear-gradient(180deg,rgba(255,255,255,.035),transparent);border-bottom:1px solid var(--line1);flex:none}',
      '.ldg-mark{width:9px;height:9px;border-radius:50%;background:var(--brand);box-shadow:0 0 12px var(--brand);flex:none}',
      '.ldg-title{font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;letter-spacing:.01em}',
      '.ldg-btn{border:1px solid var(--line1);background:rgba(255,255,255,.02);color:var(--text2);border-radius:9px;width:28px;height:28px;cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;flex:none;transition:all .15s ease;padding:0}',
      '.ldg-btn:hover{color:var(--text);border-color:var(--line2);background:rgba(255,255,255,.06);transform:translateY(-1px)}',
      '.ldg-btn:active{transform:translateY(0)}',
      '.ldg-body{overflow-y:auto;padding:14px 14px 10px;min-height:0}',
      /* hero row: donut on the left, big number + sub stats on the right */
      '.ldg-hero{display:flex;gap:16px;align-items:center;padding:4px 2px 12px;border-bottom:1px solid var(--line1);margin-bottom:12px}',
      '.ldg-donut{position:relative;width:108px;height:108px;flex:none}',
      '.ldg-donut svg{transform:rotate(-90deg)}',
      '.ldg-donut .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}',
      '.ldg-donut .cv{font-size:21px;font-weight:700;letter-spacing:.01em}',
      '.ldg-donut .ck{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;margin-top:1px}',
      '.ldg-heromain{flex:1;min-width:0}',
      '.ldg-herok{font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.07em}',
      '.ldg-herov{font-size:30px;font-weight:700;letter-spacing:.01em;font-variant-numeric:tabular-nums;line-height:1.1;margin:2px 0 6px}',
      '.ldg-herosub{display:flex;gap:6px;flex-wrap:wrap}',
      '.ldg-pill{font-size:11px;color:var(--text2);background:var(--bg2);border:1px solid var(--line1);border-radius:999px;padding:3px 9px;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.ldg-pill b{color:var(--text);font-weight:600;margin-left:1px}',
      /* stat cards */
      '.ldg-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
      '.ldg-card{background:linear-gradient(160deg,var(--bg2),var(--bg));border:1px solid var(--line1);border-radius:12px;padding:9px 11px;min-width:0;position:relative;overflow:hidden;transition:transform .15s ease,border-color .15s ease}',
      '.ldg-card:hover{transform:translateY(-2px);border-color:var(--line2)}',
      '.ldg-card .k{color:var(--text2);font-size:10px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ldg-card .v{font-size:17px;font-weight:650;font-variant-numeric:tabular-nums;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ldg-card .glow{position:absolute;right:-18px;top:-18px;width:48px;height:48px;border-radius:50%;filter:blur(14px);opacity:.5}',
      '.ldg-sec{margin:16px 0 8px;font-weight:650;color:var(--text);font-size:12px;text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;gap:8px}',
      '.ldg-sec .sub{color:var(--text3);text-transform:none;letter-spacing:0;font-weight:400;font-size:11px}',
      '.ldg-sec .sp{flex:1}',
      /* provider rows */
      '.ldg-prov{display:flex;align-items:center;gap:9px;padding:7px 4px;border-bottom:1px dashed var(--line1);cursor:pointer;border-radius:8px;transition:background .12s ease}',
      '.ldg-prov:hover{background:rgba(255,255,255,.02)}',
      '.ldg-prov.cur{background:rgba(79,141,255,.09)}',
      '.ldg-dot{width:8px;height:8px;border-radius:50%;flex:none}',
      '.ldg-prow{flex:1;min-width:0}',
      '.ldg-pline{display:flex;gap:8px;align-items:center;min-width:0}',
      '.ldg-pname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}',
      '.ldg-pnums{font-variant-numeric:tabular-nums;color:var(--text2);white-space:nowrap;font-size:12px}',
      '.ldg-bar{position:relative;height:4px;border-radius:4px;background:var(--bg3);margin-top:5px;overflow:hidden}',
      '.ldg-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;transition:width .5s ease}',
      '.ldg-arrow{color:var(--text3);flex:none;transition:transform .2s ease}',
      '.ldg-prov.open .ldg-arrow,.ldg-sess.open .ldg-arrow{transform:rotate(90deg)}',
      '.ldg-exgrid{display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease;overflow:hidden}',
      '.ldg-exgrid.open{grid-template-rows:1fr}',
      '.ldg-gridin{overflow:hidden;min-height:0}',
      '.ldg-prov-detail{padding:6px 2px 8px 17px;color:var(--text2);font-size:12px;font-variant-numeric:tabular-nums;line-height:1.7}',
      '.ldg-modelrow{display:flex;align-items:center;gap:8px;padding:3px 2px 3px 17px;border-bottom:1px solid var(--line1);font-size:12px}',
      '.ldg-modelrow .mname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text2)}',
      '.ldg-modelrow .mbar{width:64px}',
      '.ldg-modelrow .snums{font-variant-numeric:tabular-nums;color:var(--text2);white-space:nowrap}',
      /* heatmap */
      '.ldg-heat-legend{display:flex;align-items:center;gap:5px;color:var(--text3);font-size:10px}',
      '.ldg-heat-steps{display:flex;gap:3px;align-items:center}',
      '.ldg-heat-steps i{width:9px;height:9px;border-radius:3px}',
      '.ldg-days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:8px}',
      '.ldg-day{position:relative;border-radius:9px;padding:6px 2px;text-align:center;cursor:pointer;font-size:11px;font-variant-numeric:tabular-nums;background:var(--bg2);border:1px solid var(--line1);font-weight:500;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease}',
      '.ldg-day:hover{transform:scale(1.08);z-index:2;border-color:var(--brand)}',
      '.ldg-day.sel{outline:2px solid var(--brand);outline-offset:1px}',
      '.ldg-day.today{box-shadow:inset 0 0 0 1.5px var(--brand2)}',
      '.ldg-day.off{opacity:.3;pointer-events:none}',
      /* sessions */
      '.ldg-sess{display:flex;align-items:center;gap:9px;padding:8px 4px;border-bottom:1px dashed var(--line1);cursor:pointer;border-radius:8px;transition:background .12s ease}',
      '.ldg-sess:hover{background:rgba(255,255,255,.02)}',
      '.ldg-sess.cur{background:rgba(79,141,255,.09)}',
      '.ldg-sess .sname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}',
      '.ldg-sess .snums{font-variant-numeric:tabular-nums;color:var(--text2);white-space:nowrap;font-size:12px}',
      '.ldg-req{border-top:1px solid var(--line1);padding:6px 2px 6px 17px;color:var(--text2);font-size:11px;font-variant-numeric:tabular-nums;display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.ldg-req .rt{color:var(--text3)}',
      '.ldg-req .rpd{background:var(--bg3);border-radius:6px;padding:1px 6px}',
      '.ldg-empty{color:var(--text3);padding:10px 2px;font-size:12px}',
      '.ldg-err{color:var(--warn);padding:10px 2px}',
      /* footer */
      '.ldg-foot{display:flex;align-items:center;gap:8px;padding:8px 14px;border-top:1px solid var(--line1);color:var(--text3);font-size:10.5px;flex:none}',
      '.ldg-foot .sp{flex:1}',
      '.ldg-live{width:7px;height:7px;border-radius:50%;background:var(--ok);flex:none;animation:ldgPulse 2s ease infinite}',
      '@keyframes ldgPulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '.ldg-load{color:var(--text2);padding:26px 2px;text-align:center}',
      /* custom tooltip */
      '.ldg-tip{position:absolute;z-index:5;pointer-events:none;background:rgba(18,21,29,.96);border:1px solid var(--line2);border-radius:9px;padding:7px 10px;font-size:11px;color:var(--text);box-shadow:var(--shadow);white-space:nowrap;transform:translate(-50%,calc(-100% - 10px));animation:ldgTip .12s ease-out}',
      '.ldg-light .ldg-tip{background:rgba(255,255,255,.98);color:var(--text)}',
      '@keyframes ldgTip{from{opacity:0;transform:translate(-50%,calc(-100% - 4px))}to{opacity:1;transform:translate(-50%,calc(-100% - 10px))}}',
      '.ldg-tip .t1{font-weight:600;margin-bottom:2px}',
      '.ldg-tip .t2{color:var(--text2)}',
      /* mini pill when collapsed */
      '.ldg-mini{position:fixed;left:20px;bottom:20px;display:flex;align-items:center;gap:9px;padding:9px 15px 9px 11px;background:linear-gradient(160deg,var(--bg3),var(--bg2));border:1px solid var(--line2);border-radius:999px;box-shadow:var(--shadow);cursor:pointer;font-size:12px;color:var(--text);animation:ldgFade .25s ease}',
      '.ldg-mini:hover{transform:translateY(-2px)}',
      '.ldg-mini .mk{width:8px;height:8px;border-radius:50%;background:var(--brand);box-shadow:0 0 10px var(--brand)}',
      '.ldg-mini b{font-variant-numeric:tabular-nums;font-weight:650}',
      '@keyframes ldgFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      /* small stat card grid for collapsed mode */
      '.ldg-cards.c3{grid-template-columns:repeat(3,1fr)}',
    ].join('\n')

    const PALETTE = ['#4f8dff', '#5cc9a0', '#8f7bff', '#fea75b', '#f2555a', '#35c7d9', '#e8c766', '#9e8cff', '#e57fd8', '#7ac46e']
    const BRAND = '#4f8dff'

    // Stable color per provider id, so a polling refresh never shifts the bars.
    function colorOf(id) {
      let sum = 0
      for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i) * 31) % 9973
      return PALETTE[sum % PALETTE.length]
    }

    const I18N = {
      zh: {
        title: 'Token 账本',
        openTitle: '打开 Token 账本',
        input: '输入', output: '输出', total: '总计', cache: '缓存',
        cacheRead: '缓存读', cacheWrite: '缓存写', hit: '命中率',
        sessions: '会话', steps: '步数', turns: '轮数', requests: '请求',
        provs: '提供商', models: '模型', current: '当前', dayMainProv: '当日主力',
        allDays: '全部', refresh: '刷新', collapse: '折叠', close: '关闭',
        updatedAt: '更新于 ', auto: '每10秒', loading: '计算中', counting: '…',
        error: '加载失败', retry: '稍后重试', noProv: '暂无数据', empty: '（无标题）',
        month: '本月用量', today: '今天', dayView: '日视图', overDays: '近30天',
      },
      en: {
        title: 'Token Ledger',
        openTitle: 'Open Token Ledger',
        input: 'Input', output: 'Output', total: 'Total', cache: 'Cache',
        cacheRead: 'Cache read', cacheWrite: 'Cache write', hit: 'Hit rate',
        sessions: 'Sessions', steps: 'Steps', turns: 'Turns', requests: 'Requests',
        provs: 'Providers', models: 'Models', current: 'Current', dayMainProv: 'Top provider',
        allDays: 'All', refresh: 'Refresh', collapse: 'Collapse', close: 'Close',
        updatedAt: 'Updated ', auto: 'every 10s', loading: 'Loading', counting: '…',
        error: 'Load failed', retry: 'will retry', noProv: 'No data yet', empty: '(untitled)',
        month: 'This month', today: 'Today', dayView: 'Day view', overDays: 'Last 30 days',
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
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
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
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    }

    function dayKey(ms) {
      const d = new Date(ms)
      const p = (x) => String(x).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    }

    function hitRate(input, cacheTotal) {
      const total = input + cacheTotal
      if (total <= 0) return 0
      return (cacheTotal / total) * 100
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

    /* A share bar: small rounded track with a filled portion. */
    function ShareBar(props) {
      const pct = props.ratio > 0 ? Math.max(3, Math.min(100, props.ratio * 100)) : 0
      return h('div', { className: 'ldg-bar', style: props.style || {} },
        h('i', { style: { width: pct + '%', background: props.color || BRAND } }))
    }

    /* Donut with up to 3 segments: uncached input, output, cache. */
    function Donut(props) {
      const { input, output, cache } = props
      const total = input + output + cache
      const r = 46
      const c = 2 * Math.PI * r
      const seg = (value, color) => {
        if (value <= 0) return null
        const len = (value / total) * c
        return h('circle', {
          cx: 54, cy: 54, r,
          fill: 'none',
          stroke: color,
          strokeWidth: 10,
          strokeLinecap: 'round',
          strokeDasharray: (len - 2) + ' ' + (c - len + 2),
          transform: 'rotate(-90 54 54)',
        })
      }
      const inTot = Math.max(0, input)
      return h('div', {
        className: 'ldg-donut',
        title: props.title || '',
      },
        h('svg', { width: 108, height: 108, viewBox: '0 0 108 108' },
          h('circle', { cx: 54, cy: 54, r, fill: 'none', stroke: 'currentColor', strokeOpacity: 0.08, strokeWidth: 10 }),
          seg(inTot, 'var(--input)'),
          seg(output, 'var(--output)'),
          seg(cache, 'var(--cache)'),
        ),
        h('div', { className: 'center' },
          h('div', { className: 'cv' }, props.totalText),
          h('div', { className: 'ck' }, props.totalLabel),
        ),
      )
    }

    function Card(props) {
      const glowColor = props.glow || BRAND
      return h('div', { className: 'ldg-card', title: props.title || '' },
        props.glow ? h('div', { className: 'glow', style: { background: glowColor } }) : null,
        h('div', { className: 'k' }, props.k),
        h('div', { className: 'v' }, props.v),
      )
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
      const [hoverDay, setHoverDay] = useState(null)
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

      ensureCss()

      const totals = data ? data.totals : null
      const providers = data ? data.providers || [] : []
      const days = data ? data.days || [] : []
      const sessions = data ? data.sessions || [] : []
      const pricing = data ? data.pricing || [] : []
      const isDayMode = selectedDay !== null
      const dayView = isDayMode ? days.find((d) => d.date === selectedDay) : null
      const todayKey = dayKey(Date.now())

      const viewTotals = isDayMode && dayView
        ? {
          input: dayView.input, output: dayView.output, cacheRead: dayView.cacheRead,
          cacheWrite: dayView.cacheWrite, total: dayView.total, steps: dayView.steps,
        }
        : totals

      const currentProviderId = (() => {
        if (!currentId) return null
        const sess = sessions.find((s) => s.id === currentId)
        if (!sess || !sess.providers) return null
        let best = null, bestTot = -1
        for (const p of sess.providers) {
          if (p.total > bestTot) { best = p.id; bestTot = p.total }
        }
        return best
      })()

      const currentProv = providers.find((p) => p.id === currentProviderId) || null

      const maxProvTotal = providers.reduce((m, p) => Math.max(m, p.total || 0), 1)
      const maxSessTotal = sessions.reduce((m, s) => Math.max(m, s.total || 0), 1)
      const maxDayTotal = days.reduce((m, d) => Math.max(m, d.total || 0), 1)

      let head = h('div', { className: 'ldg-head', onPointerDown: onDragStart },
        h('span', { className: 'ldg-mark' }),
        h('span', { className: 'ldg-title' }, t.title),
        h('button', { className: 'ldg-btn', onPointerDown: stop, onClick: refresh, title: t.refresh }, '⟳'),
        h('button', { className: 'ldg-btn', onPointerDown: stop, onClick: toggleLang, title: lang === 'zh' ? 'English' : '中文' }, lang === 'zh' ? 'EN' : '中'),
        h('button', { className: 'ldg-btn', onPointerDown: stop, onClick: () => setMode(mode === 'expanded' ? 'collapsed' : 'expanded'), title: t.collapse }, mode === 'expanded' ? '▾' : '▸'),
        h('button', { className: 'ldg-btn', onPointerDown: stop, onClick: () => setMode('hidden'), title: t.close }, '×'),
      )

      let content
      if (error) {
        content = h('div', { className: 'ldg-err' }, t.error + ': ' + error + ' (' + t.retry + ')')
      } else if (!data) {
        content = h('div', { className: 'ldg-load' }, t.loading + t.counting)
      } else {
        // hero
        const heroTotals = viewTotals || { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
        const heroCache = (heroTotals.cacheRead || 0) + (heroTotals.cacheWrite || 0)
        const hero = h('div', { className: 'ldg-hero' },
          Donut({
            input: heroTotals.input || 0,
            output: heroTotals.output || 0,
            cache: heroCache,
            totalText: fmt(heroTotals.total || 0),
            totalLabel: isDayMode ? (selectedDay || '') : t.total,
            lang,
          }),
          h('div', { className: 'ldg-heromain' },
            h('div', { className: 'ldg-herok' }, isDayMode ? t.dayView : t.month),
            h('div', { className: 'ldg-herov' }, fmt(heroTotals.total || 0)),
            h('div', { className: 'ldg-herosub' },
              h('span', { className: 'ldg-pill' }, t.hit + ' <b>' + hitRate(heroTotals.input || 0, heroCache).toFixed(1) + '%</b>'),
              h('span', { className: 'ldg-pill' }, t.steps + ' <b>' + fmt(heroTotals.steps || 0) + '</b>'),
              h('span', { className: 'ldg-pill' }, t.sessions + ' <b>' + (isDayMode ? (dayView ? dayView.sessionCount : 0) : sessions.length) + '</b>'),
            ),
          ),
        )

        const cards = h('div', { className: 'ldg-cards' },
          Card({ k: t.input, v: fmt(heroTotals.input || 0), glow: 'var(--input)', title: fmtFull(heroTotals.input) }),
          Card({ k: t.output, v: fmt(heroTotals.output || 0), glow: 'var(--output)', title: fmtFull(heroTotals.output) }),
          Card({ k: t.cache, v: fmt(heroCache), glow: 'var(--cache)', title: t.cacheRead + ' ' + fmtFull(heroTotals.cacheRead) + ' · ' + t.cacheWrite + ' ' + fmtFull(heroTotals.cacheWrite) }),
          Card({ k: t.total, v: fmt(heroTotals.total || 0), glow: 'var(--brand)', title: fmtFull(heroTotals.total) }),
        )

        // provider rows with share bars
        const provList = providers.map((p) => {
          const expanded = openProv === p.id
          const color = colorOf(p.id)
          const ratio = (p.total || 0) / maxProvTotal
          const row = h('div', { className: 'ldg-prov' + (expanded ? ' open' : '') + (p.id === currentProviderId ? ' cur' : ''), key: p.id, onClick: (e) => { e.stopPropagation(); setOpenProv(expanded ? null : p.id) } },
            h('span', { className: 'ldg-dot', style: { background: color } }),
            h('div', { className: 'ldg-prow' },
              h('div', { className: 'ldg-pline' },
                h('span', { className: 'ldg-pname' }, p.id),
                h('span', { className: 'ldg-pnums' }, fmt(p.total)),
              ),
              ShareBar({ ratio }),
            ),
            h('span', { className: 'ldg-arrow' }, '▸'),
          )
          const detail = h('div', { className: 'ldg-exgrid' + (expanded ? ' open' : ''), key: p.id + '-grid' },
            h('div', { className: 'ldg-gridin' },
              h('div', { className: 'ldg-prov-detail' },
                [t.input + ' ' + fmt(p.input), t.output + ' ' + fmt(p.output), t.cacheRead + ' ' + fmt(p.cacheRead), t.cacheWrite + ' ' + fmt(p.cacheWrite)].join('  ·  '),
              ),
              (p.models || []).map((m) => h('div', { className: 'ldg-modelrow', key: p.id + ':' + m.model },
                h('span', { className: 'mname' }, m.model),
                ShareBar({ ratio: maxProvTotal > 0 ? m.total / maxProvTotal : 0, style: { marginTop: 2 } }),
                h('span', { className: 'snums' }, fmt(m.total)),
              )),
              (p.price && (p.price.inputPerM || p.price.outputPerM))
                ? (() => {
                    const est = ((p.input / 1e6) * (p.price.inputPerM || 0)) + ((p.output / 1e6) * (p.price.outputPerM || 0))
                    return h('div', { className: 'ldg-prov-detail' }, '≈ ¥ ' + est.toFixed(2))
                  })()
                : null,
            ),
          )
          return [row, detail]
        })

        // heatmap with legend
        const heatSteps = h('div', { className: 'ldg-heat-legend' },
          h('span', null, t.today),
          h('div', { className: 'ldg-heat-steps' },
            [0.08, 0.2, 0.4, 0.6, 0.85, 1].map((a) => h('i', { key: a, style: { background: 'rgba(79,141,255,' + (a * 0.9).toFixed(2) + ')' } })),
          ),
        )
        const dayCells = h('div', { className: 'ldg-days' },
          days.map((d) => {
            const intensity = d.total > 0 ? (0.12 + 0.88 * Math.log(1 + (d.total / maxDayTotal) * 9) / Math.log(10)) : 0
            const selCls = selectedDay === d.date ? ' sel' : ''
            const todCls = d.date === todayKey ? ' today' : ''
            const offCls = d.total === 0 ? ' off' : ''
            return h('div', {
              key: d.date,
              className: 'ldg-day' + selCls + todCls + offCls,
              onMouseEnter: () => setHoverDay({ date: d.date, total: d.total, x: 0, y: 0 }),
              onMouseLeave: () => setHoverDay(null),
              onMouseMove: (e) => {
                if (!hoverDay || hoverDay.date !== d.date) return
                const r = panelRef.current.getBoundingClientRect()
                setHoverDay({ ...hoverDay, x: e.clientX - r.left, y: e.clientY - r.top })
              },
              onClick: () => setSelectedDay(selectedDay === d.date ? null : d.date),
              style: { background: d.total > 0 ? 'linear-gradient(135deg,rgba(79,141,255,' + intensity.toFixed(2) + '),rgba(122,167,255,' + (intensity * 0.6).toFixed(2) + '))' : undefined },
            }, String(d.day))
          }),
        )
        let tip = null
        if (hoverDay && hoverDay.x > 0) {
          const cell = days.find((d) => d.date === hoverDay.date)
          if (cell) {
            tip = h('div', { className: 'ldg-tip', style: { left: Math.max(60, Math.min(540, hoverDay.x)), top: hoverDay.y } },
              h('div', { className: 't1' }, hoverDay.date),
              h('div', { className: 't2' }, t.total + ' ' + fmtFull(hoverDay.total) + ' · ' + t.steps + ' ' + (cell.steps || 0)),
            )
          }
        }

        const daySwitch = h('div', null,
          h('div', { className: 'ldg-sec' },
            h('span', null, isDayMode ? t.dayView : t.month),
            h('span', { className: 'sub' }, isDayMode ? selectedDay : dayKey(Date.now()).slice(0, 7)),
            h('span', { className: 'sp' }, null),
            heatSteps,
            isDayMode
              ? h('button', { className: 'ldg-btn', style: { width: 'auto', padding: '0 9px' }, onClick: () => setSelectedDay(null) }, '← ' + t.allDays)
              : null,
          ),
          dayCells,
          tip,
        )

        // sessions
        const viewSessions = isDayMode && dayView
          ? sessions.filter((s) => s.createdAt && dayKey(s.createdAt) === selectedDay).slice(0, 30)
          : sessions.slice(0, 30)
        const sessList = viewSessions.map((s) => {
          const expanded = openSess === s.id
          const ratio = (s.total || 0) / maxSessTotal
          const row = h('div', { className: 'ldg-sess' + (expanded ? ' open' : '') + (s.id === currentId ? ' cur' : ''), key: s.id, onClick: (e) => { e.stopPropagation(); setOpenSess(expanded ? null : s.id) } },
            h('div', { className: 'ldg-prow' },
              h('div', { className: 'ldg-pline' },
                h('span', { className: 'sname' }, s.title || t.empty),
                h('span', { className: 'snums' }, fmt(s.total) + ' · ' + s.steps + ' ' + t.steps),
              ),
              ShareBar({ ratio }),
            ),
            h('span', { className: 'ldg-arrow' }, '▸'),
          )
          const detail = h('div', { className: 'ldg-exgrid' + (expanded ? ' open' : ''), key: s.id + '-grid' },
            h('div', { className: 'ldg-gridin' },
              h('div', { className: 'ldg-prov-detail' },
                [t.input + ' ' + fmt(s.input), t.output + ' ' + fmt(s.output), t.cacheRead + ' ' + fmt(s.cacheRead), t.turns + ' ' + (s.turns || 0)].join('  ·  '),
              ),
              (s.requests || []).slice(-12).map((req, i) =>
                h('div', { className: 'ldg-req', key: s.id + ':req' + i },
                  h('span', { className: 'rt' }, fmtDate(req.time)),
                  h('span', { className: 'rpd' }, req.provider),
                  req.model ? h('span', null, short(req.model, 22)) : null,
                  h('span', { className: 'rpd' }, 'in ' + fmt(req.usage.input)),
                  h('span', { className: 'rpd' }, 'out ' + fmt(req.usage.output)),
                ),
              ),
            ),
          )
          return [row, detail]
        })

        const pricingBar = pricing.length > 0
          ? h('div', { className: 'ldg-prov-detail', key: 'pricing' }, pricing.map((pr) => (pr.inputPerM != null ? (pr.id + ' in ¥' + pr.inputPerM + '/M  ') : '') + (pr.outputPerM != null ? (pr.id + ' out ¥' + pr.outputPerM + '/M') : '')).join('  '))
          : null

        content = h('div', null,
          hero,
          cards,
          h('div', { className: 'ldg-sec' },
            h('span', null, t.provs),
            h('span', { className: 'sub' }, providers.length + ' · ' + (currentProv ? t.current + ': ' + currentProv.id : '')),
          ),
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
          onClick: () => setMode('expanded'),
          title: t.openTitle,
        },
          h('span', { className: 'mk' }),
          h('span', null, t.title),
          h('span', { className: 'sp', style: { flex: 1 } }),
          h('b', null, totals ? fmt(totals.total) : '0'),
        )
      }

      if (mode === 'collapsed') {
        return h('div', { className: themeClass, style: { left: pos.x, top: pos.y, width: '360px' } },
          head,
          h('div', { className: 'ldg-body' },
            totals ? h('div', { className: 'ldg-cards c3' },
              Card({ k: t.total, v: fmt(totals.total) }),
              Card({ k: t.steps, v: fmt(totals.steps) }),
              Card({ k: t.sessions, v: sessions.length }),
            ) : h('div', { className: 'ldg-load' }, t.loading),
          ),
        )
      }

      return h('div', { ref: panelRef, className: themeClass, style: { left: pos.x, top: pos.y } },
        head,
        h('div', { className: 'ldg-body' }, content),
        h('div', { className: 'ldg-foot' },
          h('span', { className: 'ldg-live' }),
          h('span', null, (data ? t.updatedAt + fmtDate(data.generatedAt) + (loading ? ' · ' + t.loading : '') : t.loading) + ' · ' + t.auto),
          h('span', { className: 'sp' }, null),
          h('span', null, (providers || []).filter((p) => (p.total || 0) > 0).length + ' ' + t.provs),
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
