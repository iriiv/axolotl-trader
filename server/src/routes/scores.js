import { Router } from 'express';
import db from '../db.js';

const router = Router();

const PLAYER_RE = /^[\p{L}\p{N} _-]+$/u; // letters (incl. cyrillic), digits, space, _ -

function isValidPlayer(v) {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  if (t.length < 1 || t.length > 14) return false;
  return PLAYER_RE.test(t);
}

const isInt = (v) => Number.isInteger(v);

const insertStmt = db.prepare(`
  INSERT INTO scores (player, score, rounds_total, directions_correct, best_streak)
  VALUES (@player, @score, @roundsTotal, @directionsCorrect, @bestStreak)
`);
const rankStmt = db.prepare('SELECT COUNT(*) AS n FROM scores WHERE score > ?');
const listStmt = db.prepare(`
  SELECT id, player, score, rounds_total AS roundsTotal,
         directions_correct AS directionsCorrect, best_streak AS bestStreak,
         created_at AS createdAt
  FROM scores
  ORDER BY score DESC, created_at ASC, id ASC
  LIMIT ?
`);
const totalStmt = db.prepare('SELECT COUNT(*) AS n FROM scores');

router.post('/scores', (req, res) => {
  const { player, score, roundsTotal, directionsCorrect, bestStreak } = req.body ?? {};

  if (!isValidPlayer(player)) {
    return res.status(400).json({ error: 'invalid_player' });
  }

  const valid =
    isInt(score) && score >= 0 && score <= 99999 &&
    isInt(roundsTotal) && roundsTotal >= 1 && roundsTotal <= 10 &&
    isInt(directionsCorrect) && directionsCorrect >= 0 && directionsCorrect <= roundsTotal &&
    isInt(bestStreak) && bestStreak >= 0 && bestStreak <= 10;

  if (!valid) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const info = insertStmt.run({
    player: player.trim(),
    score,
    roundsTotal,
    directionsCorrect,
    bestStreak,
  });
  const rank = 1 + rankStmt.get(score).n;
  res.status(201).json({ id: info.lastInsertRowid, rank });
});

router.get('/scores', (req, res) => {
  const parsed = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 10;
  res.json({ total: totalStmt.get().n, scores: listStmt.all(limit) });
});

export default router;
