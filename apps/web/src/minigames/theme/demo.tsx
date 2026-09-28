import { useEffect, useState, type ReactNode } from 'react';
import { AvatarFace } from '../../ui/Avatar.tsx';
import { INK, PAPER, rr } from './paper.tsx';

/**
 * How-to-play demos: each is a short looping animation drawn as a function of time, in a 600×360
 * box. `useDemoTime` drives it at about 30 fps; with reduced motion it holds on one telling frame.
 */

export const DEMO_W = 600;
export const DEMO_H = 360;

export function useDemoTime(loopS: number, stillAt: number): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (document.documentElement.dataset.motion === 'reduce') {
      setT(stillAt);
      return;
    }
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const step = (now: number) => {
      if (now - last > 30) {
        last = now;
        setT(((now - start) / 1000) % loopS);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loopS, stillAt]);
  return t;
}

/** Piecewise-linear keyframes: key([[0, 0], [1, 100], [2, 100]])(t). Eased between points. */
export function key(frames: [number, number][], t: number): number {
  if (t <= frames[0]![0]) return frames[0]![1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1] = frames[i]!;
    const [t0, v0] = frames[i - 1]!;
    if (t <= t1) {
      const f = (t - t0) / Math.max(0.0001, t1 - t0);
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
      return v0 + (v1 - v0) * e;
    }
  }
  return frames[frames.length - 1]![1];
}

export const between = (t: number, a: number, b: number) => t >= a && t < b;

/** Fade in over 0.25 s at `a`, out over 0.25 s at `b`. */
export const fade = (t: number, a: number, b: number) => key([[a - 0.01, 0], [a + 0.25, 1], [b - 0.25, 1], [b, 0]], t);

/** The demo's paper frame and caption. */
export function DemoFrame({ children, caption, bg = '#FFF8E6' }: { children: ReactNode; caption?: ReactNode; bg?: string }) {
  return (
    <figure className="mg-demo">
      <svg viewBox={`0 0 ${DEMO_W} ${DEMO_H}`} role="img" aria-label="How to play">
        <rect x={4} y={4} width={DEMO_W - 8} height={DEMO_H - 8} rx={24} fill={bg} stroke={INK} strokeWidth={5} />
        {children}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** A little phone held in the demo, showing its screen content. */
export function DemoPhone({ x, y, s = 1, children, tilt = 0 }: { x: number; y: number; s?: number; children?: ReactNode; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <path d={rr(-48, -86, 96, 172, 16)} fill={INK} transform="translate(4 5)" opacity={0.25} />
      <path d={rr(-48, -86, 96, 172, 16)} fill={PAPER} stroke={INK} strokeWidth={5} />
      <path d={rr(-38, -70, 76, 136, 6)} fill="#F4E9D3" stroke={INK} strokeWidth={2.5} />
      <g>{children}</g>
    </g>
  );
}

/** A tapping fingertip: presses in while `down`. */
export function Finger({ x, y, down, show = 1 }: { x: number; y: number; down: boolean; show?: number }) {
  return (
    <g transform={`translate(${x} ${y + (down ? 6 : 0)})`} opacity={show}>
      {down && <circle r={18} fill="none" stroke={INK} strokeWidth={3} opacity={0.35} />}
      <path d="M-10 4 Q-10 -6 0 -6 Q10 -6 10 4 V40 H-10 Z" fill="#FFD7B5" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <path d="M-6 0 Q0 -3 6 0" fill="none" stroke={INK} strokeWidth={2} opacity={0.4} />
    </g>
  );
}

/** A player sticker in the demo (the real avatar art on a white sticker disc). */
export function DemoAvatar({ x, y, a, s = 52 }: { x: number; y: number; a: number; s?: number }) {
  const k = s / 112;
  return (
    <g transform={`translate(${x - s / 2} ${y - s / 2}) scale(${k}) translate(6 6)`}>
      <circle cx={54} cy={56} r={53} fill={INK} />
      <circle cx={50} cy={50} r={53} fill={PAPER} stroke={INK} strokeWidth={3} />
      <AvatarFace avatar={a} />
    </g>
  );
}

/** A small speech/label bubble. */
export function Bubble({ x, y, text, fill = PAPER, size = 22, show = 1 }: { x: number; y: number; text: ReactNode; fill?: string; size?: number; show?: number }) {
  const w = String(text).length * size * 0.6 + 26;
  return (
    <g transform={`translate(${x} ${y})`} opacity={show}>
      <path d={rr(-w / 2, -size - 6, w, size + 20, (size + 20) / 2)} fill={fill} stroke={INK} strokeWidth={4} />
      <text y={4} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={size} fill={INK}>
        {text}
      </text>
    </g>
  );
}
