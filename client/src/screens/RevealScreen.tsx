/* RevealScreen — момент истины.
   Анимацию ревила (revealProgress 0→1 за ~1.4с) гонит именно этот
   экран через rAF: график остаётся чистым компонентом отрисовки.
   Каждые ~80мс — sfx.tick, в конце — u-flash, бейдж «+25,5%»,
   экстремумы (мин/макс, если отличаются от итога > 1 п.п.),
   дата ревила, фанфары и конфетти (или грустный аксолотль).
   Кнопка «Дальше» активна сразу: если анимация ещё идёт, первый
   тап достраивает её мгновенно (progress→1 + финальные бейджи),
   второй — переходит дальше. */

import { useEffect, useRef, useState } from 'react'
import { Axolotl } from '../design/axolotl'
import { Badge, Chip, Divider, PixelButton, PixelCard, SpeechBubble, StatRow } from '../design/ui'
import { sfx } from '../design/sfx'
import { haptic } from '../design/haptics'
import { formatIsoDateRu, formatMult, formatPct } from '../game/engine'
import { pickAxoPhrase } from '../game/phrases'
import { PriceChart } from '../components/PriceChart'
import { Confetti } from '../components/Confetti'
import { GameHeader } from './GameHeader'
import type { Round, RoundAnswer } from '../game/types'

export interface RevealScreenProps {
  round: Round
  result: RoundAnswer
  roundNo: number
  roundsTotal: number
  isLast: boolean
  score: number
  streak: number
  multiplier: number
  onNext: () => void
}

const REVEAL_DURATION_MS = 1400
/** экстремум показываем, только если он отличается от итога сильнее этого */
const EXTREME_EPS_PCT = 1

export function RevealScreen({
  round,
  result,
  roundNo,
  roundsTotal,
  isLast,
  score,
  streak,
  multiplier,
  onNext,
}: RevealScreenProps) {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [confetti, setConfetti] = useState(false)
  /* достройка анимации по тапу: финализатор храним в ref */
  const doneRef = useRef(false)
  const finishRef = useRef<() => void>(() => {})

  const betCorrect = result.points.directionPts > 0
  const skipped = result.bet === null
  const priceUp = round.direction === 'up'

  useEffect(() => {
    // уважаем prefers-reduced-motion: без анимации, сразу финал
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      doneRef.current = true
      setProgress(1)
      setDone(true)
      return
    }
    const t0 = performance.now()
    let raf = 0
    let lastTick = t0

    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      cancelAnimationFrame(raf)
      setProgress(1)
      setDone(true)
      sfx.reveal()
      if (result.points.directionPts > 0) {
        window.setTimeout(() => {
          sfx.fanfare()
          haptic.success()
          setConfetti(true)
        }, 320)
      } else {
        haptic.error()
      }
    }
    finishRef.current = finish

    const loop = (t: number) => {
      if (doneRef.current) return // достроили вручную по тапу
      const p = Math.min(1, (t - t0) / REVEAL_DURATION_MS)
      setProgress(p)
      if (t - lastTick >= 80) {
        lastTick = t
        sfx.tick()
      }
      if (p < 1) raf = requestAnimationFrame(loop)
      else finish()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // экран живёт один раунд — result в deps не нужен
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* первый тап во время анимации — мгновенный финал, второй — переход */
  const handleNext = () => {
    if (!doneRef.current) {
      finishRef.current()
      return
    }
    onNext()
  }

  const thoughtWrong =
    result.companyGuessed !== round.answers.company || result.yearGuessed !== round.answers.year
      ? `Ты думал: ${result.companyGuessed}${result.companyGuessed !== round.answers.company ? '' : ' ✓'} · ${result.yearGuessed}${result.yearGuessed !== round.answers.year ? '' : ' ✓'}`
      : null

  const axoMood = done ? (betCorrect ? 'cheer' : 'sad') : 'wow'
  const axoPhrase = !done
    ? 'Смотрим, что было дальше…'
    : betCorrect
      ? pickAxoPhrase('cheer')
      : skipped
        ? 'Не успел — ставка сгорела. Урок остался!'
        : 'Бывает… Зато урок на всю жизнь'

  /* экстремумы внутри окна ревила: показываем, если реальные, а не дубль итога */
  const minDiffers = Math.abs(round.revealMinPct - round.movePct) > EXTREME_EPS_PCT
  const maxDiffers = Math.abs(round.revealMaxPct - round.movePct) > EXTREME_EPS_PCT

  return (
    <div className="scr u-pop-in">
      {confetti && <Confetti pieces={16} />}
      <GameHeader
        roundNo={roundNo}
        roundsTotal={roundsTotal}
        score={score}
        streak={streak}
        multiplier={multiplier}
      />

      <div className="reveal-head">
        <div className="reveal-title-row">
          <h2 className="display reveal-company">
            {round.ticker} · {round.answers.company}
          </h2>
          <Badge color="pink">{round.answers.year}</Badge>
        </div>
        {thoughtWrong && <p className="reveal-thought">{thoughtWrong}</p>}
      </div>

      <div className={`chart-panel ${done ? 'is-done' : ''}`}>
        <div className={done ? 'u-flash' : undefined}>
          <PriceChart
            dates={round.chart.dates}
            closes={round.chart.closes}
            decisionIndex={round.chart.decisionIndex}
            revealProgress={progress}
            showFinalDate={done}
            finalDate={round.revealLastDate}
            height={248}
          />
        </div>
        <div className="reveal-badges">
          {done && (
            <>
              <span className={`movepct u-pop-in movepct--${priceUp ? 'up' : 'down'}`}>
                {formatPct(round.movePct)} за {round.revealDays} дн.
              </span>
              <span className="reveal-finaldate u-pop-in">
                Дата вскрытия: {formatIsoDateRu(round.revealLastDate)}
              </span>
            </>
          )}
          {!done && <span className="reveal-finaldate">Вскрываем историю…</span>}
        </div>
        {done && (minDiffers || maxDiffers) && (
          <p className="reveal-extremes u-pop-in">
            {minDiffers && <>мин {formatPct(round.revealMinPct)}</>}
            {minDiffers && maxDiffers && ' · '}
            {maxDiffers && <>макс {formatPct(round.revealMaxPct)}</>}
          </p>
        )}
      </div>

      <div className="reveal-axo">
        <Axolotl mood={axoMood} size={92} animated />
        <SpeechBubble side="left">{axoPhrase}</SpeechBubble>
      </div>

      <PixelCard title="Что было" accent={priceUp ? 'up' : 'down'}>
        <p className="reveal-summary">{round.explanation.summary}</p>
        <p className="reveal-why">{round.explanation.why}</p>
        <ul className="facts">
          {round.explanation.facts.map((fact, i) => (
            <li key={i}>
              <Chip color={priceUp ? 'up' : 'down'}>◆</Chip>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
        <div className="lesson">
          <div className="lesson__label display">Чему учит</div>
          <p className="lesson__text">{round.explanation.lesson}</p>
        </div>
      </PixelCard>

      <PixelCard title="Очки раунда" accent="gold">
        <StatRow
          label="Компания"
          value={result.points.companyPts > 0 ? `+${result.points.companyPts}` : '0'}
          accent={result.points.companyPts > 0 ? 'up' : 'ink'}
        />
        <StatRow
          label="Год"
          value={result.points.yearPts > 0 ? `+${result.points.yearPts}` : '0'}
          accent={result.points.yearPts > 0 ? 'up' : 'ink'}
        />
        <StatRow
          label={
            skipped
              ? 'Ставка (пропущена)'
              : `Ставка (бонус +${result.points.speedBonus}${result.points.multiplier > 1 ? `, ${formatMult(result.points.multiplier)}` : ''})`
          }
          value={result.points.directionPts > 0 ? `+${result.points.directionPts}` : skipped ? '—' : '0'}
          accent={result.points.directionPts > 0 ? 'gold' : 'ink'}
        />
        <Divider />
        <StatRow label="Итого за раунд" value={`+${result.points.total}`} accent="gold" />
      </PixelCard>

      <div className="scr-spacer" />
      <div data-testid="btn-reveal-next">
        <PixelButton variant="primary" size="xl" full onClick={handleNext}>
          {isLast ? 'К итогам' : 'Дальше'}
        </PixelButton>
      </div>
    </div>
  )
}
