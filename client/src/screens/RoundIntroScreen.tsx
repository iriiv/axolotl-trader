/* Интро раунда: тема, заголовок, карточка-загадка, «читать новости».
   Появление — каскадом u-pop-in с нарастающими задержками. */

import type { CSSProperties } from 'react'
import { Axolotl } from '../design/axolotl'
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

const pop = (delay: number): CSSProperties => ({ animationDelay: `${delay}s` })

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
    <div className="scr u-pop-in">
      <GameHeader
        roundNo={roundNo}
        roundsTotal={roundsTotal}
        score={score}
        streak={streak}
        multiplier={multiplier}
      />

      <div className="intro-top">
        <div className="intro-emoji u-pop-in" style={pop(0.05)}>
          {round.emoji}
        </div>
        <div className="intro-theme u-pop-in" style={pop(0.12)}>
          {round.theme}
        </div>
        <h2 className="intro-title display u-pop-in" style={pop(0.2)}>
          {round.title}
        </h2>
      </div>

      <div className="u-pop-in" style={pop(0.28)}>
        <PixelCard title="Кто это?" accent="aqua">
          <p className="intro-hint">{round.mysteryHint}</p>
        </PixelCard>
      </div>

      <div className="intro-axo u-pop-in" style={pop(0.36)}>
        <Axolotl mood="wow" size={96} animated />
        <SpeechBubble side="left">Я знаю, но молчу 🤫</SpeechBubble>
      </div>

      <div className="scr-spacer" />
      <div className="u-pop-in" style={pop(0.44)} data-testid="btn-read-news">
        <PixelButton variant="primary" size="xl" full onClick={onNext}>
          Читать новости
        </PixelButton>
      </div>
      <div className="u-pop-in" style={pop(0.5)}>
        <Badge color="ink">Раунд {roundNo} из {roundsTotal}</Badge>
      </div>
    </div>
  )
}
