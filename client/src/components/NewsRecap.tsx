/* «Перечитать новости» — шторка-подсказка на экранах вопросов и ставки.
   Открывает все новости раунда в bottom-sheet поверх вопроса: ответ/таймер
   не сбрасываются. BetScreen использует onOpenChange, чтобы ставить
   таймер на паузу на время чтения (и не сжигать секунды за шторкой). */

import { useState } from 'react'
import { Badge, Chip, Modal, PixelButton, PixelCard } from '../design/ui'
import { IconBook } from '../design/icons'
import type { Round } from '../game/types'

const ACCENTS = ['gold', 'pink', 'aqua'] as const

export interface NewsRecapButtonProps {
  news: Round['news']
  /** уведомление об открытии/закрытии шторки (для паузы таймера) */
  onOpenChange?: (open: boolean) => void
}

export function NewsRecapButton({ news, onOpenChange }: NewsRecapButtonProps) {
  const [open, setOpen] = useState(false)

  const toggle = (v: boolean) => {
    setOpen(v)
    onOpenChange?.(v)
  }

  return (
    <div className="news-recap" data-testid="btn-news-recap">
      <PixelButton
        variant="ghost"
        size="md"
        icon={<IconBook />}
        ariaLabel="Перечитать новости раунда"
        onClick={() => toggle(true)}
      >
        Перечитать новости
      </PixelButton>

      <Modal open={open} onClose={() => toggle(false)} title="Сводка дня">
        <div className="news-recap__list">
          {news.map((item, i) => (
            <PixelCard key={`${item.date}-${i}`} accent={ACCENTS[i % ACCENTS.length]}>
              <div className="news-card__head">
                <Badge color="ink">{item.date}</Badge>
                <Chip color={ACCENTS[i % ACCENTS.length]}>{item.tag}</Chip>
              </div>
              <p className="news-card__text">{item.text}</p>
            </PixelCard>
          ))}
          <PixelButton variant="primary" size="lg" full onClick={() => toggle(false)}>
            Понятно, к вопросу
          </PixelButton>
        </div>
      </Modal>
    </div>
  )
}
