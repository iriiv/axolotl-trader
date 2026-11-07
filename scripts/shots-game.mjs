#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   Скриншоты игрового флоу «Аксолотль-трейдер» (iPhone 13, 390×844).
   Сценарий: title → ник «ТЕСТЕР» → интро → 3 новости → квиз
   компания/год → ставка «ВНИЗ» → ревил → … × 5 раундов → итоги →
   лидерборд. Сохраняет 9 файлов в docs/screenshots/.

   Запуск из корня проекта:
     node scripts/shots-game.mjs [--base http://localhost:5173]
   Если дев-сервер не поднят — скрипт сам поднимает vite и глушит
   его в конце.
   ═══════════════════════════════════════════════════════════════ */

import { chromium, devices } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'docs', 'screenshots')

const args = process.argv.slice(2)
const baseArgIdx = args.indexOf('--base')
const BASE =
  baseArgIdx >= 0 ? args[baseArgIdx + 1] : process.env.SHOTS_URL ?? 'http://localhost:5173'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

/* ── при необходимости поднимаем vite сами ── */
let viteChild = null
if (!(await reachable(BASE))) {
  console.log(`… ${BASE} не отвечает — поднимаю vite dev`)
  viteChild = spawn('npm', ['--prefix', path.join(root, 'client'), 'run', 'dev'], {
    stdio: 'ignore',
  })
  for (let i = 0; i < 80 && !(await reachable(BASE)); i++) await sleep(500)
  if (!(await reachable(BASE))) {
    console.error('✗ vite так и не поднялся')
    if (viteChild.pid) viteChild.kill('SIGTERM')
    process.exit(1)
  }
}

fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  ...devices['iPhone 13'],
  locale: 'ru-RU',
  timezoneId: 'Europe/Moscow',
})
const page = await context.newPage()

const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

const shot = async (name, opts = {}) => {
  const file = path.join(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: !!opts.full })
  console.log(`📸 ${name}`)
}

const click = async (testid) => {
  await page.locator(`[data-testid="${testid}"]`).first().click({ timeout: 9000 })
  await sleep(650)
}

try {
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 })

  /* 1 — титул */
  await sleep(1300)
  await shot('03-title')

  /* 2 — ник */
  await click('btn-play')
  await page.locator('[data-testid="input-nick"]').fill('ТЕСТЕР')
  await sleep(400)
  await shot('04-nick')
  await click('btn-nick-next')

  /* раунды 1..5 */
  const ROUNDS = 5
  for (let r = 1; r <= ROUNDS; r++) {
    // интро раунда
    await sleep(800)
    if (r === 1) await shot('05-round-intro')
    await click('btn-read-news')

    // новости: кнопка «Далее» ×2 (открывает 2-ю и 3-ю) + «Кто это?»
    for (let i = 0; i < 3; i++) {
      await sleep(550)
      if (r === 1 && i === 2) await shot('06-news')
      await click('btn-news-next')
    }

    // квиз: компания
    await sleep(600)
    if (r === 1) await shot('07-quiz')
    await click('quiz-opt-0')
    await sleep(1750) // авто-переход через 1.3с

    // квиз: год
    await sleep(450)
    await click('quiz-opt-0')
    await sleep(1750)

    // ставка
    await sleep(700)
    if (r === 1) await shot('08-bet')
    await click('btn-bet-down')

    // ревил: анимация 1.4с + бейдж/фанфары
    await sleep(3100)
    if (r === 1) await shot('09-reveal', { full: true })
    await click('btn-reveal-next')
  }

  /* итоги */
  await sleep(900)
  await shot('10-summary', { full: true })
  await click('btn-send-score')

  /* лидерборд */
  await sleep(1800)
  await shot('11-leaderboard', { full: true })
} catch (e) {
  errors.push('flow: ' + e.message)
}

await browser.close()
if (viteChild?.pid) viteChild.kill('SIGTERM')

if (errors.length) {
  console.log('⚠︎ проблемы:\n' + errors.slice(0, 10).join('\n'))
  process.exitCode = 1
} else {
  console.log(`✅ все скриншоты готовы: ${outDir}`)
}
