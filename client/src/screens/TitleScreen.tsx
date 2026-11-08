/* Титульный экран: маскот, логотип, 3 кнопки, рекорд, дисклеймер,
   тумблеры звука и ТВ-эффекта (ЭЛТ-оверлей) */

import { useState } from 'react'
import { Axolotl } from '../design/axolotl'
import { Modal, PixelButton, SpeechBubble } from '../design/ui'
import {
  IconBook,
  IconCalendar,
  IconClock,
  IconCoin,
  IconFire,
  IconQuestion,
  IconShirt,
  IconStar,
  IconSoundOff,
  IconSoundOn,
  IconTrophy,
  IconTv,
} from '../design/icons'
import { pickAxoPhrase } from '../game/phrases'
import type { GameMeta } from '../game/types'
import type { EquipState } from '../game/storage'

export interface TitleScreenProps {
  meta: GameMeta
  bestScore: number
  gamesCount: number
  muted: boolean
  onToggleMute: () => void
  /** ЭЛТ-эффект (CrtOverlay) */
  crtOn: boolean
  onToggleCrt: () => void
  onPlay: () => void
  onLeaderboard: () => void
  /** надетая косметика (аксолотль титула носит экипировку) */
  equip: EquipState
  /** баланс «пузырьков» */
  coins: number
  /** счётчик предметов N/total на кнопке гардероба */
  ownedCount: number
  itemsTotal: number
  /** состояние хроники дня */
  daily: {
    dayNo: number
    playedToday: boolean
    streak: number
  }
  onDaily: () => void
  onWardrobe: () => void
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

export function TitleScreen({
  meta,
  bestScore,
  gamesCount,
  muted,
  onToggleMute,
  crtOn,
  onToggleCrt,
  onPlay,
  onLeaderboard,
  equip,
  coins,
  ownedCount,
  itemsTotal,
  daily,
  onDaily,
  onWardrobe,
}: TitleScreenProps) {
  const [howtoOpen, setHowtoOpen] = useState(false)
  const phrase = pickAxoPhrase('idle')

  return (
    <div className="scr scr-title">
      <button
        type="button"
        className="iconbtn"
        data-testid="btn-sound"
        aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        onClick={onToggleMute}
      >
        {muted ? <IconSoundOff /> : <IconSoundOn />}
      </button>

      <button
        type="button"
        className={`iconbtn iconbtn--crt ${crtOn ? '' : 'is-off'}`}
        data-testid="btn-crt"
        aria-label={crtOn ? 'Выключить ТВ-эффект' : 'Включить ТВ-эффект'}
        aria-pressed={crtOn}
        onClick={onToggleCrt}
      >
        <IconTv />
      </button>

      <div className="title-inner">
        <div className="title-axo">
          {/* машет лапкой: мягкое покачивание корпусом (axo--wave);
              надетая косметика видна и здесь */}
          <Axolotl
            mood="idle"
            size={148}
            animated
            className="axo--wave"
            skin={equip.skin}
            hat={equip.hat ?? undefined}
            acc={equip.acc ?? undefined}
          />
        </div>
        <h1 className="title-logo display">Аксолотль-трейдер</h1>
        <p className="title-sub">{meta.title}</p>
        <p className="title-sub2">{meta.subtitle}</p>

        <SpeechBubble side="left">{phrase}</SpeechBubble>

        <div className="title-actions">
          <div data-testid="btn-play">
            <PixelButton variant="primary" size="xl" full onClick={onPlay}>
              Играть
            </PixelButton>
          </div>
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
                    <IconFire /> {daily.streak}
                  </span>
                )}
              </PixelButton>
            )}
          </div>
          <div data-testid="btn-wardrobe">
            <PixelButton variant="ghost" size="lg" full icon={<IconShirt />} onClick={onWardrobe}>
              Гардероб
              <span className="title-ward-meta">
                <span className="title-coins" data-testid="title-coins">
                  <IconCoin /> {coins.toLocaleString('ru-RU')}
                </span>
                <span className="title-items">
                  {ownedCount}/{itemsTotal}
                </span>
              </span>
            </PixelButton>
          </div>
          <div data-testid="btn-leaderboard">
            <PixelButton variant="gold" size="lg" full icon={<IconTrophy />} onClick={onLeaderboard}>
              Лидерборд
            </PixelButton>
          </div>
          <div data-testid="btn-howto">
            <PixelButton
              variant="ghost"
              size="lg"
              full
              icon={<IconQuestion />}
              onClick={() => setHowtoOpen(true)}
            >
              Как играть
            </PixelButton>
          </div>
        </div>

        <p className="title-meta">
          {gamesCount > 0 ? `Рекорд: ${bestScore.toLocaleString('ru-RU')} · Игр: ${gamesCount}` : 'Первая игра? Погнали!'}
        </p>
        <p className="title-disclaimer">Учебная игра. Не инвестиционная рекомендация</p>
      </div>

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
