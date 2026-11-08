/* ═══════════════════════════════════════════════════════════════
   КАТАЛОГ КОСМЕТИКИ — метаданные предметов (без визуала!).
   Спрайты и палитры — в sprites.ts, сундуки — в chests.ts.
   Экономику/дропы/инвентарь сюда НЕ складываем — только данные.
   ═══════════════════════════════════════════════════════════════ */

import type { CosmeticKind, Rarity } from './rarity'

export type { CosmeticKind, Rarity }

export interface CosmeticItem {
  id: string
  kind: CosmeticKind
  name: string
  rarity: Rarity
  /** одна строка с юмором про инвестиции */
  desc: string
}

/* ── СКИНЫ (палитровые ремапы легенды аксолотля) ── */

export const SKINS: CosmeticItem[] = [
  {
    id: 'skin-classic',
    kind: 'skin',
    name: 'Классика',
    rarity: 'starter',
    desc: 'Розовый и надёжный, как вклад в гособлигации.',
  },
  {
    id: 'skin-albino',
    kind: 'skin',
    name: 'Альбинос',
    rarity: 'common',
    desc: 'Белый, как лицо трейдера при маржин-колле.',
  },
  {
    id: 'skin-lime',
    kind: 'skin',
    name: 'Лайм',
    rarity: 'common',
    desc: 'Свежий, как первый купон по облигации.',
  },
  {
    id: 'skin-aqua',
    kind: 'skin',
    name: 'Аква',
    rarity: 'rare',
    desc: 'Сливается с океаном ликвидности.',
  },
  {
    id: 'skin-lavender',
    kind: 'skin',
    name: 'Лаванда',
    rarity: 'rare',
    desc: 'Успокаивает портфель быстрее, чем ЦБ — ставку.',
  },
  {
    id: 'skin-gold',
    kind: 'skin',
    name: 'Золотой',
    rarity: 'epic',
    desc: 'Диверсификация? Нет, просто золото.',
  },
  {
    id: 'skin-cyber',
    kind: 'skin',
    name: 'Кибер',
    rarity: 'epic',
    desc: 'Котировки прямо в жабрах, терминал встроен.',
  },
  {
    id: 'skin-holo',
    kind: 'skin',
    name: 'Голограмма',
    rarity: 'legend',
    desc: 'Переливается, как график биткоина: каждую секунду не тот.',
  },
]

/* ── ШЛЯПЫ (матрицы поверх темечка) ── */

export const HATS: CosmeticItem[] = [
  {
    id: 'hat-cap',
    kind: 'hat',
    name: 'Кепка',
    rarity: 'common',
    desc: 'Козырёк повёрнут туда, куда смотрит индекс.',
  },
  {
    id: 'hat-panama',
    kind: 'hat',
    name: 'Панама',
    rarity: 'common',
    desc: 'Для тех, кто зафиксировал прибыль и уехал на море.',
  },
  {
    id: 'hat-bandana',
    kind: 'hat',
    name: 'Бандана',
    rarity: 'common',
    desc: 'Пиратский стайл: взял на IPO и удержал.',
  },
  {
    id: 'hat-cylinder',
    kind: 'hat',
    name: 'Цилиндр',
    rarity: 'rare',
    desc: 'Цилиндр магната. Дивиденды — в кармашке.',
  },
  {
    id: 'hat-headphones',
    kind: 'hat',
    name: 'Наушники',
    rarity: 'rare',
    desc: 'Слушает ленту новостей прямо на дне океана.',
  },
  {
    id: 'hat-hardhat',
    kind: 'hat',
    name: 'Каска',
    rarity: 'rare',
    desc: 'Строит портфель на десятилетия. Осторожно, стройка.',
  },
  {
    id: 'hat-crown',
    kind: 'hat',
    name: 'Корона',
    rarity: 'epic',
    desc: 'Королева консолидации. Рынок — её владения.',
  },
  {
    id: 'hat-wizard',
    kind: 'hat',
    name: 'Шляпа мага',
    rarity: 'epic',
    desc: 'Видит рынок на три свечи вперёд. Больше — нельзя.',
  },
  {
    id: 'hat-bull',
    kind: 'hat',
    name: 'Бычьи рога',
    rarity: 'legend',
    desc: 'Рогами поднимает индекс. Настоящий бык.',
  },
]

/* ── АКСЕССУАРЫ (фиксированные позиции) ── */

export const ACCS: CosmeticItem[] = [
  {
    id: 'acc-bow',
    kind: 'acc',
    name: 'Бабочка',
    rarity: 'common',
    desc: 'Дресс-код для собрания акционеров.',
  },
  {
    id: 'acc-glasses',
    kind: 'acc',
    name: 'Очки',
    rarity: 'common',
    desc: 'Плюс два к чтению квартальной отчётности.',
  },
  {
    id: 'acc-monocle',
    kind: 'acc',
    name: 'Монокль',
    rarity: 'rare',
    desc: 'Видит скрытые обязательства сквозь отчётность.',
  },
  {
    id: 'acc-tie',
    kind: 'acc',
    name: 'Галстук',
    rarity: 'rare',
    desc: 'Полосатый, как свечной график в понедельник.',
  },
  {
    id: 'acc-briefcase',
    kind: 'acc',
    name: 'Портфель',
    rarity: 'epic',
    desc: 'Весь портфель — с собой. Не потеряй диверсификацию.',
  },
  {
    id: 'acc-laser',
    kind: 'acc',
    name: 'Лазерные очки',
    rarity: 'legend',
    desc: 'Прожигают экран котировок до самого тренда.',
  },
]

export const COSMETICS: CosmeticItem[] = [...SKINS, ...HATS, ...ACCS]

export const COSMETICS_BY_ID: Record<string, CosmeticItem> = Object.fromEntries(
  COSMETICS.map((item) => [item.id, item]),
)
