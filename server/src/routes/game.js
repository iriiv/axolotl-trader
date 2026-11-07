import { Router } from 'express';
import { getGamePayload } from '../lib/content.js';

const router = Router();

router.get('/game', (req, res) => {
  const payload = getGamePayload();
  res.json({ version: payload.version, game: payload.game, rounds: payload.rounds });
});

export default router;
