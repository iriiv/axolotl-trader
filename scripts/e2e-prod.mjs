/* Быстрая проверка прод-режима: Express раздаёт client/dist на :4000,
   SPA + API на одном origin, игра доходит до ставки. */
import { chromium, devices } from 'playwright'

const BASE = 'http://localhost:4000'
const errors = []
const results = []
const check = (name, ok, comment = '') => {
  results.push(ok)
  console.log(`  ${ok ? '✅' : '❌'} ${name}${comment ? ` — ${comment}` : ''}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`) })

console.log('▶ E+ прод-режим (Express + dist):', BASE)
await page.goto(BASE, { waitUntil: 'networkidle' })
check('титул отрисовался', await page.locator('h1.title-logo').waitFor({ timeout: 10000 }).then(() => true).catch(() => false))

await page.locator('[data-testid="btn-leaderboard"] button').click()
await page.locator('.lb-table').waitFor({ timeout: 8000 })
const lb = (await page.locator('body').innerText()).replace(/\s+/g, '')
check('лидерборд онлайн (сервер на том же origin)', !lb.includes('локальныйрейтинг') && lb.includes('Квант_Лягушка'), '')
await page.locator('[data-testid="btn-menu"] button').click()

await page.locator('[data-testid="btn-play"] button').click()
await page.fill('[data-testid="input-nick"]', 'QA_PROD')
await page.locator('[data-testid="btn-nick-next"] button').click()
await page.locator('[data-testid="btn-read-news"] button').waitFor()
check('флоу игры стартует (интро r1)', true)
const { sw, iw } = await page.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, iw: window.innerWidth }))
check('нет горизонтального скролла', sw <= iw, `scrollWidth=${sw} innerWidth=${iw}`)

check('нет pageerror/console.error', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
console.log(`═══ Прод-режим: ${results.filter(Boolean).length}/${results.length} PASS ═══`)
process.exit(results.every(Boolean) ? 0 : 1)
