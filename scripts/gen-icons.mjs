#!/usr/bin/env node
/** Генерация PNG-иконок приложения из favicon.svg (пиксельный аксолотль). */
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SVG = path.resolve(__dirname, '..', 'client', 'public', 'favicon.svg');
const OUT = path.resolve(__dirname, '..', 'client', 'public', 'icons');
const SIZES = [512, 192, 180];

const svg = await readFile(SVG, 'utf8');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of SIZES) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:#0d1b2e;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  );
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, `icon-${size}.png`) });
  console.log(`✓ icon-${size}.png`);
}
await browser.close();
