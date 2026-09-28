export type ArrowDir = 'up' | 'down' | 'left' | 'right';

const ROTATE: Record<ArrowDir, number> = { up: 0, right: 90, down: 180, left: 270 };

/** A chunky sticker arrow (drawn, not a font glyph, so it's big and identical on every device). */
export function ArrowIcon({ dir, size = 32 }: { dir: ArrowDir; size?: number }) {
  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
      <path
        transform={`rotate(${ROTATE[dir]})`}
        d="M0 -16 L14 0 H6 V15 H-6 V0 H-14 Z"
        fill="currentColor"
        stroke="var(--ink, #2B2233)"
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Maps arrow glyphs used as labels (↑ ↓ ← →) to a drawn arrow direction. */
export function arrowFromGlyph(label: string): ArrowDir | null {
  return ({ '↑': 'up', '↓': 'down', '←': 'left', '→': 'right' } as Record<string, ArrowDir>)[label.trim()] ?? null;
}
