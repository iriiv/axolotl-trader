/* Интро раунда: тема, заголовок, карточка-загадка, «читать новости».
   Появление — framer-motion каскад: каждый блок пружинисто
   всплывает снизу с нарастающей задержкой. */

import { Axolotl } from '../design/axolotl'
import { motion } from 'framer-motion'
import type { Transition } from 'framer-motion'
import { Badge, PixelButton, PixelCard, SpeechBubble } from '../design/ui'
import { GameHeader } from './GameHeader'
import type { Round } from '../game/types'

export interface RoundIntroScreenProps {
  round: Round
  roundNo: number
  roundsTotal: number
  score: number
  streak: number
  multiplier: number
  onNext: () => void
}

/** каскад: пружинистый подъём с задержкой по индексу блока */
const rise = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.06 * i, type: 'spring', stiffness: 340, damping: 26 } as Transition,
})

export function RoundIntroScreen({
  round,
  roundNo,
  roundsTotal,
  score,
  streak,
  multiplier,
  onNext,
}: RoundIntroScreenProps) {
  return (
    <div className="scr">
      <GameHeader
        roundNo={roundNo}
        roundsTotal={roundsTotal}
        score={score}
        streak={streak}
        multiplier={multiplier}
      />

      <div className="scr-main">
        <div className="intro-top">
          <motion.div className="intro-emoji" {...rise(0)}>
            {round.emoji}
          </motion.div>
          <motion.div className="intro-theme" {...rise(1)}>
            {round.theme}
          </motion.div>
          <motion.h2 className="intro-title display" {...rise(2)}>
            {round.title}
          </motion.h2>
        </div>

        <motion.div {...rise(3)}>
          <PixelCard title="Кто это?" accent="aqua">
            <p className="intro-hint">{round.mysteryHint}</p>
          </PixelCard>
        </motion.div>

        <motion.div className="intro-axo" {...rise(4)}>
          <Axolotl mood="wow" size={96} animated />
          <SpeechBubble side="left">Я знаю, но молчу 🤫</SpeechBubble>
        </motion.div>
      </div>

      <div className="scr-foot">
        <div data-testid="btn-read-news">
          <PixelButton variant="primary" size="xl" full onClick={onNext}>
            Читать новости
          </PixelButton>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Badge color="ink">Раунд {roundNo} из {roundsTotal}</Badge>
        </div>
      </div>
    </div>
  )
}
