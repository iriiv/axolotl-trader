/* ═══════════════════════════════════════════════════════════════
   «ХРОНИКА ДНЯ» (Daily Challenge, COSMETICS_SPEC §4) — чистые
   функции: детерминированный выбор кейса дня по дате, номер дня
   от эпохи запуска, подписи дат и шеринг-текст.
   ═══════════════════════════════════════════════════════════════ */

import { getDailyDateKey } from './storage'
import type { Direction } from './types'

/** эпоха запуска daily-хроник: 2026-11-09 = день №1 */
export const DAILY_EPOCH = '2026-11-09'

/** «сегодня» для daily: локальная дата с учётом e2e-оверрайда */
export function todayKey(): string {
  return getDailyDateKey()
}

/** FNV-1a (32 бита): одинаковый у всех игроков на одной дате */
export function hashDateKey(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** кейс дня: rounds[hash(dateKey) % rounds.length] */
export function pickDailyRound<T>(rounds: T[], dateKey: string): T | undefined {
  if (rounds.length === 0) return undefined
  return rounds[hashDateKey(dateKey) % rounds.length]
}

function toUtcDays(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y || 2026, (m || 1) - 1, d || 1) / 86_400_000)
}

/** номер дня: 2026-11-09 → 1, дальше +1 за сутки (до эпохи — 1) */
export function dayNumber(dateKey: string): number {
  const diff = toUtcDays(dateKey) - toUtcDays(DAILY_EPOCH)
  return Math.max(1, diff + 1)
}

/** стрик жив, только если прошёл ровно один день без пропусков */
export function continuesStreak(lastKey: string | null, key: string): boolean {
  return lastKey !== null && dayNumber(key) - dayNumber(lastKey) === 1
}

const MONTHS_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

/** «2026-11-09» → «9 ноября» */
export function dateLabelRu(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!m) return dateKey
  return `${Number(m[3])} ${MONTHS_RU[Number(m[2]) - 1] ?? ''}`.trim()
}

/* ─────────── шеринг-текст (спец §4) ─────────── */

export interface DailyShareData {
  dayNo: number
  companyOk: boolean
  yearOk: boolean
  bet: Direction | null
  betHit: boolean
  streakDays: number
  url: string
}

/**
 * 🦎 Биржевые хроники — День №N
 * Компания ✓ · Год ✗ · Ставка ▲✓
 * Стрик: X 🔥
 * Твой ход: <url>
 */
export function shareText(d: DailyShareData): string {
  const mark = (ok: boolean): string => (ok ? '✓' : '✗')
  const bet =
    d.bet === null ? 'Ставка —' : `Ставка ${d.bet === 'up' ? '▲' : '▼'}${mark(d.betHit)}`
  return [
    `🦎 Биржевые хроники — День №${d.dayNo}`,
    `Компания ${mark(d.companyOk)} · Год ${mark(d.yearOk)} · ${bet}`,
    `Стрик: ${d.streakDays} 🔥`,
    `Твой ход: ${d.url}`,
  ].join('\n')
}
