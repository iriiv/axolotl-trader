/* ═══════════════════════════════════════════════════════════════
   Данные игры и лидерборд.

   Контент — ВСЕГДА статический импорт game.json: детерминированно
   и работает офлайн на GitHub Pages. Сервер (Express :4000) нужен
   только для лидерборда; при недоступности — локальный режим на
   localStorage с сидами из того же game.json.

   Почему sessionStorage для 'ax_api_offline': таймаут 2с на каждый
   запрос слишком заметен, поэтому факт «сервер мёртв» кешируем
   на вкладку — следующий фолбэк мгновенный.
   ═══════════════════════════════════════════════════════════════ */

import rawGameJson from './static/game.json'
import { storage } from './game/storage'
import type { GameData, Round, Score, ScoreSeed } from './game/types'

/* ─────────── мягкий маппинг unknown → типы (данные наши) ─────────── */

const asRec = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}

function str(v: unknown, d = ''): string {
  return typeof v === 'string' ? v : d
}
function num(v: unknown, d = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : d
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}
function numArr(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)) : []
}

function mapRound(v: unknown): Round | null {
  const r = asRec(v)
  const chart = asRec(r.chart)
  const answers = asRec(r.answers)
  const id = str(r.id)
  const closes = numArr(chart.closes)
  if (!id || closes.length < 2) return null
  return {
    id,
    order: num(r.order, 99),
    emoji: str(r.emoji, '📈'),
    theme: str(r.theme),
    title: str(r.title),
    mysteryHint: str(r.mysteryHint),
    news: Array.isArray(r.news)
      ? r.news.map((n) => {
          const rec = asRec(n)
          return { date: str(rec.date), tag: str(rec.tag), text: str(rec.text) }
        })
      : [],
    companyOptions: strArr(r.companyOptions),
    yearOptions: numArr(r.yearOptions),
    answers: { company: str(answers.company), year: num(answers.year) },
    ticker: str(r.ticker, '—'),
    decisionDate: str(r.decisionDate),
    revealDays: num(r.revealDays, 30),
    direction: str(r.direction) === 'up' ? 'up' : 'down',
    explanation: {
      summary: str(asRec(r.explanation).summary),
      why: str(asRec(r.explanation).why),
      facts: strArr(asRec(r.explanation).facts),
      lesson: str(asRec(r.explanation).lesson),
    },
    chart: {
      dates: strArr(chart.dates),
      closes,
      decisionIndex: Math.max(0, Math.min(num(chart.decisionIndex), closes.length - 2)),
    },
    movePct: num(r.movePct),
    revealMinPct: num(r.revealMinPct),
    revealMaxPct: num(r.revealMaxPct),
    revealLastDate: str(r.revealLastDate),
  }
}

function mapSeed(v: unknown): ScoreSeed {
  const r = asRec(v)
  return {
    player: str(r.player, 'Аноним'),
    score: num(r.score),
    roundsTotal: num(r.roundsTotal, 5),
    directionsCorrect: num(r.directionsCorrect),
    bestStreak: num(r.bestStreak),
    createdAt: str(r.createdAt),
  }
}

function mapScoreEntry(v: unknown): Score | null {
  const r = asRec(v)
  if (!str(r.player)) return null
  return {
    id: num(r.id),
    player: str(r.player),
    score: num(r.score),
    roundsTotal: num(r.roundsTotal, 5),
    directionsCorrect: num(r.directionsCorrect),
    bestStreak: num(r.bestStreak),
    createdAt: str(r.createdAt),
  }
}

function mapGame(raw: unknown): GameData {
  const root = asRec(raw)
  const g = asRec(root.game)
  const rounds = (Array.isArray(root.rounds) ? root.rounds : [])
    .map(mapRound)
    .filter((r): r is Round => r !== null)
    .sort((a, b) => a.order - b.order)
  return {
    version: num(root.version, 1),
    game: {
      title: str(g.title, 'Биржевые хроники'),
      subtitle: str(g.subtitle),
      roundsCount: num(g.roundsCount, rounds.length),
      betSeconds: num(g.betSeconds, 15),
      points: {
        company: num(asRec(g.points).company, 150),
        year: num(asRec(g.points).year, 100),
        direction: num(asRec(g.points).direction, 250),
        speedMax: num(asRec(g.points).speedMax, 100),
      },
      comboSteps: (Array.isArray(g.comboSteps) ? g.comboSteps : []).map((s) => {
        const rec = asRec(s)
        return { streak: num(rec.streak, 2), mult: num(rec.mult, 1) }
      }),
    },
    rounds,
    seedScores: (Array.isArray(root.seedScores) ? root.seedScores : []).map(mapSeed),
  }
}

/** Игровой контент (маппится один раз при старте модуля) */
export const gameData: GameData = mapGame(rawGameJson)

export function loadGame(): GameData {
  return gameData
}

/** Сиды для локального лидерборда */
function seedScores(): Score[] {
  return gameData.seedScores.map((s, i) => ({ ...s, id: i + 1 }))
}

/* ─────────── лидерборд: сервер → локальный фолбэк ─────────── */

const API_TIMEOUT_MS = 2000
const OFFLINE_KEY = 'ax_api_offline'

function cachedOffline(): boolean {
  try {
    return window.sessionStorage.getItem(OFFLINE_KEY) === '1'
  } catch {
    return false
  }
}
function markOffline(): void {
  try {
    window.sessionStorage.setItem(OFFLINE_KEY, '1')
  } catch {
    /* нет sessionStorage — просто без кеша */
  }
}

/** fetch с таймаутом; успех сбрасывает кеш офлайна */
async function apiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), API_TIMEOUT_MS)
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: unknown = await res.json()
    try {
      window.sessionStorage.removeItem(OFFLINE_KEY)
    } catch {
      /* ignore */
    }
    return data
  } finally {
    window.clearTimeout(timer)
  }
}

export interface ScoreSubmission {
  player: string
  score: number
  roundsTotal: number
  directionsCorrect: number
  bestStreak: number
}

export interface SubmitResult {
  id: number | null
  rank: number
  /** true — записали в локальный localStorage (сервер недоступен) */
  offline: boolean
}

export async function submitScore(payload: ScoreSubmission): Promise<SubmitResult> {
  if (!cachedOffline()) {
    try {
      const raw = await apiFetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const r = asRec(raw)
      return { id: num(r.id), rank: num(r.rank, 1), offline: false }
    } catch {
      // сеть/таймаут/5xx — уходим в локальный режим до конца сессии
      markOffline()
    }
  }
  const record = storage.addLocalScore(payload, seedScores())
  return {
    id: record.id,
    rank: storage.localRank(record.score, seedScores()),
    offline: true,
  }
}

function byScoreDesc(a: Score, b: Score): number {
  if (b.score !== a.score) return b.score - a.score
  return a.createdAt < b.createdAt ? -1 : 1
}

export async function fetchScores(limit = 20): Promise<{ scores: Score[]; offline: boolean }> {
  if (!cachedOffline()) {
    try {
      const raw = await apiFetch(`/api/scores?limit=${limit}`)
      const list = (asRec(raw).scores as unknown[] ?? [])
        .map(mapScoreEntry)
        .filter((s): s is Score => s !== null)
      return { scores: list, offline: false }
    } catch {
      markOffline()
    }
  }
  const local = [...storage.getLocalScores(seedScores())].sort(byScoreDesc).slice(0, limit)
  return { scores: local, offline: true }
}
