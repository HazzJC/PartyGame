import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

/** A flat die face (used on its own, and for each face of the 3D die). */
export function Die({ value, size = 120, decorative = false }: { value: number; size?: number; decorative?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={decorative ? undefined : `Rolled ${value}`} aria-hidden={decorative || undefined}>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#FFFFFF" stroke="#2B2233" strokeWidth="6" />
      {(DIE_PIPS[value] ?? []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill={value === 1 ? '#FF4D5E' : '#2B2233'} />
      ))}
    </svg>
  );
}

/** Which way each face points on the cube, and the turn that brings a value to face the camera. */
const FACES: { value: number; place: string }[] = [
  { value: 1, place: 'rotateY(0deg)' },
  { value: 6, place: 'rotateY(180deg)' },
  { value: 2, place: 'rotateY(90deg)' },
  { value: 5, place: 'rotateY(-90deg)' },
  { value: 3, place: 'rotateX(90deg)' },
  { value: 4, place: 'rotateX(-90deg)' },
];
const SHOW: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };

/** One face of the 3D die: full-bleed, so neighbouring faces meet cleanly at the cube's edges. */
function CubeFace({ value, size }: { value: number; size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="14" fill="#FFFFFF" stroke="#2B2233" strokeWidth="5" />
      {(DIE_PIPS[value] ?? []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9.5" fill={value === 1 ? '#FF4D5E' : '#2B2233'} />
      ))}
    </svg>
  );
}

/**
 * A real 3D cube (CSS 3D transforms), seen at a three-quarter angle so its depth shows. An ink
 * core just inside the faces fills the rounded corners, so the die always reads as one solid block.
 */
export function Die3D({ size, cubeRef, style }: { size: number; cubeRef?: React.Ref<HTMLDivElement>; style?: CSSProperties }) {
  return (
    <div className="die3d" style={{ width: size, height: size, ['--half' as string]: `${size / 2}px` }}>
      <div className="die3d-cube" ref={cubeRef} style={style}>
        {FACES.map((f) => (
          <div key={`core${f.value}`} className="die3d-core" style={{ transform: `${f.place} translateZ(calc(var(--half) - 2px))` }} />
        ))}
        {FACES.map((f) => (
          <div key={f.value} className="die3d-face" style={{ transform: `${f.place} translateZ(var(--half))` }}>
            <CubeFace value={f.value} size={size} />
          </div>
        ))}
      </div>
    </div>
  );
}

const DIE = 78;
/** Velocity kept per wall bounce, felt friction per second, gravity (px/s²) and floor bounce. */
const BOUNCE = 0.6;
const FRICTION = 2.2;
const GRAVITY = 2800;
const FLOOR_BOUNCE = 0.42;

interface Body {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** The cube's own rotation (degrees) and spin in the air (degrees per second). */
  rx: number;
  ry: number;
  rz: number;
  wx: number;
  wy: number;
  wz: number;
}

type Stage = 'ready' | 'held' | 'rolling' | 'landed';

const nearest = (from: number, target: number) => target + 360 * Math.round((from - target) / 360);

/**
 * Throw the die: flick it across the tray or press Roll / Space. It's tossed into the air, falls
 * with gravity, bounces off the felt and the walls, and rolls over as it travels, as a real 3D
 * cube. The number comes from the server (sent the moment you let go) and the die turns to show it
 * on top as it comes to rest, with a clack on every bounce, a chime and "You got N!".
 */
export function DiceTray({ value, onThrow, keyHint, onLanded }: { value: number | null; onThrow: () => void; keyHint: boolean; onLanded?: () => void }) {
  const tray = useRef<HTMLDivElement>(null);
  const dieEl = useRef<HTMLDivElement>(null);
  const cube = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const body = useRef<Body>({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: -90, ry: 0, rz: -12, wx: 0, wy: 0, wz: 0 });
  const valueRef = useRef(value);
  valueRef.current = value;
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;
  const thrown = useRef(false);
  const [stage, setStage] = useState<Stage>(value === null ? 'ready' : 'landed');
  const drag = useRef<{ id: number; samples: { x: number; y: number; t: number }[] } | null>(null);
  const raf = useRef(0);

  const size = () => {
    const r = tray.current?.getBoundingClientRect();
    return { w: r?.width ?? 300, h: r?.height ?? 180 };
  };
  const place = () => {
    const b = body.current;
    const lift = 1 + b.z / 260;
    if (dieEl.current) dieEl.current.style.transform = `translate(${b.x - DIE / 2}px, ${b.y - DIE / 2 - b.z * 0.35}px) scale(${lift})`;
    if (cube.current) cube.current.style.transform = `rotateX(-24deg) rotateY(28deg) rotateX(${b.rx}deg) rotateY(${b.ry}deg) rotateZ(${b.rz}deg)`;
    if (shadow.current) {
      shadow.current.style.transform = `translate(${b.x - DIE / 2}px, ${b.y - DIE / 2 + DIE * 0.42}px) scale(${1 - Math.min(0.5, b.z / 400)})`;
      shadow.current.style.opacity = String(0.35 - Math.min(0.2, b.z / 800));
    }
  };

  // Rest in the middle of the tray to begin with, showing a three.
  useEffect(() => {
    const { w, h } = size();
    const landedAt = value !== null ? SHOW[value]! : SHOW[3]!;
    body.current = { ...body.current, x: w / 2, y: h / 2, rx: landedAt[0], ry: landedAt[1], rz: -12 };
    place();
    return () => cancelAnimationFrame(raf.current);
    // Mount only.
  }, []);

  /** Turn the cube so the rolled value is on top, then celebrate. */
  const land = () => {
    const b = body.current;
    const [tx, ty] = SHOW[valueRef.current!]!;
    const from = { rx: b.rx, ry: b.ry, rz: b.rz };
    const to = { rx: nearest(b.rx, tx), ry: nearest(b.ry, ty), rz: nearest(b.rz, Math.round(b.rz / 90) * 90) };
    const start = performance.now();
    const settle = (now: number) => {
      const t = Math.min(1, (now - start) / 320);
      const e = 1 - (1 - t) ** 3;
      b.rx = from.rx + (to.rx - from.rx) * e;
      b.ry = from.ry + (to.ry - from.ry) * e;
      b.rz = from.rz + (to.rz - from.rz) * e;
      place();
      if (t < 1) raf.current = requestAnimationFrame(settle);
      else {
        setStage('landed');
        onLandedRef.current?.();
        sound.play('diceLand');
        navigator.vibrate?.(25);
        dieEl.current?.animate([{ scale: '1.25' }, { scale: '0.94' }, { scale: '1' }], { duration: 340, easing: 'ease-out' });
      }
    };
    raf.current = requestAnimationFrame(settle);
  };

  const run = () => {
    cancelAnimationFrame(raf.current);
    setStage('rolling');
    if (motionReduced()) {
      // No tumbling: show the result as soon as it's known.
      const wait = () => {
        if (valueRef.current === null) return void (raf.current = requestAnimationFrame(wait));
        const [tx, ty] = SHOW[valueRef.current]!;
        Object.assign(body.current, { z: 0, rx: tx, ry: ty, rz: 0 });
        place();
        setStage('landed');
        onLandedRef.current?.();
      };
      wait();
      return;
    }
    let last = performance.now();
    const started = last;
    let lastHit = 0;
    const hit = (strength: number, now: number) => {
      if (strength < 140 || now - lastHit < 55) return;
      lastHit = now;
      sound.play('diceHit', Math.min(1.2, strength / 1300));
      navigator.vibrate?.(8);
    };
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const b = body.current;
      const { w, h } = size();
      const r = DIE / 2;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.vz -= GRAVITY * dt;
      // The floor: bounce, then settle.
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -160) {
          hit(-b.vz, now);
          b.vz = -b.vz * FLOOR_BOUNCE;
          // Hitting the felt knocks the spin about a little.
          b.wx = b.wx * 0.6 + (Math.random() - 0.5) * 500;
          b.wy = b.wy * 0.6 + (Math.random() - 0.5) * 500;
        } else b.vz = 0;
      }
      // The walls.
      let wall = 0;
      if (b.x < r) (b.x = r), (wall = Math.abs(b.vx)), (b.vx = Math.abs(b.vx) * BOUNCE);
      if (b.x > w - r) (b.x = w - r), (wall = Math.abs(b.vx)), (b.vx = -Math.abs(b.vx) * BOUNCE);
      if (b.y < r) (b.y = r), (wall = Math.max(wall, Math.abs(b.vy))), (b.vy = Math.abs(b.vy) * BOUNCE);
      if (b.y > h - r) (b.y = h - r), (wall = Math.max(wall, Math.abs(b.vy))), (b.vy = -Math.abs(b.vy) * BOUNCE);
      if (wall) {
        hit(wall, now);
        b.wz = -b.wz * 0.7 + (Math.random() - 0.5) * 300;
      }
      const onFelt = b.z === 0 && b.vz === 0;
      if (onFelt) {
        // Rolling without slipping: travel turns the cube over (180/π degrees per radius travelled).
        const k = 180 / Math.PI / r;
        b.rx -= b.vy * dt * k;
        b.ry += b.vx * dt * k;
        const f = Math.exp(-FRICTION * dt);
        b.vx *= f;
        b.vy *= f;
        b.wx = b.wy = 0;
      } else {
        // Tumbling in the air.
        b.rx += b.wx * dt;
        b.ry += b.wy * dt;
      }
      b.rz += b.wz * dt;
      b.wz *= Math.exp(-2.5 * dt);
      place();
      const speed = Math.hypot(b.vx, b.vy);
      if (onFelt && speed < 45 && now - started > 700) {
        if (valueRef.current !== null) return land();
        // Still waiting on the server's number: another little hop.
        b.vz = 420;
        b.vx = (Math.random() - 0.5) * 400;
        b.vy = (Math.random() - 0.5) * 400;
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
      // A button throw: tossed from the near edge, off at an angle.
      b.x = w * (0.3 + Math.random() * 0.4);
      b.y = h - DIE / 2;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const sp = 1100 + Math.random() * 500;
      vx = Math.cos(ang) * sp;
      vy = Math.sin(ang) * sp;
    }
    b.vx = vx;
    b.vy = vy;
    b.vz = 650 + Math.random() * 350;
    b.wx = (Math.random() < 0.5 ? -1 : 1) * (500 + Math.random() * 700);
    b.wy = (Math.random() < 0.5 ? -1 : 1) * (500 + Math.random() * 700);
    b.wz = (Math.random() - 0.5) * 600;
    run();
  };

  // A teammate rolled for us (or the timer ran out): watch our die go anyway.
  useEffect(() => {
    if (value !== null && stage === 'ready' && !thrown.current) {
      thrown.current = true;
      const { w, h } = size();
      Object.assign(body.current, { x: w * 0.25, y: h * 0.7, vx: 900, vy: -350, vz: 700, wx: 800, wy: -600, wz: 200 });
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
    body.current.z = 40;
    place();
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
    // Shaking it in your hand turns it.
    b.ry += (e.movementX || 0) * 1.2;
    b.rx -= (e.movementY || 0) * 1.2;
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
    // A tap (or a slow push) still throws; a gentle flick gets a minimum strength, a wild one a cap.
    if (sp < 250) return throwIt();
    const s = Math.max(800, Math.min(2400, sp)) / sp;
    vx *= s;
    vy *= s;
    throwIt(vx, vy);
  };

  return (
    <div className="dice">
      <div ref={tray} className="dice-tray" data-stage={stage}>
        <div ref={shadow} className="dice-shadow" style={{ width: DIE, height: DIE * 0.34 }} />
        <div
          ref={dieEl}
          className="dice-die"
          role={stage === 'landed' ? 'img' : 'button'}
          aria-label={stage === 'landed' && value !== null ? `Rolled ${value}` : stage === 'rolling' ? 'Rolling…' : 'Die: flick it to throw'}
          style={{ width: DIE, height: DIE }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <Die3D size={DIE} cubeRef={cube} />
        </div>
        {stage === 'ready' && <span className="dice-hint">Flick the die!</span>}
        {stage === 'landed' && value !== null && (
          <div className="dice-result pop-in">
            You got <b>{value}</b>!
          </div>
        )}
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

/** After the roll: the die at rest with the number, held while the pawns move. */
export function RolledDie({ value, team }: { value: number; team?: boolean }) {
  const [tx, ty] = SHOW[value] ?? [0, 0];
  return (
    <div className="dice-rolled pop-in">
      <Die3D size={96} style={{ transform: `rotateX(-24deg) rotateY(28deg) rotateX(${tx}deg) rotateY(${ty}deg)` }} />
      <div className="dice-rolled-text">
        {team ? 'Your team got' : 'You got'} <b>{value}</b>!
      </div>
      <span className="muted">Watch your pawn move on the big screen.</span>
    </div>
  );
}
