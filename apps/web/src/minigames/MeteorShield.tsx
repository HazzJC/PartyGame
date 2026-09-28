import { PLAYER_COLOURS } from '@partygame/shared';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Rotate } from '../input/index.ts';
import { Countdown } from '../timing/clock.tsx';
import './minigames.css';
import './wave-e.css';

interface Meteor {
  id: number;
  angle: number;
  r: number;
  state: 'falling' | 'blocked' | 'hit';
}


/** A fixed scatter of stars in the playfield. */
const STARS: [number, number][] = Array.from({ length: 40 }, (_, i) => {
  const a = i * 2.39996;
  const r = 0.3 + ((i * 37) % 70) / 100;
  return [Math.cos(a) * r, Math.sin(a) * r];
});

function Scene({ angles, arc, meteors, shieldR, colours, highlight }: { angles: Record<string, number>; arc: number; meteors: Meteor[]; shieldR: number; colours: Record<string, string>; highlight?: string }) {
  const R = shieldR;
  const arcPath = (a: number) => {
    const a0 = a - arc / 2;
    const a1 = a + arc / 2;
    return `M${Math.cos(a0) * R} ${Math.sin(a0) * R} A${R} ${R} 0 ${arc > Math.PI ? 1 : 0} 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R}`;
  };
  const P = R * 0.55;
  return (
    <svg className="meteor-svg" viewBox="-1.05 -1.05 2.1 2.1">
      <circle r={1.02} fill="#141a3a" />
      <circle r={R} fill="none" stroke="#2d3a6b" strokeWidth={0.02} strokeDasharray="0.04 0.03" />
      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.008} fill="#FFF6CC" />
      ))}
      {/* The planet: ocean with two paper continents. */}
      <circle r={P} fill="#3D7BFF" stroke="#2B2233" strokeWidth={0.03} />
      <path d={`M${-P * 0.7} ${-P * 0.2} Q${-P * 0.4} ${-P * 0.8} ${P * 0.1} ${-P * 0.6} Q${P * 0.4} ${-P * 0.2} 0 ${P * 0.05} Q${-P * 0.5} ${P * 0.2} ${-P * 0.7} ${-P * 0.2} Z`} fill="#3DBE4B" stroke="#2B2233" strokeWidth={0.015} />
      <path d={`M${P * 0.2} ${P * 0.35} Q${P * 0.6} ${P * 0.2} ${P * 0.65} ${P * 0.5} Q${P * 0.4} ${P * 0.8} ${P * 0.15} ${P * 0.6} Z`} fill="#3DBE4B" stroke="#2B2233" strokeWidth={0.015} />
      {Object.entries(angles).map(([id, a]) => (
        <path key={id} d={arcPath(a)} fill="none" stroke={colours[id] ?? '#fff'} strokeWidth={id === highlight ? 0.09 : 0.06} strokeLinecap="round" opacity={highlight && id !== highlight ? 0.6 : 1} />
      ))}
      {meteors.map((m) => (
        <g key={m.id} transform={`translate(${Math.cos(m.angle) * m.r} ${Math.sin(m.angle) * m.r})`}>
          {m.state === 'falling' && <path d={`M0 0 L${Math.cos(m.angle) * 0.14} ${Math.sin(m.angle) * 0.14}`} stroke="#FF9F43" strokeWidth={0.05} strokeLinecap="round" opacity={0.6} />}
          <circle r={m.state === 'falling' ? 0.045 : 0.09} fill={m.state === 'hit' ? '#FF4D5E' : m.state === 'blocked' ? '#FFD23F' : '#FF7A1A'} stroke="#2B2233" strokeWidth={0.012} opacity={m.state === 'falling' ? 1 : 0.8} />
        </g>
      ))}
    </svg>
  );
}

function coloursFor(seats: Map<string, { avatar: number }>, ids: string[]): Record<string, string> {
  return Object.fromEntries(ids.map((id) => [id, PLAYER_COLOURS[(seats.get(id)?.avatar ?? 0) % PLAYER_COLOURS.length]!]));
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as { angles: Record<string, number>; arc: number; meteors: Meteor[]; hits: number; blocked: number; shieldR: number };
  const seats = seatMap(view);
  return (
    <div className="mg-host meteor-host">
      <Scene angles={d.angles} arc={d.arc} meteors={d.meteors} shieldR={d.shieldR} colours={coloursFor(seats, Object.keys(d.angles))} />
      <div className="meteor-side">
        <p className="mg-host-lead">Blocked {d.blocked} · Hits {d.hits}</p>
        <p className="muted" style={{ fontSize: 28 }}>
          Each colour is one player’s shield. Turn yours on your phone!
        </p>
      </div>
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as { angles: Record<string, number>; mine: number; arc: number; meteors: Meteor[]; hits: number; closesAt: number; shieldR: number };
  const seats = seatMap(view);
  return (
    <div className="mg-player meteor-player">
      <div className="mg-player-head">
        <h2>Shield the planet</h2>
        <span className="chip">Hits {d.hits}</span>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <Scene angles={d.angles} arc={d.arc} meteors={d.meteors} shieldR={d.shieldR} colours={coloursFor(seats, Object.keys(d.angles))} highlight={view.me.id} />
      <div className="center">
        <Rotate angle={d.mine} arc={d.arc} size={180} onChange={(a) => conn.intent({ type: 'angle', a })} />
      </div>
    </div>
  );
}

registerMinigameUi('meteor-shield', { Host, Player });
