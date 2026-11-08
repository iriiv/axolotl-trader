#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   Offline-check PWA «Аксолотль-трейдер».

   1. Если нет client/dist — собирает прод (или всегда с флагом --build).
   2. Поднимает `vite preview` на :4173 (strictPort).
   3. Playwright: открывает титул → ждёт service worker (ready).
   4. context.setOffline(true) → перезагрузка → титул должен
      отрендериться из кэша SW, без pageerror.

   Запуск из корня проекта: node scripts/offline-check.mjs [--build]
   ═══════════════════════════════════════════════════════════════ */

import { chromium, devices } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clientDir = path.join(root, 'client')
const distIndex = path.join(clientDir, 'dist', 'index.html')
const PORT = 4173
const BASE = `http://localhost:${PORT}/`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const log = (s) => console.log(s)
const problems = []
const check = (name, ok, comment = '') => {
  log(`  ${ok ? '✅' : '❌'} ${name}${comment ? ` — ${comment}` : ''}`)
  if (!ok) problems.push(name)
}

async function waitFor(url, timeoutMs = 60_000) {
  for (let i = 0; i < timeoutMs / 500; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (res.ok) return true
    } catch {
      /* ещё не поднялся */
    }
    await sleep(500)
  }
  return false
}

/* ── 1. сборка (при необходимости или по флагу) ── */
if (process.argv.includes('--build') || !fs.existsSync(distIndex)) {
  log('… собираю прод: npm --prefix client run build')
  const buildOk = await new Promise((resolve) => {
    const child = spawn('npm', ['--prefix', clientDir, 'run', 'build'], { stdio: 'inherit' })
    child.on('exit', (code) => resolve(code === 0))
  })
  if (!buildOk) {
    console.error('✗ сборка упала')
    process.exit(1)
  }
} else {
  log('… client/dist уже собран (форс: --build)')
}

/* ── 2. preview-сервер ── */
log(`… поднимаю vite preview на :${PORT}`)
const preview = spawn(
  'npm',
  ['--prefix', clientDir, 'run', 'preview', '--', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore' },
)
try {
  if (!(await waitFor(BASE))) throw new Error('preview не поднялся')

  /* ── 3. онлайн-визит: титул + активация SW ── */
  const browser = await chromium.launch()
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45_000 })
  await page.locator('h1.title-logo').waitFor({ timeout: 15_000 })
  check('титул рендерится (онлайн)', true)

  // дожидаемся install+activate и прогрева кэша (шрифты — cache-first)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await sleep(1200)
  const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null)
  check('страница под контролем service worker', controlled)

  /* ── 4. офлайн-перезагрузка ── */
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('h1.title-logo').waitFor({ timeout: 15_000 })
  await page.locator('[data-testid="btn-play"] button').waitFor({ timeout: 10_000 })
  check('офлайн-перезагрузка: титул рендерится из кэша SW', true)

  const stillControlled = await page.evaluate(() => navigator.serviceWorker.controller !== null)
  check('офлайн: страница по-прежнему под SW', stillControlled)

  check('нет pageerror за весь прогон', errors.length === 0, errors.slice(0, 5).join(' | '))

  await browser.close()
} catch (e) {
  problems.push('флоу: ' + e.message)
  console.error('✗ ' + e.message)
} finally {
  if (preview.pid) preview.kill('SIGTERM')
}

if (problems.length) {
  console.log(`\n⚠︎ offline-check НЕ прошёл (${problems.length})`)
  process.exitCode = 1
} else {
  console.log('\n✅ offline-check зелёный: офлайн-режим работает')
}
