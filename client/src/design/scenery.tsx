/* ═══════════════════════════════════════════════════════════════
    <SceneFlora/> — пиксель-водоросли и кораллы-силуэты по низу
    сцены-аквариума хаба. Матрицы строк: '#' = пиксель (currentColor),
    '.' = пусто. Покачиваются у корня (transform-origin: bottom),
    у каждого растения своя фаза и скорость — живой подводный лес.
    Компонент чистый: цвета и посадка — через CSS (scenery.css).
    ═══════════════════════════════════════════════════════════════ */

import './scenery.css'

/** высокая водоросль с боковыми листьями (8×20) */
const WEED_TALL = [
  '...##...',
  '...##...',
  '..###...',
  '..##.#..',
  '..##.#..',
  '.###.#..',
  '.##.##..',
  '.##.##..',
  '.#..#...',
  '.#..##..',
  '.#.##...',
  '.#.##...',
  '.##.#...',
  '.##..#..',
  '.#...#..',
  '.#.###..',
  '.##.....',
  '.##.....',
  '###.....',
  '###.....',
]

/** короткая водоросль-кустик (9×10) */
const WEED_SHORT = [
  '....#....',
  '#...#..#.',
  '#..##..#.',
  '##.#..##.',
  '##.#.###.',
  '###.####.',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
]

/** коралл-ветвистик (11×10) */
const CORAL = [
  '....#......',
  '#..###...#.',
  '##.#.#..##.',
  '.##.##.##..',
  '..#####.#..',
  '..#####.#..',
  '.#######.#.',
  '.########.',
  '..#######..',
  '..#####....',
]

export interface SceneFloraProps {
  className?: string
}

/** Рисует матрицу как <rect 1×1> в пиксельной сетке */
function Plant({ rows, label }: { rows: string[]; label: string }) {
  return (
    <svg
      className={`flora__plant flora__plant--${label}`}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rows.map((row, y) =>
        row.split('').map((ch, x) =>
          ch === '#' ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  )
}

/** Ряд растений по низу сцены: слева высокая водоросль, в центре
    коралл, справа кустик; всё покачивается мягким поворотом. */
export function SceneFlora({ className }: SceneFloraProps) {
  return (
    <div className={`flora${className ? ` ${className}` : ''}`} aria-hidden="true">
      <Plant rows={WEED_TALL} label="tall" />
      <Plant rows={CORAL} label="coral" />
      <Plant rows={WEED_SHORT} label="short" />
    </div>
  )
}
