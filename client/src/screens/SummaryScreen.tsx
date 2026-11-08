/* SummaryScreen: вердикт аксолотля + статистика игры + отправка в
   лидерборд + шеринг результата (navigator.share → clipboard). */

import { useEffect, useRef, useState } from 'react'
import { Axolotl } from '../design/axolotl'
import { Badge, Divider, PixelButton, PixelCard, SpeechBubble, StatRow } from '../design/ui'
import { IconArrowUp } from '../design/icons'
import { sfx } from '../design/sfx'
import { gameCoins } from '../game/economy'
import { summarize } from '../game/engine'
import { summaryVerdict } from '../game/phrases'
import type { RoundAnswer } from '../game/types'
import type { EquipState } from '../game/storage'

export interface SummaryScreenProps {
  nick: string
  score: number
  log: RoundAnswer[]
  roundsTotal: number
  submitting: boolean
  submitted: boolean
  /** аксолотль в экипировке */
  equip: EquipState
  onSubmit: () => void
}

const SHARE_TITLE = 'Аксолотль-трейдер'

/** символы, которых нет в пиксельном Tiny5, рендерим основным шрифтом */
const golos = (ch: string) => <span className="golos-glyph">{ch}</span>

/** пользователь отменил системный шитор — это не ошибка */
function isAbortShare(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')
}

export function SummaryScreen({
  nick,
  score,
  log,
  roundsTotal,
  submitting,
  submitted,
  equip,
  onSubmit,
}: SummaryScreenProps) {
  const stats = summarize(log, roundsTotal)
  const verdict = summaryVerdict(stats.directionsCorrect, roundsTotal)
  const earnedCoins = gameCoins(log)

  /* фидбек «Ссылка скопирована» в пузыре аксолотля на 2 секунды */
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    }
  }, [])

  const shareText = `Я набрал ${score.toLocaleString('ru-RU')} очков в Биржевых хрониках 🦎 Угадаешь рынок лучше?`

  const showCopied = () => {
    setCopied(true)
    sfx.pop()
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: shareText, url })
        return
      } catch (err) {
        if (isAbortShare(err)) return // закрыл шитор — тишина, не ошибка
        // прочие сбои шера — пробуем буфер обмена
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${url}`)
      showCopied()
    } catch {
      /* буфер недоступен (нет https/прав) — молча: это не ломает игру */
    }
  }

  return (
    <div className="scr">
      <div className="scr-main">
        <div className="sum-head">
          <Badge color="aqua">Хроника: {nick}</Badge>
          <h2 className="display sum-title">Игра окончена</h2>
        </div>

        <div className="sum-axo">
          <Axolotl
            mood={verdict.mood}
            size={124}
            animated
            skin={equip.skin}
            hat={equip.hat ?? undefined}
            acc={equip.acc ?? undefined}
          />
          <SpeechBubble side="left">
            {copied ? (
              <strong className="sum-verdict">Ссылка скопирована</strong>
            ) : (
              <>
                <strong className="sum-verdict">{verdict.title}</strong>
                <br />
                {verdict.phrase}
              </>
            )}
          </SpeechBubble>
        </div>

        <PixelCard title="Статистика" accent="gold">
          <StatRow label="Очки" value={score.toLocaleString('ru-RU')} accent="gold" />
          <Divider />
          <StatRow
            label="Компании"
            value={<>{golos('✓')} {stats.companiesCorrect} / {roundsTotal}</>}
            accent="aqua"
          />
          <StatRow
            label="Годы"
            value={<>{golos('✓')} {stats.yearsCorrect} / {roundsTotal}</>}
            accent="aqua"
          />
          <StatRow
            label="Направления"
            value={<>{golos('✓')} {stats.directionsCorrect} / {roundsTotal}</>}
            accent="aqua"
          />
          <StatRow label="Лучшая серия" value={`${stats.bestStreak} подряд`} accent="gold" />
          <StatRow
            label="Монеты"
            value={`+${earnedCoins.toLocaleString('ru-RU')}`}
            accent="gold"
          />
          <StatRow
            label="Скорость решений"
            value={`${Math.round(stats.speedAccuracy * 100)}%`}
            accent="ink"
          />
        </PixelCard>
      </div>

      <div className="scr-foot">
        <div data-testid="btn-send-score">
          <PixelButton
            variant={submitted ? 'ghost' : 'gold'}
            size="xl"
            full
            disabled={submitted || submitting}
            onClick={onSubmit}
          >
            {submitted ? 'Отправлено' : submitting ? 'Отправляем…' : 'Отправить в лидерборд'}
          </PixelButton>
        </div>
        <div className="sum-share" data-testid="btn-share">
          <PixelButton
            variant="ghost"
            size="lg"
            full
            icon={
              <span className="share-ico" aria-hidden="true">
                <IconArrowUp />
              </span>
            }
            onClick={() => void handleShare()}
          >
            Поделиться
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
