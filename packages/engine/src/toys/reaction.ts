import { definePhase, type PhaseBase } from '../phase.ts';
import type { LobbyPhase } from '../lobby.ts';
import type { RoomEngine } from '../room.ts';
import { judgeReaction, type ReactionResult } from '../timing.ts';

/**
 * Reaction test (a lobby toy and the Quick Draw prototype). The cue — and its fake-outs — are
 * drawn on each controller at a scheduled server time; controllers time the reaction locally and
 * send only the result, so stream delay never matters.
 */
export interface Cue {
  at: number;
  /** 'go' is the real cue; anything else is a fake-out that counts as a false start. */
  label: string;
  real: boolean;
}

export interface ReactionPhase extends PhaseBase {
  kind: 'reaction';
  round: number;
  rounds: number;
  cues: Cue[];
  /** When the round's input window closes (server time). */
  closesAt: number;
  results: Record<string, ReactionResult>;
  /** Per player, total of the best reactions (false start / miss = penalty). */
  totals: Record<string, number>;
  stage: 'ready' | 'live' | 'reveal' | 'final';
  returnTo: LobbyPhase;
}

export const REACTION_ROUNDS = 3;
export const REACTION_WINDOW_MS = 2000;
const PENALTY_MS = 1500;
const FAKE_LABELS = ['FISH!', 'FIRE?', 'FIVE!', 'FIGHT?'];

export function makeCues(room: RoomEngine, start: number): Cue[] {
  const goAt = start + room.rng.int(2200, 5200);
  const cues: Cue[] = [];
  const fakes = room.rng.int(0, 2);
  let t = start + 1400;
  for (let i = 0; i < fakes && t < goAt - 900; i++) {
    t += room.rng.int(300, 1200);
    if (t > goAt - 700) break;
    cues.push({ at: t, label: room.rng.pick(FAKE_LABELS), real: false });
    t += 600;
  }
  cues.push({ at: goAt, label: 'FIRE!', real: true });
  return cues;
}

function startRound(room: RoomEngine, s: ReactionPhase): void {
  s.round++;
  s.stage = 'live';
  s.results = {};
  s.cues = makeCues(room, room.now());
  const go = s.cues.find((c) => c.real)!.at;
  s.closesAt = go + REACTION_WINDOW_MS;
  s.endsAt = s.closesAt;
  room.setPhaseTimer('close', s.closesAt + 400);
  room.scheduleBots();
}

function closeRound(room: RoomEngine, s: ReactionPhase): void {
  for (const seat of room.seats) {
    const r = s.results[seat.id] ?? { missed: true };
    s.results[seat.id] = r;
    s.totals[seat.id] = (s.totals[seat.id] ?? 0) + ('ms' in r ? r.ms : PENALTY_MS);
  }
  s.stage = s.round >= s.rounds ? 'final' : 'reveal';
  const hold = s.stage === 'final' ? 8000 : 3500;
  s.endsAt = room.now() + hold;
  room.setPhaseTimer(s.stage === 'final' ? 'end' : 'next', s.endsAt);
}

export const reactionPhase = definePhase<ReactionPhase>({
  kind: 'reaction',
  botDelay: [0, 0],
  enter(room, s) {
    s.round = 0;
    s.rounds = REACTION_ROUNDS;
    s.totals = {};
    s.results = {};
    s.cues = [];
    s.stage = 'ready';
    s.closesAt = 0;
    s.endsAt = room.now() + 2500;
    room.setPhaseTimer('next', s.endsAt);
  },
  intent(room, s, seatId, intent, sentAt) {
    if (intent.type !== 'react' || s.stage !== 'live' || seatId in s.results) return;
    // Late packets (beyond the window + grace) count as misses.
    if (room.now() > s.closesAt + 400 && sentAt === null) return;
    s.results[seatId] = judgeReaction(intent as { ms?: unknown; falseStart?: unknown }, REACTION_WINDOW_MS);
    if (room.seats.every((x) => x.id in s.results || (!x.isBot && !x.connected))) {
      room.clearPhaseTimer('close');
      closeRound(room, s);
    }
  },
  timer(room, s, key) {
    if (key === 'next') startRound(room, s);
    if (key === 'close' && s.stage === 'live') closeRound(room, s);
    if (key === 'end') room.goto({ ...s.returnTo, notice: null });
  },
  hostAction(room, s, action) {
    if (action.action === 'skip' || action.action === 'backToLobby') {
      room.goto({ ...s.returnTo, notice: null });
      return true;
    }
    return false;
  },
  awaiting: (_room, s, seatId) => s.stage === 'live' && !(seatId in s.results),
  bot(room, s, seatId) {
    // Bots answer "instantly" but with a human-looking reaction; the server doesn't wait for the cue.
    void seatId;
    if (room.rng.chance(0.06)) return { type: 'react', falseStart: true };
    return { type: 'react', ms: room.rng.int(210, 460) };
  },
  hostView: (_room, s) => ({
    round: s.round,
    rounds: s.rounds,
    stage: s.stage,
    cues: s.cues,
    closesAt: s.closesAt,
    results: s.stage === 'live' ? {} : s.results,
    submitted: Object.keys(s.results),
    totals: s.totals,
  }),
  playerView: (_room, s, seatId) => ({
    round: s.round,
    rounds: s.rounds,
    stage: s.stage,
    cues: s.cues,
    closesAt: s.closesAt,
    mine: s.results[seatId] ?? null,
    myTotal: s.totals[seatId] ?? 0,
  }),
});
