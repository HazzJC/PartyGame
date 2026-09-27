import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useThrottledEmit } from './Direction.tsx';
import { onPadAxes, useVirtualKeys } from './keys.ts';

const TAU = Math.PI * 2;
const norm = (a: number) => ((a % TAU) + TAU) % TAU;
const KEY_SPEED = TAU * 0.75; // radians per second while A/D is held

/**
 * Turn a ring to an angle (Meteor Shield arcs). Drag around the ring, point with the mouse,
 * hold A/D or ← →, or aim the gamepad stick. Emits radians (0 = right, clockwise), ≤ 20 Hz.
 */
export function Rotate({ angle, onChange, arc = Math.PI / 3, size = 260, children }: { angle: number; onChange: (a: number) => void; arc?: number; size?: number; children?: ReactNode }) {
  const [shown, setShown] = useState(angle);
  const current = useRef(angle);
  const emit = useThrottledEmit<number>(onChange, (a, b) => Math.abs(a - b) < 0.01, angle);
  const held = useRef({ left: false, right: false });
  const ring = useRef<SVGSVGElement>(null);

  const set = (a: number) => {
    const n = Math.round(norm(a) * 1000) / 1000;
    current.current = n;
    setShown(n);
    emit(n);
  };

  useVirtualKeys((e) => {
    if (e.key === 'left') held.current.left = e.down;
    if (e.key === 'right') held.current.right = e.down;
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      const dir = (held.current.right ? 1 : 0) - (held.current.left ? 1 : 0);
      if (dir) set(current.current + dir * KEY_SPEED * dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const off = onPadAxes((a) => {
      if (Math.hypot(a.x, a.y) > 0.5) set(Math.atan2(a.y, a.x));
    });
    return () => {
      cancelAnimationFrame(raf);
      off();
    };
  }, []);

  const fromPointer = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.type === 'pointermove' && e.pointerType !== 'mouse' && e.buttons === 0) return;
    const r = ring.current!.getBoundingClientRect();
    set(Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2));
  };

  const R = 42;
  const a0 = shown - arc / 2;
  const a1 = shown + arc / 2;
  const p = (a: number, r = R) => `${50 + Math.cos(a) * r} ${50 + Math.sin(a) * r}`;
  return (
    <svg
      ref={ring}
      className="rotate-ring"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        fromPointer(e);
      }}
      onPointerMove={fromPointer}
      role="slider"
      aria-label="Direction"
      aria-valuenow={Math.round((shown * 180) / Math.PI)}
    >
      <circle cx="50" cy="50" r={R} fill="none" stroke="#E8D9BC" strokeWidth="10" />
      <path d={`M${p(a0)} A${R} ${R} 0 ${arc > Math.PI ? 1 : 0} 1 ${p(a1)}`} fill="none" stroke="#3D7BFF" strokeWidth="11" strokeLinecap="round" />
      <path d={`M${p(a0)} A${R} ${R} 0 ${arc > Math.PI ? 1 : 0} 1 ${p(a1)}`} fill="none" stroke="#2B2233" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {children}
    </svg>
  );
}
