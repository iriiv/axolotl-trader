/* ═══════════════════════════════════════════════════════════════
   Движок очков — только чистые функции, без React и побочных эффектов.
   Формула раунда (из game.json → points / comboSteps):
     компания +150, год +100,
     направление: (250 + скоростной бонус) × комбо-множитель
   ═══════════════════════════════════════════════════════════════ */

import type { ComboStep, GamePoints, RoundAnswer } from './types'
import type { Direction, RoundScore } from './types'

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** Множитель по текущей серии: 2→×1.2, 3→×1.5, 4→×2, 5+→×2.5 */
export function comboMultiplier(streak: number, steps: ComboStep[]): number {
  let mult = 1
  for (const s of steps) {
    if (streak >= s.streak && s.mult > mult) mult = s.mult
  }
  return mult
}

export interface ScoreRoundInput {
  companyCorrect: boolean
  yearCorrect: boolean
  /** ставка игрока; null = пропустил по таймауту */
  bet: Direction | null
  actual: Direction
  /** осталось_сек / betSeconds на момент тапа (0..1) */
  timeLeftRatio: number
  streakBefore: number
  points: GamePoints
  comboSteps: ComboStep[]
}

export function scoreRound(input: ScoreRoundInput): RoundScore {
  const { points } = input
  const companyPts = input.companyCorrect ? points.company : 0
  const yearPts = input.yearCorrect ? points.year : 0

  // ставка сыграла только при точном совпадении с реальностью;
  // пропущенная (null) ставка приравнивается к неверной
  const betCorrect = input.bet !== null && input.bet === input.actual

  // множитель считается по серии ПОСЛЕ раунда
  const streakAfter = betCorrect ? input.streakBefore + 1 : 0
  const multiplier = betCorrect ? comboMultiplier(streakAfter, input.comboSteps) : 1

  // чем быстрее нажата кнопка, тем больше бонус (до speedMax)
  const speedBonus = betCorrect
    ? Math.round(points.speedMax * clamp01(input.timeLeftRatio))
    : 0
  const directionPts = betCorrect
    ? Math.round((points.direction + speedBonus) * multiplier)
    : 0

  const total = companyPts + yearPts + directionPts

  return {
    companyPts,
    yearPts,
    directionPts,
    speedBonus,
    multiplier,
    total,
    streakAfter,
    bestStreak: Math.max(input.streakBefore, streakAfter),
  }
}

/* ─────────── сводка по игре (для Summary и лидерборда) ─────────── */

export interface SummaryStats {
  roundsTotal: number
  companiesCorrect: number
  yearsCorrect: number
  directionsCorrect: number
  bestStreak: number
  /** среднее timeLeftRatio по раундам со ставкой (0..1) — «точность скорости» */
  speedAccuracy: number
}

export function summarize(log: RoundAnswer[], roundsTotal: number): SummaryStats {
  const withBet = log.filter((e) => e.bet !== null)
  const speedAccuracy =
    withBet.length === 0
      ? 0
      : withBet.reduce((acc, e) => acc + clamp01(e.timeLeftRatio), 0) / withBet.length

  return {
    roundsTotal,
    companiesCorrect: log.filter((e) => e.companyCorrect).length,
    yearsCorrect: log.filter((e) => e.yearCorrect).length,
    directionsCorrect: log.filter((e) => e.bet !== null && e.bet === e.actual).length,
    bestStreak: log.reduce((m, e) => Math.max(m, e.points.streakAfter), 0),
    speedAccuracy,
  }
}

/* ─────────── форматирование (ru-RU, дисплейные цифры) ─────────── */

/** «+25,5%» / «−34,7%» — с типографским минусом */
export function formatPct(v: number): string {
  const sign = v > 0 ? '+' : v < 0 ? '−' : ''
  const abs = Math.abs(v).toFixed(1).replace('.', ',')
  return `${sign}${abs}%`
}

/** «×1,5» */
export function formatMult(v: number): string {
  return `×${String(v).replace('.', ',')}`
}

/** ISO «2022-04-25» → «25.04.2022» (момент истины на ревиле) */
export function formatIsoDateRu(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${m[3]}.${m[2]}.${m[1]}`
}
