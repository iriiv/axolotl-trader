/* Экран ставки: график-контекст + таймер + ▲/▼.
   timeLeftRatio считаем от собственного старта экрана (TimerBar не
   отдаёт остаток) — оба стартуют на монтировании, рассинхрон <1 кадра.
   По onEnd: блок кнопок → 800мс → переход с bet=null. */

import { useMemo, useRef, useState } from 'react'
import { Axolotl } from '../design/axolotl'
import { PixelButton, SpeechBubble, TimerBar } from '../design/ui'
import { sfx } from '../design/sfx'
import { haptic } from '../design/haptics'
import { clamp01 } from '../game/engine'
import { pickBetPhrase } from '../game/phrases'
import { PriceChart } from '../components/PriceChart'
import { NewsRecapButton } from '../components/NewsRecap'
import { GameHeader } from './GameHeader'
import type { Direction, Round } from '../game/types'

export interface BetScreenProps {
  round: Round
  roundNo: number
  roundsTotal: number
  betSeconds: number
  score: number
  streak: number
  multiplier: number
  onBet: (direction: Direction, timeLeftRatio: number) => void
  onTimeout: () => void
}

export function BetScreen({
  round,
  roundNo,
  roundsTotal,
  betSeconds,
  score,
  streak,
  multiplier,
  onBet,
  onTimeout,
}: BetScreenProps) {
  const [chosen, setChosen] = useState<Direction | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const startRef = useRef<number>(performance.now())
  /* пауза таймера на время чтения новостей: копим длительность пауз,
     чтобы timeLeftRatio не сжигался за шторкой */
  const pauseStartRef = useRef<number | null>(null)
  const pauseOffsetRef = useRef(0)
  const phrase = useMemo(() => pickBetPhrase(), [])
  /* на невысоких экранах график компактнее — всё видно без скролла */
  const compact = useMemo(
    () => window.matchMedia?.('(max-height: 700px)').matches ?? false,
    [],
  )

  const blocked = chosen !== null || timedOut

  const handleRecapOpenChange = (open: boolean) => {
    setRecapOpen(open)
    if (open) {
      pauseStartRef.current = performance.now()
    } else if (pauseStartRef.current !== null) {
      pauseOffsetRef.current += performance.now() - pauseStartRef.current
      pauseStartRef.current = null
    }
  }

  const handleTap = (dir: Direction) => {
    if (blocked) return
    setChosen(dir)
    const elapsed =
      performance.now() - startRef.current - pauseOffsetRef.current
    const ratio = clamp01(1 - elapsed / (betSeconds * 1000))
    // пауза, чтобы игрок увидел подсветку выбора
    window.setTimeout(() => onBet(dir, ratio), 450)
  }

  const handleTimeout = () => {
    if (blocked) return
    setTimedOut(true)
    sfx.wrong()
    haptic.error()
    window.setTimeout(() => onTimeout(), 800)
  }

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
        <div>
          <h2 className="display bet-title">Куда пойдёт акция?</h2>
          <p className="bet-sub">Прошлое скрыто. Твоя ставка?</p>
        </div>

        {!blocked && (
          <NewsRecapButton news={round.news} onOpenChange={handleRecapOpenChange} />
        )}

        <div className="chart-panel">
          <PriceChart
            dates={round.chart.dates}
            closes={round.chart.closes}
            decisionIndex={round.chart.decisionIndex}
            revealProgress={0}
            height={compact ? 190 : 236}
          />
        </div>

        <div className="bet-axo">
          <Axolotl mood="wow" size={compact ? 64 : 80} animated />
          <SpeechBubble side="left">{phrase}</SpeechBubble>
        </div>

        {timedOut && (
          <p className="bet-timeout" role="status">
            Время вышло — ставка пропущена!
          </p>
        )}
      </div>

      <TimerBar
        key={`bet-${round.id}`}
        seconds={betSeconds}
        running={!blocked}
        paused={blocked || recapOpen}
        onEnd={handleTimeout}
      />

      <div className="bet-buttons">
        <div data-testid="btn-bet-up">
          <PixelButton
            variant="up"
            size="xl"
            full
            disabled={blocked}
            className={chosen === 'up' ? 'is-chosen' : ''}
            onClick={() => handleTap('up')}
          >
            Вверх
          </PixelButton>
        </div>
        <div data-testid="btn-bet-down">
          <PixelButton
            variant="down"
            size="xl"
            full
            disabled={blocked}
            className={chosen === 'down' ? 'is-chosen' : ''}
            onClick={() => handleTap('down')}
          >
            Вниз
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
