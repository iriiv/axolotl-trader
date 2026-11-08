/* ═══════════════════════════════════════════════════════════════
    DESIGN-LINT — робот-сверщик дизайн-системы «Аксолотль-трейдер».

    Источник истины: client/src/design/DESIGN_SYSTEM.md (числа в
    правилах ниже — оттуда). Прогоняет сценарии по скринам (как
    e2e*.mjs: chromium, devices['iPhone 13'], ru-RU) и на каждой
    точке снимает метрики через getComputedStyle.

    Точки: hub-home (+coach), hub-play/account/wardrobe/shop,
    registration, game roundIntro→news→quiz×2→bet→reveal→summary,
    leaderboard, #design (служебная — только WARN).

    Правила L01–L12 (массив RULES). Нарушение = {rule, severity,
    selector, text, fact, expect}. Итог: сводная таблица + счётчик;
    exit 1 при любом FAIL.

    Запуск: node scripts/design-lint.mjs [--json]
    База:   E2E_BASE=http://localhost:5173 (серверы — как для e2e,
            т.е. уже подняты `npm run dev`)
    ═══════════════════════════════════════════════════════════════ */

import { chromium, devices } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.E2E_BASE || 'http://localhost:5173'
const JSON_MODE = process.argv.includes('--json')
/* негативный контроль чувствительности: инъекция известных нарушений
   на hub-home и проверка, что правила их ловят (для CI) */
const SELFTEST = process.argv.includes('--selftest')

/* ── контент: сколько карточек новостей открывать в каждом раунде ── */
const gameJson = JSON.parse(
  readFileSync(path.join(ROOT, 'client', 'src', 'static', 'game.json'), 'utf8'),
)
const rounds = [...gameJson.rounds].sort((a, b) => a.order - b.order)

/* ═════════════════ МАШИНОЧИТАЕМЫЕ ПРАВИЛА (DESIGN_SYSTEM.md) ═════════════════
   severity — основной уровень нарушения правилом; часть правил
   классифицирует по факту (см. check). */
const RULES = [
  {
    id: 'L01',
    severity: 'FAIL',
    title: 'Тап-таргеты ≥ 44×44 (§4, §10)',
    check: 'видимые button/[role=button]/a/summary: rect ≥ 44×44; <40 — FAIL, 40–43.9 — WARN',
  },
  {
    id: 'L02',
    severity: 'WARN',
    title: 'Шкала Tiny5 (§2)',
    check: 'Tiny5: px ∈ {15,16,18,20,25,30,35}; 22/24 — иконки-числа у кнопок; 13 — микро-подписи/плашки (§2 «микро», §8 таб-бар)',
  },
  {
    id: 'L03',
    severity: 'WARN',
    title: 'Шкала Golos Text (§2)',
    check: 'Golos Text: px ∈ {13,15,17,20}',
  },
  {
    id: 'L04',
    severity: 'FAIL',
    title: 'Радиус 0 (§13)',
    check: 'border-radius ≠ 0 — FAIL; исключение — октагон ▶ ([class*=hub-play], clip-path §8)',
  },
  {
    id: 'L05',
    severity: 'FAIL',
    title: 'Тени без blur (§11, §13)',
    check: 'box-shadow/drop-shadow с blur > 0.5px; свечения редкостей (.dr--*), .chart-panel, CRT — только WARN',
  },
  {
    id: 'L06',
    severity: 'WARN',
    title: 'Палитра (§1)',
    check: 'color/background-color/border-color ∈ палитре tokens.css (var + color-mix от неё); сырые чужие цвета — WARN',
  },
  {
    id: 'L07',
    severity: 'FAIL',
    title: 'Размеры иконок (§7)',
    check: 'svg в контролах ≥ 22 (16–21.9 — WARN, <16 — FAIL); таб-бар 30±2 — FAIL вне; декоративные ≥ 16 — WARN',
  },
  {
    id: 'L08',
    severity: 'FAIL',
    title: 'Линия таб-бара (§8)',
    check: 'высота бара 60±2; центры всех .hub-tab__ico svg на одной Y (разброс ≤ 2px); только на точках хаба',
  },
  {
    id: 'L09',
    severity: 'FAIL',
    title: 'Контраст текста (§1)',
    check: 'ink/ink-dim на тёмном фоне: WCAG ≥ 4.2:1 (3.5–4.19 — WARN, < 3.5 — FAIL)',
  },
  {
    id: 'L10',
    severity: 'WARN',
    title: 'Отступы по базе 4px (§3)',
    check: 'padding/margin прямых детей .scr-main/.hub-section ∈ {4,8,10,12,14,16,20,24,32} ±1 (14px — карточки, 10px — compact: §3)',
  },
  {
    id: 'L11',
    severity: 'FAIL',
    title: 'Геометрия PixelButton (§5)',
    check: '.pxbtn: высота md 52 / lg 60 / xl 68 (±3px); рамка 3px (ghost 2px); шрифт 16/18/20',
  },
  {
    id: 'L12',
    severity: 'FAIL',
    title: 'Overflow (§3)',
    check: 'document.scrollWidth ≤ innerWidth+1; document.scrollHeight ≤ innerHeight+1 (документ не скроллится)',
  },
]

/* ═════════════════ АУДИТ В СТРАНИЦЕ (выполняется в браузере) ═════════════════
   Функция целиком уезжает в page.evaluate — не ссылаться на внешний скоуп. */
function auditInPage([pointName, warnOnly, isHub]) {
  const violations = []
  const stats = Object.create(null)
  const S = (rule) => (stats[rule] = stats[rule] || { checked: 0, violations: 0 })
  const px = (v) => parseFloat(v) || 0
  const r1 = (v) => Math.round(v * 10) / 10

  /* цвет → {r,g,b,a}; поддерживает rgb()/rgba()/color(srgb …) — так Chrome
     сериализует color-mix() в computed style */
  function parseColor(s) {
    if (!s) return null
    s = String(s).trim()
    let m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\)$/.exec(s)
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
      return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a: Math.round(a * 100) / 100 }
    }
    m = /^color\(srgb\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)(?:\s*\/\s*([\d.]+%?))?\)$/.exec(s)
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
      return {
        r: Math.round(+m[1] * 255),
        g: Math.round(+m[2] * 255),
        b: Math.round(+m[3] * 255),
        a: Math.round(a * 100) / 100,
      }
    }
    return null
  }
  const ckey = (c) => (c ? `${c.r},${c.g},${c.b},${c.a}` : null)

  function cssPath(el) {
    const parts = []
    let n = el
    while (n && n.nodeType === 1 && parts.length < 3) {
      let s = n.tagName.toLowerCase()
      if (typeof n.className === 'string' && n.className.trim()) {
        const cls = n.className
          .trim()
          .split(/\s+/)
          .filter((c) => /^[a-zA-Z_][\w-]*$/.test(c))
          .slice(0, 2)
        if (cls.length) s += '.' + cls.join('.')
      }
      parts.unshift(s)
      n = n.parentElement
    }
    return parts.join(' > ')
  }
  function describe(el) {
    const t = el.closest ? el.closest('[data-testid]') : null
    return (t ? `[data-testid=${t.getAttribute('data-testid')}] ` : '') + cssPath(el)
  }
  function snippet(el) {
    let t = ''
    try {
      t = (el.textContent || '').replace(/\s+/g, ' ').trim()
    } catch {}
    return t.slice(0, 30)
  }
  function add(rule, sev, el, fact, expect) {
    if (warnOnly && sev === 'FAIL') sev = 'WARN'
    violations.push({ rule, severity: sev, selector: describe(el), text: snippet(el), fact, expect })
    stats[rule].violations++
  }
  const inCrt = (el) => !!(el.closest && el.closest('.crt'))

  /* ── палитра: actualRGB из var() токенов + всех color-mix выражений CSS.
     Chrome вычисляет color-mix в color(srgb …), поэтому сравниваем по
     нормализованному ключу r,g,b,a. Тематические переменные (--badge-c,
     --chip-c, --rr, …) задаются классами компонентов — раскрываем перебором
     значений токенов, фолбэки var() — по цепочке. ── */
  const probe = document.createElement('span')
  probe.style.cssText = 'display:none'
  document.body.appendChild(probe)
  const probeKey = (v) => {
    probe.style.color = ''
    probe.style.color = v
    return ckey(parseColor(getComputedStyle(probe).color))
  }
  const allowed = new Set()
  {
    let cssText = ''
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) cssText += rule.cssText + '\n'
      } catch {}
    }
    /* 1) декларации --токенов из всех правил (итератор computedStyle не
          отдаёт custom properties — парсим cssText) */
    const tokenMap = new Map()
    for (const m of cssText.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) {
      if (!tokenMap.has(m[1])) tokenMap.set(m[1], m[2].trim())
    }
    /* 2) «тематические» переменные компонентов — их значения приходят
          из классов (например --rr у rarity); перебираем все известные */
    const THEME_VARS = new Set([
      '--badge-c',
      '--chip-c',
      '--rr',
      '--rr-soft',
      '--card-accent',
      '--prog-c',
      '--btn-bg',
      '--btn-bg-hi',
      '--btn-ink',
      '--dither-color',
      '--coach-tail',
    ])
    const variants = [...new Set([...tokenMap.values()])]
    /* один шаг: заменяем самый внутренний var(--x) / var(--x, fallback) */
    const stepVariants = (s) => {
      const m = /var\((--[\w-]+)(?:\s*,\s*([^()]*))?\)/.exec(s)
      if (!m) return null
      const name = m[1]
      const alts = []
      if (tokenMap.has(name)) alts.push(tokenMap.get(name))
      if (m[2] !== undefined) alts.push(m[2].trim())
      if (THEME_VARS.has(name)) alts.push(...variants)
      if (!alts.length) return null
      const head = s.slice(0, m.index)
      const tail = s.slice(m.index + m[0].length)
      return [...new Set(alts)].map((a) => head + a + tail)
    }
    const resolve = (expr) => {
      let set = [expr]
      for (let i = 0; i < 6 && set.some((s) => s.includes('var(')); i++) {
        const next = new Set()
        for (const s of set) {
          const v = stepVariants(s)
          if (v) for (const x of v) next.add(x)
          else next.add(s)
        }
        set = [...next]
        if (set.length > 6000) break
      }
      return set
    }
    /* 3) собираем выражения: одиночные var() и color-mix(...) из cssText */
    const exprs = new Set()
    for (const m of cssText.matchAll(/var\(--[\w-]+(?:\s*,[^()]*)?\)/g)) exprs.add(m[0])
    {
      let idx = 0
      while ((idx = cssText.indexOf('color-mix(', idx)) !== -1) {
        let depth = 1
        let j = idx + 'color-mix('.length
        while (j < cssText.length && depth > 0) {
          const ch = cssText[j]
          if (ch === '(') depth++
          else if (ch === ')') depth--
          j++
        }
        exprs.add(cssText.slice(idx, j))
        idx = j
      }
    }
    for (const e of exprs) {
      for (const r of resolve(e)) {
        const k = probeKey(r)
        if (k) allowed.add(k)
      }
    }
  }
  probe.remove()

  /* ── видимые узлы ── */
  const nodes = []
  for (const el of document.querySelectorAll('body *')) {
    if (inCrt(el)) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.01) continue
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0.5 || rect.height <= 0.5) continue
    nodes.push({ el, cs, rect })
  }
  const hasOwnText = (el) => {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true
    return false
  }
  /* CSS-анимация/переход, крутящий цвета (пульс чипа дня, налив сегментов
     таймера) — у элемента ИЛИ его предков; статичную сверку палитры
     для такого поддерева не делаем */
  const animatesColor = (el) => {
    try {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        if (n.getAnimations && n.getAnimations().length) return true
      }
    } catch {}
    return false
  }
  const fontFamilyOf = (cs) => (cs.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim()

  /* ── L01: тап-таргеты ── */
  for (const { el, rect } of nodes) {
    if (!el.matches('button, [role="button"], a, summary')) continue
    S('L01').checked++
    const w = r1(rect.width)
    const h = r1(rect.height)
    const m = Math.min(w, h)
    if (m < 40) add('L01', 'FAIL', el, `${w}×${h}px`, '≥44×44 (§4)')
    else if (m < 44) add('L01', 'WARN', el, `${w}×${h}px`, '≥44×44 (§4)')
  }

  /* ── L02/L03: шрифтовые шкалы ── */
  const DISPLAY_OK = [15, 16, 18, 20, 25, 30, 35]
  /* Tiny5@13 — микро-подписи/плашки: §2 (строка «микро»), §8 (подпись таб-бара) */
  const MICRO13 =
    '.hub-tab__label, .hub-tab__badge, .chip, .hub-chip, .hub-odds, .cos-card__name, ' +
    '.cos-card__rar, .cos-drop__plate, .coach__step, .lb-row--head, .swatch__name, ' +
    '.icon-cell span, .cos-demo-cell span, .title-streak, .lesson__label'
  const GOLOS_OK = [13, 15, 17, 20]
  for (const { el, cs } of nodes) {
    if (!hasOwnText(el)) continue
    /* эмодзи-плашки (🌊 и т.п.) рисуются системным шрифтом — не текст */
    if (!/[\p{L}\p{N}]/u.test(el.textContent || '')) continue
    const fam = fontFamilyOf(cs)
    const size = px(cs.fontSize)
    if (fam === 'Tiny5') {
      S('L02').checked++
      const isMicro13 = Math.abs(size - 13) < 0.05 && !!el.closest(MICRO13)
      const isBtnNum = (Math.abs(size - 22) < 0.05 || Math.abs(size - 24) < 0.05) && !!el.closest('.pxbtn')
      const ok = DISPLAY_OK.some((v) => Math.abs(size - v) < 0.05) || isMicro13 || isBtnNum
      if (!ok) add('L02', 'WARN', el, `Tiny5 ${r1(size)}px`, `${DISPLAY_OK.join('/')}px (§2)`)
    } else if (fam === 'Golos Text') {
      S('L03').checked++
      if (!GOLOS_OK.some((v) => Math.abs(size - v) < 0.05))
        add('L03', 'WARN', el, `Golos ${r1(size)}px`, `${GOLOS_OK.join('/')}px (§2)`)
    }
  }

  /* ── L04: радиус 0 ── */
  for (const { el, cs } of nodes) {
    S('L04').checked++
    if (el.closest('[class*="hub-play"]')) continue // октагон ▶ — clip-path (§8)
    const br = cs.borderRadius
    if (!br || br === '0px') continue
    const vals = [...br.matchAll(/-?[\d.]+px/g)].map((m) => px(m[0]))
    if (vals.some((v) => v > 0.5)) add('L04', 'FAIL', el, `border-radius ${br}`, '0 (§13)')
  }

  /* ── L05: тени без blur ── */
  const GLOW_WARN = '.dr--common, .dr--rare, .dr--epic, .dr--legend, .chart-panel, .cos-drop__burst'
  const splitLayers = (str) => {
    const out = []
    let depth = 0
    let cur = ''
    for (const ch of str) {
      if (ch === '(') depth++
      else if (ch === ')') depth--
      if (ch === ',' && depth === 0) {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
    if (cur.trim()) out.push(cur)
    return out
  }
  const blurOf = (layer) => {
    const nums = [...layer.matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1]))
    return nums.length >= 3 ? nums[2] : 0
  }
  for (const { el, cs } of nodes) {
    S('L05').checked++
    const bs = cs.boxShadow
    if (bs && bs !== 'none') {
      for (const layer of splitLayers(bs)) {
        const b = blurOf(layer)
        if (b > 0.5) {
          add('L05', el.closest(GLOW_WARN) ? 'WARN' : 'FAIL', el, `blur ${r1(b)}px`, '0 (§13, без размытий)')
          break
        }
      }
    }
    const flt = cs.filter
    if (flt && flt !== 'none') {
      for (const m of flt.matchAll(/drop-shadow\(([^)]*)\)/g)) {
        const b = blurOf(m[1])
        if (b > 0.5) add('L05', el.closest(GLOW_WARN) ? 'WARN' : 'FAIL', el, `drop-shadow blur ${r1(b)}px`, '0 (§13)')
      }
    }
  }

  /* ── L06: палитра ── */
  for (const { el, cs } of nodes) {
    S('L06').checked++
    if (animatesColor(el)) continue
    const c = parseColor(cs.color)
    if (c && !allowed.has(ckey(c))) add('L06', 'WARN', el, `color: ${cs.color}`, 'палитра tokens.css (§1)')
    const bg = parseColor(cs.backgroundColor)
    if (bg && bg.a > 0 && !allowed.has(ckey(bg)))
      add('L06', 'WARN', el, `background: ${cs.backgroundColor}`, 'палитра tokens.css (§1)')
    if (cs.borderTopStyle !== 'none' && px(cs.borderTopWidth) > 0) {
      const bc = parseColor(cs.borderTopColor)
      if (bc && bc.a > 0 && !allowed.has(ckey(bc)))
        add('L06', 'WARN', el, `border: ${cs.borderTopColor}`, 'палитра tokens.css (§1)')
    }
  }

  /* ── L07: иконки ──
     Спрайт-арт матриц (§7 «матрицы», README: ItemIcon 1:1) и частицы
     эффектов — не UI-иконки, не проверяем. Пометки-статусы (замок, галка,
     метки дня) — декоративный ярус ≥16. */
  const L07_SKIP =
    '.cos-card__ico, .cos-drop__item, .cos-card__spark, .cos-drop__spark, .dr-cas, ' +
    '.dr-puff, .dr-trail, .dr-orbit, .dr-fw, .dr-ring, .dr-god, .crt, .chest, .axo'
  const L07_MARKS = '.cos-card__check, .cos-card__lock, .daily__tick, .daily__dir'
  for (const { el, rect } of nodes) {
    if (el.tagName !== 'svg') continue
    S('L07').checked++
    if (el.closest(L07_SKIP)) continue
    const w = r1(rect.width)
    const h = r1(rect.height)
    const m = Math.min(w, h)
    if (el.closest('.hub-tab__ico')) {
      if (Math.abs(m - 30) > 2) add('L07', 'FAIL', el, `${w}×${h}px`, 'таб-бар 30±2 (§8)')
    } else if (el.closest('button, [role="button"], a') && !el.closest(L07_MARKS)) {
      if (m < 16) add('L07', 'FAIL', el, `${w}×${h}px`, 'в кнопке ≥22 (§7)')
      else if (m < 22) add('L07', 'WARN', el, `${w}×${h}px`, 'в кнопке ≥22 (§7)')
    } else {
      if (m < 16) add('L07', 'WARN', el, `${w}×${h}px`, 'декоративная ≥16 (§7)')
    }
  }

  /* ── L08: линия таб-бара (только хаб) ── */
  if (isHub) {
    const st = S('L08')
    const bar = document.querySelector('[data-testid="hub-tabbar"]')
    if (bar) {
      st.checked = 1
      const bh = r1(bar.getBoundingClientRect().height)
      if (Math.abs(bh - 60) > 2) add('L08', 'FAIL', bar, `высота бара ${bh}px`, '60±2 (§8)')
      const centers = [...document.querySelectorAll('.hub-tab__ico svg')].map((s) => {
        const r = s.getBoundingClientRect()
        return r.top + r.height / 2
      })
      if (centers.length >= 2) {
        const spread = Math.max(...centers) - Math.min(...centers)
        if (spread > 2) add('L08', 'FAIL', bar, `разброс центров Y ${r1(spread)}px`, '≤2px (§8)')
      }
    }
  }

  /* ── L09: контраст ink/ink-dim (WCAG) ── */
  const lum = (c) => {
    const f = (v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const INK = ckey(parseColor('rgb(234, 246, 255)'))
  const INKDIM = ckey(parseColor('rgb(143, 179, 217)'))
  for (const { el, cs } of nodes) {
    if (!hasOwnText(el)) continue
    const c = parseColor(cs.color)
    if (!c) continue
    const k = ckey(c)
    if (k !== INK && k !== INKDIM) continue
    let bg = null
    let p = el
    while (p && p.nodeType === 1) {
      const b = parseColor(getComputedStyle(p).backgroundColor)
      if (b && b.a >= 0.9) {
        bg = b
        break
      }
      p = p.parentElement
    }
    if (!bg) bg = parseColor('rgb(13, 27, 46)') // фон экрана --bg
    const l1 = lum(c)
    const l2 = lum(bg)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    S('L09').checked++
    const rr = Math.round(ratio * 100) / 100
    if (ratio < 3.5) add('L09', 'FAIL', el, `контраст ${rr}:1 (${cs.color})`, '≥4.2:1 (§1)')
    else if (ratio < 4.2) add('L09', 'WARN', el, `контраст ${rr}:1`, '≥4.2:1 (§1)')
  }

  /* ── L10: отступы детей скролл-контейнеров ── */
  const SPACING_OK = [0, 4, 8, 10, 12, 14, 16, 20, 24, 32]
  for (const cont of document.querySelectorAll('.scr-main, .hub-section')) {
    for (const child of cont.children) {
      if (inCrt(child)) continue
      const cs = getComputedStyle(child)
      if (cs.display === 'none') continue
      const rect = child.getBoundingClientRect()
      if (rect.width <= 0.5 || rect.height <= 0.5) continue
      S('L10').checked++
      const props = [
        [cs.paddingTop, 'padding-top'],
        [cs.paddingRight, 'padding-right'],
        [cs.paddingBottom, 'padding-bottom'],
        [cs.paddingLeft, 'padding-left'],
        [cs.marginTop, 'margin-top'],
        [cs.marginBottom, 'margin-bottom'],
        [cs.marginLeft, 'margin-left'],
        [cs.marginRight, 'margin-right'],
      ]
      for (const [v, name] of props) {
        if (!v || v === 'auto') continue
        const n = parseFloat(v)
        if (Number.isNaN(n)) continue
        if (!SPACING_OK.some((s) => Math.abs(n - s) <= 1)) {
          add('L10', 'WARN', child, `${name}: ${r1(n)}px`, 'шаг 4px, 14px — карточки (§3)')
          break
        }
      }
    }
  }

  /* ── L11: геометрия PixelButton ── */
  for (const { el, cs, rect } of nodes) {
    if (!el.classList || !el.classList.contains('pxbtn')) continue
    S('L11').checked++
    const size = el.classList.contains('pxbtn--xl') ? 'xl' : el.classList.contains('pxbtn--lg') ? 'lg' : 'md'
    const want = size === 'xl' ? 68 : size === 'lg' ? 60 : 52
    const h = r1(rect.height)
    if (Math.abs(h - want) > 3) add('L11', 'FAIL', el, `${size}: высота ${h}px`, `${want}±3px (§5)`)
    const ghost = el.classList.contains('pxbtn--ghost')
    const bw = px(cs.borderTopWidth)
    if (Math.abs(bw - (ghost ? 2 : 3)) > 0.5)
      add('L11', 'FAIL', el, `рамка ${bw}px`, ghost ? '2px ghost (§5)' : '3px (§5)')
    const wantFs = size === 'xl' ? 20 : size === 'lg' ? 18 : 16
    const fs = px(cs.fontSize)
    if (Math.abs(fs - wantFs) > 0.5) add('L11', 'WARN', el, `шрифт ${r1(fs)}px`, `${wantFs}px (§5)`)
  }

  /* ── L12: overflow документа ── */
  {
    S('L12').checked = 1
    const se = document.scrollingElement || document.documentElement
    if (se.scrollWidth > window.innerWidth + 1)
      add('L12', 'FAIL', document.body, `scrollWidth ${se.scrollWidth} > innerWidth ${window.innerWidth}`, '≤ +1 (§3)')
    if (se.scrollHeight > window.innerHeight + 1)
      add('L12', 'FAIL', document.body, `scrollHeight ${se.scrollHeight} > innerHeight ${window.innerHeight}`, '≤ +1 (§3)')
  }

  return { point: pointName, warnOnly: !!warnOnly, stats, violations }
}

/* ═════════════════ ДРАЙВЕР ТОЧЕК ═════════════════ */

const results = []

async function auditPoint(page, point, opts = {}) {
  const errors = page.__axErrors || []
  try {
    const res = await page.evaluate(auditInPage, [point, !!opts.warnOnly, !!opts.isHub])
    if (errors.length) res.errors = errors.slice(0, 3)
    results.push(res)
    return res
  } catch (e) {
    const res = { point, skipped: true, note: String(e && e.message ? e.message : e).slice(0, 120), stats: {}, violations: [] }
    results.push(res)
    return res
  }
}

function report(res) {
  if (JSON_MODE) return /* в --json на stdout только машинный вывод */
  if (res.skipped) {
    console.log(`▶ ${res.point} — ⏭ SKIP (${res.note})`)
    return
  }
  const fails = res.violations.filter((v) => v.severity === 'FAIL').length
  const warns = res.violations.filter((v) => v.severity === 'WARN').length
  const status = fails ? '❌ FAIL' : warns ? '⚠️ WARN' : '✅ PASS'
  const counts = Object.entries(res.stats)
    .map(([r, s]) => `${r}×${s.checked}`)
    .join(' ')
  console.log(`▶ ${res.point} — ${status} (проверено: ${counts || '—'})`)
  for (const v of res.violations) {
    console.log(`   ${v.severity === 'FAIL' ? '❌' : '⚠️ '} [${v.rule}] ${v.selector} «${v.text}» — ${v.fact} (нужно: ${v.expect})`)
  }
}

function watchErrors(page) {
  page.__axErrors = []
  page.on('pageerror', (err) => page.__axErrors.push(`pageerror: ${err.message}`))
}

const settle = (page, ms) => page.waitForTimeout(ms)
const clickT = (page, testid) => page.locator(`[data-testid="${testid}"] button`).click()

/* ── контекст А: хаб с чистым профилем + вкладки + регистрация ── */
async function runHub(browser) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })

  /* негативный контроль: инъекция нарушений перед аудитом hub-home */
  if (SELFTEST) {
    await page.addStyleTag({
      content: [
        '.hub-hello { font-size: 19px !important; border-radius: 8px !important; color: rgb(200, 30, 90) !important; }',
        '.hub-chip--coin svg { width: 10px !important; height: 10px !important; }',
        '.hub-tab__ico svg { width: 26px !important; height: 26px !important; }',
      ].join('\n'),
    })
    await page.waitForTimeout(300)
  }

  /* coach-подсказки первого запуска: закрыть «Далее» (3 шага, §12) */
  for (let i = 0; i < 6; i++) {
    if ((await page.locator('[data-testid="coach-tip"]').count()) === 0) break
    await page.locator('.coach__next').click()
    await settle(page, 350)
  }
  await settle(page, 600)
  report(await auditPoint(page, 'hub-home', { isHub: true }))

  /* вкладки хаба: Играть → Аккаунт → Гардероб → Магазин */
  const tabs = [
    ['tab-play', 'hub-section-play', 'hub-play'],
    ['tab-account', 'hub-section-account', 'hub-account'],
    ['btn-wardrobe', 'hub-section-wardrobe', 'hub-wardrobe'],
    ['tab-shop', 'hub-section-shop', 'hub-shop'],
  ]
  for (const [tab, section, point] of tabs) {
    await clickT(page, tab)
    await page.locator(`[data-testid="${section}"]`).waitFor({ timeout: 8000 })
    await settle(page, 600)
    report(await auditPoint(page, point, { isHub: true }))
  }

  /* повторный тап по активной вкладке — назад на Главную, оттуда в игру:
     чистый профиль → полный экран ника (регистрация) */
  await clickT(page, 'tab-shop')
  await page.locator('[data-testid="hub-section-home"]').waitFor({ timeout: 8000 })
  await settle(page, 400)
  await clickT(page, 'btn-play')
  await page.locator('[data-testid="input-nick"]').waitFor({ timeout: 8000 })
  await settle(page, 800)
  report(await auditPoint(page, 'registration'))

  await ctx.close()
}

/* ── контекст B: игровой цикл до summary (аудит стадий — раунд 1) ── */
async function runGame(browser) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)
  await ctx.addInitScript(() => {
    window.localStorage.setItem('ax_nick', JSON.stringify('ДИЗАЙН_ЛИНТ'))
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })
  await clickT(page, 'btn-play')
  await page.locator('[data-testid="btn-read-news"] button').waitFor({ timeout: 10000 })

  let auditStages = true // полный проход стадий — только на раунде 1
  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]

    /* интро */
    await page.locator('[data-testid="btn-read-news"] button').waitFor({ timeout: 12000 })
    await settle(page, auditStages ? 1600 : 300)
    if (auditStages) report(await auditPoint(page, 'game-roundIntro'))
    await clickT(page, 'btn-read-news')

    /* новости: раскрыть все, затем «Кто это?» */
    await page.locator('[data-testid="btn-news-next"] button').waitFor({ timeout: 8000 })
    for (let n = 1; n < round.news.length; n++) {
      await clickT(page, 'btn-news-next')
      await settle(page, 250)
    }
    await settle(page, auditStages ? 900 : 200)
    if (auditStages) report(await auditPoint(page, 'game-news'))
    await clickT(page, 'btn-news-next')

    /* квиз «компания» */
    await page.locator('h2:has-text("О какой компании новости?")').waitFor({ timeout: 8000 })
    await settle(page, auditStages ? 900 : 250)
    if (auditStages) report(await auditPoint(page, 'game-quizCompany'))
    await clickT(page, 'quiz-opt-0')
    await page.locator('h2:has-text("В каком году это было?")').waitFor({ timeout: 8000 })
    await settle(page, auditStages ? 900 : 250)
    if (auditStages) report(await auditPoint(page, 'game-quizYear'))
    await clickT(page, 'quiz-opt-0')

    /* ставка */
    await page.locator('[data-testid="btn-bet-up"] button').waitFor({ timeout: 8000 })
    await settle(page, auditStages ? 900 : 250)
    if (auditStages) report(await auditPoint(page, 'game-bet'))
    await clickT(page, 'btn-bet-up')

    /* ревил: бейдж движения или кнопка «Далее» (что раньше);
       «Далее» может достраивать анимацию — кликаем дважды
       (как revealNext в e2e.mjs) */
    await page.locator('.movepct, [data-testid="btn-reveal-next"]').waitFor({ timeout: 15000 })
    await settle(page, auditStages ? 1600 : 900)
    if (auditStages) report(await auditPoint(page, 'game-reveal'))
    for (let t = 0; t < 3; t++) {
      await clickT(page, 'btn-reveal-next')
      await settle(page, 400)
      if ((await page.locator('[data-testid="btn-reveal-next"]').count()) === 0) break
    }
    auditStages = false
    if (i === rounds.length - 1) {
      await page.locator('[data-testid="btn-send-score"] button').waitFor({ timeout: 15000 })
      await settle(page, 1600)
      report(await auditPoint(page, 'game-summary'))
    }
  }
  await ctx.close()
}

/* ── контекст C: лидерборд из хаба ── */
async function runLeaderboard(browser) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)
  await ctx.addInitScript(() => {
    window.localStorage.setItem('ax_nick', JSON.stringify('ДИЗАЙН_ЛИНТ'))
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })
  await clickT(page, 'btn-leaderboard')
  await page.locator('.lb-table').waitFor({ timeout: 12000 })
  await settle(page, 1600)
  report(await auditPoint(page, 'leaderboard'))
  await ctx.close()
}

/* ── контекст D: витрина #design (служебная — только WARN) ── */
async function runDesignDemo(browser) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)
  await page.goto(BASE + '/#design', { waitUntil: 'networkidle' })
  await page.locator('.demo-hero').waitFor({ timeout: 15000 })
  await settle(page, 1500)
  report(await auditPoint(page, '#design', { warnOnly: true }))
  await ctx.close()
}

/* ═════════════════ ЗАПУСК ═════════════════ */

const browser = await chromium.launch()
const scenarios = [
  ['хаб+вкладки+регистрация', runHub],
  ['игровой цикл', runGame],
  ['лидерборд', runLeaderboard],
  ['витрина #design', runDesignDemo],
]
try {
  for (const [name, fn] of scenarios) {
    try {
      await fn(browser)
    } catch (e) {
      /* сценарий упал (таймаут навигации и т.п.) — фиксируем и идём дальше:
         точки этого сценария останутся непроверенными, скрипт не падает */
      results.push({
        point: `(${name})`,
        skipped: true,
        note: String(e && e.message ? e.message : e).split('\n')[0].slice(0, 120),
        stats: {},
        violations: [],
      })
    }
  }
} finally {
  await browser.close()
}

/* сводка */
const points = results.map((r) => {
  if (r.skipped) return { point: r.point, status: 'SKIP', fail: 0, warn: 0, note: r.note }
  const fail = r.violations.filter((v) => v.severity === 'FAIL').length
  const warn = r.violations.filter((v) => v.severity === 'WARN').length
  return { point: r.point, status: fail ? 'FAIL' : warn ? 'WARN' : 'PASS', fail, warn }
})
const totalFail = points.reduce((a, p) => a + p.fail, 0)
const totalWarn = points.reduce((a, p) => a + p.warn, 0)

if (JSON_MODE) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        base: BASE,
        device: 'iPhone 13 (chromium, ru-RU)',
        rules: RULES,
        points: results,
        summary: { points, totalFail, totalWarn },
      },
      null,
      2,
    ),
  )
} else {
  console.log('\n═══ Сводка design-lint ═══')
  for (const p of points)
    console.log(
      `  ${p.status === 'PASS' ? '✅' : p.status === 'WARN' ? '⚠️ ' : p.status === 'FAIL' ? '❌' : '⏭ '} ${p.point.padEnd(18)} ${p.status}${p.fail ? ` (FAIL:${p.fail})` : ''}${p.warn ? ` (WARN:${p.warn})` : ''}`,
    )
  console.log(`═══ Итог: ${totalFail} FAIL, ${totalWarn} WARN на ${points.length} точках ═══`)
}

/* негативный контроль (--selftest): инъекционные FAIL — ожидаемы;
   успех = все проверяемые правила сработали на hub-home */
if (SELFTEST) {
  const home = results.find((r) => r.point === 'hub-home')
  const need = ['L02', 'L04', 'L06', 'L07']
  const hit = need.filter((id) => home && home.violations.some((v) => v.rule === id))
  const missing = need.filter((id) => !hit.includes(id))
  console.log(
    missing.length
      ? `✗ selftest: правила НЕ сработали на инъекциях: ${missing.join(', ')}`
      : `✓ selftest: чувствительность подтверждена — ${hit.join(', ')} поймали инъекции на hub-home`,
  )
  process.exit(missing.length ? 1 : 0)
}

process.exit(totalFail ? 1 : 0)
