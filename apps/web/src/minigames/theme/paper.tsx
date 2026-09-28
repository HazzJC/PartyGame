import type { ReactNode, SVGProps } from 'react';

/**
 * Paper-craft drawing kit for the mini game scenes and demos: every prop is a cut-out with a white
 * paper rim and an ink edge, in flat colours, like the board and the logo.
 */

export const INK = '#2B2233';
export const PAPER = '#FFFFFF';

type PathProps = Omit<SVGProps<SVGPathElement>, 'd' | 'fill'>;

/** A cut-out shape: white paper rim, then the colour with an ink edge. */
export function Cut({ d, fill, rim = 12, edge = 5, ...rest }: { d: string; fill: string; rim?: number; edge?: number } & PathProps) {
  return (
    <g {...(rest as SVGProps<SVGGElement>)}>
      {rim > 0 && <path d={d} fill={PAPER} stroke={PAPER} strokeWidth={rim} strokeLinejoin="round" />}
      <path d={d} fill={fill} stroke={INK} strokeWidth={edge} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
}

/** A flat shape with just an ink edge (for layers inside a cut-out). */
export function Ink({ d, fill = 'none', w = 4, ...rest }: { d: string; fill?: string; w?: number } & PathProps) {
  return <path d={d} fill={fill} stroke={INK} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" {...rest} />;
}

/** A hard paper shadow under a prop. */
export function Shadow({ cx, cy, rx, ry = rx * 0.22, o = 0.18 }: { cx: number; cy: number; rx: number; ry?: number; o?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={INK} opacity={o} />;
}

/** Rounded rectangle path. */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

/** Circle path. */
export function circ(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

/** A five-point star path. */
export function star(cx: number, cy: number, R: number, r = R * 0.45): string {
  return (
    Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const k = i % 2 ? r : R;
      return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * k).toFixed(1)} ${(cy + Math.sin(a) * k).toFixed(1)}`;
    }).join('') + 'Z'
  );
}

/** A soft paper cloud. */
export function Cloud({ x, y, s = 1, fill = PAPER, className }: { x: number; y: number; s?: number; fill?: string; className?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className={className}>
      <Cut d="M-60 20 Q-72 -8 -40 -12 Q-32 -40 -2 -32 Q20 -52 44 -26 Q76 -28 68 6 Q74 26 44 26 H-40 Q-66 30 -60 20 Z" fill={fill} rim={0} />
    </g>
  );
}

/** A paper bunting line with triangular flags. */
export function Bunting({ x1, x2, y, sag = 30, n = 9, colours = ['#FF4D5E', '#FFD23F', '#3D7BFF', '#3DBE4B'] }: { x1: number; x2: number; y: number; sag?: number; n?: number; colours?: string[] }) {
  const flags: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x1 + (x2 - x1) * t;
    const yy = y + Math.sin(t * Math.PI) * sag;
    flags.push(
      <path key={i} className="anim-flutter" style={{ animationDelay: `${-i * 0.23}s` }} d={`M${x - 16} ${yy} H${x + 16} L${x} ${yy + 34} Z`} fill={colours[i % colours.length]} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />,
    );
  }
  return (
    <g>
      <path d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y + sag * 2} ${x2} ${y}`} fill="none" stroke={INK} strokeWidth={3.5} />
      {flags}
    </g>
  );
}

/** A tiny sparkle (four-point star), used in demos and scenes. */
export function Sparkle({ x, y, k = 10, fill = '#FFE98A', className }: { x: number; y: number; k?: number; fill?: string; className?: string }) {
  return <path className={className} d={`M${x} ${y - k}Q${x} ${y} ${x + k} ${y}Q${x} ${y} ${x} ${y + k}Q${x} ${y} ${x - k} ${y}Q${x} ${y} ${x} ${y - k}Z`} fill={fill} stroke={INK} strokeWidth={2} strokeLinejoin="round" />;
}
