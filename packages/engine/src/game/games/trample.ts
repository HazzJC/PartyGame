import { placesFromScores, trampleCollapse } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Silent Trample (absorbs Route Roulette): secretly pick a zone. Zones pay different amounts,
 * but a zone that too many players pick collapses and pays nothing. Three rounds.
 */
export interface TrampleData {
  zones: number[];
  limit: number;
  round: number;
  rounds: number;
  stage: 'pick' | 'show';
  closesAt: number;
  picks: Record<string, number>;
  /** Last round's picks, shown during 'show'. */
  shown: Record<string, number> | null;
  collapsed: number[];
  scores: Record<string, number>;
  /** When this round's reveal started on the host (phones wait this long plus stream delay). */
  shownAt: number;
}

export const TRAMPLE_ROUNDS = 3;
const PICK_MS = 10_000;
const SHOW_MS = 4500;

export function trampleZones(n: number): number[] {
  const count = Math.max(4, Math.ceil(n / 2) + 1);
  return Array.from({ length: count }, (_, i) => 2 + i * 2);
}

/** Scores one round: each player gets their zone's reward unless the zone collapsed. */
export function scoreTrampleRound(zones: number[], limit: number, picks: Record<string, number>): { gains: Record<string, number>; collapsed: number[] } {
  const counts = new Map<number, number>();
  for (const z of Object.values(picks)) counts.set(z, (counts.get(z) ?? 0) + 1);
  const collapsed = [...counts.entries()].filter(([, c]) => c >= limit).map(([z]) => z);
  const gains: Record<string, number> = {};
  for (const [id, z] of Object.entries(picks)) gains[id] = collapsed.includes(z) ? 0 : zones[z] ?? 0;
  return { gains, collapsed };
}

function startRound(ctx: MgContext, d: TrampleData): void {
  d.round++;
  d.stage = 'pick';
  d.picks = {};
  d.closesAt = ctx.now() + PICK_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

export const silentTrample = defineMinigame<TrampleData>({
  id: 'silent-trample',
  name: 'Silent Trample',
  formats: ['ffa'],
  inputs: [{ kind: 'pick', what: 'Pick a zone' }],
  blurb: 'Pick a zone in secret. Bigger zones pay more, but if too many of you pick the same zone it collapses and pays nothing. Three rounds.',
  minPlayers: 3,
  setup(ctx) {
    const d: TrampleData = { zones: trampleZones(ctx.n), limit: trampleCollapse(ctx.n), round: 0, rounds: TRAMPLE_ROUNDS, stage: 'pick', closesAt: 0, picks: {}, shown: null, collapsed: [], scores: {}, shownAt: 0 };
    startRound(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'pick' || d.stage !== 'pick') return;
    const z = Number(intent.zone);
    if (!Number.isInteger(z) || z < 0 || z >= d.zones.length) return;
    d.picks[seatId] = z;
    if (ctx.phase.participants.every((id) => id in d.picks)) ctx.hurry('deadline', 800);
  },
  timer(ctx, d, key) {
    if (key === 'deadline' && d.stage === 'pick') {
      const { gains, collapsed } = scoreTrampleRound(d.zones, d.limit, d.picks);
      for (const id of ctx.phase.participants) d.scores[id] = (d.scores[id] ?? 0) + (gains[id] ?? 0);
      d.shown = d.picks;
      d.collapsed = collapsed;
      d.stage = 'show';
      d.shownAt = ctx.now();
      if (d.round >= d.rounds) {
        ctx.finish({ kind: 'ffa', places: placesFromScores(Object.fromEntries(ctx.phase.participants.map((id) => [id, d.scores[id] ?? 0])), 'high') }, SHOW_MS + 1500);
        return;
      }
      ctx.phase.endsAt = ctx.now() + SHOW_MS;
      ctx.setTimer('next', ctx.now() + SHOW_MS);
    } else if (key === 'next') startRound(ctx, d);
    else if (key === 'deadline' && d.stage === 'show') startRound(ctx, d);
  },
  awaiting: (_ctx, d, seatId) => d.stage === 'pick' && !(seatId in d.picks),
  botDelay: [1200, 7000],
  bot(ctx, d) {
    // Bots are drawn to big zones but spread out a little.
    const weights = d.zones.map((v, i) => v + ctx.rng.int(0, 6) + i);
    const best = weights.indexOf(Math.max(...weights));
    return { type: 'pick', zone: ctx.rng.chance(0.4) ? ctx.rng.int(0, d.zones.length - 1) : best };
  },
  hostView: (_ctx, d) => ({ zones: d.zones, limit: d.limit, round: d.round, rounds: d.rounds, stage: d.stage, closesAt: d.closesAt, submitted: Object.keys(d.picks), shown: d.stage === 'show' ? d.shown : null, collapsed: d.stage === 'show' ? d.collapsed : [], scores: d.scores, shownAt: d.shownAt }),
  playerView: (_ctx, d, seatId) => ({ zones: d.zones, limit: d.limit, round: d.round, rounds: d.rounds, stage: d.stage, closesAt: d.closesAt, myPick: d.picks[seatId] ?? null, lastPick: d.shown?.[seatId] ?? null, collapsed: d.stage === 'show' ? d.collapsed : [], myScore: d.scores[seatId] ?? 0, shownAt: d.shownAt }),
});
