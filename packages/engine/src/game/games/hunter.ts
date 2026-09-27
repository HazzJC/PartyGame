import { defineMinigame } from '../minigame.ts';

/**
 * Hunter vs Hiders (1-vs-many): hiders secretly pick a zone; each hunter secretly searches 3
 * zones. Hunters win if they catch enough hiders. Zone count and the catch target scale so it
 * stays roughly even, which is the small side's handicap.
 */
export interface HunterData {
  zones: number;
  hunters: string[];
  hiders: string[];
  /** Hiders catch threshold for a hunter win. */
  needed: number;
  closesAt: number;
  hides: Record<string, number>;
  searches: Record<string, number[]>;
}

export const SEARCHES = 3;
export const HIDE_MS = 15_000;

export function hunterZones(hunters: number, hiders: number): number {
  return Math.max(6, hiders + 3 * hunters);
}

export function caught(d: Pick<HunterData, 'hides' | 'searches'>): string[] {
  const searched = new Set(Object.values(d.searches).flat());
  return Object.entries(d.hides)
    .filter(([, z]) => searched.has(z))
    .map(([id]) => id);
}

export const hunterVsHiders = defineMinigame<HunterData>({
  id: 'hunter-vs-hiders',
  name: 'Hunter vs Hiders',
  formats: ['1vN'],
  inputs: [{ kind: 'pick', what: 'Hide, or search 3 zones' }],
  blurb: 'Hiders pick a secret zone. The hunter searches three. Catch enough hiders and the hunter wins big; otherwise the hiders do.',
  minPlayers: 3,
  setup(ctx) {
    const [hunters = [], hiders = []] = ctx.phase.teams ?? [[ctx.phase.participants[0]!], ctx.phase.participants.slice(1)];
    const zones = hunterZones(hunters.length, hiders.length);
    const closesAt = ctx.now() + HIDE_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt + 400);
    return { zones, hunters, hiders, needed: Math.max(1, Math.ceil(hiders.length / 3)), closesAt, hides: {}, searches: {} };
  },
  intent(ctx, d, seatId, intent) {
    if (ctx.now() > d.closesAt + 400) return;
    if (intent.type === 'hide' && d.hiders.includes(seatId)) {
      const z = Number(intent.zone);
      if (Number.isInteger(z) && z >= 0 && z < d.zones) d.hides[seatId] = z;
    } else if (intent.type === 'search' && d.hunters.includes(seatId) && Array.isArray(intent.zones)) {
      const zones = [...new Set(intent.zones.map(Number).filter((z) => Number.isInteger(z) && z >= 0 && z < d.zones))].slice(0, SEARCHES);
      if (zones.length === SEARCHES) d.searches[seatId] = zones;
    }
    const allIn = d.hiders.every((id) => id in d.hides) && d.hunters.every((id) => id in d.searches);
    if (allIn) ctx.hurry('deadline', 1000);
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    // Hiders who never picked are hiding in plain sight: always caught.
    for (const id of d.hiders) if (!(id in d.hides)) d.hides[id] = -1;
    const got = caught(d).length + d.hiders.filter((id) => d.hides[id] === -1).length;
    ctx.finish({ kind: '1vN', smallWins: got >= d.needed }, 3000 + d.zones * 250);
  },
  awaiting: (_ctx, d, seatId) => (d.hiders.includes(seatId) ? !(seatId in d.hides) : !(seatId in d.searches)),
  botDelay: [2000, 9000],
  bot(ctx, d, seatId) {
    if (d.hiders.includes(seatId)) return { type: 'hide', zone: ctx.rng.int(0, d.zones - 1) };
    return { type: 'search', zones: ctx.rng.shuffle(Array.from({ length: d.zones }, (_, i) => i)).slice(0, SEARCHES) };
  },
  hostView: (ctx, d) => ({
    zones: d.zones,
    hunters: d.hunters,
    hiders: d.hiders,
    needed: d.needed,
    closesAt: d.closesAt,
    submitted: [...Object.keys(d.hides), ...Object.keys(d.searches)],
    hides: ctx.phase.stage === 'reveal' ? d.hides : null,
    searches: ctx.phase.stage === 'reveal' ? d.searches : null,
  }),
  playerView: (_ctx, d, seatId) => ({
    zones: d.zones,
    role: d.hunters.includes(seatId) ? 'hunter' : 'hider',
    needed: d.needed,
    hiders: d.hiders.length,
    closesAt: d.closesAt,
    myHide: d.hides[seatId] ?? null,
    mySearch: d.searches[seatId] ?? null,
  }),
});
