import { flightPath } from '@partygame/shared';
import { useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Aim, useVirtualKeys } from '../input/index.ts';
import { useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';
import './wave-c.css';

interface Tank {
  x: number;
  alive: boolean;
  hits: number;
}

interface Fortress {
  x: number;
  health: number;
  maxHealth: number;
}

const SKY = 900;

function Field({ width, children, zoom }: { width: number; children: React.ReactNode; zoom?: { x0: number; x1: number } }) {
  const x0 = zoom?.x0 ?? 0;
  const w = zoom ? zoom.x1 - zoom.x0 : width;
  return (
    <svg className="art-svg" viewBox={`${x0} ${-SKY} ${w} ${SKY + 90}`} preserveAspectRatio="xMidYMax meet">
      <rect x={x0 - 2000} y={-SKY - 200} width={w + 4000} height={SKY + 200} fill="#bfe3f2" />
      {Array.from({ length: Math.ceil(w / 700) + 2 }, (_, i) => (
        <g key={i} transform={`translate(${x0 + i * 700 - 350} ${-SKY + 150 + (i % 2) * 90}) scale(1.6)`}>
          <path d="M-60 20 Q-72 -8 -40 -12 Q-32 -40 -2 -32 Q20 -52 44 -26 Q76 -28 68 6 Q74 26 44 26 H-40 Q-66 30 -60 20 Z" fill="#FFFFFF" stroke="#2B2233" strokeWidth={4} />
        </g>
      ))}
      {Array.from({ length: Math.ceil(w / 600) + 2 }, (_, i) => (
        <ellipse key={i} cx={x0 + i * 600 - 300} cy={10} rx={430} ry={150 + (i % 2) * 50} fill={i % 2 ? '#9ccb6e' : '#8fc062'} stroke="#2B2233" strokeWidth={6} />
      ))}
      <rect x={x0 - 2000} y={0} width={w + 4000} height={120} fill="#7ea34f" stroke="#2B2233" strokeWidth={6} />
      <rect x={x0 - 2000} y={34} width={w + 4000} height={90} fill="#8a6440" />
      {children}
    </svg>
  );
}

function TankShape({ x, avatar, dim }: { x: number; avatar: number; dim?: boolean }) {
  return (
    <g opacity={dim ? 0.3 : 1}>
      <rect x={x - 52} y={-28} width={104} height={28} rx={14} fill="#3B3346" stroke="#2B2233" strokeWidth={5} />
      {[-34, -12, 12, 34].map((o) => (
        <circle key={o} cx={x + o} cy={-14} r={8} fill="#8C8A96" stroke="#2B2233" strokeWidth={3} />
      ))}
      <path d={`M${x - 42} -28 L${x - 30} -54 H${x + 30} L${x + 42} -28 Z`} fill="#5f7a3a" stroke="#2B2233" strokeWidth={5} strokeLinejoin="round" />
      <g transform={`translate(${x - 30} -112)`}>
        <Avatar avatar={avatar} size={60} />
      </g>
    </g>
  );
}

function FortressShape({ f }: { f: Fortress }) {
  return (
    <g>
      <rect x={f.x - 90} y={-170} width={180} height={170} fill="#b8b0a2" stroke="#2B2233" strokeWidth={6} />
      <path d={`M${f.x - 90} -114 H${f.x + 90} M${f.x - 90} -58 H${f.x + 90} M${f.x - 40} -170 V-114 M${f.x + 30} -114 V-58`} stroke="#2B2233" strokeWidth={3} opacity={0.35} />
      <path d={`M${f.x - 30} 0 V-40 Q${f.x - 30} -70 ${f.x} -70 Q${f.x + 30} -70 ${f.x + 30} -40 V0 Z`} fill="#6b4a2b" stroke="#2B2233" strokeWidth={5} />
      <path d={`M${f.x + 70} -200 V-300`} stroke="#2B2233" strokeWidth={7} strokeLinecap="round" />
      <path d={`M${f.x + 70} -300 L${f.x + 130} -284 L${f.x + 70} -268 Z`} fill="#FF4D5E" stroke="#2B2233" strokeWidth={5} strokeLinejoin="round" />
      {[-90, -45, 0, 45].map((o) => (
        <rect key={o} x={f.x + o} y={-200} width={36} height={30} fill="#b8b0a2" stroke="#2B2233" strokeWidth={5} />
      ))}
      <rect x={f.x - 90} y={-240} width={180} height={18} fill="#fff" stroke="#2B2233" strokeWidth={4} />
      <rect x={f.x - 90} y={-240} width={(180 * f.health) / f.maxHealth} height={18} fill="#e5484d" />
    </g>
  );
}

function pathD(p: number[], upTo = Infinity): string {
  let d = '';
  for (let i = 0; i < p.length && i / 2 <= upTo; i += 2) d += `${i ? 'L' : 'M'}${p[i]} ${-p[i + 1]!}`;
  return d;
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as {
    variant: 'ffa' | 'fortress';
    width: number;
    tanks: Record<string, Tank>;
    fortress: Fortress | null;
    wind: number;
    round: number;
    maxRounds: number;
    stage: 'aim' | 'fire';
    submitted: string[];
    paths: Record<string, number[]>;
    impacts: Record<string, string[]>;
    shownAt: number;
    sampleMs: number;
  };
  const seats = seatMap(view);
  const now = useServerNow(conn, 60);
  const step = d.stage === 'fire' ? (now - d.shownAt) / d.sampleMs : Infinity;
  return (
    <div className="mg-host">
      <p className="mg-host-lead">
        Round {d.round}/{d.maxRounds} · Wind {d.wind === 0 ? 'calm' : `${d.wind > 0 ? '→' : '←'} ${Math.abs(d.wind)}`}
        {d.fortress && ` · Fortress ${d.fortress.health}/${d.fortress.maxHealth}`}
      </p>
      <Field width={d.width}>
        {Object.entries(d.paths).map(([id, p]) => (
          <path key={id} d={pathD(p, step)} fill="none" stroke={d.stage === 'fire' ? '#2B2233' : 'rgba(43,34,51,0.25)'} strokeWidth={6} strokeDasharray={d.stage === 'fire' ? undefined : '14 12'} />
        ))}
        {d.fortress && <FortressShape f={d.fortress} />}
        {Object.entries(d.tanks).map(([id, t]) => {
          const s = seats.get(id);
          return s ? <TankShape key={id} x={t.x} avatar={s.avatar} dim={!t.alive || (d.stage === 'aim' && !d.submitted.includes(id))} /> : null;
        })}
        {d.stage === 'fire' &&
          Object.entries(d.paths).map(([id, p]) =>
            step >= p.length / 2 ? <circle key={`b${id}`} cx={p[p.length - 2]} cy={-10} r={d.impacts[id]?.length ? 70 : 34} fill={d.impacts[id]?.length ? '#FF4D5E' : '#FFB703'} stroke="#2B2233" strokeWidth={5} opacity={0.85} /> : null,
          )}
      </Field>
      {d.stage === 'aim' && <SubmittedRow view={view} ids={[...Object.keys(d.tanks).filter((id) => d.tanks[id]!.alive)]} submitted={d.submitted} size={44} />}
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as {
    variant: 'ffa' | 'fortress';
    width: number;
    tanks: Record<string, Tank>;
    fortress: Fortress | null;
    role: 'crew' | 'tank' | 'out';
    myX: number;
    wind: number;
    round: number;
    maxRounds: number;
    stage: 'aim' | 'fire';
    closesAt: number;
    myShot: { angle: number; power: number; dir: -1 | 1 } | null;
    lastPath: number[] | null;
    shownAt: number;
  };
  const seats = seatMap(view);
  const [shot, setShot] = useState<{ angle: number; power: number; dir: -1 | 1 }>({ angle: 45, power: 55, dir: d.myX < d.width / 2 ? 1 : -1 });
  useVirtualKeys((e) => {
    if (!e.down || d.myShot) return;
    if (e.raw === 'q' || e.raw === 'Q') setShot((s) => ({ ...s, dir: -1 }));
    if (e.raw === 'e' || e.raw === 'E') setShot((s) => ({ ...s, dir: 1 }));
  });
  if (d.stage === 'fire')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt + 2500}>
        <h2 className="pf-title">Boom!</h2>
      </RoundResult>
    );
  if (d.role === 'out') return <div className="mg-player center-col"><h2 className="pf-title">Your tank is out. Watch the battle!</h2></div>;
  const shown = d.myShot ?? shot;
  const preview = flightPath(d.myX, shown, d.wind);
  const zoom = { x0: Math.max(0, d.myX - 1400), x1: Math.min(d.width, d.myX + 1400) };
  return (
    <div className="mg-player">
      <RoundHead conn={conn} title={d.role === 'crew' ? 'Fortress cannon' : 'Aim your shot'} round={d.round} rounds={d.maxRounds} closesAt={d.closesAt} />
      <Field width={d.width} zoom={zoom}>
        {d.lastPath && <path d={pathD(d.lastPath)} fill="none" stroke="rgba(43,34,51,0.3)" strokeWidth={10} strokeDasharray="16 12" />}
        <path d={pathD(preview, 14)} fill="none" stroke="#FF4D5E" strokeWidth={12} strokeDasharray="20 14" />
        {d.fortress && <FortressShape f={d.fortress} />}
        {Object.entries(d.tanks).map(([id, t]) => {
          const s = seats.get(id);
          return s && t.alive ? <TankShape key={id} x={t.x} avatar={s.avatar} dim={id !== view.me.id} /> : null;
        })}
      </Field>
      <p className="muted" style={{ margin: 0 }}>
        Wind {d.wind === 0 ? 'calm' : `${d.wind > 0 ? '→' : '←'} ${Math.abs(d.wind)}`}. The red line shows the start of your flight; the dashed grey line is your last shot.
      </p>
      <div className="row">
        <button className="btn white small" aria-pressed={shown.dir === -1} disabled={!!d.myShot} onClick={() => setShot((s) => ({ ...s, dir: -1 }))}>
          ◀ Left
        </button>
        <button className="btn white small" aria-pressed={shown.dir === 1} disabled={!!d.myShot} onClick={() => setShot((s) => ({ ...s, dir: 1 }))}>
          Right ▶
        </button>
      </div>
      <Aim
        params={[
          { id: 'angle', label: 'Angle', min: 5, max: 85, step: 1, unit: '°' },
          { id: 'power', label: 'Power', min: 10, max: 100, step: 1 },
        ]}
        values={shown}
        locked={!!d.myShot}
        onChange={(v) => setShot((s) => ({ ...s, angle: v.angle!, power: v.power! }))}
      />
      <button className="btn red big block" disabled={!!d.myShot} onClick={() => conn.intent({ type: 'aim', ...shot })}>
        {d.myShot ? 'Locked in ✓' : 'Lock in shot'}
      </button>
    </div>
  );
}

registerMinigameUi('artillery', { Host, Player });
registerMinigameUi('artillery-fortress', { Host, Player });
