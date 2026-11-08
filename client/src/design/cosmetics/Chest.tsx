/* ═══════════════════════════════════════════════════════════════
   <Chest/> — пиксель-сундук (основа + откидная крышка).
   • закрытый: плавно «дышит» (scale pulse)
   • open: тряска → крышка откидывается (framer-motion rotate) →
     светящаяся внутренность + веер лучей (+искры у золотого)
   Компонент чистый: вся «экономика» — снаружи.
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react'
import {
  CHESTS,
  CHEST_BASE,
  CHEST_INSIDE,
  CHEST_LID,
  CHEST_LEGENDS,
  CHEST_RAYS,
  CHEST_VIEW,
} from './chests'
import type { ChestType } from './chests'
import './cosmetics.css'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

export interface ChestProps {
  type?: ChestType
  /** false → закрыт; true → открыт (с анимацией открытия при смене) */
  open?: boolean
  /** выключает дыхание/пульсацию */
  animated?: boolean
  /** ширина в px (высота = size × 24/22) */
  size?: number
  onClick?: () => void
  className?: string
  style?: CSSProperties
}

/** Рисует матрицу строк как набор <rect 1×1> */
function PixelRows({ rows, legend }: { rows: string[]; legend: Record<string, string> }) {
  const rects: React.ReactNode[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = legend[row[x]]
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />)
    }
  })
  return <>{rects}</>
}

/** Искра-крестик (5 пикселей), как у маскота */
function Spark({ x, y, delay }: { x: number; y: number; delay: string }) {
  const px: Array<[number, number]> = [
    [x, y - 1],
    [x - 1, y],
    [x, y],
    [x + 1, y],
    [x, y + 1],
  ]
  return (
    <g className="chest-spark" style={{ animationDelay: delay }}>
      {px.map(([sx, sy], i) => (
        <rect key={i} x={sx} y={sy} width={1} height={1} />
      ))}
    </g>
  )
}

export function Chest({
  type = 'wooden',
  open = false,
  animated = true,
  size = 120,
  onClick,
  className,
  style,
}: ChestProps) {
  const legend = CHEST_LEGENDS[type]
  const info = CHESTS[type]
  const cls = [
    'chest',
    open ? 'chest--open' : 'chest--closed',
    !open && animated ? 'chest--breathe' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      style={{ width: size, height: Math.round((size * CHEST_VIEW.height) / CHEST_VIEW.width), ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `${info.name}${open ? ' (открыт)' : ''}` : undefined}
    >
      <svg
        className="chest__svg"
        viewBox={`${0} ${CHEST_VIEW.top} ${CHEST_VIEW.width} ${CHEST_VIEW.height}`}
        width="100%"
        height="100%"
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
      >
        {/* тряска при открытии + откидная крышка — CSS-пружины
            (transform на svg <g>, как у жабр аксолотля) */}
        <g className={cx('chest__inner', open && 'chest__inner--shake')}>
          {/* крышка: hinge по нижней кромке, при open откидывается назад */}
          <g transform={`translate(${CHEST_VIEW.lid.x} ${CHEST_VIEW.lid.y})`}>
            <g className={cx('chest__lid', open && 'chest__lid--open')}>
              <PixelRows rows={CHEST_LID} legend={legend} />
            </g>
          </g>

          {/* основание */}
          <g transform={`translate(${CHEST_VIEW.base.x} ${CHEST_VIEW.base.y})`}>
            <PixelRows rows={CHEST_BASE} legend={legend} />
          </g>

          {/* светящаяся внутренность + лучи (только открытый) */}
          {open && (
            <>
              <g
                transform={`translate(${CHEST_VIEW.inside.x} ${CHEST_VIEW.inside.y})`}
                className="chest__inside u-pop-in"
                style={{ animationDelay: '0.55s' }}
              >
                <PixelRows rows={CHEST_INSIDE} legend={legend} />
              </g>
              <g
                transform={`translate(${CHEST_VIEW.rays.x} ${CHEST_VIEW.rays.y})`}
                className="chest__rays u-pop-in"
                style={{ animationDelay: '0.6s' }}
              >
                <PixelRows rows={CHEST_RAYS} legend={legend} />
              </g>
              {type === 'gold' && (
                <>
                  <Spark x={4} y={-4} delay="0.1s" />
                  <Spark x={18} y={-3} delay="0.55s" />
                  <Spark x={11} y={-7} delay="0.95s" />
                </>
              )}
            </>
          )}
        </g>
      </svg>
    </div>
  )
}
