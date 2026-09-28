import './logo.css';

/** The game's name, in one place so branding changes are a one-line edit. */
export const GAME_NAME = 'Sticker Party';

/**
 * Wordmark: chunky display letters with a white sticker border and a hard ink shadow, the
 * same language as everything else on the table. Drawn as SVG so it stays crisp on a stream.
 */
export function Logo({ height = 120, className }: { height?: number; className?: string }) {
  // Always gently alive: the words bob out of step, the star twinkles, hovering gives a bounce.
  const colours = ['#FF4D5E', '#FFB703', '#3DBE4B', '#3D7BFF', '#9B5DE5', '#FF7A1A', '#1B998B'];
  const top = 'Sticker';
  const bottom = 'Party';
  return (
    <svg className={`logo ${className ?? ''}`} viewBox="0 0 620 300" height={height} role="img" aria-label={GAME_NAME} style={{ overflow: 'visible' }}>
      <g transform="rotate(-4 310 150)">
        <g className="logo-float">
        {/* Sticker backing: the words drawn fat in white with an ink edge and a hard offset shadow. */}
        {[top, bottom].map((word, row) => (
          <g key={word} className="logo-word" style={{ animationDelay: `${-row * 1.1}s` }} fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={row ? 150 : 118} textAnchor="middle">
            <text x={318} y={row ? 272 : 128} fill="#2B2233" stroke="#2B2233" strokeWidth={34} strokeLinejoin="round">
              {word}
            </text>
            <text x={310} y={row ? 264 : 120} fill="#FFFFFF" stroke="#2B2233" strokeWidth={34} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
              {word}
            </text>
            <text x={310} y={row ? 264 : 120} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={22} strokeLinejoin="round">
              {word}
            </text>
            <text x={310} y={row ? 264 : 120} stroke="#2B2233" strokeWidth={5} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
              {word.split('').map((ch, i) => (
                <tspan key={i} fill={colours[(i + row * 3) % colours.length]}>
                  {ch}
                </tspan>
              ))}
            </text>
          </g>
        ))}
        <g className="logo-star">
          <path d="M560 30 L572 62 L606 62 L578 82 L589 116 L560 95 L531 116 L542 82 L514 62 L548 62 Z" fill="#FFD23F" stroke="#2B2233" strokeWidth={7} strokeLinejoin="round" transform="rotate(12 560 72)" />
        </g>
        </g>
      </g>
    </svg>
  );
}
