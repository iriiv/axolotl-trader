/* ═══════════════════════════════════════════════════════════════
    <DropReveal rarity="epic"/> — ревил выпавшего предмета с шоу
    ПО РЕДКОСТИ (виток «Хаб v1.2», лутбокс уровня AAA, но пиксельно):
      common — предмет выныривает по дуге, статичные лучи + puff-пыль
      rare   — аква-вспышка на сундуке, предмет взлетает с трейлом,
               лучи медленно вращаются, лёгкий глитч-масштаб
      epic   — розовая вспышка на весь экран, тряска, кольцевая волна,
               3 искры орбитируют, виньетка розовеет
      legend — slow-mo, «божественные» лучи, рамка-перелив,
               пиксель-фейерверк, каскад букв «ЛЕГЕНДАРНЫЙ»
    CSS-оркестрация — в cosmetics.css (классы dr--{rarity}).

    <ChestOpen/> — каркас экрана открытия: сундук + «ОТКРЫТЬ»,
    после открытия — DropReveal и слоты «ЭКИПИРОВАТЬ»/«ЗАБРАТЬ»
    (появляются после полного ревила, --dr-ms по редкости).
    Вся логика (что выпало, дубликат ли, монеты) — снаружи.
    ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react'
import { AxolotlCoin } from '../axolotl'
import { PixelButton } from '../ui'
import { IconSpark } from '../icons'
import type { CosmeticItem, Rarity } from './catalog'
import { RARITY_LABEL, rarityClass } from './rarity'
import type { ChestType } from './chests'
import { ItemIcon } from './ItemIcon'
import { Chest } from './Chest'
import './cosmetics.css'

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

/** редкости дропа (стартер из сундуков не выпадает) */
type DropRarity = Exclude<Rarity, 'starter'>

/** длительности шоу-ревила по редкости: игрок наслаждается */
export const REVEAL_MS: Record<DropRarity, number> = {
  common: 1200,
  rare: 1600,
  epic: 2000,
  legend: 2800,
}

/* координаты пиксель-фейерверка легенды: 14 частиц по всему экрану */
const FIREWORKS: Array<{ x: string; y: string; dx: string; dy: string; d: string }> = [
  { x: '12%', y: '22%', dx: '-46px', dy: '-52px', d: '0.85s' },
  { x: '24%', y: '14%', dx: '28px', dy: '-64px', d: '0.95s' },
  { x: '38%', y: '9%', dx: '-18px', dy: '-70px', d: '1.05s' },
  { x: '55%', y: '12%', dx: '44px', dy: '-58px', d: '0.9s' },
  { x: '70%', y: '18%', dx: '-30px', dy: '-62px', d: '1s' },
  { x: '85%', y: '24%', dx: '38px', dy: '-44px', d: '1.1s' },
  { x: '8%', y: '44%', dx: '-52px', dy: '10px', d: '0.95s' },
  { x: '91%', y: '40%', dx: '48px', dy: '16px', d: '1.05s' },
  { x: '17%', y: '66%', dx: '-40px', dy: '44px', d: '1s' },
  { x: '33%', y: '76%', dx: '22px', dy: '56px', d: '0.9s' },
  { x: '52%', y: '82%', dx: '-12px', dy: '60px', d: '1.15s' },
  { x: '68%', y: '78%', dx: '34px', dy: '50px', d: '1s' },
  { x: '83%', y: '68%', dx: '46px', dy: '34px', d: '0.95s' },
  { x: '46%', y: '20%', dx: '-2px', dy: '-76px', d: '1.2s' },
]

/* ═════════════════ DropReveal ═════════════════ */

export interface DropRevealProps {
  item: CosmeticItem
  /** максимальная сторона иконки предмета в px */
  size?: number
  /** редкость шоу (по умолчанию — редкость предмета) */
  rarity?: DropRarity
  /** компенсация за дубликат (в монетах); undefined — не дубликат */
  duplicateCoins?: number | null
  className?: string
  style?: CSSProperties
}

export function DropReveal({
  item,
  size = 92,
  rarity,
  duplicateCoins,
  className,
  style,
}: DropRevealProps) {
  const rar: DropRarity = rarity ?? (item.rarity as DropRarity)
  const legend = rar === 'legend'
  return (
    <div
      className={cx(
        'cos-drop',
        rarityClass(rar),
        `dr--${rar}`,
        legend && 'cos-drop--legend',
        className,
      )}
      style={style}
    >
      {/* вспышка на весь экран: epic — розовая, legend — золотая */}
      {(rar === 'epic' || rar === 'legend') && (
        <span className={`dr-flash dr-flash--${rar}`} aria-hidden="true" />
      )}
      {/* розовая виньетка эпика по краям экрана (жёсткие ступени) */}
      {rar === 'epic' && <span className="dr-vignette" aria-hidden="true" />}

      {/* лучи редкости за предметом */}
      <span className="cos-drop__burst" aria-hidden="true" />

      {/* common: пыль-пафф от приземления */}
      {rar === 'common' && (
        <>
          <span className="dr-puff dr-puff--1" aria-hidden="true" />
          <span className="dr-puff dr-puff--2" aria-hidden="true" />
          <span className="dr-puff dr-puff--3" aria-hidden="true" />
          <span className="dr-puff dr-puff--4" aria-hidden="true" />
        </>
      )}

      {/* rare: трейл из пиксель-квадратов при взлёте */}
      {rar === 'rare' && (
        <>
          <span className="dr-trail dr-trail--1" aria-hidden="true" />
          <span className="dr-trail dr-trail--2" aria-hidden="true" />
          <span className="dr-trail dr-trail--3" aria-hidden="true" />
          <span className="dr-trail dr-trail--4" aria-hidden="true" />
          <span className="dr-trail dr-trail--5" aria-hidden="true" />
        </>
      )}

      {/* epic: кольцевая волна + 3 искры по ромбовидной орбите */}
      {rar === 'epic' && (
        <>
          <span className="dr-ring" aria-hidden="true" />
          <span className="dr-ring dr-ring--2" aria-hidden="true" />
          <span className="dr-orbit dr-orbit--1" aria-hidden="true">
            <IconSpark size={10} />
          </span>
          <span className="dr-orbit dr-orbit--2" aria-hidden="true">
            <IconSpark size={10} />
          </span>
          <span className="dr-orbit dr-orbit--3" aria-hidden="true">
            <IconSpark size={10} />
          </span>
        </>
      )}

      {/* legend: божественные лучи + мерцающая рамка + фейерверк */}
      {legend && (
        <>
          <span className="dr-god" aria-hidden="true" />
          <span className="dr-frame" aria-hidden="true" />
          {FIREWORKS.map((f, i) => (
            <span
              key={i}
              className="dr-fw"
              style={
                {
                  left: f.x,
                  top: f.y,
                  '--dx': f.dx,
                  '--dy': f.dy,
                  '--d': f.d,
                } as CSSProperties
              }
              aria-hidden="true"
            />
          ))}
        </>
      )}

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
      <span className="cos-drop__item">
        <ItemIcon item={item} size={size} />
      </span>
      <span className="cos-drop__name">{item.name}</span>
      {legend ? (
        /* каскад букв «ЛЕГЕНДАРНЫЙ» + пиксель-звёзды вместо глифов ✦ */
        <span className="cos-drop__plate cos-drop__plate--legend">
          <span className="dr-cas" style={{ animationDelay: '0ms' }}>
            <IconSpark size={10} />
          </span>
          {'ЛЕГЕНДАРНЫЙ'.split('').map((ch, i) => (
            <span key={i} className="dr-cas" style={{ animationDelay: `${120 + i * 55}ms` }}>
              {ch}
            </span>
          ))}
          <span className="dr-cas" style={{ animationDelay: `${120 + 11 * 55}ms` }}>
            <IconSpark size={10} />
          </span>
        </span>
      ) : (
        <span className="cos-drop__plate">{RARITY_LABEL[rar]}</span>
      )}
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
  const rar: DropRarity | null =
    opened && item ? ((item.rarity as DropRarity) ?? null) : null
  return (
    <div
      className={cx('cso', rar && `cso--${rar}`, className)}
      style={{ ...style, ...(rar ? ({ '--dr-ms': `${REVEAL_MS[rar]}ms` } as CSSProperties) : null) }}
    >
      <div className="cso__chest">
        <Chest
          type={chest}
          open={opened}
          animated
          size={size}
          lidFly={rar === 'legend'}
          onClick={!opened ? onOpen : undefined}
        />
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
