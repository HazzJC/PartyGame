import { useEffect, useRef, useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { KeyHint, useDevice, useVirtualKeys, wantsOnScreenControls } from '../input/index.ts';
import { useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';

interface Data {
  target: number;
  startAt: number;
  visibleMs: number;
  closesAt: number;
  submitted?: string[];
  stops?: Record<string, number> | null;
  myStop?: number | null;
}

const secs = (ms: number) => (ms / 1000).toFixed(2);

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as Data;
  const seats = seatMap(view);
  const now = useServerNow(conn, 30);

  if (mg.stage === 'play' || !d.stops) {
    const elapsed = now - d.startAt;
    const clock = elapsed < 0 ? 'READY' : elapsed < d.visibleMs ? secs(elapsed) : '??.??';
    return (
      <div className="mg-host">
        <p className="mg-host-lead">
          Stop your clock at <b>{secs(d.target)} s</b>. It goes dark after 3 seconds. Go over and you bust!
        </p>
        <div className="sw-clock sticker" data-dark={elapsed >= d.visibleMs}>
          {elapsed < d.visibleMs && <span className="sw-hand" style={{ transform: `rotate(${Math.max(0, elapsed) * 0.036}deg)` }} />}
          <span className="sw-digits">{clock}</span>
        </div>
        <div className="submitted-row">
          {mg.participants.map((id) => {
            const s = seats.get(id);
            return s ? <Avatar key={id} avatar={s.avatar} size={56} dim={!d.submitted?.includes(id)} /> : null;
          })}
        </div>
      </div>
    );
  }

  // Reveal: everyone's stop on one timeline, the target line in the middle.
  const span = d.target + 1500;
  const x = (ms: number) => `${Math.min(100, (ms / span) * 100)}%`;
  const rows = [...mg.participants].sort((a, b) => (d.stops![a] ?? 1e9) - (d.stops![b] ?? 1e9));
  const start = (mg.revealEndsAt ?? 0) - 6500;
  return (
    <div className="mg-host">
      <p className="mg-host-lead">Target {secs(d.target)} s</p>
      <div className="sw-track sticker">
        <div className="sw-target" style={{ left: x(d.target) }}>
          <span>{secs(d.target)}</span>
        </div>
        {rows.map((id, i) => {
          const s = seats.get(id);
          const stop = d.stops![id];
          if (!s) return null;
          const visible = now >= start + 600 + i * 260;
          return (
            <div key={id} className="sw-row" style={{ top: `${(i / Math.max(1, rows.length)) * 88 + 4}%`, height: `${88 / Math.max(1, rows.length)}%` }}>
              {visible && (
                <div className="sw-marker" data-bust={stop === undefined || stop > d.target} style={{ left: stop === undefined ? '100%' : x(stop) }}>
                  <Avatar avatar={s.avatar} size={Math.min(52, 700 / rows.length)} />
                  <span className="sw-time">{stop === undefined ? 'no stop' : `${secs(stop)}`}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The clock is drawn here, from this device's frames, and the stop is measured from the frame
 * that started it: stream lag and network jitter can't change anyone's time.
 */
function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as Data;
  const device = useDevice();
  const clock = useRef<HTMLDivElement>(null);
  const startPaint = useRef(0);
  const [stopped, setStopped] = useState<number | null>(d.myStop ?? null);

  useEffect(() => {
    let raf = 0;
    const loop = (frame: number) => {
      const now = conn.serverNow();
      const el = clock.current;
      if (el) {
        if (now < d.startAt) {
          el.textContent = `${Math.ceil((d.startAt - now) / 1000)}`;
          el.dataset.state = 'wait';
        } else {
          if (!startPaint.current) startPaint.current = frame;
          const elapsed = frame - startPaint.current;
          el.dataset.state = elapsed < d.visibleMs ? 'run' : 'dark';
          el.textContent = elapsed < d.visibleMs ? secs(elapsed) : '??.??';
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [conn, d.startAt, d.visibleMs]);

  const stop = (ts: number) => {
    if (stopped !== null || !startPaint.current) return;
    const elapsed = Math.max(0, Math.round(ts - startPaint.current));
    setStopped(elapsed);
    conn.intent({ type: 'stop', elapsedMs: elapsed });
  };

  useVirtualKeys((e) => {
    if (e.down && !e.repeat && (e.key === 'confirm' || e.key === 'any' || e.key === 'char')) stop(e.timeStamp);
  }, stopped === null);

  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>Target {secs(d.target)} s</h2>
      </div>
      <div ref={clock} className="sw-player-clock sticker" data-state="wait" />
      {stopped === null ? (
        <button type="button" className="sw-stop" onPointerDown={(e) => stop(e.timeStamp)} onContextMenu={(e) => e.preventDefault()}>
          STOP
          {!wantsOnScreenControls(device) && <KeyHint k="Space" />}
        </button>
      ) : (
        <div className="sticker sw-stopped">
          You stopped at <b>{secs(stopped)} s</b>
        </div>
      )}
    </div>
  );
}

registerMinigameUi('stopwatch-chicken', { Host, Player });
