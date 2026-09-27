import { ANIMALS, MAX_PLAYERS, createRng, type DeviceProfile, type HostAction, type Intent, type Rng } from '@partygame/shared';
import { getPhase, type PhaseBase } from './phase.ts';
import { Timers } from './timers.ts';
import type { Clock, PublicSeat, Seat, SeatId, Settings, Timer } from './types.ts';

export const ROOM_STATE_VERSION = 1;
export const ROOM_IDLE_EXPIRY_MS = 2 * 60 * 60 * 1000;

export interface RoomState {
  v: number;
  code: string;
  createdAt: number;
  lastActivity: number;
  hostToken: string;
  seats: Seat[];
  nextSeatNo: number;
  settings: Settings;
  phase: PhaseBase & Record<string, any>;
  /** Bumped on every phase change so adapters can persist immediately. */
  phaseNo: number;
  timers: Timer[];
  rngState: [number, number, number, number];
  paused: boolean;
  /** Board-game state; null while in the lobby. Typed by the game module. */
  game: any;
}

export type JoinResult =
  | { ok: true; seat: Seat; rejoined: boolean }
  | { ok: false; error: string };

export type ActionReply = { t: 'hostToken'; token: string } | { t: 'seatLink'; token: string } | null;

export interface EngineDeps {
  clock: Clock;
  token(): string;
}

export type Sender = { role: 'host' } | { role: 'player'; seatId: SeatId };

/** Hook for game-level code to observe events (used by the flow controller). */
export type ActionHandler = (room: RoomEngine, action: HostAction, by: Sender) => boolean;
const actionHandlers: ActionHandler[] = [];
export function onHostAction(handler: ActionHandler): void {
  actionHandlers.push(handler);
}

export class RoomEngine {
  readonly timers: Timers;
  readonly rng: Rng;
  /** Seats kicked since the last drain, so the adapter can close their sockets. */
  kicked: SeatId[] = [];

  constructor(
    public state: RoomState,
    private deps: EngineDeps,
  ) {
    this.timers = new Timers(state.timers);
    this.rng = createRng(state.rngState);
  }

  static createState(code: string, hostToken: string, now: number, seed: number): RoomState {
    return {
      v: ROOM_STATE_VERSION,
      code,
      createdAt: now,
      lastActivity: now,
      hostToken,
      seats: [],
      nextSeatNo: 1,
      settings: { length: 'standard', movement: 'dice', removedGames: [] },
      phase: { kind: 'lobby', startedAt: now },
      phaseNo: 0,
      timers: [],
      rngState: createRng(seed).state(),
      paused: false,
      game: null,
    };
  }

  now(): number {
    return this.deps.clock.now();
  }

  // ---------------------------------------------------------------- seats

  get seats(): Seat[] {
    return this.state.seats;
  }

  seat(id: SeatId): Seat | undefined {
    return this.state.seats.find((s) => s.id === id);
  }

  seatByToken(token: string): Seat | undefined {
    return this.state.seats.find((s) => s.token === token);
  }

  /** Seats taking part in play: humans and bots, in join order. */
  get players(): Seat[] {
    return this.state.seats;
  }

  get vip(): Seat | undefined {
    return this.state.seats.find((s) => s.vip);
  }

  publicSeat(s: Seat): PublicSeat {
    return {
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      isBot: s.isBot,
      vip: s.vip,
      connected: s.connected || s.isBot,
      device: s.device?.kind ?? null,
      streamDelayMs: s.streamDelayMs,
    };
  }

  private freeAvatar(preferred?: number): number | null {
    const taken = new Set(this.state.seats.map((s) => s.avatar));
    if (preferred !== undefined && !taken.has(preferred)) return preferred;
    for (let i = 0; i < ANIMALS.length; i++) if (!taken.has(i)) return i;
    return null;
  }

  join(rawName: string, avatar?: number): JoinResult {
    const name = rawName.trim().replace(/\s+/g, ' ').slice(0, 16);
    if (!name) return { ok: false, error: 'Pick a name first.' };
    const existing = this.state.seats.find((s) => !s.isBot && s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.connected) return { ok: false, error: `Someone called ${existing.name} is already playing.` };
      // Rejoin by name: the design doc lets a player reclaim their seat by name at any point.
      this.touch();
      return { ok: true, seat: existing, rejoined: true };
    }
    if (this.state.phase.kind !== 'lobby') return { ok: false, error: 'This game has already started. Rejoin with the name you used.' };
    if (this.state.seats.length >= MAX_PLAYERS) {
      const bot = this.state.seats.find((s) => s.isBot);
      if (!bot) return { ok: false, error: 'This room is full (16 players).' };
      this.removeSeat(bot.id);
    }
    const av = this.freeAvatar(avatar);
    if (av === null) return { ok: false, error: 'This room is full (16 players).' };
    const seat: Seat = {
      id: `s${this.state.nextSeatNo++}`,
      name,
      avatar: av,
      token: this.deps.token(),
      isBot: false,
      vip: !this.state.seats.some((s) => s.vip && !s.isBot),
      connected: false,
      device: null,
      streamDelayMs: 0,
      joinedAt: this.now(),
    };
    this.state.seats.push(seat);
    this.touch();
    return { ok: true, seat, rejoined: false };
  }

  addBot(): Seat | null {
    if (this.state.seats.length >= MAX_PLAYERS) return null;
    const av = this.freeAvatar();
    if (av === null) return null;
    const animal = ANIMALS[av]!;
    const seat: Seat = {
      id: `s${this.state.nextSeatNo++}`,
      name: `${animal[0]!.toUpperCase()}${animal.slice(1)} Bot`,
      avatar: av,
      token: this.deps.token(),
      isBot: true,
      vip: false,
      connected: true,
      device: null,
      streamDelayMs: 0,
      joinedAt: this.now(),
    };
    this.state.seats.push(seat);
    this.scheduleBots();
    return seat;
  }

  private removeSeat(id: SeatId): void {
    const i = this.state.seats.findIndex((s) => s.id === id);
    if (i < 0) return;
    const [removed] = this.state.seats.splice(i, 1);
    if (removed?.vip) this.reassignVip();
  }

  private reassignVip(): void {
    for (const s of this.state.seats) s.vip = false;
    const next = this.state.seats.find((s) => !s.isBot && s.connected) ?? this.state.seats.find((s) => !s.isBot);
    if (next) next.vip = true;
  }

  setConnected(id: SeatId, connected: boolean): void {
    const seat = this.seat(id);
    if (!seat || seat.connected === connected) return;
    seat.connected = connected;
    this.touch();
    // The VIP runs the game, so it should always be someone who is actually here.
    const vip = this.vip;
    if (connected && !seat.isBot && (!vip || !vip.connected)) {
      if (vip) vip.vip = false;
      seat.vip = true;
    } else if (!connected && seat.vip) {
      const next = this.state.seats.find((s) => !s.isBot && s.connected);
      if (next) {
        seat.vip = false;
        next.vip = true;
      }
    }
    // Disconnected seats are played by the autopilot, which uses the bot hooks.
    this.scheduleBots();
  }

  setDevice(id: SeatId, profile: DeviceProfile): void {
    const seat = this.seat(id);
    if (seat) seat.device = profile;
  }

  /** Seats the bot driver plays for: bots, and humans who have dropped (autopilot). */
  isAutomated(seat: Seat): boolean {
    return seat.isBot || (!seat.connected && this.state.phase.kind !== 'lobby');
  }

  touch(): void {
    this.state.lastActivity = this.now();
  }

  // ---------------------------------------------------------------- phases

  get phase(): PhaseBase & Record<string, any> {
    return this.state.phase;
  }

  goto(next: { kind: string; startedAt?: number; [k: string]: any }): void {
    this.timers.clearPrefix('phase:');
    this.timers.clearPrefix('bot:');
    this.state.phase = { ...next, startedAt: next.startedAt ?? this.now() } as PhaseBase & Record<string, any>;
    this.state.phaseNo++;
    getPhase(this.state.phase.kind).enter?.(this, this.state.phase);
    // `enter` may itself have moved on to another phase.
    this.scheduleBots();
  }

  /** Sets the phase's own timer (cleared automatically on phase change). */
  setPhaseTimer(name: string, at: number): void {
    this.timers.set(`phase:${name}`, at);
  }

  clearPhaseTimer(name: string): void {
    this.timers.clear(`phase:${name}`);
  }

  // ---------------------------------------------------------------- input

  intent(seatId: SeatId, intent: Intent, sentAt: number | null = null): void {
    const seat = this.seat(seatId);
    if (!seat) return;
    this.touch();
    if (this.state.paused) return;
    const def = getPhase(this.state.phase.kind);
    def.intent?.(this, this.state.phase, seatId, intent, sentAt);
  }

  hostAction(action: HostAction, by: Sender): ActionReply {
    if (by.role === 'player' && !this.seat(by.seatId)?.vip) {
      // The one action any player may take: getting their own personal link again.
      if (action.action === 'seatLink') return { t: 'seatLink', token: this.seat(by.seatId)!.token };
      return null;
    }
    this.touch();
    switch (action.action) {
      case 'addBot':
        this.addBot();
        return null;
      case 'removeBots':
        if (this.state.phase.kind === 'lobby') for (const s of this.state.seats.filter((x) => x.isBot)) this.removeSeat(s.id);
        return null;
      case 'kick': {
        const seat = this.seat(action.seatId);
        if (!seat) return null;
        if (this.state.phase.kind === 'lobby') this.removeSeat(seat.id);
        else {
          // Mid-game the seat keeps its score and becomes a bot.
          seat.isBot = true;
          seat.vip = false;
          seat.token = this.deps.token();
          if (!this.vip) this.reassignVip();
          this.scheduleBots();
        }
        this.kicked.push(seat.id);
        return null;
      }
      case 'setVip': {
        const seat = this.seat(action.seatId);
        if (!seat || seat.isBot) return null;
        for (const s of this.state.seats) s.vip = false;
        seat.vip = true;
        return null;
      }
      case 'pause':
        this.state.paused = action.paused;
        return null;
      case 'newHostToken':
        this.state.hostToken = this.deps.token();
        return { t: 'hostToken', token: this.state.hostToken };
      case 'seatLink':
        if (by.role === 'player') return { t: 'seatLink', token: this.seat(by.seatId)!.token };
        return null;
      case 'settings':
        if (this.state.phase.kind === 'lobby') this.applySettings(action.settings);
        return null;
      default: {
        const def = getPhase(this.state.phase.kind);
        if (def.hostAction?.(this, this.state.phase, action)) return null;
        for (const handler of actionHandlers) if (handler(this, action, by)) return null;
        return null;
      }
    }
  }

  private applySettings(input: Record<string, unknown>): void {
    const s = this.state.settings;
    if (input.length === 'quick' || input.length === 'standard' || input.length === 'long') s.length = input.length;
    if (input.movement === 'dice' || input.movement === 'cards') s.movement = input.movement;
    if (typeof input.devTools === 'boolean') s.devTools = input.devTools;
    if (input.forceGame === null || (typeof input.forceGame === 'string' && input.forceGame.length <= 40)) s.forceGame = input.forceGame as string | null;
    if (Array.isArray(input.removedGames)) s.removedGames = input.removedGames.filter((x): x is string => typeof x === 'string').slice(0, 64);
  }

  // ---------------------------------------------------------------- timers & bots

  /** Runs every timer that is due. Returns true if anything ran. */
  fireTimers(): boolean {
    let ran = false;
    // Loop because handlers can schedule timers that are already due.
    for (let guard = 0; guard < 100; guard++) {
      const due = this.timers.takeDue(this.now());
      if (due.length === 0) break;
      for (const t of due) {
        ran = true;
        this.runTimer(t.key);
      }
    }
    return ran;
  }

  private runTimer(key: string): void {
    if (key.startsWith('bot:')) {
      const seatId = key.slice(4);
      this.runBot(seatId);
      return;
    }
    if (this.state.paused && key.startsWith('phase:')) {
      // Hold phase timers while paused; re-check shortly.
      this.timers.set(key, this.now() + 500);
      return;
    }
    if (key.startsWith('phase:')) {
      getPhase(this.state.phase.kind).timer?.(this, this.state.phase, key.slice(6));
    }
  }

  /** Schedules a think-timer for every automated seat the current phase is waiting on. */
  scheduleBots(): void {
    const def = getPhase(this.state.phase.kind);
    if (!def.bot || !def.awaiting) return;
    const [lo, hi] = typeof def.botDelay === 'function' ? def.botDelay(this, this.state.phase) : (def.botDelay ?? [700, 2600]);
    for (const seat of this.state.seats) {
      if (!this.isAutomated(seat)) continue;
      const key = `bot:${seat.id}`;
      if (this.timers.has(key)) continue;
      if (!def.awaiting(this, this.state.phase, seat.id)) continue;
      // Humans who dropped get extra grace before the autopilot steps in.
      const grace = seat.isBot ? 0 : 1500;
      this.timers.set(key, this.now() + grace + this.rng.int(Math.max(0, Math.round(lo)), Math.max(0, Math.round(Math.max(lo, hi)))));
    }
  }

  private runBot(seatId: SeatId): void {
    const seat = this.seat(seatId);
    if (!seat || !this.isAutomated(seat) || this.state.paused) return;
    const def = getPhase(this.state.phase.kind);
    if (!def.bot || !def.awaiting?.(this, this.state.phase, seatId)) return;
    const intent = def.bot(this, this.state.phase, seatId);
    if (intent) def.intent?.(this, this.state.phase, seatId, intent, null);
    this.scheduleBots();
  }

  tickHz(): number {
    if (this.state.paused) return 0;
    const def = getPhase(this.state.phase.kind);
    return def.tickHz?.(this, this.state.phase) ?? 0;
  }

  tick(): unknown {
    const def = getPhase(this.state.phase.kind);
    return def.tick?.(this, this.state.phase);
  }

  nextTimerAt(): number | null {
    return this.timers.next();
  }

  // ---------------------------------------------------------------- views

  hostView(): unknown {
    const def = getPhase(this.state.phase.kind);
    return {
      code: this.state.code,
      seats: this.state.seats.map((s) => this.publicSeat(s)),
      settings: this.state.settings,
      paused: this.state.paused,
      phase: { kind: this.state.phase.kind, startedAt: this.state.phase.startedAt, endsAt: this.state.phase.endsAt ?? null, ...(def.hostView(this, this.state.phase) as object) },
      game: this.state.game ? this.gameHostView() : null,
    };
  }

  playerView(seatId: SeatId): unknown {
    const seat = this.seat(seatId);
    if (!seat) return null;
    const def = getPhase(this.state.phase.kind);
    return {
      code: this.state.code,
      me: { ...this.publicSeat(seat) },
      seats: this.state.seats.map((s) => this.publicSeat(s)),
      settings: this.state.settings,
      paused: this.state.paused,
      phase: { kind: this.state.phase.kind, startedAt: this.state.phase.startedAt, endsAt: this.state.phase.endsAt ?? null, ...(def.playerView(this, this.state.phase, seatId) as object) },
      game: this.state.game ? this.gamePlayerView(seatId) : null,
    };
  }

  /** Overridden by the game module via `setGameViews`. */
  private gameHostView(): unknown {
    return gameViews.host(this);
  }

  private gamePlayerView(seatId: SeatId): unknown {
    return gameViews.player(this, seatId);
  }

  /** Writes live objects (RNG) back into the serialisable state before persisting. */
  snapshot(): RoomState {
    this.state.rngState = this.rng.state();
    return this.state;
  }

  isExpired(): boolean {
    return this.now() - this.state.lastActivity > ROOM_IDLE_EXPIRY_MS;
  }
}

const gameViews: { host(room: RoomEngine): unknown; player(room: RoomEngine, seatId: SeatId): unknown } = {
  host: () => null,
  player: () => null,
};

export function setGameViews(views: typeof gameViews): void {
  gameViews.host = views.host;
  gameViews.player = views.player;
}
