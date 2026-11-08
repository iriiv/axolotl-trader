/* ═══════════════════════════════════════════════════════════════
   CoinBurst — фонтан из пиксель-монет «₽» (AxolotlCoin) при
   верной ставке. 10–12 монет (по умолчанию 10 — изящно, не
   казино): взлёт вверх с разбросом x ±80px, падение с мягким
   bounce, случайное вращение. Физика — framer-motion keyframes;
   графика остаётся пиксельной (сам спрайт не меняется).
   Рендерится поверх блока (position:absolute), pointer-events
  :none. Живёт ~1.4с и размонтируется родителем.
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Transition } from 'framer-motion'
import { AxolotlCoin } from '../design/axolotl'

interface CoinSpec {
  /** горизонтальный разброс, px (±80) */
  x: number
  /** высота взлёта (отрицательный y), px */
  rise: number
  /** глубина падения после апекса, px */
  fall: number
  /** полное вращение за полёт, deg */
  spin: number
  /** задержка старта, с */
  delay: number
  /** длительность полёта, с */
  duration: number
  /** сторона спрайта, px */
  size: number
}

export function CoinBurst({ coins = 10 }: { coins?: number }) {
  const specs = useMemo<CoinSpec[]>(
    () =>
      Array.from({ length: coins }, () => ({
        x: Math.round((Math.random() - 0.5) * 160),
        rise: -(80 + Math.random() * 80),
        fall: 110 + Math.random() * 70,
        spin: Math.round((Math.random() - 0.5) * 540),
        delay: Math.random() * 0.12,
        duration: 1.05 + Math.random() * 0.35,
        size: 14 + Math.round(Math.random() * 8),
      })),
    [coins],
  )

  return (
    <div className="coin-burst" aria-hidden="true">
      {specs.map((c, i) => {
        const land = c.rise + c.fall
        return (
          <motion.span
            key={i}
            className="coin-burst__c"
            initial={{ x: 0, y: 0, scale: 0.5, opacity: 0, rotate: 0 }}
            animate={{
              x: [0, c.x * 0.8, c.x, c.x],
              y: [0, c.rise, land, land - 26, land],
              scale: [0.5, 1.08, 0.95, 0.95, 0.85],
              opacity: [0, 1, 1, 1, 0],
              rotate: [0, c.spin * 0.7, c.spin, c.spin, c.spin],
            }}
            transition={{
              duration: c.duration,
              delay: c.delay,
              times: [0, 0.42, 0.74, 0.88, 1],
              ease: ['easeOut', 'easeIn', 'easeOut', 'easeIn'],
            } as Transition}
          >
            <AxolotlCoin size={c.size} />
          </motion.span>
        )
      })}
    </div>
  )
}
