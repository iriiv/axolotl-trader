/* ═══════════════════════════════════════════════════════════════
   <DropReveal/> — ревил выпавшего предмета: лучи редкости
   (легенда — вращающиеся/мерцающие), крупная иконка, имя + плашка
   редкости, искры для легенды, плашка «+N» за дубликат.

   <ChestOpen/> — каркас экрана открытия сундука: большой сундук,
   кнопка «ОТКРЫТЬ», после — DropReveal и слоты «ЭКИПИРОВАТЬ» /
   «ЗАБРАТЬ». Вся логика (что выпало, дубликат ли, монеты) — снаружи.
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react'
import { AxolotlCoin } from '../axolotl'
import { PixelButton } from '../ui'
import { IconSpark } from '../icons'
import type { CosmeticItem } from './catalog'
import { RARITY_LABEL, rarityClass } from './rarity'
import type { ChestType } from './chests'
import { ItemIcon } from './ItemIcon'
import { Chest } from './Chest'
import './cosmetics.css'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

/* ═════════════════ DropReveal ═════════════════ */

export interface DropRevealProps {
  item: CosmeticItem
  /** максимальная сторона иконки предмета в px */
  size?: number
  /** компенсация за дубликат (в монетах); undefined — не дубликат */
  duplicateCoins?: number | null
  className?: string
  style?: CSSProperties
}

export function DropReveal({ item, size = 92, duplicateCoins, className, style }: DropRevealProps) {
  const legend = item.rarity === 'legend'
  return (
    <div
      className={cx('cos-drop', rarityClass(item.rarity), legend && 'cos-drop--legend', className)}
      style={style}
    >
      <span className="cos-drop__burst" aria-hidden="true" />
      {legend && (
        <>
          <span className="cos-drop__spark cos-drop__spark--1" aria-hidden="true">
            <IconSpark size={18} />
          </span>
          <span className="cos-drop__spark cos-drop__spark--2" aria-hidden="true">
            <IconSpark size={13} />
          </span>
          <span className="cos-drop__spark cos-drop__spark--3" aria-hidden="true">
            <IconSpark size={15} />
          </span>
          <span className="cos-drop__spark cos-drop__spark--4" aria-hidden="true">
            <IconSpark size={12} />
          </span>
        </>
      )}
      <span className="cos-drop__item u-pop-in">
        <ItemIcon item={item} size={size} />
      </span>
      <span className="cos-drop__name">{item.name}</span>
      <span className="cos-drop__plate">{RARITY_LABEL[item.rarity]}</span>
      {duplicateCoins != null && (
        <span className="cos-drop__dup" title="Компенсация за дубликат">
          <AxolotlCoin size={16} />
          +{duplicateCoins.toLocaleString('ru-RU')}
        </span>
      )}
    </div>
  )
}

/* ═════════════════ ChestOpen ═════════════════ */

export interface ChestOpenProps {
  chest?: ChestType
  /** выпавший предмет (показывается после opened) */
  item?: CosmeticItem | null
  /** false → ждём «ОТКРЫТЬ»; true → анимация + ревил */
  opened?: boolean
  /** компенсация за дубликат — число приходит снаружи */
  duplicateCoins?: number | null
  onOpen?: () => void
  onEquip?: () => void
  onTake?: () => void
  /** ширина сундука в px */
  size?: number
  className?: string
  style?: CSSProperties
}

export function ChestOpen({
  chest = 'wooden',
  item,
  opened = false,
  duplicateCoins,
  onOpen,
  onEquip,
  onTake,
  size = 160,
  className,
  style,
}: ChestOpenProps) {
  return (
    <div className={cx('cso', className)} style={style}>
      <div className="cso__chest">
        <Chest type={chest} open={opened} animated size={size} onClick={!opened ? onOpen : undefined} />
      </div>

      {!opened && (
        <PixelButton variant="gold" size="xl" full onClick={onOpen}>
          Открыть
        </PixelButton>
      )}

      {opened && item && (
        <>
          <DropReveal item={item} duplicateCoins={duplicateCoins} />
          <div className="cso__actions">
            <PixelButton variant="primary" size="lg" onClick={onEquip}>
              Экипировать
            </PixelButton>
            <PixelButton variant="ghost" size="lg" onClick={onTake}>
              Забрать
            </PixelButton>
          </div>
        </>
      )}
    </div>
  )
}
