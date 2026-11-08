/* Экран новостей: карточки открываются по одной (кнопкой «Далее»),
   прошедшие остаются сверху компактнее. sfx.pop на каждую новую.
   Карточки появляются пружинистым stagger-каскадом (framer-motion). */

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Transition } from 'framer-motion'
import { Badge, Chip, PixelButton, PixelCard, ProgressBar } from '../design/ui'
import { sfx } from '../design/sfx'
import { GameHeader } from './GameHeader'
import type { Round } from '../game/types'

export interface NewsScreenProps {
  round: Round
  roundNo: number
  roundsTotal: number
  score: number
  streak: number
  multiplier: number
  onNext: () => void
}

const ACCENTS = ['gold', 'pink', 'aqua'] as const

/** пружинистое появление карточки с overshoot */
const cardPop = {
  initial: { opacity: 0, y: 18, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring', stiffness: 360, damping: 26 } as Transition,
}

export function NewsScreen({
  round,
  roundNo,
  roundsTotal,
  score,
  streak,
  multiplier,
  onNext,
}: NewsScreenProps) {
  const total = round.news.length
  const [opened, setOpened] = useState(1)
  const popRef = useRef(0)

  /* поп на каждую новую карточку (включая первую при монтировании) */
  useEffect(() => {
    if (popRef.current !== opened) {
      popRef.current = opened
      sfx.pop()
    }
  }, [opened])

  const allOpened = opened >= total

  return (
    <div className="scr">
      <GameHeader
        roundNo={roundNo}
        roundsTotal={roundsTotal}
        score={score}
        streak={streak}
        multiplier={multiplier}
      />

      <div className="news-head">
        <h2 className="display news-title">Сводка дня</h2>
        <Badge color="pink">Новости {opened}/{total}</Badge>
      </div>
      <ProgressBar value={total === 0 ? 1 : opened / total} color="pink" segments={9} />

      <div className="scr-main">
        {round.news.slice(0, opened).map((item, i) => (
          <motion.div key={`${round.id}-news-${i}`} {...cardPop}>
            <PixelCard
              accent={ACCENTS[i % ACCENTS.length]}
              className={`news-card ${i < opened - 1 ? 'is-old' : ''}`}
            >
              <div className="news-card__head">
                <Badge color="ink">{item.date}</Badge>
                <Chip color={ACCENTS[i % ACCENTS.length]}>{item.tag}</Chip>
              </div>
              <p className="news-card__text">{item.text}</p>
            </PixelCard>
          </motion.div>
        ))}
      </div>

      <div className="scr-foot" data-testid="btn-news-next">
        <PixelButton
          variant={allOpened ? 'primary' : 'gold'}
          size="xl"
          full
          onClick={() => (allOpened ? onNext() : setOpened((o) => Math.min(total, o + 1)))}
        >
          {allOpened ? 'Кто это?' : 'Далее'}
        </PixelButton>
      </div>
    </div>
  )
}
