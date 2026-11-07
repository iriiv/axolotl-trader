#!/usr/bin/env node
/**
 * Скриншот страницы в мобильном вьюпорте (эмуляция iPhone 13).
 * Использование: node scripts/screenshot.mjs <url> <outfile.png> [--full] [--wait ms] [--click "Селектор,Селектор"]
 */
import { chromium, devices } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const [, , url, outfile, ...flags] = process.argv;
if (!url || !outfile) {
  console.error('usage: node scripts/screenshot.mjs <url> <outfile.png> [--full] [--wait ms] [--click "sel1,sel2"]');
  process.exit(1);
}
const fullPage = flags.includes('--full');
const waitMs = parseInt((flags.find(f => f.startsWith('--wait')) || '--wait 2500').split(' ')[1], 10);
const clickFlag = flags.find(f => f.startsWith('--click'));
const clicks = clickFlag ? clickFlag.slice(8).split(',').map(s => s.trim()).filter(Boolean) : [];

fs.mkdirSync(path.dirname(outfile), { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU', timezoneId: 'Europe/Moscow' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => errors.push('goto: ' + e.message));
for (const sel of clicks) {
  await page.locator(sel).first().click({ timeout: 8000 }).catch(e => errors.push(`click ${sel}: ` + e.message));
  await page.waitForTimeout(900);
}
await page.waitForTimeout(waitMs);
await page.screenshot({ path: outfile, fullPage });
await browser.close();

console.log(`📸 ${outfile}${fullPage ? ' (full)' : ''}${errors.length ? '\n⚠︎ ' + errors.slice(0, 5).join('\n⚠︎ ') : ''}`);
