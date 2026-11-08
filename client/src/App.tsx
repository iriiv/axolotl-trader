/* ═══════════════════════════════════════════════════════════════
   Аксолотль-трейдер — игровой цикл (стейт-машина на useReducer,
   без роутера): hub → (регистрация) → roundIntro → news →
   quizCompany → quizYear → bet → reveal → (следующий | summary) →
   leaderboard. Хаб (виток v1.2) — маскот-центричная главная с
   нижней навигацией; гардероб и магазин — секции хаба.

   Витрина дизайн-системы остаётся доступной по location.hash
   === '#design' (переключение на лету через hashchange).
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import type { Transition } from 'framer-motion'
import { DesignDemo } from './design/DesignDemo'
import { PixelCard } from './design/ui'
import { IconCalendar, IconFire } from './design/icons'
import { sfx } from './design/sfx'
import { fetchScores, gameData, submitScore } from './api'
import { comboMultiplier, scoreRound, summarize } from './game/engine'
import {
  CHEST_PRICES,
  dailyCoins,
  gameCoins,
  pityAfter,
  rollDrop,
} from './game/economy'
import type { DropResult } from './game/economy'
import {
  continuesStreak,
  dateLabelRu,
  dayNumber,
  pickDailyRound,
  todayKey,
} from './game/daily'
import { storage } from './game/storage'
import type { EquipState } from './game/storage'
import { COSMETICS } from './design/cosmetics/catalog'
import type { CosmeticItem, CosmeticKind } from './design/cosmetics/catalog'
import type { ChestType } from './design/cosmetics/chests'
import type { DailyCaseCell } from './design/cosmetics'
import { CrtOverlay, readCrtPref, writeCrtPref } from './components/CrtOverlay'
import type { Direction, RoundAnswer, RoundScore, Score } from './game/types'
import { HubScreen } from './screens/HubScreen'
import type { HubTab } from './screens/HubScreen'
import { NickScreen } from './screens/NickScreen'
import { RoundIntroScreen } from './screens/RoundIntroScreen'
import { NewsScreen } from './screens/NewsScreen'
import { QuizScreen } from './screens/QuizScreen'
import { BetScreen } from './screens/BetScreen'
import { RevealScreen } from './screens/RevealScreen'
import { SummaryScreen } from './screens/SummaryScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'
import { ChestScreen } from './screens/ChestScreen'
import { DailyResultScreen } from './screens/DailyResultScreen'
import './screens.css'
import './screens/cosmetics-screens.css'

type Screen =
  | 'hub'
  | 'nick'
  | 'roundIntro'
  | 'news'
  | 'quizCompany'
  | 'quizYear'
  | 'bet'
  | 'reveal'
  | 'summary'
  | 'leaderboard'
  | 'chest'
  | 'dailyResult'

/** режим партии: кампания (10 раундов) или хроника дня (1 раунд) */
type PlayMode = 'campaign' | 'daily'

/** контекст открытого сундука: откуда, куда вернуться */
interface ChestRun {
  type: ChestType
  from: 'campaign' | 'daily' | 'shop'
  /** после «Забрать»: лидерборд или хаб */
  returnTo: 'hub' | 'leaderboard'
  /** восстановить вкладку хаба (магазин/гардероб/аккаунт); умолчание — главная */
  hubTab?: HubTab
  /** плашка над сундуком (например «Стрик 7!») */
  plate?: string
  /** бесплатный сундук партии открывается сам (не ждёт тапов) */
  auto?: boolean
}

/** итог хроники дня для DailyResultScreen */
interface DailySummary {
  dayNo: number
  dateLabel: string
  cells: DailyCaseCell[]
  streakDays: number
  coins: number
  companyOk: boolean
  yearOk: boolean
  bet: Direction | null
  goldChest: boolean
}

interface QuizAnswer<T> {
  correct: boolean
  guessed: T
}

interface GameState {
  screen: Screen
  mode: PlayMode
  roundIdx: number
  score: number
  streak: number
  bestStreak: number
  log: RoundAnswer[]
  nick: string
  companyAnswer: QuizAnswer<string> | null
  yearAnswer: QuizAnswer<number> | null
  lastResult: RoundAnswer | null
  submission: { id: number | null; rank: number; offline: boolean } | null
  /** открытый сундук (экран 'chest') */
  chest: ChestRun | null
  /** номер дня запущенной хроники (для плашек daily-режима) */
  dailyDayNo: number
  /** итог завершённой хроники дня (экран 'dailyResult') */
  dailyResult: DailySummary | null
}

type Action =
  | { type: 'start' }
  | { type: 'startDaily'; roundIdx: number; dayNo: number }
  | { type: 'setNick'; nick: string }
  | { type: 'updateNick'; nick: string }
  | { type: 'openNews' }
  | { type: 'toQuizCompany' }
  | { type: 'answerCompany'; correct: boolean; guessed: string }
  | { type: 'answerYear'; correct: boolean; guessed: number }
  | { type: 'betPlaced'; bet: Direction; timeLeftRatio: number }
  | { type: 'betTimeout' }
  | { type: 'next' }
  | { type: 'dailyFinished'; result: DailySummary }
  | { type: 'leaderboard' }
  | { type: 'playAgain' }
  | { type: 'toHub' }
  | { type: 'openChest'; chest: ChestRun }
  | { type: 'chestDone' }
  | { type: 'submitted'; submission: GameState['submission'] }

function createInitialState(): GameState {
  return {
    screen: 'hub',
    mode: 'campaign',
    roundIdx: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    log: [],
    nick: storage.getNick(),
    companyAnswer: null,
    yearAnswer: null,
    lastResult: null,
    submission: null,
    chest: null,
    dailyDayNo: 0,
    dailyResult: null,
  }
}

/** фиксирует раунд чистым движком и возвращает обновление стейта */
function resolveBet(state: GameState, bet: Direction | null, timeLeftRatio: number) {
  const round = gameData.rounds[state.roundIdx]
  const points: RoundScore = scoreRound({
    companyCorrect: state.companyAnswer?.correct ?? false,
    yearCorrect: state.yearAnswer?.correct ?? false,
    bet,
    actual: round.direction,
    timeLeftRatio,
    streakBefore: state.streak,
    points: gameData.game.points,
    comboSteps: gameData.game.comboSteps,
  })
  const entry: RoundAnswer = {
    roundId: round.id,
    ticker: round.ticker,
    company: round.answers.company,
    companyCorrect: state.companyAnswer?.correct ?? false,
    companyGuessed: state.companyAnswer?.guessed ?? '—',
    year: round.answers.year,
    yearCorrect: state.yearAnswer?.correct ?? false,
    yearGuessed: state.yearAnswer?.guessed ?? 0,
    bet,
    actual: round.direction,
    timeLeftRatio,
    points,
  }
  return {
    score: state.score + points.total,
    streak: points.streakAfter,
    bestStreak: Math.max(state.bestStreak, points.streakAfter),
    log: [...state.log, entry],
    lastResult: entry,
  }
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    /* кампания: с ником — сразу к раундам, без ника — регистрация */
    case 'start':
      return {
        ...createInitialState(),
        nick: state.nick,
        screen: state.nick ? 'roundIntro' : 'nick',
      }

    case 'startDaily':
      if (state.screen !== 'hub') return state
      return {
        ...createInitialState(),
        nick: state.nick,
        mode: 'daily',
        roundIdx: action.roundIdx,
        dailyDayNo: action.dayNo,
        screen: 'roundIntro',
      }

    case 'setNick':
      return {
        ...createInitialState(),
        nick: action.nick,
        screen: 'roundIntro',
      }

    /* регистрация/смена ника из хаба — остаёмся на месте */
    case 'updateNick':
      return { ...state, nick: action.nick }

    case 'openNews':
      return { ...state, screen: 'news' }

    case 'toQuizCompany':
      return { ...state, screen: 'quizCompany' }

    case 'answerCompany':
      return {
        ...state,
        companyAnswer: { correct: action.correct, guessed: action.guessed },
        screen: 'quizYear',
      }

    case 'answerYear':
      return {
        ...state,
        yearAnswer: { correct: action.correct, guessed: action.guessed },
        screen: 'bet',
      }

    case 'betPlaced':
      if (state.screen !== 'bet') return state // защита от двойного срабатывания
      return { ...state, ...resolveBet(state, action.bet, action.timeLeftRatio), screen: 'reveal' }

    case 'betTimeout':
      if (state.screen !== 'bet') return state
      return { ...state, ...resolveBet(state, null, 0), screen: 'reveal' }

    case 'next': {
      if (state.screen !== 'reveal') return state
      // daily завершается экшеном dailyFinished (после записи стрика)
      if (state.mode === 'daily') return state
      const nextIdx = state.roundIdx + 1
      if (nextIdx < gameData.rounds.length) {
        return {
          ...state,
          roundIdx: nextIdx,
          companyAnswer: null,
          yearAnswer: null,
          lastResult: null,
          screen: 'roundIntro',
        }
      }
      return { ...state, screen: 'summary' }
    }

    case 'dailyFinished':
      return { ...state, screen: 'dailyResult', dailyResult: action.result }

    case 'leaderboard':
      return { ...state, screen: 'leaderboard' }

    case 'playAgain':
      return {
        ...createInitialState(),
        nick: state.nick,
        screen: state.nick ? 'roundIntro' : 'nick',
      }

    case 'toHub':
      return { ...createInitialState(), nick: state.nick }

    case 'openChest':
      return { ...state, screen: 'chest', chest: action.chest }

    case 'chestDone':
      return {
        ...state,
        screen: state.chest?.returnTo === 'leaderboard' ? 'leaderboard' : 'hub',
        chest: null,
      }

    case 'submitted':
      return { ...state, submission: action.submission }

    default:
      return state
  }
}

/* «сегодня» хроники дня: ключ, номер дня, сыграно ли, стрик */
function readDailyInfo() {
  const key = todayKey()
  const d = storage.getDaily()
  return {
    dateKey: key,
    dayNo: dayNumber(key),
    dateLabel: dateLabelRu(key),
    playedToday: d.lastDateKey === key,
    streak: d.streak,
    bestStreak: d.bestStreak,
  }
}

/* ═══════════════════════ игровое приложение ═══════════════════════ */

/** переход между экранами: slide + fade + scale на пружине */
const SCREEN_TRANSITION: Transition = {
  x: { type: 'spring', stiffness: 320, damping: 30 },
  scale: { type: 'spring', stiffness: 320, damping: 30 },
  opacity: { duration: 0.2, ease: 'easeOut' },
}

export default function App() {
  const [mode, setMode] = useState<'game' | 'design'>(() =>
    window.location.hash === '#design' ? 'design' : 'game',
  )
  /* ЭЛТ-эффект: тумблер на титуле, состояние живёт в localStorage */
  const [crt, setCrt] = useState(() => readCrtPref())
  /* «прогревание» ЭЛТ — только при самом старте приложения */
  const [crtWarmup, setCrtWarmup] = useState(true)

  useEffect(() => {
    const onHash = () => setMode(window.location.hash === '#design' ? 'design' : 'game')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const toggleCrt = useCallback(() => {
    setCrt((on) => {
      writeCrtPref(!on)
      return !on
    })
    setCrtWarmup(false)
    sfx.tap()
  }, [])

  const content =
    mode === 'design' ? (
      <DesignDemo />
    ) : (
      <Game crtOn={crt} onToggleCrt={toggleCrt} />
    )

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        {content}
        <CrtOverlay on={crt} warmup={crtWarmup && mode === 'game'} />
      </div>
    </MotionConfig>
  )
}

function Game({ crtOn, onToggleCrt }: { crtOn: boolean; onToggleCrt: () => void }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [muted, setMuted] = useState(() => sfx.isMuted())
  const [hubStats, setHubStats] = useState(() => ({
    best: storage.getBestScore(),
    games: storage.getGamesCount(),
    last: storage.getLastResult(),
  }))
  const [board, setBoard] = useState<{ scores: Score[]; offline: boolean; loading: boolean }>({
    scores: [],
    offline: false,
    loading: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const persistedRef = useRef(-1)
  /* защита от двойного тапа «К итогам» на ревиле daily */
  const dailyDoneRef = useRef(false)

  /* ── косметика и daily: единый стейт поверх storage ── */
  const [coins, setCoins] = useState(() => storage.getCoins())
  const [inv, setInv] = useState<string[]>(() => storage.getInventory())
  const [equip, setEquip] = useState<EquipState>(() => storage.getEquip())
  const [pity, setPity] = useState(() => storage.getPity())
  const [dailyInfo, setDailyInfo] = useState(() => readDailyInfo())
  /* активная секция хаба (живёт над экранами: после партии/сундука
     возвращаемся на нужную вкладку) */
  const [hubTab, setHubTab] = useState<HubTab>('home')

  const meta = gameData.game
  const rounds = gameData.rounds
  const round = rounds[Math.min(state.roundIdx, rounds.length - 1)] ?? rounds[0]
  /* daily — один раунд: в шапках всегда «1 из 1», независимо от индекса кейса */
  const isDaily = state.mode === 'daily'
  const roundNo = isDaily ? 1 : state.roundIdx + 1
  const roundsTotal = isDaily ? 1 : rounds.length
  const streakMult = comboMultiplier(state.streak, meta.comboSteps)
  const stats = summarize(state.log, rounds.length)

  /* подпись кампании для карточки режимов: «2014→2023» */
  const campaignLabel = (() => {
    const years = rounds.map((r) => r.answers.year).filter((y) => typeof y === 'number')
    if (years.length === 0) return ''
    return `${Math.min(...years)}→${Math.max(...years)}`
  })()

  /* обновляем стату профиля при возврате в хаб */
  useEffect(() => {
    if (state.screen === 'hub') {
      setHubStats({
        best: storage.getBestScore(),
        games: storage.getGamesCount(),
        last: storage.getLastResult(),
      })
      setDailyInfo(readDailyInfo())
    }
  }, [state.screen])

  /* e2e-хук подмены даты: пересчитать хронику дня без перезагрузки */
  useEffect(() => {
    const recompute = () => setDailyInfo(readDailyInfo())
    window.addEventListener('ax-date-change', recompute)
    return () => window.removeEventListener('ax-date-change', recompute)
  }, [])

  /* фиксация результата партии в localStorage (один раз за игру):
     рекорд/счётчик + начисление монет за партию (спец §1) */
  useEffect(() => {
    if (state.screen === 'summary' && persistedRef.current !== state.log.length) {
      persistedRef.current = state.log.length
      storage.setBestScore(state.score)
      storage.bumpGames()
      storage.setLastResult({
        score: state.score,
        roundsTotal: rounds.length,
        directionsCorrect: stats.directionsCorrect,
        bestStreak: stats.bestStreak,
        at: new Date().toISOString(),
      })
      setCoins(storage.addCoins(gameCoins(state.log)))
    }
  }, [state.screen, state.log, state.score, rounds.length, stats.directionsCorrect, stats.bestStreak])

  /* загрузка лидерборда при входе на экран (и после сабмита) */
  useEffect(() => {
    if (state.screen !== 'leaderboard') return
    let alive = true
    setBoard((b) => ({ ...b, loading: true }))
    void fetchScores(20).then((res) => {
      if (alive) setBoard({ scores: res.scores, offline: res.offline, loading: false })
    })
    return () => {
      alive = false
    }
  }, [state.screen, state.submission])

  const handleNick = useCallback((nick: string) => {
    storage.setNick(nick)
    dispatch({ type: 'setNick', nick })
  }, [])

  /** регистрация на главной хаба / смена ника в аккаунте */
  const handleNickUpdate = useCallback((nick: string) => {
    storage.setNick(nick)
    dispatch({ type: 'updateNick', nick })
  }, [])

  /* сабмит: сначала деревянный сундук за партию, потом лидерборд */
  const handleSubmitScore = useCallback(async () => {
    if (submitting || state.submission) return
    setSubmitting(true)
    const res = await submitScore({
      player: state.nick || 'Аноним',
      score: state.score,
      roundsTotal: rounds.length,
      directionsCorrect: stats.directionsCorrect,
      bestStreak: stats.bestStreak,
    })
    dispatch({ type: 'submitted', submission: { id: res.id, rank: res.rank, offline: res.offline } })
    setSubmitting(false)
    dispatch({
      type: 'openChest',
      chest: { type: 'wooden', from: 'campaign', returnTo: 'leaderboard', auto: true },
    })
  }, [submitting, state.submission, state.nick, state.score, rounds.length, stats.directionsCorrect, stats.bestStreak])

  /* ── косметика: ролл дропа и все записи в storage ── */

  const rollChestLoot = useCallback(
    (chestType: ChestType): DropResult => {
      /* e2e/скриншот-хук: форсируем редкость следующего дропа */
      const forcedRaw = window.__axForceRarity
      const forced =
        forcedRaw === 'common' || forcedRaw === 'rare' || forcedRaw === 'epic' || forcedRaw === 'legend'
          ? forcedRaw
          : undefined
      if (forcedRaw) window.__forceDropRarity?.(null) // одноразовый
      const drop = rollDrop(chestType, inv, pity, Math.random, forced)
      if (drop.duplicate) {
        setCoins(storage.addCoins(drop.refundCoins))
      } else {
        setInv(storage.addToInventory(drop.itemId))
      }
      setPity(storage.setPity(pityAfter(chestType, drop, pity)))
      return drop
    },
    [inv, pity],
  )

  /** надеть предмет из дропа («Экипировать» на сундуке) */
  const handleChestEquip = useCallback((item: CosmeticItem) => {
    setEquip(storage.equipItem(item.kind, item.id))
  }, [])

  /** гардероб: тап по карточке; повторный тап по надетому — снять */
  const handleWardrobeEquip = useCallback(
    (kind: CosmeticKind, id: string | null) => {
      if (id !== null) {
        const worn = kind === 'skin' ? equip.skin : kind === 'hat' ? equip.hat : equip.acc
        if (worn === id) {
          if (kind === 'skin') return // скин не снимается — всегда есть
          setEquip(storage.equipItem(kind, null))
          return
        }
      }
      setEquip(storage.equipItem(kind, id))
    },
    [equip],
  )

  /** покупка сундука за монеты (магазин/гардероб): списание здесь,
      экран — ChestScreen; возврат в ту же секцию хаба */
  const handleBuyChest = useCallback(
    (chest: ChestType) => {
      if (!storage.spendCoins(CHEST_PRICES[chest])) return
      setCoins(storage.getCoins())
      dispatch({
        type: 'openChest',
        chest: { type: chest, from: 'shop', returnTo: 'hub', hubTab: hubTab === 'home' ? 'shop' : hubTab },
      })
    },
    [hubTab],
  )

  /** «Забрать» на сундуке: вернуть хаб на нужную вкладку */
  const handleChestDone = useCallback(() => {
    const run = state.chest
    if (run?.returnTo === 'hub') setHubTab(run.hubTab ?? 'home')
    dispatch({ type: 'chestDone' })
  }, [state.chest])

  /** выход в хаб (из лидерборда и пр.) — на главную секцию */
  const handleToHub = useCallback(() => {
    setHubTab('home')
    dispatch({ type: 'toHub' })
  }, [])

  /* ── дебаг-панель (Аккаунт → 🐞 Отладка) ── */

  const handleDebugAddCoins = useCallback(() => {
    setCoins(storage.addCoins(9999))
  }, [])

  /** золотой сундук бесконечно и бесплатно — через обычную экономику */
  const handleDebugOpenGold = useCallback(() => {
    dispatch({
      type: 'openChest',
      chest: { type: 'gold', from: 'shop', returnTo: 'hub', hubTab: 'account' },
    })
  }, [])

  const handleDebugGiveAll = useCallback(() => {
    let list = storage.getInventory()
    for (const item of COSMETICS) list = storage.addToInventory(item.id)
    setInv(list)
  }, [])

  const handleDebugReset = useCallback(() => {
    storage.resetAll()
    window.location.reload()
  }, [])

  /* ── хроника дня ── */

  const handleStartDaily = useCallback(() => {
    const info = readDailyInfo()
    if (info.playedToday) return // один прогон в день (локальная дата)
    dailyDoneRef.current = false
    const dailyRound = pickDailyRound(rounds, info.dateKey)
    const idx = dailyRound ? rounds.findIndex((r) => r.id === dailyRound.id) : -1
    dispatch({ type: 'startDaily', roundIdx: Math.max(0, idx), dayNo: info.dayNo })
  }, [rounds])

  /** финал daily: стрик/монеты в storage, затем экран итога дня */
  const handleDailyNext = useCallback(() => {
    if (dailyDoneRef.current) return
    const entry = state.lastResult
    if (!entry) return
    dailyDoneRef.current = true
    const key = todayKey()
    const prev = storage.getDaily()
    const alreadyPlayed = prev.lastDateKey === key
    const streak = alreadyPlayed
      ? prev.streak
      : continuesStreak(prev.lastDateKey, key)
        ? prev.streak + 1
        : 1
    storage.setDaily({
      lastDateKey: key,
      streak,
      bestStreak: Math.max(prev.bestStreak, streak),
      playedDays: prev.playedDays + (alreadyPlayed ? 0 : 1),
    })
    const earned = dailyCoins(entry, streak)
    setCoins(storage.addCoins(earned))
    setDailyInfo(readDailyInfo())
    const cell: DailyCaseCell = {
      ticker: entry.ticker,
      year: entry.year,
      hit: entry.bet !== null && entry.bet === entry.actual,
      up: entry.actual === 'up',
    }
    dispatch({
      type: 'dailyFinished',
      result: {
        dayNo: dayNumber(key),
        dateLabel: dateLabelRu(key),
        cells: [cell],
        streakDays: streak,
        coins: earned,
        companyOk: entry.companyCorrect,
        yearOk: entry.yearCorrect,
        bet: entry.bet,
        goldChest: streak % 7 === 0,
      },
    })
  }, [state.lastResult])

  /** «Забрать сундук» на итогах дня: жемчужный, за стрик 7 — золотой */
  const handleTakeDailyChest = useCallback(() => {
    const r = state.dailyResult
    dispatch({
      type: 'openChest',
      chest: r?.goldChest
        ? { type: 'gold', from: 'daily', returnTo: 'hub', hubTab: 'home', plate: `Стрик ${r.streakDays}!` }
        : { type: 'pearl', from: 'daily', returnTo: 'hub', hubTab: 'home' },
    })
  }, [state.dailyResult])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      sfx.setMuted(!m)
      return !m
    })
  }, [])

  /* ═══ рендер экранов ═══ */

  let screen: ReactElement

  switch (state.screen) {
    case 'hub':
      screen = (
        <HubScreen
          key="hub"
          nick={state.nick}
          bestScore={hubStats.best}
          gamesCount={hubStats.games}
          lastResult={hubStats.last}
          muted={muted}
          onToggleMute={toggleMute}
          crtOn={crtOn}
          onToggleCrt={onToggleCrt}
          equip={equip}
          coins={coins}
          ownedIds={inv}
          itemsTotal={COSMETICS.length}
          campaignLabel={campaignLabel}
          roundsTotal={rounds.length}
          daily={{
            dayNo: dailyInfo.dayNo,
            dateLabel: dailyInfo.dateLabel,
            playedToday: dailyInfo.playedToday,
            streak: dailyInfo.streak,
            bestStreak: dailyInfo.bestStreak,
          }}
          tab={hubTab}
          onTab={setHubTab}
          onPlay={() => dispatch({ type: 'start' })}
          onDaily={handleStartDaily}
          onLeaderboard={() => dispatch({ type: 'leaderboard' })}
          onBuyChest={handleBuyChest}
          onEquip={handleWardrobeEquip}
          onNickChange={handleNickUpdate}
          debug={{
            onAddCoins: handleDebugAddCoins,
            onOpenGold: handleDebugOpenGold,
            onGiveAll: handleDebugGiveAll,
            onReset: handleDebugReset,
          }}
        />
      )
      break

    case 'nick':
      screen = <NickScreen key="nick" defaultNick={state.nick} onSubmit={handleNick} />
      break

    case 'roundIntro':
      screen = isDaily ? (
        <div className="scr scr-daily-intro" key={`intro-daily-${round.id}`}>
          <div className="daily-intro-badge" data-testid="daily-intro">
            <IconCalendar /> Хроника дня №{state.dailyDayNo}
            {dailyInfo.streak > 0 && (
              <span className="daily-intro-flame">
                <IconFire /> {dailyInfo.streak}
              </span>
            )}
          </div>
          <RoundIntroScreen
            round={round}
            roundNo={roundNo}
            roundsTotal={roundsTotal}
            score={state.score}
            streak={state.streak}
            multiplier={streakMult}
            onNext={() => dispatch({ type: 'openNews' })}
          />
        </div>
      ) : (
        <RoundIntroScreen
          key={`intro-${round.id}`}
          round={round}
          roundNo={roundNo}
          roundsTotal={roundsTotal}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          onNext={() => dispatch({ type: 'openNews' })}
        />
      )
      break

    case 'news':
      screen = (
        <NewsScreen
          key={`news-${round.id}`}
          round={round}
          roundNo={roundNo}
          roundsTotal={roundsTotal}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          onNext={() => dispatch({ type: 'toQuizCompany' })}
        />
      )
      break

    case 'quizCompany':
      screen = (
        <QuizScreen
          key={`quiz-c-${round.id}`}
          question="О какой компании новости?"
          options={round.companyOptions}
          correctIndex={round.companyOptions.indexOf(round.answers.company)}
          pointsLabel={`+${meta.points.company}`}
          roundNo={roundNo}
          roundsTotal={roundsTotal}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          hintCard={
            <PixelCard title="Улика" accent="pink">
              <p className="intro-hint">{round.mysteryHint}</p>
            </PixelCard>
          }
          recapNews={round.news}
          onDone={(correct, chosen) =>
            dispatch({
              type: 'answerCompany',
              correct,
              guessed: round.companyOptions[chosen] ?? '—',
            })
          }
        />
      )
      break

    case 'quizYear':
      screen = (
        <QuizScreen
          key={`quiz-y-${round.id}`}
          question="В каком году это было?"
          options={round.yearOptions.map(String)}
          correctIndex={round.yearOptions.indexOf(round.answers.year)}
          pointsLabel={`+${meta.points.year}`}
          roundNo={roundNo}
          roundsTotal={roundsTotal}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          recapNews={round.news}
          onDone={(correct, chosen) =>
            dispatch({
              type: 'answerYear',
              correct,
              guessed: round.yearOptions[chosen] ?? 0,
            })
          }
        />
      )
      break

    case 'bet':
      screen = (
        <BetScreen
          key={`bet-${round.id}`}
          round={round}
          roundNo={roundNo}
          roundsTotal={roundsTotal}
          betSeconds={meta.betSeconds}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          onBet={(bet, timeLeftRatio) => dispatch({ type: 'betPlaced', bet, timeLeftRatio })}
          onTimeout={() => dispatch({ type: 'betTimeout' })}
        />
      )
      break

    case 'reveal':
      screen = state.lastResult ? (
        <RevealScreen
          key={`reveal-${round.id}`}
          round={round}
          result={state.lastResult}
          roundNo={roundNo}
          roundsTotal={roundsTotal}
          isLast={isDaily || state.roundIdx >= rounds.length - 1}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          equip={equip}
          onNext={isDaily ? handleDailyNext : () => dispatch({ type: 'next' })}
        />
      ) : (
        <div className="scr" />
      )
      break

    case 'summary':
      screen = (
        <SummaryScreen
          key="summary"
          nick={state.nick}
          score={state.score}
          log={state.log}
          roundsTotal={rounds.length}
          submitting={submitting}
          submitted={!!state.submission}
          equip={equip}
          onSubmit={() => void handleSubmitScore()}
        />
      )
      break

    case 'leaderboard':
      screen = (
        <LeaderboardScreen
          key="leaderboard"
          scores={board.scores}
          loading={board.loading}
          offline={board.offline}
          submission={state.submission}
          player={{
            nick: state.nick || 'Аноним',
            score: state.score,
            directionsCorrect: stats.directionsCorrect,
            bestStreak: stats.bestStreak,
          }}
          onPlayAgain={() => dispatch({ type: 'playAgain' })}
          onMenu={handleToHub}
        />
      )
      break

    case 'chest': {
      const run = state.chest
      screen = run ? (
        <ChestScreen
          key={`chest-${run.type}-${run.from}`}
          chest={run.type}
          plate={run.plate}
          autoAdvance={run.auto}
          onRollLoot={() => rollChestLoot(run.type)}
          onEquipItem={handleChestEquip}
          onDone={handleChestDone}
        />
      ) : (
        <div className="scr" />
      )
      break
    }

    case 'dailyResult': {
      const r = state.dailyResult
      screen = r ? (
        <DailyResultScreen
          key="daily-result"
          dayNo={r.dayNo}
          dateLabel={r.dateLabel}
          cells={r.cells}
          streakDays={r.streakDays}
          coins={r.coins}
          companyOk={r.companyOk}
          yearOk={r.yearOk}
          bet={r.bet}
          onTakeChest={handleTakeDailyChest}
        />
      ) : (
        <div className="scr" />
      )
      break
    }

    default:
      screen = <div className="scr" />
  }

  /* Переход экранов: slide+fade+scale на пружине (mode="wait" —
     без наложения; exit быстрый, чтобы UX не тормозил) */
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={state.screen}
        className="scr-anim"
        initial={{ opacity: 0, x: 28, scale: 0.985 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{
          opacity: 0,
          x: -20,
          scale: 0.985,
          transition: { x: { duration: 0.16, ease: 'easeIn' }, opacity: { duration: 0.16 }, scale: { duration: 0.16 } },
        }}
        transition={SCREEN_TRANSITION}
      >
        {screen}
      </motion.div>
    </AnimatePresence>
  )
}
