/* WardrobeScreen — секция гардероба хаба (виток v1.2): обёртка над
   <Wardrobe/> дизайн-системы. Состояние (монеты/инвентарь/экипировка)
   — в App, секция управляет табом и зовёт колбэки. Тап по надетому
   предмету — снять (кроме скина), продажа носимого отсутствует.
   Карточка «Магазин сундуков» (жемчужный/золотой) сохранена и как
   быстрый вход, и для совместимости e2e; полный магазин — секция
   «Магазин» с деревянным сундуком. */

import { useState } from 'react'
import { AxolotlCoin } from '../design/axolotl'
import { Badge, PixelButton, PixelCard } from '../design/ui'
import { IconChest } from '../design/icons'
import { Wardrobe } from '../design/cosmetics'
import type { WardrobeTab } from '../design/cosmetics'
import type { CosmeticKind } from '../design/cosmetics/catalog'
import { CHEST_PRICES } from '../game/economy'
import type { EquipState } from '../game/storage'

export interface WardrobeScreenProps {
  coins: number
  ownedIds: string[]
  equip: EquipState
  /** всего предметов в каталоге (счётчик N/total) */
  itemsTotal: number
  /** экипировка из каталога (kind + id; null — снять слот) */
  onEquip: (kind: CosmeticKind, id: string | null) => void
  /** назад на главную секцию хаба */
  onBack: () => void
  /** покупка сундука за монеты (проверку баланса делает App) */
  onBuyChest: (chest: 'pearl' | 'gold') => void
}

export function WardrobeScreen({
  coins,
  ownedIds,
  equip,
  itemsTotal,
  onEquip,
  onBack,
  onBuyChest,
}: WardrobeScreenProps) {
  const [tab, setTab] = useState<WardrobeTab>('skins')

  return (
    <div className="ward-section" data-testid="wardrobe-screen">
      <div className="ward-head">
        <div data-testid="btn-wardrobe-back">
          <PixelButton variant="ghost" size="md" onClick={onBack}>
            В меню
          </PixelButton>
        </div>
        <h2 className="display ward-title">Гардероб</h2>
        <span className="ward-coins" data-testid="wardrobe-coins">
          <AxolotlCoin size={20} />
          {coins.toLocaleString('ru-RU')}
        </span>
      </div>

      <div className="ward-sub">
        <Badge color="aqua">
          Предметы: {ownedIds.length}/{itemsTotal}
        </Badge>
      </div>

      <Wardrobe
        skin={equip.skin}
        hat={equip.hat ?? undefined}
        acc={equip.acc ?? undefined}
        ownedIds={ownedIds}
        tab={tab}
        onTab={setTab}
        onEquip={onEquip}
        previewSize={128}
      />

      <PixelCard title="Магазин сундуков" accent="gold">
        <div className="ward-shop">
          <div data-testid="btn-wardrobe-buy-pearl">
            <PixelButton
              variant="gold"
              size="lg"
              icon={<IconChest />}
              disabled={coins < CHEST_PRICES.pearl}
              onClick={() => onBuyChest('pearl')}
            >
              Жемчужный · {CHEST_PRICES.pearl}
            </PixelButton>
          </div>
          <div data-testid="btn-wardrobe-buy-gold">
            <PixelButton
              variant="gold"
              size="lg"
              icon={<IconChest />}
              disabled={coins < CHEST_PRICES.gold}
              onClick={() => onBuyChest('gold')}
            >
              Золотой · {CHEST_PRICES.gold}
            </PixelButton>
          </div>
        </div>
        <p className="ward-hint">
          Дубль превращается в монеты: 20 · 60 · 200 · 500 — по редкости
        </p>
      </PixelCard>
    </div>
  )
}
