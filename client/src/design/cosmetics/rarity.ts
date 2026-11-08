/* ═══════════════════════════════════════════════════════════════
   РЕДКОСТИ КОСМЕТИКИ — типы и подписи.
   Цвета редкостей — только через CSS-классы .rr--* (cosmetics.css):
   starter/common → ink-dim, rare → aqua, epic → --epic (яркий pink),
   legend → gold + анимированные искры/перелив.
   ═══════════════════════════════════════════════════════════════ */

export type Rarity = 'starter' | 'common' | 'rare' | 'epic' | 'legend'

/** Вид косметики (слот экипировки) */
export type CosmeticKind = 'skin' | 'hat' | 'acc'

export const RARITIES: Rarity[] = ['starter', 'common', 'rare', 'epic', 'legend']

export const RARITY_LABEL: Record<Rarity, string> = {
  starter: 'стартовый',
  common: 'обычный',
  rare: 'редкий',
  epic: 'эпический',
  legend: 'легендарный',
}

/** CSS-класс редкости: вешает на элемент --rr (цвет) и --rr-soft (фон) */
export function rarityClass(rarity: Rarity): string {
  return `rr--${rarity}`
}
