import { previewRoute, type HeistStep } from '@partygame/shared';
import { useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Grid, Sequence } from '../input/index.ts';
import { useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import { star } from './theme/paper.tsx';
import './minigames.css';
import './wave-c.css';

const CHIPS = [
  { id: 'U', label: '↑', vkey: 'up' as const },
  { id: 'D', label: '↓', vkey: 'down' as const },
  { id: 'L', label: '←', vkey: 'left' as const },
  { id: 'R', label: '→', vkey: 'right' as const },
  { id: 'W', label: 'Wait', vkey: 'confirm' as const },
];

function Guard({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x + 0.5} ${y + 0.5})`}>
      <circle r={0.4} fill="#1e3a8a" stroke="#2B2233" strokeWidth={0.07} />
      <path d="M-0.38 -0.08 Q0 -0.58 0.38 -0.08 Z" fill="#101c45" stroke="#2B2233" strokeWidth={0.06} strokeLinejoin="round" />
      <path d={star(0, 0.14, 0.15)} fill="#FFD23F" stroke="#2B2233" strokeWidth={0.03} />
    </g>
  );
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as {
    variant: 'ffa' | 'guard';
    size: number;
    walls: number[];
    gems: Record<number, number>;
    thieves: Record<string, { x: number; y: number }>;
    guards: Record<string, { x: number; y: number }>;
    round: number;
    maxRounds: number;
    stage: 'plan' | 'play';
    submitted: string[];
    frames: Record<string, [number, number]>[];
    events: { step: number; id: string; kind: 'gem' | 'bump' | 'caught'; value?: number }[];
    score: Record<string, number>;
    shownAt: number;
    stepMs: number;
  };
  const seats = seatMap(view);
  const now = useServerNow(conn, 30);
  const playing = d.stage === 'play' && d.frames.length > 0;
  const t = playing ? Math.max(0, (now - d.shownAt) / d.stepMs) : 0;
  const i = Math.min(d.frames.length - 1, Math.floor(t));
  const f = Math.min(1, t - i);
  const pos = (id: string, fallback: { x: number; y: number }) => {
    if (!playing) return fallback;
    const a = d.frames[i]![id] ?? [fallback.x, fallback.y];
    const b = d.frames[Math.min(d.frames.length - 1, i + 1)]![id] ?? a;
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f };
  };
  const shownEvents = d.events.filter((e) => e.step < t - 0.5);
  return (
    <div className="mg-host heist-host">
      <svg className="heist-svg" viewBox={`-0.1 -0.1 ${d.size + 0.2} ${d.size + 0.2}`}>
        {Array.from({ length: d.size * d.size }, (_, c) => (
          <rect key={c} x={(c % d.size) + 0.03} y={Math.floor(c / d.size) + 0.03} width={0.94} height={0.94} rx={0.12} fill={d.walls.includes(c) ? '#4a3b5c' : ((c % d.size) + Math.floor(c / d.size)) % 2 ? '#e9dcc3' : '#d5c6a8'} />
        ))}
        {Object.entries(d.gems).map(([c, v]) => (
          <g key={c} transform={`translate(${(Number(c) % d.size) + 0.5} ${Math.floor(Number(c) / d.size) + 0.5})`}>
            <path d="M0 -0.32 L0.3 0 L0 0.32 L-0.3 0 Z" fill="#48cae4" stroke="#2B2233" strokeWidth={0.06} strokeLinejoin="round" />
            <path d="M-0.3 0 H0.3 M-0.12 0 L0 -0.32 L0.12 0" fill="none" stroke="#2B2233" strokeWidth={0.03} opacity={0.5} />
            <text y={0.12} textAnchor="middle" fontSize={0.3} fontFamily="Fredoka, sans-serif" fontWeight={700}>
              {v}
            </text>
          </g>
        ))}
        {Object.entries(d.guards).map(([gid, g]) => {
          const p = pos(gid, g);
          return <Guard key={gid} x={p.x} y={p.y} />;
        })}
        {Object.entries(d.thieves).map(([id, th]) => {
          const s = seats.get(id);
          const p = pos(id, th);
          return s ? (
            <g key={id} transform={`translate(${p.x + 0.08} ${p.y + 0.08})`}>
              <Avatar avatar={s.avatar} size={0.84} />
            </g>
          ) : null;
        })}
      </svg>
      <div className="heist-side">
        <p className="mg-host-lead">
          Round {d.round}/{d.maxRounds}
          <br />
          {d.stage === 'plan' ? 'Plan 5 moves on your phone' : 'Go!'}
        </p>
        {d.stage === 'plan' && <SubmittedRow view={view} ids={[...Object.keys(d.thieves), ...(d.variant === 'guard' ? Object.keys(d.guards) : [])]} submitted={d.submitted} size={44} />}
        <ul className="heist-log">
          {shownEvents.slice(-6).map((e, k) => (
            <li key={k} className="pop-in">
              {seats.get(e.id)?.name} {e.kind === 'gem' ? `grabbed a ${e.value}-gem` : e.kind === 'bump' ? 'bumped into someone' : `got caught${e.value ? `, dropping ${e.value}` : ''}!`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as {
    variant: 'ffa' | 'guard';
    size: number;
    walls: number[];
    gems: Record<number, number>;
    me: { x: number; y: number } | null;
    role: 'thief' | 'guard' | 'caught';
    guards: { x: number; y: number; route: HeistStep[] }[];
    round: number;
    maxRounds: number;
    stage: 'plan' | 'play';
    closesAt: number;
    myProgram: HeistStep[] | null;
    myScore: number;
    shownAt: number;
    playMs: number;
  };
  const [steps, setSteps] = useState<string[]>([]);
  if (d.stage === 'play')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt + d.playMs - 1500}>
        <h2 className="pf-title">{d.role === 'guard' ? 'Patrol done' : `${d.myScore} gems so far`}</h2>
      </RoundResult>
    );
  if (!d.me || d.role === 'caught') return <div className="mg-player center-col"><h2 className="pf-title">You were caught! Watch the others.</h2></div>;
  const program = (d.myProgram ?? steps) as HeistStep[];
  const route = previewRoute(d, d.me, program);
  const onRoute = new Set(route.map(([x, y]) => `${x},${y}`));
  const guardCells = new Set(d.guards.map((g) => `${g.x},${g.y}`));
  const locked = !!d.myProgram;
  return (
    <div className="mg-player">
      <RoundHead conn={conn} title={d.role === 'guard' ? 'Plan the patrol' : 'Plan your heist'} round={d.round} rounds={d.maxRounds} closesAt={d.closesAt} />
      <div className="heist-grid">
        <Grid
          w={d.size}
          h={d.size}
          locked
          cell={(x, y) => {
            const c = y * d.size + x;
            if (d.walls.includes(c)) return { fill: '#2B2233' };
            if (x === d.me!.x && y === d.me!.y) return { fill: '#FFD23F', glyph: '★' };
            if (guardCells.has(`${x},${y}`)) return { fill: '#1e3a8a', glyph: 'G', glyphColour: '#fff' };
            if (d.gems[c]) return { fill: '#b8f0f8', glyph: String(d.gems[c]) };
            return { fill: onRoute.has(`${x},${y}`) ? '#ffe9a8' : '#e9dcc3' };
          }}
          onCell={() => undefined}
          overlay={<polyline points={route.map(([x, y]) => `${x + 0.5},${y + 0.5}`).join(' ')} fill="none" stroke="#FF4D5E" strokeWidth={0.12} strokeLinejoin="round" strokeLinecap="round" />}
        />
      </div>
      <Sequence chips={CHIPS} steps={5} value={program} onChange={setSteps} locked={locked} />
      <button className="btn red big block" disabled={locked} onClick={() => conn.intent({ type: 'program', steps })}>
        {locked ? 'Locked in ✓' : 'Lock in route'}
      </button>
    </div>
  );
}

registerMinigameUi('heist', { Host, Player });
registerMinigameUi('heist-guard', { Host, Player });
