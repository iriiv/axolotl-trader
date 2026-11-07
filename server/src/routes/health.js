import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getGamePayload } from '../lib/content.js';

const router = Router();

const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
);

router.get('/health', (req, res) => {
  res.json({ ok: true, version: pkg.version, rounds: getGamePayload().rounds.length });
});

export default router;
