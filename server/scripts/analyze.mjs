#!/usr/bin/env node
/**
 * Анализ данных MOEX: проверка исторических кейсов для игры.
 * Использование:
 *   node analyze.mjs                      — сводка по всем тикерам (диапазон, последний close)
 *   node analyze.mjs AFLT 2020-03-06 20   — close на дату, min/max/close через N дней, %
 *   node analyze.mjs SBER 2021-07-23 60 pct
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const fmt = n => (n == null ? '—' : n.toFixed(2));
const pct = (a, b) => (((b - a) / a) * 100).toFixed(1) + '%';

async function load(ticker) {
  const file = path.join(DATA_DIR, `${ticker.toUpperCase()}.json`);
  try {
    const j = JSON.parse(await readFile(file, 'utf8'));
    return j;
  } catch {
    throw new Error(`нет файла ${file}. Запусти: npm run fetch:moex`);
  }
}

function idxOfDate(rows, date) {
  // индекс строки, торговой даты <= date (последняя доступная до/на дату)
  let idx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] <= date) idx = i;
    else break;
  }
  return idx;
}

async function main() {
  const [ticker, dateStr, daysStr] = process.argv.slice(2);

  if (!ticker) {
    // сводка по всем
    const { readdir } = await import('node:fs/promises');
    const files = (await readdir(DATA_DIR)).filter(f => f.endsWith('.json') && !f.includes('db'));
    for (const f of files) {
      const j = await load(f.replace('.json', ''));
      const r = j.rows;
      console.log(`${j.ticker.padEnd(5)} ${String(j.name).padEnd(12)} ${String(r.length).padStart(5)} дней  ${r[0][0]} → ${r[r.length - 1][0]}  last close ${fmt(r[r.length - 1][4])}`);
    }
    return;
  }

  const j = await load(ticker);
  const rows = j.rows;

  if (!dateStr) {
    console.log(`${j.ticker} (${j.name}): ${rows.length} дней, ${rows[0][0]} → ${rows[rows.length - 1][0]}`);
    return;
  }

  const idx = idxOfDate(rows, dateStr);
  if (idx < 0) { console.error(`Нет данных до ${dateStr} (листинг с ${rows[0][0]})`); process.exit(1); }
  const days = parseInt(daysStr || '20', 10);
  const [d, , , , c] = rows[idx];
  const end = Math.min(idx + days, rows.length - 1);
  const window = rows.slice(idx + 1, end + 1);
  const closes = window.map(r => r[4]);
  const min = Math.min(...closes), max = Math.max(...closes);
  const last = window.length ? window[window.length - 1] : null;

  console.log(`${j.ticker} (${j.name})`);
  console.log(`  Решение: ${d}, close = ${fmt(c)}`);
  if (!window.length) { console.log('  Нет данных после даты решения!'); return; }
  console.log(`  Окно ${days} торговых дней: ${window[0][0]} → ${last[0]}`);
  console.log(`  close end = ${fmt(last[4])}  (${pct(c, last[4])})`);
  console.log(`  min = ${fmt(min)} (${pct(c, min)}), max = ${fmt(max)} (${pct(c, max)})`);
  console.log(`  направление: ${last[4] > c ? 'UP' : 'DOWN'}`);
  console.log(`  дней в окне: ${window.length}${end === rows.length - 1 ? ' (обрезано концом данных)' : ''}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
