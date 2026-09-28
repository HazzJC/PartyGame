import type { ANIMALS } from '@partygame/shared';
import type { ReactNode } from 'react';

/**
 * The sixteen animal faces, drawn in a 100×100 box in the player's colour. Matte paper, like the
 * rest of the art: each head casts a hard ink shadow down and right (the logo's depth) and has a
 * flat cel-shade on its lower right (clipped to the head, so it never spills past the ink line),
 * plus blush and shaded ears. Shape and markings carry identity, not colour.
 */

export const INK = '#2B2233';
const W = '#FFFFFF';
const PINK = '#FF9EB5';
const S = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

// ------------------------------------------------------------------ colour helpers

function mix(hex: string, to: string, t: number): string {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
  return `#${a.map((v, i) => Math.round(v + (b[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Tones of one colour: the flat shadow side, and a lighter highlight. */
export function tones(c: string) {
  return { base: c, shade: mix(c, INK, 0.26), light: mix(c, W, 0.42) };
}
type Tones = ReturnType<typeof tones>;

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;

// ------------------------------------------------------------------ shared features

/** Ink eyes with one small catch-light (a matte cartoon eye, not a glossy one). */
export function Eyes({ y = 50, dx = 11, r = 5, x = 50 }: { y?: number; dx?: number; r?: number; x?: number }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <g key={side}>
          <circle cx={x + side * dx} cy={y} r={r} fill={INK} />
          <circle cx={x + side * dx + r * 0.3} cy={y - r * 0.32} r={r * 0.3} fill={W} />
        </g>
      ))}
    </>
  );
}

function Smile({ y = 66, w = 7 }: { y?: number; w?: number }) {
  return <path d={`M${50 - w} ${y} Q50 ${y + 6} ${50 + w} ${y}`} fill="none" {...S} strokeWidth={3.5} />;
}

function Blush({ y, dx, rx = 5.5 }: { y: number; dx: number; rx?: number }) {
  return (
    <>
      <ellipse cx={50 - dx} cy={y} rx={rx} ry={rx * 0.6} fill={PINK} opacity={0.6} />
      <ellipse cx={50 + dx} cy={y} rx={rx} ry={rx * 0.6} fill={PINK} opacity={0.6} />
    </>
  );
}

/** A shaded round part (ear, cheek) drawn with an outline: base colour, shadow lower right, rim. */
function Ball({ cx, cy, r, t, inner, innerR }: { cx: number; cy: number; r: number; t: Tones; inner?: string; innerR?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={t.shade} {...S} />
      <circle cx={cx - r * 0.12} cy={cy - r * 0.14} r={r * 0.82} fill={t.base} />
      {inner && <circle cx={cx} cy={cy} r={innerR ?? r * 0.5} fill={inner} />}
    </>
  );
}

// ------------------------------------------------------------------ faces

interface Face {
  /** The head silhouette, used for the shading clip and the outline. */
  head: string;
  /** Head fill if not the player's colour (e.g. the panda is white-faced). */
  fill?: (t: Tones) => Tones;
  /** Parts drawn behind the head (ears, mane, tufts). */
  back?: (t: Tones) => ReactNode;
  /** Features drawn on top of the head. */
  front: (t: Tones) => ReactNode;
}

const WHITE = tones('#FFFFFF');
const whiteFace = () => ({ ...WHITE, shade: '#DAD3E3' });

export const FACES: Record<(typeof ANIMALS)[number], Face> = {
  fox: {
    head: 'M14 46 Q50 12 86 46 Q84 72 50 88 Q16 72 14 46 Z',
    back: (t) => (
      <>
        <path d="M18 44 L26 10 L48 30 Z" fill={t.base} {...S} />
        <path d="M82 44 L74 10 L52 30 Z" fill={t.shade} {...S} />
        <path d="M25 19 L29 33 L39 28 Z" fill={INK} />
        <path d="M75 19 L71 33 L61 28 Z" fill={INK} />
      </>
    ),
    front: () => (
      <>
        {/* White cheek fur with a few tufts. */}
        <path d="M20 56 Q36 62 50 88 Q64 62 80 56 L76 62 L80 64 Q70 80 50 88 Q30 80 20 64 L24 62 Z" fill={W} {...S} strokeWidth={3} />
        <Eyes y={49} dx={14} />
        <ellipse cx="50" cy="71" rx="6.5" ry="4.8" fill={INK} />
        <Blush y={60} dx={25} />
      </>
    ),
  },
  panda: {
    head: circle(50, 54, 36),
    fill: whiteFace,
    back: (t) => (
      <>
        <Ball cx={24} cy={26} r={12} t={t} />
        <Ball cx={76} cy={26} r={12} t={t} />
      </>
    ),
    front: (t) => (
      <>
        <ellipse cx="36" cy="50" rx="10" ry="13" fill={t.base} transform="rotate(-25 36 50)" />
        <ellipse cx="64" cy="50" rx="10" ry="13" fill={t.base} transform="rotate(25 64 50)" />
        <circle cx="37" cy="49" r="5" fill={W} />
        <circle cx="63" cy="49" r="5" fill={W} />
        <circle cx="38" cy="49.5" r="3" fill={INK} />
        <circle cx="62" cy="49.5" r="3" fill={INK} />
        <circle cx="39" cy="48" r="1.2" fill={W} />
        <circle cx="63" cy="48" r="1.2" fill={W} />
        <ellipse cx="50" cy="65" rx="6.5" ry="4.5" fill={INK} />
        <Smile y={72} w={6} />
        <Blush y={66} dx={22} />
      </>
    ),
  },
  frog: {
    head: ellipse(50, 60, 40, 28),
    back: (t) => (
      <>
        <Ball cx={30} cy={30} r={14} t={t} />
        <Ball cx={70} cy={30} r={14} t={t} />
      </>
    ),
    front: () => (
      <>
        <circle cx="30" cy="30" r="9" fill={W} {...S} strokeWidth={2.5} />
        <circle cx="70" cy="30" r="9" fill={W} {...S} strokeWidth={2.5} />
        <Eyes y={31} dx={20} r={4.6} />
        <path d="M26 64 Q50 84 74 64" fill="none" {...S} />
        <circle cx="44" cy="52" r="2" fill={INK} />
        <circle cx="56" cy="52" r="2" fill={INK} />
        <Blush y={66} dx={30} rx={6} />
      </>
    ),
  },
  octopus: {
    head: 'M16 70 Q14 18 50 14 Q86 18 84 70 Q78 88 70 76 Q64 90 56 78 Q50 90 44 78 Q36 90 30 76 Q22 88 16 70 Z',
    front: (t) => (
      <>
        <circle cx="66" cy="28" r="4" fill={t.shade} />
        <circle cx="74" cy="38" r="2.6" fill={t.shade} />
        <circle cx="26" cy="40" r="3" fill={t.shade} />
        <Eyes y={48} dx={13} r={6} />
        <ellipse cx="50" cy="62" rx="5" ry="4" fill={INK} />
        <Blush y={58} dx={24} />
      </>
    ),
  },
  cat: {
    head: ellipse(50, 56, 36, 32),
    back: (t) => (
      <>
        <path d="M16 50 L20 10 L46 28 Z" fill={t.base} {...S} />
        <path d="M84 50 L80 10 L54 28 Z" fill={t.shade} {...S} />
        <path d="M22 19 L24 34 L35 28 Z" fill={PINK} />
        <path d="M78 19 L76 34 L65 28 Z" fill={PINK} />
      </>
    ),
    front: () => (
      <>
        <Eyes y={52} dx={13} r={5.2} />
        <path d="M46 62 L54 62 L50 67 Z" fill={PINK} {...S} strokeWidth={2.5} />
        <path d="M50 67 Q44 74 40 70 M50 67 Q56 74 60 70" fill="none" {...S} strokeWidth={3} />
        <path d="M8 58 L28 62 M8 68 L28 66 M92 58 L72 62 M92 68 L72 66" {...S} strokeWidth={2.5} />
        <Blush y={63} dx={24} />
      </>
    ),
  },
  dog: {
    head: circle(50, 50, 34),
    front: () => (
      <>
        {/* Floppy ears hang over the head. */}
        <path d="M20 26 Q4 34 10 62 Q20 66 26 50 Z" fill="#6B3E26" {...S} />
        <path d="M80 26 Q96 34 90 62 Q80 66 74 50 Z" fill="#4E2C1B" {...S} />
        <path d="M14 38 Q12 48 16 56" fill="none" stroke="#8C5A3C" strokeWidth={3} strokeLinecap="round" />
        <ellipse cx="50" cy="66" rx="18" ry="14" fill={W} {...S} strokeWidth={3} />
        <Eyes y={46} dx={13} />
        <ellipse cx="50" cy="60" rx="7.5" ry="5.2" fill={INK} />
        <path d="M50 65 L50 72 M42 72 Q50 78 58 72" fill="none" {...S} strokeWidth={3} />
        <path d="M50 76 Q50 85 56 82" fill={PINK} {...S} strokeWidth={2.5} />
      </>
    ),
  },
  bear: {
    head: circle(50, 54, 36),
    back: (t) => (
      <>
        <Ball cx={22} cy={24} r={13} t={t} inner="#E8B98A" innerR={6} />
        <Ball cx={78} cy={24} r={13} t={t} inner="#D9A574" innerR={6} />
      </>
    ),
    front: () => (
      <>
        <ellipse cx="50" cy="66" rx="16" ry="12" fill="#E8B98A" {...S} strokeWidth={3} />
        <Eyes y={48} dx={14} />
        <ellipse cx="50" cy="61" rx="6.5" ry="4.8" fill={INK} />
        <path d="M50 65 L50 70 M44 72 Q50 76 56 72" fill="none" {...S} strokeWidth={3} />
        <Blush y={62} dx={25} />
      </>
    ),
  },
  rabbit: {
    head: ellipse(50, 62, 32, 28),
    back: (t) => (
      <>
        <ellipse cx="36" cy="22" rx="9" ry="22" fill={t.base} {...S} transform="rotate(-8 36 22)" />
        <ellipse cx="64" cy="22" rx="9" ry="22" fill={t.shade} {...S} transform="rotate(8 64 22)" />
        <ellipse cx="36" cy="22" rx="4" ry="15" fill={PINK} transform="rotate(-8 36 22)" />
        <ellipse cx="64" cy="22" rx="4" ry="15" fill={PINK} transform="rotate(8 64 22)" />
      </>
    ),
    front: () => (
      <>
        <Eyes y={58} dx={12} />
        <path d="M46 67 L54 67 L50 71 Z" fill={PINK} {...S} strokeWidth={2.5} />
        <path d="M50 71 L50 76 M45 80 L45 84 L55 84 L55 80" fill={W} {...S} strokeWidth={2.5} />
        <Blush y={70} dx={20} />
      </>
    ),
  },
  pig: {
    head: circle(50, 54, 36),
    back: (t) => (
      <>
        <path d="M18 34 L22 10 L42 24 Z" fill={t.base} {...S} />
        <path d="M82 34 L78 10 L58 24 Z" fill={t.shade} {...S} />
      </>
    ),
    front: () => (
      <>
        <Eyes y={44} dx={15} />
        <ellipse cx="50" cy="64" rx="16" ry="11" fill="#FFC2CE" {...S} />
        <ellipse cx="44" cy="65" rx="3" ry="4.5" fill={INK} />
        <ellipse cx="56" cy="65" rx="3" ry="4.5" fill={INK} />
        <Blush y={58} dx={27} />
      </>
    ),
  },
  owl: {
    head: 'M14 52 Q14 16 50 16 Q86 16 86 52 Q86 88 50 88 Q14 88 14 52 Z',
    back: (t) => (
      <>
        <path d="M18 30 L24 6 L40 24 Z" fill={t.base} {...S} />
        <path d="M82 30 L76 6 L60 24 Z" fill={t.shade} {...S} />
      </>
    ),
    front: (t) => (
      <>
        {/* Feathered chest marks. */}
        <path d="M36 78 Q40 74 44 78 M56 78 Q60 74 64 78 M46 84 Q50 80 54 84" fill="none" stroke={t.shade} strokeWidth={3} strokeLinecap="round" />
        <circle cx="34" cy="46" r="15" fill={W} {...S} />
        <circle cx="66" cy="46" r="15" fill={W} {...S} />
        <circle cx="34" cy="46" r="10" fill={t.light} />
        <circle cx="66" cy="46" r="10" fill={t.light} />
        <Eyes y={47} dx={15} r={6.5} />
        <path d="M44 60 L56 60 L50 72 Z" fill="#FFB703" {...S} strokeWidth={3} />
      </>
    ),
  },
  penguin: {
    head: circle(50, 52, 38),
    front: () => (
      <>
        <path d="M50 30 Q70 26 76 46 Q80 74 50 84 Q20 74 24 46 Q30 26 50 30 Z" fill={W} {...S} strokeWidth={3} />
        <Eyes y={48} dx={11} />
        <path d="M42 58 L58 58 L50 68 Z" fill="#FFB703" {...S} strokeWidth={3} />
        <Blush y={64} dx={18} />
      </>
    ),
  },
  lion: {
    head: circle(50, 52, 30),
    back: () => (
      <>
        <path
          d="M50 4 L60 14 L74 8 L78 22 L92 24 L88 38 L98 50 L88 62 L92 76 L78 78 L74 92 L60 86 L50 96 L40 86 L26 92 L22 78 L8 76 L12 62 L2 50 L12 38 L8 24 L22 22 L26 8 L40 14 Z"
          fill="#B5541E"
          {...S}
        />
        {/* A lighter inner mane ring for depth. */}
        <path d="M50 16 L58 22 L68 18 L72 28 L82 32 L80 42 L86 52 L78 60 L80 70 L70 72 L66 82 L56 78 L50 86 L44 78 L34 82 L30 72 L20 70 L22 60 L14 52 L20 42 L18 32 L28 28 L32 18 L42 22 Z" fill="#D8742F" />
      </>
    ),
    front: () => (
      <>
        <Eyes y={46} dx={11} />
        <path d="M44 58 L56 58 L50 64 Z" fill={INK} />
        <path d="M50 64 Q44 72 38 68 M50 64 Q56 72 62 68" fill="none" {...S} strokeWidth={3} />
        <Blush y={58} dx={19} rx={4.5} />
      </>
    ),
  },
  mouse: {
    head: 'M22 56 Q30 30 50 30 Q70 30 78 56 Q74 80 50 90 Q26 80 22 56 Z',
    back: (t) => (
      <>
        <Ball cx={22} cy={32} r={18} t={t} inner={PINK} innerR={10} />
        <Ball cx={78} cy={32} r={18} t={t} inner={PINK} innerR={10} />
      </>
    ),
    front: () => (
      <>
        <Eyes y={56} dx={11} />
        <circle cx="50" cy="74" r="5" fill={PINK} {...S} strokeWidth={2.5} />
        <path d="M14 70 L36 74 M14 80 L36 78 M86 70 L64 74 M86 80 L64 78" {...S} strokeWidth={2.5} />
        <Blush y={68} dx={17} rx={4.5} />
      </>
    ),
  },
  koala: {
    head: ellipse(50, 56, 32, 30),
    back: (t) => (
      <>
        <Ball cx={18} cy={38} r={17} t={t} inner={W} innerR={9} />
        <Ball cx={82} cy={38} r={17} t={t} inner={W} innerR={9} />
      </>
    ),
    front: () => (
      <>
        <Eyes y={50} dx={14} r={4.5} />
        <ellipse cx="50" cy="64" rx="9" ry="12" fill={INK} />
        <Blush y={64} dx={21} />
      </>
    ),
  },
  chick: {
    head: circle(50, 54, 36),
    back: () => <path d="M46 20 Q44 8 52 6 M50 20 Q54 8 62 10" fill="none" {...S} strokeWidth={3.5} />,
    front: () => (
      <>
        <Eyes y={48} dx={13} />
        <path d="M40 58 L60 58 L50 70 Z" fill="#FF7A1A" {...S} strokeWidth={3} />
        <path d="M40 58 L60 58" {...S} strokeWidth={3} />
        <Blush y={62} dx={22} rx={6} />
      </>
    ),
  },
  tiger: {
    head: ellipse(50, 54, 37, 34),
    back: (t) => (
      <>
        <Ball cx={22} cy={26} r={12} t={t} inner={INK} innerR={5} />
        <Ball cx={78} cy={26} r={12} t={t} inner={INK} innerR={5} />
      </>
    ),
    front: () => (
      <>
        <path d="M50 20 L50 32 M40 22 L42 32 M60 22 L58 32" {...S} strokeWidth={4} />
        <path d="M13 46 L26 50 M14 58 L26 58 M87 46 L74 50 M86 58 L74 58" {...S} strokeWidth={4} />
        <ellipse cx="50" cy="68" rx="17" ry="12" fill={W} {...S} strokeWidth={3} />
        <Eyes y={48} dx={13} />
        <path d="M44 62 L56 62 L50 68 Z" fill={INK} />
        <path d="M50 68 L50 72 M44 74 Q50 78 56 74" fill="none" {...S} strokeWidth={3} />
      </>
    ),
  },
};

/**
 * Draws one animal face. `uid` makes the head's clip path unique on the page (many avatars can be
 * on screen at once).
 */
export function AnimalFace({ animal, colour, uid }: { animal: (typeof ANIMALS)[number]; colour: string; uid: string }) {
  const f = FACES[animal];
  const t = tones(colour);
  const head = f.fill ? f.fill(t) : t;
  const clip = `head-${uid}`;
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={f.head} />
        </clipPath>
      </defs>
      {/* Depth: the head casts a hard ink shadow down and right onto its sticker, like the logo. */}
      <path d={f.head} fill={INK} opacity={0.3} transform="translate(3 4)" />
      {f.back?.(t)}
      <g clipPath={`url(#${clip})`}>
        {/* Shadow side first, then the lit face shifted up-left, leaving a flat crescent of shade. */}
        <path d={f.head} fill={head.shade} />
        <path d={f.head} fill={head.base} transform="translate(-4 -5)" />
      </g>
      <path d={f.head} fill="none" {...S} />
      {f.front(t)}
    </>
  );
}
