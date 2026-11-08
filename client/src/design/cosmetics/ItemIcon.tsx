/* ═══════════════════════════════════════════════════════════════
   <ItemIcon/> — пиксель-иконка предмета для карточек и дропа.
   • скин  → мини-морда аксолотля в цветах скина (голограмма — 1-й кадр)
   • шляпа / аксессуар → сама матрица 1:1
   silhouette=true — все пиксели одним тусклым цветом (не куплено).
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react'
import { AXO_IDLE } from '../axolotl-data'
import type { CosmeticItem } from './catalog'
import {
  ACC_LEGENDS,
  ACC_SPRITES,
  HAT_LEGENDS,
  HAT_SPRITES,
  resolveSkinLegend,
} from './sprites'
import './cosmetics.css'

export interface ItemIconProps {
  item: CosmeticItem
  /** максимальная сторона иконки в px */
  size?: number
  /** силуэт (недоступно/не куплено) */
  silhouette?: boolean
  className?: string
  style?: CSSProperties
}

/** Рисует матрицу строк как набор <rect 1×1> (как PixelLayer в axolotl.tsx) */
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

/** Морда аксолотля (голова + жабры, строки 0..12) для свотча скина */
const SKIN_FACE_ROWS = AXO_IDLE.slice(0, 13)
const SKIN_FACE_VIEW = { x: 2, y: 0, w: 22, h: 13 }

export function ItemIcon({ item, size = 44, silhouette = false, className, style }: ItemIconProps) {
  const sil = silhouette ? ' cos-sil' : ''

  if (item.kind === 'skin') {
    const legend = resolveSkinLegend(item.id)
    const h = Math.round((size * SKIN_FACE_VIEW.h) / SKIN_FACE_VIEW.w)
    return (
      <svg
        className={`cos-ico${sil}${className ? ` ${className}` : ''}`}
        style={style}
        width={size}
        height={h}
        viewBox={`${SKIN_FACE_VIEW.x} ${SKIN_FACE_VIEW.y} ${SKIN_FACE_VIEW.w} ${SKIN_FACE_VIEW.h}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={item.name}
        focusable="false"
      >
        <PixelRows rows={SKIN_FACE_ROWS} legend={legend} />
      </svg>
    )
  }

  const rows = item.kind === 'hat' ? HAT_SPRITES[item.id] : ACC_SPRITES[item.id]
  const legends = item.kind === 'hat' ? HAT_LEGENDS : ACC_LEGENDS
  if (!rows || !legends[item.id]) return null
  const w = rows[0].length
  const h = rows.length
  const scale = size / Math.max(w, h)
  return (
    <svg
      className={`cos-ico${sil}${className ? ` ${className}` : ''}`}
      style={style}
      width={Math.max(1, Math.round(w * scale))}
      height={Math.max(1, Math.round(h * scale))}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={item.name}
      focusable="false"
    >
      <PixelRows rows={rows} legend={legends[item.id]} />
    </svg>
  )
}
