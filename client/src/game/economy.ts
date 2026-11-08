/* ═══════════════════════════════════════════════════════════════
   ЭКОНОМИКА «ПУЗЫРЬКОВ» — только чистые функции, без React и
   storage. Все числа — из docs/COSMETICS_SPEC.md (v1.1):
     • награды за партию/Daily (§1)
     • дроп-таблицы сундуков и компенсации дублей (§2)
     • гарантия сочувствия (pity) для деревянных сундуков (§2)
   Каталог предметов — из дизайн-системы (data-модуль catalog.ts).
   ═══════════════════════════════════════════════════════════════ */

import { COSMETICS } from '../design/cosmetics/catalog'
import type { CosmeticKind, Rarity } from '../design/cosmetics/catalog'
import type { ChestType } from '../design/cosmetics/chests'
import type { RoundAnswer } from './types'

/* ─────────── награды монетами (спец §1) ─────────── */

export const COINS_AWARD = {
  /** компания угадана */
  company: 15,
  /** год угадан */
  year: 10,
  /** направление верно */
  direction: 40,
  /** раунд завершён (любой исход) */
  round: 10,
  /** партия кампании целиком */
  game: 30,
} as const

/** монеты за один раунд: 15/10/40 за точность + 10 за завершение */
export function roundCoins(r: RoundAnswer): number {
  let n = COINS_AWARD.round
  if (r.companyCorrect) n += COINS_AWARD.company
  if (r.yearCorrect) n += COINS_AWARD.year
  if (r.bet !== null && r.bet === r.actual) n += COINS_AWARD.direction
  return n
}

/** монеты за партию кампании: сумма раундов + бонус за партию */
export function gameCoins(log: RoundAnswer[]): number {
  return log.reduce((acc, r) => acc + roundCoins(r), 0) + COINS_AWARD.game
}

/** монеты за daily-кейс: раунд ×1 + бонус стрика 10 × min(streak, 7) */
export function dailyCoins(result: RoundAnswer, streakDays: number): number {
  return roundCoins(result) + 10 * Math.min(streakDays, 7)
}

/* ─────────── сундуки: цены и дроп-таблицы (спец §2) ─────────── */

/** цены сундуков в магазине хаба (v1.2: деревянный за 50 — новинка) */
export const CHEST_PRICES: Record<ChestType, number> = {
  wooden: 50,
  pearl: 150,
  gold: 400,
}

/** редкости, которые могут выпасть (стартовые скины не дропаются) */
export type DropRarity = Exclude<Rarity, 'starter'>

export const DROP_RARITIES: DropRarity[] = ['common', 'rare', 'epic', 'legend']

/** шансы common/rare/epic/legend в процентах (сумма = 100) */
export interface DropTable {
  common: number
  rare: number
  epic: number
  legend: number
}

export const DROP_TABLES: Record<ChestType, DropTable> = {
  wooden: { common: 70, rare: 25, epic: 5, legend: 0 },
  pearl: { common: 55, rare: 32, epic: 12, legend: 1 },
  gold: { common: 40, rare: 40, epic: 18, legend: 2 },
}

/** компенсация монетами за дубликат (спец §1) */
export const DUPLICATE_REFUND: Record<DropRarity, number> = {
  common: 20,
  rare: 60,
  epic: 200,
  legend: 500,
}

/** 4 деревянных подряд без rare+ → 5-й гарантирует rare+ (pity) */
export const PITY_LIMIT = 4

const KINDS: CosmeticKind[] = ['skin', 'hat', 'acc']

/** взвешенный выбор редкости по таблице (кумулятивно) */
function pickRarity(table: DropTable, rng: () => number): DropRarity {
  let roll = rng() * 100
  for (const r of DROP_RARITIES) {
    roll -= table[r]
    if (roll < 0) return r
  }
  return 'legend'
}

/** таблица без common — для гарантии pity (перенормировка на rare+) */
function atLeastRare(table: DropTable): DropTable {
  const total = table.rare + table.epic + table.legend
  if (total <= 0) return { common: 0, rare: 100, epic: 0, legend: 0 }
  return {
    common: 0,
    rare: (table.rare / total) * 100,
    epic: (table.epic / total) * 100,
    legend: (table.legend / total) * 100,
  }
}

export interface DropResult {
  itemId: string
  kind: CosmeticKind
  rarity: DropRarity
  /** предмет уже был в инвентаре → компенсация монетами */
  duplicate: boolean
  refundCoins: number
  /** сработала гарантия сочувствия (rarity принудительно повышен) */
  pityUsed: boolean
}

/**
 * Ролл дропа: случайный ТИП (скин/шляпа/аксессуар равновероятно) и
 * РЕДКОСТЬ по таблице сундука, затем случайный предмет этой редкости
 * из каталога (не стартовые). Если всё этой редкости уже есть —
 * дубликат случайного с компенсацией (спец §2).
 * forcedRarity — дебаг/e2e-хук: принудительная редкость следующего
 * дропа (валидную проверяет вызывающий или она игнорируется).
 */
export function rollDrop(
  chestType: ChestType,
  ownedIds: string[],
  pityCounter: number,
  rng: () => number = Math.random,
  forcedRarity?: DropRarity,
): DropResult {
  const table = DROP_TABLES[chestType]
  const forced =
    forcedRarity !== undefined && DROP_RARITIES.includes(forcedRarity) ? forcedRarity : null
  const pityUsed = chestType === 'wooden' && pityCounter >= PITY_LIMIT && forced === null
  const rarity =
    forced ??
    (pityUsed ? pickRarity(atLeastRare(table), rng) : pickRarity(table, rng))

  // тип равновероятный; страховка от пустого пула — вся редкость
  const kind = KINDS[Math.floor(rng() * KINDS.length)]
  const pool = COSMETICS.filter((c) => c.kind === kind && c.rarity === rarity)
  const fallback = pool.length > 0 ? pool : COSMETICS.filter((c) => c.rarity === rarity)
  const item = fallback[Math.floor(rng() * fallback.length)]

  const duplicate = ownedIds.includes(item.id)
  return {
    itemId: item.id,
    kind: item.kind,
    rarity,
    duplicate,
    refundCoins: duplicate ? DUPLICATE_REFUND[rarity] : 0,
    pityUsed,
  }
}

/** новый счётчик pity: растёт только на деревянных без rare+ */
export function pityAfter(chestType: ChestType, drop: DropResult, pityCounter: number): number {
  if (chestType !== 'wooden') return pityCounter
  const rarePlus = drop.rarity !== 'common'
  return rarePlus ? 0 : pityCounter + 1
}
