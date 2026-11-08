#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
    Скриншоты витка «Хаб v1.2» (docs/screenshots):
      25-hub-main.png      — главная: маскот-сцена с экипировкой
      26-hub-play.png      — секция режимов (▶ Играть)
      27-hub-account.png   — аккаунт: профиль/настройки/отладка
      28-hub-shop.png      — магазин: 3 сундука с шансами
      29-chest-legend.png  — легендарное выпадение (дебаг + хук
                             форсированной редкости), пик шоу
      (30-registration.png снимает scripts/e2e-hub.mjs)

    Запуск: node scripts/shots-hub.mjs   (нужен dev-сервер)
    ═══════════════════════════════════════════════════════════════ */

import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.E2E_BASE || 'http://localhost:5173'
const SHOTS = path.join(ROOT, 'docs', 'screenshots')
mkdirSync(SHOTS, { recursive: true })

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name), fullPage: false })
const errors = []
function watchErrors(page) {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
  })
}

const browser = await chromium.launch()

/* ── хаб игрока с экипировкой и статами (preseed) ── */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)
  await ctx.addInitScript(() => {
    window.localStorage.setItem('ax_nick', JSON.stringify('Аксоль_стильный'))
    window.localStorage.setItem('ax_coins', '1250')
    window.localStorage.setItem('ax_best', '3200')
    window.localStorage.setItem('ax_games', '7')
    window.localStorage.setItem(
      'ax_inv',
      JSON.stringify(['skin-classic', 'skin-lime', 'hat-cap', 'acc-glasses']),
    )
    window.localStorage.setItem(
      'ax_equip',
      JSON.stringify({ skin: 'skin-lime', hat: 'hat-cap', acc: 'acc-glasses' }),
    )
    window.localStorage.setItem(
      'ax_daily',
      JSON.stringify({ lastDateKey: null, streak: 3, bestStreak: 5, playedDays: 4 }),
    )
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })
  await page.waitForTimeout(1500) // пузырёк фразы + idle-анимации
  await shot(page, '25-hub-main.png')
  console.log('📸 25-hub-main.png')

  await page.locator('[data-testid="tab-play"] button').click()
  await page.locator('[data-testid="hub-section-play"]').waitFor()
  await page.waitForTimeout(450)
  await shot(page, '26-hub-play.png')
  console.log('📸 26-hub-play.png')

  await page.locator('[data-testid="tab-account"] button').click()
  await page.locator('[data-testid="hub-section-account"]').waitFor()
  await page.waitForTimeout(450)
  await shot(page, '27-hub-account.png')
  console.log('📸 27-hub-account.png')

  await page.locator('[data-testid="tab-shop"] button').click()
  await page.locator('[data-testid="hub-section-shop"]').waitFor()
  await page.waitForTimeout(650) // сундуки «дышат»
  await shot(page, '28-hub-shop.png')
  console.log('📸 28-hub-shop.png')

  await ctx.close()
}

/* ── легендарное выпадение: дебаг-золотой + форс редкости ── */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)
  await ctx.addInitScript(() => {
    window.localStorage.setItem('ax_nick', JSON.stringify('Аксоль_стильный'))
    window.localStorage.setItem('ax_coins', '300')
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })

  await page.locator('[data-testid="tab-account"] button').click()
  await page.locator('[data-testid="hub-section-account"]').waitFor()
  await page.locator('[data-testid="btn-debug-gold"] button').click()
  await page.locator('[data-testid="chest-screen"][data-chest="gold"]').waitFor()

  /* форсируем легендарный дроп и ловим пик шоу: slow-mo лучи,
     фейерверк, каскад «ЛЕГЕНДАРНЫЙ» */
  await page.evaluate(() => window.__forceDropRarity('legend'))
  await page.locator('button:has-text("Открыть")').click()
  await page.locator('.cos-drop').waitFor()
  await page.waitForTimeout(1450)
  await shot(page, '29-chest-legend.png')
  console.log('📸 29-chest-legend.png')

  await ctx.close()
}

await browser.close()
console.log(errors.length ? `⚠︎ ошибки страницы:\n${errors.slice(0, 6).join('\n')}` : '✅ без ошибок страницы')
process.exit(errors.length ? 1 : 0)
