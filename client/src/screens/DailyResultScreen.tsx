/* DailyResultScreen — итог «Хроники дня»: карточка дизайнера
   <DailyResultCard/> + шеринг (navigator.share → clipboard, как в
   SummaryScreen) и кнопка забрать сундук дня (жемчужный, за стрик 7 —
   золотой). Дальше — сундук, затем титул; обычный лидерборд тут не
   участвует (прогресс daily туда не пишется). */

import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../design/ui'
import { IconArrowUp, IconChest } from '../design/icons'
import { sfx } from '../design/sfx'
import { DailyResultCard } from '../design/cosmetics'
import type { DailyCaseCell } from '../design/cosmetics'
import { shareText } from '../game/daily'
import type { Direction } from '../game/types'

export interface DailyResultScreenProps {
  dayNo: number
  dateLabel: string
  cells: DailyCaseCell[]
  streakDays: number
  coins: number
  companyOk: boolean
  yearOk: boolean
  bet: Direction | null
  onTakeChest: () => void
}

const SHARE_TITLE = 'Биржевые хроники'

/** пользователь отменил системный шитор — это не ошибка */
function isAbortShare(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')
}

export function DailyResultScreen({
  dayNo,
  dateLabel,
  cells,
  streakDays,
  coins,
  companyOk,
  yearOk,
  bet,
  onTakeChest,
}: DailyResultScreenProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    }
  }, [])

  const betHit = bet !== null && cells[0] ? cells[0].hit : false
  const text = shareText({
    dayNo,
    companyOk,
    yearOk,
    bet,
    betHit,
    streakDays,
    url: window.location.href,
  })

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
        await navigator.share({ title: SHARE_TITLE, text, url })
        return
      } catch (err) {
        if (isAbortShare(err)) return // закрыл шитор — тишина, не ошибка
        // прочие сбои шера — пробуем буфер обмена
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}`)
      showCopied()
    } catch {
      /* буфер недоступен — молча: это не ломает игру */
    }
  }

  return (
    <div className="scr scr-daily" data-testid="daily-result">
      <div className="scr-main">
        <DailyResultCard
          dayNo={dayNo}
          cells={cells}
          streakDays={streakDays}
          coins={coins}
          dateLabel={dateLabel}
          className="daily-res"
        />
        <p className="daily-note">
          {streakDays > 0 && streakDays % 7 === 0
            ? 'Недельный стрик! В сундуке дня — золотой'
            : 'За 7 дней подряд хроники — золотой сундук'}
        </p>
        {copied && <p className="daily-copied">Ссылка скопирована</p>}
      </div>

      <div className="scr-foot">
        <div data-testid="btn-daily-share">
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
        <div data-testid="btn-daily-chest">
          <PixelButton variant="gold" size="xl" full icon={<IconChest />} onClick={onTakeChest}>
            Забрать сундук
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
