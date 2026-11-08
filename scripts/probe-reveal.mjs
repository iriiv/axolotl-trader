#!/usr/bin/env node
/** Зонд бага: график на ревиле. Прогон до ставки, клик, инспекция canvas. */
import { chromium, devices } from 'playwright';

const BASE = process.env.PROBE_URL || 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-testid=btn-play]').click();
await page.locator('input').fill('ЗОНД');
await page.locator('[data-testid=btn-nick-next]').click();
await page.locator('[data-testid=btn-read-news]').click();
for (let i = 0; i < 3; i++) {
  await page.locator('[data-testid=btn-news-next]').click();
  await page.waitForTimeout(400);
}
await page.locator('[data-testid=quiz-opt-0]').click();
await page.waitForTimeout(1700);
await page.locator('[data-testid=quiz-opt-0]').click();
await page.waitForTimeout(1700);

// экран ставки: canvas должен быть
const betCanvas = await page.locator('.chart-panel canvas').boundingBox();
console.log('BET canvas box:', JSON.stringify(betCanvas));

await page.locator('[data-testid=btn-bet-up]').click();
await page.waitForTimeout(2300);

// ревил: через 1.2с анимация почти докончена
const info = await page.evaluate(() => {
  const panels = [...document.querySelectorAll('.chart-panel')];
  return panels.map(p => {
    const r = p.getBoundingClientRect();
    const c = p.querySelector('canvas');
    const cr = c ? c.getBoundingClientRect() : null;
    return {
      panel: { w: Math.round(r.width), h: Math.round(r.height), display: getComputedStyle(p).display },
      canvas: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      canvasCount: p.querySelectorAll('canvas').length,
    };
  });
});
console.log('REVEAL chart-panels:', JSON.stringify(info, null, 1));
console.log('movepct badge:', await page.locator('.movepct').count());
await page.screenshot({ path: 'docs/screenshots/bug-reveal-probe.png' });
console.log(errors.length ? 'ОШИБКИ:\n' + errors.join('\n') : 'ошибок консоли нет');
await browser.close();
