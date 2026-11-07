/* ═══════════════════════════════════════════════════════════════
   Аксолотль-трейдер — игровой цикл (стейт-машина на useReducer,
   без роутера): title → nick → roundIntro → news → quizCompany →
   quizYear → bet → reveal → (следующий | summary) → leaderboard.

   Витрина дизайн-системы остаётся доступной по location.hash
   === '#design' (переключение на лету через hashchange).
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { DesignDemo } from './design/DesignDemo'
import { PixelCard } from './design/ui'
import { sfx } from './design/sfx'
import { fetchScores, gameData, submitScore } from './api'
import { comboMultiplier, scoreRound, summarize } from './game/engine'
import { storage } from './game/storage'
import type { Direction, RoundAnswer, RoundScore, Score } from './game/types'
import { TitleScreen } from './screens/TitleScreen'
import { NickScreen } from './screens/NickScreen'
import { RoundIntroScreen } from './screens/RoundIntroScreen'
import { NewsScreen } from './screens/NewsScreen'
import { QuizScreen } from './screens/QuizScreen'
import { BetScreen } from './screens/BetScreen'
import { RevealScreen } from './screens/RevealScreen'
import { SummaryScreen } from './screens/SummaryScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'
import './screens.css'

type Screen =
  | 'title'
  | 'nick'
  | 'roundIntro'
  | 'news'
  | 'quizCompany'
  | 'quizYear'
  | 'bet'
  | 'reveal'
  | 'summary'
  | 'leaderboard'

interface QuizAnswer<T> {
  correct: boolean
  guessed: T
}

interface GameState {
  screen: Screen
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
}

type Action =
  | { type: 'start' }
  | { type: 'setNick'; nick: string }
  | { type: 'openNews' }
  | { type: 'toQuizCompany' }
  | { type: 'answerCompany'; correct: boolean; guessed: string }
  | { type: 'answerYear'; correct: boolean; guessed: number }
  | { type: 'betPlaced'; bet: Direction; timeLeftRatio: number }
  | { type: 'betTimeout' }
  | { type: 'next' }
  | { type: 'leaderboard' }
  | { type: 'playAgain' }
  | { type: 'toTitle' }
  | { type: 'submitted'; submission: GameState['submission'] }

function createInitialState(): GameState {
  return {
    screen: 'title',
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
    case 'start':
      return { ...state, screen: 'nick' }

    case 'setNick':
      return {
        ...createInitialState(),
        nick: action.nick,
        screen: 'roundIntro',
      }

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

    case 'leaderboard':
      return { ...state, screen: 'leaderboard' }

    case 'playAgain':
      return { ...createInitialState(), nick: state.nick, screen: 'nick' }

    case 'toTitle':
      return { ...createInitialState(), nick: state.nick }

    case 'submitted':
      return { ...state, submission: action.submission }

    default:
      return state
  }
}

/* ═══════════════════════ игровое приложение ═══════════════════════ */

export default function App() {
  const [mode, setMode] = useState<'game' | 'design'>(() =>
    window.location.hash === '#design' ? 'design' : 'game',
  )

  useEffect(() => {
    const onHash = () => setMode(window.location.hash === '#design' ? 'design' : 'game')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (mode === 'design') {
    return (
      <div className="app">
        <DesignDemo />
      </div>
    )
  }
  return (
    <div className="app">
      <Game />
    </div>
  )
}

function Game() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [muted, setMuted] = useState(() => sfx.isMuted())
  const [titleStats, setTitleStats] = useState(() => ({
    best: storage.getBestScore(),
    games: storage.getGamesCount(),
  }))
  const [board, setBoard] = useState<{ scores: Score[]; offline: boolean; loading: boolean }>({
    scores: [],
    offline: false,
    loading: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const persistedRef = useRef(-1)

  const meta = gameData.game
  const rounds = gameData.rounds
  const round = rounds[Math.min(state.roundIdx, rounds.length - 1)] ?? rounds[0]
  const roundNo = state.roundIdx + 1
  const streakMult = comboMultiplier(state.streak, meta.comboSteps)
  const stats = summarize(state.log, rounds.length)

  /* обновляем мини-строку «Рекорд/Игр» при возврате на титул */
  useEffect(() => {
    if (state.screen === 'title') {
      setTitleStats({ best: storage.getBestScore(), games: storage.getGamesCount() })
    }
  }, [state.screen])

  /* фиксация результата партии в localStorage (один раз за игру) */
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
    }
  }, [state.screen, state.log.length, state.score, rounds.length, stats.directionsCorrect, stats.bestStreak])

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
    dispatch({ type: 'leaderboard' })
  }, [submitting, state.submission, state.nick, state.score, rounds.length, stats.directionsCorrect, stats.bestStreak])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      sfx.setMuted(!m)
      return !m
    })
  }, [])

  /* ═══ рендер экранов ═══ */

  switch (state.screen) {
    case 'title':
      return (
        <TitleScreen
          key="title"
          meta={meta}
          bestScore={titleStats.best}
          gamesCount={titleStats.games}
          muted={muted}
          onToggleMute={toggleMute}
          onPlay={() => dispatch({ type: 'start' })}
          onLeaderboard={() => dispatch({ type: 'leaderboard' })}
        />
      )

    case 'nick':
      return <NickScreen key="nick" defaultNick={state.nick} onSubmit={handleNick} />

    case 'roundIntro':
      return (
        <RoundIntroScreen
          key={`intro-${round.id}`}
          round={round}
          roundNo={roundNo}
          roundsTotal={rounds.length}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          onNext={() => dispatch({ type: 'openNews' })}
        />
      )

    case 'news':
      return (
        <NewsScreen
          key={`news-${round.id}`}
          round={round}
          roundNo={roundNo}
          roundsTotal={rounds.length}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          onNext={() => dispatch({ type: 'toQuizCompany' })}
        />
      )

    case 'quizCompany':
      return (
        <QuizScreen
          key={`quiz-c-${round.id}`}
          question="О какой компании новости?"
          options={round.companyOptions}
          correctIndex={round.companyOptions.indexOf(round.answers.company)}
          pointsLabel={`+${meta.points.company}`}
          roundNo={roundNo}
          roundsTotal={rounds.length}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          hintCard={
            <PixelCard title="Улика" accent="pink">
              <p className="intro-hint">{round.mysteryHint}</p>
            </PixelCard>
          }
          onDone={(correct, chosen) =>
            dispatch({
              type: 'answerCompany',
              correct,
              guessed: round.companyOptions[chosen] ?? '—',
            })
          }
        />
      )

    case 'quizYear':
      return (
        <QuizScreen
          key={`quiz-y-${round.id}`}
          question="В каком году это было?"
          options={round.yearOptions.map(String)}
          correctIndex={round.yearOptions.indexOf(round.answers.year)}
          pointsLabel={`+${meta.points.year}`}
          roundNo={roundNo}
          roundsTotal={rounds.length}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          onDone={(correct, chosen) =>
            dispatch({
              type: 'answerYear',
              correct,
              guessed: round.yearOptions[chosen] ?? 0,
            })
          }
        />
      )

    case 'bet':
      return (
        <BetScreen
          key={`bet-${round.id}`}
          round={round}
          roundNo={roundNo}
          roundsTotal={rounds.length}
          betSeconds={meta.betSeconds}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          onBet={(bet, timeLeftRatio) => dispatch({ type: 'betPlaced', bet, timeLeftRatio })}
          onTimeout={() => dispatch({ type: 'betTimeout' })}
        />
      )

    case 'reveal':
      return state.lastResult ? (
        <RevealScreen
          key={`reveal-${round.id}`}
          round={round}
          result={state.lastResult}
          roundNo={roundNo}
          roundsTotal={rounds.length}
          isLast={state.roundIdx >= rounds.length - 1}
          score={state.score}
          streak={state.streak}
          multiplier={streakMult}
          onNext={() => dispatch({ type: 'next' })}
        />
      ) : null

    case 'summary':
      return (
        <SummaryScreen
          key="summary"
          nick={state.nick}
          score={state.score}
          log={state.log}
          roundsTotal={rounds.length}
          submitting={submitting}
          submitted={!!state.submission}
          onSubmit={() => void handleSubmitScore()}
        />
      )

    case 'leaderboard':
      return (
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
          onMenu={() => dispatch({ type: 'toTitle' })}
        />
      )

    default:
      return null
  }
}
