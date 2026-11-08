# 🔍 DESIGN_AUDIT.md — аудит дизайн-системы «Аксолотль-трейдер»

Первый аудит конвейера design-lint (ревьюер дизайна). Источник истины —
[`client/src/design/DESIGN_SYSTEM.md`](./client/src/design/DESIGN_SYSTEM.md) (§-ссылки ниже — оттуда).

- **Робот-сверщик:** [`scripts/design-lint.mjs`](./scripts/design-lint.mjs) — playwright, `devices['iPhone 13']` (390×664, ru-RU), серверы как в e2e (`E2E_BASE=http://localhost:5173`, подняты `npm run dev`).
- **Метод:** прогон сценариев по скринам; на каждой точке — `page.evaluate` + `getComputedStyle` по всем видимым элементам (до ~21 000 проверок на точку). Правила — машиночитаемый массив `RULES` (L01–L12). Флаги: `--json` (машинный вывод для CI), `--selftest` (негативный контроль чувствительности — инъекция нарушений перед аудитом hub-home; ожиданно ловятся L02/L04/L06/L07).
- Скрипт не падает на отсутствующих элементах: точка/сценарий пропускается с пометкой `SKIP`.

Запуски: `node scripts/design-lint.mjs` · `node scripts/design-lint.mjs --json` · `node scripts/design-lint.mjs --selftest`

---

## 1. Правила RULES (машиночитаемые, в скрипте)

| ID | Sev | Правило | Проверка (check) |
|---|---|---|---|
| L01 | FAIL/WARN | Тап-таргеты ≥44×44 (§4, §10) | видимые `button/[role=button]/a/summary`: rect ≥44×44; **<40 — FAIL**, 40–43.9 — WARN |
| L02 | WARN | Шкала Tiny5 (§2) | px ∈ {15,16,18,20,25,30,35}; 22/24 — иконки-числа у кнопок; 13 — микро-плашки/подписи (§2 «микро», §8 таб-бар) |
| L03 | WARN | Шкала Golos Text (§2) | px ∈ {13,15,17,20} |
| L04 | FAIL | Радиус 0 (§13) | `border-radius ≠ 0` — FAIL; исключение — октагон ▶ (`[class*=hub-play]`, clip-path §8) |
| L05 | FAIL | Тени без blur (§11, §13) | `box-shadow`/`drop-shadow` с blur >0.5px; свечения редкостей `.dr--*`, `.chart-panel` — WARN |
| L06 | WARN | Палитра (§1) | `color`/`background-color`/`border-color` ∈ палитре tokens.css (`var()` + `color-mix` от неё); сырые чужие — WARN |
| L07 | FAIL/WARN | Иконки (§7) | svg в контролах ≥22 (16–21.9 WARN, <16 FAIL); таб-бар 30±2 — FAIL вне; декоративные ≥16 — WARN |
| L08 | FAIL | Линия таб-бара (§8) | высота бара 60±2; центры всех `.hub-tab__ico svg` на одной Y (разброс ≤2px); только точки хаба |
| L09 | FAIL/WARN | Контраст текста (§1) | ink/ink-dim на тёмном фоне: WCAG ≥4.2:1 (3.5–4.19 — WARN, <3.5 — FAIL) |
| L10 | WARN | Отступы по базе 4px (§3) | padding/margin прямых детей `.scr-main`/`.hub-section` ∈ {4,8,10,12,14,16,20,24,32}±1 (14px карточки и 10px compact — §3) |
| L11 | FAIL | Геометрия PixelButton (§5) | высота md 52 / lg 60 / xl 68 (±3px); рамка 3px (ghost 2px); шрифт 16/18/20 |
| L12 | FAIL | Overflow (§3) | `document.scrollWidth ≤ innerWidth+1`; `document.scrollHeight ≤ innerHeight+1` |

**Толкования, зафиксированные в RULES** (числа из DESIGN_SYSTEM.md, неоднозначности — в пользу документа):
- **L02, Tiny5@13**: §8 прямо задаёт «подпись 13px display» таб-бара, §2 — строку «микро». Разрешено для микро-плашек/подписей (`.hub-tab__label`, `.chip`, `.hub-chip`, `.hub-odds`, `.cos-card__name/__rar`, `.cos-drop__plate`, `.coach__step`, `.lb-row--head`, `.lesson__label`, `.title-streak` и витринных аналогов). Иной Tiny5-текст — строго по шкале.
- **L10**: §3 разрешает 14px (поля экрана, паддинги карточек, gap секций) и 10px (compact ≤700px) — включены в допустимое множество (формальное «кратен 4» противоречило бы §3 и топило бы аудит в ложных WARN).
- **L07**: спрайт-арт матриц (`.cos-card__ico`, `.cos-drop__item`, маскот, сундуки — README: «матрица 1:1») и частицы эффектов (искры/лучи дропов) — не UI-иконки, исключены; метки-статусы (замок, галка, метки дня) — декоративный ярус ≥16.
- **L06**: цвета элементов с активной CSS-анимацией/переходом цвета (пульс чипа дня, налив сегментов таймера) не сверяются статично — они interpolate между sanctioned-значениями.

---

## 2. Сводка «ДО → ПОСЛЕ»

Аудит «ДО» снят финальной версией линтера на исходном CSS (фиксы временно stash-нуты) — честное сравнение одного инструмента.

| Точка | ДО | ПОСЛЕ |
|---|---|---|
| hub-home | ⚠️ WARN ×3 | ✅ PASS |
| hub-play | ⚠️ WARN ×2 | ✅ PASS |
| hub-account | ⚠️ WARN ×2 | ✅ PASS |
| hub-wardrobe | ⚠️ WARN ×3 | ✅ PASS |
| hub-shop | ⚠️ WARN ×2 | ✅ PASS |
| registration | ✅ PASS | ✅ PASS |
| game-roundIntro | ⚠️ WARN ×2 | ✅ PASS |
| game-news | ✅ PASS | ✅ PASS |
| game-quizCompany | ⚠️ WARN ×2 | ✅ PASS |
| game-quizYear | ⚠️ WARN ×2 | ✅ PASS |
| game-bet | ⚠️ WARN ×1 | ✅ PASS |
| game-reveal | ⚠️ WARN ×10 | ✅ PASS |
| game-summary | ✅ PASS | ✅ PASS |
| leaderboard | ✅ PASS | ✅ PASS |
| #design (служебная, WARN-only) | ⚠️ WARN ×9 | ✅ PASS |
| **Итог** | **0 FAIL / 38 WARN** | **0 FAIL / 0 WARN** |

Ни одного FAIL до фиксов не было — структурных нарушений (тап-таргеты, радиусы, blur-тени, контраст, геометрия кнопок, overflow) нет. Все 38 WARN — типографика/отступы/размеры меток.

## 3. Нарушения «ДО» и фиксы (мелкие CSS-правки, без логики/API)

### L02 — Tiny5 вне шкалы (22 эл-та → 0)

| Точка | Элемент | Факт | Фикс |
|---|---|---|---|
| hub-home | `h1.title-logo.hub-logo` «Аксолотль-трейдер» | 31.2px (clamp 26–34 при ≤700px высоты) | `hub.css`: `.scr-hub .hub-logo { font-size: 30px }` |
| hub-home | `p.hub-hello` «Как тебя зовут…» | 19.5px (clamp 17–21) | `hub.css`: `20px` |
| hub-play/account/shop | `h2.hub-sec-title` | 23.4px (clamp 20–25) | `hub.css`: `25px` |
| hub-wardrobe | `h2.ward-title` «Гардероб» | 25.4px (clamp 22–27) | `cosmetics-screens.css`: `25px` |
| hub-wardrobe/shop | `span.ward-coins` (баланс) | 17px | `cosmetics-screens.css`: `15px` |
| game-roundIntro | `h2.intro-title` «Крымская весна» | 31.2px (clamp 26–35) | `screens.css`: `30px` |
| game-quiz×2 | `h2.quiz-q` | 23.4px (clamp 20–25) | `screens.css`: `25px` |
| game-bet | `h2.bet-title` | 25.4px (clamp 22–26) | `screens.css`: `25px` |
| game-reveal | `h2.reveal-company` + 8 букв каскада | 21px (clamp 18–21 при ≤700px) | `screens.css`: `20px` |

Причина массовых промахов — адаптивные `clamp(…vw…)`: на 390px они дают внесеточные значения (19.5/21/23.4/25.4/31.2). По §2 «иные размеры запрещены» — заменены на ближайшие ступени шкалы фиксированными px.

### L03 — Golos вне шкалы (1 → 0)

| Точка | Элемент | Факт | Фикс |
|---|---|---|---|
| game-reveal | `p.reveal-summary` | 14.5px | `screens.css`: `15px` |

### L10 — отступы вне базы 4px (7 → 0)

| Точка | Элемент | Факт | Фикс |
|---|---|---|---|
| hub-home | `footer.hub-actions` | padding-bottom 2px | `hub.css`: `4px` |
| hub-play/account | `h2.hub-sec-title` | padding-top 2px | `hub.css`: `4px` |
| game-quiz×2 | `h2.quiz-q` | padding-bottom 2px | `screens.css`: `4px` |
| game-roundIntro | `div.intro-top` | padding-top 6px | `screens.css`: `8px` |

### L07 — мелкие иконки/метки (12 → 0)

| Точка | Элемент | Факт | Фикс |
|---|---|---|---|
| hub-wardrobe, #design | `.cos-card__check svg` (галка «надето») | 12×10px | `cosmetics.css`: `16px` |
| #design | `.coach__x svg` (крестик coach, кнопка 44×44) | 18px | `ui.css`: `22px` (§7 «в кнопках 22px») |
| #design | `.daily__tick svg`, `.daily__dir svg` (метки дня) | 14px | `cosmetics.css`: `16px` |

### Профилактически (вне точек прогона, те же правила)

- `screens.css`: `.title-logo` — clamp(30,8.6vw,40)→`35px`, media≤700 →`30px`; `.sum-title` clamp→`30px`; @≤340px `.quiz-grid .opt__label` 14.5→`13px`; `.iconbtn svg` 20→`22px`.
- `cosmetics-screens.css`: `.chest-title` clamp→`25px`; `.title-streak svg` 13→`16px` (плашка-метка внутри кнопки); `.title-coins svg` 14→`16px` (иконка монеты в чипе хаба).
- `ui.css`: `.pxmodal__close svg` 20→`22px` (кнопка 52×52, §7).

Изменённые файлы: `client/src/screens.css`, `client/src/screens/hub.css`, `client/src/screens/cosmetics-screens.css`, `client/src/design/ui.css`, `client/src/design/cosmetics/cosmetics.css` — только значения размеров/отступов, селекторы и логика не тронуты.

## 4. Верификация

| Проверка | Результат |
|---|---|
| `npm --prefix client run build` | ✅ 0 ошибок (`✓ built in 669ms`) |
| `node scripts/e2e-hub.mjs` | ✅ **48/48 PASS** |
| `node scripts/design-lint.mjs` (финал) | ✅ **0 FAIL, 0 WARN** на 15 точках (exit 0) |
| `node scripts/design-lint.mjs --selftest` | ✓ чувствительность подтверждена: инъекции радиуса/шрифта/цвета/иконок пойманы L02/L04/L06/L07 |
| `node scripts/design-lint.mjs --json` | валидный JSON (15 точек, 12 правил, summary) — готов для CI |

## 5. Оставленное с рекомендациями (для оркестратора)

1. **Каскад `.hub-logo` vs `.title-logo`** (screens.css vs hub.css): оба правила специфичности 0-1-0, порядок решает импорт-цепочка — пришлось поднять до `.scr-hub .hub-logo`. Рекомендация: перенести титульные стили из screens.css в владельца хаба или добавить `@layer`, чтобы порядок не влиял.
2. **`.title-streak` внутри PixelButton** — иконка 16px (ярус «метка», §7 для аффорданс-иконок требует 22px). Элемент не рендерится в точках аудита (виден при стрике daily>0). Решение о семантике (метка vs иконка кнопки) — за лед-дизайнером.
3. **Витрина `#design` без скролл-контейнера**: корень `.u-pop-in` внутри `.app` (overflow hidden) — на низких экранах низ страницы может обрезаться (L12 ловит только рост документа). Рекомендация: обернуть DesignDemo в `.scr .scr-main`.
4. **Широкие спрайты предметов** (шляпы ~46×14px, `ItemIcon`) исключены из L07 как контент-арт с aspect-lock; если требуется минимальная высота 16px — это проп `size` в `Wardrobe.tsx` (уже не CSS-правка).
5. **`hub-chip svg` 16px** — чипы-статы пассивные (span), классифицированы декоративными (≥16 ✓). Если чипы считать контролами — поднять до 22px (визуальная правка, на усмотрение лед-дизайнера).
6. **`@≤340px` подпись таб-бара 12px** — задокументированное исключение §2, разрешено, не тронуто.
7. **CSS-анимации цвета** (пульс чипа дня) исключены из статичной палитры L06 — sanctioned (интерполяция между токенами).

## 6. Контур для CI

```
node scripts/design-lint.mjs            # exit 1 при любом FAIL
node scripts/design-lint.mjs --json     # машинный отчёт (точки/правила/нарушения)
node scripts/design-lint.mjs --selftest # негативный контроль (правила живые)
```

*Аудит провёл агент-ревьюер дизайна · виток DESIGN_ITERATION · линтер и отчёт сопровождаются вместе с DESIGN_SYSTEM.md.*
