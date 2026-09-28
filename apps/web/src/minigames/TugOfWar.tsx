import { useRef, useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { isMashPointer, MashGate, mashStyleOfKey, useMashSender, useVirtualKeys, type MashStyle } from '../input/index.ts';
import { useServerNow } from '../timing/clock.tsx';
import { PaperPawn } from '../board/PaperPawn.tsx';
import { INK, PAPER } from './theme/paper.tsx';
import './minigames.css';

interface Hazard {
  at: number;
  until: number;
}

interface Data {
  marker: number;
  startAt: number;
  /** Pull multiplier: grows the longer the tug lasts. */
  power: number;
  hazards: Hazard[];
  winner?: number | null;
  team?: number;
  myTaps?: number;
}

export const TEAM_NAMES = ['Red', 'Blue', 'Green', 'Gold'];
export const TEAM_COLOURS = ['#FF4D5E', '#3D7BFF', '#2EC27E', '#FFB703'];

const inHazard = (hazards: Hazard[], t: number) => hazards.some((h) => t >= h.at && t < h.until);

/** Pull power grows the longer the tug lasts, so every tap counts more and more. */
function PowerMeter({ power }: { power: number }) {
  return (
    <span className="chip tug-power" data-hot={power >= 4} aria-label={`Pull power times ${power.toFixed(1)}`}>
      Pull power ×{power < 10 ? power.toFixed(1) : Math.round(power)}
    </span>
  );
}

function Rope({ marker, slippery }: { marker: number; slippery: boolean }) {
  return (
    <div className="tug-rope" data-slippery={slippery}>
      <div className="tug-zone left" />
      <div className="tug-zone right" />
      <div className="tug-knot" style={{ left: `${50 + marker * 46}%` }} />
    </div>
  );
}

/** How far the knot travels to reach a team's flag (in arena units, either side of the mud). */
const TRAVEL = 330;

/**
 * The host's view of the tug: the teams as paper standees leaning back on one rope, the knot's
 * ribbon over the mud pit in the middle, and each team's flag at the end it pulls towards.
 */
function Arena({ marker, teams, avatars, pulling, slippery }: { marker: number; teams: string[][]; avatars: Map<string, number>; pulling: boolean; slippery: boolean }) {
  const knot = 600 + marker * TRAVEL;
  const ropeY = 222;
  const side = (team: number) => (team === 0 ? -1 : 1);
  return (
    <svg className="tug-arena" viewBox="0 0 1200 340" data-presentation="host" aria-hidden="true">
      <path d="M-900 250 Q300 238 600 246 T2100 250 V1400 H-900 Z" fill="#8CCB6E" stroke={INK} strokeWidth={5} />
      {/* The mud pit. */}
      <ellipse cx={600} cy={268} rx={150} ry={30} fill="#6B4A2B" stroke={INK} strokeWidth={5} />
      <ellipse cx={560} cy={262} rx={16} ry={6} fill="#8A6440" />
      <ellipse cx={646} cy={274} rx={12} ry={5} fill="#8A6440" />
      {/* The flags each team is pulling towards. */}
      {[0, 1].map((t) => {
        const x = 600 + side(t) * TRAVEL;
        return (
          <g key={t} transform={`translate(${x} 256)`}>
            <path d="M0 0 V-150" stroke={INK} strokeWidth={8} strokeLinecap="round" />
            <path d={t === 0 ? 'M-3 -150 L-70 -126 L-3 -102 Z' : 'M3 -150 L70 -126 L3 -102 Z'} fill={TEAM_COLOURS[t]} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
            <text x={side(t) * 34} y={-120} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={22} fill={PAPER} stroke={INK} strokeWidth={5} paintOrder="stroke">
              {TEAM_NAMES[t]}
            </text>
          </g>
        );
      })}
      {/* The rope. */}
      <path d={`M-900 ${ropeY} H2100`} stroke={INK} strokeWidth={20} strokeLinecap="round" />
      <path d={`M-900 ${ropeY} H2100`} stroke={slippery ? '#FF9AA5' : '#D6A86A'} strokeWidth={11} />
      <path d={`M-900 ${ropeY} H2100`} stroke="#A8783F" strokeWidth={11} strokeDasharray="6 16" transform={`translate(${(marker * TRAVEL) % 22} 0)`} />
      {/* The pullers: each team lines up from the knot outwards, leaning back. */}
      {teams.slice(0, 2).map((ids, t) =>
        ids.map((id, i) => {
          const gap = Math.min(84, 470 / Math.max(1, ids.length - 1));
          const x = knot + side(t) * (100 + i * gap);
          return (
            <g key={id} transform={`translate(${x} 256) rotate(${side(t) * 11})`}>
              <PaperPawn avatar={avatars.get(id) ?? 0} size={Math.min(84, gap * 1.15)} facing={t === 0 ? 1 : -1} walking={pulling} phase={i * 0.13} />
            </g>
          );
        }),
      )}
      {/* The knot's ribbon. */}
      <g transform={`translate(${knot} ${ropeY})`}>
        <path d="M0 0 L-16 58 L0 48 L16 58 Z" fill="#FFD23F" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        <circle r={17} fill="#FFD23F" stroke={INK} strokeWidth={5} />
      </g>
    </svg>
  );
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as Data;
  const now = useServerNow(conn, 20);
  const seats = seatMap(view);
  const teams = mg.teams ?? [[], []];
  const slippery = inHazard(d.hazards, now);
  const started = now >= d.startAt;
  return (
    <div className="mg-host">
      <p className="mg-host-lead">{mg.stage === 'reveal' ? (d.winner === -1 ? 'A dead heat!' : `${TEAM_NAMES[d.winner ?? 0]} team wins!`) : !started ? 'Get ready to pull…' : slippery ? 'SLIPPERY! Stop tapping!' : 'PULL!'}</p>
      {started && mg.stage === 'play' && <PowerMeter power={d.power} />}
      <Arena
        marker={d.marker}
        teams={teams}
        avatars={new Map([...seats].map(([id, s]) => [id, s.avatar]))}
        pulling={started && mg.stage === 'play' && !slippery}
        slippery={slippery && mg.stage === 'play'}
      />
    </div>
  );
}

/**
 * The pad is judged on the phone: each tap is checked against the hazard windows by synced
 * time, so a slow stream can't make you tap into a hazard you haven't seen yet.
 */
function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as Data;
  const now = useServerNow(conn, 20);
  const gate = useRef(new MashGate());
  const [pulse, setPulse] = useState(0);
  // Pulls are counted here as they happen, so the counter never waits on the server.
  const [pulls, setPulls] = useState(0);
  const pending = useMashSender<{ good: number; bad: number }>(
    (b) => conn.intent({ type: 'mash', ...b }),
    () => ({ good: 0, bad: 0 }),
    (b) => !b.good && !b.bad,
  );
  const slippery = inHazard(d.hazards, now);
  const started = now >= d.startAt;

  const tap = (style: MashStyle, ts: number) => {
    const t = conn.serverNow();
    // One input style at a time (Space, or left click / one finger), up to 30 taps a second.
    if (t < d.startAt || !gate.current.accept(style, ts)) return;
    setPulse((x) => x + 1);
    if (inHazard(d.hazards, t)) pending.current.bad++;
    else {
      pending.current.good++;
      setPulls((n) => n + 1);
    }
  };
  useVirtualKeys((e) => {
    const style = e.down ? mashStyleOfKey(e) : null;
    if (style) tap(style, e.timeStamp);
  });

  const team = d.team ?? 0;
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2 style={{ color: TEAM_COLOURS[team] }}>{TEAM_NAMES[team]} team</h2>
        <span className="chip">{Math.max(pulls, d.myTaps ?? 0)} pulls</span>
        {started && <PowerMeter power={d.power} />}
      </div>
      <Rope marker={d.marker} slippery={slippery} />
      <button
        type="button"
        className="mash tug-pad"
        data-slippery={slippery}
        data-pulse={pulse % 2}
        disabled={!started}
        onPointerDown={(e) => isMashPointer(e) && tap('pointer', e.timeStamp)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="mash-label">{!started ? 'Ready…' : slippery ? 'STOP!' : 'PULL!'}</span>
      </button>
    </div>
  );
}

registerMinigameUi('tug-of-war', { Host, Player });
