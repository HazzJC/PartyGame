import type { CoopGrade } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Recipe Assembly Line (co-op): orders need ingredients in a set sequence, and each ingredient is
 * held by particular players (visible only on their phones). To add the next item you first press
 * "claim the next slot", which locks it to you briefly; claims are decided by synced timestamps so
 * two people pressing at once doesn't depend on who has the faster connection.
 */
export const INGREDIENTS = ['Bun', 'Patty', 'Cheese', 'Lettuce', 'Tomato', 'Onion', 'Pickle', 'Sauce'] as const;

export interface RecipeData {
  hands: Record<string, string[]>;
  order: string[];
  filled: number;
  completed: number;
  strikes: number;
  claim: { by: string; at: number; until: number } | null;
  closesAt: number;
  log: { by: string; item: string; ok: boolean }[];
}

const TIME_MS = 70_000;
const CLAIM_MS = 2500;
export const orderLength = (n: number): number => Math.min(9, 3 + Math.ceil(n / 3));

export function recipeGrade(completed: number, strikes: number): CoopGrade {
  const base = completed >= 3 ? 3 : completed;
  const level = strikes >= 4 ? base - 1 : base;
  return level >= 3 ? 'gold' : level === 2 ? 'silver' : level === 1 ? 'bronze' : 'fail';
}

function newOrder(ctx: MgContext, d: RecipeData): void {
  const held = [...new Set(Object.values(d.hands).flat())];
  const len = orderLength(ctx.n);
  d.order = ['Bun', ...Array.from({ length: len - 2 }, () => ctx.rng.pick(held.filter((i) => i !== 'Bun'))), 'Bun'];
  d.filled = 0;
}

export const recipeAssembly = defineMinigame<RecipeData>({
  id: 'recipe-assembly',
  name: 'Recipe Assembly Line',
  formats: ['coop'],
  inputs: [{ kind: 'buttons', buttons: [{ id: 'claim', label: 'Claim the next slot', key: 'Space' }] }, { kind: 'pick', what: 'Add your ingredient' }],
  blurb: 'Build the burgers in order. Only some of you hold each ingredient. Claim the next slot first, then add the right thing. Wrong items cost a strike!',
  setup(ctx) {
    const ids = ctx.rng.shuffle(ctx.phase.participants);
    const hands: Record<string, string[]> = Object.fromEntries(ids.map((id) => [id, [] as string[]]));
    // Every ingredient goes to one or two players; everyone gets at least one.
    const pool = ctx.n <= 4 ? INGREDIENTS.slice(0, 6) : INGREDIENTS;
    pool.forEach((item, i) => {
      hands[ids[i % ids.length]!]!.push(item);
      if (ctx.n > pool.length || ctx.rng.chance(0.4)) hands[ids[(i + 3) % ids.length]!]!.push(item);
    });
    for (const id of ids) hands[id] = [...new Set(hands[id])];
    const closesAt = ctx.now() + TIME_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt);
    const d: RecipeData = { hands, order: [], filled: 0, completed: 0, strikes: 0, claim: null, closesAt, log: [] };
    newOrder(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent, sentAt) {
    const now = ctx.now();
    const t = sentAt !== null ? Math.min(sentAt, now) : now;
    if (intent.type === 'claim') {
      // An earlier synced press can take over a claim that arrived first but was pressed later.
      if (d.claim && d.claim.until > now && !(t < d.claim.at && now - d.claim.at < 400)) return;
      d.claim = { by: seatId, at: t, until: now + CLAIM_MS };
    } else if (intent.type === 'add') {
      if (!d.claim || d.claim.by !== seatId || d.claim.until < now) return;
      const item = String(intent.item);
      if (!d.hands[seatId]?.includes(item)) return;
      const ok = d.order[d.filled] === item;
      d.log = [...d.log, { by: seatId, item, ok }].slice(-8);
      d.claim = null;
      if (!ok) {
        d.strikes++;
        return;
      }
      d.filled++;
      if (d.filled >= d.order.length) {
        d.completed++;
        newOrder(ctx, d);
      }
    }
  },
  timer(ctx, d, key) {
    if (key === 'deadline') ctx.finish({ kind: 'coop', grade: recipeGrade(d.completed, d.strikes) }, 4000);
  },
  awaiting: (_ctx, d, seatId) => d.hands[seatId]!.includes(d.order[d.filled]!) || d.claim?.by === seatId,
  botDelay: [900, 2600],
  bot(ctx, d, seatId) {
    const need = d.order[d.filled]!;
    if (d.claim?.by === seatId && d.claim.until > ctx.now()) return { type: 'add', item: ctx.rng.chance(0.93) ? need : ctx.rng.pick(d.hands[seatId]!) };
    if (d.hands[seatId]!.includes(need) && (!d.claim || d.claim.until < ctx.now())) return { type: 'claim' };
    return null;
  },
  hostView: (_ctx, d) => ({ order: d.order, filled: d.filled, completed: d.completed, strikes: d.strikes, claim: d.claim, closesAt: d.closesAt, log: d.log }),
  playerView: (ctx, d, seatId) => ({ hand: d.hands[seatId] ?? [], order: d.order, filled: d.filled, completed: d.completed, strikes: d.strikes, claimBy: d.claim && d.claim.until > ctx.now() ? d.claim.by : null, claimUntil: d.claim?.until ?? 0, closesAt: d.closesAt }),
});
