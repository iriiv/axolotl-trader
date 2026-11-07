#!/usr/bin/env node
/**
 * Загрузка исторических данных по акциям с открытого API МосБиржи (MOEX ISS).
 * Данные: ежедневные свечи борда TQBR (основной рынок) с 2019-01-01 по сегодня.
 * Результат: server/data/<TICKER>.json
 *
 * API: https://www.moex.com/iss/reference/129 (history / securities)
 * Пагинация через history.cursor (INDEX, TOTAL, PAGESIZE).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const DEFAULT_TICKERS = ['SBER', 'AFLT', 'LKOH', 'GMKN', 'YNDX', 'OZON', 'POSI', 'VKUL', 'VTBR', 'TATN'];
const TICKERS = process.argv[2] ? process.argv[2].split(',').map(t => t.trim().toUpperCase()) : DEFAULT_TICKERS;
const FROM = process.env.MOEX_FROM || '2019-01-01';
const TILL = process.env.MOEX_TILL || new Date().toISOString().slice(0, 10);
const BASE = 'https://iss.moex.com/iss/history/engines/stock/markets/shares/boards/TQBR/securities';
const PAGE_DELAY_MS = 150;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchJson(url, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'axolotl-trader/0.1 (educational game)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(500 * attempt);
    }
  }
}

async function fetchTicker(ticker) {
  let start = 0;
  let shortName = ticker;
  const rows = [];
  for (;;) {
    const url = `${BASE}/${ticker}.json?from=${FROM}&till=${TILL}&iss.meta=off&iss.only=history,history.cursor&start=${start}`;
    const json = await fetchJson(url);
    const hist = json.history;
    if (!hist || !Array.isArray(hist.data) || hist.data.length === 0) break;
    const col = name => hist.columns.indexOf(name);
    const iD = col('TRADEDATE'), iN = col('SHORTNAME'), iO = col('OPEN'),
      iH = col('HIGH'), iL = col('LOW'), iC = col('CLOSE'), iV = col('VOLUME');
    for (const r of hist.data) {
      if (r[iC] == null) continue;
      if (r[iN]) shortName = r[iN];
      rows.push([r[iD], r[iO], r[iH], r[iL], r[iC], r[iV]]);
    }
    const cursor = json['history.cursor'];
    const [INDEX, TOTAL, PAGESIZE] = cursor.data[0];
    if (INDEX + PAGESIZE >= TOTAL) break;
    start += PAGESIZE;
    await sleep(PAGE_DELAY_MS);
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return { ticker, name: shortName, from: FROM, till: TILL, rows };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  console.log(`MOEX ISS: качаю ${TICKERS.length} тикеров, период ${FROM} → ${TILL}`);
  for (const ticker of TICKERS) {
    try {
      const payload = await fetchTicker(ticker);
      if (payload.rows.length === 0) {
        console.log(`  ⚠︎  ${ticker}: нет данных (не торгуется на TQBR в периоде)`);
        continue;
      }
      const file = path.join(DATA_DIR, `${ticker}.json`);
      await writeFile(file, JSON.stringify(payload));
      const first = payload.rows[0][0];
      const last = payload.rows[payload.rows.length - 1][0];
      console.log(`  ✓ ${ticker} (${payload.name}): ${payload.rows.length} дней, ${first} → ${last}`);
    } catch (err) {
      console.error(`  ✗ ${ticker}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log('Готово. Файлы в server/data/');
}

main();
