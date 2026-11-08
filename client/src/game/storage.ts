/* ═══════════════════════════════════════════════════════════════
   Единое хранилище localStorage. Всё в try/catch: приватный режим
   и WebView без storage не должны ломать игру.
   Ключи: ax_nick, ax_best, ax_games, ax_last, ax_scores_v1,
   ax_coins, ax_inv, ax_equip, ax_pity, ax_daily (косметика/daily)
   ═══════════════════════════════════════════════════════════════ */

import type { CosmeticKind } from '../design/cosmetics/catalog'
import type { Score } from './types'

const KEYS = {
  nick: 'ax_nick',
  best: 'ax_best',
  games: 'ax_games',
  last: 'ax_last',
  scores: 'ax_scores_v1',
  coins: 'ax_coins',
  inv: 'ax_inv',
  equip: 'ax_equip',
  pity: 'ax_pity',
  daily: 'ax_daily',
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

/* ─────────── косметика и Daily (COSMETICS_SPEC §3–4) ─────────── */

/** надетое: скин всегда есть, шляпа/аксессуар могут быть null */
export interface EquipState {
  skin: string
  hat: string | null
  acc: string | null
}

/** история хроники дня: последний ключ, стрик и счётчики */
export interface DailyState {
  lastDateKey: string | null
  streak: number
  bestStreak: number
  playedDays: number
}

/** локальная дата Date → «YYYY-MM-DD» (чистая, без тест-хуков) */
export function localDateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/* e2e-хук подмены даты: window.__setDateKey('YYYY-MM-DD' | null).
   Установка дергает событие 'ax-date-change', чтобы приложение
   пересчитало состояние daily без перезагрузки.
   Аналогичный хук __forceDropRarity — форсирует редкость следующего
   дропа из сундука (для скриншотов/тестов анимаций редкости). */
declare global {
  interface Window {
    /** тест-хук: подменить локальную дату (null — реальная) */
    __setDateKey?: (key: string | null) => void
    __axDateKey?: string | null
    /** тест-хук: редкость следующего дропа ('common'|'rare'|'epic'|'legend'; null — сброс) */
    __forceDropRarity?: (rarity: string | null) => void
    __axForceRarity?: string | null
  }
}

if (typeof window !== 'undefined' && typeof window.__setDateKey !== 'function') {
  window.__setDateKey = (key: string | null) => {
    window.__axDateKey = key
    window.dispatchEvent(new Event('ax-date-change'))
  }
}

if (typeof window !== 'undefined' && typeof window.__forceDropRarity !== 'function') {
  window.__forceDropRarity = (rarity: string | null) => {
    window.__axForceRarity = rarity
  }
}

/** «сегодня» для daily-механики: локальная дата с учётом e2e-оверрайда */
export function getDailyDateKey(): string {
  const override = typeof window !== 'undefined' ? window.__axDateKey : undefined
  if (typeof override === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override
  return localDateKey(new Date())
}

/* ── санитайзеры прочитанного (storage мог быть битым/чужим) ── */

const toNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

function readInventory(): string[] {
  const raw = read<unknown>(KEYS.inv, [])
  const list = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
  return list.includes('skin-classic') ? list : ['skin-classic', ...list]
}

function readEquip(): EquipState {
  const raw = read<Partial<EquipState>>(KEYS.equip, {})
  return {
    skin: typeof raw.skin === 'string' && raw.skin ? raw.skin : 'skin-classic',
    hat: typeof raw.hat === 'string' && raw.hat ? raw.hat : null,
    acc: typeof raw.acc === 'string' && raw.acc ? raw.acc : null,
  }
}

function readDailyState(): DailyState {
  const raw = read<Partial<DailyState>>(KEYS.daily, {})
  const key = typeof raw.lastDateKey === 'string' ? raw.lastDateKey : null
  return {
    lastDateKey: key !== null && /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null,
    streak: Math.max(0, toNum(raw.streak)),
    bestStreak: Math.max(0, toNum(raw.bestStreak)),
    playedDays: Math.max(0, toNum(raw.playedDays)),
  }
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

  /* ── монеты ── */

  getCoins(): number {
    return Math.max(0, Math.round(read<number>(KEYS.coins, 0) || 0))
  },

  /** начислить/списать монеты; возвращает новый баланс (низ — 0) */
  addCoins(delta: number): number {
    const next = Math.max(0, this.getCoins() + Math.round(delta))
    write(KEYS.coins, next)
    return next
  },

  /** попытка списания: false — не хватило (баланс не трогаем) */
  spendCoins(amount: number): boolean {
    if (this.getCoins() < amount) return false
    write(KEYS.coins, this.getCoins() - amount)
    return true
  },

  /* ── инвентарь косметики ── */

  getInventory(): string[] {
    return readInventory()
  },

  /** добавить предмет (если уже есть — ничего); возвращает новый список */
  addToInventory(id: string): string[] {
    const inv = this.getInventory()
    if (inv.includes(id)) return inv
    const next = [...inv, id]
    write(KEYS.inv, next)
    return next
  },

  /* ── экипировка ── */

  getEquip(): EquipState {
    return readEquip()
  },

  setEquip(equip: EquipState): void {
    write(KEYS.equip, equip)
  },

  /** надеть/снять слот; skin без id не меняется (скин обязан быть) */
  equipItem(kind: CosmeticKind, id: string | null): EquipState {
    const cur = this.getEquip()
    const next: EquipState =
      kind === 'skin'
        ? { ...cur, skin: id ?? cur.skin }
        : { ...cur, [kind]: id }
    this.setEquip(next)
    return next
  },

  /* ── pity деревянных сундуков ── */

  getPity(): number {
    return Math.max(0, toNum(read<unknown>(KEYS.pity, 0)))
  },

  setPity(count: number): number {
    const n = Math.max(0, Math.round(count))
    write(KEYS.pity, n)
    return n
  },

  /* ── хроника дня ── */

  getDaily(): DailyState {
    return readDailyState()
  },

  setDaily(d: DailyState): void {
    write(KEYS.daily, d)
  },

  /* ── дебаг (хаб v1.2) ── */

  /** полный сброс прогресса: все ключи ax_* + настройки axolotl.* */
  resetAll(): void {
    try {
      const doomed: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k && (k.startsWith('ax_') || k.startsWith('axolotl.'))) doomed.push(k)
      }
      doomed.forEach((k) => window.localStorage.removeItem(k))
    } catch {
      /* нет storage — нечего сбрасывать */
    }
  },
}
