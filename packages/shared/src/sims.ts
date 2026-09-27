/**
 * Pure, deterministic calculations shared by the server simulations and the phone previews
 * (the doc allows deterministic calculations to run on the controller to preview your own move).
 */

// ------------------------------------------------------------------ Artillery

export interface ShotInput {
  angle: number;
  power: number;
  dir: -1 | 1;
}

export const GRAVITY = 520;
export const POWER_SCALE = 9.5;
export const WIND_SCALE = 36;
export const FLIGHT_SAMPLE = 0.05;

/** Flattened [x0, y0, x1, y1, …] path of a shot, sampled every 50 ms until it lands. */
export function flightPath(x0: number, shot: ShotInput, wind: number): number[] {
  const a = (shot.angle * Math.PI) / 180;
  const v = shot.power * POWER_SCALE;
  const vx = Math.cos(a) * v * shot.dir;
  const vy = Math.sin(a) * v;
  const ax = wind * WIND_SCALE;
  const out: number[] = [];
  for (let t = 0; t < 12; t += FLIGHT_SAMPLE) {
    const x = x0 + vx * t + 0.5 * ax * t * t;
    const y = 30 + vy * t - 0.5 * GRAVITY * t * t;
    out.push(Math.round(x), Math.round(Math.max(0, y)));
    if (y <= 0 && t > 0) break;
  }
  return out;
}

// ------------------------------------------------------------------ Heist

export type HeistStep = 'U' | 'D' | 'L' | 'R' | 'W';
export const HEIST_DIRS: Record<HeistStep, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };

export function heistBlocked(size: number, walls: number[], x: number, y: number): boolean {
  return x < 0 || y < 0 || x >= size || y >= size || walls.includes(y * size + x);
}

/** Where a route ends up on an empty floor: each blocked step just stays put. */
export function previewRoute(floor: { size: number; walls: number[] }, from: { x: number; y: number }, steps: HeistStep[]): [number, number][] {
  const out: [number, number][] = [[from.x, from.y]];
  let { x, y } = from;
  for (const s of steps) {
    const [dx, dy] = HEIST_DIRS[s];
    if (!heistBlocked(floor.size, floor.walls, x + dx, y + dy)) {
      x += dx;
      y += dy;
    }
    out.push([x, y]);
  }
  return out;
}

// ------------------------------------------------------------------ Land Grab

export type Shape = [number, number][];
export const LAND_EMPTY = -1;
/** Clashed cells nobody can own. */
export const LAND_NEUTRAL = -2;

export const LAND_SHAPES: Shape[] = [
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
];

export function rotateShape(shape: Shape, rot: number): Shape {
  let s = shape;
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) s = s.map(([x, y]) => [-y, x] as [number, number]);
  const minX = Math.min(...s.map(([x]) => x));
  const minY = Math.min(...s.map(([, y]) => y));
  return s.map(([x, y]) => [x - minX, y - minY] as [number, number]);
}

/** Cells a placement would cover, or null if it's off the map, overlaps land, or doesn't touch yours. */
export function placementCells(board: { side: number; cells: number[] }, owner: number, shape: Shape, x: number, y: number, rot: number): number[] | null {
  const out: number[] = [];
  let touches = false;
  for (const [dx, dy] of rotateShape(shape, rot)) {
    const cx = x + dx;
    const cy = y + dy;
    if (cx < 0 || cy < 0 || cx >= board.side || cy >= board.side) return null;
    const c = cy * board.side + cx;
    if (board.cells[c] !== LAND_EMPTY) return null;
    out.push(c);
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ] as const)
      if (nx >= 0 && ny >= 0 && nx < board.side && ny < board.side && board.cells[ny * board.side + nx] === owner) touches = true;
  }
  return touches ? out : null;
}

// ------------------------------------------------------------------ Mirror Maze

export type Mirror = '/' | '\\' | '';

export interface MirrorLayout {
  size: number;
  source: { x: number; y: number; dx: number; dy: number };
  targets: number[];
  walls: number[];
  slots: number[];
}

/** Traces the laser from the source; returns visited cells in order and the targets hit. */
export function traceLaser(d: MirrorLayout, board: Mirror[]): { path: number[]; hits: number[] } {
  const path: number[] = [];
  const hits = new Set<number>();
  let { x, y, dx, dy } = d.source;
  const seen = new Set<string>();
  for (let i = 0; i < d.size * d.size * 4; i++) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= d.size || y >= d.size) break;
    const c = y * d.size + x;
    if (d.walls.includes(c)) break;
    const key = `${c},${dx},${dy}`;
    if (seen.has(key)) break;
    seen.add(key);
    path.push(c);
    if (d.targets.includes(c)) hits.add(c);
    const slot = d.slots.indexOf(c);
    const m = slot >= 0 ? board[slot] : '';
    if (m === '/') [dx, dy] = [-dy, -dx];
    else if (m === '\\') [dx, dy] = [dy, dx];
  }
  return { path, hits: [...hits] };
}
