/* Проверка типографики Tiny5 + noscroll на малых вьюпортах.
   Запуск: node scripts/check-juicy.mjs (нужен живой :5173) */
import { chromium, devices } from 'playwright'

const BASE = process.env.E2E_BASE || 'http://localhost:5173'
const results = []
const check = (name, ok, comment = '') => {
  results.push(ok)
  console.log(`  ${ok ? '✅' : '❌'} ${name}${comment ? ` — ${comment}` : ''}`)
}

const VIEWPORTS = [
  { name: '360×780', width: 360, height: 780 },
  { name: '320×568', width: 320, height: 568 },
]

const gameJson = JSON.parse(
  (await import('node:fs')).readFileSync(new URL('../client/src/static/game.json', import.meta.url), 'utf8'),
)
const R1_NEWS = gameJson.rounds[0].news.length

const browser = await chromium.launch()

/* ── 1. Типографика: Tiny5 грузится, покрывает О/П, вес 400 ── */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)

  const typo = await page.evaluate(() => {
    const load = (ch) => document.fonts.check('20px Tiny5', ch)
    const loadedFamilies = [...document.fonts].map((f) => `${f.family} ${f.weight}`)
    const logo = document.querySelector('.title-logo')
    const logoStyle = logo ? getComputedStyle(logo) : null
    const btn = document.querySelector('[data-testid="btn-play"] button')
    const btnStyle = btn ? getComputedStyle(btn) : null
    const h2sample = document.querySelector('.title-sub')
    return {
      tiny5_O: load('О'),
      tiny5_P: load('П'),
      tiny5_Yo: load('Ё'),
      tiny5_digit: load('5'),
      tiny5_rub: load('₽'),
      tiny5_tri: load('▲'),
      pixelifyLoaded: [...document.fonts].some((f) => /pixelify/i.test(f.family)),
      families: loadedFamilies,
      logoWeight: logoStyle?.fontWeight,
      logoFamily: logoStyle?.fontFamily,
      btnWeight: btnStyle?.fontWeight,
      subWeight: h2sample ? getComputedStyle(h2sample).fontWeight : null,
    }
  })
  check('Tiny5 загружен (буква О)', typo.tiny5_O, JSON.stringify(typo.families))
  check('Tiny5: заглавная П', typo.tiny5_P)
  check('Tiny5: Ё и цифры', typo.tiny5_Yo && typo.tiny5_digit)
  /* fonts.check не видит отсутствие глифа (фолбэк считается «загруженным»),
     поэтому отсутствие ₽/▲/▼ в Tiny5 проверяем практикой: в дисплей-текстах
     интерфейса этих символов просто нет (стрелки — SVG, ₽ — спрайт-монета) */
  const displayGlyphs = await page.evaluate(() => {
    const bad = []
    document.querySelectorAll('.pxbtn, .badge, .chip, .display').forEach((el) => {
      const t = el.textContent ?? ''
      if (/[₽▲▼✓]/.test(t)) bad.push(t.trim().slice(0, 20))
    })
    return bad
  })
  check('в дисплей-текстах нет ₽/▲/▼/✓', displayGlyphs.length === 0, displayGlyphs.join(',') || 'чисто')
  check('Pixelify больше не грузится', !typo.pixelifyLoaded)
  check('title-logo: вес 400', typo.logoWeight === '400', `weight=${typo.logoWeight}`)
  check('кнопка Играть: вес 400', typo.btnWeight === '400', `weight=${typo.btnWeight}`)
  check('title-sub: вес 400', typo.subWeight === '400', `weight=${typo.subWeight}`)

  /* тумблер ТВ работает: оверлей есть, после клика — нет */
  const hasCrt = await page.locator('.crt').count()
  check('CRT-оверлей включён по умолчанию', hasCrt === 1)
  await page.locator('[data-testid="btn-crt"]').click()
  await page.waitForTimeout(200)
  const crtOff = await page.locator('.crt').count()
  check('тумблер TV выключает оверлей', crtOff === 0)
  await page.locator('[data-testid="btn-crt"]').click()
  await page.waitForTimeout(200)
  const crtOn = await page.locator('.crt').count()
  check('тумблер TV включает обратно', crtOn === 1)
  const pref = await page.evaluate(() => localStorage.getItem('ax_crt'))
  check("localStorage ax_crt='1' после включения", pref === '1')

  await ctx.close()
}

/* ── 2. noscroll на малых вьюпортах: титул → новости → ревил ── */
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: 'ru-RU',
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  const noscroll = async (where) => {
    const { sh, ih } = await page.evaluate(() => ({
      sh: document.scrollingElement.scrollHeight,
      ih: window.innerHeight,
    }))
    check(`noscroll ${vp.name} @${where}`, sh <= ih + 1, `scrollHeight=${sh} innerHeight=${ih}`)
  }

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })
  await noscroll('title')

  await page.locator('[data-testid="btn-play"] button').click()
  await page.locator('[data-testid="input-nick"]').waitFor()
  await noscroll('nick')
  await page.fill('[data-testid="input-nick"]', 'QA_МАЛЫШ')
  await page.locator('[data-testid="btn-nick-next"] button').click()
  await page.locator('[data-testid="btn-read-news"] button').waitFor()
  await noscroll('intro')
  await page.locator('[data-testid="btn-read-news"] button').click()

  await page.locator('[data-testid="btn-news-next"] button').waitFor()
  /* R1_NEWS-1 нажатий «Далее» + одно «Кто это?» */
  for (let i = 1; i < R1_NEWS; i++) {
    await page.locator('[data-testid="btn-news-next"] button').click()
    await page.waitForTimeout(200)
  }
  await noscroll('news')

  await page.locator('[data-testid="btn-news-next"] button').click()
  await page.locator('[data-testid^="quiz-opt-"] button').first().waitFor()
  await noscroll('quiz')
  await page.locator('[data-testid^="quiz-opt-"] button').first().click()
  await page.waitForTimeout(1500)
  await page.locator('[data-testid^="quiz-opt-"] button').first().click()
  await page.locator('[data-testid="btn-bet-up"] button').waitFor()
  await noscroll('bet')
  await page.locator('[data-testid="btn-bet-up"] button').click()
  await page.locator('[data-testid="btn-reveal-next"] button').waitFor()
  await noscroll('reveal')

  check(`нет pageerror на ${vp.name}`, errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

await browser.close()
const failed = results.filter((ok) => !ok).length
console.log(`\n═══ Типографика+noscroll: ${results.length - failed}/${results.length} PASS ═══`)
process.exit(failed ? 1 : 0)
