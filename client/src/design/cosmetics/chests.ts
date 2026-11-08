/* ═══════════════════════════════════════════════════════════════
   СУНДУКИ С ЛУТОМ — данные спрайтов и палитры типов.
   Компонент <Chest/> — в Chest.tsx (сундук = основание + крышка,
   крышку при открытии откидывает framer-motion).

   Легенда: O — контур, W — корпус, D — тень/фаски корпуса,
   N — металл-обвязка, M — замок, L — свет изнутри/лучи.
   ═══════════════════════════════════════════════════════════════ */

import type { Rarity } from './rarity'

export type ChestType = 'wooden' | 'pearl' | 'gold'

export interface ChestInfo {
  id: ChestType
  name: string
  rarity: Rarity
  desc: string
}

export const CHESTS: Record<ChestType, ChestInfo> = {
  wooden: {
    id: 'wooden',
    name: 'Деревянный сундук',
    rarity: 'common',
    desc: 'Скрипит, как кресло ветерана биржи.',
  },
  pearl: {
    id: 'pearl',
    name: 'Жемчужный сундук',
    rarity: 'rare',
    desc: 'Поднят со дна рейда на жемчужную ферму.',
  },
  gold: {
    id: 'gold',
    name: 'Золотой сундук',
    rarity: 'legend',
    desc: 'Внутри отчётливо звенит. Это к прибыли.',
  },
}

/** Крышка (закрыта = лежит сверху; при открытии откидывается назад) */
export const CHEST_LID: string[] = [
  '....OOOOOOOOOOOOOO....',
  '...OWWWWWWWWWWWWWWO...',
  '..OWWWWWWWWWWWWWWWWO..',
  '..OWWWWDWWWWWWWDWWWO..',
  '..OWWWWWWWWWWWWWWWWO..',
  '.OOOOOOOOOOOOOOOOOOOO.',
]

/** Основание с замком (замок M, скважина — тёмные O) */
export const CHEST_BASE: string[] = [
  '.ONNNNNNNNNNNNNNNNNNO.',
  '.OWWWWWWWMMMMWWWWWWWO.',
  '.OWWWWWWWMOOMWWWWWWWO.',
  '.OWWWWWWWMMMMWWWWWWWO.',
  '.OWWWWWWWWWWWWWWWWWWO.',
  '.OWWDWWWWWWWWWWWWWWWO.',
  '.OWWWWWWWWWWWWWWDWWWO.',
  '.OWWWWWWWWWWWWWWWWWWO.',
  '.OOOOOOOOOOOOOOOOOOOO.',
  '..OOOOOOOOOOOOOOOOOO..',
]

/** Светящаяся внутренность (видна при открытой крышке) */
export const CHEST_INSIDE: string[] = [
  '.LLLLLLWLLLLWLLLLLL.',
  '.LLLLLLLLLLLLLLLLLL.',
]

/** Веер лучей из горловины открытого сундука */
export const CHEST_RAYS: string[] = [
  'L.....L.....L',
  '.L....L....L.',
  '..L...L...L..',
  '...L..L..L...',
  '....L.L.L....',
  '.....LLL.....',
]

/** Палитра типа сундука (одна легенда на все части) */
export const CHEST_LEGENDS: Record<ChestType, Record<string, string>> = {
  wooden: {
    O: 'var(--outline)',
    W: '#a4682d',
    D: '#7a4a1e',
    N: '#cf9c10',
    M: 'var(--gold)',
    L: '#ffe9a3',
  },
  pearl: {
    O: 'var(--outline)',
    W: '#bfeef0',
    D: '#8fd0d6',
    N: 'var(--aqua)',
    M: 'var(--aqua-hi)',
    L: 'var(--aqua-hi)',
  },
  gold: {
    O: 'var(--outline)',
    W: 'var(--gold)',
    D: '#cf9c10',
    N: '#cf9c10',
    M: 'var(--aqua)',
    L: '#ffe9a3',
  },
}

/** Геометрия сборки сундука (svg viewBox «0 -8 22 24») */
export const CHEST_VIEW = {
  width: 22,
  height: 24,
  top: -8,
  /** основание */ base: { x: 0, y: 6 },
  /** крышка (закрыта) */ lid: { x: 0, y: 1 },
  /** внутренность (открыт) */ inside: { x: 1, y: 4 },
  /** лучи (открыт) */ rays: { x: 4, y: -1 },
} as const
