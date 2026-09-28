import type { BoardDef } from '@partygame/engine';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MapSceneryArt } from './MapSceneryArt.tsx';
import { PaperPawn } from './PaperPawn.tsx';
import { SpaceIcon, SpaceToken, StarPrize, type SpaceKind } from './SpaceArt.tsx';
import { clusteredPawns } from './boardVisual.ts';

type Box = { x: number; y: number; w: number; h: number };

/** Eases the camera (the SVG viewBox) to a new view over about half a second. */
function useGlide(target: Box, on: boolean): Box {
  const [box, setBox] = useState(target);
  const current = useRef(target);
  const key = `${target.x},${target.y},${target.w},${target.h}`;
  useEffect(() => {
    const from = { ...current.current };
    const reduce = document.documentElement.dataset.motion === 'reduce';
    if (!on || reduce) {
      current.current = target;
      setBox(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 480);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const next = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      };
      current.current = next;
      setBox(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // The key captures every part of the target box.
  }, [key, on]);
  return on ? box : target;
}

/** This many pawns on one space collapse into a "×N" badge (only big rooms, e.g. 16 on Start). */
const CROWD_MIN = 9;

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
  /** Which way the standee faces (it flips when walking left). */
  facing?: 1 | -1;
  walking?: boolean;
}

export interface Highlight {
  nodes: number[];
  colour: string;
  dash?: string;
}

const LEGEND: { kind: SpaceKind | 'star'; label: string }[] = [
  { kind: 'blue', label: 'coins' },
  { kind: 'red', label: 'lose coins' },
  { kind: 'event', label: 'event' },
  { kind: 'shop', label: 'shop' },
  { kind: 'duel', label: 'duel' },
  { kind: 'star', label: 'star' },
];

/** The key to the board, drawn with the same tokens as the spaces themselves. */
export function BoardLegend() {
  return (
    <div className="board-legend" aria-label="Board space legend">
      {LEGEND.map((l) => (
        <span key={l.kind}>
          <SpaceIcon kind={l.kind} />
          {l.label}
        </span>
      ))}
    </div>
  );
}

export function StarShape({ x, y, size, spin = false }: { x: number; y: number; size: number; spin?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <StarPrize size={size} spin={spin} />
    </g>
  );
}

/**
 * Lines up standees sharing a space, like a party posing for a photo: one row for up to four,
 * then a back row and a front row. Standees read side by side far better than in a ring.
 */
export function lineUp(pawns: Pawn[], spacing: number): Pawn[] {
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
    const rows = g.length <= 4 ? [g] : [g.slice(0, Math.ceil(g.length / 2)), g.slice(Math.ceil(g.length / 2))];
    rows.forEach((row, r) => {
      const dy = rows.length === 1 ? 0 : r === 0 ? -16 : 12;
      const shift = rows.length > 1 && r === 1 ? spacing / 2 : 0;
      row.forEach((p, i) => {
        out.push({ ...p, x: p.x + (i - (row.length - 1) / 2) * spacing + shift - (rows.length > 1 ? spacing / 4 : 0), y: p.y + dy });
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
  glide = false,
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
  /** Animate the camera to a new view instead of cutting (e.g. switching near me / full map). */
  glide?: boolean;
}) {
  // Big crowds spread past the edge spaces (16 pawns on the start), so leave a margin for them.
  // Standees on the top road poke above the island: a back-row head plus its badge rises about
  // 0.55 × pawnSize above the board's top edge, so that much headroom is always kept for them.
  const margin = pawns.length > 7 ? 70 : 0;
  const headroom = pawns.length ? Math.max(margin, pawnSize * 0.55) : margin;
  const target = focus ?? { x: -margin, y: -headroom, w: def.width + margin * 2, h: def.height + margin + headroom };
  const vb = useGlide(target, glide);
  const edges: ReactNode[] = [];
  for (const node of def.nodes)
    for (const nx of node.next) {
      const to = def.nodes[nx]!;
      edges.push(<line key={`${node.id}-${nx}`} x1={node.x} y1={node.y} x2={to.x} y2={to.y} />);
    }
  const hl = new Map<number, string>();
  for (const h of highlights) for (const id of h.nodes) hl.set(id, h.colour);
  const groups = clusteredPawns(pawns);
  // Standees further down the board are drawn later, so they overlap the ones behind them.
  const singles = lineUp(groups.filter((g) => g.members.length < CROWD_MIN).flatMap((g) => g.members), pawnSize * 0.72).sort((a, b) => a.y - b.y);
  const crowds = groups.filter((g) => g.members.length >= CROWD_MIN);
  const live = presentation === 'host';

  return (
    <svg className={className} data-presentation={presentation} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Game board">
      <MapSceneryArt />
      {/* The road: an ink edge, a paper strip, and a stitched centre line. */}
      <g stroke="#2B2233" strokeWidth={30} strokeLinecap="round">
        {edges}
      </g>
      <g stroke="#FFF3D6" strokeWidth={20} strokeLinecap="round">
        {edges}
      </g>
      <g stroke="#D9B98A" strokeWidth={3.5} strokeLinecap="round" strokeDasharray="2 12">
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
          return <circle key={node.id} cx={node.x} cy={node.y} r={8} fill="#FFF3D6" stroke="#2B2233" strokeWidth={3} />;
        }
        const ring = hl.get(node.id);
        const start = node.id === def.start;
        return (
          <g
            key={node.id}
            transform={`translate(${node.x} ${node.y})`}
            onClick={onNodeClick ? () => onNodeClick(node.id) : undefined}
            style={onNodeClick ? { cursor: 'pointer' } : undefined}
            role={onNodeClick ? 'button' : undefined}
            aria-label={onNodeClick ? `Space ${node.id}` : undefined}
          >
            <SpaceToken kind={start ? 'start' : node.type} ring={ring} />
            {start && <StartFlag live={live} />}
          </g>
        );
      })}
      {stars.map((id) => {
        const n = def.nodes[id];
        return n ? <StarShape key={id} x={n.x} y={n.y} size={66} spin={live} /> : null;
      })}
      {singles.map((p, i) => (
        // Feet stand a little below the centre of the space, so the standee looks planted on its token.
        <g key={p.id} transform={`translate(${p.x} ${p.y + 12})`}>
          <PaperPawn avatar={p.avatar} size={pawnSize} dim={p.dim} facing={p.facing ?? 1} walking={live && !!p.walking} phase={(i * 0.37) % 2} />
        </g>
      ))}
      {/* Badges go above every standee, beside the head, so none hides a neighbour's face. */}
      {singles.map((p) =>
        p.badge === undefined || p.badge === null ? null : (
          <g key={`badge-${p.id}`} transform={`translate(${p.x + pawnSize * 0.42} ${p.y + 12 - pawnSize * 1.42})`}>
            <circle r={18} fill={p.badgeTone === 'good' ? '#2EC27E' : p.badgeTone === 'bad' ? '#E5484D' : '#FFFFFF'} stroke="#2B2233" strokeWidth={4} />
            <text y={8} textAnchor="middle" fontSize={22} fontFamily="Fredoka, sans-serif" fontWeight={700} fill={p.badgeTone === 'plain' || !p.badgeTone ? '#2B2233' : '#FFFFFF'}>
              {p.badge}
            </text>
          </g>
        ),
      )}
      {/* A big crowd on one space: three standees stand in for everyone, with a count beside them. */}
      {crowds.map((g) => (
        <g key={`crowd-${g.x}-${g.y}`} className="pawn-crowd" aria-label={`${g.members.length} players on one space`}>
          {g.members.slice(0, 3).map((m, i) => (
            <g key={m.id} transform={`translate(${g.x + (i - 1) * pawnSize * 0.6} ${g.y + 12 + (i === 1 ? 6 : 0)})`}>
              <PaperPawn avatar={m.avatar} size={pawnSize} dim={m.dim} phase={i * 0.5} />
            </g>
          ))}
          <g transform={`translate(${g.x + pawnSize * 1.6} ${g.y - pawnSize * 0.75})`}>
            <rect x={-30} y={-20} width={60} height={40} rx={20} fill="#FFFFFF" stroke="#2B2233" strokeWidth={5} />
            <text y={10} textAnchor="middle" fontSize="28" fontFamily="Fredoka, sans-serif" fontWeight="700" fill="#2B2233">
              ×{g.members.length}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}

/** A little pennant on the start space, waving on the host screen. */
function StartFlag({ live }: { live: boolean }) {
  return (
    <g transform="translate(30 -8)">
      <path d="M0 0 V-58" stroke="#2B2233" strokeWidth={5} strokeLinecap="round" />
      <g className={live ? 'flag-wave' : undefined}>
        <path d="M2 -58 Q18 -64 34 -56 Q26 -48 34 -40 Q18 -44 2 -38 Z" fill="#FF4D5E" stroke="#2B2233" strokeWidth={3.5} strokeLinejoin="round" />
      </g>
      <circle cy={-60} r={4} fill="#FFD23F" stroke="#2B2233" strokeWidth={2.5} />
    </g>
  );
}
