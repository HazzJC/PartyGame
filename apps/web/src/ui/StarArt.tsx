/**
 * The star: a chunky, rounded five-point paper star with a white sticker rim, a darker extruded
 * gold side (the same depth as the logo) and a little face. Drawn centred on 0,0 at `size` across.
 * Every star in the game (board, rail, standings, legend) uses this one piece of art.
 */

const INK = '#2B2233';

/** A five-point star path with rounded tips and inner corners. */
function roundedStar(R: number, r: number, round = 0.28): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return [Math.cos(a) * rad, Math.sin(a) * rad] as const;
  });
  // Each corner is replaced by a quadratic curve through it, starting and ending part-way along
  // the neighbouring edges, which rounds tips and notches alike.
  const lerp = (a: readonly [number, number], b: readonly [number, number], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as const;
  let d = '';
  pts.forEach((p, i) => {
    const prev = pts[(i + 9) % 10]!;
    const next = pts[(i + 1) % 10]!;
    const inP = lerp(p, prev, round);
    const outP = lerp(p, next, round);
    d += `${i === 0 ? 'M' : 'L'}${inP[0].toFixed(2)} ${inP[1].toFixed(2)}Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${outP[0].toFixed(2)} ${outP[1].toFixed(2)}`;
  });
  return d + 'Z';
}

const STAR = roundedStar(50, 24);

export function StarArt({ size = 64, face = true }: { size?: number; face?: boolean }) {
  const s = size / 100;
  return (
    <g transform={`scale(${s})`}>
      {/* White sticker rim, then the extruded side, then the face of the star. */}
      <path d={STAR} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={18} strokeLinejoin="round" />
      <path d={STAR} transform="translate(4 7)" fill={INK} stroke={INK} strokeWidth={10} strokeLinejoin="round" />
      <path d={STAR} transform="translate(0 6)" fill="#D19A00" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <path d={STAR} fill="#FFD23F" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {/* A flat paper shine along the upper-left arm. */}
      <path d="M-26 -12 Q-14 -18 -8 -30" fill="none" stroke="#FFF3B0" strokeWidth={7} strokeLinecap="round" />
      {face && (
        <>
          <ellipse cx={-9} cy={2} rx={4.5} ry={7} fill={INK} />
          <ellipse cx={9} cy={2} rx={4.5} ry={7} fill={INK} />
          <circle cx={-7.5} cy={-1} r={1.6} fill="#FFFFFF" />
          <circle cx={10.5} cy={-1} r={1.6} fill="#FFFFFF" />
          <ellipse cx={-18} cy={12} rx={5} ry={3} fill="#FF9EB5" opacity={0.75} />
          <ellipse cx={18} cy={12} rx={5} ry={3} fill="#FF9EB5" opacity={0.75} />
        </>
      )}
    </g>
  );
}

/** The star as a standalone inline icon (rail, standings, chips). */
export function StarIconArt({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="-60 -60 124 128" width={size} height={size} aria-hidden="true" style={{ flex: 'none', overflow: 'visible' }}>
      <StarArt size={100} face={size >= 40} />
    </svg>
  );
}
