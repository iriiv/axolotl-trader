/* ═══════════════════════════════════════════════════════════════
   <Axolotl/> — пиксель-маскот (SVG из матриц axolotl-data)
   • mood: idle | cheer | sad | wow | read | blink
   • idle: бобинг + авто-моргание + покачивание жабр (2 кадра)
   • cheer: прыжок + искры;  sad: жабры опущены + слёзы
   Размер задаётся пропом size (ширина в px, высота = size × 22/26).
   Кастомизация (аддитивно, см. cosmetics/sprites.ts):
   • skin — палитровый ремап легенды (голограмма — 3 кадра перелива)
   • hat  — матрица шляпы поверх темечка (viewBox растёт вверх на lift)
   • acc  — аксессуар (бабочка/очки/монокль/галстук/портфель/лазер)
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AXO_MOODS,
  AXO_GILLS_A,
  AXO_GILLS_B,
  AXO_LEGEND,
  AXO_COIN,
  COIN_LEGEND,
} from './axolotl-data'
import type { AxolotlMood } from './axolotl-data'
import {
  ACC_FRAMES,
  ACC_LEGENDS,
  ACC_LAYOUT,
  ACC_SPRITES,
  HAT_LEGENDS,
  HAT_LAYOUT,
  HAT_SPRITES,
  SKIN_HOLO_FRAMES,
  SKIN_PALETTE,
  resolveSkinLegend,
  skinHoloLegends,
} from './cosmetics/sprites'

/* реестры косметики — удобный реэкспорт для фронтендера */
export { SKIN_PALETTE, HAT_SPRITES, ACC_SPRITES } from './cosmetics/sprites'

export type { AxolotlMood }

export interface AxolotlProps {
  mood?: AxolotlMood
  /** ширина в px (высота масштабируется 22/26 + lift шляпы) */
  size?: number
  animated?: boolean
  flip?: boolean
  /** id скина из каталога (например 'skin-gold'); контур не трогается */
  skin?: string
  /** id шляпы из каталога (например 'hat-crown') */
  hat?: string
  /** id аксессуара из каталога (например 'acc-laser') */
  acc?: string
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

interface LayerProps {
  rows: string[]
  legend: Record<string, string>
  className?: string
}

interface WornSprite {
  rows: string[]
  legend: Record<string, string>
  x: number
  y: number
  lift?: number
  frames?: Record<string, string>[]
}

/** Разрешает надетое: skin → легенда, hat/acc → матрица+посадка */
function resolveWorn(hat: string | undefined, acc: string | undefined) {
  const hatDef: WornSprite | null =
    hat && HAT_SPRITES[hat]
      ? { rows: HAT_SPRITES[hat], legend: HAT_LEGENDS[hat], ...HAT_LAYOUT[hat] }
      : null
  const accDef: WornSprite | null =
    acc && ACC_SPRITES[acc]
      ? {
          rows: ACC_SPRITES[acc],
          legend: ACC_LEGENDS[acc],
          ...ACC_LAYOUT[acc],
          frames: ACC_FRAMES[acc],
        }
      : null
  return { hatDef, accDef }
}

/** Рисует матрицу строк как набор <rect 1×1> */
function PixelLayer({ rows, legend, className }: LayerProps) {
  const rects: React.ReactNode[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = legend[row[x]]
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />)
    }
  })
  return <g className={className}>{rects}</g>
}

/** Искра-крестик для cheer (5 пикселей) */
function Spark({ x, y, delay, tone }: { x: number; y: number; delay: string; tone: string }) {
  const px: Array<[number, number]> = [
    [x, y - 1],
    [x - 1, y],
    [x, y],
    [x + 1, y],
    [x, y + 1],
  ]
  return (
    <g className={`axo-spark axo-spark--${tone}`} style={{ animationDelay: delay }}>
      {px.map(([sx, sy], i) => (
        <rect key={i} x={sx} y={sy} width={1} height={1} />
      ))}
    </g>
  )
}

export function Axolotl({
  mood = 'idle',
  size = 120,
  animated = true,
  flip = false,
  skin,
  hat,
  acc,
  className,
  style,
  onClick,
}: AxolotlProps) {
  // авто-моргание в idle: раз в ~3.4с на 150мс подставляем кадр blink
  const [blinking, setBlinking] = useState(false)
  useEffect(() => {
    if (!animated || mood !== 'idle') {
      setBlinking(false)
      return
    }
    const iv = window.setInterval(() => {
      setBlinking(true)
      window.setTimeout(() => setBlinking(false), 150)
    }, 3400)
    return () => window.clearInterval(iv)
  }, [mood, animated])

  const frame = blinking ? AXO_MOODS.blink : AXO_MOODS[mood]

  /* кастомизация: легенда скина (голограмма — 3 кадра) + шляпа/аксессуар */
  const hasSkin = !!(skin && (skin in SKIN_PALETTE || skin in SKIN_HOLO_FRAMES))
  const legend = hasSkin ? resolveSkinLegend(skin) : AXO_LEGEND
  const holoLegends = hasSkin ? skinHoloLegends(skin) : null
  const { hatDef, accDef } = resolveWorn(hat, acc)
  const lift = hatDef?.lift ?? 0

  return (
    <div
      className={[
        'axo',
        `axo--${mood}`,
        animated ? 'axo--anim' : '',
        flip ? 'axo--flip' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: Math.round((size * (22 + lift)) / 26), ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Аксолотль: ${mood}` : undefined}
    >
      <div className="axo-bob">
        <div className="axo-act">
          <svg
            viewBox={`0 ${-lift} 26 ${22 + lift}`}
            width="100%"
            height="100%"
            shapeRendering="crispEdges"
          >
            {/* жабры — позади тела, 2 кадра колыхания (скин ремапит и их) */}
            {holoLegends ? (
              <>
                <g className="axo-gills axo-gills--l">
                  {holoLegends.map((lg, i) => (
                    <PixelLayer
                      key={i}
                      rows={AXO_GILLS_A}
                      legend={lg}
                      className={`axo-holo-f${i}`}
                    />
                  ))}
                </g>
                <g className="axo-gills axo-gills--r">
                  {holoLegends.map((lg, i) => (
                    <PixelLayer
                      key={i}
                      rows={AXO_GILLS_A}
                      legend={lg}
                      className={`axo-holo-f${i}`}
                    />
                  ))}
                </g>
              </>
            ) : (
              <>
                <g className="axo-gills axo-gills--l">
                  <PixelLayer rows={AXO_GILLS_A} legend={legend} />
                  <PixelLayer rows={AXO_GILLS_B} legend={legend} className="axo-gill-b" />
                </g>
                <g className="axo-gills axo-gills--r">
                  <PixelLayer rows={AXO_GILLS_A} legend={legend} />
                  <PixelLayer rows={AXO_GILLS_B} legend={legend} className="axo-gill-b" />
                </g>
              </>
            )}

            {/* тело + лицо (настроение); голограмма — 3 слоя-кадра */}
            {holoLegends ? (
              holoLegends.map((lg, i) => (
                <PixelLayer key={i} rows={frame} legend={lg} className={`axo-holo-f${i}`} />
              ))
            ) : (
              <PixelLayer rows={frame} legend={legend} className="axo-body" />
            )}

            {/* шляпа: поверх темечка, 1 юнит = 1 пиксель сетки */}
            {hatDef && (
              <g className="axo-hat" transform={`translate(${hatDef.x} ${hatDef.y})`}>
                <PixelLayer rows={hatDef.rows} legend={hatDef.legend} />
              </g>
            )}

            {/* аксессуар: очки/монокль/лазер — на глаза, бабочка/галстук —
                ниже рта, портфель — у лапки; лазер мерцает 2 кадрами */}
            {accDef && (
              <g
                className={`axo-acc${accDef.frames ? ' axo-acc--laser' : ''}`}
                transform={`translate(${accDef.x} ${accDef.y})`}
              >
                {accDef.frames
                  ? accDef.frames.map((lg, i) => (
                      <PixelLayer
                        key={i}
                        rows={accDef.rows}
                        legend={lg}
                        className={i === 0 ? 'acc-laser-a' : 'acc-laser-b'}
                      />
                    ))
                  : <PixelLayer rows={accDef.rows} legend={accDef.legend} />}
              </g>
            )}

            {/* слёзы (sad) */}
            {mood === 'sad' && (
              <g className="axo-tears">
                <rect className="axo-tear" x={8} y={8} width={1} height={1} />
                <rect className="axo-tear axo-tear--2" x={17} y={8} width={1} height={1} />
              </g>
            )}

            {/* искры (cheer) */}
            {mood === 'cheer' && animated && (
              <g className="axo-sparks">
                <Spark x={3} y={1} delay="0s" tone="gold" />
                <Spark x={23} y={3} delay="0.22s" tone="ink" />
                <Spark x={1} y={7} delay="0.44s" tone="aqua" />
                <Spark x={25} y={9} delay="0.1s" tone="gold" />
                <Spark x={5} y={13} delay="0.33s" tone="ink" />
                <Spark x={21} y={14} delay="0.5s" tone="aqua" />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}

/** Маленькая пиксель-монета «₽» — для очков */
export function AxolotlCoin({
  size = 24,
  className,
  style,
}: {
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      className={`axo-coin ${className ?? ''}`}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <PixelLayer rows={AXO_COIN} legend={COIN_LEGEND} />
    </svg>
  )
}
