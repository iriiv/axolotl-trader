/* LeaderboardScreen: топ-10 + строка игрока (подсветка/под чертой),
   топ-3 с иконками, источник — сервер или localStorage. */

import { IconStar, IconTrophy } from '../design/icons'
import { Badge, PixelButton, PixelCard } from '../design/ui'
import type { Score } from '../game/types'

export interface LeaderboardScreenProps {
  scores: Score[]
  loading: boolean
  offline: boolean
  /** результат последней отправки (для подсветки и места) */
  submission: { id: number | null; rank: number; offline: boolean } | null
  /** данные игрока, если его строки нет в топе */
  player: { nick: string; score: number; directionsCorrect: number; bestStreak: number } | null
  onPlayAgain: () => void
  onMenu: () => void
}

function PlaceMark({ place }: { place: number }) {
  if (place === 1)
    return (
      <span className="lb-place lb-place--1">
        <IconTrophy />
      </span>
    )
  if (place === 2)
    return (
      <span className="lb-place lb-place--2">
        <IconStar />
      </span>
    )
  if (place === 3)
    return (
      <span className="lb-place lb-place--3">
        <IconStar />
      </span>
    )
  return <span className="lb-place">{place}</span>
}

function LbRow({
  place,
  entry,
  isPlayer,
}: {
  place: number
  entry: Score
  isPlayer: boolean
}) {
  return (
    <div className={`lb-row ${place <= 3 ? 'is-top' : ''} ${isPlayer ? 'is-player' : ''}`}>
      <span className="lb-cell-place">
        <PlaceMark place={place} />
      </span>
      <span className="lb-nick">{entry.player}</span>
      <span className="lb-score">{entry.score.toLocaleString('ru-RU')}</span>
      <span className="lb-dir">↑{entry.directionsCorrect}</span>
      <span className="lb-streak">🔥{entry.bestStreak}</span>
    </div>
  )
}

export function LeaderboardScreen({
  scores,
  loading,
  offline,
  submission,
  player,
  onPlayAgain,
  onMenu,
}: LeaderboardScreenProps) {
  const top = scores.slice(0, 10)

  /* строка игрока: ищем по id отправленной записи */
  const playerEntry = submission?.id != null ? scores.find((s) => s.id === submission.id) : undefined
  const playerInTop = playerEntry !== undefined && top.includes(playerEntry)
  const showPlayerBelow = !!playerEntry && !playerInTop

  return (
    <div className="scr u-pop-in">
      <PixelCard title="Лидерборд" accent="gold">
        {offline && <p className="lb-offline">Сервер недоступен — локальный рейтинг</p>}
        {submission && (
          <div className="lb-yourplace">
            <Badge color={submission.offline ? 'ink' : 'gold'}>
              Твоё место: {submission.rank}
              {submission.offline ? ' (локально)' : ''}
            </Badge>
          </div>
        )}

        {loading && scores.length === 0 && <p className="lb-loading">Загрузка…</p>}
        {!loading && scores.length === 0 && (
          <p className="lb-loading">Пока пусто. Стань первым!</p>
        )}

        {scores.length > 0 && (
          <div className="lb-table" role="table" aria-label="Лидерборд">
            <div className="lb-row lb-row--head" aria-hidden="true">
              <span className="lb-cell-place">#</span>
              <span className="lb-nick">Ник</span>
              <span className="lb-score">Очки</span>
              <span className="lb-dir">Напр.</span>
              <span className="lb-streak">Серия</span>
            </div>
            {top.map((entry, i) => (
              <LbRow
                key={entry.id}
                place={i + 1}
                entry={entry}
                isPlayer={submission?.id != null && entry.id === submission.id}
              />
            ))}

            {showPlayerBelow && playerEntry && (
              <>
                <div className="lb-sep">···</div>
                <LbRow
                  place={Math.max(1, scores.findIndex((s) => s.id === playerEntry.id) + 1)}
                  entry={playerEntry}
                  isPlayer
                />
              </>
            )}

            {/* игрок ниже топа и его записи нет в выбранных 20 — рисуем вручную */}
            {!playerEntry && submission && player && (
              <>
                <div className="lb-sep">···</div>
                <div className="lb-row is-player">
                  <span className="lb-cell-place">{submission.rank}</span>
                  <span className="lb-nick">{player.nick}</span>
                  <span className="lb-score">{player.score.toLocaleString('ru-RU')}</span>
                  <span className="lb-dir">↑{player.directionsCorrect}</span>
                  <span className="lb-streak">🔥{player.bestStreak}</span>
                </div>
              </>
            )}
          </div>
        )}
      </PixelCard>

      <div className="scr-spacer" />
      <div data-testid="btn-play-again">
        <PixelButton variant="primary" size="xl" full onClick={onPlayAgain}>
          Играть снова
        </PixelButton>
      </div>
      <div data-testid="btn-menu">
        <PixelButton variant="ghost" size="lg" full onClick={onMenu}>
          В меню
        </PixelButton>
      </div>
    </div>
  )
}
