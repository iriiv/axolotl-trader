/* ═══════════════════════════════════════════════════════════════
   E2E-прогон косметики и Daily (playwright, iPhone 13), в стиле
   scripts/e2e.mjs. Сценарий (свежий контекст, чистый storage):

   (а) daily через __setDateKey('2026-11-09'): DailyResultCard есть,
       стрик 1, монеты за день по формуле, жемчужный сундук открылся,
       предмет добавлен в инвентарь, дубль невозможен в первый раз
   (б) дата на день вперёд → daily снова доступен («Хроника дня №2»)
   (в) гардероб: экипировка выпавшего + кепка; на титуле аксолотль
       со шляпой (viewBox расширяется вверх на lift, есть .axo-hat)
   (г) возврат на ту же дату → кнопка «Завтра новая хроника»
   (д) монеты ≥ 0 и структура ax_daily валидна

   Запуск: node scripts/e2e-cosmetics.mjs
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

/* каталог косметики (id → имя/тип), синхронно с design/cosmetics/catalog.ts */
const CATALOG = {
  'skin-classic': { name: 'Классика', kind: 'skin' },
  'skin-albino': { name: 'Альбинос', kind: 'skin' },
  'skin-lime': { name: 'Лайм', kind: 'skin' },
  'skin-aqua': { name: 'Аква', kind: 'skin' },
  'skin-lavender': { name: 'Лаванда', kind: 'skin' },
  'skin-gold': { name: 'Золотой', kind: 'skin' },
  'skin-cyber': { name: 'Кибер', kind: 'skin' },
  'skin-holo': { name: 'Голограмма', kind: 'skin' },
  'hat-cap': { name: 'Кепка', kind: 'hat' },
  'hat-panama': { name: 'Панама', kind: 'hat' },
  'hat-bandana': { name: 'Бандана', kind: 'hat' },
  'hat-cylinder': { name: 'Цилиндр', kind: 'hat' },
  'hat-headphones': { name: 'Наушники', kind: 'hat' },
  'hat-hardhat': { name: 'Каска', kind: 'hat' },
  'hat-crown': { name: 'Корона', kind: 'hat' },
  'hat-wizard': { name: 'Шляпа мага', kind: 'hat' },
  'hat-bull': { name: 'Бычьи рога', kind: 'hat' },
  'acc-bow': { name: 'Бабочка', kind: 'acc' },
  'acc-glasses': { name: 'Очки', kind: 'acc' },
  'acc-monocle': { name: 'Монокль', kind: 'acc' },
  'acc-tie': { name: 'Галстук', kind: 'acc' },
  'acc-briefcase': { name: 'Портфель', kind: 'acc' },
  'acc-laser': { name: 'Лазерные очки', kind: 'acc' },
}
const KIND_TAB = { skin: 'Скины', hat: 'Шляпы', acc: 'Аксессуары' }
const KIND_SLOT = { skin: 'skin', hat: 'hat', acc: 'acc' }
const ITEMS_TOTAL = Object.keys(CATALOG).length

/* ── журнал проверок ── */
const results = []
function check(scenario, name, ok, comment = '') {
  results.push({ scenario, name, ok, comment })
  console.log(`  ${ok ? '✅' : '❌'} ${name}${comment ? ` — ${comment}` : ''}`)
  return ok
}
const norm = (s) => String(s).replace(/\s+/g, '')
/** norm + нижний регистр: CSS text-transform:uppercase меняет innerText */
const low = (s) => norm(s).toLowerCase()

function watchErrors(page, sink) {
  page.on('pageerror', (err) => sink.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') sink.push(`console.error: ${msg.text()}`)
  })
}

/* FNV-1a — точная копия client/src/game/daily.ts */
function hashDateKey(key) {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
const DAY_KEY_A = '2026-11-09' // эпоха daily → день №1
const DAY_KEY_B = '2026-11-10' // день №2

/** монеты за daily: 15+10+40+10 за раунд + 10×min(streak,7) */
const dailyCoinsPerfect = (streak) => 15 + 10 + 40 + 10 + 10 * Math.min(streak, 7)

async function setDateKey(page, key) {
  await page.evaluate((k) => window.__setDateKey(k), key)
  await page.waitForTimeout(150) // событие ax-date-change → пересчёт титула
}

/** пройти один раунд (все ответы верные) до ревила включительно */
async function playRoundPerfect(page, round) {
  await page.locator('[data-testid="btn-read-news"] button').click()
  await page.locator('[data-testid="btn-news-next"] button').waitFor()
  for (let i = 1; i < round.news.length; i++) {
    await page.locator('[data-testid="btn-news-next"] button').click()
    await page.waitForTimeout(120)
  }
  await page.locator('[data-testid="btn-news-next"] button').click()

  await page.locator('h2:has-text("О какой компании новости?")').waitFor()
  await page
    .locator('[data-testid^="quiz-opt-"] button')
    .filter({ hasText: round.answers.company })
    .first()
    .click()
  await page.locator('h2:has-text("В каком году это было?")').waitFor()
  await page
    .locator('[data-testid^="quiz-opt-"] button')
    .filter({ hasText: String(round.answers.year) })
    .first()
    .click()
  await page.locator(`[data-testid="btn-bet-${round.direction}"] button`).waitFor()
  await page.locator(`[data-testid="btn-bet-${round.direction}"] button`).click()
  await page.locator('[data-testid="btn-reveal-next"] button').waitFor()
}

/** уйти с ревила (первый тап может достраивать анимацию) */
async function revealNext(page) {
  for (let i = 0; i < 3; i++) {
    if ((await page.locator('[data-testid="btn-reveal-next"]').count()) === 0) return
    await page.locator('[data-testid="btn-reveal-next"] button').click()
    await page.waitForTimeout(350)
  }
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

/* ═══════════════════ СЦЕНАРИЙ ═══════════════════ */
async function scenarioCosmetics(browser) {
  const scenario = 'C косметика'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })

  /* ── (а) daily дня №1 ── */
  await setDateKey(page, DAY_KEY_A)

  const dailyText = await page.locator('[data-testid="btn-daily"]').innerText()
  check(scenario, 'титул: кнопка «Хроника дня №1»', low(dailyText).includes('хроникадня№1'), dailyText.trim())
  const dailyDisabled = await page.locator('[data-testid="btn-daily"] button').isDisabled()
  check(scenario, 'кнопка daily активна (сегодня не сыграно)', !dailyDisabled, '')

  // кейс дня детерминирован — сверяем с формулой rounds[hash % N]
  const expectedRound = rounds[hashDateKey(DAY_KEY_A) % rounds.length]
  check(
    scenario,
    'позже на ревиле тот же кейс, что даёт hash(dateKey) (справочно)',
    !!expectedRound,
    `${expectedRound?.id}`,
  )

  await page.locator('[data-testid="btn-daily"] button').click()
  const introBadge = await page.locator('[data-testid="daily-intro"]').innerText()
  check(scenario, 'интро daily: плашка «Хроника дня №1»', low(introBadge).includes('хроникадня№1'), introBadge.trim())

  await playRoundPerfect(page, expectedRound)
  const revealCompany = await page.locator('.reveal-company').innerText()
  check(
    scenario,
    'ревил daily: тот самый кейс дня (тикер совпал с hash)',
    norm(revealCompany).includes(expectedRound.ticker),
    `ревил: ${revealCompany.trim().slice(0, 24)}…, ждали ${expectedRound.ticker}`,
  )
  await revealNext(page)

  // итог дня
  await page.locator('[data-testid="daily-result"]').waitFor()
  const cardCount = await page.locator('.daily').count()
  check(scenario, 'DailyResultCard показан', cardCount === 1, `.daily=${cardCount}`)
  const resText = low(await page.locator('body').innerText())
  check(scenario, 'карточка: «Хроника №1»', resText.includes('хроника№1'), '')
  check(scenario, 'карточка: стрик 1', resText.includes('стрик1день'), '')
  const expectCoins = dailyCoinsPerfect(1)
  check(scenario, `карточка: монеты за день +${expectCoins}`, resText.includes(`+${expectCoins}`), '')
  check(scenario, 'кнопки «Поделиться» и «Забрать сундук» на месте',
    resText.includes('поделиться') && resText.includes('забратьсундук'), '')

  // storage: монеты и структура ax_daily
  const coinsA = await readStorage(page, 'ax_coins', -1)
  check(scenario, `ax_coins = ${expectCoins} (15+10+40+10 + 10×стрим1)`, coinsA === expectCoins, `ax_coins=${coinsA}`)
  const dailyA = await readStorage(page, 'ax_daily', null)
  check(
    scenario,
    'ax_daily валидна: {lastDateKey, streak:1, bestStreak:1, playedDays:1}',
    !!dailyA &&
      dailyA.lastDateKey === DAY_KEY_A &&
      dailyA.streak === 1 &&
      dailyA.bestStreak === 1 &&
      dailyA.playedDays === 1,
    JSON.stringify(dailyA),
  )

  // сундук дня: жемчужный (стрик 1, не кратен 7)
  await page.locator('[data-testid="btn-daily-chest"] button').click()
  await page.locator('[data-testid="chest-screen"]').waitFor()
  const chestType = await page.locator('[data-testid="chest-screen"]').getAttribute('data-chest')
  check(scenario, 'сундук за daily — жемчужный', chestType === 'pearl', `data-chest=${chestType}`)

  /* до первого открытого сундука ключа ax_inv может ещё не быть —
     дефолт инвентаря это ['skin-classic'] */
  const invBefore = (await readStorage(page, 'ax_inv', null)) ?? ['skin-classic']
  await page.locator('button:has-text("Открыть")').click()
  await page.locator('.cos-drop').waitFor()
  check(scenario, 'дроп показан (DropReveal)', (await page.locator('.cos-drop').count()) === 1, '')

  const dupPlate = await page.locator('.cos-drop__dup').count()
  check(scenario, 'в первый раз дубль выпасть не мог (плашки компенсации нет)', dupPlate === 0, `dup=${dupPlate}`)

  const invAfter = (await readStorage(page, 'ax_inv', [])) ?? []
  const added = invAfter.filter((id) => !invBefore.includes(id))
  check(
    scenario,
    'предмет добавлен в ax_inv (+1, не стартовый)',
    added.length === 1 && added[0] !== 'skin-classic' && invAfter.includes('skin-classic'),
    `было ${JSON.stringify(invBefore)} → стало ${JSON.stringify(invAfter)}`,
  )
  const dropId = added[0]
  const dropMeta = CATALOG[dropId]
  check(scenario, `выпавший предмет из каталога (${dropId})`, !!dropMeta, dropId)

  const dropNameShown = await page.locator('.cos-drop__name').innerText()
  check(scenario, 'имя предмета на ревиле совпадает с каталогом', dropNameShown.trim() === dropMeta.name, dropNameShown.trim())

  await page.locator('button:has-text("Забрать")').click()
  await page.locator('[data-testid="btn-play"]').waitFor()

  /* ── (б) день вперёд → daily снова доступен ── */
  await setDateKey(page, DAY_KEY_B)
  const dailyTextB = await page.locator('[data-testid="btn-daily"]').innerText()
  const disabledB = await page.locator('[data-testid="btn-daily"] button').isDisabled()
  check(scenario, 'день №2: кнопка «Хроника дня №2»', low(dailyTextB).includes('хроникадня№2'), dailyTextB.trim().replace(/\n/g, ' '))
  check(scenario, 'день №2: daily снова доступен', !disabledB, '')

  /* ── (в) гардероб и экипировка ── */
  // счётчик предметов на кнопке титула — проверяем до входа в гардероб
  check(
    scenario,
    `титул: счётчик предметов ${invAfter.length}/${ITEMS_TOTAL} на кнопке гардероба`,
    norm(await page.locator('[data-testid="btn-wardrobe"]').innerText()).includes(`${invAfter.length}/${ITEMS_TOTAL}`),
    '',
  )
  const titleCoins = norm(await page.locator('[data-testid="title-coins"]').innerText())
  check(scenario, `титул: баланс монет (${expectCoins}) у кнопки гардероба`, titleCoins.includes(String(expectCoins)), titleCoins)

  await page.locator('[data-testid="btn-wardrobe"] button').click()
  await page.locator('[data-testid="wardrobe-screen"]').waitFor()

  const wardrobeMeta = norm(await page.locator('[data-testid="wardrobe-coins"]').innerText())
  check(scenario, 'гардероб: баланс монет в шапке', wardrobeMeta.includes(String(expectCoins)), wardrobeMeta)

  // экипируем выпавшее
  await page.locator(`.wrd__tab:has-text("${KIND_TAB[dropMeta.kind]}")`).click()
  await page.locator(`button[aria-label^="${dropMeta.name} "]`).click()
  await page.waitForTimeout(200)
  const equip1 = await readStorage(page, 'ax_equip', null)
  check(
    scenario,
    `выпавшее надето: ax_equip.${KIND_SLOT[dropMeta.kind]} = ${dropId}`,
    !!equip1 && equip1[KIND_SLOT[dropMeta.kind]] === dropId,
    JSON.stringify(equip1),
  )

  // повторный тап по надетому = снять (кроме скина)
  await page.locator(`button[aria-label^="${dropMeta.name} "]`).click()
  await page.waitForTimeout(200)
  const equip2 = await readStorage(page, 'ax_equip', null)
  if (dropMeta.kind === 'skin') {
    check(scenario, 'скин не снимается повторным тапом', !!equip2 && equip2.skin === dropId, JSON.stringify(equip2))
  } else {
    check(
      scenario,
      'повторный тап по надетому снимает',
      !!equip2 && equip2[KIND_SLOT[dropMeta.kind]] === null,
      JSON.stringify(equip2),
    )
    // вернуть обратно
    await page.locator(`button[aria-label^="${dropMeta.name} "]`).click()
    await page.waitForTimeout(200)
  }

  /* кепка для проверки шляпы на титуле: дроп случаен, поэтому сеем
     hat-cap в инвентарь и перезагружаем страницу — заодно проверяем,
     что экипировка/инвентарь переживают новую сессию */
  await page.evaluate(() => {
    try {
      const inv = JSON.parse(window.localStorage.getItem('ax_inv') || '["skin-classic"]')
      if (Array.isArray(inv) && !inv.includes('hat-cap')) {
        inv.push('hat-cap')
        window.localStorage.setItem('ax_inv', JSON.stringify(inv))
      }
    } catch {
      /* ignore */
    }
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })
  await setDateKey(page, DAY_KEY_A) // оверрайд даты живёт в window — после reload пере-применяем

  // экипировка пережила перезагрузку
  const equipReload = await readStorage(page, 'ax_equip', null)
  check(
    scenario,
    'экипировка сохраняется между сессиями',
    !!equipReload && equipReload[KIND_SLOT[dropMeta.kind]] === dropId,
    JSON.stringify(equipReload),
  )

  await page.locator('[data-testid="btn-wardrobe"] button').click()
  await page.locator('[data-testid="wardrobe-screen"]').waitFor()
  await page.locator('.wrd__tab:has-text("Шляпы")').click()
  /* если выпала именно кепка — она уже надета, и первый тап по карточке
     СНЯЛ бы её (тап по надетому = снять): нужен второй тап обратно */
  const capClicks = dropId === 'hat-cap' ? 2 : 1
  for (let i = 0; i < capClicks; i++) {
    await page.locator('button[aria-label^="Кепка "]').click()
    await page.waitForTimeout(200)
  }
  const equip3 = await readStorage(page, 'ax_equip', null)
  check(scenario, 'кепка надета: ax_equip.hat = hat-cap', !!equip3 && equip3.hat === 'hat-cap', JSON.stringify(equip3))

  await page.locator('[data-testid="btn-wardrobe-back"] button').click()
  await page.locator('[data-testid="btn-play"]').waitFor()

  const titleViewBox = await page.locator('.title-axo .axo svg').getAttribute('viewBox')
  const hatGroup = await page.locator('.title-axo .axo-hat').count()
  check(scenario, 'титул: аксолотль в шляпе (группа .axo-hat)', hatGroup === 1, `.axo-hat=${hatGroup}`)
  check(scenario, 'титул: viewBox расширился под lift кепки', titleViewBox === '0 -3 26 25', `viewBox=${titleViewBox}`)

  /* ── (г) повторный вход в тот же день ── */
  await setDateKey(page, DAY_KEY_A)
  const dailyTextC = await page.locator('[data-testid="btn-daily"]').innerText()
  const disabledC = await page.locator('[data-testid="btn-daily"] button').isDisabled()
  check(scenario, 'та же дата: кнопка «Завтра новая хроника»', low(dailyTextC).includes('завтрановаяхроника'), dailyTextC.trim())
  check(scenario, 'та же дата: кнопка выключена', disabledC, '')

  /* ── (д) финальные инварианты ── */
  const coinsFinal = await readStorage(page, 'ax_coins', -1)
  check(scenario, 'монеты ≥ 0', typeof coinsFinal === 'number' && coinsFinal >= 0, `ax_coins=${coinsFinal}`)
  const dailyFinal = await readStorage(page, 'ax_daily', null)
  check(
    scenario,
    'структура ax_daily валидна (ключи и числа)',
    !!dailyFinal &&
      typeof dailyFinal.lastDateKey === 'string' &&
      typeof dailyFinal.streak === 'number' &&
      typeof dailyFinal.bestStreak === 'number' &&
      typeof dailyFinal.playedDays === 'number' &&
      dailyFinal.lastDateKey === DAY_KEY_A,
    JSON.stringify(dailyFinal),
  )
  const invFinal = await readStorage(page, 'ax_inv', [])
  check(scenario, 'инвентарь содержит skin-classic (носимое не удаляется)', invFinal.includes('skin-classic'), '')

  check(scenario, 'нет pageerror/console.error за прогон', errors.length === 0, errors.slice(0, 5).join(' | '))
  await ctx.close()
}

/* ═══════════════════ доп. экран 320×568: гардероб без скролла ═══════════════════ */
async function scenarioSmallScreen(browser) {
  const scenario = 'C 320×568'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({
    viewport: { width: 320, height: 568 },
    isMobile: true,
    hasTouch: true,
    locale: 'ru-RU',
  })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })
  await page.locator('[data-testid="btn-wardrobe"] button').click()
  await page.locator('[data-testid="wardrobe-screen"]').waitFor()

  const { sh, ih } = await page.evaluate(() => ({
    sh: document.scrollingElement ? document.scrollingElement.scrollHeight : document.documentElement.scrollHeight,
    ih: window.innerHeight,
  }))
  check(scenario, 'гардероб: документ не растёт (скролл внутри)', sh <= ih + 1, `scrollHeight=${sh} innerHeight=${ih}`)

  const { sw, iw } = await page.evaluate(() => ({
    sw: document.scrollingElement ? document.scrollingElement.scrollWidth : document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }))
  check(scenario, 'нет горизонтального скролла', sw <= iw, `scrollWidth=${sw} innerWidth=${iw}`)

  check(scenario, 'нет pageerror/console.error', errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

/* ═══════════════════ магазин сундуков за монеты ═══════════════════ */
const REFUND_BY_LABEL = { обычный: 20, редкий: 60, 'эпический': 200, легендарный: 500 }

async function scenarioShop(browser) {
  const scenario = 'C магазин'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)
  await ctx.addInitScript(() => {
    window.localStorage.setItem('ax_coins', '500')
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })
  await page.locator('[data-testid="btn-wardrobe"] button').click()
  await page.locator('[data-testid="wardrobe-screen"]').waitFor()

  // жемчужный доступен (500 ≥ 150), золотой доступен (500 ≥ 400)
  const pearlDisabled = await page.locator('[data-testid="btn-wardrobe-buy-pearl"] button').isDisabled()
  const goldDisabled = await page.locator('[data-testid="btn-wardrobe-buy-gold"] button').isDisabled()
  check(scenario, 'жемчужный (150) доступен при 500 монет', !pearlDisabled, '')
  check(scenario, 'золотой (400) доступен при 500 монет', !goldDisabled, '')

  // покупка жемчужного: −150 монет, экран сундука, возврат в гардероб
  await page.locator('[data-testid="btn-wardrobe-buy-pearl"] button').click()
  await page.locator('[data-testid="chest-screen"][data-chest="pearl"]').waitFor()
  const coinsAfterBuy = await readStorage(page, 'ax_coins', -1)
  check(scenario, 'монеты списаны: 500 − 150 = 350', coinsAfterBuy === 350, `ax_coins=${coinsAfterBuy}`)

  const invBeforeShop = (await readStorage(page, 'ax_inv', null)) ?? ['skin-classic']
  await page.locator('button:has-text("Открыть")').click()
  await page.locator('.cos-drop').waitFor()

  const rarityLabel = (await page.locator('.cos-drop__plate').innerText()).trim()
  const dupCount = await page.locator('.cos-drop__dup').count()
  const isDup = dupCount > 0
  const invAfterShop = (await readStorage(page, 'ax_inv', [])) ?? []
  const addedShop = invAfterShop.filter((id) => !invBeforeShop.includes(id))
  if (isDup) {
    const coinsAfterRefund = await readStorage(page, 'ax_coins', -1)
    const refund = REFUND_BY_LABEL[rarityLabel] ?? 0
    check(
      scenario,
      `дубль (${rarityLabel}): компенсация +${refund} начислена`,
      coinsAfterRefund === 350 + refund,
      `ax_coins=${coinsAfterRefund}`,
    )
    check(scenario, 'дубль: инвентарь не изменился', addedShop.length === 0, `+${addedShop.join(',')}`)
  } else {
    check(scenario, `новый предмет (${rarityLabel}) добавлен`, addedShop.length === 1, `+${addedShop.join(',')}`)
  }

  await page.locator('button:has-text("Забрать")').click()
  await page.locator('[data-testid="wardrobe-screen"]').waitFor()
  check(scenario, 'после сундука вернулись в гардероб', true, '')

  // остатка (350) не хватает на золотой (400)
  const goldDisabledAfter = await page.locator('[data-testid="btn-wardrobe-buy-gold"] button').isDisabled()
  check(scenario, 'золотой (400) недоступен при 350 монет', goldDisabledAfter, '')

  check(scenario, 'нет pageerror/console.error', errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

/* ═══════════════════ запуск ═══════════════════ */
const browser = await chromium.launch()
let failed = 0
try {
  await scenarioCosmetics(browser)
  await scenarioSmallScreen(browser)
  await scenarioShop(browser)
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
