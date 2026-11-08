/* ChestScreen — игровой экран открытия сундука: обёртка над
   <ChestOpen/> дизайн-системы. Вся экономика (ролл дропа, инвентарь,
   монеты, pity) — снаружи в App: экран только показывает результат.
   «Экипировать» — надеть выпавшее и выйти, «Забрать» — просто выйти. */

import { useEffect, useRef, useState } from 'react'
import { Badge } from '../design/ui'
import { haptic } from '../design/haptics'
import { sfx } from '../design/sfx'
import { ChestOpen } from '../design/cosmetics'
import { COSMETICS_BY_ID } from '../design/cosmetics/catalog'
import type { CosmeticItem } from '../design/cosmetics/catalog'
import { CHESTS } from '../design/cosmetics/chests'
import type { ChestType } from '../design/cosmetics/chests'
import type { DropResult } from '../game/economy'

export interface ChestScreenProps {
  chest: ChestType
  /** плашка сверху (например «Стрик 7!» за недельный стрик) */
  plate?: string
  /** авто-прогон бесплатного сундука после партии: сам открывается
      и забирает предмет — игрок смотрит, но не обязан тапать */
  autoAdvance?: boolean
  /** ролл дропа + записи в storage/стейт — возвращает результат */
  onRollLoot: () => DropResult
  /** надеть выпавшее (вызывается при «Экипировать») */
  onEquipItem: (item: CosmeticItem) => void
  onDone: () => void
}

const AUTO_OPEN_MS = 1200
const AUTO_TAKE_MS = 4600

export function ChestScreen({
  chest,
  plate,
  autoAdvance = false,
  onRollLoot,
  onEquipItem,
  onDone,
}: ChestScreenProps) {
  const [drop, setDrop] = useState<DropResult | null>(null)
  const rolledRef = useRef(false)
  const doneRef = useRef(false)
  /* свежий колбэк для таймеров, без перевзвода эффектов */
  const rollRef = useRef(onRollLoot)
  rollRef.current = onRollLoot

  const info = CHESTS[chest]
  const item: CosmeticItem | null = drop ? (COSMETICS_BY_ID[drop.itemId] ?? null) : null

  const roll = (): DropResult | null => {
    if (rolledRef.current) return null // защита от двойного ролла
    rolledRef.current = true
    const result = rollRef.current()
    /* шоу по редкости: легенда — фанфары и длинная хаптика,
       эпик — своя тема, обычное — привычный ревил */
    if (result.rarity === 'legend') {
      sfx.legend()
      haptic.legend()
    } else if (result.rarity === 'epic') {
      sfx.epic()
      haptic.epic()
    } else {
      sfx.reveal()
      haptic.success()
    }
    setDrop(result)
    return result
  }

  const finish = (equip: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    if (equip && drop) {
      const dropItem = COSMETICS_BY_ID[drop.itemId]
      if (dropItem) onEquipItem(dropItem)
    }
    onDone()
  }

  /* авто-прогон: открыть без тапа */
  useEffect(() => {
    if (!autoAdvance) return
    const t = window.setTimeout(() => {
      if (!doneRef.current) roll()
    }, AUTO_OPEN_MS)
    return () => window.clearTimeout(t)
  }, [autoAdvance])

  /* авто-прогон: показать дроп и уйти дальше (забрать, не навязывая) */
  useEffect(() => {
    if (!autoAdvance || !drop || doneRef.current) return
    const t = window.setTimeout(() => finish(false), AUTO_TAKE_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvance, drop])

  return (
    <div className="scr scr-chest" data-testid="chest-screen" data-chest={chest}>
      <div className="scr-main chest-main">
        <div className="chest-head">
          <h2 className="display chest-title">{info.name}</h2>
          {plate && (
            <span className="chest-plate">
              <Badge color="gold">
                <span className="golos-glyph">🔥</span> {plate}
              </Badge>
            </span>
          )}
        </div>
        <p className="chest-sub">{info.desc}</p>

        <ChestOpen
          chest={chest}
          opened={drop !== null}
          item={item}
          duplicateCoins={drop?.duplicate ? drop.refundCoins : null}
          onOpen={() => {
            roll()
          }}
          onEquip={() => finish(true)}
          onTake={() => finish(false)}
          size={168}
        />
      </div>
    </div>
  )
}
