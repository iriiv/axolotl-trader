/* ═══════════════════════════════════════════════════════════════
   PriceChart — пиксельный график Canvas 2D.

   Почему Canvas, а не SVG: ступенчатую линию и шахматный дизеринг
   нужно рисовать по целочисленной сетке в device-пикселях (integer
   scale от DPR), иначе появляется антиалиасинг и «пиксельность»
   умирает. Компонент чистый — никакой игровой логики; анимацию
   ревила (revealProgress 0→1) гонит родитель через rAF.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from 'react'
import './price-chart.css'

export interface PriceChartProps {
  dates: string[]
  closes: number[]
  decisionIndex: number
  /** 0 = только контекст до дня решения; 1 = весь ревил */
  revealProgress?: number
  /** показать дату ревила (момент истины) после отрисовки */
  showFinalDate?: boolean
  finalDate?: string
  /** высота в CSS-пикселях */
  height?: number
  className?: string
}

/** разрыв торгов: больше 7 календарных дней между сессиями */
const GAP_DAYS = 7

/** пиксель-глиф «?» 5×7 (для затемнённой зоны неизвестности) */
const QMARK = ['01110', '10001', '00001', '00110', '00100', '00000', '00100']

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function dayDiff(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`)
  const tb = Date.parse(`${b}T00:00:00Z`)
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0
  return Math.round((tb - ta) / 86_400_000)
}

function cssVar(name: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  } catch {
    return ''
  }
}

/** ярлык цены справа: округляем по magnitude, чтобы не мельтешило */
function priceLabel(v: number): string {
  if (v >= 1000) return (Math.round(v / 10) * 10).toLocaleString('ru-RU')
  if (v >= 100) return String(Math.round(v))
  if (v >= 10) return (Math.round(v * 10) / 10).toFixed(1).replace('.', ',')
  return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',')
}

function isoToRu(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

/** шахматный паттерн 2×2 для заливки под линией (каждая 2-я клетка) */
function ditherPattern(ctx: CanvasRenderingContext2D, color: string, s: number): CanvasPattern | null {
  const tile = document.createElement('canvas')
  tile.width = 4 * s
  tile.height = 4 * s
  const g = tile.getContext('2d')
  if (!g) return null
  g.fillStyle = color
  g.fillRect(0, 0, 2 * s, 2 * s)
  g.fillRect(2 * s, 2 * s, 2 * s, 2 * s)
  return ctx.createPattern(tile, 'repeat')
}

export function PriceChart({
  dates,
  closes,
  decisionIndex,
  revealProgress = 0,
  showFinalDate = false,
  finalDate,
  height = 232,
  className,
}: PriceChartProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [width, setWidth] = useState(0)

  /* ширина контейнера (перерисовка на resize/повороте) */
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect.width ?? 0)
      setWidth((prev) => (prev === w ? prev : w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = closes.length
  const di = Math.max(0, Math.min(decisionIndex, n - 2))
  const p = clamp01(revealProgress)
  const lastIdx = Math.min(n - 1, di + Math.floor((n - 1 - di) * p))

  /* разрывы торгов в видимой части (для знака ∥ и легенды) */
  const gaps = useMemo<number[]>(() => {
    const out: number[] = []
    for (let i = 1; i <= lastIdx; i++) {
      if (dayDiff(dates[i - 1] ?? '', dates[i] ?? '') > GAP_DAYS) out.push(i)
    }
    return out
  }, [dates, lastIdx])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0 || n < 2) return

    /* integer scale: пиксели не «поплывут» на Retina */
    const scale = Math.max(1, Math.floor(window.devicePixelRatio || 1))
    const W = Math.floor(width * scale)
    const H = Math.floor(height * scale)
    canvas.width = W
    canvas.height = H
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    const s = scale
    const padL = Math.round(8 * s)
    const padR = Math.round(56 * s)
    const padT = Math.round(14 * s)
    const padB = Math.round(20 * s)
    const plotW = W - padL - padR
    const plotH = H - padT - padB
    const plotR = padL + plotW
    const baseline = padT + plotH
    if (plotW <= 10 * s || plotH <= 10 * s) return

    /* ── Y-шкала: контекст → полный диапазон по прогрессу ── */
    let ctxMin = Infinity
    let ctxMax = -Infinity
    for (let i = 0; i <= di; i++) {
      if (closes[i] < ctxMin) ctxMin = closes[i]
      if (closes[i] > ctxMax) ctxMax = closes[i]
    }
    let finMin = ctxMin
    let finMax = ctxMax
    for (let i = di + 1; i < n; i++) {
      if (closes[i] < finMin) finMin = closes[i]
      if (closes[i] > finMax) finMax = closes[i]
    }
    // экспоненциально-подобное сглаживание (ease-out): шкала «поддаётся»
    // к итогу быстрее вначале и мягко дотягивается в конце
    const ease = 1 - Math.pow(1 - p, 3)
    let lo = ctxMin + (finMin - ctxMin) * ease
    let hi = ctxMax + (finMax - ctxMax) * ease
    // страховка: видимые точки всегда внутри поля
    for (let i = 0; i <= lastIdx; i++) {
      if (closes[i] < lo) lo = closes[i]
      if (closes[i] > hi) hi = closes[i]
    }
    const range = Math.max(hi - lo, Math.abs(hi) * 0.01, 0.5)
    lo -= range * 0.08
    hi += range * 0.08

    const xAt = (i: number) => Math.round(padL + ((n - 1 === 0 ? 0 : i / (n - 1)) * plotW))
    const yAt = (v: number) => Math.round(padT + (1 - (v - lo) / (hi - lo)) * plotH)
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < n; i++) {
      xs.push(xAt(i))
      ys.push(yAt(closes[i]))
    }

    const C = {
      aqua: cssVar('--aqua') || '#4ce0c3',
      up: cssVar('--up') || '#43e97b',
      down: cssVar('--down') || '#ff5f7a',
      gold: cssVar('--gold') || '#ffd23e',
      ink: cssVar('--ink') || '#eaf6ff',
      inkDim: cssVar('--ink-dim') || '#8fb3d9',
      line: cssVar('--line') || '#2c4667',
      outline: cssVar('--outline') || '#071018',
    }
    const finalUp = closes[n - 1] >= closes[di]
    const revealColor = finalUp ? C.up : C.down
    const font = `400 ${Math.round(11 * s)}px Tiny5, monospace`

    /* ── сетка + ценовые деления справа ── */
    ctx.lineWidth = s
    ctx.strokeStyle = C.line
    ctx.globalAlpha = 0.55
    ctx.fillStyle = C.inkDim
    ctx.font = font
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    const TICKS = 4
    for (let k = 0; k <= TICKS; k++) {
      const v = lo + ((hi - lo) * k) / TICKS
      const y = yAt(v)
      // пунктир: 4 вкл / 3 выкл
      for (let x = padL; x < plotR; x += 7 * s) {
        ctx.fillRect(x, y, 4 * s, s)
      }
      ctx.fillText(priceLabel(v), plotR + 4 * s, Math.min(y + 3 * s, baseline - 10 * s))
    }
    ctx.globalAlpha = 1

    /* ── зона неизвестности: затемнение после последней видимой точки ── */
    const darkFrom = xs[lastIdx]
    if (darkFrom < plotR) {
      ctx.globalAlpha = p === 0 ? 0.4 : 0.22
      ctx.fillStyle = C.outline
      ctx.fillRect(darkFrom, padT, plotR - darkFrom, plotH)
      ctx.globalAlpha = 1

      // знак «?» по центру зоны — только до начала ревила
      if (p === 0 && plotR - darkFrom > 30 * s) {
        const cell = 3 * s
        const gw = 5 * cell
        const gh = 7 * cell
        const gx = Math.round((darkFrom + plotR) / 2 - gw / 2)
        const gy = Math.round(padT + plotH / 2 - gh / 2)
        ctx.fillStyle = C.ink
        ctx.globalAlpha = 0.85
        QMARK.forEach((row, ry) => {
          for (let rx = 0; rx < row.length; rx++) {
            if (row[rx] === '1') ctx.fillRect(gx + rx * cell, gy + ry * cell, cell, cell)
          }
        })
        ctx.globalAlpha = 1
      }
    }

    /* ── ступенчатая линия (2 прохода: контур + цвет) ── */
    const strokeSteps = (from: number, to: number, color: string, wid: number) => {
      if (to <= from) return
      ctx.beginPath()
      ctx.moveTo(xs[from], ys[from])
      for (let i = from + 1; i <= to; i++) {
        ctx.lineTo(xs[i], ys[i - 1])
        ctx.lineTo(xs[i], ys[i])
      }
      ctx.strokeStyle = color
      ctx.lineWidth = wid
      ctx.stroke()
    }

    /* мягкое свечение линии: тот же путь с небольшой shadowBlur
       цвета линии (графика остаётся ступенчатой — это свет, не blur
       спрайтов; движение/свечение разрешены дизайн-кодом) */
    const glowSteps = (from: number, to: number, color: string) => {
      if (to <= from) return
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(xs[from], ys[from])
      for (let i = from + 1; i <= to; i++) {
        ctx.lineTo(xs[i], ys[i - 1])
        ctx.lineTo(xs[i], ys[i])
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 2 * s
      ctx.shadowColor = color
      ctx.shadowBlur = 5 * s
      ctx.globalAlpha = 0.55
      ctx.stroke()
      ctx.restore()
      ctx.globalAlpha = 1
    }

    // дизеринг-заливка под линией: клип-полигон + шахматный паттерн
    const fillUnder = (from: number, to: number, color: string) => {
      if (to <= from) return
      const pat = ditherPattern(ctx, color, s)
      if (!pat) return
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(xs[from], baseline)
      ctx.lineTo(xs[from], ys[from])
      for (let i = from + 1; i <= to; i++) {
        ctx.lineTo(xs[i], ys[i - 1])
        ctx.lineTo(xs[i], ys[i])
      }
      ctx.lineTo(xs[to], baseline)
      ctx.closePath()
      ctx.clip()
      ctx.globalAlpha = 0.4
      ctx.fillStyle = pat
      ctx.fillRect(padL, padT, plotW, plotH)
      ctx.restore()
      ctx.globalAlpha = 1
    }

    fillUnder(0, di, C.aqua)
    strokeSteps(0, di, C.outline, 3 * s + 2 * s)
    strokeSteps(0, di, C.aqua, 3 * s)
    glowSteps(0, di, C.aqua)

    if (lastIdx > di) {
      fillUnder(di, lastIdx, revealColor)
      strokeSteps(di, lastIdx, C.outline, 3 * s + 2 * s)
      strokeSteps(di, lastIdx, revealColor, 3 * s)
      glowSteps(di, lastIdx, revealColor)
    }

    /* ── вертикальный пунктир в день решения + флажок ── */
    const dx = xs[di]
    ctx.fillStyle = C.aqua
    ctx.globalAlpha = 0.8
    for (let y = padT; y < baseline; y += 8 * s) {
      ctx.fillRect(dx, y, s, 4 * s)
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = C.gold
    ctx.fillRect(dx + s, padT + 2 * s, 7 * s, 5 * s)
    ctx.strokeStyle = C.outline
    ctx.lineWidth = s
    ctx.strokeRect(dx + s, padT + 2 * s, 7 * s, 5 * s)

    /* ── разрывы торгов: «∥» на нижней оси ── */
    ctx.fillStyle = C.gold
    for (const i of gaps) {
      const gx = Math.round((xs[i - 1] + xs[i]) / 2)
      ctx.fillRect(gx - 3 * s, baseline + 4 * s, s, 8 * s)
      ctx.fillRect(gx + 1 * s, baseline + 4 * s, s, 8 * s)
    }

    /* ── нижняя ось: слева «−N дней», справа «сегодня»/дата ревила ── */
    ctx.fillStyle = C.inkDim
    ctx.font = font
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillText(`−${di} дней`, padL, baseline + 4 * s)
    ctx.textAlign = 'right'
    const rightLabel = showFinalDate && finalDate ? isoToRu(finalDate) : 'сегодня'
    ctx.fillStyle = showFinalDate && finalDate ? C.gold : C.inkDim
    ctx.fillText(rightLabel, plotR, baseline + 4 * s)
    ctx.textAlign = 'left'
  }, [width, height, dates, closes, di, n, p, lastIdx, showFinalDate, finalDate, gaps])

  const ariaLabel = 'График цены акции: история до дня решения и скрытое будущее'

  return (
    <div className={`price-chart ${className ?? ''}`} ref={wrapRef}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
      {gaps.length > 0 && (
        <div className="price-chart__note" aria-hidden="true">
          ∥ — пауза торгов
        </div>
      )}
    </div>
  )
}
