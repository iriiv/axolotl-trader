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
  IconClock,
  IconClose,
  IconCoin,
  IconFlask,
  IconHeart,
  IconQuestion,
  IconSoundOff,
  IconSoundOn,
  IconStar,
  IconTrophy,
} from './icons'

const MOODS: AxolotlMood[] = ['idle', 'cheer', 'sad', 'wow', 'read', 'blink']
const MOOD_LABEL: Record<AxolotlMood, string> = {
  idle: 'idle',
  cheer: 'cheer',
  sad: 'sad',
  wow: 'wow',
  read: 'read',
  blink: 'blink',
}

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

      {/* ═══ КНОПКИ ═══ */}
      <h2 className="demo-h2">Кнопки</h2>
      <p className="demo-note">
        Тап-таргеты 52–68px. Нажатие = вдавливание в пиксельную тень + sfx.tap + хаптика.
      </p>
      <div className="demo-col">
        <div className="demo-row">
          <PixelButton variant="primary" size="lg">
            Играть
          </PixelButton>
          <PixelButton variant="gold" size="lg">
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
          <PixelButton variant="ghost" size="md" icon={<IconQuestion />}>
            Подсказка
          </PixelButton>
          <PixelButton variant="primary" size="md" disabled>
            Недоступно
          </PixelButton>
        </div>
      </div>

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
