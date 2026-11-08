/* ═══════════════════════════════════════════════════════════════
   <Wardrobe/> — презентационный каркас гардероба:
   превью большого аксолотля (skin/hat/acc — props), табы
   «Скины|Шляпы|Аксессуары», сетка <ItemCard/>.
   Состояние (что надето/куплено/выбрано) живёт снаружи — только
   пропсы и колбэки: onEquip(kind, id | null), onTab(tab).

   <ItemCard/> — карточка предмета: пиксель-иконка, имя, рамка и
   плашка цвета редкости; epic/legend — лучи за иконкой, legend —
   искры; locked = силуэт + замок; equipped — пиксель-галка.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Axolotl } from '../axolotl'
import { Badge, PixelButton } from '../ui'
import { IconLock, IconSpark } from '../icons'
import { sfx } from '../sfx'
import { haptic } from '../haptics'
import { ACCS, COSMETICS_BY_ID, HATS, SKINS } from './catalog'
import type { CosmeticItem, CosmeticKind } from './catalog'
import { RARITY_LABEL, rarityClass } from './rarity'
import { ItemIcon } from './ItemIcon'
import './cosmetics.css'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

/* ── пиксель-галка (экипировано) ── */
function PixelCheck() {
  const rows = ['.....##', '....##.', '...##..', '..##...', '###....']
  return (
    <svg width="12" height="10" viewBox="0 0 7 6" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {rows.map((row, y) =>
        row.split('').map((ch, x) =>
          ch === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null,
        ),
      )}
    </svg>
  )
}

/* ═════════════════ ItemCard ═════════════════ */

export interface ItemCardProps {
  item: CosmeticItem
  /** предмет куплен/доступен (default true); false → силуэт + замок */
  owned?: boolean
  /** надето прямо сейчас */
  equipped?: boolean
  onEquip?: () => void
  className?: string
}

export function ItemCard({ item, owned = true, equipped = false, onEquip, className }: ItemCardProps) {
  const locked = !owned
  const glow = item.rarity === 'epic' || item.rarity === 'legend'
  return (
    <button
      type="button"
      className={cx(
        'cos-card',
        rarityClass(item.rarity),
        locked && 'cos-card--locked',
        equipped && 'cos-card--equipped',
        className,
      )}
      onClick={() => {
        if (locked) return
        sfx.tap()
        haptic.tap()
        onEquip?.()
      }}
      aria-pressed={equipped}
      aria-label={`${item.name} — ${RARITY_LABEL[item.rarity]}${locked ? ' (закрыто)' : ''}${equipped ? ' (надето)' : ''}`}
      title={item.desc}
    >
      {glow && <span className="cos-card__burst" aria-hidden="true" />}
      <span className="cos-card__ico">
        <ItemIcon item={item} size={46} silhouette={locked} />
        {locked && (
          <span className="cos-card__lock" aria-hidden="true">
            <IconLock size={18} />
          </span>
        )}
      </span>
      <span className="cos-card__name">{item.name}</span>
      <span className="cos-card__rar">{RARITY_LABEL[item.rarity]}</span>
      {equipped && (
        <span className="cos-card__check" aria-hidden="true">
          <PixelCheck />
        </span>
      )}
      {item.rarity === 'legend' && !locked && (
        <>
          <span className="cos-card__spark cos-card__spark--1" aria-hidden="true">
            <IconSpark size={13} />
          </span>
          <span className="cos-card__spark cos-card__spark--2" aria-hidden="true">
            <IconSpark size={10} />
          </span>
        </>
      )}
    </button>
  )
}

/* ═════════════════ Wardrobe ═════════════════ */

export type WardrobeTab = 'skins' | 'hats' | 'accs'

export interface WardrobeProps {
  /** id надетых предметов (из каталога) */
  skin?: string
  hat?: string
  acc?: string
  /** id купленных предметов; undefined = всё куплено */
  ownedIds?: string[]
  /** активный таб (контролируемый; без пропа — внутренний стейт) */
  tab?: WardrobeTab
  onTab?: (tab: WardrobeTab) => void
  /** клик по карточке: id — надеть, null — снять слот */
  onEquip?: (kind: CosmeticKind, id: string | null) => void
  /** ширина превью аксолотля в px */
  previewSize?: number
  className?: string
  style?: CSSProperties
}

const TABS: Array<{ id: WardrobeTab; label: string; kind: CosmeticKind }> = [
  { id: 'skins', label: 'Скины', kind: 'skin' },
  { id: 'hats', label: 'Шляпы', kind: 'hat' },
  { id: 'accs', label: 'Аксессуары', kind: 'acc' },
]

export function Wardrobe({
  skin,
  hat,
  acc,
  ownedIds,
  tab,
  onTab,
  onEquip,
  previewSize = 150,
  className,
  style,
}: WardrobeProps) {
  const [tabFallback, setTabFallback] = useState<WardrobeTab>('skins')
  const activeTab = tab ?? tabFallback
  const switchTab = (t: WardrobeTab) => {
    sfx.tap()
    haptic.tap()
    if (onTab) onTab(t)
    else setTabFallback(t)
  }

  const owned = new Set(ownedIds)
  const isOwned = (id: string) => owned.size === 0 || owned.has(id)

  const items = activeTab === 'skins' ? SKINS : activeTab === 'hats' ? HATS : ACCS
  const activeKind = TABS.find((t) => t.id === activeTab)?.kind ?? 'skin'
  const equippedId = activeKind === 'skin' ? skin : activeKind === 'hat' ? hat : acc
  const equippedItem = equippedId ? COSMETICS_BY_ID[equippedId] : undefined
  const canUnequip = activeKind !== 'skin' && !!equippedItem

  const nameOf = (id?: string, fallback = '—') => (id && COSMETICS_BY_ID[id] ? COSMETICS_BY_ID[id].name : fallback)

  return (
    <div className={cx('wrd', className)} style={style}>
      <div className="wrd__stage">
        <Axolotl skin={skin} hat={hat} acc={acc} size={previewSize} />
        <div className="wrd__chips">
          <Badge color="pink">{nameOf(skin, 'Классика')}</Badge>
          <Badge color="aqua">{nameOf(hat, 'без шляпы')}</Badge>
          <Badge color="gold">{nameOf(acc, 'без аксессуара')}</Badge>
        </div>
      </div>

      <div className="wrd__row">
        <div className="wrd__tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              className={`wrd__tab${activeTab === t.id ? ' is-on' : ''}`}
              onClick={() => switchTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {canUnequip && (
        <PixelButton variant="ghost" size="md" onClick={() => onEquip?.(activeKind, null)}>
          Снять «{equippedItem?.name}»
        </PixelButton>
      )}

      <div className="wrd__grid">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            owned={isOwned(item.id)}
            equipped={item.id === equippedId}
            onEquip={() => onEquip?.(item.kind, item.id)}
          />
        ))}
      </div>
    </div>
  )
}
