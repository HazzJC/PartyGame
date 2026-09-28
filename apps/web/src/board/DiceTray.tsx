import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound.ts';
import { KeyHint, useVirtualKeys } from '../input/index.ts';
import { motionReduced } from '../ui/prefs.ts';
import './dice.css';

const DIE_PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

export function Die({ value, size = 120, decorative = false }: { value: number; size?: number; decorative?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={decorative ? undefined : `Rolled ${value}`} aria-hidden={decorative || undefined}>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#FFFFFF" stroke="#2B2233" strokeWidth="6" />
      {(DIE_PIPS[value] ?? []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill="#2B2233" />
      ))}
    </svg>
  );
}

const DIE = 84;
/** Velocity kept per wall bounce, and how quickly the felt slows the die down (per second). */
const BOUNCE = 0.62;
const FRICTION = 1.9;
const SPIN_FRICTION = 2.4;

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
}

type Stage = 'ready' | 'held' | 'rolling' | 'landed';

/**
 * Throw the die: flick it across the tray (it tumbles with real bounces and friction) or press
 * Roll / Space for a throw. The number itself comes from the server (sent the moment you let go),
 * and the die settles on it once it has slowed down, with a clack on every bounce and a chime on
 * landing. With animation off, it just shows the result.
 */
export function DiceTray({ value, onThrow, keyHint, onLanded }: { value: number | null; onThrow: () => void; keyHint: boolean; onLanded?: () => void }) {
  const tray = useRef<HTMLDivElement>(null);
  const dieEl = useRef<HTMLDivElement>(null);
  const squash = useRef<HTMLDivElement>(null);
  const body = useRef<Body>({ x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0 });
  const valueRef = useRef(value);
  valueRef.current = value;
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;
  const thrown = useRef(false);
  const [stage, setStage] = useState<Stage>(value === null ? 'ready' : 'landed');
  const [face, setFace] = useState(value ?? 5);
  const drag = useRef<{ id: number; samples: { x: number; y: number; t: number }[] } | null>(null);
  const raf = useRef(0);

  const size = () => {
    const r = tray.current?.getBoundingClientRect();
    return { w: r?.width ?? 300, h: r?.height ?? 160 };
  };
  const place = () => {
    const b = body.current;
    if (dieEl.current) dieEl.current.style.transform = `translate(${b.x - DIE / 2}px, ${b.y - DIE / 2}px) rotate(${b.a}deg)`;
  };

  // Rest in the middle of the tray to begin with.
  useEffect(() => {
    const { w, h } = size();
    body.current = { x: w / 2, y: h / 2, vx: 0, vy: 0, a: -8, va: 0 };
    place();
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const land = () => {
    const b = body.current;
    b.vx = b.vy = b.va = 0;
    // Settle square to the tray.
    b.a = Math.round(b.a / 90) * 90;
    place();
    setFace(valueRef.current!);
    setStage('landed');
    onLandedRef.current?.();
    sound.play('diceLand');
    navigator.vibrate?.(25);
    squash.current?.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
  };

  const run = () => {
    cancelAnimationFrame(raf.current);
    setStage('rolling');
    if (motionReduced()) {
      // No tumbling: land as soon as the number is known.
      const wait = () => (valueRef.current !== null ? land() : (raf.current = requestAnimationFrame(wait)));
      wait();
      return;
    }
    let last = performance.now();
    const started = last;
    let travelled = 0;
    let lastHit = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const b = body.current;
      const { w, h } = size();
      const r = DIE / 2;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      let hit = 0;
      if (b.x < r) (b.x = r), (hit = Math.abs(b.vx)), (b.vx = Math.abs(b.vx) * BOUNCE), (b.va *= -0.7);
      if (b.x > w - r) (b.x = w - r), (hit = Math.abs(b.vx)), (b.vx = -Math.abs(b.vx) * BOUNCE), (b.va *= -0.7);
      if (b.y < r) (b.y = r), (hit = Math.max(hit, Math.abs(b.vy))), (b.vy = Math.abs(b.vy) * BOUNCE), (b.va *= -0.7);
      if (b.y > h - r) (b.y = h - r), (hit = Math.max(hit, Math.abs(b.vy))), (b.vy = -Math.abs(b.vy) * BOUNCE), (b.va *= -0.7);
      if (hit > 120 && now - lastHit > 60) {
        lastHit = now;
        sound.play('diceHit', Math.min(1.2, hit / 1400));
        navigator.vibrate?.(8);
        squash.current?.animate([{ transform: 'scale(0.86, 1.12)' }, { transform: 'scale(1)' }], { duration: 140, easing: 'ease-out' });
      }
      const k = Math.exp(-FRICTION * dt);
      b.vx *= k;
      b.vy *= k;
      b.va *= Math.exp(-SPIN_FRICTION * dt);
      const speed = Math.hypot(b.vx, b.vy);
      // Tumbling: the face changes as the die rolls along.
      travelled += speed * dt;
      if (travelled > 46) {
        travelled = 0;
        setFace((f) => 1 + ((f + Math.floor(Math.random() * 5)) % 6));
      }
      place();
      if (speed < 40 && now - started > 700) {
        if (valueRef.current !== null) return land();
        // Still waiting on the server's number: give it another little nudge.
        b.vx = (Math.random() - 0.5) * 500;
        b.vy = (Math.random() - 0.5) * 500;
        b.va = (Math.random() - 0.5) * 600;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const throwIt = (vx?: number, vy?: number) => {
    if (thrown.current) return;
    thrown.current = true;
    onThrow();
    sound.unlock();
    const b = body.current;
    const { w, h } = size();
    if (vx === undefined || vy === undefined) {
      // A button throw: launched from the bottom, off at an angle.
      b.x = w * (0.3 + Math.random() * 0.4);
      b.y = h - DIE / 2;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = 1500 + Math.random() * 700;
      vx = Math.cos(ang) * sp;
      vy = Math.sin(ang) * sp;
    }
    b.vx = vx;
    b.vy = vy;
    b.va = (Math.random() < 0.5 ? -1 : 1) * (700 + Math.random() * 900);
    run();
  };

  // A teammate rolled for us (or the timer ran out): watch our die go anyway.
  useEffect(() => {
    if (value !== null && stage === 'ready' && !thrown.current) {
      thrown.current = true;
      const { w, h } = size();
      const b = body.current;
      b.x = w * 0.25;
      b.y = h * 0.7;
      b.vx = 1300;
      b.vy = -500;
      b.va = 900;
      run();
    }
    // Only react to the number arriving.
  }, [value]);

  useVirtualKeys((e) => {
    if (e.down && e.key === 'confirm') throwIt();
  }, stage === 'ready');

  const onDown = (e: React.PointerEvent) => {
    if (stage !== 'ready') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
    setStage('held');
    sound.unlock();
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const r = tray.current!.getBoundingClientRect();
    const b = body.current;
    b.x = Math.max(DIE / 2, Math.min(r.width - DIE / 2, e.clientX - r.left));
    b.y = Math.max(DIE / 2, Math.min(r.height - DIE / 2, e.clientY - r.top));
    b.a += (e.movementX || 0) * 0.6;
    place();
    d.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    while (d.samples.length > 2 && e.timeStamp - d.samples[0]!.t > 90) d.samples.shift();
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const first = d.samples[0]!;
    const dt = Math.max(0.016, (e.timeStamp - first.t) / 1000);
    let vx = (e.clientX - first.x) / dt;
    let vy = (e.clientY - first.y) / dt;
    const sp = Math.hypot(vx, vy);
    // A tap (or a slow push) still throws: a gentle flick gets a minimum strength, a wild one a cap.
    if (sp < 250) return throwIt();
    const s = Math.max(900, Math.min(2800, sp * 1.1)) / sp;
    vx *= s;
    vy *= s;
    throwIt(vx, vy);
  };

  return (
    <div className="dice">
      <div ref={tray} className="dice-tray" data-stage={stage}>
        <div
          ref={dieEl}
          className="dice-die"
          role={stage === 'landed' ? 'img' : 'button'}
          aria-label={stage === 'landed' ? `Rolled ${face}` : stage === 'rolling' ? 'Rolling…' : 'Die: flick it to throw'}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div ref={squash}>
            <Die value={face} size={DIE} decorative />
          </div>
        </div>
        {stage === 'ready' && <span className="dice-hint">Flick the die!</span>}
      </div>
      {stage === 'ready' || stage === 'held' ? (
        <button type="button" className="bp-roll" onClick={() => throwIt()}>
          Roll!
          {keyHint && <KeyHint k="Space" />}
        </button>
      ) : null}
    </div>
  );
}
