/**
 * Procedural audio: every sound effect and music loop is synthesised with WebAudio, so there are no
 * audio files to download or license. Music plays on the host screen only (it reaches everyone
 * through the stream); phones get a few quiet UI blips.
 */

export type Sfx = 'coin' | 'coinLoss' | 'star' | 'roll' | 'whoosh' | 'card' | 'fanfare' | 'fail' | 'tick' | 'drum' | 'pop' | 'blip';
export type Mood = 'off' | 'lobby' | 'board' | 'minigame' | 'tense' | 'podium';

interface Prefs {
  muted: boolean;
  music: number;
  sfx: number;
}

const PREFS_KEY = 'pg.audio';
const DEFAULT_PREFS: Prefs = { muted: false, music: 0.5, sfx: 0.8 };

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

// Scale degrees → semitones (major and natural minor).
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

interface MoodDef {
  bpm: number;
  root: number; // MIDI note of the key's tonic
  scale: number[];
  /** Chord roots as scale degrees, one per bar. */
  chords: number[];
  /** Melody: scale degree per eighth note (null = rest), looped over the progression. */
  melody: (number | null)[];
  hats: boolean;
  swing: number;
}

const MOODS: Record<Exclude<Mood, 'off'>, MoodDef> = {
  lobby: { bpm: 96, root: 60, scale: MAJOR, chords: [0, 5, 3, 4], melody: [4, null, 2, null, 4, 5, null, null, 2, null, 0, null, 1, 2, null, null], hats: false, swing: 0.12 },
  board: { bpm: 112, root: 62, scale: MAJOR, chords: [0, 4, 5, 3], melody: [0, 2, 4, null, 4, 5, 4, 2, 1, null, 1, 2, 4, null, null, null], hats: true, swing: 0.1 },
  minigame: { bpm: 132, root: 57, scale: MINOR, chords: [0, 5, 3, 4], melody: [0, null, 0, 2, null, 4, 3, null, 2, null, 2, 4, null, 6, 4, null], hats: true, swing: 0 },
  tense: { bpm: 144, root: 55, scale: MINOR, chords: [0, 0, 5, 4], melody: [null, null, 0, null, null, null, 1, null, null, null, 0, null, null, 6, null, null], hats: true, swing: 0 },
  podium: { bpm: 104, root: 60, scale: MAJOR, chords: [0, 3, 4, 0], melody: [0, 2, 4, 7, null, 4, 7, null, 5, 4, 2, 4, null, null, null, null], hats: false, swing: 0.08 },
};

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise: AudioBuffer | null = null;
  private prefs: Prefs = loadPrefs();
  private listeners = new Set<() => void>();

  private mood: Mood = 'off';
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStep = 0;
  private step = 0;

  get settings(): Readonly<Prefs> {
    return this.prefs;
  }

  /** False until the browser lets audio play (it needs one click or key press on this page). */
  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  update(p: Partial<Prefs>): void {
    this.prefs = { ...this.prefs, ...p };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      // Private mode: settings last for this page only.
    }
    this.applyGains();
    this.listeners.forEach((l) => l());
  }

  /** Browsers only allow audio after a gesture: call from any click/tap handler (cheap if already running). */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    ctx.addEventListener('statechange', () => this.listeners.forEach((l) => l()));
    this.master = ctx.createGain();
    // A gentle limiter so stacked effects never clip on the stream.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.applyGains();
    return ctx;
  }

  private applyGains(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.prefs.muted ? 0 : 1, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.prefs.music * 0.35, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfx * 0.6, t, 0.05);
  }

  // ---------------------------------------------------------------- building blocks

  private tone(bus: AudioNode, type: OscillatorType, freq: number, at: number, dur: number, vol: number, slideTo?: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(bus);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private hiss(bus: AudioNode, at: number, dur: number, vol: number, freq: number, q = 1, sweepTo?: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, at);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(g).connect(bus);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  // ---------------------------------------------------------------- effects

  play(name: Sfx): void {
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running' || this.prefs.muted) return;
    const t = ctx.currentTime + 0.01;
    const bus = this.sfxBus;
    switch (name) {
      case 'coin':
        this.tone(bus, 'square', 988, t, 0.08, 0.25);
        this.tone(bus, 'square', 1319, t + 0.07, 0.22, 0.25);
        break;
      case 'coinLoss':
        this.tone(bus, 'square', 523, t, 0.1, 0.22);
        this.tone(bus, 'square', 392, t + 0.09, 0.26, 0.22);
        break;
      case 'star':
        [0, 4, 7, 12, 16].forEach((s, i) => this.tone(bus, 'triangle', midiHz(76 + s), t + i * 0.06, 0.5, 0.3));
        this.hiss(bus, t, 0.6, 0.12, 6000, 2, 12000);
        break;
      case 'roll':
        for (let i = 0; i < 6; i++) this.hiss(bus, t + i * 0.055 + Math.random() * 0.02, 0.04, 0.35, 2500 + Math.random() * 1500, 4);
        break;
      case 'whoosh':
        this.hiss(bus, t, 0.35, 0.3, 400, 0.8, 3000);
        break;
      case 'card':
        this.hiss(bus, t, 0.12, 0.3, 3000, 1.5, 1200);
        this.tone(bus, 'sine', 660, t, 0.12, 0.12, 880);
        break;
      case 'fanfare':
        [
          [0, 0, 0.14],
          [4, 0.14, 0.14],
          [7, 0.28, 0.14],
          [12, 0.42, 0.5],
        ].forEach(([s, d, len]) => {
          this.tone(bus, 'square', midiHz(67 + s!), t + d!, len!, 0.16);
          this.tone(bus, 'triangle', midiHz(55 + s!), t + d!, len!, 0.2);
        });
        break;
      case 'fail':
        this.tone(bus, 'sawtooth', 220, t, 0.25, 0.2, 180);
        this.tone(bus, 'sawtooth', 175, t + 0.25, 0.45, 0.2, 110);
        break;
      case 'tick':
        this.tone(bus, 'sine', 1800, t, 0.05, 0.2);
        break;
      case 'drum':
        this.tone(bus, 'sine', 140, t, 0.35, 0.6, 45);
        this.hiss(bus, t, 0.1, 0.25, 900, 0.7);
        break;
      case 'pop':
        this.tone(bus, 'sine', 420, t, 0.09, 0.35, 900);
        break;
      case 'blip':
        this.tone(bus, 'triangle', 880, t, 0.06, 0.15);
        break;
    }
  }

  // ---------------------------------------------------------------- music

  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (mood === 'off') return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.step = 0;
    this.nextStep = ctx.currentTime + 0.1;
    // Lookahead scheduler: wake often, schedule the next 150 ms of notes precisely.
    this.timer = setInterval(() => this.schedule(), 40);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || this.mood === 'off' || ctx.state !== 'running') return;
    const m = MOODS[this.mood];
    const eighth = 60 / m.bpm / 2;
    // Don't try to catch up after the tab was throttled: skip ahead instead.
    if (this.nextStep < ctx.currentTime - 0.2) this.nextStep = ctx.currentTime + 0.05;
    while (this.nextStep < ctx.currentTime + 0.15) {
      this.note(m, this.step, this.nextStep, eighth);
      this.step++;
      this.nextStep += eighth * (this.step % 2 === 1 ? 1 + m.swing : 1 - m.swing);
    }
  }

  private note(m: MoodDef, step: number, at: number, eighth: number): void {
    const bus = this.musicBus;
    const bar = Math.floor(step / 8) % m.chords.length;
    const inBar = step % 8;
    const deg = m.chords[bar]!;
    const pitch = (d: number, octave = 0) => m.root + m.scale[((d % 7) + 7) % 7]! + 12 * (Math.floor(d / 7) + octave);
    // Bass on beats 1 and 3, a fifth on the "and" of 4.
    if (inBar === 0 || inBar === 4) this.tone(bus, 'triangle', midiHz(pitch(deg, -2)), at, eighth * 1.8, 0.5);
    if (inBar === 7) this.tone(bus, 'triangle', midiHz(pitch(deg + 4, -2)), at, eighth * 0.9, 0.35);
    // Off-beat chord stabs.
    if (inBar % 2 === 1)
      for (const d of [0, 2, 4]) this.tone(bus, 'square', midiHz(pitch(deg + d)), at, eighth * 0.6, 0.045);
    // Melody.
    const mel = m.melody[step % m.melody.length];
    if (mel !== null && mel !== undefined) this.tone(bus, 'triangle', midiHz(pitch(mel, 1)), at, eighth * 1.4, 0.18);
    // Hi-hats on every eighth, kick on 1 and 3 for the busier moods.
    if (m.hats) {
      this.hiss(bus, at, 0.035, inBar % 2 ? 0.12 : 0.2, 8000, 1.2);
      if (inBar === 0 || inBar === 4) this.tone(bus, 'sine', 120, at, 0.2, 0.5, 45);
    }
  }
}

export const sound = new SoundEngine();

// Any click or key unlocks audio (browsers block it until a gesture).
if (typeof window !== 'undefined') {
  const unlock = () => sound.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}

// Dev builds: poke at the synth from the console (e.g. __sound.play('star')).
if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __sound: SoundEngine }).__sound = sound;
