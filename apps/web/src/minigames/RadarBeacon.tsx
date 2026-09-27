import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { seatMap } from '../game/HostFlow.tsx';
import { Countdown } from '../timing/clock.tsx';
import { TEAM_COLOURS, TEAM_NAMES } from './TugOfWar.tsx';
import './minigames.css';
import './wave-d.css';

const MAP = 100;

interface Ping {
  x: number;
  y: number;
  dist: number;
  by: string;
}

function RadarMap({ children, onTap }: { children: React.ReactNode; onTap?: (x: number, y: number) => void }) {
  return (
    <svg
      className="radar-svg"
      viewBox={`0 0 ${MAP} ${MAP}`}
      onPointerDown={(e) => {
        if (!onTap) return;
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
        onTap(Math.round(p.x), Math.round(p.y));
      }}
    >
      <rect width={MAP} height={MAP} fill="#12343b" />
      {[20, 40, 60, 80].map((v) => (
        <g key={v} stroke="#2d6a73" strokeWidth={0.3}>
          <line x1={v} y1={0} x2={v} y2={MAP} />
          <line x1={0} y1={v} x2={MAP} y2={v} />
        </g>
      ))}
      {children}
    </svg>
  );
}

function PingRing({ p, colour }: { p: Ping; colour: string }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={p.dist} fill="none" stroke={colour} strokeWidth={0.8} strokeDasharray="2 1.5" />
      <circle cx={p.x} cy={p.y} r={1.6} fill={colour} stroke="#fff" strokeWidth={0.4} />
    </g>
  );
}

function Host({ mg }: MgHostProps) {
  const d = mg.game as { stage: 'ping' | 'guess'; ping: number; pings: number; tolerance: number; pinged: number[]; target: { x: number; y: number } | null; results: Ping[][] | null; guesses: ({ x: number; y: number } | null)[] | null };
  return (
    <div className="mg-host radar-host">
      <RadarMap>
        {d.results?.map((r, t) => r.map((p, i) => <PingRing key={`${t}-${i}`} p={p} colour={TEAM_COLOURS[t]!} />))}
        {d.guesses?.map((g, t) => (g ? <rect key={t} x={g.x - 2} y={g.y - 2} width={4} height={4} fill={TEAM_COLOURS[t]} stroke="#fff" strokeWidth={0.6} transform={`rotate(45 ${g.x} ${g.y})`} /> : null))}
        {d.target && (
          <g>
            <circle cx={d.target.x} cy={d.target.y} r={d.tolerance} fill="rgba(255,210,63,0.25)" stroke="#FFD23F" strokeWidth={0.6} />
            <circle cx={d.target.x} cy={d.target.y} r={2} fill="#FFD23F" />
          </g>
        )}
      </RadarMap>
      <div className="radar-side">
        <p className="mg-host-lead">{d.target ? 'The beacon!' : d.stage === 'ping' ? `Ping ${d.ping + 1} of ${d.pings}: teammates take turns` : 'Everyone drops a marker'}</p>
        {(mg.teams ?? []).map((_, t) => (
          <div key={t} className="chip radar-team" style={{ background: TEAM_COLOURS[t], color: '#fff' }}>
            {TEAM_NAMES[t]}: {d.pinged[t] ?? 0}/{d.pings} pings
          </div>
        ))}
      </div>
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as { stage: 'ping' | 'guess'; ping: number; pings: number; closesAt: number; tolerance: number; team: number; myTurn: boolean; pingerId: string | null; results: Ping[]; myGuess: { x: number; y: number } | null; teamGuesses: { x: number; y: number }[] };
  const seats = seatMap(view);
  const colour = TEAM_COLOURS[d.team] ?? '#3D7BFF';
  const canTap = d.stage === 'ping' ? d.myTurn : true;
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2 style={{ color: colour }}>{d.stage === 'ping' ? (d.myTurn ? 'Your ping! Tap the map' : `${seats.get(d.pingerId ?? '')?.name ?? 'A teammate'} is pinging`) : 'Drop your marker'}</h2>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Each ring shows how far the beacon is from that ping. Where do the rings meet?
      </p>
      <RadarMap onTap={canTap ? (x, y) => conn.intent({ type: d.stage === 'ping' ? 'ping' : 'guess', x, y }) : undefined}>
        {d.results.map((p, i) => (
          <PingRing key={i} p={p} colour={colour} />
        ))}
        {d.teamGuesses.map((g, i) => (
          <circle key={i} cx={g.x} cy={g.y} r={1.4} fill="#fff" opacity={0.7} />
        ))}
        {d.myGuess && <rect x={d.myGuess.x - 2} y={d.myGuess.y - 2} width={4} height={4} fill={colour} stroke="#fff" strokeWidth={0.6} transform={`rotate(45 ${d.myGuess.x} ${d.myGuess.y})`} />}
      </RadarMap>
      <ul className="radar-log">
        {d.results.map((p, i) => (
          <li key={i}>
            Ping {i + 1} by {seats.get(p.by)?.name}: {p.dist} away
          </li>
        ))}
      </ul>
    </div>
  );
}

registerMinigameUi('radar-beacon', { Host, Player });
