import { definePhase, type PhaseBase } from '../phase.ts';
import { onHostAction, type RoomEngine } from '../room.ts';
import { flowHooks, onDuelWinner } from './flow.ts';
import { allMinigames, getMinigame } from './minigame.ts';
import { actingMember, addCoins, entityOf, game, type GameState, type PendingDuel } from './state.ts';

export const STAKES = [5, 10, 20] as const;
export const MAX_BET = 3;
const CHALLENGE_MS = 10_000;
const BET_MS = 10_000;
const RESULT_MS = 7000;

export interface Bet {
  side: 'a' | 'b';
  coins: number;
}

export interface DuelState {
  /** Duelling entities (players, or teams in team board mode). */
  a: string;
  b: string;
  /** The seats who actually play the duel game for a and b. */
  seats: [string, string];
  stake: number;
  gameId: string;
  reason: PendingDuel['reason'];
  bets: Record<string, Bet>;
  winner?: string | null;
}

/** Wager: 5, 10 or 20, capped at what the poorer player holds. */
export function capStake(g: GameState, a: string, b: string, wanted: number): number {
  const cap = Math.min(g.players[a]!.coins, g.players[b]!.coins);
  const stake = STAKES.includes(wanted as (typeof STAKES)[number]) ? wanted : STAKES[0];
  return Math.max(0, Math.min(stake, cap));
}

/**
 * Spectator pool: the losing side's coins are split among correct bettors in proportion to their
 * stake (so the game never sets odds and underdog picks pay more). Returns each bettor's net change.
 */
export function settleBets(bets: Record<string, Bet>, winner: 'a' | 'b' | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (winner === null) {
    for (const [id, bet] of Object.entries(bets)) out[id] = 0;
    return out;
  }
  const right = Object.entries(bets).filter(([, x]) => x.side === winner);
  const wrongPool = Object.values(bets)
    .filter((x) => x.side !== winner)
    .reduce((s, x) => s + x.coins, 0);
  const rightTotal = right.reduce((s, [, x]) => s + x.coins, 0);
  for (const [id, bet] of Object.entries(bets)) {
    if (bet.side !== winner) out[id] = -bet.coins;
    else out[id] = Math.floor((wrongPool * bet.coins) / Math.max(1, rightTotal));
  }
  return out;
}

function duelGames(): string[] {
  return allMinigames()
    .filter((m) => m.formats.includes('duel'))
    .map((m) => m.id);
}

// ------------------------------------------------------------------ setup: challenge + bets

export interface DuelSetupPhase extends PhaseBase {
  kind: 'duelSetup';
  stage: 'challenge' | 'bet';
  a: string;
  b: string | null;
  reason: PendingDuel['reason'];
  stake: number | null;
  gameId: string;
  bets: Record<string, Bet>;
  /** The seat who issued the challenge (team board mode: they play the duel). */
  challenger?: string;
}

function toBets(room: RoomEngine, s: DuelSetupPhase): void {
  s.stage = 'bet';
  s.endsAt = room.now() + BET_MS;
  room.setPhaseTimer('bets', s.endsAt);
  room.scheduleBots();
}

function spectators(room: RoomEngine, s: DuelSetupPhase): string[] {
  return game(room).order.filter((id) => id !== s.a && id !== s.b);
}

function startDuelGame(room: RoomEngine, s: DuelSetupPhase): void {
  const g = game(room);
  // A team sends its challenger (or a connected teammate) to play the duel.
  const seats: [string, string] = [s.challenger && entityOf(g, s.challenger) === s.a ? s.challenger : actingMember(room, g, s.a), actingMember(room, g, s.b!)];
  g.duel = { a: s.a, b: s.b!, seats, stake: s.stake ?? 0, gameId: s.gameId, reason: s.reason, bets: s.bets };
  room.goto({ kind: 'rules', gameId: s.gameId, format: 'duel', participants: seats, ready: [] });
}

/** Team board mode has no spectator bets: every team is a player, so the pool would be tiny. */
function afterChallenge(room: RoomEngine, s: DuelSetupPhase): void {
  if (game(room).teamBoard) startDuelGame(room, s);
  else toBets(room, s);
}

export const duelSetupPhase = definePhase<DuelSetupPhase>({
  kind: 'duelSetup',
  enter(room, s) {
    s.gameId = room.rng.pick(duelGames());
    s.bets = {};
    s.stake = null;
    s.stage = 'challenge';
    s.endsAt = room.now() + CHALLENGE_MS;
    room.setPhaseTimer('challenge', s.endsAt);
  },
  intent(room, s, seatId, intent) {
    const g = game(room);
    if (intent.type === 'challenge' && s.stage === 'challenge' && entityOf(g, seatId) === s.a) {
      if (!s.b) {
        const opp = String(intent.opponent ?? '');
        if (!g.players[opp] || opp === s.a) return;
        s.b = opp;
      }
      s.stake = capStake(g, s.a, s.b, Number(intent.stake));
      s.challenger = seatId;
      room.clearPhaseTimer('challenge');
      afterChallenge(room, s);
    } else if (intent.type === 'bet' && s.stage === 'bet' && seatId !== s.a && seatId !== s.b && !(seatId in s.bets)) {
      const side = intent.side === 'b' ? 'b' : 'a';
      const coins = Math.max(1, Math.min(MAX_BET, Math.round(Number(intent.coins) || 1)));
      // The stake leaves your purse into the pool now, and comes back if you called it right.
      const paid = -addCoins(g, seatId, -coins);
      if (paid <= 0) return;
      s.bets[seatId] = { side, coins: paid };
      if (spectators(room, s).every((id) => id in s.bets)) room.setPhaseTimer('bets', room.now() + 800);
    }
  },
  timer(room, s, key) {
    if (key === 'challenge' && s.stage === 'challenge') {
      const g = game(room);
      if (!s.b) s.b = room.rng.pick(g.order.filter((id) => id !== s.a));
      s.stake = capStake(g, s.a, s.b, STAKES[0]);
      afterChallenge(room, s);
    } else if (key === 'bets' && s.stage === 'bet') startDuelGame(room, s);
  },
  hostAction(room, s, action) {
    if (action.action !== 'skip') return false;
    room.setPhaseTimer(s.stage === 'challenge' ? 'challenge' : 'bets', room.now());
    return true;
  },
  awaiting: (room, s, seatId) => (s.stage === 'challenge' ? entityOf(game(room), seatId) === s.a : s.stage === 'bet' && seatId !== s.a && seatId !== s.b && !(seatId in s.bets)),
  botDelay: [900, 4000],
  bot(room, s, seatId) {
    const g = game(room);
    if (s.stage === 'challenge') return { type: 'challenge', opponent: room.rng.pick(g.order.filter((id) => id !== s.a)), stake: room.rng.pick(STAKES) };
    if (!room.rng.chance(0.6)) return { type: 'bet', side: room.rng.chance(0.5) ? 'a' : 'b', coins: 1 };
    return { type: 'bet', side: room.rng.chance(0.5) ? 'a' : 'b', coins: room.rng.int(1, MAX_BET) };
  },
  hostView(room, s) {
    const tally = (side: 'a' | 'b') => {
      const bets = Object.values(s.bets).filter((x) => x.side === side);
      return { count: bets.length, coins: bets.reduce((n, x) => n + x.coins, 0) };
    };
    return { stage: s.stage, a: s.a, b: s.b, stake: s.stake, reason: s.reason, gameName: getMinigame(s.gameId).name, bets: { a: tally('a'), b: tally('b') }, betCount: Object.keys(s.bets).length, spectators: spectators(room, s).length };
  },
  playerView(room, s, seatId) {
    const g = game(room);
    const me = entityOf(g, seatId);
    const role = me === s.a ? 'a' : me === s.b ? 'b' : 'spectator';
    return {
      stage: s.stage,
      role,
      a: s.a,
      b: s.b,
      stake: s.stake,
      reason: s.reason,
      gameName: getMinigame(s.gameId).name,
      needsOpponent: role === 'a' && !s.b,
      stakes: STAKES,
      maxStake: s.b ? Math.min(g.players[s.a]!.coins, g.players[s.b]!.coins) : g.players[s.a]!.coins,
      myBet: s.bets[seatId] ?? null,
      maxBet: Math.min(MAX_BET, g.players[me]?.coins ?? 0),
      teamBoard: !!g.teamBoard,
    };
  },
});

// ------------------------------------------------------------------ result

export interface DuelResultPhase extends PhaseBase {
  kind: 'duelResult';
  a: string;
  b: string;
  winner: string | null;
  moved: number;
  betNet: Record<string, number>;
}

export const duelResultPhase = definePhase<DuelResultPhase>({
  kind: 'duelResult',
  enter(room, s) {
    const g = game(room);
    const d = g.duel!;
    s.a = d.a;
    s.b = d.b;
    s.winner = d.winner ?? null;
    s.moved = 0;
    if (s.winner) {
      const loser = s.winner === d.a ? d.b : d.a;
      // The winner takes both stakes.
      s.moved = -addCoins(g, loser, -d.stake);
      addCoins(g, s.winner, s.moved);
    }
    s.betNet = settleBets(d.bets, s.winner === null ? null : s.winner === d.a ? 'a' : 'b');
    for (const [id, net] of Object.entries(s.betNet)) {
      // Return the stake plus winnings (net 0 on a tie means the stake comes back).
      const stake = d.bets[id]!.coins;
      if (net >= 0) addCoins(g, id, stake + net);
      if (net > 0) g.players[id]!.stats.betWinnings += net;
    }
    g.duel = null;
    s.endsAt = room.now() + RESULT_MS;
    room.setPhaseTimer('done', s.endsAt);
  },
  timer(room, _s, key) {
    if (key === 'done') nextDuelOr(room);
  },
  hostAction(room, _s, action) {
    if (action.action !== 'skip') return false;
    nextDuelOr(room);
    return true;
  },
  hostView: (_room, s) => ({ a: s.a, b: s.b, winner: s.winner, moved: s.moved, betNet: s.betNet }),
  playerView: (room, s, seatId) => {
    const me = entityOf(game(room), seatId);
    return { a: s.a, b: s.b, winner: s.winner, moved: s.moved, won: s.winner === me, dueled: me === s.a || me === s.b, betNet: s.betNet[seatId] ?? null };
  },
});

// ------------------------------------------------------------------ scheduling

let continueRound: (room: RoomEngine) => void = () => undefined;

/** Starts the next queued duel if the round's spotlight cap allows; returns false when none ran. */
function startNextDuel(room: RoomEngine): boolean {
  const g = game(room);
  // Duels share the spotlight cap of 3 with stars and events, but at least one runs per round.
  const allowed = Math.max(1, 3 - g.spotlightsThisRound);
  while (g.pendingDuels.length && (g.duelsThisRound ?? 0) < allowed) {
    const d = g.pendingDuels.shift()!;
    if (!g.players[d.a] || (d.b && (!g.players[d.b] || d.b === d.a))) continue;
    g.duelsThisRound = (g.duelsThisRound ?? 0) + 1;
    room.goto({ kind: 'duelSetup', a: d.a, b: d.b, reason: d.reason });
    return true;
  }
  return false;
}

function nextDuelOr(room: RoomEngine): void {
  if (!startNextDuel(room)) continueRound(room);
}

/** Called by the flow controller when a duel mini game finishes. */
onDuelWinner((room, winner) => {
  const g = game(room);
  // The mini game reports the winning seat; the duel is won by that seat's side.
  if (g.duel) g.duel.winner = winner === null ? null : winner === g.duel.seats[0] ? g.duel.a : winner === g.duel.seats[1] ? g.duel.b : null;
});

onHostAction((room, action) => {
  if (action.action !== 'dev' || !room.state.settings.devTools || !room.state.game) return false;
  const g = game(room);
  const humans = [...new Set(room.seats.filter((x) => !x.isBot).map((x) => entityOf(g, x.id)))];
  if (action.op === 'giveItems') for (const id of humans) g.players[id]!.items = ['duelTicket', 'swap', 'trap'];
  if (action.op === 'queueDuel' && humans[0]) g.pendingDuels.push({ a: humans[0], b: null, reason: 'space' });
  if (action.op === 'shop') g.shoppers = [...new Set([...g.shoppers, ...humans])];
  // Jump to the end screen, for checking the podium without playing a whole game.
  if (action.op === 'podium') room.goto({ kind: 'podium' });
  return true;
});

continueRound = flowHooks.afterPayout();
flowHooks.setAfterPayout((room) => {
  (game(room)).duelsThisRound = 0;
  nextDuelOr(room);
});
