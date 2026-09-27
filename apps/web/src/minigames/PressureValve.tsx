import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { KeyHint, useDevice, useVirtualKeys, wantsOnScreenControls } from '../input/index.ts';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import './minigames.css';
import './wave-e.css';

function Gauge({ pressure, band, big }: { pressure: number; band: [number, number]; big?: boolean }) {
  return (
    <div className={`valve-gauge ${big ? 'big' : ''}`}>
      <div className="valve-band" style={{ bottom: `${band[0]}%`, height: `${band[1] - band[0]}%` }} />
      <div className="valve-needle" style={{ bottom: `${pressure}%` }} data-ok={pressure >= band[0] && pressure <= band[1]}>
        <span>{pressure}</span>
      </div>
    </div>
  );
}

function Host({ conn, mg }: MgHostProps) {
  const d = mg.game as { pressure: number; band: [number, number]; startAt: number; fraction: number; history: number[] };
  const now = useServerNow(conn, 4);
  return (
    <div className="mg-host valve-host">
      <Gauge pressure={d.pressure} band={d.band} big />
      <div className="valve-side">
        <p className="mg-host-lead">{now < d.startAt ? 'Get ready…' : 'Keep it in the green!'}</p>
        <div className="valve-score sticker">
          In the green: <b>{Math.round(d.fraction * 100)}%</b>
        </div>
        <svg className="valve-history" viewBox="0 0 40 100" preserveAspectRatio="none">
          <rect x={0} y={100 - d.band[1]} width={40} height={d.band[1] - d.band[0]} fill="#c9f2dc" />
          <polyline points={d.history.map((v, i) => `${i},${100 - v}`).join(' ')} fill="none" stroke="#2B2233" strokeWidth={1.5} />
        </svg>
      </div>
    </div>
  );
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as { pressure: number; band: [number, number]; startAt: number; closesAt: number; cooldownUntil: number; fraction: number };
  const now = useServerNow(conn, 10);
  const device = useDevice();
  const ready = now >= d.startAt && d.cooldownUntil <= now;
  const cool = Math.max(0, Math.ceil((d.cooldownUntil - now) / 100) / 10);
  useVirtualKeys((e) => {
    if (!e.down || !ready) return;
    if (e.key === 'up') conn.intent({ type: 'pump' });
    if (e.key === 'down') conn.intent({ type: 'vent' });
  });
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>Hold the pressure</h2>
        <span className="chip">{Math.round(d.fraction * 100)}% green</span>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <div className="valve-row">
        <Gauge pressure={d.pressure} band={d.band} />
        <div className="valve-buttons">
          <button className="thumb green valve-btn" disabled={!ready} onClick={() => conn.intent({ type: 'pump' })}>
            Pump {!wantsOnScreenControls(device) && <KeyHint k="W" />}
          </button>
          <button className="thumb red valve-btn" disabled={!ready} onClick={() => conn.intent({ type: 'vent' })}>
            Vent {!wantsOnScreenControls(device) && <KeyHint k="S" />}
          </button>
          <span className="muted">{ready ? 'Ready' : cool > 0 ? `Cooling down ${cool.toFixed(1)} s` : 'Get ready…'}</span>
        </div>
      </div>
    </div>
  );
}

registerMinigameUi('pressure-valve', { Host, Player });
