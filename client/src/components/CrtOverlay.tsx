/* ═══════════════════════════════════════════════════════════════
   CrtOverlay — тонкий эффект «ЭЛТ-телевизора» поверх игры.
   Слои (fixed, pointer-events:none, z-index 90):
     1) виньетка — radial-gradient к краям, «экран трубки»;
     2) мягкие сканлайны — плавный repeating-gradient + едва
        заметное долгое дыхание яркости (не steps-мерцание);
     3) хроматическая аберрация — два огромных inset box-shadow
        с сине/красным оттенком по краям, центр чистый;
     4) specular-блик «выпуклого стекла» — эллиптический градиент
        белого 6% сверху слева;
     5) warmup — «прогревание» ЭЛТ при старте (только титул):
        яркая строка раскрывается в полный экран за ~450мс.
   Тумблер (localStorage 'ax_crt', default ON): при OFF оверлей
   скрыт целиком — базовые сканлайны дизайн-слоя (#root::after)
   остаются. prefers-reduced-motion — без дыхания и прогревания.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import './crt.css'

export const CRT_STORAGE_KEY = 'ax_crt'

export function readCrtPref(): boolean {
  try {
    return window.localStorage.getItem(CRT_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function writeCrtPref(on: boolean): void {
  try {
    window.localStorage.setItem(CRT_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* нет storage — просто без запоминания */
  }
}

export interface CrtOverlayProps {
  on: boolean
  /** сыграть «прогревание» ЭЛТ (один раз, при старте приложения) */
  warmup?: boolean
}

export function CrtOverlay({ on, warmup = false }: CrtOverlayProps) {
  const reduced = useReducedMotion()
  const [warm, setWarm] = useState(warmup && !reduced)

  useEffect(() => {
    if (!warm) return
    const t = window.setTimeout(() => setWarm(false), 750)
    return () => window.clearTimeout(t)
  }, [warm])

  if (!on) return null

  return (
    <div className="crt" aria-hidden="true">
      <div className="crt__scan" />
      <div className="crt__vignette" />
      <div className="crt__chroma" />
      <div className="crt__glass" />
      {warm && <div className="crt__warm" />}
    </div>
  )
}
