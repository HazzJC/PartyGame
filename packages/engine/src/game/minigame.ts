import type { CoopGrade, Format, InputSpec, Intent, Rng } from '@partygame/shared';
import { definePhase, type PhaseBase } from '../phase.ts';
import type { RoomEngine } from '../room.ts';
import type { SeatId } from '../types.ts';

/** What a mini game reports when it ends. Its internal score only sets placement. */
export type MinigameResult =
  | { kind: 'ffa'; places: Record<SeatId, number> }
  | { kind: 'team'; teamPlaces: number[] }
  | { kind: '1vN'; smallWins: boolean }
  | { kind: 'coop'; grade: CoopGrade }
  | { kind: 'duel'; winner: SeatId | null };

export interface MinigamePhase extends PhaseBase {
  kind: 'minigame';
  gameId: string;
  format: Format;
  participants: SeatId[];
  teams?: SeatId[][];
  stage: 'play' | 'reveal';
  data: any;
  result: MinigameResult | null;
  /** Coins paid to each player (applied when the game finishes). */
  payout: Record<SeatId, number> | null;
  /** When the host screen's reveal animation ends (server time). */
  revealEndsAt: number | null;
  /** Players the autopilot covered (they receive the median payout). */
  autopiloted: SeatId[];
}

export interface MgContext {
  room: RoomEngine;
  phase: MinigamePhase;
  rng: Rng;
  /** Number of participants. */
  n: number;
  now(): number;
  setTimer(name: string, at: number): void;
  clearTimer(name: string): void;
  /** Ends play: shows the reveal for `revealMs`, then the payout. */
  finish(result: MinigameResult, revealMs: number): void;
}

export interface MinigameDef<D = any> {
  id: string;
  name: string;
  formats: Format[];
  inputs: InputSpec[];
  /** One or two sentences for the rules card. */
  blurb: string;
  minPlayers?: number;
  /** Team games: how many teams it supports (default 2 and 4). 4 teams merge into 2 otherwise. */
  teamCounts?: number[];
  setup(ctx: MgContext): D;
  intent?(ctx: MgContext, d: D, seatId: SeatId, intent: Intent, sentAt: number | null): void;
  /** Named timers set with ctx.setTimer. 'deadline' is also fired when the VIP skips. */
  timer?(ctx: MgContext, d: D, key: string): void;
  awaiting?(ctx: MgContext, d: D, seatId: SeatId): boolean;
  bot?(ctx: MgContext, d: D, seatId: SeatId): Intent | null;
  botDelay?: [number, number] | ((ctx: MgContext, d: D) => [number, number]);
  tickHz?(ctx: MgContext, d: D): number;
  tick?(ctx: MgContext, d: D): unknown;
  hostView(ctx: MgContext, d: D): unknown;
  playerView(ctx: MgContext, d: D, seatId: SeatId): unknown;
}

const registry = new Map<string, MinigameDef>();

export function defineMinigame<D>(def: MinigameDef<D>): MinigameDef<D> {
  registry.set(def.id, def as MinigameDef);
  return def;
}

export function getMinigame(id: string): MinigameDef {
  const def = registry.get(id);
  if (!def) throw new Error(`Unknown mini game ${id}`);
  return def;
}

export function allMinigames(): MinigameDef[] {
  return [...registry.values()];
}

type FinishHandler = (room: RoomEngine, phase: MinigamePhase, result: MinigameResult, revealMs: number) => void;
let finishHandler: FinishHandler = () => undefined;
/** The flow controller decides what finishing means (payout, next phase). */
export function onMinigameFinish(handler: FinishHandler): void {
  finishHandler = handler;
}

function ctxFor(room: RoomEngine, phase: MinigamePhase): MgContext {
  return {
    room,
    phase,
    rng: room.rng,
    n: phase.participants.length,
    now: () => room.now(),
    setTimer: (name, at) => room.setPhaseTimer(`mg:${name}`, at),
    clearTimer: (name) => room.clearPhaseTimer(`mg:${name}`),
    finish: (result, revealMs) => {
      if (phase.stage !== 'play') return;
      room.timers.clearPrefix('phase:mg:');
      room.timers.clearPrefix('bot:');
      finishHandler(room, phase, result, revealMs);
    },
  };
}

export const minigamePhase = definePhase<MinigamePhase>({
  kind: 'minigame',
  enter(room, s) {
    const def = getMinigame(s.gameId);
    s.stage = 'play';
    s.result = null;
    s.payout = null;
    s.revealEndsAt = null;
    s.autopiloted = [];
    s.data = def.setup(ctxFor(room, s));
  },
  intent(room, s, seatId, intent, sentAt) {
    if (s.stage !== 'play' || !s.participants.includes(seatId)) return;
    getMinigame(s.gameId).intent?.(ctxFor(room, s), s.data, seatId, intent, sentAt);
  },
  timer(room, s, key) {
    if (key.startsWith('mg:')) {
      if (s.stage === 'play') getMinigame(s.gameId).timer?.(ctxFor(room, s), s.data, key.slice(3));
      return;
    }
    // Other keys belong to the flow controller (e.g. the end of the reveal).
    flowTimer(room, s, key);
  },
  hostAction(room, s, action) {
    if (action.action === 'skip' && s.stage === 'play') {
      getMinigame(s.gameId).timer?.(ctxFor(room, s), s.data, 'deadline');
      return true;
    }
    return false;
  },
  awaiting(room, s, seatId) {
    if (s.stage !== 'play' || !s.participants.includes(seatId)) return false;
    return getMinigame(s.gameId).awaiting?.(ctxFor(room, s), s.data, seatId) ?? false;
  },
  bot(room, s, seatId) {
    const def = getMinigame(s.gameId);
    const seat = room.seat(seatId);
    if (seat && !seat.isBot && !s.autopiloted.includes(seatId)) s.autopiloted.push(seatId);
    return def.bot?.(ctxFor(room, s), s.data, seatId) ?? null;
  },
  botDelay(room, s) {
    const d = getMinigame(s.gameId).botDelay;
    if (!d) return [700, 2600];
    return typeof d === 'function' ? d(ctxFor(room, s), s.data) : d;
  },
  tickHz(room, s) {
    if (s.stage !== 'play') return 0;
    return getMinigame(s.gameId).tickHz?.(ctxFor(room, s), s.data) ?? 0;
  },
  tick(room, s) {
    return getMinigame(s.gameId).tick?.(ctxFor(room, s), s.data);
  },
  hostView(room, s) {
    const def = getMinigame(s.gameId);
    return {
      gameId: s.gameId,
      name: def.name,
      format: s.format,
      participants: s.participants,
      teams: s.teams ?? null,
      stage: s.stage,
      result: s.result,
      payout: s.payout,
      revealEndsAt: s.revealEndsAt,
      game: def.hostView(ctxFor(room, s), s.data),
    };
  },
  playerView(room, s, seatId) {
    const def = getMinigame(s.gameId);
    const reveal = s.stage === 'reveal';
    return {
      gameId: s.gameId,
      name: def.name,
      format: s.format,
      playing: s.participants.includes(seatId),
      team: s.teams ? s.teams.findIndex((t) => t.includes(seatId)) : null,
      stage: s.stage,
      revealEndsAt: s.revealEndsAt,
      // Personal result travels with the reveal; the player screen holds it back by the stream delay.
      mine: reveal ? { coins: s.payout?.[seatId] ?? 0, place: s.result?.kind === 'ffa' ? (s.result.places[seatId] ?? null) : null, result: s.result } : null,
      game: def.playerView(ctxFor(room, s), s.data, seatId),
    };
  },
});

type FlowTimer = (room: RoomEngine, phase: MinigamePhase, key: string) => void;
let flowTimer: FlowTimer = () => undefined;
export function onMinigameFlowTimer(handler: FlowTimer): void {
  flowTimer = handler;
}
