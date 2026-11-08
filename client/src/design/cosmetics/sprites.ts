/* ═══════════════════════════════════════════════════════════════
   СПРАЙТЫ КОСМЕТИКИ — матрицы и палитровые ремапы.

   Легенды букв (для каждой шляпы/аксессуара своя):
     O — контур, A — основной цвет, B — тень/изнанка,
     C — акцент (лента/камень/полоса), W — блик, S — звезда, K — узелок.

   Как и в axolotl-data.ts, здесь допустимы «матричные» hex-цвета
   вне tokens.css; где совпадает с палитрой — var(--…).

   Сетки аксолотля 26×22: верх темечка ≈ y=0..4, глаза y=5..7.
   Шляпы: { x, y } — левый-верхний угол матрицы в сетке аксолотля,
   lift — сколько строк матрица выходит выше y=0 (svg viewBox
   расширяется вверх, пропорции компонента сохраняются).
   ═══════════════════════════════════════════════════════════════ */

import { AXO_LEGEND } from '../axolotl-data'

/* ═════════════════ СКИНЫ: ремапы легенды ═════════════════ */

/** Ключи легенды, которые разрешено ремапить скином */
export type SkinPalette = Partial<Record<string, string>>

/**
 * Скины-ремапы. Классика — пустой объект (базовая легенда).
 * Контур 'O' скины НЕ трогают (кроме голограммы — см. SKIN_HOLO_FRAMES).
 */
export const SKIN_PALETTE: Record<string, SkinPalette> = {
  'skin-classic': {},
  'skin-albino': { P: '#f5f0f5', L: '#ffffff', D: '#f0d9e2', G: '#f2b8cd' },
  'skin-lime': { P: '#b8e986', L: '#e7f8cf', D: '#a3d977', G: '#7bc043' },
  'skin-aqua': { P: '#7fe3d6', L: '#dcf8f3', D: '#66d6c9', G: '#2fbfae' },
  'skin-lavender': { P: '#c9b6f5', L: '#ebe3ff', D: '#b39eea', G: '#9b7bea' },
  'skin-gold': { P: '#ffd23e', L: '#ffe9a3', D: '#f0b41f', G: '#e6a100' },
  'skin-cyber': { P: '#2b3550', L: '#3d4a6b', D: 'var(--aqua)', G: 'var(--aqua)', W: 'var(--aqua-hi)' },
}

/**
 * Анимированный скин «Голограмма»: 3 кадра палитры мятный→розовый→голубой,
 * перелив реализован тремя слоями тела (как кадры жабр A/B). Единственный
 * скин, которому разрешено осветлять контур 'O'.
 */
export const SKIN_HOLO_FRAMES: Record<string, SkinPalette[]> = {
  'skin-holo': [
    { P: '#a8fff0', L: '#e8fffa', D: '#7ce9d9', G: '#6cf5d4', O: '#0f3f3c' },
    { P: '#ffb3e2', L: '#ffe4f4', D: '#ff7ac8', G: '#ff5fb0', O: '#40142f' },
    { P: '#a8c8ff', L: '#e6efff', D: '#7fa8ff', G: '#5f8fff', O: '#14284f' },
  ],
}

/** Аккуратный merge: ключи с undefined из Partial не попадают в легенду */
function mergeLegend(base: Record<string, string>, patch: SkinPalette): Record<string, string> {
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/** Легенда для статичного рендера скина (голограмма → первый кадр) */
export function resolveSkinLegend(skinId?: string): Record<string, string> {
  if (!skinId) return AXO_LEGEND
  const holo = SKIN_HOLO_FRAMES[skinId]
  if (holo) return mergeLegend(AXO_LEGEND, holo[0])
  const palette = SKIN_PALETTE[skinId]
  return palette ? mergeLegend(AXO_LEGEND, palette) : AXO_LEGEND
}

/** Три легенды-кадра для анимированного скина (null для обычных) */
export function skinHoloLegends(skinId?: string): Record<string, string>[] | null {
  if (!skinId) return null
  const frames = SKIN_HOLO_FRAMES[skinId]
  return frames ? frames.map((f) => mergeLegend(AXO_LEGEND, f)) : null
}

/* ═════════════════ ШЛЯПЫ ═════════════════ */

/** Матрицы шляп (реестр для <Axolotl hat=…/> и иконок) */
export const HAT_SPRITES: Record<string, string[]> = {
  /* кепка: купол + козырёк влево */
  'hat-cap': [
    '.....OOOO....',
    '....OAAAAO...',
    '...OAWAAAO...',
    '...OAAAAAO...',
    'OOOOOOOOOO...',
    'OBBBBBBBBO...',
    '.OOOOOOOO....',
  ],
  /* панама: купол с лентой + широкие поля */
  'hat-panama': [
    '....OOOOO....',
    '...OAAAAAO...',
    '...OACCCAO...',
    '...OAAAAAO...',
    '.OOOOOOOOOOO.',
    'OBBBBBBBBBBBO',
    '.OOOOOOOOOOO.',
  ],
  /* бандана: полоса по лбу + горошины + узелок слева (K) */
  'hat-bandana': [
    '..OOOOOOOOO..',
    '..OAAAAAAAO..',
    '.KOACAAACAO..',
    'OKOAAAAAAAO..',
    '..OOOOOOOOO..',
  ],
  /* цилиндр: высокая тулья + золотая лента + поля */
  'hat-cylinder': [
    '...OOOOOOO...',
    '...OAAAAAO...',
    '...OAAAAAO...',
    '...OAAAAAO...',
    '...OCCCCCO...',
    '...OAAAAAO...',
    '.OOOOOOOOOOO.',
    '.OBBBBBBBBBO.',
    '..OOOOOOOOO..',
  ],
  /* наушники: дуга-оголовье + чашки по бокам головы (сама широкая) */
  'hat-headphones': [
    '........OOOOOO........',
    '.......OAAAAAAO.......',
    '......OAO....OAO......',
    '......OAO....OAO......',
    'OOOOOO..........OOOOOO',
    'OACAO............OACAO',
    'OACAO............OACAO',
    '.OOO..............OOO.',
  ],
  /* каска: купол + поля во всю ширину */
  'hat-hardhat': [
    '.....OOO.....',
    '....OAAAO....',
    '...OAWAAAO...',
    '..OAAAAAAAO..',
    'OOOOOOOOOOOOO',
    'OBBBBBBBBBBBO',
    '.OOOOOOOOOOO.',
  ],
  /* корона: три зубца + камни-аквамарины */
  'hat-crown': [
    '.O....O....O.',
    '.OO..OOO..OO.',
    '.OOOOOOOOOOO.',
    '.OACAACAACAO.',
    '.OAAAAAAAAAO.',
    '.OOOOOOOOOOO.',
  ],
  /* шляпа мага: загибающийся конус + звёзды + поля */
  'hat-wizard': [
    '......O......',
    '.....OWO.....',
    '.....OAO.....',
    '....OAAAO....',
    '...OASAAAO...',
    '...OAAASAO...',
    '..OAAAAAAAO..',
    '.OOOOOOOOOOO.',
    '.OBBBBBBBBBO.',
    '..OOOOOOOOO..',
  ],
  /* бычьи рога: изогнутые рога по бокам головы (широкая сетка) */
  'hat-bull': [
    'OO............OO',
    'OWO..........OWO',
    '.OAO........OAO.',
    '.OAAO......OAAO.',
    '..OAAO....OAAO..',
    '..OAAAO..OAAAO..',
    '...OOOO..OOOO...',
  ],
}

export const HAT_LEGENDS: Record<string, Record<string, string>> = {
  'hat-cap': { O: 'var(--outline)', A: 'var(--aqua)', B: '#2ba993', W: 'var(--aqua-hi)' },
  'hat-panama': { O: 'var(--outline)', A: '#e8d5a3', B: '#c9ae74', C: '#9b7b46' },
  'hat-bandana': { O: 'var(--outline)', A: 'var(--gill)', C: 'var(--ink)', K: 'var(--pink-deep)' },
  'hat-cylinder': { O: 'var(--outline)', A: '#1c2a45', B: '#141f36', C: 'var(--gold)' },
  'hat-headphones': { O: 'var(--outline)', A: 'var(--aqua)', C: '#2ba993' },
  'hat-hardhat': { O: 'var(--outline)', A: 'var(--gold)', B: '#cf9c10', W: '#ffe9a3' },
  'hat-crown': { O: 'var(--outline)', A: 'var(--gold)', C: 'var(--aqua)' },
  'hat-wizard': { O: 'var(--outline)', A: '#9b7bea', B: '#7b5cd0', S: 'var(--gold)', W: 'var(--gold)' },
  'hat-bull': { O: 'var(--outline)', A: '#c9920e', W: 'var(--gold)' },
}

/** Посадка шляпы в сетке аксолотля 26×22 (x/y — левый верхний угол) */
export const HAT_LAYOUT: Record<string, { x: number; y: number; lift: number }> = {
  'hat-cap': { x: 6, y: -3, lift: 3 },
  'hat-panama': { x: 6, y: -3, lift: 3 },
  'hat-bandana': { x: 6, y: 0, lift: 0 },
  'hat-cylinder': { x: 6, y: -5, lift: 5 },
  'hat-headphones': { x: 2, y: -2, lift: 2 },
  'hat-hardhat': { x: 6, y: -3, lift: 3 },
  'hat-crown': { x: 6, y: -3, lift: 3 },
  'hat-wizard': { x: 6, y: -6, lift: 6 },
  'hat-bull': { x: 5, y: -3, lift: 3 },
}

/* ═════════════════ АКСЕССУАРЫ ═════════════════ */

/** Матрицы аксессуаров (реестр для <Axolotl acc=…/> и иконок) */
export const ACC_SPRITES: Record<string, string[]> = {
  /* бабочка: крылья + узелок (под подбородком) */
  'acc-bow': ['.OO.OO.', 'OPPAPPO', 'OPPAPPO', '.OO.OO.'],
  /* очки: прямоугольная оправа, «стёкла» прозрачные (точки) */
  'acc-glasses': ['OOOOOO.OOOOOO', 'O....OOO....O', 'O....O.O....O', 'OOOOOO.OOOOOO'],
  /* монокль: кольцо на правом глазу + цепочка вниз */
  'acc-monocle': ['.OOO...', 'O...O..', 'O...O..', '.OOOO..', '.....O.', '......O'],
  /* галстук: узел + полосатое полотно */
  'acc-tie': ['..OOO..', '.OAAAO.', 'OOOOOOO', '.OAAAO.', '.OCCCO.', '.OAAAO.', '.OCCCO.', '..OOO..'],
  /* портфель: ручка + корпус + золотой замок (в лапке, слева) */
  'acc-briefcase': ['.OOOOO.', '.O...O.', 'OOOOOOO', 'OAACAAO', 'OAACAAO', 'OAAAAAO', 'OOOOOOO'],
  /* лазерные очки: сплошная оправа + неоновые стёкла N (2 кадра мерцания) */
  'acc-laser': ['OOOOOOOOOOOOO', 'ONNNNOOONNNNO', 'ONNNNOOONNNNO', 'OOOOOOOOOOOOO'],
}

export const ACC_LEGENDS: Record<string, Record<string, string>> = {
  'acc-bow': { O: 'var(--outline)', P: 'var(--pink)', A: 'var(--gill)' },
  'acc-glasses': { O: 'var(--outline)' },
  'acc-monocle': { O: 'var(--gold)' },
  'acc-tie': { O: 'var(--outline)', A: '#c22b4e', C: 'var(--gold)' },
  'acc-briefcase': { O: 'var(--outline)', A: '#a4682d', C: 'var(--gold)' },
  'acc-laser': { O: 'var(--outline)', N: 'var(--aqua)' },
}

/**
 * Многокадровые аксессуары: массив легенд = кадры мерцания
 * (кадры переключает CSS в axolotl.css, как жабры A/B).
 */
export const ACC_FRAMES: Record<string, Record<string, string>[]> = {
  'acc-laser': [
    { O: 'var(--outline)', N: 'var(--aqua)' },
    { O: 'var(--outline)', N: 'var(--aqua-hi)' },
  ],
}

/** Позиция аксессуара в сетке аксолотля 26×22 */
export const ACC_LAYOUT: Record<string, { x: number; y: number }> = {
  'acc-bow': { x: 10, y: 12 }, // под подбородком, по центру
  'acc-glasses': { x: 6, y: 5 }, // поверх зоны глаз
  'acc-monocle': { x: 13, y: 4 }, // на правом глазу
  'acc-tie': { x: 10, y: 12 }, // на груди, по центру
  'acc-briefcase': { x: 1, y: 12 }, // сбоку у левой лапки
  'acc-laser': { x: 6, y: 5 }, // поверх зоны глаз
}
