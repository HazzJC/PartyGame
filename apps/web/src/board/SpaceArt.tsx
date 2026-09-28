import type { BoardNode } from '@partygame/engine';
import type { ReactNode } from 'react';

const INK = '#2B2233';
const PAPER = '#FFFFFF';

export type SpaceKind = Exclude<BoardNode['type'], 'slot'> | 'start';

/**
 * Board spaces as thick paper tokens: a darker extruded edge, a white cut-paper rim, a colour face
 * and a drawn icon. Every type also has its own shape, so colour is never the only cue.
 */
export const SPACE_ART: Record<SpaceKind, { face: string; side: string; shape: 'circle' | 'diamond' | 'square' | 'hex' | 'badge'; label: string }> = {
  blue: { face: '#3D7BFF', side: '#1F4FB8', shape: 'circle', label: 'Blue space: gain coins' },
  red: { face: '#FF4D5E', side: '#B3243A', shape: 'circle', label: 'Red space: lose coins' },
  event: { face: '#9B5DE5', side: '#5E2F9E', shape: 'diamond', label: 'Event space' },
  shop: { face: '#FFB703', side: '#B67C00', shape: 'square', label: 'Shop space' },
  duel: { face: '#1B998B', side: '#0D5E55', shape: 'hex', label: 'Duel space' },
  start: { face: '#3DBE4B', side: '#237A2E', shape: 'badge', label: 'Start' },
};

/** The token outline for a shape, centred on 0,0 with radius r. */
function Shape({ shape, r, ...rest }: { shape: (typeof SPACE_ART)[SpaceKind]['shape']; r: number } & React.SVGProps<SVGPathElement & SVGCircleElement & SVGRectElement>) {
  if (shape === 'circle') return <circle r={r} {...rest} />;
  if (shape === 'badge') return <circle r={r * 1.12} {...rest} />;
  if (shape === 'square') return <rect x={-r * 0.9} y={-r * 0.9} width={r * 1.8} height={r * 1.8} rx={r * 0.38} {...rest} />;
  if (shape === 'diamond') {
    const d = r * 1.18;
    return <path d={`M0 ${-d} Q${d * 0.18} ${-d * 0.18} ${d} 0 Q${d * 0.18} ${d * 0.18} 0 ${d} Q${-d * 0.18} ${d * 0.18} ${-d} 0 Q${-d * 0.18} ${-d * 0.18} 0 ${-d}Z`} strokeLinejoin="round" {...rest} />;
  }
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(Math.cos(a) * r * 1.06).toFixed(2)},${(Math.sin(a) * r * 1.06).toFixed(2)}`;
  });
  return <path d={`M${pts.join('L')}Z`} strokeLinejoin="round" {...rest} />;
}

/** Icons are drawn in a box of about ±16 units, white or gold with ink outlines. */
function Icon({ kind }: { kind: SpaceKind }): ReactNode {
  const s = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (kind) {
    case 'blue':
      return (
        <g>
          <circle r={14} fill="#FFD23F" {...s} />
          <circle r={9.5} fill="none" stroke="#C99400" strokeWidth={2} />
          <path d="M0 -6V6M-6 0H6" {...s} strokeWidth={3.6} />
        </g>
      );
    case 'red':
      return (
        <g>
          <circle r={14} fill="#FFD23F" {...s} />
          <circle r={9.5} fill="none" stroke="#C99400" strokeWidth={2} />
          <path d="M-7 0H7" {...s} strokeWidth={4.2} />
        </g>
      );
    case 'event':
      return (
        <text y={10} textAnchor="middle" fontSize={30} fontFamily="Fredoka, sans-serif" fontWeight={700} fill={PAPER} stroke={INK} strokeWidth={5} paintOrder="stroke" strokeLinejoin="round">
          ?
        </text>
      );
    case 'shop':
      // A shopping bag with a coin on it.
      return (
        <g>
          <path d="M-7 -8 Q-7 -16 0 -16 Q7 -16 7 -8" fill="none" {...s} />
          <path d="M-13 -8 H13 L11 14 H-11 Z" fill={PAPER} {...s} />
          <circle cy={3} r={5.5} fill="#FFD23F" {...s} strokeWidth={2.5} />
        </g>
      );
    case 'duel':
      // Crossed swords.
      return (
        <g>
          {[45, -45].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <path d="M-2.6 -17 L0 -20 L2.6 -17 V6 H-2.6 Z" fill={PAPER} {...s} strokeWidth={2.5} />
              <path d="M-7 6.5 H7" {...s} strokeWidth={4} />
              <path d="M0 8 V14" {...s} strokeWidth={4} />
            </g>
          ))}
        </g>
      );
    case 'start':
      return (
        <text y={8} textAnchor="middle" fontSize={22} fontFamily="Fredoka, sans-serif" fontWeight={700} fill={PAPER} stroke={INK} strokeWidth={4.5} paintOrder="stroke" strokeLinejoin="round" letterSpacing={1}>
          GO
        </text>
      );
  }
}

/**
 * One space token centred on 0,0. `ring` draws a coloured halo behind it (the phone's route
 * highlights and your own position).
 */
export function SpaceToken({ kind, r = 27, ring }: { kind: SpaceKind; r?: number; ring?: string }) {
  const art = SPACE_ART[kind];
  const depth = r * 0.26;
  return (
    <g className={`space-token space-${kind}`}>
      {ring && <circle r={r + 15} fill={ring} stroke={INK} strokeWidth={4} />}
      {/* Extruded paper edge and a soft contact shadow. */}
      <ellipse cy={depth + r * 0.55} rx={r * 1.05} ry={r * 0.45} fill={INK} opacity={0.18} />
      <g transform={`translate(0 ${depth})`}>
        <Shape shape={art.shape} r={r + 5} fill={art.side} stroke={INK} strokeWidth={4} />
      </g>
      {/* White cut-paper rim, then the coloured face. */}
      <Shape shape={art.shape} r={r + 5} fill={PAPER} stroke={INK} strokeWidth={4} />
      <Shape shape={art.shape} r={r - 1} fill={art.face} stroke={INK} strokeWidth={2} />
      {/* A flat highlight crescent on the upper left: paper catching the light. */}
      <path d={`M${-r * 0.62} ${-r * 0.12} Q${-r * 0.55} ${-r * 0.62} ${-r * 0.08} ${-r * 0.7}`} fill="none" stroke={PAPER} strokeWidth={r * 0.13} strokeLinecap="round" opacity={0.55} />
      <g className="space-icon">
        <Icon kind={kind} />
      </g>
    </g>
  );
}

/** Legend chip icon: the same token drawn small, so the legend matches the board exactly. */
export function SpaceIcon({ kind, size = 30 }: { kind: SpaceKind | 'star'; size?: number }) {
  return (
    <svg viewBox="-40 -40 80 84" width={size} height={size} aria-hidden="true" style={{ flex: 'none', overflow: 'visible' }}>
      {kind === 'star' ? <StarPrize size={64} /> : <SpaceToken kind={kind} />}
    </svg>
  );
}

/** The star you buy: a gold paper star on a glowing pedestal, centred on 0,0. */
export function StarPrize({ size = 64, spin = false }: { size?: number; spin?: boolean }) {
  const s = size / 100;
  const star = 'M50 2 L63 36 L99 37 L70 58 L81 94 L50 73 L19 94 L30 58 L1 37 L37 36 Z';
  return (
    <g className="star-prize">
      <ellipse cy={size * 0.42} rx={size * 0.46} ry={size * 0.16} fill={INK} opacity={0.2} />
      <g className={spin ? 'star-glow' : undefined}>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M0 ${-size * 0.62} L${size * 0.06} ${-size * 0.46} L${-size * 0.06} ${-size * 0.46}Z`} transform={`rotate(${i * 45})`} fill="#FFE98A" stroke={INK} strokeWidth={2} />
        ))}
      </g>
      <g className={spin ? 'star-bob' : undefined}>
        <g transform={`translate(${-size / 2} ${-size / 2}) scale(${s})`}>
          <path d={star} fill={PAPER} stroke={PAPER} strokeWidth={16} strokeLinejoin="round" />
          <path d={star} transform="translate(0 7)" fill="#C98F00" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d={star} fill="#FFD23F" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <circle cx={42} cy={48} r={4.5} fill={INK} />
          <circle cx={58} cy={48} r={4.5} fill={INK} />
          <path d="M32 30 Q40 22 50 24" fill="none" stroke={PAPER} strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        </g>
      </g>
    </g>
  );
}
