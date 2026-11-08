/* ═══════════════════════════════════════════════════════════════
   UI-КИТ «пиксельный ночной океан» — все компоненты чистые,
   без игровой логики. Стили в ui.css, палитра — только var().
   Кнопки и варианты ответов сами проигрывают sfx.tap()+haptic.tap().
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate } from 'framer-motion'
import { sfx } from './sfx'
import { haptic } from './haptics'
import {
  IconArrowUp,
  IconArrowDown,
  IconClose,
  IconStar,
  IconHeart,
} from './icons'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

/* ═══════════════════════ PixelButton ═══════════════════════ */

export interface PixelButtonProps {
  children?: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'danger' | 'gold' | 'ghost' | 'up' | 'down'
  size?: 'md' | 'lg' | 'xl'
  full?: boolean
  disabled?: boolean
  icon?: ReactNode
  type?: 'button' | 'submit'
  className?: string
  ariaLabel?: string
}

export function PixelButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  full,
  disabled,
  icon,
  type = 'button',
  className,
  ariaLabel,
}: PixelButtonProps) {
  const autoIcon =
    icon !== undefined ? icon : variant === 'up' ? <IconArrowUp /> : variant === 'down' ? <IconArrowDown /> : null
  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cx(
        'pxbtn',
        `pxbtn--${variant}`,
        `pxbtn--${size}`,
        full && 'pxbtn--full',
        disabled && 'pxbtn--disabled',
        className,
      )}
      onClick={() => {
        if (disabled) return
        sfx.tap()
        haptic.tap()
        onClick?.()
      }}
    >
      {autoIcon ? <span className="pxbtn__icon" aria-hidden="true">{autoIcon}</span> : null}
      {children ? <span className="pxbtn__label">{children}</span> : null}
    </button>
  )
}

/* ═══════════════════════ PixelCard ═══════════════════════ */

export interface PixelCardProps {
  children?: ReactNode
  title?: ReactNode
  accent?: 'aqua' | 'gold' | 'pink' | 'up' | 'down'
  glow?: boolean
  className?: string
}

export function PixelCard({ children, title, accent = 'aqua', glow, className }: PixelCardProps) {
  return (
    <section
      className={cx('pxcard', `pxcard--${accent}`, glow && 'pxcard--glow', className)}
    >
      {title !== undefined && (
        <header className="pxcard__title">
          <span className="pxcard__title-text">{title}</span>
        </header>
      )}
      <div className="pxcard__body">{children}</div>
    </section>
  )
}

/* ═══════════════════════ OptionButton ═══════════════════════ */

export type OptionState = 'default' | 'correct' | 'wrong' | 'muted' | 'selected'

export interface OptionButtonProps {
  label: ReactNode
  hint?: ReactNode
  state?: OptionState
  onClick?: () => void
  /** 0..3 → А/Б/В/Г; без index — чип не показывается */
  index?: number
}

const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е']

export function OptionButton({ label, hint, state = 'default', onClick, index }: OptionButtonProps) {
  const letter = index !== undefined ? (LETTERS[index] ?? String(index + 1)) : null
  return (
    <button
      type="button"
      className={cx('opt', `opt--${state}`)}
      onClick={() => {
        if (state === 'muted') return
        sfx.tap()
        haptic.tap()
        onClick?.()
      }}
      aria-pressed={state === 'selected'}
    >
      {letter && <span className="opt__chip" aria-hidden="true">{letter}</span>}
      <span className="opt__text">
        <span className="opt__label">{label}</span>
        {hint && <span className="opt__hint">{hint}</span>}
      </span>
    </button>
  )
}

/* ═══════════════════════ Badge ═══════════════════════ */

export type BadgeColor = 'aqua' | 'gold' | 'pink' | 'up' | 'down' | 'ink'

export function Badge({
  children,
  color = 'aqua',
}: {
  children: ReactNode
  color?: BadgeColor
}) {
  return <span className={cx('badge', `badge--${color}`)}>{children}</span>
}

/* ═══════════════════════ TimerBar ═══════════════════════
   Два режима:
   1) собственный таймер: <TimerBar seconds={15} running paused? onEnd/>
      — rAF-обратный отсчёт; при 0 дёргается onEnd (один раз).
      Перезапуск: running false→true или смена seconds.
   2) внешний прогресс: <TimerBar progress={0.63}/> — рисует как есть.
   Сегменты (по умолчанию 15) гаснут слева направо; цвет aqua→gold→down.
   ═══════════════════════ */

export interface TimerBarProps {
  seconds?: number
  running?: boolean
  paused?: boolean
  onEnd?: () => void
  /** внешний прогресс 0..1 (перекрывает внутренний таймер) */
  progress?: number
  segments?: number
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function TimerBar({
  seconds = 15,
  running = true,
  paused = false,
  onEnd,
  progress,
  segments = 15,
}: TimerBarProps) {
  const external = typeof progress === 'number'
  const [frac, setFrac] = useState(external ? clamp01(progress) : 1)
  const elapsedRef = useRef(0)
  const endedRef = useRef(false)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  // внешний режим
  useEffect(() => {
    if (external) setFrac(clamp01(progress as number))
  }, [progress, external])

  // внутренний режим: rAF
  useEffect(() => {
    if (external || !running || paused) return
    endedRef.current = false
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      elapsedRef.current += t - last
      last = t
      const f = 1 - elapsedRef.current / (seconds * 1000)
      if (f <= 0) {
        setFrac(0)
        if (!endedRef.current) {
          endedRef.current = true
          onEndRef.current?.()
        }
        return
      }
      setFrac(f)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, paused, seconds, external])

  // перезапуск при переключении running
  useEffect(() => {
    if (running) elapsedRef.current = 0
  }, [running, seconds])

  const active = Math.ceil(frac * segments)
  const phase = frac > 0.55 ? 'hi' : frac > 0.28 ? 'mid' : 'lo'

  return (
    <div
      className={cx('pxtimer', `pxtimer--${phase}`)}
      role="timer"
      aria-label={`Осталось ${Math.ceil(frac * seconds)} из ${seconds} секунд`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={cx('pxtimer__seg', i < active && 'is-on')} />
      ))}
    </div>
  )
}

/* ═══════════════════════ SpeechBubble ═══════════════════════ */

export function SpeechBubble({
  children,
  side = 'left',
}: {
  children: ReactNode
  side?: 'left' | 'right'
}) {
  return (
    <div className={cx('pxbubble', `pxbubble--${side}`)}>
      <div className="pxbubble__text">{children}</div>
    </div>
  )
}

/* ═══════════════════════ ComboMeter / HeartsBar ═══════════════════════ */

export function ComboMeter({ streak, multiplier }: { streak: number; multiplier: number }) {
  const hot = streak >= 2
  return (
    <div className={cx('combo', hot && 'combo--hot')} aria-label={`Серия ${streak}, множитель ×${multiplier}`}>
      <span className="combo__flame" aria-hidden="true">
        <IconStar />
      </span>
      <span className="combo__streak">{hot ? `СЕРИЯ ${streak}` : 'БЕЗ СЕРИИ'}</span>
      <span className="combo__mult">×{String(multiplier).replace('.', ',')}</span>
    </div>
  )
}

export function HeartsBar({ hearts, max = 3 }: { hearts: number; max?: number }) {
  return (
    <div className="hearts" aria-label={`Жизни: ${hearts} из ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cx('hearts__h', i < hearts && 'is-on')}>
          <IconHeart />
        </span>
      ))}
    </div>
  )
}

/* ═══════════════════════ ScoreCounter ═══════════════════════
   {value, animateOn?}: число плавно «набегает» до нового значения
   (600мс ease-out, непрерывный tween через framer-motion animate),
   зачисление — с лёгким punch-масштабом всего числа. animateOn —
   ключ перепуска анимации (если не задан, анимация запускается
   при каждом изменении value).
   ═══════════════════════ */

export function ScoreCounter({
  value,
  animateOn,
  className,
}: {
  value: number
  animateOn?: number | string
  className?: string
}) {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)
  const [punchKey, setPunchKey] = useState(0)

  useEffect(() => {
    const from = shownRef.current
    const to = value
    if (from === to) return
    setPunchKey((k) => k + 1)
    const controls = animate(from, to, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const rounded = Math.round(v)
        if (rounded !== shownRef.current) {
          shownRef.current = rounded
          setShown(rounded)
        }
      },
      onComplete: () => {
        shownRef.current = to
        setShown(to)
      },
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animateOn])

  const chars = shown.toLocaleString('ru-RU').split('')

  return (
    <span key={punchKey} className={cx('score is-punch', className)} role="status">
      {chars.map((ch, i) =>
        /[^\d]/.test(ch) ? (
          <span key={`g${i}`} className="score__gap" />
        ) : (
          <span key={`d${i}`} className="score__digit">
            {ch}
          </span>
        ),
      )}
    </span>
  )
}

/* ═══════════════════════ Modal (bottom-sheet) ═══════════════════════ */

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="pxmodal-backdrop" onClick={onClose}>
      <div
        className="pxmodal"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Диалог'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pxmodal__head">
          <h3 className="pxmodal__title display">{title}</h3>
          <button
            type="button"
            className="pxmodal__close"
            aria-label="Закрыть"
            onClick={() => {
              sfx.tap()
              onClose()
            }}
          >
            <IconClose />
          </button>
        </header>
        <div className="pxmodal__body">{children}</div>
      </div>
    </div>
  )
}

/* ═══════════════════════ ProgressBar ═══════════════════════ */

export function ProgressBar({
  value,
  color = 'aqua',
  segments = 12,
}: {
  value: number
  color?: 'aqua' | 'gold' | 'pink' | 'up' | 'down'
  segments?: number
}) {
  const active = Math.round(clamp01(value) * segments)
  return (
    <div
      className={cx('pxprog', `pxprog--${color}`)}
      role="progressbar"
      aria-valuenow={Math.round(clamp01(value) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={cx('pxprog__seg', i < active && 'is-on')} />
      ))}
    </div>
  )
}

/* ═══════════════════════ Divider / Chip / StatRow ═══════════════════════ */

export function Divider({ className }: { className?: string }) {
  return <div className={cx('pxdiv', className)} aria-hidden="true" />
}

export function Chip({
  children,
  color = 'aqua',
}: {
  children: ReactNode
  color?: BadgeColor
}) {
  return <span className={cx('chip', `chip--${color}`)}>{children}</span>
}

export function StatRow({
  label,
  value,
  accent,
}: {
  label: ReactNode
  value: ReactNode
  accent?: 'gold' | 'up' | 'down' | 'aqua' | 'ink'
}) {
  return (
    <div className="statrow">
      <span className="statrow__label">{label}</span>
      <span className="statrow__lead" aria-hidden="true" />
      <span className={cx('statrow__value', `statrow__value--${accent ?? 'ink'}`)}>{value}</span>
    </div>
  )
}
