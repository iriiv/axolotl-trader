/* ═══════════════════════════════════════════════════════════════
   Типы игры «Аксолотль-трейдер». Контент приходит из статического
   game.json (маппинг — в api.ts), лидерборд — с сервера/локально.
   ═══════════════════════════════════════════════════════════════ */

export type Direction = 'up' | 'down'

/** Стоимость очков из game.json → game.points */
export interface GamePoints {
  company: number
  year: number
  direction: number
  speedMax: number
}

/** Ступень комбо: серия из N раундов → множитель */
export interface ComboStep {
  streak: number
  mult: number
}

export interface GameMeta {
  title: string
  subtitle: string
  roundsCount: number
  betSeconds: number
  points: GamePoints
  comboSteps: ComboStep[]
}

export interface NewsItem {
  /** дата без года, как в данных («31 января») */
  date: string
  tag: string
  text: string
}

export interface Explanation {
  summary: string
  why: string
  facts: string[]
  lesson: string
}

export interface ChartData {
  /** ISO-даты торговых дней (анти-спойлер: на графике не рисуются) */
  dates: string[]
  closes: number[]
  decisionIndex: number
}

export interface Round {
  id: string
  order: number
  emoji: string
  theme: string
  title: string
  mysteryHint: string
  news: NewsItem[]
  companyOptions: string[]
  yearOptions: number[]
  answers: { company: string; year: number }
  ticker: string
  decisionDate: string
  revealDays: number
  direction: Direction
  explanation: Explanation
  chart: ChartData
  movePct: number
  revealMinPct: number
  revealMaxPct: number
  revealLastDate: string
}

export interface ScoreSeed {
  player: string
  score: number
  roundsTotal: number
  directionsCorrect: number
  bestStreak: number
  createdAt: string
}

/** Корень game.json после маппинга */
export interface GameData {
  version: number
  game: GameMeta
  rounds: Round[]
  seedScores: ScoreSeed[]
}

/** Запись лидерборда (сервер и локальный фолбэк) */
export interface Score {
  id: number
  player: string
  score: number
  roundsTotal: number
  directionsCorrect: number
  bestStreak: number
  createdAt: string
}

/** Результат скоринга одного раунда (чистая функция engine.scoreRound) */
export interface RoundScore {
  companyPts: number
  yearPts: number
  directionPts: number
  speedBonus: number
  multiplier: number
  total: number
  streakAfter: number
  bestStreak: number
}

/** Полный лог ответов раунда (для ревила и итогов) */
export interface RoundAnswer {
  roundId: string
  ticker: string
  company: string
  companyCorrect: boolean
  companyGuessed: string
  year: number
  yearCorrect: boolean
  yearGuessed: number
  bet: Direction | null
  actual: Direction
  timeLeftRatio: number
  points: RoundScore
}
