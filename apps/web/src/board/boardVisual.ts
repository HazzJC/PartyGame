import type { BoardDef } from '@partygame/engine';

export type ViewBox = { x: number; y: number; w: number; h: number };
export const ROUTES = [
  { label: 'Main loop', dash: undefined, colour: '#A34508' },
  { label: 'Shortcut', dash: '18 12', colour: '#623090' },
] as const;


export function focusedView(def: BoardDef, nodeId: number, w = 680, h = 460): ViewBox {
  const node = def.nodes[nodeId] ?? def.nodes[def.start]!;
  return {
    x: Math.max(0, Math.min(def.width - w, node.x - w / 2)),
    y: Math.max(0, Math.min(def.height - h, node.y - h / 2)),
    w, h,
  };
}

export function clusteredPawns<T extends { x: number; y: number; stationary?: boolean }>(pawns: T[]): { members: T[]; x: number; y: number }[] {
  const groups = new Map<string, T[]>();
  for (const pawn of pawns) {
    const key = pawn.stationary === false ? `moving-${groups.size}` : `${Math.round(pawn.x)},${Math.round(pawn.y)}`;
    groups.set(key, [...(groups.get(key) ?? []), pawn]);
  }
  return [...groups.values()].map((members) => ({ members, x: members[0]!.x, y: members[0]!.y }));
}

export function contrastRatio(hexA: string, hexB: string): number {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, b] = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const a = luminance(hexA), b = luminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
