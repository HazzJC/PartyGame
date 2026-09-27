import type { HostAction, Intent } from '@partygame/shared';
import type { RoomEngine } from './room.ts';
import type { SeatId } from './types.ts';

/** Every phase's persisted state carries its kind and when it started. */
export interface PhaseBase {
  kind: string;
  startedAt: number;
  /** When the phase's own countdown ends, if it has one (drawn by clients). */
  endsAt?: number | null;
}

/**
 * A phase of the room's state machine (lobby, board roll, a mini game, …).
 * Handlers mutate `s` in place; the engine persists and broadcasts afterwards.
 */
export interface PhaseDef<S extends PhaseBase = PhaseBase> {
  kind: S['kind'];
  enter?(room: RoomEngine, s: S): void;
  intent?(room: RoomEngine, s: S, seatId: SeatId, intent: Intent, sentAt: number | null): void;
  timer?(room: RoomEngine, s: S, key: string): void;
  /** Return true if the phase consumed the host action. */
  hostAction?(room: RoomEngine, s: S, action: HostAction): boolean;
  hostView(room: RoomEngine, s: S): unknown;
  playerView(room: RoomEngine, s: S, seatId: SeatId): unknown;
  /** True while this seat still owes the phase an input (drives bots and autopilot). */
  awaiting?(room: RoomEngine, s: S, seatId: SeatId): boolean;
  /** The input a bot (or the autopilot for a disconnected player) makes. */
  bot?(room: RoomEngine, s: S, seatId: SeatId): Intent | null;
  /** Bot think time range in ms. */
  botDelay?: [number, number];
  /** Real-time phases: ticks per second the adapter should drive (0 or absent = none). */
  tickHz?(room: RoomEngine, s: S): number;
  /** Advances one real-time step; the return value is broadcast as a compact tick message. */
  tick?(room: RoomEngine, s: S): unknown;
}

const registry = new Map<string, PhaseDef<any>>();

export function definePhase<S extends PhaseBase>(def: PhaseDef<S>): PhaseDef<S> {
  registry.set(def.kind, def);
  return def;
}

export function getPhase(kind: string): PhaseDef<any> {
  const def = registry.get(kind);
  if (!def) throw new Error(`Unknown phase ${kind}`);
  return def;
}
