/* SummaryScreen: вердикт аксолотля + статистика игры + отправка в лидерборд */

import { Axolotl } from '../design/axolotl'
import { Badge, Divider, PixelButton, PixelCard, SpeechBubble, StatRow } from '../design/ui'
import { summarize } from '../game/engine'
import { summaryVerdict } from '../game/phrases'
import type { RoundAnswer } from '../game/types'

export interface SummaryScreenProps {
  nick: string
  score: number
  log: RoundAnswer[]
  roundsTotal: number
  submitting: boolean
  submitted: boolean
  onSubmit: () => void
}

export function SummaryScreen({
  nick,
  score,
  log,
  roundsTotal,
  submitting,
  submitted,
  onSubmit,
}: SummaryScreenProps) {
  const stats = summarize(log, roundsTotal)
  const verdict = summaryVerdict(stats.directionsCorrect, roundsTotal)

  return (
    <div className="scr u-pop-in">
      <div className="sum-head">
        <Badge color="aqua">Хроника: {nick}</Badge>
        <h2 className="display sum-title">Игра окончена</h2>
      </div>

      <div className="sum-axo">
        <Axolotl mood={verdict.mood} size={124} animated />
        <SpeechBubble side="left">
          <strong className="sum-verdict">{verdict.title}</strong>
          <br />
          {verdict.phrase}
        </SpeechBubble>
      </div>

      <PixelCard title="Статистика" accent="gold">
        <StatRow label="Очки" value={score.toLocaleString('ru-RU')} accent="gold" />
        <Divider />
        <StatRow label="Компании" value={`✓ ${stats.companiesCorrect} / ${roundsTotal}`} accent="aqua" />
        <StatRow label="Годы" value={`✓ ${stats.yearsCorrect} / ${roundsTotal}`} accent="aqua" />
        <StatRow label="Направления" value={`✓ ${stats.directionsCorrect} / ${roundsTotal}`} accent="aqua" />
        <StatRow label="Лучшая серия" value={`${stats.bestStreak} подряд`} accent="gold" />
        <StatRow
          label="Скорость решений"
          value={`${Math.round(stats.speedAccuracy * 100)}%`}
          accent="ink"
        />
      </PixelCard>

      <div className="scr-spacer" />
      <div data-testid="btn-send-score">
        <PixelButton
          variant={submitted ? 'ghost' : 'gold'}
          size="xl"
          full
          disabled={submitted || submitting}
          onClick={onSubmit}
        >
          {submitted ? 'Отправлено ✓' : submitting ? 'Отправляем…' : 'Отправить в лидерборд'}
        </PixelButton>
      </div>
    </div>
  )
}
