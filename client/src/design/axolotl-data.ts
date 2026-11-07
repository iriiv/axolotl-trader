/* ═══════════════════════════════════════════════════════════════
   ПИКСЕЛЬ-МАСКОТ «АКСОЛОТЛЬ» — матрицы
   Сетка 26×22 (ширина×высота), вид анфас, чиби-пропорции.
   Каждый символ = цвет из легенды, '.' = прозрачный.

   Здесь (и только здесь) допустимы «матричные» цвета вне tokens.css:
   #ffd9e8 (брюшко) и #2a1230 (глаза) — из ТЗ на маскота.
   ═══════════════════════════════════════════════════════════════ */

export type AxolotlMood = 'idle' | 'cheer' | 'sad' | 'wow' | 'read' | 'blink'

/** Легенда символов → CSS-цвета */
export const AXO_LEGEND: Record<string, string> = {
  O: 'var(--outline)', // тёмный контур
  P: 'var(--pink)', // тело
  L: '#ffd9e8', // брюшко и блики
  D: 'var(--pink-deep)', // румянец
  G: 'var(--gill)', // жабры-«веточки»
  E: '#2a1230', // глаза / рот / брови
  W: 'var(--ink)', // белый пиксель-блик в глазу
}

/* ── IDLE: базовое тело, открытые глаза, улыбка, румянец ── */
export const AXO_IDLE: string[] = [
  '...GG.....OOOOOO.....GG...',
  '...GGG..OPLLPPPPPO..GGG...',
  '.....GGOPLLPPPPPPPOGG.....',
  '......OPLLPPPPPPPPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPPEEEPPEEEPPO......',
  '......OPPWEEPPWEEPPO......',
  '......OPPEEEPPEEEPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPDPPEPPEPPDPO......',
  '......OPDPPPEEPPPDPO......',
  '......OPPPPPPPPPPPPO......',
  '.......OPPPPPPPPPPO.......',
  '........OPPLLLLPPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '.........OPLLLLPO.........',
  '........OPPO..OPPO........',
  '.........OOO..OOO.........',
  '..........................',
  '..........................',
]

/* ── BLINK: закрытые глаза (для авто-моргания в idle) ── */
export const AXO_BLINK: string[] = [
  '...GG.....OOOOOO.....GG...',
  '...GGG..OPLLPPPPPO..GGG...',
  '.....GGOPLLPPPPPPPOGG.....',
  '......OPLLPPPPPPPPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPPEEEPPEEEPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPDPPEPPEPPDPO......',
  '......OPDPPPEEPPPDPO......',
  '......OPPPPPPPPPPPPO......',
  '.......OPPPPPPPPPPO.......',
  '........OPPLLLLPPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '.........OPLLLLPO.........',
  '........OPPO..OPPO........',
  '.........OOO..OOO.........',
  '..........................',
  '..........................',
]

/* ── CHEER: глаза-«дуги» ^ ^, открытый рот, лапки подняты ── */
export const AXO_CHEER: string[] = [
  '...GG.....OOOOOO.....GG...',
  '...GGG..OPLLPPPPPO..GGG...',
  '.....GGOPLLPPPPPPPOGG.....',
  '......OPLLPPPPPPPPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPPPEPPPPEPPPO......',
  '......OPPEPEPPEPEPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPDPPEEEEPPDPO......',
  '......OPDPPPEEPPPDPO......',
  '.....OOPPPPPPPPPPPPOO.....',
  '....OPPOPPPPPPPPPPOPPO....',
  '.....OOPOPPLLLLPPOPOO.....',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '.........OPLLLLPO.........',
  '........OPPO..OPPO........',
  '.........OOO..OOO.........',
  '..........................',
  '..........................',
]

/* ── SAD: брови «домиком», грустный рот, без румянца (жабры опущены через CSS) ── */
export const AXO_SAD: string[] = [
  '...GG.....OOOOOO.....GG...',
  '...GGG..OPLLPPPPPO..GGG...',
  '.....GGOPLLPPPPPPPOGG.....',
  '......OPEEPPPPPPEEPO......',
  '......OPPPEPPPPEPPPO......',
  '......OPPEEEPPEEEPPO......',
  '......OPPWEEPPWEEPPO......',
  '......OPPEEEPPEEEPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPPPPPEEPPPPPO......',
  '......OPPPPEPPEPPPPO......',
  '......OPPPPPPPPPPPPO......',
  '.......OPPPPPPPPPPO.......',
  '........OPPLLLLPPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '.........OPLLLLPO.........',
  '........OPPO..OPPO........',
  '.........OOO..OOO.........',
  '..........................',
  '..........................',
]

/* ── WOW: широко раскрытые глаза (4 пикселя высотой), рот «о» ── */
export const AXO_WOW: string[] = [
  '...GG.....OOOOOO.....GG...',
  '...GGG..OPLLPPPPPO..GGG...',
  '.....GGOPLLPPPPPPPOGG.....',
  '......OPLLPPPPPPPPPO......',
  '......OPPEEEPPEEEPPO......',
  '......OPPEEEPPEEEPPO......',
  '......OPPWEEPPWEEPPO......',
  '......OPPEEEPPEEEPPO......',
  '......OPPPPPPPPPPPPO......',
  '......OPDPPPEEPPPDPO......',
  '......OPDPPPEEPPPDPO......',
  '......OPPPPPPPPPPPPO......',
  '.......OPPPPPPPPPPO.......',
  '........OPPLLLLPPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '........OPLLLLLLPO........',
  '.........OPLLLLPO.........',
  '........OPPO..OPPO........',
  '.........OOO..OOO.........',
  '..........................',
  '..........................',
]

/* ── READ: пиксель-очки + мини-газета в лапках ── */
export const AXO_READ: string[] = [
  '...GG.....OOOOOO.....GG...',
  '...GGG..OPLLPPPPPO..GGG...',
  '.....GGOPLLPPPPPPPOGG.....',
  '......OPLLPPPPPPPPPO......',
  '......OPOOOOO.OOOOOO......',
  '......OPOEEEOOOEEEOO......',
  '......OPOWEEOOOWEEOO......',
  '......OPOEEEOOOEEEOO......',
  '......OPOOOOO.OOOOOO......',
  '......OPDPPEPPEPPDPO......',
  '......OPDPPPEEPPPDPO......',
  '......OPPPPPPPPPPPPO......',
  '.......OPPPPPPPPPPO.......',
  '........OPPOOOOPPO........',
  '........OPOWEEWOPO........',
  '........OPOEWEWOPO........',
  '........OPOEWWEOPO........',
  '.........OPOOOOPO.........',
  '........OPPO..OPPO........',
  '.........OOO..OOO.........',
  '..........................',
  '..........................',
]

/* ── ЖАБРЫ: отдельные слои, 2 кадра «развевания» ── */

/** Кадр A — жабры спокойно расправлены */
export const AXO_GILLS_A: string[] = [
  '...GG................GG...',
  '...GGG..............GGG...',
  '.....GG............GG.....',
  '..........................',
  '...GG................GG...',
  '..GGGG..............GGGG..',
  '...GG................GG...',
  '....GG..............GG....',
  '...GGG..............GGG...',
  '...GG................GG...',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
]

/** Кадр B — кончики приподняты (лёгкое колыхание) */
export const AXO_GILLS_B: string[] = [
  '....GG..............GG....',
  '.....GG............GG.....',
  '.....GG............GG.....',
  '..........................',
  '..GG..................GG..',
  '...GGG..............GGG...',
  '....GG..............GG....',
  '....GG..............GG....',
  '...GGG..............GGG...',
  '....GG..............GG....',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
]

export const AXO_MOODS: Record<AxolotlMood, string[]> = {
  idle: AXO_IDLE,
  blink: AXO_BLINK,
  cheer: AXO_CHEER,
  sad: AXO_SAD,
  wow: AXO_WOW,
  read: AXO_READ,
}

/* ═══════════ ПИКСЕЛЬ-МОНЕТА «₽» 12×12 ═══════════ */

export const COIN_LEGEND: Record<string, string> = {
  O: 'var(--outline)',
  G: 'var(--gold)',
  D: '#cf9c10', // тёмное золото (только матрица)
  W: 'var(--ink)',
}

export const AXO_COIN: string[] = [
  '...OOOOOO...',
  '..OGGGGGGO..',
  '.OGGWWGGGGO.',
  '.OGGGDDDGGO.',
  '.OGGDGGGDGO.',
  '.OGGDGGGDGO.',
  '.OGGGDDDGGO.',
  '.OGGGGDGGGO.',
  '.OGGDDDDDGO.',
  '.OGGGGDGGGO.',
  '..OGGGGGGO..',
  '...OOOOOO...',
]
