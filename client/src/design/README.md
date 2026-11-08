# 🎨 Дизайн-система «Пиксельный ночной океан»

Дизайн-слой игры «Аксолотль-трейдер: Биржевые хроники». Мобильный WebView, тач-first,
вертикальный экран, большие кнопки. Стиль — 16-bit: жёсткие контуры 2–3px, тени-ступени,
сканлайны, пузырьки, ступенчатые анимации. Никаких border-radius, blur и полупрозрачных
размытий.

Запуск витрины: `npm run dev` → `http://localhost:5173` (App.tsx рендерит `<DesignDemo/>`).

---

## Файлы

| Файл | Что внутри |
|---|---|
| `tokens.css` | палитра (единственное место с hex), шрифты, фон океана, пузырьки, сканлайны, утилиты |
| `axolotl-data.ts` | пиксель-матрицы маскота (26×22) и монеты (12×12), легенда символов |
| `axolotl.tsx` / `axolotl.css` | компоненты `<Axolotl/>`, `<AxolotlCoin/>` и их анимации |
| `ui.tsx` / `ui.css` | UI-кит: кнопки, карточки, таймер, модалка и т.д. |
| `icons.tsx` | 13 пиксель-иконок 12×12 (инлайн-SVG, currentColor) |
| `sfx.ts` | 8-bit звуки на WebAudio, без ассетов |
| `haptics.ts` | вибрация через navigator.vibrate с guard'ами |
| `DesignDemo.tsx` / `demo.css` | живой стайлгайд — все компоненты и состояния |

---

## Палитра (tokens.css)

Все цвета в коде — только `var(...)`. Оттенки/заливки — через
`color-mix(in srgb, var(--x) N%, var(--panel))`. Добавлять hex в компоненты нельзя.

- Фон: `--bg-deep #081020`, `--bg #0d1b2e`, панели `--panel`, `--panel-2`, линии `--line`
- Текст: `--ink`, `--ink-dim`
- Акценты: `--aqua`, `--aqua-hi`, `--pink`, `--pink-deep`, `--gill`, `--gold`
- Рынок: `--up`, `--up-deep`, `--down`, `--down-deep`
- Контур: `--outline #071018`

Шрифты (подключены в index.html, swap): **Tiny5 400** — дисплей/заголовки/цифры
(класс `.display`), **Golos Text 400/500/600** — основной текст. Фолбэк — monospace.
Tiny5 — пиксельная сетка 5px с полной кириллицей; размеры кратны 5 (10–35px),
letter-spacing 0.06–0.1em, вес СТРОГО 400 (жирного нет, синтетика размывает пиксели).
Глифов ₽ ▲ ▼ ✓ в Tiny5 нет — стрелки это SVG-иконки, в текстах их не использовать.

Слои фона уже на `<body>`: градиент океана, два слоя всплывающих пиксель-пузырьков
(pure CSS, параллакс), сканлайны CRT поверх всего (`#root::after`). Для каркаса экрана
используй класс `.app` (safe-area + max-width 520px).

---

## Маскот

```tsx
import { Axolotl, AxolotlCoin } from './design/axolotl'

<Axolotl mood="idle" size={120} animated flip={false} onClick={...} />
<AxolotlCoin size={24} />
```

- **mood**: `'idle' | 'cheer' | 'sad' | 'wow' | 'read' | 'blink'`
  - `idle` — плавный синус-бобинг, авто-моргание каждые ~3.4с, жабры колышутся мягким поворотом ±2°;
  - `cheer` — прыжок по плавной дуге + искры-крестинки (scale+fade), глаза `^ ^`, лапки вверх;
  - `sad` — жабры опущены (CSS-поворот групп), брови домиком, слёзы плавно капают;
  - `wow` — широкие глаза 4px, рот «о», тремор масштаба;
  - `read` — пиксель-очки, газета в лапках;
  - `blink` — закрытые глаза (кадр для ручного моргания).
- **size** — ширина в px (высота = size·22/26), **animated** — выключает все анимации,
  **flip** — отзеркалить, **onClick** — превращает в кнопку (доступность включена).
- Слои анимаций развязаны: `axo-bob` (бобинг) → `axo-act` (прыжок/тремор) → svg →
  группы жабр/тела — состояния не конфликтуют.
- Матрицы: `axolotl-data.ts`, символ = цвет из `AXO_LEGEND`. Менять внешность — правь
  матрицы (строки строго 26 символов × 22). `AXO_COIN`/`COIN_LEGEND` — монета «₽».

---

## UI-кит (ui.tsx)

Все компоненты чистые, игровой логики нет. `PixelButton` и `OptionButton` сами играют
`sfx.tap()` + `haptic.tap()` (кроме disabled/muted).

### PixelButton
```tsx
<PixelButton variant="up" size="xl" full onClick={...} icon={<IconStar/>}>Рост</PixelButton>
```
`{ children, onClick?, variant?: 'primary'|'danger'|'gold'|'ghost'|'up'|'down',
size?: 'md'|'lg'|'xl' (52/60/68px), full?, disabled?, icon?, type?, className?, ariaLabel? }`
Варианты `up`/`down` автоматически получают пиксель-стрелки ▲/▼. :active — вдавливание
в тень.

### PixelCard
`{ children, title?, accent?: 'aqua'|'gold'|'pink'|'up'|'down', glow? }`
Панель с рамкой 2px, тенью 6px, дизеринг-полоской, угловыми «заклёпками» акцента.
Заголовок — плашка с ушками. `glow` — пульсирующий жёсткий контур (без blur).

### OptionButton (варианты квиза)
```tsx
<OptionButton index={0} label="Аэрофлот" hint="флагман" state="selected" onClick={...}/>
```
`{ label, hint?, state?: 'default'|'correct'|'wrong'|'muted'|'selected', onClick?, index? }`
Чип-буква А/Б/В/Г из `index` (без index — без чипа). `correct` — зелёная вспышка + упругий
pulse (scale 1→1.06→1 spring), `wrong` — shake (резкий, с затуханием) + красное затухание,
`muted` — приглушён и некликабелен.

### TimerBar — два режима
1. **Собственный таймер**: `<TimerBar seconds={15} running paused={false} onEnd={...}/>`
   rAF-отсчёт; при 0 `onEnd` дёргается один раз. Перезапуск — переключи `running`
   false→true (или смени `seconds`), либо просто смонтируй заново через `key`.
2. **Внешний прогресс**: `<TimerBar progress={0.63}/>` — рисует переданное значение
   (удобно, когда отсчёт ведёт игровой движок).

Прочее: `segments` (по умолчанию 15). Цвет фаз: aqua → gold → down, последние сегменты
мягко пульсируют. Сегменты наливаются/гаснут плавно (transition 200ms linear), дискретных
щелчков нет. Высота ~34px.

### SpeechBubble
`{ children, side?: 'left'|'right' }` — пузырь с хвостиком-лесенкой (clip-path,
контур через drop-shadow без blur).

### ComboMeter / HeartsBar
`<ComboMeter streak={3} multiplier={1.5}/>` — при стрике ≥2 загорается огонь и множитель
становится золотым. `<HeartsBar hearts={2} max={3}/>` — пиксель-сердечки.

### ScoreCounter
`<ScoreCounter value={1250} animateOn={roundNo}/>`
Число плавно «набегает» (600мс ease-out tween через framer-motion), зачисление —
с лёгким punch-масштабом всего числа. `animateOn` — ключ перепуска (любое значение;
если не задан, анимация на каждый change `value`). Формат — `toLocaleString('ru-RU')`.

### Modal
`{ open, onClose, title?, children }` — bottom-sheet: выезд снизу с пружинным
overshoot, пиксель-шапка, крестик 52×52, Escape/клик по фону закрывают, скролл
тела блокируется.

### Мелочи
- `Badge { children, color?: 'aqua'|'gold'|'pink'|'up'|'down'|'ink' }` — плашка (РАУНД 2/5).
- `ProgressBar { value: 0..1, color?, segments? }` — сегментный прогресс.
- `Divider {}` — пиксельный пунктир.
- `Chip { children, color? }` — мини-тэг факта.
- `StatRow { label, value, accent?: 'gold'|'up'|'down'|'aqua'|'ink' }` — строка итогов
  с точечным лидером.

### Иконки (icons.tsx)
`IconArrowUp, IconArrowDown, IconCoin, IconFlask, IconBook, IconTrophy, IconSoundOn,
IconSoundOff, IconQuestion, IconStar, IconClock, IconHeart, IconClose` —
пропсы `{ size?: number (16), className?, style?, title? }`, цвет через `color`
(currentColor). Универсальный вариант: `<PixelIcon name="coin" size={20}/>`.

---

## Звук и хаптика

```tsx
import { sfx } from './design/sfx'
sfx.tap(); sfx.correct(); sfx.wrong(); sfx.tick(); sfx.reveal(); sfx.fanfare(); sfx.pop()
sfx.setMuted(true); sfx.isMuted() // состояние хранится в localStorage
```
AudioContext создаётся лениво при первом вызове (после жеста пользователя). Мастер-гейн
0.15 + DynamicsCompressor — клиппинг исключён. Огибающие без щелчков.

```tsx
import { haptic } from './design/haptics'
haptic.tap() // 12мс
haptic.success() // [18,40,24]
haptic.error() // [42,54,42]
```
Молча пропускается, если navigator.vibrate недоступен.

---

## Заметки по анимациям

Принцип: **пиксельная ГРАФИКА — плавное ДВИЖЕНИЕ**. Рамки, спрайты, дизеринг и
палитра остаются жёстко-ретро, а всё, что движется, — на современных кривых.

- Кривые и длительности — токены в tokens.css: `--ease-spring` (overshoot),
  `--ease-out`, `--ease-inout`, `--dur-fast/-mid/--slow`.
- Переходы экранов, stagger-каскады, конфетти и монеты — framer-motion
  (spring `{stiffness:320,damping:30}` для экранов).
- `steps()` в проекте больше не используется; тряска ошибки осталась резкой
  по смещениям, но с ease-out затуханием.
- Утилиты в tokens.css: `.u-pop-in` (пружинистое появление с overshoot),
  `.u-shake` (ошибка), `.u-flash` (ревил), `.display` (дисплейный шрифт).
- Слои CRT (виньетка/сканлайны/аберрация/блик) — компонент `CrtOverlay`,
  тумблер на титуле, `localStorage 'ax_crt'`.
- `prefers-reduced-motion` гасит CSS-анимации; framer-motion уважает через
  `MotionConfig reducedMotion="user"`.
- Тач: все интерактивы ≥52px, `:active` — быстрый сдвиг (ease-out) и пружинный
  возврат, hover-зависимых состояний нет.
