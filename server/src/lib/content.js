import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = path.resolve(__dirname, '..', '..', 'content', 'rounds.json');
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

// ── Stable seeded PRNG (mulberry32) — same seed ⇒ same shuffle every run ──
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const out = [...arr];
  const rnd = mulberry32(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Chart building from raw MOEX rows ──
function buildChart(round, quote) {
  const rows = quote.rows;
  const { ticker, decisionDate, historyFrom, revealDays } = round;

  // Context: historyFrom <= date <= decisionDate; if historyFrom precedes
  // the first row, start from the beginning of the series.
  const ctx = rows.filter(
    (r) => (historyFrom ? r[0] >= historyFrom : true) && r[0] <= decisionDate
  );
  if (ctx.length === 0) {
    throw new Error(
      `Round ${round.id} (${ticker}): no context rows for decisionDate=${decisionDate}`
    );
  }

  const decisionIndex = ctx.length - 1; // index of last context row in the chart
  const decisionClose = ctx[decisionIndex][4];

  // Reveal: next revealDays rows AFTER the decision row in the full series.
  const decisionRowPos = rows.lastIndexOf(ctx[decisionIndex]);
  const reveal = rows.slice(decisionRowPos + 1, decisionRowPos + 1 + revealDays);
  if (reveal.length < 3) {
    throw new Error(
      `Round ${round.id} (${ticker}): only ${reveal.length} reveal rows available (need >= 3) after ${decisionDate}`
    );
  }

  const dates = [...ctx.map((r) => r[0]), ...reveal.map((r) => r[0])];
  const closes = [...ctx.map((r) => r[4]), ...reveal.map((r) => r[4])];

  const pct = (v) => Math.round(((v / decisionClose) - 1) * 1000) / 10;
  const movePct = pct(reveal[reveal.length - 1][4]);
  const revealMinPct = pct(Math.min(...reveal.map((r) => r[4])));
  const revealMaxPct = pct(Math.max(...reveal.map((r) => r[4])));
  const revealLastDate = reveal[reveal.length - 1][0];

  return {
    chart: { dates, closes, decisionIndex },
    movePct,
    revealMinPct,
    revealMaxPct,
    revealLastDate,
  };
}

// ── Build the whole payload once at startup; cached in module memory ──
function buildPayload() {
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  const rounds = content.rounds.map((round) => {
    const file = path.join(DATA_DIR, `${round.ticker}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Round ${round.id}: missing data file ${round.ticker}.json`);
    }
    const quote = JSON.parse(fs.readFileSync(file, 'utf8'));
    const built = buildChart(round, quote);

    // NOTE: `answers` (correct company/year) is deliberately NOT exposed —
    // the client must not be able to cheat from devtools.
    const { answers, ...publicRound } = round;
    if (!answers || !answers.company || !answers.year) {
      throw new Error(`Round ${round.id}: missing answers`);
    }

    return {
      ...publicRound,
      companyOptions: seededShuffle(round.companyOptions, `${round.id}:company`),
      yearOptions: seededShuffle(round.yearOptions, `${round.id}:year`),
      ...built,
    };
  });

  return { version: content.version, game: content.game, rounds };
}

let cache = null;

export function getGamePayload() {
  if (!cache) cache = buildPayload();
  return cache;
}
