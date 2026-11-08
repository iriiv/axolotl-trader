/* Экран квиза (компания / год). По тапу: мгновенная проверка —
   correct-вспышка или wrong-тряска, верный ответ подсвечивается
   через 600мс, авто-переход через 1.3с. Никакого «следующего экрана»:
   честная подсветка сразу, как в спецификации. */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { OptionButton } from '../design/ui'
import type { OptionState } from '../design/ui'
import { sfx } from '../design/sfx'
import { haptic } from '../design/haptics'
import { GameHeader } from './GameHeader'

export interface QuizScreenProps {
  question: string
  options: string[]
  correctIndex: number
  /** «+150» / «+100» — показ при верном ответе */
  pointsLabel: string
  /** карточка-подсказка (mysteryHint) — только для вопроса о компании */
  hintCard?: ReactNode
  roundNo: number
  roundsTotal: number
  score: number
  streak: number
  multiplier: number
  onDone: (correct: boolean, chosenIndex: number) => void
}

export function QuizScreen({
  question,
  options,
  correctIndex,
  pointsLabel,
  hintCard,
  roundNo,
  roundsTotal,
  score,
  streak,
  multiplier,
  onDone,
}: QuizScreenProps) {
  const [chosen, setChosen] = useState<number | null>(null)
  const [showCorrect, setShowCorrect] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const locked = chosen !== null
  const correct = chosen === correctIndex

  /* реакция на выбор: звуки/хаптика сразу, подсветки и переход по таймерам */
  useEffect(() => {
    if (chosen === null) return
    const isCorrect = chosen === correctIndex
    if (isCorrect) {
      sfx.correct()
      haptic.success()
    } else {
      sfx.wrong()
      haptic.error()
    }
    const tCorrect = window.setTimeout(() => {
      if (!isCorrect) setShowCorrect(true)
    }, 600)
    const tNext = window.setTimeout(() => onDoneRef.current(isCorrect, chosen), 1300)
    return () => {
      window.clearTimeout(tCorrect)
      window.clearTimeout(tNext)
    }
  }, [chosen, correctIndex])

  const stateOf = (i: number): OptionState => {
    if (!locked) return 'default'
    if (i === chosen) return correct ? 'correct' : 'wrong'
    if (i === correctIndex && (correct || showCorrect)) return 'correct'
    return 'muted'
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
        <h2 className="display quiz-q">{question}</h2>

        {hintCard}

        <div className="quiz-grid">
          {options.map((label, i) => (
            <div key={`${label}-${i}`} data-testid={`quiz-opt-${i}`}>
              <OptionButton index={i} label={label} state={stateOf(i)} onClick={() => setChosen(i)} />
            </div>
          ))}
        </div>

        <p className={`quiz-points ${locked ? (correct ? 'is-ok' : 'is-no') : ''}`} role="status">
          {locked ? (correct ? `Верно! ${pointsLabel}` : 'Мимо! +0') : ''}
        </p>
      </div>
    </div>
  )
}
