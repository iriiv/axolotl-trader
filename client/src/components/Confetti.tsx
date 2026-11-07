/* ═══════════════════════════════════════════════════════════════
   Confetti — пиксель-конфетти на верную ставку.
   12–18 абсолютных квадратов 4×4 из палитры, падают сверху
   ступеньками (steps) ~1.5с. Без blur и поворотов — 16-bit.
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from 'react'
import type { CSSProperties } from 'react'

const COLORS = ['var(--gold)', 'var(--aqua)', 'var(--pink)', 'var(--up)', 'var(--ink)']

interface Piece {
  left: number
  delay: number
  duration: number
  color: string
  drift: number
}

export function Confetti({ pieces = 16 }: { pieces?: number }) {
  const items = useMemo<Piece[]>(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.round(4 + Math.random() * 92),
        delay: Math.round(Math.random() * 30) / 100,
        duration: 1.2 + Math.round(Math.random() * 60) / 100,
        color: COLORS[i % COLORS.length],
        drift: Math.round((Math.random() - 0.5) * 48),
      })),
    [pieces],
  )

  return (
    <div className="confetti" aria-hidden="true">
      {items.map((it, i) => (
        <span
          key={i}
          className="confetti__p"
          style={
            {
              left: `${it.left}%`,
              background: it.color,
              animationDelay: `${it.delay}s`,
              animationDuration: `${it.duration}s`,
              '--drift': `${it.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
