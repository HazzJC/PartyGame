import { useRef, useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { isMashPointer, MashGate, mashStyleOfKey, useMashSender, useVirtualKeys, type MashStyle } from '../input/index.ts';
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
      {started && mg.stage === 'play' && <PowerMeter power={d.power} />}
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
