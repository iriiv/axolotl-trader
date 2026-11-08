/* ═══════════════════════════════════════════════════════════════
    E2E-прогон ХАБА v1.2 (playwright, iPhone 13). Сценарии:

    A «регистрация» — чистый localStorage: хаб-главная с карточкой
      регистрации, «Начать путь» пишет ax_nick, приветствие меняется
    B «вкладки»     — 5 вкладок таб-бара переключают секции,
      noscroll на каждой, таб-бар не перекрывает контент,
      повторный тап по активной — назад на Главную
    C «дебаг+магазин» — +9999 монет → покупка золотого в магазине →
      ChestScreen(gold) открывается → «Выдать всё» → 23/23 в гардеробе
    D «маскот»      — тап по аксолотлю меняет DOM (фраза/счётчик тапов)
    E «ник»         — смена ника в Аккаунте отражается в приветствии

    Запуск: node scripts/e2e-hub.mjs
    База:   E2E_BASE=http://localhost:5173 (по умолчанию)
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

/* каталог косметики — 23 предмета (8 скинов + 9 шляп + 6 аксессуаров) */
const ITEMS_TOTAL = 23

const results = []
function check(scenario, name, ok, comment = '') {
  results.push({ scenario, name, ok, comment })
  console.log(`  ${ok ? '✅' : '❌'} ${name}${comment ? ` — ${comment}` : ''}`)
  return ok
}
const digits = (s) => Number(String(s).replace(/\D+/g, ''))
const norm = (s) => String(s).replace(/\s+/g, '')
const low = (s) => norm(s).toLowerCase()

function watchErrors(page, sink) {
  page.on('pageerror', (err) => sink.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') sink.push(`console.error: ${msg.text()}`)
  })
}

/** noscroll: документ не растёт — экран всегда ровно в высоту */
async function vScrollOk(page, scenario, where) {
  const { sh, ih } = await page.evaluate(() => ({
    sh: document.scrollingElement ? document.scrollingElement.scrollHeight : document.documentElement.scrollHeight,
    ih: window.innerHeight,
  }))
  return check(scenario, `noscroll @${where}`, sh <= ih + 1, `scrollHeight=${sh} innerHeight=${ih}`)
}

/** таб-бар не наезжает на контент секции */
async function tabbarClearOk(page, scenario, where) {
  const ok = await page.evaluate(() => {
    const bar = document.querySelector('[data-testid="hub-tabbar"]')
    const sec = document.querySelector('.hub-section')
    if (!bar || !sec) return false
    const b = bar.getBoundingClientRect()
    const s = sec.getBoundingClientRect()
    return s.bottom <= b.top + 1
  })
  return check(scenario, `таб-бар не перекрывает контент @${where}`, ok)
}

async function readStorage(page, key, fallback) {
  return page.evaluate(
    ([k, fb]) => {
      try {
        const raw = window.localStorage.getItem(k)
        return raw === null ? fb : JSON.parse(raw)
      } catch {
        return fb
      }
    },
    [key, fallback],
  )
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: false })
}

/* ═════════════════ A+D+E: регистрация · маскот · ник ═════════════════ */

async function scenarioRegister(browser) {
  const scenario = 'H регистрация'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })

  /* ── (а) регистрация при чистом localStorage ── */
  check(scenario, 'хаб-экран показан (data-testid=hub-screen)', (await page.locator('[data-testid="hub-screen"]').count()) === 1)
  const nickBefore = await readStorage(page, 'ax_nick', null)
  check(scenario, 'ax_nick пуст при первом входе', nickBefore === null, JSON.stringify(nickBefore))

  const hello0 = await page.locator('[data-testid="hub-hello"]').innerText()
  check(scenario, 'приветствие спрашивает имя', low(hello0).includes('кактебязовут'), hello0.trim())
  check(scenario, 'карточка регистрации на главной', (await page.locator('[data-testid="hub-registration"]').count()) === 1)

  await shot(page, '30-registration.png')
  console.log('📸 30-registration.png')

  await page.fill('[data-testid="hub-input-nick"]', 'ХАБ_МАСТЕР')
  await page.locator('[data-testid="btn-register"] button').click()
  await page.waitForTimeout(350)
  const nickSaved = await readStorage(page, 'ax_nick', null)
  check(scenario, 'ax_nick записан', nickSaved === 'ХАБ_МАСТЕР', JSON.stringify(nickSaved))
  const hello1 = await page.locator('[data-testid="hub-hello"]').innerText()
  check(scenario, 'приветствие с ником после регистрации', norm(hello1).includes('ХАБ_МАСТЕР'), hello1.trim())
  check(scenario, 'карточка регистрации исчезла', (await page.locator('[data-testid="hub-registration"]').count()) === 0)
  await vScrollOk(page, scenario, 'home после регистрации')

  /* ── (д) тап по маскоту: DOM меняется ── */
  const tap0 = await page.locator('[data-testid="hub-phrase"]').getAttribute('data-tap')
  await page.locator('.hub-axo .axo').click()
  await page.waitForTimeout(250)
  const tap1 = await page.locator('[data-testid="hub-phrase"]').getAttribute('data-tap')
  check(scenario, 'тап по маскоту меняет DOM (счётчик тапов)', Number(tap1) === Number(tap0) + 1, `${tap0}→${tap1}`)
  const moodCls = await page.locator('.hub-axo .axo').getAttribute('class')
  check(
    scenario,
    'маскот отреагировал настроением (cheer/wow)',
    /axo--(cheer|wow)/.test(moodCls ?? ''),
    (moodCls ?? '').match(/axo--\w+/)?.[0] ?? '',
  )

  /* ── (е) смена ника в аккаунте отражается в приветствии ── */
  await page.locator('[data-testid="tab-account"] button').click()
  await page.locator('[data-testid="hub-section-account"]').waitFor()
  await page.locator('[data-testid="btn-nick-edit"] button').click()
  await page.locator('[data-testid="input-nick-edit"]').waitFor()
  await page.fill('[data-testid="input-nick-edit"]', 'ХАБ_НОВЫЙ')
  await page.locator('[data-testid="btn-nick-save"] button').click()
  await page.waitForTimeout(300)
  const nick2 = await readStorage(page, 'ax_nick', null)
  check(scenario, 'ax_nick обновлён из аккаунта', nick2 === 'ХАБ_НОВЫЙ', JSON.stringify(nick2))

  await page.locator('[data-testid="tab-account"] button').click() // повторный тап → Главная
  await page.locator('[data-testid="btn-play"]').waitFor()
  const hello2 = await page.locator('[data-testid="hub-hello"]').innerText()
  check(scenario, 'новый ник в приветствии на главной', norm(hello2).includes('ХАБ_НОВЫЙ'), hello2.trim())

  check(scenario, 'нет pageerror/console.error', errors.length === 0, errors.slice(0, 5).join(' | '))
  await ctx.close()
}

/* ═════════════════ B: вкладки и noscroll ═════════════════ */

async function scenarioTabs(browser) {
  const scenario = 'H вкладки'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)
  await ctx.addInitScript(() => {
    window.localStorage.setItem('ax_nick', JSON.stringify('ХАБ_ТУРИСТ'))
    window.localStorage.setItem('ax_coins', '600')
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="btn-play"]').waitFor({ timeout: 15000 })
  check(scenario, 'по умолчанию — Главная (btn-play виден)', true)

  const tabs = [
    { testid: 'tab-account', section: 'hub-section-account', label: 'Аккаунт' },
    { testid: 'tab-daily', section: 'hub-section-daily', label: 'Хроника' },
    { testid: 'tab-play', section: 'hub-section-play', label: 'Играть' },
    { testid: 'btn-wardrobe', section: 'hub-section-wardrobe', label: 'Гардероб' },
    { testid: 'tab-shop', section: 'hub-section-shop', label: 'Магазин' },
  ]

  for (const t of tabs) {
    await page.locator(`[data-testid="${t.testid}"] button`).click()
    await page.locator(`[data-testid="${t.section}"]`).waitFor()
    check(scenario, `вкладка «${t.label}» открывает секцию`, true)
    await vScrollOk(page, scenario, t.label)
    await tabbarClearOk(page, scenario, t.label)
  }

  /* активная вкладка подсвечена; повторный тап → Главная */
  const active = await page.locator('[data-testid="tab-shop"].is-on').count()
  check(scenario, 'активная вкладка подсвечена (.is-on)', active === 1)

  await page.locator('[data-testid="tab-shop"] button').click()
  await page.locator('[data-testid="btn-play"]').waitFor()
  check(scenario, 'повторный тап по активной — назад на Главную', true)
  await vScrollOk(page, scenario, 'home (возврат)')

  /* центральная ▶ — приподнятая круглая кнопка */
  const playRaised = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="tab-play"] .hub-play')
    const bar = document.querySelector('[data-testid="hub-tabbar"]')
    if (!btn || !bar) return false
    return btn.getBoundingClientRect().top < bar.getBoundingClientRect().top
  })
  check(scenario, '▶ приподнята над таб-баром', playRaised)

  check(scenario, 'нет pageerror/console.error', errors.length === 0, errors.slice(0, 5).join(' | '))
  await ctx.close()
}

/* ═════════════════ C: дебаг + магазин сундуков ═════════════════ */

async function scenarioDebugShop(browser) {
  const scenario = 'H дебаг'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)
  await ctx.addInitScript(() => {
    window.localStorage.setItem('ax_nick', JSON.stringify('ХАБ_ДЕБАГГЕР'))
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="btn-play"]').waitFor({ timeout: 15000 })

  /* ── дебаг: +9999 монет ── */
  await page.locator('[data-testid="tab-account"] button').click()
  await page.locator('[data-testid="hub-section-account"]').waitFor()
  await page.locator('[data-testid="btn-debug-coins"] button').click()
  await page.waitForTimeout(250)
  const coins1 = await readStorage(page, 'ax_coins', -1)
  check(scenario, 'дебаг: +9999 монет', coins1 === 9999, `ax_coins=${coins1}`)

  /* ── магазин: покупка золотого за 400 ── */
  await page.locator('[data-testid="tab-shop"] button').click()
  await page.locator('[data-testid="hub-section-shop"]').waitFor()
  const shopCoins = await page.locator('[data-testid="shop-coins"]').innerText()
  check(scenario, 'баланс монет в шапке магазина', digits(shopCoins) === 9999, shopCoins.trim())

  const woodenDisabled = await page.locator('[data-testid="btn-shop-buy-wooden"] button').isDisabled()
  check(scenario, 'деревянный (50) продаётся в магазине', !woodenDisabled)
  const goldDisabled = await page.locator('[data-testid="btn-shop-buy-gold"] button').isDisabled()
  check(scenario, 'золотой (400) доступен при 9999', !goldDisabled)

  await page.locator('[data-testid="btn-shop-buy-gold"] button').click()
  await page.locator('[data-testid="chest-screen"][data-chest="gold"]').waitFor()
  const coinsAfterBuy = await readStorage(page, 'ax_coins', -1)
  check(scenario, 'монеты списаны: 9999 − 400 = 9599', coinsAfterBuy === 9599, `ax_coins=${coinsAfterBuy}`)

  /* открытие золотого (дроп любой редкости, слоты ждут шоу) */
  await page.locator('button:has-text("Открыть")').click()
  await page.locator('.cos-drop').waitFor()
  check(scenario, 'дроп золотого показан (DropReveal)', (await page.locator('.cos-drop').count()) === 1)
  await page.locator('button:has-text("Забрать")').click()
  await page.locator('[data-testid="hub-section-shop"]').waitFor()
  check(scenario, 'после сундука вернулись в Магазин', true)

  /* ── дебаг: выдать все предметы → 23/23 ── */
  await page.locator('[data-testid="tab-account"] button').click()
  await page.locator('[data-testid="hub-section-account"]').waitFor()
  await page.locator('[data-testid="btn-debug-all"] button').click()
  await page.waitForTimeout(300)
  const invAll = await readStorage(page, 'ax_inv', [])
  check(scenario, `выдано всё: ${ITEMS_TOTAL}/${ITEMS_TOTAL}`, invAll.length === ITEMS_TOTAL, `ax_inv=${invAll.length}`)

  await page.locator('[data-testid="btn-wardrobe"] button').click()
  await page.locator('[data-testid="wardrobe-screen"]').waitFor()
  const badge = await page.locator('[data-testid="wardrobe-screen"] .ward-sub .badge').innerText()
  check(
    scenario,
    `счётчик предметов ${ITEMS_TOTAL}/${ITEMS_TOTAL} в гардеробе`,
    low(badge).includes(`предметы:${ITEMS_TOTAL}/${ITEMS_TOTAL}`),
    badge.trim(),
  )
  const tabMeta = await page.locator('[data-testid="btn-wardrobe"]').innerText()
  check(scenario, `счётчик ${ITEMS_TOTAL}/${ITEMS_TOTAL} на вкладке гардероба`, norm(tabMeta).includes(`${ITEMS_TOTAL}/${ITEMS_TOTAL}`), tabMeta.trim().replace(/\n/g, ' '))

  /* ── дебаг: бесплатный золотой открывается бесконечно ── */
  const goAccount = async () => {
    /* сундук и так возвращает в Аккаунт — кликаем вкладку только
       если мы не там (повторный тап по активной = Главная!) */
    if ((await page.locator('[data-testid="hub-section-account"]').count()) === 0) {
      await page.locator('[data-testid="tab-account"] button').click()
    }
    await page.locator('[data-testid="hub-section-account"]').waitFor()
  }
  for (let i = 0; i < 2; i++) {
    await goAccount()
    await page.locator('[data-testid="btn-debug-gold"] button').click()
    await page.locator('[data-testid="chest-screen"][data-chest="gold"]').waitFor()
    const coinsSame = await readStorage(page, 'ax_coins', -1)
    check(
      scenario,
      `бесплатный золотой №${i + 1}: монеты не списаны`,
      coinsSame >= coinsAfterBuy,
      `ax_coins=${coinsSame} (дубли компенсируются сверху)`,
    )
    await page.locator('button:has-text("Открыть")').click()
    await page.locator('.cos-drop').waitFor()
    await page.locator('button:has-text("Забрать")').click()
    await page.locator('[data-testid="hub-section-account"]').waitFor()
  }
  check(scenario, 'золотой открывается повторно (бесконечно)', true)

  check(scenario, 'нет pageerror/console.error', errors.length === 0, errors.slice(0, 5).join(' | '))
  await ctx.close()
}

/* ═════════════════ запуск ═══════════════════ */

const browser = await chromium.launch()
let failed = 0
try {
  await scenarioRegister(browser)
  await scenarioTabs(browser)
  await scenarioDebugShop(browser)
} finally {
  await browser.close()
}

const pass = results.filter((r) => r.ok).length
failed = results.length - pass
console.log(`\n═══ Итог прогона: ${pass}/${results.length} PASS, ${failed} FAIL ═══`)
if (failed) {
  console.log('Упавшие проверки:')
  results.filter((r) => !r.ok).forEach((r) => console.log(`  ❌ [${r.scenario}] ${r.name} — ${r.comment}`))
}
process.exit(failed ? 1 : 0)
