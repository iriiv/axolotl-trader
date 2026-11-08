/* ═══════════════════════════════════════════════════════════════
   E2E-прогон «Аксолотль-трейдер» (playwright, iPhone 13).

   Сценарии (каждый — свежий контекст, чистый localStorage):
     1 «отличник»  — все квизы верно, все ставки верны → математика
                     очков, summary 5/5/5/5, сабмит, лидерборд
     2 «новичок»   — всё неверно → счёт 0, «Ты думал: …», sad-итог
     3 «тарапун»   — раунд 1: таймаут ставки (15с) → пропуск, 0 очков;
                     раунд 2: верная ставка → серия сломана, ×1
     4 «офлайн»    — сервер остановлен (E2E_OFFLINE=1) → локальный
                     рейтинг, боты, повторный заход без задержки

   Запуск: node scripts/e2e.mjs [1 2 3 4]
   База:   E2E_BASE=http://localhost:5173 (по умолчанию)
   ═══════════════════════════════════════════════════════════════ */

import { chromium, devices } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.E2E_BASE || 'http://localhost:5173'
const OFFLINE = process.env.E2E_OFFLINE === '1'
const SHOTS = path.join(ROOT, 'docs', 'screenshots')
mkdirSync(SHOTS, { recursive: true })

const gameJson = JSON.parse(
  readFileSync(path.join(ROOT, 'client', 'src', 'static', 'game.json'), 'utf8'),
)
const rounds = [...gameJson.rounds].sort((a, b) => a.order - b.order)
const meta = gameJson.game
const comboMult = (streak) => {
  let m = 1
  for (const s of meta.comboSteps) if (streak >= s.streak && s.mult > m) m = s.mult
  return m
}

/* ─────────── журнал проверок ─────────── */
const results = []
function check(scenario, name, ok, comment = '') {
  results.push({ scenario, name, ok, comment })
  console.log(`  ${ok ? '✅' : '❌'} ${name}${comment ? ` — ${comment}` : ''}`)
  return ok
}
const digits = (s) => Number(String(s).replace(/\D+/g, ''))
const norm = (s) => String(s).replace(/\s+/g, '')

/* ─────────── обёртка страницы: ошибки консоли/страницы ─────────── */
function watchErrors(page, sink) {
  page.on('pageerror', (err) => sink.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') sink.push(`console.error: ${msg.text()}`)
  })
}

async function hScrollOk(page, scenario, where) {
  const { sw, iw } = await page.evaluate(() => ({
    sw: document.scrollingElement ? document.scrollingElement.scrollWidth : document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }))
  return check(scenario, `нет горизонтального скролла @${where}`, sw <= iw, `scrollWidth=${sw} innerWidth=${iw}`)
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: false })
}

/* ─────────── шаги игры ─────────── */

async function startGame(page, scenario, nick) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('h1.title-logo').waitFor({ timeout: 15000 })
  await hScrollOk(page, scenario, 'title')
  await page.locator('[data-testid="btn-play"] button').click()
  await page.locator('[data-testid="input-nick"]').waitFor()
  await hScrollOk(page, scenario, 'nick')
  await page.fill('[data-testid="input-nick"]', nick)
  await page.locator('[data-testid="btn-nick-next"] button').click()
  await page.locator('[data-testid="btn-read-news"] button').waitFor()
}

/** ответить на квиз: label — текст варианта */
async function answerQuiz(page, label) {
  const btn = page.locator('[data-testid^="quiz-opt-"] button').filter({ hasText: label }).first()
  await btn.click()
}

/** прочитать «Очки раунда» с ревила → {company, year, dir, bonus, mult, total} */
async function readRoundPoints(page) {
  const rows = await page.locator('.statrow').all()
  const out = { company: null, year: null, dir: null, skipped: false, bonus: 0, mult: 1, total: 0 }
  for (const row of rows) {
    const label = norm(await row.locator('.statrow__label').innerText()).trim()
    const value = norm(await row.locator('.statrow__value').innerText()).trim()
    if (label.startsWith('Компания')) out.company = digits(value)
    else if (label.startsWith('Год')) out.year = digits(value)
    else if (label.startsWith('Ставка')) {
      out.skipped = label.includes('пропущена')
      const b = /бонус\+(\d+)/.exec(label)
      const m = /×(\d+[.,]?\d*)/.exec(label)
      out.bonus = b ? Number(b[1]) : 0
      out.mult = m ? Number(m[1].replace(',', '.')) : 1
      out.dir = value === '—' ? 0 : digits(value)
    } else if (label.startsWith('Итогозараунд')) out.total = digits(value)
  }
  return out
}

/** счёт из шапки (после анимации набегания) */
async function headerScore(page) {
  await page.waitForTimeout(650)
  const txt = await page.locator('.scr-head__score .score').first().innerText()
  return digits(txt)
}

/**
 * Пройти раунд.
 * opts: { company: 'right'|'wrong', year: 'right'|'wrong', bet: 'right'|'wrong'|null (timeout) }
 * Возвращает данные ревила + проверки экранов.
 */
async function playRound(page, scenario, round, roundNo, opts, extra = {}) {
  // ── интро ──
  await page.locator('[data-testid="btn-read-news"] button').waitFor()
  await hScrollOk(page, scenario, `intro r${roundNo}`)
  await page.locator('[data-testid="btn-read-news"] button').click()

  // ── новости: раскрыть все и перейти ──
  await page.locator('[data-testid="btn-news-next"] button').waitFor()
  for (let i = 1; i < round.news.length; i++) {
    await page.locator('[data-testid="btn-news-next"] button').click()
    await page.waitForTimeout(150)
  }
  await hScrollOk(page, scenario, `news r${roundNo}`)
  await page.locator('[data-testid="btn-news-next"] button').click()

  // ── квиз «компания» ──
  await page.locator('h2:has-text("О какой компании новости?")').waitFor()
  await hScrollOk(page, scenario, `quiz-company r${roundNo}`)
  const company =
    opts.company === 'right'
      ? round.answers.company
      : round.companyOptions.find((o) => o !== round.answers.company)
  await answerQuiz(page, company)
  await page.locator('h2:has-text("В каком году это было?")').waitFor()

  // ── квиз «год» ──
  await hScrollOk(page, scenario, `quiz-year r${roundNo}`)
  const year =
    opts.year === 'right'
      ? String(round.answers.year)
      : String(round.yearOptions.find((y) => y !== round.answers.year))
  await answerQuiz(page, year)
  await page.locator('[data-testid="btn-bet-up"] button').waitFor()

  // ── ставка ──
  await hScrollOk(page, scenario, `bet r${roundNo}`)
  const hasCanvas = await page.locator('.chart-panel canvas').count()
  check(scenario, `canvas графика на bet r${roundNo}`, hasCanvas === 1, `canvas=${hasCanvas}`)

  if (extra.antiSpoiler) {
    const text = await page.locator('body').innerText()
    const leak = String(round.answers.year)
    check(
      scenario,
      `анти-спойлер: «${leak}» не светится на bet r${roundNo}`,
      !text.includes(leak),
      text.includes(leak) ? 'год найден в DOM до ревила!' : 'чисто',
    )
  }

  if (opts.bet === null) {
    // ждём истечения таймера (15с + 800мс переход) — без действий
    await page.locator('text=Время вышло').waitFor({ timeout: 25000 })
    await page.locator('[data-testid="btn-reveal-next"] button').waitFor({ timeout: 15000 })
  } else {
    const dir = (opts.bet === 'right' ? round.direction : round.direction === 'up' ? 'down' : 'up')
    await page.locator(`[data-testid="btn-bet-${dir}"] button`).click()
    await page.locator('[data-testid="btn-reveal-next"] button').waitFor()
  }

  // ── ревил ──
  await hScrollOk(page, scenario, `reveal r${roundNo}`)
  const rc = await page.locator('.chart-panel canvas').count()
  check(scenario, `canvas графика на reveal r${roundNo}`, rc === 1, `canvas=${rc}`)

  const bodyText = norm(await page.locator('body').innerText())
  check(
    scenario,
    `текст урока на reveal r${roundNo}`,
    bodyText.includes(norm(round.explanation.lesson).slice(0, 40)),
  )

  const pts = await readRoundPoints(page)
  const score = await headerScore(page)
  if (extra.shot) await shot(page, extra.shot)
  return { pts, score }
}

/* ═══════════════════ СЦЕНАРИЙ 1 «отличник» ═══════════════════ */
async function scenario1(browser) {
  const scenario = 'S1 отличник'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)

  await startGame(page, scenario, 'QA_МАСТЕР')

  let prevScore = 0
  const perRound = []
  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]
    const extra = { antiSpoiler: i === 0, shot: i === 0 ? 'e2e-s1-bet-r1.png' : undefined }
    const { pts, score } = await playRound(page, scenario, round, i + 1, { company: 'right', year: 'right', bet: 'right' }, extra)
    const mult = comboMult(i + 1) // серия ПОСЛЕ раунда = i+1

    check(scenario, `r${i + 1}: компания +150`, pts.company === meta.points.company, `получили ${pts.company}`)
    check(scenario, `r${i + 1}: год +100`, pts.year === meta.points.year, `получили ${pts.year}`)
    check(scenario, `r${i + 1}: множитель ×${mult}`, Math.abs(pts.mult - mult) < 1e-9, `на экране ×${pts.mult}`)
    const lo = meta.points.direction * mult
    const hi = (meta.points.direction + meta.points.speedMax) * mult
    check(
      scenario,
      `r${i + 1}: очки ставки в диапазоне [${lo};${hi}]`,
      pts.dir >= lo && pts.dir <= hi,
      `ставка=+${pts.dir} (бонус +${pts.bonus})`,
    )
    const expectTotal = pts.company + pts.year + pts.dir
    check(scenario, `r${i + 1}: итого раунда = 150+100+ставка`, pts.total === expectTotal, `${pts.total} vs ${expectTotal}`)
    check(
      scenario,
      `r${i + 1}: счёт в шапке растёт на итого`,
      score - prevScore === pts.total,
      `${prevScore}→${score} (+${score - prevScore}, ждали +${pts.total})`,
    )
    prevScore = score
    perRound.push(pts)

    await page.locator('[data-testid="btn-reveal-next"] button').click()
  }

  // ── summary ──
  await page.locator('[data-testid="btn-send-score"] button').waitFor()
  await hScrollOk(page, scenario, 'summary')
  await shot(page, 'e2e-s1-summary.png')
  const sumText = norm(await page.locator('body').innerText())
  const expectedTotal = perRound.reduce((a, p) => a + p.total, 0)
  const scoreShown = digits(
    await page.locator('.pxcard:has-text("Статистика") .statrow:has-text("Очки") .statrow__value').innerText(),
  )
  check(scenario, 'итоговый счёт = сумма раундов', scoreShown === expectedTotal, `на экране ${scoreShown}, расчёт ${expectedTotal}`)
  check(scenario, 'очки на summary совпадают с расчётом', scoreShown === expectedTotal, `на экране ${scoreShown}, расчёт ${expectedTotal}`)
  check(scenario, 'summary: компании 5/5', sumText.includes('Компании✓5/5'), '')
  check(scenario, 'summary: годы 5/5', sumText.includes('Годы✓5/5'), '')
  check(scenario, 'summary: направления 5/5', sumText.includes('Направления✓5/5'), '')
  check(scenario, 'summary: серия 5 подряд', sumText.includes('Лучшаясерия5подряд'), '')
  // диапазон по формуле из ТЗ (timeLeftRatio неизвестен точно):
  // 1250 (квизы) + Σ (250..350) × множитель стрика ПОСЛЕ раунда [1, 1.2, 1.5, 2, 2.5]
  const multSum = 1 + meta.comboSteps.reduce((a, s) => a + s.mult, 0) // ×1 (r1) + ступени
  const lo = 1250 + meta.points.direction * multSum
  const hi = 1250 + (meta.points.direction + meta.points.speedMax) * multSum
  check(scenario, `счёт в теоретическом диапазоне [${lo};${hi}]`, scoreShown >= lo && scoreShown <= hi, `${scoreShown}`)

  // ── сабмит + лидерборд ──
  await page.locator('[data-testid="btn-send-score"] button').click()
  await page.locator('.lb-table').waitFor({ timeout: 15000 })
  await hScrollOk(page, scenario, 'leaderboard')
  const rankBadge = norm(await page.locator('.lb-yourplace').innerText().catch(() => ''))
  check(scenario, 'ранг показан после сабмита', /Твоёместо:\d+/i.test(rankBadge), rankBadge)
  const lbText = norm(await page.locator('body').innerText())
  check(scenario, 'лидерборд содержит QA_МАСТЕР', lbText.includes('QA_МАСТЕР'), '')
  check(scenario, 'онлайн-режим (без пометки локального рейтинга)', !lbText.includes('локальныйрейтинг'), '')
  await shot(page, 'e2e-s1-leaderboard.png')

  check(scenario, 'нет pageerror/console.error за игру', errors.length === 0, errors.slice(0, 5).join(' | '))
  await ctx.close()
}

/* ═══════════════════ СЦЕНАРИЙ 2 «новичок» ═══════════════════ */
async function scenario2(browser) {
  const scenario = 'S2 новичок'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)

  await startGame(page, scenario, 'QA_НОВИЧОК')

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]
    const { pts, score } = await playRound(page, scenario, round, i + 1, { company: 'wrong', year: 'wrong', bet: 'wrong' })
    check(scenario, `r${i + 1}: компания 0`, pts.company === 0, `${pts.company}`)
    check(scenario, `r${i + 1}: год 0`, pts.year === 0, `${pts.year}`)
    check(scenario, `r${i + 1}: ставка 0`, pts.dir === 0 && pts.total === 0, `ставка=${pts.dir} итого=${pts.total}`)
    check(scenario, `r${i + 1}: счёт остался 0`, score === 0, `счёт=${score}`)

    if (i === 0) {
      const revealText = norm(await page.locator('body').innerText())
      check(
        scenario,
        'ревил r1 показывает «Ты думал: …»',
        revealText.includes('Тыдумал:'),
        revealText.match(/Тыдумал:[^\n]*/)?.[0]?.slice(0, 60) || 'не найдено',
      )
      await shot(page, 'e2e-s2-reveal-r1.png')
    }
    await page.locator('[data-testid="btn-reveal-next"] button').click()
  }

  // ── summary: грустный аксолотль ──
  await page.locator('[data-testid="btn-send-score"] button').waitFor()
  await hScrollOk(page, scenario, 'summary')
  const sad = await page.locator('.sum-axo .axo--sad').count()
  check(scenario, 'summary: аксолотль sad', sad === 1, `axo--sad=${sad}`)
  const sumText = norm(await page.locator('body').innerText())
  check(scenario, 'summary: счёт 0', sumText.includes('Очки0'), '')
  check(scenario, 'summary: направления 0/5', sumText.includes('Направления✓0/5'), '')
  check(scenario, 'summary: серия 0 подряд', sumText.includes('Лучшаясерия0подряд'), '')
  await shot(page, 'e2e-s2-summary.png')

  // ── сабмит работает ──
  await page.locator('[data-testid="btn-send-score"] button').click()
  await page.locator('.lb-table').waitFor({ timeout: 15000 })
  const lbText = norm(await page.locator('body').innerText())
  check(scenario, 'сабмит: лидерборд открылся с QA_НОВИЧОК', lbText.includes('QA_НОВИЧОК'), '')
  const rankBadge = norm(await page.locator('.lb-yourplace').innerText().catch(() => ''))
  check(scenario, 'сабмит: ранг показан', /Твоёместо:\d+/i.test(rankBadge), rankBadge)

  check(scenario, 'нет pageerror/console.error за игру', errors.length === 0, errors.slice(0, 5).join(' | '))
  await ctx.close()
}

/* ═══════════════════ СЦЕНАРИЙ 3 «тарапун» ═══════════════════ */
async function scenario3(browser) {
  const scenario = 'S3 тарапун'
  console.log(`\n▶ ${scenario}`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)

  await startGame(page, scenario, 'QA_ТАРАПУН')

  // ── раунд 1: квизы верно, ставка — таймаут (ждём 16+ секунд без действий) ──
  const r1 = rounds[0]
  const res1 = await playRound(page, scenario, r1, 1, { company: 'right', year: 'right', bet: null }, { shot: 'e2e-s3-reveal-timeout.png' })
  check(scenario, 'r1 (таймаут): компания +150', res1.pts.company === 150, `${res1.pts.company}`)
  check(scenario, 'r1 (таймаут): год +100', res1.pts.year === 100, `${res1.pts.year}`)
  check(scenario, 'r1 (таймаут): ставка помечена пропущенной', res1.pts.skipped, '')
  check(scenario, 'r1 (таймаут): 0 очков за направление', res1.pts.dir === 0, `${res1.pts.dir}`)
  check(scenario, 'r1 (таймаут): итого = 250', res1.pts.total === 250, `${res1.pts.total}`)
  const reveal1 = norm(await page.locator('body').innerText())
  check(scenario, 'r1 (таймаут): пометка пропуска на ревиле', reveal1.includes('Ставка(пропущена)'), '')
  await page.locator('[data-testid="btn-reveal-next"] button').click()

  // ── раунд 2: квизы верно + верная ставка → серия сломана, началась заново (×1) ──
  const r2 = rounds[1]
  const bet2combo = await page
    .locator('.scr-head__combo')
    .count()
    .catch(() => 0) // на intro r2 серии нет — но intro уже позади; проверим на bet
  const res2 = await playRound(page, scenario, r2, 2, { company: 'right', year: 'right', bet: 'right' })
  check(scenario, 'r2: серия началась заново — множитель ×1', res2.pts.mult === 1, `на экране ×${res2.pts.mult}`)
  check(
    scenario,
    'r2: ставка = 250 + бонус без множителя',
    res2.pts.dir === 250 + res2.pts.bonus,
    `ставка=${res2.pts.dir} = 250+${res2.pts.bonus}`,
  )
  check(
    scenario,
    'r2: счёт = 250 (r1) + 250 (квизы) + ставка',
    res2.score === 250 + 250 + res2.pts.dir,
    `${res2.score}`,
  )
  await page.locator('[data-testid="btn-reveal-next"] button').click()

  // ── остальные раунды: верно (для завершения игры) ──
  for (let i = 2; i < rounds.length; i++) {
    await playRound(page, scenario, rounds[i], i + 1, { company: 'right', year: 'right', bet: 'right' })
    await page.locator('[data-testid="btn-reveal-next"] button').click()
  }

  await page.locator('[data-testid="btn-send-score"] button').waitFor()
  const sumText = norm(await page.locator('body').innerText())
  check(scenario, 'итог: направления 4/5 (1 пропуск)', sumText.includes('Направления✓4/5'), '')
  check(scenario, 'итог: лучшая серия 4 подряд (r2–r5)', sumText.includes('Лучшаясерия4подряд'), '')

  check(scenario, 'нет pageerror/console.error за игру', errors.length === 0, errors.slice(0, 5).join(' | '))
  await ctx.close()
}

/* ═══════════════════ СЦЕНАРИЙ 4 «офлайн» ═══════════════════ */
async function scenario4(browser) {
  const scenario = 'S4 офлайн'
  console.log(`\n▶ ${scenario} (сервер остановлен)`)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  watchErrors(page, errors)

  await startGame(page, scenario, 'QA_ОФЛАЙН')

  for (let i = 0; i < rounds.length; i++) {
    await playRound(page, scenario, rounds[i], i + 1, { company: 'right', year: 'right', bet: 'right' })
    await page.locator('[data-testid="btn-reveal-next"] button').click()
  }

  // ── сабмит в офлайне ──
  await page.locator('[data-testid="btn-send-score"] button').waitFor()
  const t0 = Date.now()
  await page.locator('[data-testid="btn-send-score"] button').click()
  await page.locator('.lb-table').waitFor({ timeout: 20000 })
  const submitMs = Date.now() - t0
  await hScrollOk(page, scenario, 'leaderboard (офлайн, первый вход)')
  const lbText = norm(await page.locator('body').innerText())
  check(scenario, 'пометка локального режима', lbText.includes('Сервернедоступен—локальныйрейтинг'), '')
  check(scenario, 'ранг с пометкой «(локально)»', /Твоёместо:\d+\(локально\)/i.test(lbText), lbText.match(/Твоёместо:[^\s]*/i)?.[0] || '')
  const bots = ['Квант_Лягушка', 'ДедИнвестор', 'Акси_2024'].filter((b) => lbText.includes(norm(b)))
  check(scenario, 'боты видны в офлайн-таблице', bots.length === 3, `видны: ${bots.join(', ')}`)
  check(scenario, 'QA_ОФЛАЙН в таблице', lbText.includes('QA_ОФЛАЙН'), '')
  await shot(page, 'e2e-s4-offline-leaderboard.png')

  // ── повторный заход в лидерборд — мгновенно (кеш офлайна) ──
  await page.locator('[data-testid="btn-menu"] button').click()
  await page.locator('[data-testid="btn-play"] button').waitFor()
  await page.locator('[data-testid="btn-leaderboard"] button').click()
  const t1 = Date.now()
  await page.locator('.lb-row:not(.lb-row--head)').first().waitFor({ timeout: 8000 })
  const secondMs = Date.now() - t1
  check(scenario, `повторный вход без задержки (кеш) — ${secondMs}мс`, secondMs < 800, `первый вход ${submitMs}мс`)
  const lbText2 = norm(await page.locator('body').innerText())
  check(scenario, 'повторно: локальный режим и боты на месте', lbText2.includes('локальныйрейтинг') && lbText2.includes('Квант_Лягушка'), '')

  // сетевые ошибки при мёртвом сервере — ожидаемы, не считаем pageerror'ами UI;
  // но console.error от fetch-падений тоже фиксируем отдельно:
  const netErrors = errors.filter((e) => /Failed to load resource|net::|fetch/i.test(e))
  console.log(`  ℹ️ сетевые ошибки (ожидаемы в офлайне): ${netErrors.length ? netErrors.slice(0, 2).join(' | ') : 'нет'}`)
  const uiErrors = errors.filter((e) => !netErrors.includes(e))
  check(scenario, 'нет pageerror/JS-ошибок за игру', uiErrors.length === 0, uiErrors.slice(0, 5).join(' | '))
  await ctx.close()
}

/* ═══════════════════ запуск ═══════════════════ */
const wanted = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= 4)
const run = wanted.length ? wanted : [1, 2, 3]

const browser = await chromium.launch()
let failed = 0
try {
  for (const n of run) {
    if (n === 1) await scenario1(browser)
    if (n === 2) await scenario2(browser)
    if (n === 3) await scenario3(browser)
    if (n === 4) await scenario4(browser)
  }
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
