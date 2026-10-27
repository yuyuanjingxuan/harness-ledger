/* harness-ledger. Browser half.
 *
 * A floating draggable panel that polls the host route /ledger/stats and
 * renders a polished account: a hero donut with totals, stat cards, provider
 * rows with share bars, a monthly heatmap with a custom tooltip, and session
 * detail with the request trail. Loaded by the shell in module table format.
 *
 * Theming: every color flows from a small set of CSS variables, so the panel
 * stays readable on any background. Built-in skins include auto, midnight,
 * paper and Matrix. Data colors are tuned per skin for clear contrast.
 */
window.__ModuleLoader__.load({
  id: 'harness-ledger',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement

    /* Shared structural styles, all colors come from the skin variables.
     * The skin classes are appended to the root and swap the variables. */
    const css = [
      /* auto dark skin */
      '.ldg{--bg:#0f1117;--bg2:#171a22;--bg3:#1f232e;--line1:rgba(255,255,255,.08);--line2:rgba(255,255,255,.16);--text:#f2f4f9;--text2:#a7aebd;--text3:#737b8c;--brand:#5b8dff;--brand2:#9db9ff;--input:#ffb46b;--output:#57d4a3;--cache:#a98fff;--warn:#f0b95c;--err:#ff6b72;--ok:#53d490;--track:rgba(255,255,255,.06);--heatBase:rgba(91,141,255,.13);font-size:13px;color:var(--text);position:fixed;width:600px;max-width:calc(100vw - 24px);max-height:min(780px,90vh);display:flex;flex-direction:column;background:linear-gradient(180deg,var(--bg2),var(--bg));border:1px solid var(--line2);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.55),0 4px 14px rgba(0,0,0,.35);z-index:1000;overflow:hidden;pointer-events:auto}',
      /* auto light skin */
      '.ldg-ld{--bg:#fafbfd;--bg2:#f1f3f8;--bg3:#e6e9f1;--line1:rgba(24,34,58,.09);--line2:rgba(24,34,58,.18);--text:#1d2330;--text2:#5a6475;--text3:#939cae;--brand:#3368f5;--brand2:#4a7bf7;--input:#d26a1f;--output:#1e8f63;--cache:#6a4fd8;--warn:#a96f16;--err:#d42f38;--ok:#1f9d61;--track:rgba(24,34,58,.06);--heatBase:rgba(51,104,245,.12);background:linear-gradient(180deg,var(--bg2),var(--bg));color:var(--text);border-color:var(--line2);box-shadow:0 18px 44px rgba(35,45,75,.2),0 4px 12px rgba(35,45,75,.1)}',
      /* midnight skin, always dark, cooler notes */
      '.ldg-mid{--bg:#0b0e17;--bg2:#121827;--bg3:#1b2338;--line1:rgba(148,178,255,.1);--line2:rgba(148,178,255,.22);--text:#eef2ff;--text2:#a3aecb;--text3:#6b7696;--brand:#7aa2ff;--brand2:#b6ccff;--input:#ffc07a;--output:#6ee7b7;--cache:#b4a5ff;--warn:#f7c873;--err:#ff7b84;--ok:#6ee7b7;--track:rgba(148,178,255,.07);--heatBase:rgba(122,162,255,.15);background:linear-gradient(180deg,var(--bg2),var(--bg));color:var(--text);box-shadow:0 18px 55px rgba(4,8,20,.7),0 4px 14px rgba(4,8,20,.45)}',
      /* paper skin, always light, warm paper feel */
      '.ldg-pap{--bg:#fffdf8;--bg2:#f6f1e8;--bg3:#ebe3d5;--line1:rgba(80,55,20,.1);--line2:rgba(80,55,20,.2);--text:#2a241c;--text2:#6d6355;--text3:#a89b8a;--brand:#8a5a17;--brand2:#b07a22;--input:#c2530b;--output:#177a52;--cache:#5b40b8;--warn:#9a6308;--err:#c2262e;--ok:#1d8a54;--track:rgba(80,55,20,.07);--heatBase:rgba(138,90,23,.13);background:linear-gradient(180deg,var(--bg2),var(--bg));color:var(--text);box-shadow:0 18px 44px rgba(90,60,20,.22),0 4px 12px rgba(90,60,20,.12)}',
      /* Matrix skin, deep black-green with restrained phosphor scanlines */
      '.ldg-mtx{--bg:#050b07;--bg2:#0a160d;--bg3:#102116;--line1:rgba(104,255,132,.12);--line2:rgba(104,255,132,.27);--text:#d9ffe1;--text2:#91b99a;--text3:#5f8068;--brand:#55ff78;--brand2:#aaffb8;--input:#a5f45b;--output:#45dfbd;--cache:#e1d35a;--warn:#d7d45e;--err:#ff7284;--ok:#55ff78;--track:rgba(104,255,132,.08);--heatBase:rgba(70,255,105,.14);background:linear-gradient(180deg,rgba(30,90,42,.22),transparent 32%),repeating-linear-gradient(0deg,rgba(70,255,105,.018) 0px,rgba(70,255,105,.018) 1px,transparent 1px,transparent 4px),linear-gradient(180deg,var(--bg2),var(--bg));color:var(--text);border-color:var(--line2);box-shadow:0 18px 55px rgba(0,8,2,.75),0 0 22px rgba(56,255,96,.08)}',
      '.ldg-mtx .ldg-head{background:linear-gradient(180deg,rgba(70,255,105,.07),transparent);border-bottom-color:var(--line1)}',
      '.ldg *{scrollbar-width:thin;scrollbar-color:var(--line2) transparent}',
      '.ldg *::-webkit-scrollbar{width:8px;height:8px}',
      '.ldg *::-webkit-scrollbar-thumb{background:var(--line2);border-radius:8px}',
      '.ldg-head{display:flex;align-items:center;gap:7px;padding:12px 14px;cursor:move;user-select:none;background:linear-gradient(180deg,rgba(255,255,255,.035),transparent);border-bottom:1px solid var(--line1);flex:none}',
      '.ldg-mark{width:9px;height:9px;border-radius:50%;background:var(--brand);box-shadow:0 0 12px var(--brand);flex:none}',
      '.ldg-title{font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;letter-spacing:.01em}',
      '.ldg-btn{border:1px solid var(--line1);background:var(--track);color:var(--text2);border-radius:9px;width:28px;height:28px;cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;flex:none;transition:all .15s ease;padding:0}',
      '.ldg-btn:hover{color:var(--text);border-color:var(--line2);transform:translateY(-1px)}',
      '.ldg-btn:active{transform:translateY(0)}',
      '.ldg-btn.active{color:var(--bg);background:var(--brand);border-color:var(--brand);box-shadow:0 0 10px color-mix(in srgb,var(--brand) 35%,transparent)}',
      '.ldg-skinbtn{width:auto;padding:0 9px;gap:5px;font-size:11px}',
      '.ldg-groupbtn{width:auto;padding:0 8px;font-size:11px}',
      '.ldg-dotv{width:8px;height:8px;border-radius:50%;background:var(--brand);display:inline-block;flex:none}',
      '.ldg-body{overflow-y:auto;padding:14px 14px 10px;min-height:0}',
      '.ldg-hero{display:flex;gap:16px;align-items:center;padding:4px 2px 12px;border-bottom:1px solid var(--line1);margin-bottom:12px}',
      '.ldg-donut{position:relative;width:108px;height:108px;flex:none}',
      '.ldg-donut svg{transform:rotate(-90deg)}',
      '.ldg-donut .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}',
      '.ldg-donut .cv{font-size:21px;font-weight:700;letter-spacing:.01em;color:var(--text)}',
      '.ldg-donut .ck{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;margin-top:1px}',
      '.ldg-heromain{flex:1;min-width:0}',
      '.ldg-herok{font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.07em}',
      '.ldg-herov{font-size:30px;font-weight:700;letter-spacing:.01em;font-variant-numeric:tabular-nums;line-height:1.1;margin:2px 0 6px;color:var(--text)}',
      '.ldg-herosub{display:flex;gap:6px;flex-wrap:wrap}',
      '.ldg-pill{font-size:11px;color:var(--text2);background:var(--bg2);border:1px solid var(--line1);border-radius:999px;padding:3px 9px;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.ldg-pill b{color:var(--text);font-weight:600;margin-left:1px}',
      '.ldg-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
      '.ldg-card{background:linear-gradient(160deg,var(--bg2),var(--bg));border:1px solid var(--line1);border-radius:12px;padding:9px 11px;min-width:0;position:relative;overflow:hidden;transition:transform .15s ease,border-color .15s ease}',
      '.ldg-card:hover{transform:translateY(-2px);border-color:var(--line2)}',
      '.ldg-card .k{color:var(--text2);font-size:10px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ldg-card .v{font-size:17px;font-weight:650;font-variant-numeric:tabular-nums;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}',
      '.ldg-card .glow{position:absolute;right:-18px;top:-18px;width:48px;height:48px;border-radius:50%;filter:blur(14px);opacity:.5}',
      '.ldg-sec{margin:16px 0 8px;font-weight:650;color:var(--text);font-size:12px;text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;gap:8px}',
      '.ldg-sec .sub{color:var(--text3);text-transform:none;letter-spacing:0;font-weight:400;font-size:11px}',
      '.ldg-sec .sp{flex:1}',
      '.ldg-prov{display:flex;align-items:center;gap:9px;padding:7px 4px;border-bottom:1px dashed var(--line1);cursor:pointer;border-radius:8px;transition:background .12s ease}',
      '.ldg-prov:hover{background:var(--track)}',
      '.ldg-prov.cur{background:var(--heatBase)}',
      '.ldg-dot{width:8px;height:8px;border-radius:50%;flex:none}',
      '.ldg-prow{flex:1;min-width:0}',
      '.ldg-pline{display:flex;gap:8px;align-items:center;min-width:0}',
      '.ldg-pname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:var(--text)}',
      '.ldg-pnums{font-variant-numeric:tabular-nums;color:var(--text2);white-space:nowrap;font-size:12px}',
      '.ldg-bar{position:relative;height:5px;border-radius:5px;background:var(--track);margin-top:5px;overflow:hidden}',
      '.ldg-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;transition:width .5s ease}',
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
      '.ldg-heat-legend{display:flex;align-items:center;gap:5px;color:var(--text3);font-size:10px}',
      '.ldg-heat-steps{display:flex;gap:3px;align-items:center}',
      '.ldg-heat-steps i{width:9px;height:9px;border-radius:3px}',
      '.ldg-days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:8px}',
      '.ldg-day{position:relative;border-radius:9px;padding:6px 2px;text-align:center;cursor:pointer;font-size:11px;font-variant-numeric:tabular-nums;background:var(--bg2);border:1px solid var(--line1);font-weight:500;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease}',
      '.ldg-day:hover{transform:scale(1.08);z-index:2;border-color:var(--brand)}',
      '.ldg-day.sel{outline:2px solid var(--brand);outline-offset:1px}',
      '.ldg-day.today{box-shadow:inset 0 0 0 1.5px var(--brand2)}',
      '.ldg-day.off{opacity:.3;pointer-events:none}',
      '.ldg-sess{display:flex;align-items:center;gap:9px;padding:8px 4px;border-bottom:1px dashed var(--line1);cursor:pointer;border-radius:8px;transition:background .12s ease}',
      '.ldg-sess:hover{background:var(--track)}',
      '.ldg-sess.cur{background:var(--heatBase)}',
      '.ldg-sname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:var(--text)}',
      '.ldg-sess .snums{font-variant-numeric:tabular-nums;color:var(--text2);white-space:nowrap;font-size:12px}',
      '.ldg-req{border-top:1px solid var(--line1);padding:6px 2px 6px 17px;color:var(--text2);font-size:11px;font-variant-numeric:tabular-nums;display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.ldg-req .rt{color:var(--text3)}',
      '.ldg-req .rpd{background:var(--bg3);border-radius:6px;padding:1px 6px}',
      '.ldg-empty{color:var(--text3);padding:10px 2px;font-size:12px}',
      '.ldg-err{color:var(--err);padding:10px 2px}',
      '.ldg-foot{display:flex;align-items:center;gap:8px;padding:8px 14px;border-top:1px solid var(--line1);color:var(--text3);font-size:10.5px;flex:none}',
      '.ldg-foot .sp{flex:1}',
      '.ldg-live{width:7px;height:7px;border-radius:50%;background:var(--ok);flex:none;animation:ldgPulse 2s ease infinite}',
      '@keyframes ldgPulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '.ldg-load{color:var(--text2);padding:26px 2px;text-align:center}',
      '.ldg-tip{position:absolute;z-index:5;pointer-events:none;background:var(--bg2);border:1px solid var(--line2);border-radius:9px;padding:7px 10px;font-size:11px;color:var(--text);box-shadow:var(--shadow,0 10px 30px rgba(0,0,0,.4));white-space:nowrap;transform:translate(-50%,calc(-100% - 10px));animation:ldgTip .12s ease-out}',
      '@keyframes ldgTip{from{opacity:0;transform:translate(-50%,calc(-100% - 4px))}to{opacity:1;transform:translate(-50%,calc(-100% - 10px))}}',
      '.ldg-tip .t1{font-weight:600;margin-bottom:2px}',
      '.ldg-tip .t2{color:var(--text2)}',
      /* Mini pill: overrides the root panel styles so the closed state is a
       * compact capsule, not a shrunken panel. The double class raises the
       * specificity above the plain .ldg panel rule. */
      '.ldg.ldg-mini{position:fixed;width:auto;max-width:none;max-height:none;height:auto;display:flex;flex-direction:row;align-items:center;gap:9px;padding:10px 16px 10px 12px;background:var(--bg2);border:1px solid var(--line2);border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.3);cursor:grab;font-size:12px;color:var(--text);overflow:visible;flex:none;animation:ldgFade .25s ease;user-select:none}',
      '.ldg.ldg-mini.drag{cursor:grabbing}',
      '.ldg.ldg-mini:hover{transform:translateY(-2px)}',
      '.ldg.ldg-mini .mk{width:8px;height:8px;border-radius:50%;background:var(--brand);box-shadow:0 0 10px var(--brand);flex:none}',
      '.ldg.ldg-mini b{font-variant-numeric:tabular-nums;font-weight:650;white-space:nowrap}',
      '@keyframes ldgFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      '.ldg-cards.c3{grid-template-columns:repeat(3,1fr)}',
    ].join('\n')

    const PALETTE = ['#5b8dff', '#57d4a3', '#a98fff', '#ffb46b', '#ff6b72', '#4ed0e0', '#f0c96e', '#b39dff', '#f090d8', '#8fd46e']
    const SKINS = [
      { id: 'auto', key: '', light: 'ldg-ld', label: { zh: '跟随主题', en: 'Auto' } },
      { id: 'midnight', key: 'ldg-mid', light: 'ldg-mid', label: { zh: '午夜', en: 'Midnight' } },
      { id: 'paper', key: 'ldg-pap', light: 'ldg-pap', label: { zh: '纸张', en: 'Paper' } },
      { id: 'matrix', key: 'ldg-mtx', light: 'ldg-mtx', label: { zh: '黑客帝国', en: 'Matrix' } },
    ]

    // Stable color per provider id, so a polling refresh never shifts the bars.
    // These are mid-tone colors that keep contrast on both light and dark skins;
    // the surrounding bars keep them readable via the track behind them.
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
        scanning: '正在读取历史',
        error: '加载失败', retry: '稍后重试', noProv: '暂无数据', empty: '（无标题）',
        month: '本月用量', today: '今天', dayView: '日视图',
        skin: '皮肤', groupByProvider: '按提供商', groupByModel: '按模型',
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
        scanning: 'Reading history',
        error: 'Load failed', retry: 'will retry', noProv: 'No data yet', empty: '(untitled)',
        month: 'This month', today: 'Today', dayView: 'Day view',
        skin: 'Skin', groupByProvider: 'By provider', groupByModel: 'By model',
      },
    }

    let ctxRef = null
    let cssId = null

    function ensureCss() {
      if (cssId) return
      cssId = 'harness-ledger/panel.css'
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

    /* A share bar. The track uses the skin's neutral tone and the fill uses a
     * vivid color, so the ratio reads clearly on every skin. */
    function ShareBar(props) {
      const pct = props.ratio > 0 ? Math.max(4, Math.min(100, props.ratio * 100)) : 0
      return h('div', { className: 'ldg-bar', style: props.style || {} },
        h('i', { style: { width: pct + '%', background: props.color || 'var(--brand)' } }))
    }

    /* Donut with up to 3 segments: uncached input, output, cache. */
    function Donut(props) {
      const { input, output, cache } = props
      const total = input + output + cache
      const r = 46
      const c = 2 * Math.PI * r
      const seg = (value, color) => {
        if (value <= 0) return null
        const len = Math.max(2, (value / total) * c - 2)
        return h('circle', {
          cx: 54, cy: 54, r,
          fill: 'none',
          stroke: color,
          strokeWidth: 11,
          strokeLinecap: 'round',
          strokeDasharray: len + ' ' + (c - len),
          transform: 'rotate(-90 54 54)',
        })
      }
      const inTot = Math.max(0, input)
      return h('div', { className: 'ldg-donut', title: props.title || '' },
        h('svg', { width: 108, height: 108, viewBox: '0 0 108 108' },
          h('circle', { cx: 54, cy: 54, r, fill: 'none', stroke: 'var(--track)', strokeWidth: 11 }),
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
      const glowColor = props.glow || 'var(--brand)'
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
      const [dragging, setDragging] = useState(false)
      const [pos, setPos] = useState(() => {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1280
        return { x: Math.max(16, w - 616), y: 88 }
      })
      const [openGroup, setOpenGroup] = useState(null)
      const [openSess, setOpenSess] = useState(null)
      const [selectedDay, setSelectedDay] = useState(null)
      const [hoverDay, setHoverDay] = useState(null)
      const [lang, setLang] = useState(() => {
        try { return localStorage.getItem('harness-ledger-lang') || 'zh' } catch { return 'zh' }
      })
      const [skin, setSkin] = useState(() => {
        try { return localStorage.getItem('harness-ledger-skin') || 'auto' } catch { return 'auto' }
      })
      const [aggregation, setAggregation] = useState(() => {
        try { return localStorage.getItem('harness-ledger-aggregation') || 'provider' } catch { return 'provider' }
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

      // Skin selection. auto follows the dsh theme; the others pin their look.
      const skinDef = SKINS.find((s) => s.id === skin) || SKINS[0]
      let skinClass = skinDef.key
      if (skinDef.id === 'auto') skinClass = dark ? '' : skinDef.light
      const themeClass = 'ldg' + (skinClass ? ' ' + skinClass : '')

      function cycleSkin() {
        const idx = SKINS.findIndex((s) => s.id === skin)
        const next = SKINS[(idx + 1) % SKINS.length]
        setSkin(next.id)
        try { localStorage.setItem('harness-ledger-skin', next.id) } catch { /* ignore */ }
      }
      const skinLabel = (lang === 'zh' ? skinDef.label.zh : skinDef.label.en) || skinDef.id

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
        try { localStorage.setItem('harness-ledger-lang', next) } catch { /* ignore */ }
      }

      function setGrouping(next) {
        setAggregation(next)
        setOpenGroup(null)
        try { localStorage.setItem('harness-ledger-aggregation', next) } catch { /* ignore */ }
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

      /* The mini capsule is draggable too. A pointer press that stays within a
       * few pixels on release counts as a click that reopens the panel; a real
       * drag just moves the capsule. A drag state flag flips the cursor. */
      function onMiniDragStart(e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        e.preventDefault()
        const startX = e.clientX, startY = e.clientY
        const startPos = pos
        let dragBegan = false
        let suppressClick = false
        function move(ev) {
          const dx = ev.clientX - startX, dy = ev.clientY - startY
          if (!dragBegan && Math.hypot(dx, dy) > 4) { dragBegan = true; suppressClick = true; setDragging(true) }
          if (dragBegan) {
            setPos({
              x: Math.max(0, startPos.x + dx),
              y: Math.max(0, startPos.y + dy),
            })
          }
        }
        function up(ev) {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', cancel)
          setDragging(false)
          // Reopen only for a clean click on the capsule body.
          if (!suppressClick) setMode('expanded')
        }
        function cancel() {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', cancel)
          setDragging(false)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', cancel)
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

      // The server returns provider buckets with their model breakdown. Fold
      // those nested buckets again for a model-first view without changing the
      // stats API or triggering another history scan.
      const modelRowsById = new Map()
      for (const provider of providers) {
        for (const model of provider.models || []) {
          const modelId = model.model || 'unknown'
          let row = modelRowsById.get(modelId)
          if (!row) {
            row = { id: modelId, name: modelId, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0, providers: [] }
            modelRowsById.set(modelId, row)
          }
          row.input += model.input || 0
          row.output += model.output || 0
          row.cacheRead += model.cacheRead || 0
          row.cacheWrite += model.cacheWrite || 0
          row.reasoning += model.reasoning || 0
          row.total += model.total || 0
          row.providers.push({ ...model, id: provider.id, name: provider.name || provider.id, price: provider.price })
        }
      }
      const modelRows = Array.from(modelRowsById.values())
      for (const row of modelRows) row.providers.sort((a, b) => (b.total || 0) - (a.total || 0))
      modelRows.sort((a, b) => (b.total || 0) - (a.total || 0))

      const maxProvTotal = providers.reduce((m, p) => Math.max(m, p.total || 0), 1)
      const maxModelTotal = modelRows.reduce((m, row) => Math.max(m, row.total || 0), 1)
      const maxSessTotal = sessions.reduce((m, s) => Math.max(m, s.total || 0), 1)
      const maxDayTotal = days.reduce((m, d) => Math.max(m, d.total || 0), 1)

      let head = h('div', { className: 'ldg-head', onPointerDown: onDragStart },
        h('span', { className: 'ldg-mark' }),
        h('span', { className: 'ldg-title' }, t.title),
        h('button', { className: 'ldg-btn ldg-skinbtn', onPointerDown: stop, onClick: cycleSkin, title: t.skin + ': ' + skinLabel },
          h('span', { className: 'ldg-dotv' }),
          h('span', null, skinLabel),
        ),
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
        const heroTotals = viewTotals || { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
        const heroCache = (heroTotals.cacheRead || 0) + (heroTotals.cacheWrite || 0)
        const hero = h('div', { className: 'ldg-hero' },
          Donut({
            input: heroTotals.input || 0,
            output: heroTotals.output || 0,
            cache: heroCache,
            totalText: fmt(heroTotals.total || 0),
            totalLabel: isDayMode ? (selectedDay || '') : t.total,
          }),
          h('div', { className: 'ldg-heromain' },
            h('div', { className: 'ldg-herok' }, isDayMode ? t.dayView : t.month),
            h('div', { className: 'ldg-herov' }, fmt(heroTotals.total || 0)),
            h('div', { className: 'ldg-herosub' },
              h('span', { className: 'ldg-pill' }, t.hit + ' ', h('b', null, hitRate(heroTotals.input || 0, heroCache).toFixed(1) + '%')),
              h('span', { className: 'ldg-pill' }, t.steps + ' ', h('b', null, fmt(heroTotals.steps || 0))),
              h('span', { className: 'ldg-pill' }, t.sessions + ' ', h('b', null, isDayMode ? (dayView ? dayView.sessions || 0 : 0) : sessions.length)),
            ),
          ),
        )

        const cards = h('div', { className: 'ldg-cards' },
          Card({ k: t.input, v: fmt(heroTotals.input || 0), glow: 'var(--input)', title: fmtFull(heroTotals.input) }),
          Card({ k: t.output, v: fmt(heroTotals.output || 0), glow: 'var(--output)', title: fmtFull(heroTotals.output) }),
          Card({ k: t.cache, v: fmt(heroCache), glow: 'var(--cache)', title: t.cacheRead + ' ' + fmtFull(heroTotals.cacheRead) + ' · ' + t.cacheWrite + ' ' + fmtFull(heroTotals.cacheWrite) }),
          Card({ k: t.total, v: fmt(heroTotals.total || 0), glow: 'var(--brand)', title: fmtFull(heroTotals.total) }),
        )

        const groupRows = aggregation === 'model' ? modelRows : providers
        const maxGroupTotal = aggregation === 'model' ? maxModelTotal : maxProvTotal
        const provList = groupRows.map((p) => {
          const groupId = aggregation + ':' + p.id
          const expanded = openGroup === groupId
          const color = colorOf(p.id)
          const ratio = (p.total || 0) / maxGroupTotal
          const isCurrent = aggregation === 'model'
            ? (p.providers || []).some((provider) => provider.id === currentProviderId)
            : p.id === currentProviderId
          const children = aggregation === 'model' ? p.providers || [] : p.models || []
          const row = h('div', { className: 'ldg-prov' + (expanded ? ' open' : '') + (isCurrent ? ' cur' : ''), key: groupId, onClick: (e) => { e.stopPropagation(); setOpenGroup(expanded ? null : groupId) } },
            h('span', { className: 'ldg-dot', style: { background: color } }),
            h('div', { className: 'ldg-prow' },
              h('div', { className: 'ldg-pline' },
                h('span', { className: 'ldg-pname', title: p.id }, p.name || p.id),
                h('span', { className: 'ldg-pnums' }, fmt(p.total)),
              ),
              ShareBar({ ratio, color }),
            ),
            h('span', { className: 'ldg-arrow' }, '▸'),
          )
          const detail = h('div', { className: 'ldg-exgrid' + (expanded ? ' open' : ''), key: groupId + '-grid' },
            h('div', { className: 'ldg-gridin' },
              h('div', { className: 'ldg-prov-detail' },
                [t.input + ' ' + fmt(p.input), t.output + ' ' + fmt(p.output), t.cacheRead + ' ' + fmt(p.cacheRead), t.cacheWrite + ' ' + fmt(p.cacheWrite)].join('  ·  '),
              ),
              children.map((m) => h('div', { className: 'ldg-modelrow', key: groupId + ':' + m.id + ':' + (m.model || '') },
                h('span', { className: 'mname' }, aggregation === 'model' ? m.name : m.model),
                ShareBar({ ratio: maxGroupTotal > 0 ? m.total / maxGroupTotal : 0, style: { marginTop: 2 }, color }),
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

        const heatSteps = h('div', { className: 'ldg-heat-legend' },
          h('span', null, t.today),
          h('div', { className: 'ldg-heat-steps' },
            [0.08, 0.22, 0.4, 0.6, 0.82, 1].map((a) => h('i', { key: a, style: { background: 'color-mix(in srgb, var(--brand) ' + Math.round(a * 100) + '%, var(--bg2))' } })),
          ),
        )
        const dayCells = h('div', { className: 'ldg-days' },
          days.map((d) => {
            // Blend brand into the card base for a readable ramp on every skin.
            const mix = d.total > 0 ? Math.round((0.14 + 0.86 * Math.log(1 + (d.total / maxDayTotal) * 9) / Math.log(10)) * 100) : 0
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
              style: { background: d.total > 0 ? 'color-mix(in srgb, var(--brand) ' + mix + '%, var(--bg2))' : undefined },
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

        const viewSessions = isDayMode && dayView
          ? sessions
            .filter((s) => s.days && s.days[selectedDay] && s.days[selectedDay].total > 0)
            .map((s) => ({ ...s, dayUsage: s.days[selectedDay] }))
            .sort((a, b) => b.dayUsage.total - a.dayUsage.total)
            .slice(0, 30)
          : sessions.slice(0, 30)
        const maxViewSessionTotal = viewSessions.reduce((m, s) =>
          Math.max(m, (s.dayUsage || s).total || 0), 1)
        const sessList = viewSessions.map((s) => {
          const expanded = openSess === s.id
          const usage = s.dayUsage || s
          const ratio = (usage.total || 0) / maxViewSessionTotal
          const requests = isDayMode
            ? (s.requests || []).filter((req) => dayKey(req.time) === selectedDay)
            : s.requests || []
          const row = h('div', { className: 'ldg-sess' + (expanded ? ' open' : '') + (s.id === currentId ? ' cur' : ''), key: s.id, onClick: (e) => { e.stopPropagation(); setOpenSess(expanded ? null : s.id) } },
            h('div', { className: 'ldg-prow' },
              h('div', { className: 'ldg-pline' },
                h('span', { className: 'ldg-sname' }, s.title || t.empty),
                h('span', { className: 'snums' }, fmt(usage.total) + (isDayMode ? '' : ' · ' + s.steps + ' ' + t.steps)),
              ),
              ShareBar({ ratio }),
            ),
            h('span', { className: 'ldg-arrow' }, '▸'),
          )
          const detail = h('div', { className: 'ldg-exgrid' + (expanded ? ' open' : ''), key: s.id + '-grid' },
            h('div', { className: 'ldg-gridin' },
              h('div', { className: 'ldg-prov-detail' },
                [t.input + ' ' + fmt(usage.input), t.output + ' ' + fmt(usage.output), t.cacheRead + ' ' + fmt(usage.cacheRead), isDayMode ? null : t.turns + ' ' + (s.turns || 0)].filter(Boolean).join('  ·  '),
              ),
              requests.slice(-12).map((req, i) =>
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
            h('span', null, aggregation === 'model' ? t.models : t.provs),
            h('span', { className: 'sub' }, groupRows.length + ' · ' + (currentProv ? t.current + ': ' + currentProv.id : '')),
            h('span', { className: 'sp' }, null),
            h('button', { className: 'ldg-btn ldg-groupbtn' + (aggregation === 'provider' ? ' active' : ''), onClick: () => setGrouping('provider'), title: t.groupByProvider }, t.provs),
            h('button', { className: 'ldg-btn ldg-groupbtn' + (aggregation === 'model' ? ' active' : ''), onClick: () => setGrouping('model'), title: t.groupByModel }, t.models),
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
          className: themeClass + ' ldg-mini' + (dragging ? ' drag' : ''),
          style: { left: pos.x, top: pos.y },
          onPointerDown: onMiniDragStart,
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
          h('span', null, (data ? (data.scanning ? t.scanning : t.updatedAt + fmtDate(data.generatedAt)) + (loading && !data.scanning ? ' · ' + t.loading : '') : t.loading) + ' · ' + t.auto),
          h('span', { className: 'sp' }, null),
          h('span', null, (providers || []).filter((p) => (p.total || 0) > 0).length + ' ' + t.provs),
        ),
      )
    }

    function apply(ctx) {
      ctxRef = ctx
      ctx.slots.inject('shell.overlay', () => {
        return ctx.slots.register(
          { name: 'shell.overlay', id: 'harness-ledger-panel', order: 0 },
          (props) => React.createElement(LedgerPanel, props),
        )
      })
    }

    exports.apply = apply
    exports.inject = ['slots']
    return module.exports
  },
})
