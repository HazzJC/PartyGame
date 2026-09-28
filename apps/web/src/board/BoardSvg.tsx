import type { BoardDef, BoardNode } from '@partygame/engine';
import type { ReactNode } from 'react';
import { Avatar } from '../ui/Avatar.tsx';
import { MapSceneryArt } from './MapSceneryArt.tsx';
import { clusteredPawns, SPACE_SYMBOL, SYMBOL_INK, SYMBOL_PAPER } from './boardVisual.ts';

export const SPACE_FILL: Record<BoardNode['type'], string> = {
  blue: '#3D7BFF',
  red: '#FF4D5E',
  event: '#9B5DE5',
  shop: '#FFB703',
  duel: '#1B998B',
  slot: '#FFFFFF',
};

export interface Pawn {
  id: string;
  avatar: number;
  x: number;
  y: number;
  dim?: boolean;
  /** Small bubble above the pawn (dice roll, "?" while choosing, +3…). */
  badge?: ReactNode;
  badgeTone?: 'good' | 'bad' | 'plain';
  stationary?: boolean;
}

export interface Highlight {
  nodes: number[];
  colour: string;
  dash?: string;
}

export function BoardLegend() {
  return <div className="board-legend" aria-label="Board space legend">
    <span><b>+</b> coins</span><span><b>−</b> lose coins</span><span><b>?</b> event</span><span><b>◆</b> shop</span><span><b>⚔</b> duel</span><span><b>★</b> star</span>
  </div>;
}

export function StarShape({ x, y, size }: { x: number; y: number; size: number }) {
  const s = size / 100;
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}>
      <path d="M50 2 L63 36 L99 37 L70 58 L81 94 L50 73 L19 94 L30 58 L1 37 L37 36 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="14" strokeLinejoin="round" />
      <path d="M50 2 L63 36 L99 37 L70 58 L81 94 L50 73 L19 94 L30 58 L1 37 L37 36 Z" fill="#FFD23F" stroke="#2B2233" strokeWidth="6" strokeLinejoin="round" />
    </g>
  );
}

/** Groups pawns standing on the same spot and fans them out so every animal stays visible. */
export function fanOut(pawns: Pawn[], radius = 26): Pawn[] {
  const groups = new Map<string, Pawn[]>();
  for (const p of pawns) {
    const key = `${Math.round(p.x)},${Math.round(p.y)}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const out: Pawn[] = [];
  for (const g of groups.values()) {
    if (g.length === 1) {
      out.push(g[0]!);
      continue;
    }
    // Up to 6 in a ring; bigger crowds (16 players on the start space) get a second, wider ring.
    const rings = g.length <= 7 ? [g] : [g.slice(0, 6), g.slice(6)];
    rings.forEach((ring, k) => {
      const r = k === 0 ? radius + Math.min(ring.length, 7) * 2 : radius * 2.3 + ring.length * 1.5;
      ring.forEach((p, i) => {
        const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2 + (k ? Math.PI / ring.length : 0);
        out.push({ ...p, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
      });
    });
  }
  return out;
}

/**
 * The board as SVG: thick ink paths, sticker spaces, stars on their waypoints, pawns on top.
 * The same component draws the host's big board and the phone's private route map.
 */
export function BoardSvg({
  def,
  stars,
  pawns = [],
  highlights = [],
  pawnSize = 56,
  className,
  focus,
  onNodeClick,
  presentation = 'host',
}: {
  def: BoardDef;
  stars: number[];
  pawns?: Pawn[];
  highlights?: Highlight[];
  pawnSize?: number;
  className?: string;
  /** Optional viewBox override (e.g. zoom the phone map on a junction). */
  focus?: { x: number; y: number; w: number; h: number };
  /** Makes spaces tappable (e.g. to place a hidden trap). */
  onNodeClick?: (id: number) => void;
  presentation?: 'host' | 'phone' | 'focus' | 'trap';
}) {
  // Big crowds fan out past the edge spaces (16 pawns on the start), so leave a margin for them.
  const margin = pawns.length > 7 ? 70 : 0;
  const vb = focus ?? { x: -margin, y: -margin, w: def.width + margin * 2, h: def.height + margin * 2 };
  const edges: ReactNode[] = [];
  for (const node of def.nodes)
    for (const nx of node.next) {
      const to = def.nodes[nx]!;
      edges.push(<line key={`${node.id}-${nx}`} x1={node.x} y1={node.y} x2={to.x} y2={to.y} />);
    }
  const hl = new Map<number, string>();
  for (const h of highlights) for (const id of h.nodes) hl.set(id, h.colour);
  const groups = clusteredPawns(pawns);
  const singles = fanOut(groups.filter((g) => g.members.length <= 4).flatMap((g) => g.members));
  const crowds = groups.filter((g) => g.members.length > 4);

  return (
    <svg className={className} data-presentation={presentation} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Game board">
      <MapSceneryArt />
      <g stroke="#2B2233" strokeWidth={26} strokeLinecap="round">
        {edges}
      </g>
      <g stroke="#E8D9BC" strokeWidth={14} strokeLinecap="round">
        {edges}
      </g>
      {highlights.map((h, i) => (
        <polyline
          key={i}
          points={h.nodes.map((id) => `${def.nodes[id]!.x},${def.nodes[id]!.y}`).join(' ')}
          fill="none"
          stroke={h.colour}
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={h.dash}
          opacity={0.9}
        />
      ))}
      {def.nodes.map((node) => {
        if (node.type === 'slot') {
          if (stars.includes(node.id)) return null;
          return <circle key={node.id} cx={node.x} cy={node.y} r={7} fill="#FFFFFF" stroke="#2B2233" strokeWidth={3} opacity={0.7} />;
        }
        const ring = hl.get(node.id);
        return (
          <g key={node.id} onClick={onNodeClick ? () => onNodeClick(node.id) : undefined} style={onNodeClick ? { cursor: 'pointer' } : undefined} role={onNodeClick ? 'button' : undefined} aria-label={onNodeClick ? `Space ${node.id}` : undefined}>
            <circle cx={node.x} cy={node.y} r={31} fill={ring ?? '#FFFFFF'} stroke="#2B2233" strokeWidth={4} />
            <circle cx={node.x} cy={node.y} r={25} fill={SPACE_FILL[node.type]} stroke="#2B2233" strokeWidth={2} />
            <circle cx={node.x} cy={node.y} r={19} fill={SYMBOL_PAPER} stroke="#2B2233" strokeWidth={2} />
            {SPACE_SYMBOL[node.type] && (
              <text x={node.x} y={node.y + 8} textAnchor="middle" fontSize={node.type === 'duel' ? 22 : 26} fontFamily="Fredoka, sans-serif" fontWeight={700} fill={SYMBOL_INK}>
                {SPACE_SYMBOL[node.type]}
              </text>
            )}
            {node.id === def.start && (
              <text x={node.x + 80} y={node.y - 36} textAnchor="start" fontSize={20} fontFamily="Fredoka, sans-serif" fontWeight={700} fill="#2B2233">
                START
              </text>
            )}
          </g>
        );
      })}
      {stars.map((id) => {
        const n = def.nodes[id];
        return n ? <StarShape key={id} x={n.x} y={n.y} size={64} /> : null;
      })}
      {singles.map((p) => (
        <g key={p.id} transform={`translate(${p.x - pawnSize / 2} ${p.y - pawnSize / 2})`}>
          <Avatar avatar={p.avatar} size={pawnSize} dim={p.dim} />
          {p.badge !== undefined && p.badge !== null && (
            <g transform={`translate(${pawnSize / 2} -14)`}>
              <circle r={19} fill={p.badgeTone === 'good' ? '#2EC27E' : p.badgeTone === 'bad' ? '#E5484D' : '#FFFFFF'} stroke="#2B2233" strokeWidth={4} />
              <text y={8} textAnchor="middle" fontSize={22} fontFamily="Fredoka, sans-serif" fontWeight={700} fill={p.badgeTone === 'plain' || !p.badgeTone ? '#2B2233' : '#FFFFFF'}>
                {p.badge}
              </text>
            </g>
          )}
        </g>
      ))}
      {crowds.map((g) => <g key={`crowd-${g.x}-${g.y}`} className="pawn-crowd" aria-label={`${g.members.length} players on one space`}>
        <circle cx={g.x} cy={g.y} r={35} fill="#FFFFFF" stroke="#2B2233" strokeWidth={6} />
        <text x={g.x} y={g.y + 10} textAnchor="middle" fontSize="32" fontFamily="Fredoka, sans-serif" fontWeight="700" fill="#2B2233">×{g.members.length}</text>
      </g>)}
    </svg>
  );
}
