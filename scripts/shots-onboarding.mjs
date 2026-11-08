#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
    Скриншоты витка «Сочные кнопки и онбординг» (docs/screenshots):
      35-onboarding.png — coach-подсказка первого запуска (шаг 1/3)
                          + проверка кликабельности btn-play/btn-leaderboard
                          под открытой подсказкой + шаги 2/3 и 3/3
      36-buttons-demo.png — витрина кнопок #design (объёмная схема)

    Запуск: node scripts/shots-onboarding.mjs   (нужен dev-сервер)
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
let failed = 0
const check = (name, ok, comment = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${comment ? ` — ${comment}` : ''}`)
  if (!ok) failed++
}

/* ── онбординг: чистый профиль → coach-подсказки ── */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  watchErrors(page)

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })
  await page.waitForTimeout(900)

  check('coach-подсказка 1/3 показана (чистый профиль)', (await page.locator('[data-testid="coach-tip"]').count()) === 1)
  const tipText = await page.locator('[data-testid="coach-tip"]').innerText()
  check('шаг 1 — «тапни аксолотля»', /аксолотль/i.test(tipText), tipText.trim().replace(/\n/g, ' '))

  /* подсказка не перекрывает клики: btn-play ведёт на экран ника
     (тап также закрывает шаг 1 — по спецификации онбординга) */
  await page.locator('[data-testid="btn-play"] button').click()
  await page.locator('[data-testid="input-nick"]').waitFor({ timeout: 8000 })
  check('btn-play кликабелен под coach-подсказкой (открылся экран ника)', true)
  const onboardedA = await page.evaluate(() => window.localStorage.getItem('ax_onboarded'))
  check('тап мимо подсказки записал ax_onboarded', onboardedA === 'true', String(onboardedA))

  /* шаги 2/3 и 3/3: сброс флага, листаем подсказки кнопкой «Дальше» */
  await page.evaluate(() => {
    window.localStorage.removeItem('ax_onboarded')
    window.history.length = 0
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })
  await page.waitForTimeout(600)
  check('после сброса флага подсказка снова на шаге 1', (await page.locator('[data-testid="coach-tip"]').count()) === 1)

  await page.locator('.coach__next').click()
  await page.waitForTimeout(450)
  const step2 = await page.locator('[data-testid="coach-tip"]').innerText()
  check('шаг 2 — кампания и хроника', /кампания/i.test(step2), step2.trim().replace(/\n/g, ' '))

  /* btn-leaderboard кликабелен под шагом 2 (подсказка не блокирует) */
  await page.locator('[data-testid="btn-leaderboard"] button').click()
  await page.locator('.lb-table').waitFor({ timeout: 10000 })
  check('btn-leaderboard кликабелен под coach-подсказкой (лидерборд открылся)', true)

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })
  await page.waitForTimeout(500)
  await page.locator('.coach__next').click() // → шаг 2
  await page.waitForTimeout(350)
  await page.locator('.coach__next').click() // → шаг 3
  await page.waitForTimeout(450)
  const step3 = await page.locator('[data-testid="coach-tip"]').innerText()
  check('шаг 3 — сундуки и гардероб', /гардероб/i.test(step3), step3.trim().replace(/\n/g, ' '))

  await page.locator('.coach__next').click() // «Понятно» — конец
  await page.waitForTimeout(450)
  check('после «Понятно» подсказки исчезли', (await page.locator('[data-testid="coach-tip"]').count()) === 0)
  const onboardedB = await page.evaluate(() => window.localStorage.getItem('ax_onboarded'))
  check('флаг ax_onboarded записан навсегда', onboardedB === 'true', String(onboardedB))

  /* перезагрузка: подсказки не возвращаются */
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })
  await page.waitForTimeout(500)
  check('после перезагрузки подсказок нет', (await page.locator('[data-testid="coach-tip"]').count()) === 0)

  /* финальный кадр: шаг 1/3 для документации */
  await page.evaluate(() => window.localStorage.removeItem('ax_onboarded'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('[data-testid="hub-screen"]').waitFor({ timeout: 15000 })
  await page.waitForTimeout(900)
  await shot(page, '35-onboarding.png')
  console.log('📸 35-onboarding.png')

  await ctx.close()
}

/* ── витрина кнопок #design (высокий вьюпорт, чтобы видеть всю секцию) ── */
{
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 1240 },
    locale: 'ru-RU',
  })
  const page = await ctx.newPage()
  watchErrors(page)
  await page.goto(`${BASE}/#design`, { waitUntil: 'networkidle' })
  await page.locator('.demo-hero__title').waitFor({ timeout: 15000 })
  await page.waitForTimeout(700)
  await shot(page, '36-buttons-demo.png')
  console.log('📸 36-buttons-demo.png')
  await ctx.close()
}

await browser.close()
console.log(errors.length ? `⚠︎ ошибки страницы:\n${errors.slice(0, 6).join('\n')}` : '✅ без ошибок страницы')
process.exit(failed || errors.length ? 1 : 0)
