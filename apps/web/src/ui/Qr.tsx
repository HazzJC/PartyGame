import QRCode from 'qrcode';
import { useMemo } from 'react';

const INK = '#2B2233';
/** Corner "eyes" in game colours, kept dark enough to read as black to a scanner. */
const EYES = ['#C81E3A', '#1D5FD0', '#12806F'];

/**
 * A sticker-style QR code: round dots, rounded finder squares, a star badge in the middle and a
 * white sticker frame. High error correction keeps it scannable with the badge covering the centre.
 */
export function Qr({ text, size = 240, label = 'QR code' }: { text: string; size?: number; label?: string }) {
  const art = useMemo(() => {
    try {
      const { modules } = QRCode.create(text, { errorCorrectionLevel: 'H' });
      return { n: modules.size, dark: (r: number, c: number) => !!modules.get(r, c) };
    } catch {
      return null;
    }
  }, [text]);
  if (!art) return <div className="qr" style={{ width: size, height: size }} />;

  const { n, dark } = art;
  // A 4-module quiet zone inside the sticker frame (scanners need it).
  const margin = 4;
  const total = n + margin * 2;
  // Finder patterns (the three big corner squares) are drawn separately as rounded shapes.
  const finders = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ] as const;
  const inFinder = (r: number, c: number) => finders.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
  // Clear a square in the middle for the badge (about 18% of the width, an odd number of modules).
  let hole = Math.floor(n * 0.18);
  if (hole % 2 === 0) hole++;
  const h0 = (n - hole) / 2;
  const inHole = (r: number, c: number) => r >= h0 && r < h0 + hole && c >= h0 && c < h0 + hole;

  const dots: string[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!dark(r, c) || inFinder(r, c) || inHole(r, c)) continue;
      const x = c + margin + 0.5;
      const y = r + margin + 0.5;
      // Touching rounded squares (so a blurry stream still reads like a plain code), as one path.
      const h = 0.5;
      const k = 0.16;
      dots.push(`M${x - h + k} ${y - h}h${2 * (h - k)}q${k} 0 ${k} ${k}v${2 * (h - k)}q0 ${k} ${-k} ${k}h${-2 * (h - k)}q${-k} 0 ${-k} ${-k}v${-2 * (h - k)}q0 ${-k} ${k} ${-k}z`);
    }
  const mid = total / 2;
  const badge = hole / 2 - 0.2;
  const star = (cx: number, cy: number, R: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? R * 0.45 : R;
      pts.push(`${(cx + Math.cos(a) * rad).toFixed(3)},${(cy + Math.sin(a) * rad).toFixed(3)}`);
    }
    return pts.join(' ');
  };

  return (
    <div className="qr" style={{ width: size, height: size }}>
      <svg viewBox={`-0.6 -0.6 ${total + 1.2} ${total + 1.2}`} width="100%" height="100%" role="img" aria-label={label} shapeRendering="geometricPrecision">
        <rect x={-0.3} y={-0.3} width={total + 0.6} height={total + 0.6} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={0.6} />
        <path d={dots.join('')} fill={INK} />
        {finders.map(([fr, fc], i) => {
          const x = fc + margin;
          const y = fr + margin;
          return (
            <g key={`${fr}-${fc}`}>
              {/* Only gently rounded: scanners find codes by these squares' proportions. */}
              <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={0.5} fill="none" stroke={INK} strokeWidth={1} />
              <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.3} fill={EYES[i]} />
            </g>
          );
        })}
        <circle cx={mid} cy={mid} r={badge} fill="#FFFFFF" stroke={INK} strokeWidth={0.45} />
        <polygon points={star(mid, mid + 0.15, badge * 0.72)} fill="#FFD23F" stroke={INK} strokeWidth={0.4} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
