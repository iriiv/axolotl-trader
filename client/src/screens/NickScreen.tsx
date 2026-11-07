/* Экран ника: аксолотль-читатель + input с валидацией и shake */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Axolotl } from '../design/axolotl'
import { PixelButton, SpeechBubble } from '../design/ui'
import { sfx } from '../design/sfx'
import { haptic } from '../design/haptics'

export interface NickScreenProps {
  defaultNick: string
  onSubmit: (nick: string) => void
}

/** как на сервере: буквы (в т.ч. кириллица), цифры, пробел, _ и -, 1–14 */
const NICK_RE = /^[A-Za-zА-Яа-яЁё0-9 _-]{1,14}$/

export function NickScreen({ defaultNick, onSubmit }: NickScreenProps) {
  const [value, setValue] = useState(defaultNick)
  const [badTries, setBadTries] = useState(0)

  const trimmed = value.trim()
  const valid = NICK_RE.test(trimmed)
  const empty = trimmed.length === 0
  /* кнопка активна при непустом поле: невалидные символы проверяем
     на сабмите — тогда игрок видит hint + shake (по спецификации) */
  const showError = badTries > 0 && !empty && !valid

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) {
      setBadTries((n) => n + 1)
      sfx.wrong()
      haptic.error()
      return
    }
    onSubmit(trimmed)
  }

  return (
    <form className="scr scr-nick u-pop-in" onSubmit={handleSubmit}>
      <div className="nick-axo">
        <Axolotl mood="read" size={120} animated />
        <SpeechBubble side="left">Как записать тебя в хроники?</SpeechBubble>
      </div>

      <label className="nick-label" htmlFor="nick-input">
        Твой ник трейдера
      </label>
      <div key={badTries} className={showError ? 'u-shake' : undefined}>
        <input
          id="nick-input"
          data-testid="input-nick"
          className={`nick-input ${showError ? 'is-bad' : ''}`}
          value={value}
          maxLength={14}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Аксоль_Трейдер"
          enterKeyHint="done"
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <p className={`field-hint ${showError ? 'is-bad' : ''}`} role="status">
        {showError
          ? 'Только буквы, цифры, пробел, «_» и «-» (до 14 символов)'
          : 'Буквы, цифры, пробел, «_» и «-» · до 14 символов'}
      </p>

      <div className="scr-spacer" />
      <div data-testid="btn-nick-next">
        <PixelButton variant="primary" size="xl" full disabled={empty} type="submit">
          Дальше
        </PixelButton>
      </div>
    </form>
  )
}
