import type { BoardDef, BoardNode } from '@partygame/engine';
import type { ReactNode } from 'react';
import { Avatar } from '../ui/Avatar.tsx';

export const SPACE_FILL: Record<BoardNode['type'], string> = {
  blue: '#3D7BFF',
  red: '#FF4D5E',
  event: '#9B5DE5',
  shop: '#FFB703',
  duel: '#1B998B',
  slot: '#FFFFFF',
};

const GLYPH: Partial<Record<BoardNode['type'], string>> = { event: '?', shop: '$', duel: 'VS', red: '−', blue: '+' };

export interface Pawn {
  id: string;
  avatar: number;
  x: number;
  y: number;
  dim?: boolean;
  /** Small bubble above the pawn (dice roll, "?" while choosing, +3…). */
  badge?: ReactNode;
  badgeTone?: 'good' | 'bad' | 'plain';
}

export interface Highlight {
  nodes: number[];
  colour: string;
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
    const r = radius + g.length * 2;
    g.forEach((p, i) => {
      const a = (i / g.length) * Math.PI * 2 - Math.PI / 2;
      out.push({ ...p, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
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
}) {
  const vb = focus ?? { x: 0, y: 0, w: def.width, h: def.height };
  const edges: ReactNode[] = [];
  for (const node of def.nodes)
    for (const nx of node.next) {
      const to = def.nodes[nx]!;
      edges.push(<line key={`${node.id}-${nx}`} x1={node.x} y1={node.y} x2={to.x} y2={to.y} />);
    }
  const hl = new Map<number, string>();
  for (const h of highlights) for (const id of h.nodes) hl.set(id, h.colour);

  return (
    <svg className={className} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Game board">
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
            <circle cx={node.x} cy={node.y} r={22} fill={SPACE_FILL[node.type]} stroke="#2B2233" strokeWidth={3} />
            {GLYPH[node.type] && (
              <text x={node.x} y={node.y + (node.type === 'duel' ? 6 : 8)} textAnchor="middle" fontSize={node.type === 'duel' ? 15 : 24} fontFamily="Fredoka, sans-serif" fontWeight={700} fill="#FFFFFF" opacity={node.type === 'blue' || node.type === 'red' ? 0.85 : 1}>
                {GLYPH[node.type]}
              </text>
            )}
            {node.id === def.start && (
              <text x={node.x} y={node.y - 40} textAnchor="middle" fontSize={20} fontFamily="Fredoka, sans-serif" fontWeight={700} fill="#2B2233">
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
      {fanOut(pawns).map((p) => (
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
    </svg>
  );
}
