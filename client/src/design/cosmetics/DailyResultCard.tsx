/* ═══════════════════════════════════════════════════════════════
   <DailyResultCard/> — карточка итога дня (daily-режим, кейс дня):
   «Хроника №N», сетка 3 ячеек (тикер / год / направление ✓✗ + ▲▼),
   стрик-пламя с числом дней, монеты за день. Каркас: данные —
   снаружи, здесь только презентация на компонентах кита.
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react'
import { AxolotlCoin } from '../axolotl'
import { Chip, PixelCard } from '../ui'
import { IconArrowDown, IconArrowUp, IconCalendar, IconFire } from '../icons'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

/** Одна ячейка кейса дня */
export interface DailyCaseCell {
  /** тикер компании, например AFLT */
  ticker: string
  /** год кейса */
  year: number
  /** направление угадано? (✓/✗) */
  hit: boolean
  /** фактическое направление цены: true ▲ / false ▼ */
  up: boolean
}

export interface DailyResultCardProps {
  /** номер хроники (дня) */
  dayNo: number
  /** ровно 3 кейса — сетка дня */
  cells: DailyCaseCell[]
  /** текущий стрик дней (0 = нет) */
  streakDays: number
  /** монеты, заработанные за день */
  coins: number
  /** подпись даты (например «8 ноября»); без пропа — не выводится */
  dateLabel?: string
  className?: string
  style?: CSSProperties
}

/* ── пиксель-метки ✓/✗ (в Tiny5 нет этих глифов) ── */
function PixelTick({ ok }: { ok: boolean }) {
  const check = ['.....##', '....##.', '...##..', '..##...', '###....']
  const cross = ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#']
  const rows = ok ? check : cross
  return (
    <svg
      width={ok ? 12 : 11}
      height={ok ? 11 : 12}
      viewBox={ok ? '0 0 7 6' : '0 0 7 7'}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rows.map((row, y) =>
        row.split('').map((ch, x) =>
          ch === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null,
        ),
      )}
    </svg>
  )
}

export function DailyResultCard({
  dayNo,
  cells,
  streakDays,
  coins,
  dateLabel,
  className,
  style,
}: DailyResultCardProps) {
  return (
    <div style={style}>
      <PixelCard title="Итог дня" accent="gold" glow className={cx('daily', className)}>
      <div className="daily__head">
        <span className="daily__title">
          <IconCalendar size={18} />
          Хроника №{dayNo}
        </span>
        {dateLabel && <Chip color="ink">{dateLabel}</Chip>}
      </div>

      <div className="daily__cells">
        {cells.map((c) => (
          <div className="daily__cell" key={`${c.ticker}-${c.year}`}>
            <Chip color="pink">{c.ticker}</Chip>
            <span className="daily__dir">{c.year}</span>
            <span className={`daily__tick ${c.hit ? 'daily__tick--ok' : 'daily__tick--err'}`}>
              <PixelTick ok={c.hit} />
            </span>
            <span className={`daily__dir ${c.up ? 'daily__dir--up' : 'daily__dir--down'}`}>
              {c.up ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
              {c.up ? 'рост' : 'падение'}
            </span>
          </div>
        ))}
      </div>

      <div className="daily__foot">
        <span className="daily__streak">
          <IconFire size={20} />
          {streakDays > 0 ? `стрик ${streakDays} ${pluralDays(streakDays)}` : 'без стрика'}
        </span>
        <span className="daily__coins">
          <AxolotlCoin size={22} />
          +{coins.toLocaleString('ru-RU')}
        </span>
      </div>
      </PixelCard>
    </div>
  )
}

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня'
  return 'дней'
}
