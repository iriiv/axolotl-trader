/* RevealScreen — момент истины.
   Анимацию ревила (revealProgress 0→1 за ~1.4с, кривая ease-inout)
   гонит именно этот экран через rAF: график остаётся чистим
   компонентом отрисовки. Каждые ~80мс — sfx.tick, в конце —
   полноэкранная вспышка цвета исхода, бейдж «+25,5%» с overshoot,
   экстремумы (мин/макс), дата ревила, фанфары, конфетти и фонтан
   пиксель-монет (или грустный аксолотль). Название компании
   появляется каскадом букв (stagger spring), затем весь заголовок
   мягко «досаживается» overshoot-масштабом.
   Кнопка «Дальше» активна сразу: если анимация ещё идёт, первый
   тап достраивает её мгновенно (progress→1 + финальные бейджи),
   второй — переходит дальше. */

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Axolotl } from '../design/axolotl'
import { Badge, Chip, Divider, PixelButton, PixelCard, SpeechBubble, StatRow } from '../design/ui'
import { sfx } from '../design/sfx'
import { haptic } from '../design/haptics'
import { formatIsoDateRu, formatMult, formatPct } from '../game/engine'
import { pickAxoPhrase } from '../game/phrases'
import type { EquipState } from '../game/storage'
import { PriceChart } from '../components/PriceChart'
import { Confetti } from '../components/Confetti'
import { CoinBurst } from '../components/CoinBurst'
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
  /** аксолотль в экипировке */
  equip?: EquipState
  onNext: () => void
}

const REVEAL_DURATION_MS = 1400
/** экстремум показываем, только если он отличается от итога сильнее этого */
const EXTREME_EPS_PCT = 1

/** ease-in-out (cubic): прорисовка без линейной «пилы» */
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** каскад букв: каждая пружинисто подпрыгивает снизу */
function CascadeTitle({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="reveal-cascade" aria-label={text} role="text">
      {text.split('').map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          className="reveal-cascade__ch"
          aria-hidden="true"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + i * 0.045,
            type: 'spring',
            stiffness: 420,
            damping: 24,
          }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  )
}

export function RevealScreen({
  round,
  result,
  roundNo,
  roundsTotal,
  isLast,
  score,
  streak,
  multiplier,
  equip,
  onNext,
}: RevealScreenProps) {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [coins, setCoins] = useState(false)
  const [flash, setFlash] = useState(false)
  /* достройка анимации по тапу: финализатор храним в ref */
  const doneRef = useRef(false)
  const finishRef = useRef<() => void>(() => {})

  const betCorrect = result.points.directionPts > 0
  const skipped = result.bet === null
  const priceUp = round.direction === 'up'

  /* на невысоких экранах график компактнее */
  const compact = useMemo(
    () => window.matchMedia?.('(max-height: 700px)').matches ?? false,
    [],
  )

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
      setFlash(true)
      sfx.reveal()
      if (result.points.directionPts > 0) {
        window.setTimeout(() => {
          sfx.fanfare()
          haptic.success()
          setConfetti(true)
          setCoins(true)
        }, 320)
      } else {
        haptic.error()
      }
    }
    finishRef.current = finish

    const loop = (t: number) => {
      if (doneRef.current) return // достроили вручную по тапу
      const raw = Math.min(1, (t - t0) / REVEAL_DURATION_MS)
      setProgress(easeInOutCubic(raw))
      if (t - lastTick >= 80) {
        lastTick = t
        sfx.tick()
      }
      if (raw < 1) raf = requestAnimationFrame(loop)
      else finish()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // экран живёт один раунд — result в deps не нужен
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* вспышка гаснет за ~350мс и размонтируется */
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(false), 400)
    return () => window.clearTimeout(t)
  }, [flash])

  /* фонтан монет живёт ~1.5с */
  useEffect(() => {
    if (!coins) return
    const t = window.setTimeout(() => setCoins(false), 1600)
    return () => window.clearTimeout(t)
  }, [coins])

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
      ? `Ты думал: ${result.companyGuessed} · ${result.yearGuessed}`
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
    <div className="scr">
      {confetti && <Confetti pieces={16} />}
      {flash && (
        <motion.div
          className="reveal-flash"
          style={{ background: priceUp ? 'var(--up)' : 'var(--down)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.12, 0] }}
          transition={{ duration: 0.32, times: [0, 0.4, 1], ease: 'easeOut' }}
        />
      )}
      <GameHeader
        roundNo={roundNo}
        roundsTotal={roundsTotal}
        score={score}
        streak={streak}
        multiplier={multiplier}
      />

      <div className="scr-main">
        <div className="reveal-head">
          <div className="reveal-title-row">
            {/* каскад букв + мягкий overshoot всего заголовка */}
            <motion.h2
              className="display reveal-company"
              initial={{ scale: 0.96 }}
              animate={{ scale: [0.96, 1.03, 1] }}
              transition={{ duration: 0.5, delay: 0.35, times: [0, 0.55, 1], ease: 'easeOut' }}
            >
              {round.ticker} ·{' '}
              <CascadeTitle text={round.answers.company} delay={0.15} />
            </motion.h2>
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
              height={compact ? 200 : 248}
            />
          </div>
          {coins && <CoinBurst coins={10} />}
          <div className="reveal-badges">
            {done && (
              <>
                <motion.span
                  className={`movepct movepct--${priceUp ? 'up' : 'down'}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                >
                  {formatPct(round.movePct)} за {round.revealDays} дн.
                </motion.span>
                <motion.span
                  className="reveal-finaldate"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.3, ease: 'easeOut' }}
                >
                  Дата вскрытия: {formatIsoDateRu(round.revealLastDate)}
                </motion.span>
              </>
            )}
            {!done && <span className="reveal-finaldate">Вскрываем историю…</span>}
          </div>
          {done && (minDiffers || maxDiffers) && (
            <p className="reveal-extremes">
              {minDiffers && <>мин {formatPct(round.revealMinPct)}</>}
              {minDiffers && maxDiffers && ' · '}
              {maxDiffers && <>макс {formatPct(round.revealMaxPct)}</>}
            </p>
          )}
        </div>

        <div className="reveal-axo">
          <Axolotl
            mood={axoMood}
            size={compact ? 74 : 92}
            animated
            skin={equip?.skin}
            hat={equip?.hat ?? undefined}
            acc={equip?.acc ?? undefined}
          />
          <SpeechBubble side="left">{axoPhrase}</SpeechBubble>
        </div>

        <PixelCard title="Что было" accent={priceUp ? 'up' : 'down'}>
          <p className="reveal-summary">{round.explanation.summary}</p>
          <p className="reveal-why">{round.explanation.why}</p>
          <ul className="facts">
            {round.explanation.facts.map((fact, i) => (
              <li key={i}>
                <Chip color={priceUp ? 'up' : 'down'}>
                  <span className="fact-dot" aria-hidden="true" />
                </Chip>
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
      </div>

      <div className="scr-foot" data-testid="btn-reveal-next">
        <PixelButton variant="primary" size="xl" full onClick={handleNext}>
          {isLast ? 'К итогам' : 'Дальше'}
        </PixelButton>
      </div>
    </div>
  )
}
