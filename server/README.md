# ⚙️ Сервер «Аксолотль-трейдер: Биржевые хроники»

Express + better-sqlite3, чистый JS (ESM, без TS). Порт `4000` (переопределяется `PORT`).

## Запуск

```bash
cd server
npm install
npm start          # прод: node src/index.js
npm run dev        # разработка: node --watch src/index.js
```

При старте:
- открывается/создаётся `data/axolotl.db` (WAL), накатывается схема;
- если таблица `scores` пуста — сидируются 8 ботов с `created_at`, размазанным по прошлым дням;
- из `content/rounds.json` + `data/<TICKER>.json` строится и валидируется игровой
  payload (графики, movePct и т.п.) — битый раунд валит старт с понятной ошибкой;
- если существует `../client/dist` — раздаётся статика + SPA-фолбэк
  (любой GET не-`/api` → `index.html`).

## Эндпоинты

### `GET /api/health`

```bash
curl http://localhost:4000/api/health
# {"ok":true,"version":"1.0.0","rounds":5}
```

### `GET /api/game`

Полный игровой payload: `{version, game, rounds:[…]}`. Каждый раунд = контент из
`content/rounds.json` + построенный график:

- `chart.dates[]` / `chart.closes[]` — контекст (от `historyFrom` до `decisionDate`
  включительно) + `revealDays` строк после решения; `chart.decisionIndex` — индекс
  последней строки контекста;
- `movePct` — изменение close последней reveal-строки к close дня решения, %;
- `revealMinPct` / `revealMaxPct` — минимум/максимум reveal к close решения, %;
- `revealLastDate` — дата последней reveal-строки (`YYYY-MM-DD`);
- `companyOptions` / `yearOptions` — перемешаны детерминированно (seed от id раунда),
  правильный ответ встречается ровно один раз и не всегда первым.

```bash
curl http://localhost:4000/api/game | jq '.rounds[0] | {id, ticker, movePct, revealLastDate, decisionIndex: .chart.decisionIndex, n: (.chart.dates|length)}'
```

### `POST /api/scores`

Body: `{player, score, roundsTotal, directionsCorrect, bestStreak}`.

Валидация:
- `player` — строка, после trim 1..14 символов; буквы (вкл. кириллицу), цифры,
  пробел, `_`, `-` → иначе `400 {"error":"invalid_player"}`;
- `score` — целое 0..99999; `roundsTotal` — целое 1..10;
  `directionsCorrect` — целое 0..`roundsTotal`; `bestStreak` — целое 0..10
  → иначе `400 {"error":"invalid_payload"}` (битый JSON — тоже).

```bash
curl -X POST http://localhost:4000/api/scores \
  -H 'Content-Type: application/json' \
  -d '{"player":"Аксолотль","score":3500,"roundsTotal":5,"directionsCorrect":4,"bestStreak":3}'
# {"id":9,"rank":3}   (201; rank = 1 + число записей со score строго больше)
```

### `GET /api/scores?limit=10`

```bash
curl 'http://localhost:4000/api/scores?limit=10'
# {"total":8,"scores":[{"id":1,"player":"Квант_Лягушка","score":4120,"roundsTotal":5,
#   "directionsCorrect":5,"bestStreak":5,"createdAt":"2026-10-29 23:09:43"}, …]}
```

Сортировка: `score DESC, created_at ASC` (при равных — раньше созданная выше).
`limit` — целое 1..50, иначе значение по умолчанию 10.

### Прочее

- Неизвестный `/api/*` → `404 {"error":"not_found"}`.
- Неперехваченная ошибка → `500 {"error":"internal"}`.
- Лог запросов одной строкой (`метод путь статус мс`), кроме `/api/health`.

## Схема БД (`data/axolotl.db`)

```sql
CREATE TABLE IF NOT EXISTS scores (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  player             TEXT    NOT NULL,                 -- ник 1..14
  score              INTEGER NOT NULL,                 -- 0..99999
  rounds_total       INTEGER NOT NULL DEFAULT 5,
  directions_correct INTEGER NOT NULL DEFAULT 0,
  best_streak        INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

## Структура

```
server/
├── content/rounds.json     # игровой контент (владение оркестратора)
├── data/*.json             # котировки MOEX (scripts/fetch-moex.mjs)
├── data/axolotl.db         # SQLite (создаётся автоматически)
├── scripts/                # fetch-moex.mjs, analyze.mjs (не трогать)
└── src/
    ├── index.js            # express-приложение, статика, error handler
    ├── db.js               # открытие БД, схема, сид 8 ботов
    ├── lib/content.js      # rounds.json → графики + movePct, кэш в памяти
    └── routes/             # health.js, game.js, scores.js
```
