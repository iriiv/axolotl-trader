/* ═══════════════════════════════════════════════════════════════
    HubScreen — ХАБ v1.2 (замена титульного «меню со списком»):
    маскот-центризм + нижняя навигация таб-баром.

    • Главная: сцена-аквариум (большой аксолотль в экипировке,
      водоросли, пузырьки глобальные) + приветствие + чипы статов,
      внизу — быстрый вход в игру и адаптеры совместимости e2e
      (btn-play / btn-daily / btn-leaderboard).
    • Таб-бар (5): Аккаунт · Хроника · ▶ Играть (центр, круглая
      приподнятая) · Гардероб (счётчик N/total) · Магазин.
      Повторный тап по активной вкладке — назад на Главную.
    • Секции переключаются слайдом 200мс, экран не скроллится —
      внутренние списки скроллятся сами.
    • Регистрация: нет ника — карточка прямо на Главной;
      полный экран ника открывается из игры при первом запуске.
    • Аккаунт: ник/стат/настройки + дебаг-панель (монеты, золотой
      сундук бесконечно, выдать всё, сброс).
    ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Axolotl } from '../design/axolotl'
import { AxolotlCoin } from '../design/axolotl'
import { Chip, CoachTip, Modal, PixelButton, PixelCard, SpeechBubble } from '../design/ui'
import {
  IconBook,
  IconCalendar,
  IconChest,
  IconClock,
  IconCoin,
  IconFire,
  IconLock,
  IconPlay,
  IconQuestion,
  IconShirt,
  IconSoundOff,
  IconSoundOn,
  IconSpark,
  IconStar,
  IconTrophy,
  IconTv,
  IconUser,
} from '../design/icons'
import { Chest } from '../design/cosmetics'
import { CHESTS } from '../design/cosmetics/chests'
import type { ChestType } from '../design/cosmetics/chests'
import type { CosmeticKind } from '../design/cosmetics/catalog'
import { SceneFlora } from '../design/scenery'
import { CHEST_PRICES, DROP_TABLES } from '../game/economy'
import { pickAxoPhrase, pickHubPhrase } from '../game/phrases'
import { sfx } from '../design/sfx'
import { haptic } from '../design/haptics'
import type { EquipState, StoredResult } from '../game/storage'
import { storage } from '../game/storage'
import { WardrobeScreen } from './WardrobeScreen'
import './hub.css'

/** секции хаба; 'home' — главная (без своего пункта в таб-баре) */
export type HubTab = 'home' | 'account' | 'daily' | 'play' | 'wardrobe' | 'shop'

/** как на сервере: буквы (в т.ч. кириллица), цифры, пробел, _ и -, 1–14 */
const NICK_RE = /^[A-Za-zА-Яа-яЁё0-9 _-]{1,14}$/

export interface HubScreenProps {
  nick: string
  bestScore: number
  gamesCount: number
  lastResult: StoredResult | null
  muted: boolean
  onToggleMute: () => void
  /** ЭЛТ-эффект (CrtOverlay) */
  crtOn: boolean
  onToggleCrt: () => void
  equip: EquipState
  coins: number
  ownedIds: string[]
  itemsTotal: number
  /** подпишись кампании, например «2014→2023» */
  campaignLabel: string
  roundsTotal: number
  daily: {
    dayNo: number
    dateLabel: string
    playedToday: boolean
    streak: number
    bestStreak: number
  }
  tab: HubTab
  onTab: (tab: HubTab) => void
  /** быстрый вход в кампанию (или на экран ника при первом запуске) */
  onPlay: () => void
  onDaily: () => void
  onLeaderboard: () => void
  /** покупка сундука за монеты (баланс проверяет App) */
  onBuyChest: (chest: ChestType) => void
  onEquip: (kind: CosmeticKind, id: string | null) => void
  /** регистрация на главной / смена ника в аккаунте */
  onNickChange: (nick: string) => void
  /** дебаг-панель в Аккаунте */
  debug: {
    onAddCoins: () => void
    onOpenGold: () => void
    onGiveAll: () => void
    onReset: () => void
  }
}

const HOWTO_STEPS = [
  {
    icon: <IconBook />,
    title: '1 · Читай новости',
    text: 'Три карточки-зарисовки об одном событии рынка. Дата без года — не подглядывай!',
  },
  {
    icon: <IconQuestion />,
    title: '2 · Угадай компанию и год',
    text: 'О какой компании речь и когда это было: +150 и +100 очков.',
  },
  {
    icon: <IconClock />,
    title: '3 · Поставь на рост или падение',
    text: '15 секунд на ставку по графику. Чем быстрее жмёшь — тем больше бонус.',
  },
  {
    icon: <IconStar />,
    title: '4 · Лови серию',
    text: 'Верные ставки подряд дают комбо до ×2,5. Финиш — место в лидерборде!',
  },
]

/** октагон для центральной кнопки ▶ (§8: 72px, рамка 3px) */
const PIXEL_CIRCLE =
  'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

/* ═════════════════ вкладка таб-бара ═════════════════ */

interface TabDef {
  id: Exclude<HubTab, 'home'>
  label: string
  testid: string
  icon: ReactNode
}

/* иконки таб-бара — 30px (DESIGN_SYSTEM §7-8) */
const TABS: TabDef[] = [
  { id: 'account', label: 'Аккаунт', testid: 'tab-account', icon: <IconUser size={30} /> },
  { id: 'daily', label: 'Хроника', testid: 'tab-daily', icon: <IconCalendar size={30} /> },
  { id: 'play', label: 'Играть', testid: 'tab-play', icon: null },
  { id: 'wardrobe', label: 'Гардероб', testid: 'btn-wardrobe', icon: <IconShirt size={30} /> },
  { id: 'shop', label: 'Магазин', testid: 'tab-shop', icon: <IconChest size={30} /> },
]

/* ═════════════════Главная секция ═════════════════ */

function HomeSection(props: HubScreenProps) {
  const { nick, coins, daily, equip, gamesCount, ownedIds, itemsTotal, onPlay, onDaily, onLeaderboard, onNickChange } =
    props

  /* реакция маскота на тап: смена настроения + фраза + счётчик тапов */
  const [mood, setMood] = useState<'idle' | 'cheer' | 'wow'>('idle')
  const [phrase, setPhrase] = useState(() => pickHubPhrase())
  const [tapNo, setTapNo] = useState(0)
  const moodTimer = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (moodTimer.current !== null) window.clearTimeout(moodTimer.current)
    }
  }, [])

  const handleMascotTap = () => {
    const next: 'cheer' | 'wow' = Math.random() < 0.5 ? 'cheer' : 'wow'
    setMood(next)
    setPhrase(Math.random() < 0.55 ? pickHubPhrase() : pickAxoPhrase(next))
    setTapNo((n) => n + 1)
    sfx.pop()
    haptic.success()
    if (moodTimer.current !== null) window.clearTimeout(moodTimer.current)
    moodTimer.current = window.setTimeout(() => setMood('idle'), 1600)
  }

  /* компактность: на невысоких экранах маскот поменьше */
  const axoSize = typeof window !== 'undefined' && window.innerHeight < 700 ? 156 : 196

  /* inline-регистрация при первом входе (нет ax_nick) */
  const [regValue, setRegValue] = useState('')
  const [regTries, setRegTries] = useState(0)
  const regTrimmed = regValue.trim()
  const regValid = NICK_RE.test(regTrimmed)
  const regEmpty = regTrimmed.length === 0
  const regError = regTries > 0 && !regEmpty && !regValid
  const handleReg = (e: FormEvent) => {
    e.preventDefault()
    if (!regValid) {
      setRegTries((n) => n + 1)
      sfx.wrong()
      haptic.error()
      return
    }
    onNickChange(regTrimmed)
  }

  return (
    <div className="hub-section hub-home" data-testid="hub-section-home">
      <header className="hub-top">
        <h1 className="title-logo display hub-logo">Аксолотль-трейдер</h1>
        {nick ? (
          <p className="hub-hello display" data-testid="hub-hello">
            Привет, {nick}!
          </p>
        ) : (
          <p className="hub-hello display" data-testid="hub-hello">
            Как тебя зовут, инвестор?
          </p>
        )}
        <div className="hub-chips">
          {daily.streak > 0 && (
            <span className="hub-chip hub-chip--fire" data-testid="hub-streak">
              <IconFire size={14} /> ×{daily.streak}
            </span>
          )}
          <span className="hub-chip hub-chip--coin" data-testid="title-coins">
            <IconCoin size={14} /> {coins.toLocaleString('ru-RU')}
          </span>
          <span
            className={cx('hub-chip hub-chip--day', !daily.playedToday && 'hub-chip--pulse')}
            title={daily.playedToday ? 'Хроника на сегодня сыграна' : 'Хроника дня ждёт!'}
          >
            <IconCalendar size={14} /> День №{daily.dayNo}
          </span>
        </div>
      </header>

      {/* сцена-аквариум: маскот в центре, водоросли по низу */}
      <div className="hub-scene">
        <SceneFlora />
        <div className="title-axo hub-axo">
          <Axolotl
            mood={mood}
            size={axoSize}
            animated
            skin={equip.skin}
            hat={equip.hat ?? undefined}
            acc={equip.acc ?? undefined}
            onClick={handleMascotTap}
          />
        </div>
        <div data-testid="hub-phrase" data-tap={tapNo}>
          <SpeechBubble key={tapNo} side="left">
            {phrase}
          </SpeechBubble>
        </div>
      </div>

      {/* регистрация при первом входе — прямо на главной */}
      {!nick && (
        <form className="hub-reg" data-testid="hub-registration" onSubmit={handleReg}>
          <label className="nick-label" htmlFor="hub-nick-input">
            Имя для хроник биржи
          </label>
          <div key={regTries} className={regError ? 'u-shake' : undefined}>
            <input
              id="hub-nick-input"
              data-testid="hub-input-nick"
              className={`nick-input ${regError ? 'is-bad' : ''}`}
              value={regValue}
              maxLength={14}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Аксоль_Трейдер"
              enterKeyHint="done"
              onChange={(e) => setRegValue(e.target.value)}
            />
          </div>
          <p className={`field-hint ${regError ? 'is-bad' : ''}`} role="status">
            {regError
              ? 'Только буквы, цифры, пробел, «_» и «-» (до 14 символов)'
              : 'Так тебя запомнят лидерборд и хроники'}
          </p>
          <div data-testid="btn-register">
            <PixelButton variant="primary" size="lg" full disabled={regEmpty} type="submit">
              Начать путь
            </PixelButton>
          </div>
        </form>
      )}

      {/* быстрые действия над таб-баром: главная CTA — xl primary,
          вторичные — lg (gold daily / ghost лидерборд) */}
      <footer className="hub-actions">
        <div data-testid="btn-play">
          <PixelButton variant="primary" size="xl" full icon={<IconPlay size={24} />} onClick={onPlay}>
            {gamesCount > 0 ? 'Продолжить кампанию' : 'Начать хроники'}
          </PixelButton>
        </div>
        <div className="hub-actions-row">
          <div data-testid="btn-daily">
            {daily.playedToday ? (
              <PixelButton variant="ghost" size="lg" full icon={<IconCalendar />} disabled>
                Завтра новая хроника
              </PixelButton>
            ) : (
              <PixelButton variant="gold" size="lg" full icon={<IconCalendar />} onClick={onDaily}>
                Хроника дня №{daily.dayNo}
                {daily.streak > 0 && (
                  <span className="title-streak" data-testid="daily-streak">
                    <IconFire size={13} /> {daily.streak}
                  </span>
                )}
              </PixelButton>
            )}
          </div>
          <div data-testid="btn-leaderboard">
            <PixelButton variant="ghost" size="lg" full icon={<IconTrophy />} onClick={onLeaderboard}>
              Лидерборд
            </PixelButton>
          </div>
        </div>
        <p className="title-disclaimer">
          Учебная игра. Не инвестиционная рекомендация
          {ownedIds.length > 0 ? ` · Предметов: ${ownedIds.length}/${itemsTotal}` : ''}
        </p>
      </footer>
    </div>
  )
}

/* ═════════════════Хроника дня ═════════════════ */

function DailySection({ daily, onDaily }: HubScreenProps) {
  return (
    <div className="hub-section" data-testid="hub-section-daily">
      <h2 className="display hub-sec-title">Хроника дня</h2>
      <PixelCard title={`День №${daily.dayNo}`} accent="gold" glow={!daily.playedToday}>
        <div className="hub-daily-hero">
          <span className="hub-daily-date">{daily.dateLabel}</span>
          <span className="hub-daily-streak">
            <IconFire size={16} /> Стрик: {daily.streak} · рекорд {daily.bestStreak}
          </span>
          {daily.playedToday ? (
            <PixelButton variant="ghost" size="xl" full icon={<IconCalendar />} disabled>
              Сыграно — завтра новая
            </PixelButton>
          ) : (
            <PixelButton variant="gold" size="xl" full icon={<IconCalendar />} onClick={onDaily}>
              Играть хронику №{daily.dayNo}
            </PixelButton>
          )}
          <p className="hub-note">
            Один кейс в день · за 7 дней подряд — золотой сундук
          </p>
        </div>
      </PixelCard>
    </div>
  )
}

/* ═════════════════▶ Играть: карточки режимов ═════════════════ */

function PlaySection(props: HubScreenProps) {
  const { campaignLabel, roundsTotal, gamesCount, daily, onPlay, onDaily } = props
  return (
    <div className="hub-section" data-testid="hub-section-play">
      <h2 className="display hub-sec-title">Куда плывём?</h2>
      <div className="hub-modes">
        <PixelCard title={`Кампания ${campaignLabel}`} accent="aqua">
          <div className="hub-mode">
            <p className="hub-mode__desc">
              {roundsTotal} раундов реальных событий биржи · деревянный сундук в финале
            </p>
            <div data-testid="btn-campaign">
              <PixelButton variant="primary" size="lg" full icon={<IconPlay size={14} />} onClick={onPlay}>
                {gamesCount > 0 ? 'Продолжить кампанию' : 'Начать хроники'}
              </PixelButton>
            </div>
          </div>
        </PixelCard>

        <PixelCard title={`Хроника дня №${daily.dayNo}`} accent="gold">
          <div className="hub-mode">
            <p className="hub-mode__desc">
              {daily.playedToday
                ? `Сегодня сыграно (${daily.dateLabel}) — завтра новый кейс`
                : `Один кейс дня, стрик ${daily.streak} · жемчужный сундук`}
            </p>
            <div data-testid="btn-play-daily">
              {daily.playedToday ? (
                <PixelButton variant="ghost" size="lg" full icon={<IconCalendar />} disabled>
                  Сыграно, завтра новая
                </PixelButton>
              ) : (
                <PixelButton variant="gold" size="lg" full icon={<IconCalendar />} onClick={onDaily}>
                  Играть хронику
                </PixelButton>
              )}
            </div>
          </div>
        </PixelCard>

        <div className={cx('pxcard pxcard--down hub-mode--locked')} data-testid="hub-mode-time-machine">
          <div className="pxcard__body hub-mode">
            <div className="hub-mode__row">
              <span className="hub-mode__name display">Машина времени</span>
              <Chip color="ink">скоро</Chip>
            </div>
            <p className="hub-mode__desc">
              <IconLock size={12} /> Проигрывать 2014 или 2023 заново — в разработке
            </p>
          </div>
        </div>

        <div className={cx('pxcard pxcard--down hub-mode--locked')} data-testid="hub-mode-hardcore">
          <div className="pxcard__body hub-mode">
            <div className="hub-mode__row">
              <span className="hub-mode__name display">Хардкор</span>
              <Chip color="ink">скоро</Chip>
            </div>
            <p className="hub-mode__desc">
              <IconLock size={12} /> Одна жизнь на всю кампанию. Для смелых
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═════════════════Аккаунт ═════════════════ */

function AccountSection(props: HubScreenProps) {
  const { nick, bestScore, gamesCount, lastResult, coins, muted, onToggleMute, crtOn, onToggleCrt, onLeaderboard, onNickChange, debug } =
    props
  const [editOpen, setEditOpen] = useState(false)
  const [howtoOpen, setHowtoOpen] = useState(false)

  const accuracy =
    lastResult && lastResult.roundsTotal > 0
      ? `${lastResult.directionsCorrect}/${lastResult.roundsTotal}`
      : '—'

  return (
    <div className="hub-section" data-testid="hub-section-account">
      <h2 className="display hub-sec-title">Аккаунт</h2>

      <PixelCard title="Профиль" accent="aqua">
        <div className="hub-acc-head">
          <span className="hub-acc-nick" data-testid="account-nick">
            {nick || 'Без имени'}
          </span>
          <div data-testid="btn-nick-edit">
            <PixelButton variant="ghost" size="md" onClick={() => setEditOpen(true)}>
              Сменить ник
            </PixelButton>
          </div>
        </div>
        <div className="hub-stats">
          <div className="statrow">
            <span className="statrow__label">Игр</span>
            <span className="statrow__lead" aria-hidden="true" />
            <span className="statrow__value statrow__value--aqua">{gamesCount}</span>
          </div>
          <div className="statrow">
            <span className="statrow__label">Рекорд</span>
            <span className="statrow__lead" aria-hidden="true" />
            <span className="statrow__value statrow__value--gold">
              {bestScore.toLocaleString('ru-RU')}
            </span>
          </div>
          <div className="statrow">
            <span className="statrow__label">Точность направлений</span>
            <span className="statrow__lead" aria-hidden="true" />
            <span className="statrow__value statrow__value--ink">{accuracy}</span>
          </div>
          <div className="statrow">
            <span className="statrow__label">Монеты</span>
            <span className="statrow__lead" aria-hidden="true" />
            <span className="statrow__value statrow__value--gold">
              {coins.toLocaleString('ru-RU')}
            </span>
          </div>
        </div>
        <div className="hub-actions-row hub-acc-buttons">
          <div data-testid="btn-leaderboard">
            <PixelButton variant="gold" size="lg" full icon={<IconTrophy />} onClick={onLeaderboard}>
              Лидерборд
            </PixelButton>
          </div>
          <div data-testid="btn-howto">
            <PixelButton variant="ghost" size="lg" full icon={<IconQuestion />} onClick={() => setHowtoOpen(true)}>
              Как играть
            </PixelButton>
          </div>
        </div>
      </PixelCard>

      <PixelCard title="Настройки" accent="pink">
        <div className="hub-toggle-row">
          <span className="hub-toggle-label">
            {muted ? <IconSoundOff /> : <IconSoundOn />} Звук
          </span>
          <div data-testid="btn-sound">
            <PixelButton variant={muted ? 'ghost' : 'primary'} size="md" onClick={onToggleMute}>
              {muted ? 'Выкл' : 'Вкл'}
            </PixelButton>
          </div>
        </div>
        <div className="hub-toggle-row">
          <span className="hub-toggle-label">
            <IconTv /> ТВ-эффект (ЭЛТ)
          </span>
          <div data-testid="btn-crt">
            <PixelButton variant={crtOn ? 'primary' : 'ghost'} size="md" onClick={onToggleCrt}>
              {crtOn ? 'Вкл' : 'Выкл'}
            </PixelButton>
          </div>
        </div>
      </PixelCard>

      {/* дебаг-панель */}
      <div className="hub-debug" data-testid="hub-debug">
        <Chip color="ink">
          <span className="golos-glyph">🐞</span> Отладка
        </Chip>
        <div className="hub-debug__grid">
          <div data-testid="btn-debug-coins">
            <PixelButton variant="ghost" size="md" full onClick={debug.onAddCoins}>
              +9999 монет
            </PixelButton>
          </div>
          <div data-testid="btn-debug-gold">
            <PixelButton variant="gold" size="md" full icon={<IconChest size={14} />} onClick={debug.onOpenGold}>
              Открыть золотой
            </PixelButton>
          </div>
          <div data-testid="btn-debug-all">
            <PixelButton variant="ghost" size="md" full onClick={debug.onGiveAll}>
              Выдать все предметы
            </PixelButton>
          </div>
          <div data-testid="btn-debug-reset">
            <PixelButton variant="danger" size="md" full onClick={debug.onReset}>
              Сбросить прогресс
            </PixelButton>
          </div>
        </div>
      </div>

      {/* смена ника */}
      <NickEditModal open={editOpen} onClose={() => setEditOpen(false)} nick={nick} onSave={onNickChange} />

      <Modal open={howtoOpen} onClose={() => setHowtoOpen(false)} title="Как играть">
        <div className="howto">
          {HOWTO_STEPS.map((step) => (
            <div className="howto__step" key={step.title}>
              <span className="howto__ico">{step.icon}</span>
              <div>
                <h4 className="howto__title display">{step.title}</h4>
                <p className="howto__text">{step.text}</p>
              </div>
            </div>
          ))}
          <PixelButton variant="primary" size="lg" full onClick={() => setHowtoOpen(false)}>
            Понятно!
          </PixelButton>
        </div>
      </Modal>
    </div>
  )
}

/* модалка смены ника (валидация как в NickScreen) */
function NickEditModal({
  open,
  onClose,
  nick,
  onSave,
}: {
  open: boolean
  onClose: () => void
  nick: string
  onSave: (nick: string) => void
}) {
  const [value, setValue] = useState(nick)
  const [badTries, setBadTries] = useState(0)
  useEffect(() => {
    if (open) {
      setValue(nick)
      setBadTries(0)
    }
  }, [open, nick])

  const trimmed = value.trim()
  const valid = NICK_RE.test(trimmed)
  const empty = trimmed.length === 0
  const showError = badTries > 0 && !empty && !valid

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) {
      setBadTries((n) => n + 1)
      sfx.wrong()
      haptic.error()
      return
    }
    onSave(trimmed)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Сменить ник">
      <form onSubmit={handleSubmit}>
        <label className="nick-label" htmlFor="nick-edit-input">
          Имя для хроник биржи
        </label>
        <div key={badTries} className={showError ? 'u-shake' : undefined}>
          <input
            id="nick-edit-input"
            data-testid="input-nick-edit"
            className={`nick-input ${showError ? 'is-bad' : ''}`}
            value={value}
            maxLength={14}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <p className={`field-hint ${showError ? 'is-bad' : ''}`} role="status">
          {showError
            ? 'Только буквы, цифры, пробел, «_» и «-» (до 14 символов)'
            : 'Буквы, цифры, пробел, «_» и «-» · до 14 символов'}
        </p>
        <div data-testid="btn-nick-save" className="hub-modal-actions">
          <PixelButton variant="primary" size="lg" full disabled={empty} type="submit">
            Сохранить
          </PixelButton>
        </div>
      </form>
    </Modal>
  )
}

/* ═════════════════Магазин ═════════════════ */

const SHOP_ORDER: ChestType[] = ['wooden', 'pearl', 'gold']

function ShopSection({ coins, onBuyChest }: HubScreenProps) {
  return (
    <div className="hub-section" data-testid="hub-section-shop">
      <div className="hub-shop-head">
        <h2 className="display hub-sec-title">Магазин</h2>
        <span className="ward-coins" data-testid="shop-coins">
          <AxolotlCoin size={20} />
          {coins.toLocaleString('ru-RU')}
        </span>
      </div>

      <div className="hub-shop-list">
        {SHOP_ORDER.map((type) => {
          const info = CHESTS[type]
          const t = DROP_TABLES[type]
          const price = CHEST_PRICES[type]
          const afford = coins >= price
          return (
            <PixelCard key={type} title={info.name} accent={type === 'gold' ? 'gold' : 'aqua'}>
              <div className="hub-shop-card">
                <span className="hub-shop-card__chest">
                  <Chest type={type} animated size={64} />
                </span>
                <div className="hub-shop-card__body">
                  <p className="hub-shop-card__desc">{info.desc}</p>
                  <span className="hub-shop-card__odds" title="Шансы: обычный · редкий · эпический · легендарный">
                    <b className="hub-odds hub-odds--common">{t.common}%</b>
                    <i className="hub-odds-dot" />
                    <b className="hub-odds hub-odds--rare">{t.rare}%</b>
                    <i className="hub-odds-dot" />
                    <b className="hub-odds hub-odds--epic">{t.epic}%</b>
                    <i className="hub-odds-dot" />
                    <b className="hub-odds hub-odds--legend">{t.legend}%</b>
                  </span>
                  <div data-testid={`btn-shop-buy-${type}`}>
                    <PixelButton
                      variant={type === 'gold' ? 'gold' : 'primary'}
                      size="lg"
                      full
                      icon={<IconChest size={14} />}
                      disabled={!afford}
                      onClick={() => onBuyChest(type)}
                    >
                      Купить · {price.toLocaleString('ru-RU')}
                    </PixelButton>
                  </div>
                </div>
              </div>
            </PixelCard>
          )
        })}
      </div>

      <p className="ward-hint">
        Шансы: обычный · редкий · эпический · легендарный. Дубль превращается в монеты: 20 · 60 · 200 ·
        500
      </p>
    </div>
  )
}

/* ═════════════════ХАБ ═════════════════ */

/* шаги онбординга первого запуска (§12): плашки CoachTip поверх
   главной; не перекрывают клики (pointer-events:none у .coach),
   первый шаг дополнительно закрывается тапом в любом месте */
const COACH_STEPS: Array<{
  text: string
  icon: ReactNode
  cls: string
  tailOffset: number
}> = [
  { text: 'Это твой аксолотль — тапни его!', icon: <IconSpark size={20} />, cls: 'hub-coach--mascot', tailOffset: 40 },
  { text: 'Здесь кампания и хроника дня', icon: <IconPlay size={20} />, cls: 'hub-coach--play', tailOffset: 170 },
  { text: 'Собирай сундуки и наряжай его в Гардеробе', icon: <IconShirt size={20} />, cls: 'hub-coach--wardrobe', tailOffset: 200 },
]

export function HubScreen(props: HubScreenProps) {
  const { tab, onTab, nick, ownedIds, itemsTotal } = props

  /* онбординг: показываем один раз — чистый профиль (нет ax_nick
     и флага ax_onboarded); любые закрытия пишут флаг навсегда */
  const [coachStep, setCoachStep] = useState<number | null>(() =>
    !nick && !storage.getOnboarded() ? 0 : null,
  )

  const coachFinish = () => {
    storage.setOnboarded(true)
    setCoachStep(null)
  }

  const coachNext = () => {
    if (coachStep === null) return
    if (coachStep + 1 < COACH_STEPS.length) {
      sfx.tap()
      haptic.tap()
      setCoachStep(coachStep + 1)
    } else {
      coachFinish()
    }
  }

  /* первый шаг закрывается тапом в любом месте экрана — листенер
     пассивный: тап проходит сквозь подсказку к элементу под ней */
  useEffect(() => {
    if (coachStep !== 0) return
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('.coach')) return
      coachFinish()
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachStep])

  const coachVisible = coachStep !== null && tab === 'home' && !nick
  const coach = coachStep !== null ? COACH_STEPS[coachStep] : null

  const handleTab = (id: Exclude<HubTab, 'home'>) => {
    sfx.tap()
    haptic.tap()
    /* повторный тап по активной вкладке — назад на Главную */
    onTab(tab === id ? 'home' : id)
  }

  const section =
    tab === 'daily' ? (
      <DailySection {...props} />
    ) : tab === 'play' ? (
      <PlaySection {...props} />
    ) : tab === 'account' ? (
      <AccountSection {...props} />
    ) : tab === 'wardrobe' ? (
      <div className="hub-section" data-testid="hub-section-wardrobe">
        <WardrobeScreen
          coins={props.coins}
          ownedIds={props.ownedIds}
          equip={props.equip}
          itemsTotal={props.itemsTotal}
          onEquip={props.onEquip}
          onBack={() => handleTab('wardrobe')}
          onBuyChest={(c) => props.onBuyChest(c)}
        />
      </div>
    ) : tab === 'shop' ? (
      <ShopSection {...props} />
    ) : (
      <HomeSection {...props} />
    )

  return (
    <div className="scr scr-hub" data-testid="hub-screen">
      <div className="hub-body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="hub-section-anim"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14, transition: { duration: 0.16, ease: 'easeIn' } }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {section}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* онбординг первого запуска: coach-подсказка поверх главной */}
      {coachVisible && coach && (
        <CoachTip
          key={coachStep}
          className={cx('hub-coach', coach.cls)}
          tail="down"
          tailOffset={coach.tailOffset}
          step={coachStep}
          steps={COACH_STEPS.length}
          onNext={coachNext}
          onSkip={coachFinish}
        >
          {coach.icon}
          {coach.text}
        </CoachTip>
      )}

      {/* нижняя навигация: 5 пунктов, центр — приподнятая ▶ */}
      <nav className="hub-tabbar" data-testid="hub-tabbar" aria-label="Разделы">
        {TABS.map((t) => {
          const active = tab === t.id
          if (t.id === 'play') {
            return (
              <div key={t.id} className={cx('hub-tab hub-tab--play', active && 'is-on')} data-testid={t.testid}>
                <button type="button" className="hub-play" aria-label="Играть" aria-pressed={active} onClick={() => handleTab('play')}>
                  <span className="hub-play__shadow" aria-hidden="true" />
                  <span className="hub-play__rim" aria-hidden="true" />
                  <span className="hub-play__face" style={{ clipPath: PIXEL_CIRCLE }}>
                    <IconPlay size={34} />
                  </span>
                </button>
              </div>
            )
          }
          return (
            <div key={t.id} className={cx('hub-tab', active && 'is-on')} data-testid={t.testid}>
              <button type="button" aria-label={t.label} aria-pressed={active} onClick={() => handleTab(t.id)}>
                <span className="hub-tab__ico" aria-hidden="true">
                  {t.icon}
                  {t.id === 'wardrobe' && (
                    <span className="hub-tab__badge" title="Собрано предметов">
                      {ownedIds.length}/{itemsTotal}
                    </span>
                  )}
                </span>
                <span className="hub-tab__label">{t.label}</span>
              </button>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
