import type { CoopGrade } from '@partygame/shared';
import { defineMinigame } from '../minigame.ts';

/**
 * The Mind (co-op): everyone holds hidden numbers. Without talking, play them all in ascending
 * order. Plays are ordered by synced timestamps (not arrival), with a short settling window. Play a
 * card while someone still holds a lower one and the team loses a life; those lower cards are
 * discarded. 3 lives.
 */
export interface MindData {
  hands: Record<string, number[]>;
  pile: { card: number; by: string }[];
  pending: { card: number; by: string; at: number }[];
  discarded: { card: number; by: string }[];
  lives: number;
  max: number;
  closesAt: number;
  lastMistake: number | null;
}

const TIME_MS = 90_000;
const SETTLE_MS = 450;

/** One card each at 16 players; more in small rooms. */
export const mindCards = (n: number): number => Math.max(1, Math.min(3, Math.floor(16 / n)));

export function mindGrade(lives: number, done: boolean): CoopGrade {
  if (!done || lives <= 0) return 'fail';
  return lives >= 3 ? 'gold' : lives === 2 ? 'silver' : 'bronze';
}

/** Commits plays in timestamp order; returns true if a life was lost. */
export function commitPlays(d: MindData): boolean {
  let mistake = false;
  for (const p of [...d.pending].sort((a, b) => a.at - b.at)) {
    const hand = d.hands[p.by]!;
    const i = hand.indexOf(p.card);
    if (i < 0) continue;
    hand.splice(i, 1);
    d.pile.push({ card: p.card, by: p.by });
    // Anyone still holding something lower: a life is lost and those cards are thrown away.
    const lower = Object.entries(d.hands).flatMap(([id, h]) => h.filter((c) => c < p.card).map((c) => ({ card: c, by: id })));
    if (lower.length) {
      mistake = true;
      d.lives--;
      for (const l of lower) {
        const h = d.hands[l.by]!;
        h.splice(h.indexOf(l.card), 1);
        d.discarded.push(l);
      }
    }
  }
  d.pending = [];
  return mistake;
}

export const theMind = defineMinigame<MindData>({
  id: 'the-mind',
  name: 'The Mind',
  formats: ['coop'],
  inputs: [{ kind: 'buttons', buttons: [{ id: 'play', label: 'Play my lowest card', key: 'Space' }] }],
  blurb: 'Everyone has secret numbers. Without talking, play them all in order from lowest to highest. Wait too long and time runs out; go too soon and you lose a life.',
  setup(ctx) {
    const per = mindCards(ctx.n);
    const max = Math.max(30, ctx.n * per * 6);
    const deck = ctx.rng.shuffle(Array.from({ length: max }, (_, i) => i + 1));
    const hands: Record<string, number[]> = {};
    for (const id of ctx.phase.participants) hands[id] = deck.splice(0, per).sort((a, b) => a - b);
    const closesAt = ctx.now() + TIME_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt);
    return { hands, pile: [], pending: [], discarded: [], lives: 3, max, closesAt, lastMistake: null };
  },
  intent(ctx, d, seatId, intent, sentAt) {
    if (intent.type !== 'play') return;
    const hand = d.hands[seatId];
    if (!hand?.length || d.pending.some((p) => p.by === seatId)) return;
    // You always play your lowest card.
    d.pending.push({ card: hand[0]!, by: seatId, at: sentAt !== null ? Math.min(sentAt, ctx.now()) : ctx.now() });
    ctx.setTimer('commit', ctx.now() + SETTLE_MS);
  },
  timer(ctx, d, key) {
    if (key === 'commit') {
      if (commitPlays(d)) d.lastMistake = ctx.now();
      const done = Object.values(d.hands).every((h) => h.length === 0);
      if (done || d.lives <= 0) ctx.finish({ kind: 'coop', grade: mindGrade(d.lives, done) }, 4500);
    } else if (key === 'deadline') {
      commitPlays(d);
      ctx.finish({ kind: 'coop', grade: mindGrade(d.lives, Object.values(d.hands).every((h) => h.length === 0)) }, 4500);
    }
  },
  awaiting: (_ctx, d, seatId) => (d.hands[seatId]?.length ?? 0) > 0,
  botDelay: [1500, 4000],
  bot(ctx, d, seatId) {
    // Bots wait roughly in proportion to how high their card is.
    const card = d.hands[seatId]![0]!;
    const top = d.pile.length ? d.pile[d.pile.length - 1]!.card : 0;
    const gap = (card - top) / d.max;
    return ctx.rng.chance(Math.max(0.05, 0.9 - gap * 6)) ? { type: 'play' } : null;
  },
  hostView: (_ctx, d) => ({ pile: d.pile, discarded: d.discarded, lives: d.lives, left: Object.values(d.hands).reduce((n, h) => n + h.length, 0), closesAt: d.closesAt, lastMistake: d.lastMistake, pending: d.pending.map((p) => p.by) }),
  playerView: (_ctx, d, seatId) => ({ hand: d.hands[seatId] ?? [], top: d.pile.length ? d.pile[d.pile.length - 1]!.card : 0, lives: d.lives, left: Object.values(d.hands).reduce((n, h) => n + h.length, 0), closesAt: d.closesAt, pending: d.pending.some((p) => p.by === seatId), lastMistake: d.lastMistake, pile: d.pile.slice(-6) }),
});
