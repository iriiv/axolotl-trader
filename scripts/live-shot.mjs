#!/usr/bin/env node
/** Однострельный живой скриншот с фиксом резолва (Chromium host-resolver-rules). */
import { chromium, devices } from 'playwright';

const url = process.argv[2] || 'https://iriiv.github.io/axolotl-trader/';
const out = process.argv[3] || 'docs/screenshots/live-shot.png';
const browser = await chromium.launch({
  args: ['--host-resolver-rules=MAP iriiv.github.io 185.199.110.153'],
});
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
await browser.close();
console.log(`📸 ${out}${errors.length ? '\n⚠︎ ' + errors.join('\n') : ' — чисто'}`);
