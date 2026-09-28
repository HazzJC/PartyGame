/**
 * Host screen audio. Music is a set of CC0 tracks (see /credits) that crossfade by game mood;
 * sound effects are synthesised with WebAudio. Everything plays on the host screen only, so it
 * reaches players through the stream. Volume settings are saved per browser.
 */

export type Sfx = 'coin' | 'coinLoss' | 'star' | 'roll' | 'whoosh' | 'card' | 'fanfare' | 'fail' | 'tick' | 'drum' | 'pop' | 'blip' | 'motifRound' | 'motifStar' | 'motifLoss';
export type Mood = 'off' | 'lobby' | 'board' | 'minigame' | 'tense' | 'podium';

interface Prefs {
  muted: boolean;
  /** Master volume, 0 to 1. */
  volume: number;
  music: number;
  sfx: number;
}

const PREFS_KEY = 'pg.audio';
const DEFAULT_PREFS: Prefs = { muted: false, volume: 0.8, music: 0.6, sfx: 0.8 };

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Tracks per mood (loudness-normalised MP3s in public/music). Moods with several loops take turns. */
const TRACKS: Record<Exclude<Mood, 'off'>, { loops: string[]; intro?: string }> = {
  lobby: { loops: ['/music/lobby.mp3'] },
  board: { loops: ['/music/board.mp3'] },
  minigame: { loops: ['/music/minigame.mp3', '/music/minigame2.mp3'] },
  tense: { loops: ['/music/tense.mp3'], intro: '/music/tense-intro.mp3' },
  // A victory fanfare as the podium appears, then a happy loop.
  podium: { loops: ['/music/podium.mp3'], intro: '/music/podium-intro.mp3' },
};

const CROSSFADE_S = 0.9;

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface Trimmed {
  buffer: AudioBuffer;
  /** Where the audio really starts and ends (MP3 encoding adds silence, which would gap a loop). */
  start: number;
  end: number;
}

function trimSilence(buffer: AudioBuffer): Trimmed {
  const threshold = 0.001;
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const loud = (i: number) => chans.some((c) => Math.abs(c[i]!) > threshold);
  let first = 0;
  while (first < buffer.length && !loud(first)) first++;
  let last = buffer.length - 1;
  while (last > first && !loud(last)) last--;
  // Only trim encoder padding (a few tens of ms), never a deliberate pause.
  const maxTrim = Math.round(buffer.sampleRate * 0.12);
  first = Math.min(first, maxTrim);
  last = Math.max(last, buffer.length - 1 - maxTrim);
  return { buffer, start: first / buffer.sampleRate, end: (last + 1) / buffer.sampleRate };
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise: AudioBuffer | null = null;
  private prefs: Prefs = loadPrefs();
  private listeners = new Set<() => void>();
  private phaseMusicLevel = 0.55;

  private mood: Mood = 'off';
  private playing: { mood: Mood; gain: GainNode; sources: AudioBufferSourceNode[] } | null = null;
  private moodToken = 0;
  private turn: Record<string, number> = {};
  private tracks = new Map<string, Promise<Trimmed | null>>();

  private readonly tabId = Math.random().toString(36).slice(2);
  private yielded = false;
  private readonly channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pg-music') : null;

  constructor() {
    // Only one host screen per browser plays music: the newest one asks the others to stop.
    this.channel?.addEventListener('message', (e: MessageEvent<{ claim?: string }>) => {
      if (!e.data?.claim || e.data.claim === this.tabId) return;
      this.yielded = true;
      this.stopMusic();
    });
  }

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

  async testSound(): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running' || this.prefs.muted || this.prefs.volume === 0 || this.prefs.sfx === 0) return false;
    this.play('motifRound');
    return true;
  }

  setPhaseMusicLevel(level: number): void {
    if (this.phaseMusicLevel === level) return;
    this.phaseMusicLevel = level;
    this.applyGains();
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    ctx.addEventListener('statechange', () => {
      // A mood chosen before audio was allowed starts as soon as it is.
      if (ctx.state === 'running' && this.mood !== 'off' && !this.playing) this.startMood(this.mood);
      this.listeners.forEach((l) => l());
    });
    this.master = ctx.createGain();
    // A gentle limiter so stacked effects never clip on the stream.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
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
    // Squared, so the slider feels even to the ear.
    const master = this.prefs.muted ? 0 : this.prefs.volume * this.prefs.volume;
    this.master.gain.setTargetAtTime(master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.prefs.music * this.phaseMusicLevel, t, 0.12);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfx * 0.6, t, 0.05);
  }

  // ---------------------------------------------------------------- effects

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

  play(name: Sfx): void {
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running' || this.prefs.muted) return;
    const t = ctx.currentTime + 0.01;
    const bus = this.sfxBus;
    switch (name) {
      case 'motifRound':
      case 'motifStar':
      case 'motifLoss': {
        const notes = name === 'motifLoss' ? [79, 76, 72, 67] : name === 'motifStar' ? [72, 76, 79, 84, 88] : [72, 76, 79, 84];
        notes.forEach((note, i) => this.tone(bus, 'triangle', midiHz(note), t + i * 0.105, i === notes.length - 1 ? 0.34 : 0.18, name === 'motifLoss' ? 0.14 : 0.19));
        if (name === 'motifStar') this.hiss(bus, t + 0.28, 0.32, 0.055, 6500, 2, 10000);
        break;
      }
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

  private load(url: string): Promise<Trimmed | null> {
    let p = this.tracks.get(url);
    if (!p) {
      const ctx = this.ctx!;
      p = fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
        .then((data) => ctx.decodeAudioData(data))
        .then(trimSilence)
        .catch(() => {
          // Retry next time rather than caching a failure (e.g. a flaky connection).
          this.tracks.delete(url);
          return null;
        });
      this.tracks.set(url, p);
    }
    return p;
  }

  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (mood === 'off') return this.stopMusic();
    this.yielded = false;
    this.channel?.postMessage({ claim: this.tabId });
    const ctx = this.ensure();
    if (ctx?.state === 'running') this.startMood(mood);
  }

  private async startMood(mood: Exclude<Mood, 'off'> | Mood): Promise<void> {
    if (mood === 'off' || this.yielded) return;
    const token = ++this.moodToken;
    const def = TRACKS[mood];
    const n = this.turn[mood] ?? 0;
    this.turn[mood] = n + 1;
    const [loop, intro] = await Promise.all([this.load(def.loops[n % def.loops.length]!), def.intro ? this.load(def.intro) : Promise.resolve(null)]);
    // The mood may have moved on while the track was loading.
    if (token !== this.moodToken || !loop || this.yielded) return;
    const ctx = this.ctx!;
    this.fadeOut();
    const gain = ctx.createGain();
    gain.connect(this.musicBus);
    const t = ctx.currentTime + 0.05;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + CROSSFADE_S);
    const sources: AudioBufferSourceNode[] = [];
    let at = t;
    if (intro) {
      const src = ctx.createBufferSource();
      src.buffer = intro.buffer;
      src.connect(gain);
      src.start(at, intro.start, intro.end - intro.start);
      sources.push(src);
      at += intro.end - intro.start;
    }
    const src = ctx.createBufferSource();
    src.buffer = loop.buffer;
    src.loop = true;
    src.loopStart = loop.start;
    src.loopEnd = loop.end;
    src.connect(gain);
    src.start(at, loop.start);
    sources.push(src);
    this.playing = { mood, gain, sources };
  }

  private fadeOut(): void {
    const old = this.playing;
    this.playing = null;
    if (!old || !this.ctx) return;
    const t = this.ctx.currentTime;
    old.gain.gain.cancelScheduledValues(t);
    old.gain.gain.setValueAtTime(old.gain.gain.value, t);
    old.gain.gain.linearRampToValueAtTime(0, t + CROSSFADE_S);
    for (const s of old.sources) s.stop(t + CROSSFADE_S + 0.05);
  }

  private stopMusic(): void {
    this.moodToken++;
    this.fadeOut();
  }
}

export const sound = new SoundEngine();

// Any click or key unlocks audio (browsers block it until a gesture).
if (typeof window !== 'undefined') {
  const unlock = () => sound.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}

// Dev builds: poke at the engine from the console (e.g. __sound.play('star')).
if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __sound: SoundEngine }).__sound = sound;
