/* ═══════════════════════════════════════════════════════════════
   Единое хранилище localStorage. Всё в try/catch: приватный режим
   и WebView без storage не должны ломать игру.
   Ключи: ax_nick, ax_best, ax_games, ax_last, ax_scores_v1
   ═══════════════════════════════════════════════════════════════ */

import type { Score } from './types'

const KEYS = {
  nick: 'ax_nick',
  best: 'ax_best',
  games: 'ax_games',
  last: 'ax_last',
  scores: 'ax_scores_v1',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* нет storage — играем без истории */
  }
}

export interface StoredResult {
  score: number
  roundsTotal: number
  directionsCorrect: number
  bestStreak: number
  at: string
}

export const storage = {
  getNick(): string {
    return read<string>(KEYS.nick, '')
  },
  setNick(nick: string): void {
    write(KEYS.nick, nick)
  },

  getBestScore(): number {
    return read<number>(KEYS.best, 0)
  },
  /** рекорд обновляем только в большую сторону */
  setBestScore(score: number): void {
    if (score > this.getBestScore()) write(KEYS.best, score)
  },

  getGamesCount(): number {
    return read<number>(KEYS.games, 0)
  },
  bumpGames(): number {
    const n = this.getGamesCount() + 1
    write(KEYS.games, n)
    return n
  },

  getLastResult(): StoredResult | null {
    return read<StoredResult | null>(KEYS.last, null)
  },
  setLastResult(result: StoredResult): void {
    write(KEYS.last, result)
  },

  /* ── локальный лидерборд (фолбэк при недоступном сервере) ──
     При первом обращении база засеивается ботами из game.json. */

  getLocalScores(seed: Score[]): Score[] {
    try {
      const raw = window.localStorage.getItem(KEYS.scores)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as Score[]
        if (Array.isArray(parsed)) return parsed
      }
      const seeded = seed.map((s, i) => ({ ...s, id: i + 1 }))
      write(KEYS.scores, seeded)
      return seeded
    } catch {
      return seed.map((s, i) => ({ ...s, id: i + 1 }))
    }
  },

  addLocalScore(
    entry: { player: string; score: number; roundsTotal: number; directionsCorrect: number; bestStreak: number },
    seed: Score[],
  ): Score {
    const list = this.getLocalScores(seed)
    const maxId = list.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0)
    const record: Score = { ...entry, id: maxId + 1, createdAt: new Date().toISOString() }
    write(KEYS.scores, [...list, record])
    return record
  },

  /** место в локальной таблице: 1 + количество записей с большим счётом */
  localRank(score: number, seed: Score[]): number {
    return 1 + this.getLocalScores(seed).filter((s) => s.score > score).length
  },
}
