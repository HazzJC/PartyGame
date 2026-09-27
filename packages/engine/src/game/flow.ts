import type { Format } from '@partygame/shared';
import { onStartGame, type LobbyPhase } from '../lobby.ts';
import { definePhase, type PhaseBase } from '../phase.ts';
import { onHostAction, setGameViews, type RoomEngine } from '../room.ts';
import { getMinigame, allMinigames, onMinigameFinish, onMinigameFlowTimer, type MinigamePhase } from './minigame.ts';
import { computePayout } from './payout.ts';
import { addCoins, createGameState, game, isFinalStretch, standings, type GameState, type NextMinigame } from './state.ts';

/** Minimum time a rules card stays up, and the longest it waits for "Ready". */
export const RULES_MIN_MS = 4000;
export const RULES_MAX_MS = 25_000;
const ROUND_INTRO_MS = 3000;
const PAYOUT_MS = 7000;
const REVEAL_TAIL_MS = 1200;

// ------------------------------------------------------------------ extension points (board, endgame)

type Step = (room: RoomEngine) => void;

/** After the round banner. The board module replaces this with the board phase. */
let afterRoundIntro: Step = (room) => dealAndShowRules(room, chooseFormatWithoutBoard(room));
/** After the last round's payout. The endgame module replaces this with bonus stars. */
let afterLastRound: Step = (room) => room.goto({ kind: 'podium' });
/** After each payout, before the next round (duels, shop and spotlight hook in here). */
let afterPayout: Step = (room) => nextRound(room);

export const flowHooks = {
  setAfterRoundIntro: (s: Step) => (afterRoundIntro = s),
  setAfterLastRound: (s: Step) => (afterLastRound = s),
  setAfterPayout: (s: Step) => (afterPayout = s),
};

export function nextRound(room: RoomEngine): void {
  const g = game(room);
  if (g.round >= g.rounds) afterLastRound(room);
  else room.goto({ kind: 'roundIntro' });
}

// ------------------------------------------------------------------ dealing

/** Without a board (stage 4): mostly free-for-all, sometimes co-op. */
function chooseFormatWithoutBoard(room: RoomEngine): Format {
  return room.rng.chance(0.25) ? 'coop' : 'ffa';
}

export function eligibleGames(room: RoomEngine, format: Format, n: number): string[] {
  const removed = new Set(room.state.settings.removedGames);
  return allMinigames()
    .filter((m) => m.formats.includes(format) && !removed.has(m.id) && (m.minPlayers ?? 2) <= n)
    .map((m) => m.id);
}

/** Each format has its own shuffled deck; nothing repeats until that deck runs out. */
export function deal(room: RoomEngine, g: GameState, format: Format, n: number): string | null {
  const eligible = eligibleGames(room, format, n);
  if (eligible.length === 0) return null;
  let deck = (g.decks[format] ?? []).filter((id) => eligible.includes(id));
  if (deck.length === 0) {
    const last = g.history[g.history.length - 1]?.gameId;
    deck = room.rng.shuffle(eligible);
    // Don't let a fresh deck start with the game we just played.
    if (deck.length > 1 && deck[deck.length - 1] === last) deck.unshift(deck.pop()!);
  }
  const id = deck.pop()!;
  g.decks[format] = deck;
  return id;
}

export function dealAndShowRules(room: RoomEngine, wanted: Format, teams?: string[][]): void {
  const g = game(room);
  const participants = g.order.filter((id) => room.seat(id));
  let format = wanted;
  const forced = room.state.settings.forceGame ? allMinigames().find((m) => m.id === room.state.settings.forceGame) : undefined;
  if (forced) {
    // Testing a single game: keep its own format (teams are dealt by the board module when it applies).
    format = forced.formats.includes(wanted) ? wanted : forced.formats[0]!;
    g.next = { gameId: forced.id, format, participants, ...(teams && format === wanted ? { teams } : {}) };
    room.goto({ kind: 'rules', ...g.next, ready: [] });
    return;
  }
  let gameId = deal(room, g, format, participants.length);
  if (!gameId) {
    // No game of that format is available yet (or the host removed them all): fall back to FFA.
    format = 'ffa';
    teams = undefined;
    gameId = deal(room, g, 'ffa', participants.length);
  }
  if (!gameId) throw new Error('No mini games available');
  g.next = { gameId, format, participants, ...(teams ? { teams } : {}), fallback: format !== wanted };
  room.goto({ kind: 'rules', ...g.next, ready: [] });
}

// ------------------------------------------------------------------ phases

export interface RoundIntroPhase extends PhaseBase {
  kind: 'roundIntro';
}

export const roundIntroPhase = definePhase<RoundIntroPhase>({
  kind: 'roundIntro',
  enter(room, s) {
    const g = game(room);
    g.round++;
    s.endsAt = room.now() + ROUND_INTRO_MS;
    room.setPhaseTimer('next', s.endsAt);
  },
  timer(room, _s, key) {
    if (key === 'next') afterRoundIntro(room);
  },
  hostAction(room, _s, action) {
    if (action.action !== 'skip') return false;
    afterRoundIntro(room);
    return true;
  },
  hostView: (room) => ({ round: game(room).round, rounds: game(room).rounds, finalStretch: isFinalStretch(game(room)) }),
  playerView: (room) => ({ round: game(room).round, rounds: game(room).rounds, finalStretch: isFinalStretch(game(room)) }),
});

export interface RulesPhase extends PhaseBase, NextMinigame {
  kind: 'rules';
  ready: string[];
  fallback?: boolean;
}

function maybeStart(room: RoomEngine, s: RulesPhase): void {
  const waiting = s.participants.filter((id) => {
    const seat = room.seat(id);
    return seat && !seat.isBot && seat.connected && !s.ready.includes(id);
  });
  if (waiting.length > 0) return;
  room.setPhaseTimer('go', Math.max(room.now() + 600, s.startedAt + RULES_MIN_MS));
}

export const rulesPhase = definePhase<RulesPhase>({
  kind: 'rules',
  botDelay: [600, 2400],
  enter(room, s) {
    s.endsAt = room.now() + RULES_MAX_MS;
    room.setPhaseTimer('go', s.endsAt);
  },
  intent(room, s, seatId, intent) {
    if (intent.type !== 'ready' || s.ready.includes(seatId)) return;
    s.ready.push(seatId);
    maybeStart(room, s);
  },
  timer(room, s, key) {
    if (key !== 'go') return;
    room.goto({ kind: 'minigame', gameId: s.gameId, format: s.format, participants: s.participants, ...(s.teams ? { teams: s.teams } : {}) });
  },
  hostAction(room, s, action) {
    if (action.action !== 'skip') return false;
    room.setPhaseTimer('go', room.now());
    return true;
  },
  awaiting: (_room, s, seatId) => !s.ready.includes(seatId),
  bot: () => ({ type: 'ready' }),
  hostView(_room, s) {
    const def = getMinigame(s.gameId);
    return { gameId: s.gameId, name: def.name, blurb: def.blurb, inputs: def.inputs, format: s.format, teams: s.teams ?? null, ready: s.ready, participants: s.participants, fallback: !!s.fallback };
  },
  playerView(_room, s, seatId) {
    const def = getMinigame(s.gameId);
    return {
      gameId: s.gameId,
      name: def.name,
      blurb: def.blurb,
      inputs: def.inputs,
      format: s.format,
      team: s.teams ? s.teams.findIndex((t) => t.includes(seatId)) : null,
      teams: s.teams ?? null,
      ready: s.ready.includes(seatId),
      playing: s.participants.includes(seatId),
    };
  },
});

export interface PayoutPhase extends PhaseBase {
  kind: 'payout';
}

export const payoutPhase = definePhase<PayoutPhase>({
  kind: 'payout',
  enter(room, s) {
    s.endsAt = room.now() + PAYOUT_MS;
    room.setPhaseTimer('next', s.endsAt);
  },
  timer(room, _s, key) {
    if (key === 'next') afterPayout(room);
  },
  hostAction(room, _s, action) {
    if (action.action !== 'skip') return false;
    afterPayout(room);
    return true;
  },
  hostView: (room) => ({ standings: standings(game(room)), lastPayout: game(room).lastPayout }),
  playerView: (room, _s, seatId) => {
    const g = game(room);
    return { gained: g.lastPayout?.[seatId] ?? 0, rank: standings(g).indexOf(seatId) + 1, of: g.order.length };
  },
});

export interface PodiumPhase extends PhaseBase {
  kind: 'podium';
}

export const podiumPhase = definePhase<PodiumPhase>({
  kind: 'podium',
  hostAction(room, _s, action) {
    if (action.action === 'start') {
      startGame(room);
      return true;
    }
    return false;
  },
  hostView: (room) => ({ standings: standings(game(room)) }),
  playerView: (room, _s, seatId) => ({ rank: standings(game(room)).indexOf(seatId) + 1, of: game(room).order.length }),
});

// ------------------------------------------------------------------ wiring

export function startGame(room: RoomEngine): void {
  room.state.game = createGameState(room);
  room.goto({ kind: 'roundIntro' });
}

onStartGame(startGame);

onMinigameFinish((room, phase, result, revealMs) => {
  const g = game(room);
  // Anyone who is still away when the game ends was covered by the autopilot.
  for (const id of phase.participants) {
    const seat = room.seat(id);
    if (seat && !seat.isBot && !seat.connected && !phase.autopiloted.includes(id)) phase.autopiloted.push(id);
  }
  const payout = computePayout(phase, result);
  for (const [id, coins] of Object.entries(payout)) {
    const gained = addCoins(g, id, coins);
    const p = g.players[id];
    if (p) p.stats.minigameCoins += gained;
  }
  if (result.kind === 'coop') {
    if (result.grade === 'fail') g.threat++;
    else for (const id of phase.participants) g.players[id] && g.players[id]!.stats.coopWins++;
  }
  g.lastPayout = payout;
  g.history.push({ round: g.round, gameId: phase.gameId, format: phase.format });
  phase.stage = 'reveal';
  phase.result = result;
  phase.payout = payout;
  phase.revealEndsAt = room.now() + revealMs;
  phase.endsAt = phase.revealEndsAt;
  room.setPhaseTimer('revealDone', phase.revealEndsAt + REVEAL_TAIL_MS);
});

onMinigameFlowTimer((room, _phase, key) => {
  if (key === 'revealDone') room.goto({ kind: 'payout' });
});

onHostAction((room, action) => {
  if (action.action !== 'backToLobby' || !room.state.game) return false;
  room.state.game = null;
  room.goto({ kind: 'lobby' } satisfies Omit<LobbyPhase, 'startedAt'>);
  return true;
});

/** Coins still being revealed: shown only once the payout phase starts, so the rail can't spoil results. */
function pendingCoins(room: RoomEngine, id: string): number {
  const ph = room.phase;
  if (ph.kind !== 'minigame' || ph.stage !== 'reveal') return 0;
  return (ph as MinigamePhase).payout?.[id] ?? 0;
}

setGameViews({
  host(room) {
    const g = game(room);
    return {
      round: g.round,
      rounds: g.rounds,
      finalStretch: isFinalStretch(g),
      threat: g.threat,
      threatMax: g.threatMax,
      players: g.order.map((id) => ({ id, coins: g.players[id]!.coins - pendingCoins(room, id), stars: g.players[id]!.stars, items: g.players[id]!.items.length })),
    };
  },
  player(room, seatId) {
    const g = game(room);
    const p = g.players[seatId];
    return {
      round: g.round,
      rounds: g.rounds,
      finalStretch: isFinalStretch(g),
      threat: g.threat,
      threatMax: g.threatMax,
      coins: (p?.coins ?? 0) - pendingCoins(room, seatId),
      stars: p?.stars ?? 0,
      items: p?.items ?? [],
    };
  },
});
