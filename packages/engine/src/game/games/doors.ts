import { placesFromScores } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Pick a Door (FFA elimination): survivors pick a door; trap doors eliminate. Eliminated players
 * get a job: they secretly choose the trap doors for the next round, which turns luck into a
 * mind game. The 1-vs-many variant gives the trap setting to the small side from the start.
 */
export interface DoorsData {
  variant: 'ffa' | 'setter';
  round: number;
  maxRounds: number;
  doors: number;
  traps: number;
  stage: 'pick' | 'show';
  closesAt: number;
  survivors: string[];
  /** Who sets traps this round: the eliminated (FFA) or the small side (setter variant). */
  setters: string[];
  picks: Record<string, number>;
  trapPicks: Record<string, number[]>;
  /** Final trap doors this round, set when it resolves. */
  trapDoors: number[];
  out: Record<string, number>;
  /** Survivors eliminated in the round being shown. */
  justOut: string[];
  shownAt: number;
  /** Setter variant: the large side's starting size (the win target is half of it). */
  largeStart: number;
}

const PICK_MS = 12_000;
const SHOW_MS = 5000;

export function doorCount(survivors: number): number {
  return Math.max(3, Math.min(9, survivors + 1));
}

export function trapCount(doors: number): number {
  return Math.max(1, Math.floor(doors / 3));
}

/** Traps: whatever the setters chose (keeping one safe door), topped up at random if too few. */
export function chooseTraps(ctx: MgContext, doors: number, wanted: number, chosen: number[]): number[] {
  const set = [...new Set(chosen.filter((x) => x >= 0 && x < doors))].slice(0, doors - 1);
  const free = ctx.rng.shuffle(Array.from({ length: doors }, (_, i) => i).filter((x) => !set.includes(x)));
  while (set.length < wanted && free.length > 1) set.push(free.pop()!);
  return set;
}

function startRound(ctx: MgContext, d: DoorsData): void {
  d.round++;
  d.stage = 'pick';
  d.picks = {};
  d.trapPicks = {};
  d.justOut = [];
  d.doors = doorCount(d.survivors.length);
  d.traps = trapCount(d.doors);
  d.closesAt = ctx.now() + PICK_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

function finishGame(ctx: MgContext, d: DoorsData): void {
  if (d.variant === 'setter') {
    const lost = d.largeStart - d.survivors.length;
    ctx.finish({ kind: '1vN', smallWins: lost * 2 >= d.largeStart }, SHOW_MS + 1500);
    return;
  }
  // Survivors share first; everyone else by how long they lasted.
  const scores = Object.fromEntries(ctx.phase.participants.map((id) => [id, d.survivors.includes(id) ? 100 : d.out[id] ?? 0]));
  ctx.finish({ kind: 'ffa', places: placesFromScores(scores, 'high') }, SHOW_MS + 1500);
}

function resolveRound(ctx: MgContext, d: DoorsData): void {
  d.trapDoors = chooseTraps(ctx, d.doors, d.traps, Object.values(d.trapPicks).flat());
  // Survivors who never picked a door stumble into a random one.
  for (const id of d.survivors) if (!(id in d.picks)) d.picks[id] = ctx.rng.int(0, d.doors - 1);
  d.justOut = d.survivors.filter((id) => d.trapDoors.includes(d.picks[id]!));
  // If everyone would fall, nobody does this round (the game needs a survivor to go on).
  if (d.justOut.length === d.survivors.length && d.variant === 'ffa' && d.round < d.maxRounds) d.justOut = [];
  for (const id of d.justOut) d.out[id] = d.round;
  d.survivors = d.survivors.filter((id) => !d.justOut.includes(id));
  if (d.variant === 'ffa') d.setters = ctx.phase.participants.filter((id) => !d.survivors.includes(id));
  d.stage = 'show';
  d.shownAt = ctx.now();
  const over = d.round >= d.maxRounds || d.survivors.length <= (d.variant === 'ffa' ? 1 : 0);
  if (over) return finishGame(ctx, d);
  ctx.phase.endsAt = ctx.now() + SHOW_MS;
  ctx.setTimer('next', ctx.now() + SHOW_MS);
}

function makeDoors(id: string, name: string, variant: 'ffa' | 'setter') {
  return defineMinigame<DoorsData>({
    id,
    name,
    formats: variant === 'ffa' ? ['ffa'] : ['1vN'],
    minPlayers: 3,
    inputs: [{ kind: 'pick', what: variant === 'ffa' ? 'Pick a door (or set traps once you are out)' : 'Pick a door, or set the traps' }],
    blurb:
      variant === 'ffa'
        ? 'Pick a door. Trap doors knock you out, and anyone knocked out secretly chooses the trap doors for the next round. Last ones standing win.'
        : 'The trap-setters secretly rig the doors. Everyone else picks a door each round. Knock out half of them in three rounds and the setters win.',
    setup(ctx) {
      const [small = [], large = []] = ctx.phase.teams ?? [];
      const d: DoorsData = {
        variant,
        round: 0,
        maxRounds: variant === 'ffa' ? 5 : 3,
        doors: 0,
        traps: 0,
        stage: 'pick',
        closesAt: 0,
        survivors: variant === 'ffa' ? [...ctx.phase.participants] : [...large],
        setters: variant === 'ffa' ? [] : [...small],
        picks: {},
        trapPicks: {},
        trapDoors: [],
        out: {},
        justOut: [],
        shownAt: 0,
        largeStart: large.length,
      };
      startRound(ctx, d);
      return d;
    },
    intent(ctx, d, seatId, intent) {
      if (d.stage !== 'pick') return;
      if (intent.type === 'door' && d.survivors.includes(seatId)) {
        const door = Number(intent.door);
        if (Number.isInteger(door) && door >= 0 && door < d.doors) d.picks[seatId] = door;
      } else if (intent.type === 'traps' && d.setters.includes(seatId) && Array.isArray(intent.doors)) {
        // Each setter rigs one door (setters on a 1-vs-many small side rig up to two).
        const max = d.variant === 'setter' ? Math.max(1, Math.ceil(d.traps / Math.max(1, d.setters.length))) : 1;
        d.trapPicks[seatId] = [...new Set(intent.doors.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < d.doors))].slice(0, max);
      } else return;
      const done = d.survivors.every((id) => id in d.picks) && d.setters.every((id) => id in d.trapPicks);
      if (done) ctx.hurry('deadline', 800);
    },
    timer(ctx, d, key) {
      if (key === 'deadline' && d.stage === 'pick') resolveRound(ctx, d);
      else if (key === 'next' || (key === 'deadline' && d.stage === 'show')) startRound(ctx, d);
    },
    awaiting: (_ctx, d, seatId) => d.stage === 'pick' && ((d.survivors.includes(seatId) && !(seatId in d.picks)) || (d.setters.includes(seatId) && !(seatId in d.trapPicks))),
    botDelay: [1500, 8000],
    bot(ctx, d, seatId) {
      if (d.survivors.includes(seatId)) return { type: 'door', door: ctx.rng.int(0, d.doors - 1) };
      const max = d.variant === 'setter' ? Math.max(1, Math.ceil(d.traps / Math.max(1, d.setters.length))) : 1;
      return { type: 'traps', doors: ctx.rng.shuffle(Array.from({ length: d.doors }, (_, i) => i)).slice(0, max) };
    },
    hostView: (_ctx, d) => ({
      variant: d.variant,
      round: d.round,
      maxRounds: d.maxRounds,
      doors: d.doors,
      traps: d.traps,
      stage: d.stage,
      closesAt: d.closesAt,
      survivors: d.survivors,
      setters: d.setters,
      submitted: [...Object.keys(d.picks), ...Object.keys(d.trapPicks)],
      // Picks and traps only appear once the round resolves.
      picks: d.stage === 'show' ? d.picks : null,
      trapDoors: d.stage === 'show' ? d.trapDoors : null,
      justOut: d.stage === 'show' ? d.justOut : [],
      out: d.out,
      shownAt: d.shownAt,
      largeStart: d.largeStart,
    }),
    playerView: (_ctx, d, seatId) => ({
      variant: d.variant,
      round: d.round,
      maxRounds: d.maxRounds,
      doors: d.doors,
      traps: d.traps,
      stage: d.stage,
      closesAt: d.closesAt,
      role: d.survivors.includes(seatId) ? 'picker' : d.setters.includes(seatId) ? 'setter' : 'out',
      myDoor: d.picks[seatId] ?? null,
      myTraps: d.trapPicks[seatId] ?? null,
      maxTraps: d.variant === 'setter' ? Math.max(1, Math.ceil(d.traps / Math.max(1, d.setters.length))) : 1,
      justOut: d.stage === 'show' && d.justOut.includes(seatId),
      shownAt: d.shownAt,
      survivors: d.survivors.length,
    }),
  });
}

export const pickADoor = makeDoors('pick-a-door', 'Pick a Door', 'ffa');
export const pickADoorSetter = makeDoors('pick-a-door-setter', 'Pick a Door: Trap-setter', 'setter');
