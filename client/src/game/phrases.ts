/* ═══════════════════════════════════════════════════════════════
   Реплики аксолотля. Короткие, с характером болтающегося в аквариуме
   трейдера-любителя. mood 'blink' — служебный кадр, фраз к нему нет.
   ═══════════════════════════════════════════════════════════════ */

import type { AxolotlMood } from '../design/axolotl'

export type PhraseMood = Exclude<AxolotlMood, 'blink'>

export const AXO_PHRASES: Record<PhraseMood, string[]> = {
  idle: [
    'Жабры чешутся к росту… или к обеду.',
    'Не спеши, рынок никуда не уплывёт.',
    'Я болтаюсь в аквариуме, ты — на бирже. Вода одна.',
    'Пузыри люблю. Финансовые — не очень.',
    'Спокойствие — лучшая стратегия. И кормление по расписанию.',
  ],
  cheer: [
    'Жабры горят! Это к прибыли!',
    'Вот это я понимаю — чуйка!',
    'Ты сегодня острее моей улыбки!',
    'Хвост трубой! Продолжай в том же духе!',
    'Ура! Отметим пузырьками!',
  ],
  sad: [
    'Бывает… Зато урок на всю жизнь.',
    'Даже мои жабры поникли. Нырнём ещё раз?',
    'Рынок не прощает. А я — прощаю.',
    'Один красный день — ещё не биография.',
  ],
  wow: [
    'Ого! График свернулся спиралью!',
    'Ух! Вот это волатильность!',
    'Глаза шире только у меня!',
    'Аквариум потрясён до дна!',
  ],
  read: [
    'Почитал сводку. Утка проплыла мимо кассы.',
    'Финансовая пресса — моя стихия.',
    'Люблю читать про чужие пузыри.',
    'Все новости уже у меня в жабрах.',
  ],
}

/** Случайная реплика по настроению */
export function pickAxoPhrase(mood: PhraseMood): string {
  const list = AXO_PHRASES[mood]
  return list[Math.floor(Math.random() * list.length)] ?? ''
}

/** Фразы на экране ставки (пока тикает таймер) */
export const BET_PHRASES: string[] = [
  'Осторожно, тут пахнет волатильностью…',
  'Интуиция или монетка? Решай быстрее!',
  'Я бы поставил… нет, не подскажу.',
  'Секунды тают быстрее воды!',
  'Чуйка чешется — доверяй ей!',
]

export function pickBetPhrase(): string {
  return BET_PHRASES[Math.floor(Math.random() * BET_PHRASES.length)] ?? ''
}

/** Вердикт на экране итогов по доле верных направлений */
export interface SummaryVerdict {
  mood: AxolotlMood
  title: string
  phrase: string
}

export function summaryVerdict(directionsCorrect: number, roundsTotal: number): SummaryVerdict {
  if (directionsCorrect >= 4) {
    return {
      mood: 'cheer',
      title: 'Ты чуешь рынок!',
      phrase: pickAxoPhrase('cheer'),
    }
  }
  if (directionsCorrect >= Math.max(2, Math.ceil(roundsTotal / 2)) - 1) {
    return {
      mood: 'idle',
      title: 'Неплохо для сухопутного!',
      phrase: pickAxoPhrase('idle'),
    }
  }
  return {
    mood: 'sad',
    title: 'Рынок оказался хитрее',
    phrase: pickAxoPhrase('sad'),
  }
}
