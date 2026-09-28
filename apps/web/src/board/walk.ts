import type { BoardDef } from '@partygame/engine';

/** A pawn's route this turn: where it started, the spaces it walks, and when it set off. */
export interface WalkPath {
  start: number;
  path: number[];
  finalAt: number | null;
}

export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Where a pawn is drawn right now: at its start, hopping along its final path, or at the end.
 * Also which way it faces: the way it is walking, or the way its last step went once it arrives.
 */
export function pawnXY(def: BoardDef, w: WalkPath, now: number, stepMs: number): { x: number; y: number; facing: 1 | -1; walking: boolean } {
  const seq = [w.start, ...w.path];
  const node = (i: number) => def.nodes[seq[Math.max(0, Math.min(seq.length - 1, i))]!]!;
  const face = (i: number): 1 | -1 => (node(i + 1).x < node(i).x - 1 ? -1 : 1);
  if (!w.finalAt || w.path.length === 0) return { ...node(0), facing: 1, walking: false };
  const t = (now - w.finalAt) / stepMs;
  if (t <= 0) return { ...node(0), facing: face(0), walking: false };
  if (t >= w.path.length) return { ...node(seq.length - 1), facing: face(seq.length - 2), walking: false };
  const i = Math.floor(t);
  const f = ease(t - i);
  const a = node(i);
  const b = node(i + 1);
  // A little hop between spaces.
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * 24, facing: face(i), walking: true };
}
