import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useDevice, wantsOnScreenControls } from './device.ts';
import { onPadAxes, useVirtualKeys } from './keys.ts';

export interface Vec {
  x: number;
  y: number;
}

const ZERO: Vec = { x: 0, y: 0 };
const EMIT_EVERY_MS = 50; // 20 Hz cap keeps the free-tier message budget safe.

function quantise(v: Vec, mode: '4' | '8' | 'analog'): Vec {
  const len = Math.hypot(v.x, v.y);
  if (len < 0.25) return ZERO;
  if (mode === 'analog') {
    const k = Math.min(1, len);
    return { x: Math.round((v.x / len) * k * 100) / 100, y: Math.round((v.y / len) * k * 100) / 100 };
  }
  const angle = Math.atan2(v.y, v.x);
  const sectors = mode === '4' ? 4 : 8;
  const step = (Math.PI * 2) / sectors;
  const a = Math.round(angle / step) * step;
  const r = (n: number) => (Math.abs(n) < 0.01 ? 0 : Math.round(n * 100) / 100);
  return { x: r(Math.cos(a)), y: r(Math.sin(a)) };
}

/** Throttled change-only emitter for continuous inputs. */
export function useThrottledEmit<T>(emit: (v: T) => void, same: (a: T, b: T) => boolean, initial: T) {
  const last = useRef<T>(initial);
  const pending = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAt = useRef(0);
  const emitRef = useRef(emit);
  emitRef.current = emit;
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (v: T) => {
    if (same(v, last.current) && pending.current === null) return;
    const now = performance.now();
    const flush = () => {
      timer.current = null;
      const p = pending.current;
      pending.current = null;
      if (p === null || same(p, last.current)) return;
      last.current = p;
      lastAt.current = performance.now();
      emitRef.current(p);
    };
    pending.current = v;
    if (now - lastAt.current >= EMIT_EVERY_MS) flush();
    else if (!timer.current) timer.current = setTimeout(flush, EMIT_EVERY_MS - (now - lastAt.current));
  };
}

const sameVec = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;

/**
 * Direction input: WASD/arrows, gamepad stick, and on touch devices an on-screen d-pad (4/8-way)
 * or floating joystick (analog). Emits a unit-ish vector only when it changes, at most 20 Hz.
 */
export function Direction({ mode, onChange, size = 180 }: { mode: '4' | '8' | 'analog'; onChange: (v: Vec) => void; size?: number }) {
  const device = useDevice();
  const onScreen = wantsOnScreenControls(device);
  const emit = useThrottledEmit(onChange, sameVec, ZERO);
  const keys = useRef(new Set<string>());
  const touchVec = useRef<Vec>(ZERO);
  const padVec = useRef<Vec>(ZERO);
  const [shown, setShown] = useState<Vec>(ZERO);

  const recompute = () => {
    const k = keys.current;
    const kv = { x: (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0), y: (k.has('down') ? 1 : 0) - (k.has('up') ? 1 : 0) };
    const src = touchVec.current !== ZERO && (touchVec.current.x || touchVec.current.y) ? touchVec.current : padVec.current.x || padVec.current.y ? padVec.current : kv;
    const v = quantise(src, mode);
    setShown(v);
    emit(v);
  };

  useVirtualKeys((e) => {
    if (!['up', 'down', 'left', 'right'].includes(e.key)) return;
    if (e.down) keys.current.add(e.key);
    else keys.current.delete(e.key);
    recompute();
  });

  useEffect(
    () =>
      onPadAxes((a) => {
        padVec.current = a;
        recompute();
      }),
    [mode],
  );

  // Releasing everything when the window loses focus avoids a stuck direction.
  useEffect(() => {
    const clear = () => {
      keys.current.clear();
      touchVec.current = ZERO;
      recompute();
    };
    window.addEventListener('blur', clear);
    return () => window.removeEventListener('blur', clear);
  }, []);

  const pad = useRef<HTMLDivElement>(null);
  const onPointer = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerup' || e.type === 'pointercancel') {
      touchVec.current = ZERO;
      recompute();
      return;
    }
    if (e.type === 'pointerdown') (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (e.type === 'pointermove' && e.buttons === 0 && e.pointerType === 'mouse') return;
    const rect = pad.current!.getBoundingClientRect();
    const r = rect.width / 2;
    touchVec.current = { x: (e.clientX - rect.left - r) / (r * 0.6), y: (e.clientY - rect.top - r) / (r * 0.6) };
    recompute();
  };

  if (!onScreen) return null;
  const knob = { x: shown.x * size * 0.28, y: shown.y * size * 0.28 };
  return (
    <div
      ref={pad}
      className={`dpad ${mode === 'analog' ? 'stick' : ''}`}
      style={{ width: size, height: size }}
      onPointerDown={onPointer}
      onPointerMove={onPointer}
      onPointerUp={onPointer}
      onPointerCancel={onPointer}
      role="group"
      aria-label="Direction pad"
    >
      {mode === 'analog' ? (
        <div className="stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      ) : (
        <>
          {(['up', 'right', 'down', 'left'] as const).map((d) => {
            const active = (d === 'up' && shown.y < 0) || (d === 'down' && shown.y > 0) || (d === 'left' && shown.x < 0) || (d === 'right' && shown.x > 0);
            return <span key={d} className={`dpad-arm ${d}`} data-active={active} />;
          })}
          <span className="dpad-hub" />
        </>
      )}
    </div>
  );
}
