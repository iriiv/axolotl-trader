#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   Скриншоты витка «Кастомизация и Daily» (docs/screenshots):
     21-wardrobe.png         — гардероб после пройденного daily
     22-chest-open.png       — момент DropReveal открытого сундука
     23-daily-result.png     — итог хроники дня
     24-title-equipped.png   — титул: аксолотль в кепке и очках
                               (экипировка через localStorage preseed)

   Запуск: node scripts/shots-cosmetics.mjs   (нужен dev-сервер)
   База:   E2E_BASE=http://localhost:5173 (по умолчанию)
   ═══════════════════════════════════════════════════════════════ */

import { chromium, devices } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.E2E_BASE || 'http://localhost:5173'
const SHOTS = path.join(ROOT, 'docs', 'screenshots')
mkdirSync(SHOTS, { recursive: true })

const gameJson = JSON.parse(
  readFileSync(path.join(ROOT, 'client', 'src', 'static', 'game.json'), 'utf8'),
)
const rounds = [...gameJson.rounds].sort((a, b) => a.order - b.order)

function hashDateKey(key) {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name), fullPage: false })
const errors = []
function watchErrors(page) {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
  })
}

const browser = await chromium.launch()

/* ── виток: daily → сундук → титул → гардероб ── */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })

  await page.evaluate(() => window.__setDateKey('2026-11-09'))
  await page.waitForTimeout(200)

  const round = rounds[hashDateKey('2026-11-09') % rounds.length]
  await page.locator('[data-testid="btn-daily"] button').click()
  await page.locator('[data-testid="btn-read-news"] button').click()
  await page.locator('[data-testid="btn-news-next"] button').waitFor()
  for (let i = 1; i < round.news.length; i++) {
    await page.locator('[data-testid="btn-news-next"] button').click()
    await page.waitForTimeout(150)
  }
  await page.locator('[data-testid="btn-news-next"] button').click()
  await page
    .locator('[data-testid^="quiz-opt-"] button')
    .filter({ hasText: round.answers.company })
    .first()
    .click()
  await page
    .locator('[data-testid^="quiz-opt-"] button')
    .filter({ hasText: String(round.answers.year) })
    .first()
    .click()
  await page.locator(`[data-testid="btn-bet-${round.direction}"] button`).click()
  await page.locator('[data-testid="btn-reveal-next"] button').waitFor()
  await page.waitForTimeout(1700) // дать анимации ревила дойти до финала
  await page.locator('[data-testid="btn-reveal-next"] button').click()

  await page.locator('[data-testid="daily-result"]').waitFor()
  await page.waitForTimeout(500)
  await shot(page, '23-daily-result.png')
  console.log('📸 23-daily-result.png')

  await page.locator('[data-testid="btn-daily-chest"] button').click()
  await page.locator('[data-testid="chest-screen"]').waitFor()
  await page.locator('button:has-text("Открыть")').click()
  await page.locator('.cos-drop').waitFor()
  await page.waitForTimeout(700)
  await shot(page, '22-chest-open.png')
  console.log('📸 22-chest-open.png')

  await page.locator('button:has-text("Забрать")').click()
  await page.locator('[data-testid="btn-play"]').waitFor()
  await page.locator('[data-testid="btn-wardrobe"] button').click()
  await page.locator('[data-testid="wardrobe-screen"]').waitFor()
  await page.waitForTimeout(600)
  await shot(page, '21-wardrobe.png')
  console.log('📸 21-wardrobe.png')

  await ctx.close()
}

/* ── титул с экипировкой (кепка + очки + лайм) через preseed ── */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)
  await ctx.addInitScript(() => {
    window.localStorage.setItem(
      'ax_inv',
      JSON.stringify(['skin-classic', 'skin-lime', 'hat-cap', 'acc-glasses']),
    )
    window.localStorage.setItem(
      'ax_equip',
      JSON.stringify({ skin: 'skin-lime', hat: 'hat-cap', acc: 'acc-glasses' }),
    )
    window.localStorage.setItem('ax_coins', '1250')
    window.localStorage.setItem('ax_nick', JSON.stringify('Аксоль_стильный'))
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })
  await page.waitForTimeout(1800)
  await shot(page, '24-title-equipped.png')
  console.log('📸 24-title-equipped.png')

  await ctx.close()
}

await browser.close()
console.log(errors.length ? `⚠︎ ошибки страницы:\n${errors.slice(0, 6).join('\n')}` : '✅ без ошибок страницы')
process.exit(errors.length ? 1 : 0)
