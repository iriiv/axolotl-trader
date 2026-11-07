/* Прогресс-шапка игровых экранов: РАУНД N/5 · очки · комбо (при серии ≥2) */

import { AxolotlCoin } from '../design/axolotl'
import { Badge, ComboMeter, ScoreCounter } from '../design/ui'

export interface GameHeaderProps {
  roundNo: number
  roundsTotal: number
  score: number
  streak: number
  multiplier: number
}

export function GameHeader({ roundNo, roundsTotal, score, streak, multiplier }: GameHeaderProps) {
  return (
    <header className="scr-head">
      <Badge color="aqua">
        Раунд {roundNo}/{roundsTotal}
      </Badge>
      <div className="scr-head__score">
        <AxolotlCoin size={22} />
        <ScoreCounter value={score} />
      </div>
      {streak >= 2 && (
        <div className="scr-head__combo">
          <ComboMeter streak={streak} multiplier={multiplier} />
        </div>
      )}
    </header>
  )
}
