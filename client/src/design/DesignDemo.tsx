/* ═══════════════════════════════════════════════════════════════
   DesignDemo — живой стайлгайд дизайн-системы.
   Витрина: палитра, типографика, кнопки, маскот, квиз-контролы,
   таймер, комбо, счёт, модалка, звуки, иконки.
   Фронтендер заменит это на игровые экраны.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import { Axolotl, AxolotlCoin } from './axolotl'
import type { AxolotlMood } from './axolotl'
import { sfx } from './sfx'
import { haptic } from './haptics'
import './demo.css'
import {
  Badge,
  Chip,
  CoachTip,
  ComboMeter,
  Divider,
  HeartsBar,
  Modal,
  OptionButton,
  PixelButton,
  PixelCard,
  ProgressBar,
  ScoreCounter,
  SpeechBubble,
  StatRow,
  TimerBar,
} from './ui'
import type { OptionState } from './ui'
import {
  IconArrowDown,
  IconArrowUp,
  IconBook,
  IconCalendar,
  IconChest,
  IconClock,
  IconClose,
  IconCoin,
  IconFire,
  IconFlask,
  IconHeart,
  IconLock,
  IconPlay,
  IconQuestion,
  IconShirt,
  IconSoundOff,
  IconSoundOn,
  IconSpark,
  IconStar,
  IconTrophy,
  IconUser,
} from './icons'
import {
  ACCS,
  CHESTS,
  COSMETICS_BY_ID,
  Chest,
  ChestOpen,
  DailyResultCard,
  DropReveal,
  HATS,
  ItemCard,
  SKINS,
  Wardrobe,
} from './cosmetics'
import type { ChestType, CosmeticKind } from './cosmetics'

const MOODS: AxolotlMood[] = ['idle', 'cheer', 'sad', 'wow', 'read', 'blink']
const MOOD_LABEL: Record<AxolotlMood, string> = {
  idle: 'idle',
  cheer: 'cheer',
  sad: 'sad',
  wow: 'wow',
  read: 'read',
  blink: 'blink',
}

/* демо-данные секции «Кастомизация» (без игровой логики) */
const CHEST_TYPES: ChestType[] = ['wooden', 'pearl', 'gold']
const DEMO_OWNED = [...SKINS, ...HATS, ...ACCS].map((i) => i.id).filter((id) => id !== 'hat-wizard')
const DEMO_DROPS = [
  COSMETICS_BY_ID['hat-cap'],
  COSMETICS_BY_ID['acc-monocle'],
  COSMETICS_BY_ID['skin-gold'],
  COSMETICS_BY_ID['acc-briefcase'],
  COSMETICS_BY_ID['hat-bull'],
]
const DEMO_DAILY = [
  { ticker: 'AFLT', year: 2020, hit: true, up: true },
  { ticker: 'SBER', year: 2014, hit: true, up: false },
  { ticker: 'LKOH', year: 2008, hit: false, up: true },
]

const PALETTE: Array<[string, string]> = [
  ['bg-deep', 'var(--bg-deep)'],
  ['bg', 'var(--bg)'],
  ['panel', 'var(--panel)'],
  ['panel-2', 'var(--panel-2)'],
  ['line', 'var(--line)'],
  ['ink', 'var(--ink)'],
  ['ink-dim', 'var(--ink-dim)'],
  ['aqua', 'var(--aqua)'],
  ['aqua-hi', 'var(--aqua-hi)'],
  ['pink', 'var(--pink)'],
  ['pink-deep', 'var(--pink-deep)'],
  ['gill', 'var(--gill)'],
  ['gold', 'var(--gold)'],
  ['up', 'var(--up)'],
  ['down', 'var(--down)'],
  ['outline', 'var(--outline)'],
]

export function DesignDemo() {
  /* маскот */
  const [mood, setMood] = useState<AxolotlMood>('idle')
  const nextMood = () => setMood((m) => MOODS[(MOODS.indexOf(m) + 1) % MOODS.length])

  /* квиз */
  const companies = ['Аэрофлот', 'Сбербанк', 'VK Технологии', 'Лукойл']
  const [selected, setSelected] = useState<number | null>(null)
  const [answer, setAnswer] = useState<'none' | 'correct' | 'wrong'>('none')
  const optState = (i: number): OptionState => {
    if (answer !== 'none' && selected !== null) {
      if (i === selected) return answer
      return 'muted'
    }
    return i === selected ? 'selected' : 'default'
  }

  /* таймер */
  const [timerKey, setTimerKey] = useState(0)
  const [timerRunning, setTimerRunning] = useState(true)
  const [timerPaused, setTimerPaused] = useState(false)

  /* очки и комбо */
  const [score, setScore] = useState(1250)
  const [streak, setStreak] = useState(0)
  const mult = [1, 1, 1.2, 1.5, 2, 2.5][Math.min(streak, 5)]

  /* модалка и звук */
  const [modalOpen, setModalOpen] = useState(false)
  const [muted, setMuted] = useState(sfx.isMuted())
  useEffect(() => sfx.setMuted(muted), [muted])

  /* кастомизация: что надето (состояние — «снаружи» компонентов) */
  const [cSkin, setCSkin] = useState('skin-gold')
  const [cHat, setCHat] = useState<string | undefined>(undefined)
  const [cAcc, setCAcc] = useState<string | undefined>(undefined)
  const equip = (kind: CosmeticKind, id: string | null) => {
    if (kind === 'skin') setCSkin(id ?? 'skin-classic')
    else if (kind === 'hat') setCHat(id ?? undefined)
    else setCAcc(id ?? undefined)
  }

  /* демо открытия сундука: дроп идёт по кругу */
  const [chestOpened, setChestOpened] = useState(false)
  const [dropIdx, setDropIdx] = useState(0)
  const resetChest = () => {
    setChestOpened(false)
    setDropIdx((i) => (i + 1) % DEMO_DROPS.length)
  }

  return (
    <div className="u-pop-in">
      {/* ═══ ХЕДЕР ═══ */}
      <header className="demo-hero">
        <Axolotl mood={mood} size={124} onClick={nextMood} />
        <h1 className="demo-hero__title display">Аксолотль-трейдер</h1>
        <p className="demo-hero__sub">Биржевые хроники · стайлгайд дизайн-системы</p>
        <SpeechBubble side="left">
          Привет! Я Аксоль. Ткни в меня — я умею радоваться, грустить, удивляться и читать
          финансовые новости!
        </SpeechBubble>
      </header>

      {/* ═══ КНОПКИ (§5 DESIGN_SYSTEM — «объёмные» NES-кнопки) ═══ */}
      <h2 className="demo-h2">Кнопки</h2>
      <p className="demo-note">
        Объёмная пиксель-кнопка: рамка 3px, двухступенчатая верхняя грань, световая линия
        (свет сверху / тень снизу) и ступень-тень 4/5/6px. :active — перенос в тень,
        возврат пружиной. Тап-таргеты 52–68px.
      </p>
      <div className="demo-col">
        <div className="demo-row">
          <PixelButton variant="primary" size="md">
            Играть
          </PixelButton>
          <PixelButton variant="gold" size="md">
            Награда
          </PixelButton>
          <PixelButton variant="danger" size="md">
            Сброс
          </PixelButton>
        </div>
        <div className="demo-row">
          <PixelButton variant="primary" size="lg" icon={<IconPlay size={22} />}>
            Играть
          </PixelButton>
          <PixelButton variant="gold" size="lg" icon={<IconTrophy size={22} />}>
            Награда
          </PixelButton>
          <PixelButton variant="danger" size="lg">
            Сброс
          </PixelButton>
        </div>
        <div className="demo-row">
          <PixelButton variant="up" size="xl" full>
            Рост
          </PixelButton>
        </div>
        <div className="demo-row">
          <PixelButton variant="down" size="xl" full>
            Падение
          </PixelButton>
        </div>
        <div className="demo-row">
          <PixelButton variant="ghost" size="md" icon={<IconQuestion size={22} />}>
            Подсказка
          </PixelButton>
          <PixelButton variant="primary" size="md" disabled>
            Недоступно
          </PixelButton>
        </div>
      </div>

      {/* ═══ ПАЛИТРА ═══ */}
      <h2 className="demo-h2">Палитра океана</h2>
      <div className="swatches">
        {PALETTE.map(([name, v]) => (
          <div className="swatch" key={name}>
            <div className="swatch__color" style={{ background: v }} />
            <div className="swatch__name">{name}</div>
          </div>
        ))}
      </div>

      {/* ═══ ТИПОГРАФИКА ═══ */}
      <h2 className="demo-h2">Типографика</h2>
      <PixelCard title="Шрифты" accent="aqua">
        <div className="type-sample">
          <div className="type-sample__h1">Tiny5 — заголовки</div>
          <div className="type-sample__h2">Раунд 3 из 5 · AFLT · 2020</div>
          <div className="type-sample__num">+1250 · 12,4%</div>
          <div className="type-sample__num type-sample__num--down">−340 · 8,1%</div>
          <p className="type-sample__p">
            Golos Text — основной текст: читается с экрана телефона, кириллица первого
            класса. Плотный, дружелюбный, без засечек.
          </p>
        </div>
      </PixelCard>

      {/* ═══ МАСКОТ ═══ */}
      <h2 className="demo-h2">Настроения аксолотля</h2>
      <PixelCard title="Маскот" accent="pink">
        <div className="axo-stage">
          <Axolotl mood={mood} size={140} onClick={nextMood} />
          <div className="mood-chips">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                className={`mood-chip ${m === mood ? 'is-on' : ''}`}
                onClick={() => setMood(m)}
              >
                {MOOD_LABEL[m]}
              </button>
            ))}
          </div>
          <p className="demo-note">
            В idle аксолотль моргает и покачивает жабрами сам. Тап по маскоту переключает
            настроение по кругу.
          </p>
        </div>
      </PixelCard>

      {/* ═══ КАСТОМИЗАЦИЯ ═══ */}
      <h2 className="demo-h2">Кастомизация</h2>
      <p className="demo-note">
        Скины — палитровые ремапы легенды спрайта, шляпы/аксессуары — матрицы поверх
        аксолотля. Каталог, сундуки и гардероб — presentation-only: экономику и инвентарь
        подключает фронтендер.
      </p>

      <PixelCard title="Гардероб" accent="pink">
        <Wardrobe skin={cSkin} hat={cHat} acc={cAcc} ownedIds={DEMO_OWNED} onEquip={equip} />
      </PixelCard>

      <div className="demo-col">
        <PixelCard title="Все скины" accent="aqua">
          <div className="cos-demo-row">
            {SKINS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`cos-demo-cell${cSkin === s.id ? ' is-on' : ''}`}
                onClick={() => setCSkin(s.id)}
                title={s.desc}
              >
                <Axolotl skin={s.id} size={62} animated={false} />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </PixelCard>

        <PixelCard title="Все шляпы" accent="gold">
          <div className="cos-demo-row">
            {HATS.map((h) => (
              <button
                key={h.id}
                type="button"
                className={`cos-demo-cell${cHat === h.id ? ' is-on' : ''}`}
                onClick={() => setCHat(h.id)}
                title={h.desc}
              >
                <Axolotl skin="skin-classic" hat={h.id} size={56} animated={false} />
                <span>{h.name}</span>
              </button>
            ))}
          </div>
        </PixelCard>

        <PixelCard title="Все аксессуары" accent="up">
          <div className="cos-demo-row">
            {ACCS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`cos-demo-cell${cAcc === a.id ? ' is-on' : ''}`}
                onClick={() => setCAcc(a.id)}
                title={a.desc}
              >
                <Axolotl skin="skin-classic" acc={a.id} size={56} animated={false} />
                <span>{a.name}</span>
              </button>
            ))}
          </div>
        </PixelCard>
      </div>

      <PixelCard title="Смоук: gold + корона + бабочка" accent="pink">
        <div className="axo-stage">
          <Axolotl skin="skin-gold" hat="hat-crown" acc="acc-bow" size={150} />
        </div>
      </PixelCard>

      <PixelCard title="Сундуки" accent="gold" glow>
        <div className="cos-demo-row">
          {CHEST_TYPES.map((t) => (
            <div className="cos-demo-cell" key={t}>
              <Chest type={t} open={false} size={96} />
              <span>{CHESTS[t].name}</span>
            </div>
          ))}
        </div>
        <div className="cos-demo-row">
          {CHEST_TYPES.map((t) => (
            <div className="cos-demo-cell" key={`open-${t}`}>
              <Chest type={t} open size={96} />
              <span>{CHESTS[t].name} · открыт</span>
            </div>
          ))}
        </div>
        <Divider />
        <ChestOpen
          chest="gold"
          opened={chestOpened}
          item={DEMO_DROPS[dropIdx]}
          duplicateCoins={dropIdx % 2 === 1 ? 150 : null}
          onOpen={() => {
            setChestOpened(true)
            sfx.reveal()
            haptic.success()
          }}
          onEquip={() => {
            const drop = DEMO_DROPS[dropIdx]
            equip(drop.kind, drop.id)
            resetChest()
          }}
          onTake={resetChest}
        />
      </PixelCard>

      <PixelCard title="Редкости и дроп" accent="aqua">
        <div className="cos-demo-grid">
          <ItemCard item={COSMETICS_BY_ID['skin-classic']} equipped />
          <ItemCard item={COSMETICS_BY_ID['hat-cap']} />
          <ItemCard item={COSMETICS_BY_ID['acc-monocle']} />
          <ItemCard item={COSMETICS_BY_ID['hat-crown']} />
          <ItemCard item={COSMETICS_BY_ID['acc-laser']} />
          <ItemCard item={COSMETICS_BY_ID['hat-wizard']} owned={false} />
        </div>
        <Divider />
        <DropReveal
          item={COSMETICS_BY_ID['skin-holo']}
          duplicateCoins={240}
        />
      </PixelCard>

      <h2 className="demo-h2">Итог дня (daily)</h2>
      <DailyResultCard
        dayNo={17}
        cells={DEMO_DAILY}
        streakDays={4}
        coins={350}
        dateLabel="8 ноября"
      />

      {/* ═══ КВИЗ ═══ */}
      <h2 className="demo-h2">Варианты ответа</h2>
      <PixelCard title="Какая это компания?" accent="aqua" glow>
        <div className="demo-col">
          {companies.map((c, i) => (
            <OptionButton
              key={c}
              index={i}
              label={c}
              hint={i === 1 ? 'подсказка: ставка ЦБ' : undefined}
              state={optState(i)}
              onClick={() => {
                setSelected(i)
                setAnswer('none')
              }}
            />
          ))}
          <div className="demo-row">
            <PixelButton
              variant="ghost"
              size="md"
              onClick={() => setAnswer('correct')}
            >
              Верно
            </PixelButton>
            <PixelButton variant="ghost" size="md" onClick={() => setAnswer('wrong')}>
              Ошибка
            </PixelButton>
            <PixelButton
              variant="ghost"
              size="md"
              onClick={() => {
                setSelected(null)
                setAnswer('none')
              }}
            >
              Сброс
            </PixelButton>
          </div>
        </div>
      </PixelCard>

      {/* ═══ ТАЙМЕР ═══ */}
      <h2 className="demo-h2">Таймер ставки</h2>
      <p className="demo-note">
        15 сегментов, rAF-отсчёт. Цвет: аква → золото → красный. По истечении — onEnd.
      </p>
      <div className="demo-col">
        <TimerBar
          key={timerKey}
          seconds={15}
          running={timerRunning}
          paused={timerPaused}
          onEnd={() => {
            sfx.wrong()
            haptic.error()
            setTimerRunning(false)
          }}
        />
        <div className="demo-row">
          <PixelButton
            variant="ghost"
            size="md"
            onClick={() => {
              setTimerKey((k) => k + 1)
              setTimerRunning(true)
              setTimerPaused(false)
            }}
          >
            Заново
          </PixelButton>
          <PixelButton variant="ghost" size="md" onClick={() => setTimerPaused((p) => !p)}>
            {timerPaused ? 'Продолжить' : 'Пауза'}
          </PixelButton>
        </div>
      </div>

      {/* ═══ ОЧКИ / КОМБО ═══ */}
      <h2 className="demo-h2">Очки и комбо</h2>
      <PixelCard title="Результат раунда" accent="gold">
        <div className="demo-col">
          <div className="demo-row" style={{ justifyContent: 'space-between' }}>
            <ScoreCounter value={score} />
            <AxolotlCoin size={30} />
          </div>
          <ComboMeter streak={streak} multiplier={mult} />
          <HeartsBar hearts={Math.max(1, 3 - Math.floor(streak / 3))} max={3} />
          <div className="demo-row">
            <PixelButton variant="up" size="md" onClick={() => setScore((s) => s + 250)}>
              +250
            </PixelButton>
            <PixelButton variant="gold" size="md" onClick={() => setScore((s) => s + 1000)}>
              +1000
            </PixelButton>
            <PixelButton
              variant="danger"
              size="md"
              onClick={() => {
                setScore((s) => Math.max(0, s - 400))
                setStreak(0)
              }}
            >
              −400
            </PixelButton>
            <PixelButton variant="ghost" size="md" onClick={() => setStreak((s) => (s + 1) % 6)}>
              Стрик +1
            </PixelButton>
          </div>
        </div>
      </PixelCard>

      {/* ═══ БЕЙДЖИ / ЧИПЫ / ПРОГРЕСС ═══ */}
      <h2 className="demo-h2">Бейджи, чипы, прогресс</h2>
      <PixelCard title="Мелкая графика" accent="up">
        <div className="demo-col">
          <div className="demo-row">
            <Badge color="aqua">Раунд 2/5</Badge>
            <Badge color="gold">IT</Badge>
            <Badge color="pink">2020</Badge>
            <Badge color="up">рост</Badge>
            <Badge color="down">обвал</Badge>
          </div>
          <div className="demo-row">
            <Chip color="aqua">MOEX</Chip>
            <Chip color="gold">IPO</Chip>
            <Chip color="pink">AFLT</Chip>
            <Chip color="ink">90 дней</Chip>
          </div>
          <ProgressBar value={1 / 5} color="aqua" />
          <ProgressBar value={0.62} color="gold" />
          <ProgressBar value={0.9} color="down" />
          <Divider />
          <StatRow label="Компания угадана" value="+150" accent="up" />
          <StatRow label="Скоростной бонус" value="+100" accent="gold" />
          <StatRow label="Комбо ×2" value="+500" accent="gold" />
          <StatRow label="Итого за раунд" value="1250" accent="gold" />
        </div>
      </PixelCard>

      {/* ═══ ПУЗЫРИ ═══ */}
      <h2 className="demo-h2">Реплики</h2>
      <SpeechBubble side="left">
        Слева — я говорю. Хвостик-лесенка из пиксельных ступеней!
      </SpeechBubble>
      <SpeechBubble side="right">
        Справа — когда реплика игрока или второе действующее лицо.
      </SpeechBubble>

      {/* ═══ МОДАЛКА ═══ */}
      <h2 className="demo-h2">Модальное окно</h2>
      <PixelButton variant="primary" size="lg" onClick={() => setModalOpen(true)}>
        Показать итоги
      </PixelButton>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Итоги игры">
        <div className="demo-col">
          <div className="demo-row">
            <Axolotl mood="cheer" size={96} />
            <div className="demo-col" style={{ gap: 4 }}>
              <Badge color="gold">Лидерборд · топ-10</Badge>
              <p className="demo-note" style={{ margin: 0 }}>
                Инвестиционный инстинкт уровня «акула»!
              </p>
            </div>
          </div>
          <Divider />
          <StatRow label="Очки" value="4125" accent="gold" />
          <StatRow label="Направлений верно" value="4 из 5" accent="up" />
          <StatRow label="Лучшая серия" value="×2.5" accent="gold" />
          <PixelButton variant="primary" size="lg" full onClick={() => setModalOpen(false)}>
            Ещё раз!
          </PixelButton>
        </div>
      </Modal>

      {/* ═══ ЗВУКИ ═══ */}
      <h2 className="demo-h2">Звуки (WebAudio)</h2>
      <p className="demo-note">
        8-bit синтез без ассетов: square/triangle, мастер 0.15, компрессор от клиппинга.
      </p>
      <div className="sfx-grid">
        <PixelButton variant="ghost" size="md" onClick={() => sfx.tap()}>
          tap
        </PixelButton>
        <PixelButton variant="up" size="md" onClick={() => { sfx.correct(); haptic.success() }}>
          correct
        </PixelButton>
        <PixelButton variant="danger" size="md" onClick={() => { sfx.wrong(); haptic.error() }}>
          wrong
        </PixelButton>
        <PixelButton variant="ghost" size="md" onClick={() => sfx.tick()}>
          tick
        </PixelButton>
        <PixelButton variant="ghost" size="md" onClick={() => sfx.reveal()}>
          reveal
        </PixelButton>
        <PixelButton variant="gold" size="md" onClick={() => sfx.fanfare()}>
          fanfare
        </PixelButton>
        <PixelButton variant="ghost" size="md" onClick={() => sfx.pop()}>
          pop
        </PixelButton>
        <PixelButton
          variant={muted ? 'danger' : 'primary'}
          size="md"
          icon={muted ? <IconSoundOff /> : <IconSoundOn />}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? 'Звук выкл' : 'Звук вкл'}
        </PixelButton>
      </div>

      {/* ═══ ОНБОРДИНГ-ПОДСКАЗКИ ═══ */}
      <h2 className="demo-h2">Подсказки онбординга</h2>
      <p className="demo-note">
        CoachTip — тёмная плашка с рамкой 2px и хвостиком-стрелкой. Сама плашка не
        перекрывает клики (pointer-events: none), кликабельны только «Дальше» и «×».
        В хабе показывается 3 шага при первом запуске.
      </p>
      <div className="coach-demo">
        <CoachTip tail="down" tailOffset={36} step={0} steps={3} onNext={() => sfx.tap()} onSkip={() => sfx.pop()}>
          <IconSpark size={20} /> Это твой аксолотль — тапни его!
        </CoachTip>
      </div>

      {/* ═══ ИКОНКИ ═══ */}
      <h2 className="demo-h2">Пиксель-иконки</h2>
      <div className="icon-grid">
        <div className="icon-cell"><IconArrowUp /><span>up</span></div>
        <div className="icon-cell"><IconArrowDown /><span>down</span></div>
        <div className="icon-cell icon-cell--gold"><IconCoin /><span>coin</span></div>
        <div className="icon-cell"><IconFlask /><span>flask</span></div>
        <div className="icon-cell"><IconBook /><span>book</span></div>
        <div className="icon-cell icon-cell--gold"><IconTrophy /><span>trophy</span></div>
        <div className="icon-cell"><IconSoundOn /><span>snd on</span></div>
        <div className="icon-cell"><IconSoundOff /><span>snd off</span></div>
        <div className="icon-cell"><IconQuestion /><span>help</span></div>
        <div className="icon-cell icon-cell--gold"><IconStar /><span>star</span></div>
        <div className="icon-cell"><IconClock /><span>clock</span></div>
        <div className="icon-cell icon-cell--pink"><IconHeart /><span>heart</span></div>
        <div className="icon-cell"><IconClose /><span>close</span></div>
        <div className="icon-cell icon-cell--gold"><IconChest /><span>chest</span></div>
        <div className="icon-cell"><IconLock /><span>lock</span></div>
        <div className="icon-cell"><IconShirt /><span>shirt</span></div>
        <div className="icon-cell icon-cell--gold"><IconFire /><span>fire</span></div>
        <div className="icon-cell icon-cell--gold"><IconSpark /><span>spark</span></div>
        <div className="icon-cell"><IconCalendar /><span>calendar</span></div>
        <div className="icon-cell"><IconUser /><span>user</span></div>
        <div className="icon-cell icon-cell--big icon-cell--gold"><IconPlay size={30} /><span>play</span></div>
      </div>

      {/* ═══ ФИНАЛ ═══ */}
      <div style={{ height: 24 }} />
      <PixelCard title="Всё готово к игре" accent="aqua">
        <div className="demo-row" style={{ justifyContent: 'space-between' }}>
          <Axolotl mood="read" size={80} />
          <p className="demo-note" style={{ margin: 0, flex: 1, marginLeft: 12 }}>
            Дизайн-система готова: фронтендер собираёт экраны из этих блоков. API — в
            design/README.md.
          </p>
        </div>
      </PixelCard>
    </div>
  )
}
