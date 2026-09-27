/**
 * Drawings travel as vector strokes in a 0..1000 square, simplified with Ramer–Douglas–Peucker
 * so a finger doodle is a few hundred bytes rather than thousands of raw pointer events.
 */
export type Point = [number, number];

export interface Stroke {
  /** Palette index. */
  c: number;
  /** Width in the 0..1000 space. */
  w: number;
  /** Flattened [x0, y0, x1, y1, …] integers in 0..1000. */
  p: number[];
}

export const DRAW_SIZE = 1000;
export const MAX_STROKES = 120;
export const MAX_POINTS = 4000;

function perpDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

export function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points.slice();
  let maxDist = 0;
  let index = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i++) {
    const d = perpDistance(points[i]!, points[0]!, points[last]!);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= epsilon) return [points[0]!, points[last]!];
  const left = simplify(points.slice(0, index + 1), epsilon);
  const right = simplify(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

export function encodeStroke(points: Point[], colour: number, width: number, epsilon = 3): Stroke {
  const clamp = (v: number) => Math.max(0, Math.min(DRAW_SIZE, Math.round(v)));
  const simple = simplify(points, epsilon);
  return { c: colour, w: Math.round(width), p: simple.flatMap(([x, y]) => [clamp(x), clamp(y)]) };
}

/** Server-side guard: drop anything malformed or oversized. */
export function sanitiseStrokes(input: unknown, palette: number): Stroke[] {
  if (!Array.isArray(input)) return [];
  const out: Stroke[] = [];
  let points = 0;
  for (const raw of input.slice(0, MAX_STROKES)) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Partial<Stroke>;
    if (!Array.isArray(s.p) || s.p.length < 2 || s.p.length % 2 !== 0) continue;
    const p = s.p.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).map((n) => Math.max(0, Math.min(DRAW_SIZE, Math.round(n))));
    if (p.length !== s.p.length) continue;
    points += p.length / 2;
    if (points > MAX_POINTS) break;
    out.push({ c: Math.max(0, Math.min(palette - 1, Math.round(Number(s.c) || 0))), w: Math.max(4, Math.min(80, Math.round(Number(s.w) || 12))), p });
  }
  return out;
}

/** SVG path data for a stroke (used on both screens). */
export function strokePath(s: Stroke): string {
  if (s.p.length === 2) return `M${s.p[0]} ${s.p[1]}l0.1 0`;
  let d = `M${s.p[0]} ${s.p[1]}`;
  for (let i = 2; i < s.p.length; i += 2) d += `L${s.p[i]} ${s.p[i + 1]}`;
  return d;
}

export const DRAW_PALETTE = ['#2B2233', '#FF4D5E', '#3D7BFF', '#2EC27E', '#FFD23F', '#9B5DE5', '#FF7A1A', '#FFFFFF'] as const;
