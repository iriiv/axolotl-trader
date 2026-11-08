/* ═══════════════════════════════════════════════════════════════
   Confetti — пиксель-конфетти на верную ставку.
   12–18 квадратов 4–5px из палитры падают по случайным дугам:
   drift x ±80px, падение почти во весь экран с мягким bounce,
   лёгкое вращение. Физика — framer-motion (keyframes-траектории),
   без steps. Графика — те же жёсткие пиксели без blur.
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Transition } from 'framer-motion'

const COLORS = ['var(--gold)', 'var(--aqua)', 'var(--pink)', 'var(--up)', 'var(--ink)']

interface Piece {
  left: number
  delay: number
  duration: number
  color: string
  drift: number
  fall: number
  bounce: number
  spin: number
  size: number
}

export function Confetti({ pieces = 16 }: { pieces?: number }) {
  const items = useMemo<Piece[]>(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.round(4 + Math.random() * 92),
        delay: Math.round(Math.random() * 30) / 100,
        duration: 1.3 + Math.random() * 0.6,
        color: COLORS[i % COLORS.length],
        drift: Math.round((Math.random() - 0.5) * 160),
        fall: Math.round((typeof window === 'undefined' ? 800 : window.innerHeight) * (0.82 + Math.random() * 0.1)),
        bounce: 16 + Math.round(Math.random() * 26),
        spin: Math.round((Math.random() - 0.5) * 540),
        size: 4 + (Math.random() < 0.3 ? 1 : 0),
      })),
    [pieces],
  )

  return (
    <div className="confetti" aria-hidden="true">
      {items.map((it, i) => (
        <motion.span
          key={i}
          className="confetti__p"
          style={{ left: `${it.left}%`, background: it.color, width: it.size, height: it.size }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
          animate={{
            x: [0, it.drift * 0.7, it.drift, it.drift],
            y: [0, it.fall * 0.7, it.fall, it.fall - it.bounce, it.fall + 8],
            opacity: [0, 1, 1, 1, 0],
            rotate: [0, it.spin * 0.6, it.spin, it.spin],
          }}
          transition={{
            duration: it.duration,
            delay: it.delay,
            times: [0, 0.45, 0.75, 0.9, 1],
            ease: ['easeOut', 'easeIn', 'easeOut', 'easeIn'],
          } as Transition}
        />
      ))}
    </div>
  )
}
