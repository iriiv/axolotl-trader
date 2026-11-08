import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/tokens.css'
import './design/axolotl.css'
import './design/ui.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* PWA: service worker для офлайна — только в проде (в dev он мешает HMR).
   Регистрация относительная ('./sw.js' рядом с index.html, scope './') —
   работает и на GH Pages в подпапке. Ошибки не критичны: игра остаётся онлайн. */
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
          /* нет SW (например, file://) — офлайн-режим просто недоступен */
        })
      }
    } catch {
      /* некоторые WebView запрещают сам API — молча пропускаем */
    }
  })
}
