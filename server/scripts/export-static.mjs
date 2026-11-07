#!/usr/bin/env node
/**
 * Статический экспорт игровых данных для автономного режима клиента
 * (GitHub Pages: бекенда нет — клиент играет на вшитых данных).
 * Выход: client/src/static/game.json — тот же формат, что GET /api/game,
 * плюс answers (клиентский ревил) и seedScores (боты для локального лидерборда).
 *
 * Запуск: node server/scripts/export-static.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGamePayload } from '../src/lib/content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = path.resolve(__dirname, '..', 'content', 'rounds.json');
const OUT_DIR = path.resolve(__dirname, '..', '..', 'client', 'src', 'static');
const OUT_PATH = path.join(OUT_DIR, 'game.json');

// Те же боты, что и в server/src/db.js — для паритета локального лидерборда.
const SEED_SCORES = [
  { player: 'Квант_Лягушка', score: 4120, roundsTotal: 5, directionsCorrect: 5, bestStreak: 5, createdAt: '2026-10-30 12:00' },
  { player: 'ДедИнвестор', score: 3865, roundsTotal: 5, directionsCorrect: 4, bestStreak: 3, createdAt: '2026-10-31 12:00' },
  { player: 'Акси_2024', score: 3410, roundsTotal: 5, directionsCorrect: 4, bestStreak: 2, createdAt: '2026-11-01 12:00' },
  { player: 'ТрейдерГена', score: 2950, roundsTotal: 5, directionsCorrect: 3, bestStreak: 2, createdAt: '2026-11-02 12:00' },
  { player: 'МаржинКоллин', score: 2675, roundsTotal: 5, directionsCorrect: 3, bestStreak: 2, createdAt: '2026-11-03 12:00' },
  { player: 'Портфельчик', score: 2230, roundsTotal: 5, directionsCorrect: 2, bestStreak: 2, createdAt: '2026-11-05 12:00' },
  { player: 'ГречкаБаронесса', score: 1780, roundsTotal: 5, directionsCorrect: 2, bestStreak: 1, createdAt: '2026-11-06 12:00' },
  { player: 'Новичок_с_ЧС', score: 1240, roundsTotal: 5, directionsCorrect: 1, bestStreak: 1, createdAt: '2026-11-07 12:00' },
];

const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
const payload = getGamePayload();

// Возвращаем answers (для клиентского ревила) — на Pages игра всё равно
// клиентская, а в dev-режиме приоритет у живого API без ответов не нужен:
// MVP проверяет ответы локально (TODO v2: серверная проверка).
const answersById = new Map(content.rounds.map(r => [r.id, r.answers]));
const rounds = payload.rounds.map(r => ({ ...r, answers: answersById.get(r.id) }));

const out = {
  exportedAt: new Date().toISOString(),
  static: true,
  version: payload.version,
  game: payload.game,
  rounds,
  seedScores: SEED_SCORES,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(out));
const kb = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
console.log(`✓ ${path.relative(process.cwd(), OUT_PATH)} (${kb} KB, ${rounds.length} раундов)`);
