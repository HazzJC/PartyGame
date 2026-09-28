import { avatarColour, AvatarFace } from '../ui/Avatar.tsx';

const INK = '#2B2233';
const PAPER = '#FFFFFF';

/**
 * A board character as a paper standee: the animal's sticker head on a little tunic body with
 * feet, cut out with a white paper edge, standing on a soft shadow. Drawn with its feet at 0,0 and
 * about `size` wide. It idles with a gentle bob and flips to face the way it walks.
 */
export function PaperPawn({ avatar, size = 56, dim = false, facing = 1, walking = false, phase = 0 }: { avatar: number; size?: number; dim?: boolean; facing?: 1 | -1; walking?: boolean; phase?: number }) {
  const colour = avatarColour(avatar);
  const s = size / 80;
  return (
    <g transform={`scale(${s})`} opacity={dim ? 0.5 : 1}>
      <ellipse cy={2} rx={30} ry={8} fill={INK} opacity={0.22} />
      <g className={walking ? 'pawn-walk' : 'pawn-idle'} style={{ animationDelay: `${-phase}s` }}>
        <g className="pawn-flip" style={{ transform: `scaleX(${facing})` }}>
          {/* The cut-paper edge: the whole silhouette in ink, then white, under the colours. */}
          <g stroke={INK} strokeWidth={17} strokeLinejoin="round" fill={INK}>
            <path d="M-17 -6 Q-19 -34 -12 -46 H12 Q19 -34 17 -6 Z" />
            <circle cy={-78} r={34} />
          </g>
          <g stroke={PAPER} strokeWidth={10} strokeLinejoin="round" fill={PAPER}>
            <path d="M-17 -6 Q-19 -34 -12 -46 H12 Q19 -34 17 -6 Z" />
            <circle cy={-78} r={34} />
          </g>
          {/* Feet and arms. */}
          <ellipse cx={-9} cy={-4} rx={9} ry={5.5} fill={INK} />
          <ellipse cx={9} cy={-4} rx={9} ry={5.5} fill={INK} />
          <path d="M-15 -36 Q-26 -28 -22 -18" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d="M-15 -36 Q-26 -28 -22 -18" fill="none" stroke={colour} strokeWidth={5} strokeLinecap="round" />
          <path d="M15 -36 Q26 -30 24 -20" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d="M15 -36 Q26 -30 24 -20" fill="none" stroke={colour} strokeWidth={5} strokeLinecap="round" />
          {/* Tunic with a belly patch and a collar. */}
          <path d="M-17 -6 Q-19 -34 -12 -46 H12 Q19 -34 17 -6 Z" fill={colour} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
          <ellipse cy={-22} rx={9} ry={11} fill={PAPER} opacity={0.45} />
          <path d="M-11 -45 Q0 -38 11 -45" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          {/* The head: the animal sticker, its white disc doubling as the paper cut. */}
          <g transform="translate(0 -78) scale(0.6) translate(-50 -50)">
            <circle cx={50} cy={50} r={53} fill={PAPER} stroke={INK} strokeWidth={5} />
            <AvatarFace avatar={avatar} />
          </g>
        </g>
      </g>
    </g>
  );
}

/** A standee in its own SVG, for places outside the board (the podium). */
export function PaperPawnSvg({ avatar, size = 120, dim, className }: { avatar: number; size?: number; dim?: boolean; className?: string }) {
  return (
    <svg viewBox="-50 -122 100 132" width={size} height={size * 1.32} className={className} aria-hidden="true" style={{ overflow: 'visible', flex: 'none' }}>
      <PaperPawn avatar={avatar} size={80} dim={dim} />
    </svg>
  );
}
