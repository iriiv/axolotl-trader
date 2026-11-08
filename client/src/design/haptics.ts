/* ═══════════════════════════════════════════════════════════════
   Хаптика — обёртки над navigator.vibrate с guard'ами.
   Работает только в WebView/браузерах с поддержкой, молча иначе.
   API: haptic.tap() .success() .error()
   ═══════════════════════════════════════════════════════════════ */

function vibe(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    /* вибрация не критична */
  }
}

export const haptic = {
  /** лёгкий отклик на тап */
  tap() {
    vibe(12)
  },
  /** успех: два коротких */
  success() {
    vibe([18, 40, 24])
  },
  /** ошибка: грубый двойной */
  error() {
    vibe([42, 54, 42])
  },
  /** эпический дроп: тройной нарастающий */
  epic() {
    vibe([16, 40, 16, 40, 30])
  },
  /** легендарный дроп: длинный фанфарный узор */
  legend() {
    vibe([24, 50, 24, 50, 24, 50, 64])
  },
}
