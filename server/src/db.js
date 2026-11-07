import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'axolotl.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player TEXT NOT NULL,
    score INTEGER NOT NULL,
    rounds_total INTEGER NOT NULL DEFAULT 5,
    directions_correct INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed: 8 bots with plausible stats, spread over past days.
const count = db.prepare('SELECT COUNT(*) AS n FROM scores').get().n;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO scores (player, score, rounds_total, directions_correct, best_streak, created_at)
    VALUES (@player, @score, @roundsTotal, @directionsCorrect, @bestStreak, datetime('now', @daysOffset))
  `);
  const bots = [
    { player: 'Квант_Лягушка',    score: 4120, roundsTotal: 5, directionsCorrect: 5, bestStreak: 5, daysOffset: '-9 days' },
    { player: 'ДедИнвестор',      score: 3865, roundsTotal: 5, directionsCorrect: 4, bestStreak: 3, daysOffset: '-8 days' },
    { player: 'Акси_2024',        score: 3410, roundsTotal: 5, directionsCorrect: 4, bestStreak: 2, daysOffset: '-7 days' },
    { player: 'ТрейдерГена',      score: 2950, roundsTotal: 5, directionsCorrect: 3, bestStreak: 2, daysOffset: '-6 days' },
    { player: 'МаржинКоллин',     score: 2675, roundsTotal: 5, directionsCorrect: 3, bestStreak: 2, daysOffset: '-5 days' },
    { player: 'Портфельчик',      score: 2230, roundsTotal: 5, directionsCorrect: 2, bestStreak: 2, daysOffset: '-3 days' },
    { player: 'ГречкаБаронесса',  score: 1780, roundsTotal: 5, directionsCorrect: 2, bestStreak: 1, daysOffset: '-2 days' },
    { player: 'Новичок_с_ЧС',     score: 1240, roundsTotal: 5, directionsCorrect: 1, bestStreak: 1, daysOffset: '-1 days' },
  ];
  const seed = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  seed(bots);
}

export default db;
