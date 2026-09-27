import { useEffect, useRef, useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { TapLimiter, useVirtualKeys } from '../input/index.ts';
import { useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';

interface Hazard {
  at: number;
  until: number;
}

interface Data {
  marker: number;
  startAt: number;
  closesAt: number;
  hazards: Hazard[];
  winner?: number | null;
  team?: number;
  myTaps?: number;
}

export const TEAM_NAMES = ['Red', 'Blue', 'Green', 'Gold'];
export const TEAM_COLOURS = ['#FF4D5E', '#3D7BFF', '#2EC27E', '#FFB703'];

const inHazard = (hazards: Hazard[], t: number) => hazards.some((h) => t >= h.at && t < h.until);

function Rope({ marker, slippery }: { marker: number; slippery: boolean }) {
  return (
    <div className="tug-rope" data-slippery={slippery}>
      <div className="tug-zone left" />
      <div className="tug-zone right" />
      <div className="tug-knot" style={{ left: `${50 + marker * 46}%` }} />
    </div>
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
      <Rope marker={d.marker} slippery={slippery && mg.stage === 'play'} />
      <div className="tug-teams">
        {teams.slice(0, 2).map((t, i) => (
          <div key={i} className="tug-team sticker" style={{ ['--team' as string]: TEAM_COLOURS[i] }}>
            <h3>{TEAM_NAMES[i]}</h3>
            <div className="submitted-row">
              {t.map((id) => {
                const s = seats.get(id);
                return s ? <Avatar key={id} avatar={s.avatar} size={64} /> : null;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BATCH_MS = 250;

/**
 * The pad is judged on the phone: each tap is checked against the hazard windows by synced
 * time, so a slow stream can't make you tap into a hazard you haven't seen yet.
 */
function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as Data;
  const now = useServerNow(conn, 20);
  const limiter = useRef(new TapLimiter());
  const pending = useRef({ good: 0, bad: 0 });
  const [pulse, setPulse] = useState(0);
  const slippery = inHazard(d.hazards, now);
  const started = now >= d.startAt;

  useEffect(() => {
    const t = setInterval(() => {
      const { good, bad } = pending.current;
      if (good || bad) conn.intent({ type: 'mash', good, bad });
      pending.current = { good: 0, bad: 0 };
    }, BATCH_MS);
    return () => clearInterval(t);
  }, [conn]);

  const tap = (ts: number) => {
    const t = conn.serverNow();
    if (t < d.startAt || !limiter.current.accept(ts)) return;
    setPulse((x) => x + 1);
    if (inHazard(d.hazards, t)) pending.current.bad++;
    else pending.current.good++;
  };
  useVirtualKeys((e) => {
    if (e.down && !e.repeat) tap(e.timeStamp);
  });

  const team = d.team ?? 0;
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2 style={{ color: TEAM_COLOURS[team] }}>{TEAM_NAMES[team]} team</h2>
        <span className="chip">{d.myTaps ?? 0} pulls</span>
      </div>
      <Rope marker={d.marker} slippery={slippery} />
      <button
        type="button"
        className="mash tug-pad"
        data-slippery={slippery}
        data-pulse={pulse % 2}
        disabled={!started}
        onPointerDown={(e) => tap(e.timeStamp)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="mash-label">{!started ? 'Ready…' : slippery ? 'STOP!' : 'PULL!'}</span>
      </button>
    </div>
  );
}

registerMinigameUi('tug-of-war', { Host, Player });
