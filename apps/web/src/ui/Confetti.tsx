import { useMemo } from 'react';
import { decorationOff } from './prefs.ts';
import './juice.css';

const COLOURS = ['#FF4D5E', '#FFB703', '#3DBE4B', '#3D7BFF', '#9B5DE5', '#FFD23F', '#1B998B'];

/** Flat sticker confetti (big pieces with ink edges, so it reads on a compressed stream). */
export function Confetti({ count = 70, seed = 1 }: { count?: number; seed?: number }) {
  const pieces = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: count }, (_, i) => ({
      left: rnd() * 100,
      delay: rnd() * 1.8,
      dur: 2.6 + rnd() * 2,
      drift: (rnd() - 0.5) * 30,
      spin: 360 + rnd() * 720,
      w: 14 + rnd() * 16,
      h: 10 + rnd() * 10,
      round: rnd() < 0.3,
      colour: COLOURS[i % COLOURS.length]!,
    }));
  }, [count, seed]);
  if (decorationOff()) return null;
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.h,
            borderRadius: p.round ? '50%' : 3,
            background: p.colour,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ['--drift' as string]: `${p.drift}vw`,
            ['--spin' as string]: `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

/** A burst of coins or stars flying up from a point (e.g. buying a star in the spotlight). */
export function Burst({ kind = 'star', count = 10, delayMs = 0 }: { kind?: 'star' | 'coin'; count?: number; delayMs?: number }) {
  if (decorationOff()) return null;
  return (
    <div className="burst" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <span
            key={i}
            className={`burst-${kind}`}
            style={{ ['--dx' as string]: `${Math.cos(a) * 160}px`, ['--dy' as string]: `${Math.sin(a) * 160 - 60}px`, animationDelay: `${delayMs + (i % 3) * 60}ms` }}
          />
        );
      })}
    </div>
  );
}
