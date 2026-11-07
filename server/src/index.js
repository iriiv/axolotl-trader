import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import healthRouter from './routes/health.js';
import gameRouter from './routes/game.js';
import scoresRouter from './routes/scores.js';
import './db.js'; // open + migrate + seed before serving traffic
import { getGamePayload } from './lib/content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// One-line request log (skipped for /api/health).
app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
});

app.use('/api', healthRouter); // GET /api/health
app.use('/api', gameRouter);   // GET /api/game
app.use('/api', scoresRouter); // GET/POST /api/scores

// Static SPA (production): serve client/dist if it exists.
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Unknown /api route → 404 JSON.
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

// Global error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Malformed JSON body from express.json() → 400, not 500.
  if (err.type === 'entity.parse.failed' || err.status === 400 || err.statusCode === 400) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large' });
  }
  console.error(err);
  res.status(500).json({ error: 'internal' });
});

// Build (and validate) game content at startup — fail fast on broken rounds.
getGamePayload();

app.listen(PORT, () => {
  console.log(`✅ axolotl-trader server listening on :${PORT}`);
});
