/* ═══════════════════════════════════════════════════════════════
   SFX — 8-bit звуки на WebAudio, без ассетов.
   AudioContext лениво создаётся при первом вызове (после жеста).
   Мастер-гейн 0.15 + компрессор → клиппинг исключён.
   API: sfx.tap() .correct() .wrong() .tick() .reveal() .fanfare() .pop()
        sfx.setMuted(bool) / sfx.isMuted()
   ═══════════════════════════════════════════════════════════════ */

type Wave = OscillatorType

interface NoteOpts {
  type?: Wave
  /** задержка старта, сек */
  at?: number
  /** длительность, сек */
  dur?: number
  gain?: number
  /** конечная частота (слайд) */
  slideTo?: number
}

const STORAGE_KEY = 'axolotl.sfx.muted'

class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false

  constructor() {
    try {
      this.muted = window.localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      /* localStorage может быть недоступен в WebView — не критично */
    }
  }

  /** Создаёт/возвращает контекст. false — если звук недоступен. */
  private ensure(): boolean {
    if (this.muted) return false
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return false
      this.ctx = new AC()
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -18
      comp.knee.value = 10
      comp.ratio.value = 8
      comp.attack.value = 0.001
      comp.release.value = 0.12
      const master = this.ctx.createGain()
      master.gain.value = 0.15
      master.connect(comp)
      comp.connect(this.ctx.destination)
      this.master = master
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return true
  }

  /** Один 8-bit блип с огибающей (без щелчков) */
  private blip(freq: number, opts: NoteOpts = {}) {
    if (!this.ensure() || !this.ctx || !this.master) return
    const { type = 'square', at = 0, dur = 0.08, gain = 0.5, slideTo } = opts
    const t0 = this.ctx.currentTime + at
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur)
    }
    // жёсткая 8-bit огибающая: мгновенная атака, быстрый спад
    g.gain.setValueAtTime(gain, t0)
    g.gain.setValueAtTime(gain, t0 + Math.max(0.005, dur - 0.02))
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  /** Короткий блип-тап */
  tap() {
    this.blip(660, { type: 'square', dur: 0.045, gain: 0.4, slideTo: 540 })
  }

  /** Арпеджио вверх — верный ответ */
  correct() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      this.blip(f, { type: 'triangle', at: i * 0.085, dur: 0.1, gain: 0.55 })
      this.blip(f * 2, { type: 'square', at: i * 0.085, dur: 0.06, gain: 0.12 })
    })
  }

  /** Низкий саут-даун — ошибка */
  wrong() {
    this.blip(196, { type: 'sawtooth', dur: 0.3, gain: 0.42, slideTo: 62 })
    this.blip(98, { type: 'square', at: 0.04, dur: 0.26, gain: 0.2, slideTo: 46 })
  }

  /** Тихий тик таймера */
  tick() {
    this.blip(880, { type: 'square', dur: 0.022, gain: 0.18 })
  }

  /** Свип вверх + искра — ревил графика */
  reveal() {
    this.blip(240, { type: 'square', dur: 0.3, gain: 0.4, slideTo: 960 })
    this.blip(1318.5, { type: 'triangle', at: 0.26, dur: 0.09, gain: 0.4 })
    this.blip(1760, { type: 'triangle', at: 0.36, dur: 0.12, gain: 0.35 })
  }

  /** Победная фраза из 5 нот */
  fanfare() {
    const seq: Array<[number, number]> = [
      [392.0, 0.12],
      [523.25, 0.12],
      [659.25, 0.12],
      [783.99, 0.16],
      [1046.5, 0.42],
    ]
    let t = 0
    for (const [f, d] of seq) {
      this.blip(f, { type: 'triangle', at: t, dur: d, gain: 0.55 })
      this.blip(f / 2, { type: 'square', at: t, dur: d * 0.7, gain: 0.16 })
      t += d + 0.02
    }
    // финальный «блеск»
    this.blip(1567.98, { type: 'triangle', at: t + 0.02, dur: 0.14, gain: 0.35 })
  }

  /** Эпический дроп: низкий удар + розовое арпеджио (деликатно) */
  epic() {
    this.blip(196, { type: 'sawtooth', dur: 0.38, gain: 0.26, slideTo: 98 })
    const notes = [880, 1108.73, 1318.51]
    notes.forEach((f, i) => {
      this.blip(f, { type: 'square', at: 0.08 + i * 0.09, dur: 0.1, gain: 0.24 })
    })
    this.blip(1760, { type: 'triangle', at: 0.38, dur: 0.22, gain: 0.3 })
    this.blip(2217.46, { type: 'triangle', at: 0.5, dur: 0.16, gain: 0.2 })
  }

  /** Легендарный дроп: мажорное арпеджио из 6 нот + октавный блеск */
  legend() {
    const seq: Array<[number, number]> = [
      [523.25, 0.13],
      [659.25, 0.13],
      [783.99, 0.13],
      [1046.5, 0.16],
      [1318.51, 0.2],
      [1567.98, 0.52],
    ]
    let t = 0
    for (const [f, d] of seq) {
      this.blip(f, { type: 'triangle', at: t, dur: d, gain: 0.5 })
      this.blip(f / 2, { type: 'square', at: t, dur: d * 0.6, gain: 0.12 })
      t += d + 0.02
    }
    // октавный «дождь» из блёсток
    this.blip(2093, { type: 'triangle', at: t + 0.02, dur: 0.3, gain: 0.22 })
    this.blip(2637.02, { type: 'triangle', at: t + 0.14, dur: 0.26, gain: 0.16 })
  }

  /** Пружинистый «поп» (появление карточки) */
  pop() {
    this.blip(300, { type: 'sine', dur: 0.07, gain: 0.5, slideTo: 720 })
  }

  setMuted(m: boolean) {
    this.muted = m
    try {
      window.localStorage.setItem(STORAGE_KEY, m ? '1' : '0')
    } catch {
      /* игнорируем */
    }
  }

  isMuted() {
    return this.muted
  }
}

export const sfx = new Sfx()
