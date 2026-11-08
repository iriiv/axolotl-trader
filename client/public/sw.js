/* ═══════════════════════════════════════════════════════════════
   Service worker «Аксолотль-трейдер» — офлайн-режим PWA.

   Стратегии:
   · навигация (request.mode === 'navigate') — network-first,
     фолбэк cache → './index.html' (свежая версия при первом визите);
   · same-origin (в пределах registration.scope) — cache-first
     с фоновым обновлением (stale-while-revalidate);
   · Google Fonts (googleapis.com CSS + gstatic.com woff2) —
     cache-first, ответы могут быть opaque (no-cors), поэтому
     precache делаем по одному fetch→put с индивидуальным catch,
     а не addAll (любой opaque/редирект роняет addAll целиком).

   VERSION — метка кэша: меняем при раскатке нового билда,
   activate удаляет кэши со старыми версиями.
   ═══════════════════════════════════════════════════════════════ */

const VERSION = 'ax1-20261108'
const CACHE = `axolotl-${VERSION}`

/* оболочка приложения: всё остальное (шрифты, runtime) — по ходу дела */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
]

const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // по одному и с catch: один битый ассет не должен ронять весь precache
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' })
            if (res.ok || res.type === 'opaque') await cache.put(url, res)
          } catch {
            /* нет ассета — попробуем в следующий deploy */
          }
        }),
      )
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  /* навигация: сеть свежее, кэш — запасной аэродром */
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          const cache = await caches.open(CACHE)
          return (
            (await cache.match(request)) ||
            (await cache.match('./index.html')) ||
            new Response('Офлайн и пустой кэш', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        }
      })(),
    )
    return
  }

  const isFont = FONT_HOSTS.some((h) => url.href.startsWith(h))
  const isSameOriginInScope =
    url.origin === self.location.origin && url.href.startsWith(self.registration.scope)

  if (isFont) {
    // cache-first: шрифты версионируются, обновлять нечего
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const hit = await cache.match(request)
        if (hit) return hit
        const res = await fetch(request)
        if (res.ok || res.type === 'opaque') {
          try {
            await cache.put(request, res.clone())
          } catch {
            /* opaque/некэшируемый — просто отдаём */
          }
        }
        return res
      })(),
    )
    return
  }

  if (isSameOriginInScope) {
    // stale-while-revalidate: сразу из кэша, сеть обновляет кэш в фоне
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const hit = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              cache.put(request, res.clone()).catch(() => {})
            }
            return res
          })
          .catch(() => null)
        if (hit) return hit
        const fresh = await network
        if (fresh) return fresh
        return new Response('Офлайн', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      })(),
    )
  }
})
