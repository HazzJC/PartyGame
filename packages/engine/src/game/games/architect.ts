import { cleanAnswer } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';
import { teamOf, teamPlaces } from './teams.ts';

/**
 * Blind Architect (team): one teammate (the architect) sees a target build: a 5×5 grid of heights.
 * Everyone else builds on a shared grid without seeing it. Instead of needing a separate voice
 * channel, the architect sends short messages to their own team's phones, so every team plays at
 * the same time and nobody waits. Closest build wins.
 */
export interface ArchitectData {
  size: number;
  maxHeight: number;
  target: number[];
  architects: string[];
  builds: number[][];
  chats: { text: string; at: number }[][];
  closesAt: number;
}

const BUILD_MS = 75_000;
export const ARCH_SIZE = 5;
const MAX_H = 3;
const MAX_CHATS = 14;

/** Similarity: 1 point per cell with the right height, half a point when one off. */
export function buildScore(target: number[], build: number[]): number {
  return target.reduce((s, h, i) => s + (build[i] === h ? 1 : Math.abs((build[i] ?? 0) - h) === 1 ? 0.5 : 0), 0);
}

function makeTarget(ctx: MgContext): number[] {
  const cells = Array<number>(ARCH_SIZE * ARCH_SIZE).fill(0);
  // A few towers and walls, so there's something to describe.
  for (let i = 0; i < 7; i++) cells[ctx.rng.int(0, cells.length - 1)] = ctx.rng.int(1, MAX_H);
  return cells;
}

export const blindArchitect = defineMinigame<ArchitectData>({
  id: 'blind-architect',
  name: 'Blind Architect',
  formats: ['team'],
  minPlayers: 4,
  inputs: [{ kind: 'grid', what: 'Build (tap to raise)' }, { kind: 'text', what: 'Architect: describe' }],
  blurb: 'Your architect sees the target and can only send short messages. Everyone else taps squares to build the heights. Closest build wins.',
  setup(ctx) {
    const teams = ctx.phase.teams ?? [];
    const closesAt = ctx.now() + BUILD_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt);
    return {
      size: ARCH_SIZE,
      maxHeight: MAX_H,
      target: makeTarget(ctx),
      architects: teams.map((t) => ctx.rng.pick(t)),
      builds: teams.map(() => Array<number>(ARCH_SIZE * ARCH_SIZE).fill(0)),
      chats: teams.map(() => []),
      closesAt,
    };
  },
  intent(ctx, d, seatId, intent) {
    const t = teamOf(ctx, seatId);
    if (t < 0) return;
    const architect = d.architects[t] === seatId;
    if (intent.type === 'chat' && architect) {
      const text = cleanAnswer(intent.text);
      if (text && d.chats[t]!.length < MAX_CHATS) d.chats[t]!.push({ text, at: ctx.now() });
    } else if (intent.type === 'build' && !architect) {
      const c = Number(intent.cell);
      const h = Number(intent.height);
      if (Number.isInteger(c) && c >= 0 && c < d.size * d.size && Number.isInteger(h) && h >= 0 && h <= d.maxHeight) d.builds[t]![c] = h;
    }
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    const scores = d.builds.map((b) => buildScore(d.target, b));
    ctx.finish({ kind: 'team', teamPlaces: teamPlaces(scores, 'high') }, 7000);
  },
  awaiting: () => true,
  botDelay: [2500, 7000],
  bot(ctx, d, seatId) {
    const t = teamOf(ctx, seatId);
    if (d.architects[t] === seatId) {
      // A bot architect describes one tall square at a time.
      const tall = d.target.map((h, i) => [i, h] as const).filter(([, h]) => h > 0);
      if (!tall.length || d.chats[t]!.length >= tall.length) return null;
      const [i, h] = tall[d.chats[t]!.length]!;
      return { type: 'chat', text: `Row ${Math.floor(i / d.size) + 1} col ${(i % d.size) + 1}: ${h} high` };
    }
    // Bot builders follow the messages so far (they can read the chat), with some mistakes.
    const told = d.chats[t]!.map((m) => /Row (\d) col (\d): (\d)/.exec(m.text)).filter((x): x is RegExpExecArray => !!x);
    if (told.length && ctx.rng.chance(0.8)) {
      const m = ctx.rng.pick(told);
      return { type: 'build', cell: (Number(m[1]) - 1) * d.size + Number(m[2]) - 1, height: Number(m[3]) };
    }
    return { type: 'build', cell: ctx.rng.int(0, d.size * d.size - 1), height: ctx.rng.int(0, d.maxHeight) };
  },
  hostView: (ctx, d) => ({
    size: d.size,
    maxHeight: d.maxHeight,
    closesAt: d.closesAt,
    architects: d.architects,
    // Builds and chat stay private until the reveal.
    target: ctx.phase.stage === 'reveal' ? d.target : null,
    builds: ctx.phase.stage === 'reveal' ? d.builds : null,
    scores: ctx.phase.stage === 'reveal' ? d.builds.map((b) => buildScore(d.target, b)) : null,
    chatCounts: d.chats.map((c) => c.length),
  }),
  playerView: (ctx, d, seatId) => {
    const t = teamOf(ctx, seatId);
    const architect = d.architects[t] === seatId;
    return {
      size: d.size,
      maxHeight: d.maxHeight,
      closesAt: d.closesAt,
      team: t,
      architect,
      target: architect ? d.target : null,
      build: d.builds[t] ?? [],
      chat: d.chats[t] ?? [],
      chatsLeft: MAX_CHATS - (d.chats[t]?.length ?? 0),
    };
  },
});
