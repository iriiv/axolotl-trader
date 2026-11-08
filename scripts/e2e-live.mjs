/* Проверка живого деплоя (GitHub Pages): титул, кнопка ИГРАТЬ, ввод ника,
   отсутствие pageerror. API тут нет — только локальный режим. */
import { chromium, devices } from 'playwright'

const BASE = 'https://iriiv.github.io/axolotl-trader/'
const errors = []

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`) })

const results = []
const check = (name, ok, comment = '') => {
  results.push(ok)
  console.log(`  ${ok ? '✅' : '❌'} ${name}${comment ? ` — ${comment}` : ''}`)
}

console.log('▶ D живой деплой:', BASE)
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 })

const title = await page.locator('h1.title-logo').waitFor({ timeout: 20000 }).then(() => true).catch(() => false)
check('титул отрисовался (логотип)', title)
const titleText = title ? await page.locator('h1.title-logo').innerText() : ''
check('логотип = «Аксолотль-трейдер»', titleText.trim().toLowerCase() === 'аксолотль-трейдер', titleText.trim())
await page.screenshot({ path: 'docs/screenshots/e2e-d-live-title.png' })

const playBtn = page.locator('[data-testid="btn-play"] button')
const enabled = await playBtn.isEnabled()
check('кнопка ИГРАТЬ кликабельна', enabled)
await playBtn.click()
const nickShown = await page.locator('[data-testid="input-nick"]').waitFor({ timeout: 10000 }).then(() => true).catch(() => false)
check('дошли до ввода ника', nickShown)

const { sw, iw } = await page.evaluate(() => ({
  sw: document.scrollingElement.scrollWidth,
  iw: window.innerWidth,
}))
check('нет горизонтального скролла', sw <= iw, `scrollWidth=${sw} innerWidth=${iw}`)

// сетевые ошибки к /api на Pages ожидаемы (там нет бека) — вычитаем из критичных
const netErrors = errors.filter((e) => /\/api|Failed to load resource|404/i.test(e))
const uiErrors = errors.filter((e) => !netErrors.includes(e))
check('нет pageerror/JS-ошибок', uiErrors.length === 0, uiErrors.slice(0, 3).join(' | '))
console.log(`  ℹ️ сетевые ошибки (нет API на Pages, ожидаемы): ${netErrors.length}`)

await browser.close()
const pass = results.filter(Boolean).length
console.log(`═══ Deploy: ${pass}/${results.length} PASS ═══`)
process.exit(pass === results.length ? 0 : 1)
