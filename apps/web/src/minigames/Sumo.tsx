import { useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Aim } from '../input/index.ts';
import { useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';
import './wave-c.css';

interface Puck {
  x: number;
  y: number;
  alive: boolean;
}

function Platform({ radius, children, onPoint }: { radius: number; children: React.ReactNode; onPoint?: (x: number, y: number) => void }) {
  const m = 70;
  return (
    <svg
      className="sumo-svg"
      viewBox={`${-radius - m} ${-radius - m} ${(radius + m) * 2} ${(radius + m) * 2}`}
      onPointerDown={(e) => {
        if (!onPoint) return;
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
        onPoint(p.x, p.y);
      }}
    >
      {/* The raised clay platform, with a hard paper shadow. */}
      <rect x={-radius - 46} y={-radius - 46} width={(radius + 46) * 2} height={(radius + 46) * 2} rx={28} fill="#2B2233" transform="translate(10 14)" />
      <rect x={-radius - 46} y={-radius - 46} width={(radius + 46) * 2} height={(radius + 46) * 2} rx={28} fill="#C99A62" stroke="#2B2233" strokeWidth={8} />
      {/* The straw bales that mark the edge. */}
      <circle r={radius + 16} fill="none" stroke="#2B2233" strokeWidth={30} />
      <circle r={radius + 16} fill="none" stroke="#D9B35A" strokeWidth={22} strokeDasharray="46 8" />
      <circle r={radius} fill="#f7d9a8" stroke="#2B2233" strokeWidth={6} />
      {/* The starting lines. */}
      <path d={`M${-radius * 0.14} ${-radius * 0.1} V${radius * 0.1} M${radius * 0.14} ${-radius * 0.1} V${radius * 0.1}`} stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" />
      {children}
    </svg>
  );
}

function PuckAvatar({ x, y, avatar, r, dim }: { x: number; y: number; avatar: number; r: number; dim?: boolean }) {
  return (
    <g transform={`translate(${x - r} ${y - r})`} opacity={dim ? 0.25 : 1}>
      <Avatar avatar={avatar} size={r * 2} />
    </g>
  );
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as { radius: number; pucks: Record<string, Puck>; round: number; maxRounds: number; stage: 'aim' | 'play'; submitted: string[]; frames: [string, number, number, 0 | 1][][]; shownAt: number; frameMs: number; puckR: number };
  const seats = seatMap(view);
  const now = useServerNow(conn, 60);
  const playing = d.stage === 'play' && d.frames.length > 0;
  const fi = playing ? Math.max(0, Math.min(d.frames.length - 1, Math.floor((now - d.shownAt) / d.frameMs))) : -1;
  const pucks: [string, number, number, boolean][] = playing ? d.frames[fi]!.map(([id, x, y, a]) => [id, x, y, a === 1]) : Object.entries(d.pucks).map(([id, p]) => [id, p.x, p.y, p.alive]);
  return (
    <div className="mg-host sumo-host">
      <Platform radius={d.radius}>
        {pucks.map(([id, x, y, alive]) => {
          const s = seats.get(id);
          return s ? <PuckAvatar key={id} x={x} y={y} avatar={s.avatar} r={d.puckR} dim={!alive || (d.stage === 'aim' && !d.submitted.includes(id))} /> : null;
        })}
      </Platform>
      <div className="sumo-side">
        <p className="mg-host-lead">
          Round {d.round}/{d.maxRounds}
          <br />
          {d.stage === 'aim' ? 'Aim on your phone. Everyone moves at once!' : 'Sumo!'}
        </p>
        {d.stage === 'aim' && <SubmittedRow view={view} ids={Object.keys(d.pucks).filter((id) => d.pucks[id]!.alive)} submitted={d.submitted} size={48} />}
      </div>
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as { radius: number; pucks: Record<string, Puck>; round: number; maxRounds: number; stage: 'aim' | 'play'; closesAt: number; alive: boolean; myMove: { angle: number; force: number } | null; shownAt: number; playMs: number; puckR: number };
  const seats = seatMap(view);
  const [aim, setAim] = useState({ angle: 0, force: 3 });
  if (d.stage === 'play')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt + d.playMs - 1500}>
        <h2 className="pf-title">{d.alive ? 'Still standing!' : 'You fell off!'}</h2>
      </RoundResult>
    );
  if (!d.alive)
    return (
      <div className="mg-player center-col">
        <h2 className="pf-title">You're out. Watch the sumo!</h2>
      </div>
    );
  const me = d.pucks[view.me.id]!;
  const locked = !!d.myMove;
  const shown = d.myMove ?? aim;
  const a = (shown.angle * Math.PI) / 180;
  const len = 40 + shown.force * 45;
  return (
    <div className="mg-player">
      <RoundHead conn={conn} title="Aim your shove" round={d.round} rounds={d.maxRounds} closesAt={d.closesAt} />
      <Platform radius={d.radius} onPoint={locked ? undefined : (x, y) => setAim((v) => ({ ...v, angle: Math.round(((Math.atan2(y - me.y, x - me.x) * 180) / Math.PI + 360) % 360 / 5) * 5 }))}>
        {Object.entries(d.pucks).map(([id, p]) => {
          const s = seats.get(id);
          return s && p.alive ? <PuckAvatar key={id} x={p.x} y={p.y} avatar={s.avatar} r={d.puckR} dim={id !== view.me.id} /> : null;
        })}
        <line x1={me.x} y1={me.y} x2={me.x + Math.cos(a) * len} y2={me.y + Math.sin(a) * len} stroke="#FF4D5E" strokeWidth={14} strokeLinecap="round" />
        <circle cx={me.x + Math.cos(a) * len} cy={me.y + Math.sin(a) * len} r={16} fill="#FF4D5E" stroke="#2B2233" strokeWidth={4} />
      </Platform>
      <p className="muted" style={{ margin: 0 }}>
        Tap the platform to point, then set the force.
      </p>
      <Aim
        params={[
          { id: 'angle', label: 'Direction', min: 0, max: 355, step: 5, unit: '°' },
          { id: 'force', label: 'Force', min: 1, max: 5, step: 1 },
        ]}
        values={shown}
        locked={locked}
        onChange={(v) => setAim({ angle: v.angle!, force: v.force! })}
      />
      <button className="btn red big block" disabled={locked} onClick={() => conn.intent({ type: 'move', ...aim })}>
        {locked ? 'Locked in ✓' : 'Lock in'}
      </button>
    </div>
  );
}

registerMinigameUi('sumo-programming', { Host, Player });
