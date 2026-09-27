import { useEffect, useRef, useState } from 'react';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { useVirtualKeys } from '../input/index.ts';
import { median } from '../timing/median.ts';
import { useServerNow } from '../timing/clock.tsx';
import { TEAM_COLOURS, TEAM_NAMES } from './TugOfWar.tsx';
import './minigames.css';
import './wave-d.css';

interface Data {
  startAt: number;
  period: number;
  practice: number;
  beats: number;
  closesAt: number;
  timing?: number[];
  team?: number;
  scored?: number;
}

function Host({ conn, mg }: MgHostProps) {
  const d = mg.game as Data;
  const now = useServerNow(conn, 30);
  const k = Math.floor((now - d.startAt) / d.period);
  const flash = now >= d.startAt && (now - d.startAt) % d.period < 160;
  const timing = d.timing ?? [];
  const best = Math.min(...timing);
  return (
    <div className="mg-host">
      <p className="mg-host-lead">{now < d.startAt ? 'Get ready to tap on the beat…' : k < d.practice ? `Practice beat ${k + 1}/${d.practice}` : k < d.practice + d.beats ? `Beat ${k - d.practice + 1}/${d.beats}` : 'Done!'}</p>
      <div className="pulse-orb" data-flash={flash} />
      <div className="pulse-teams">
        {timing.map((t, i) => (
          <div key={i} className="pulse-team sticker" data-best={t === best && mg.stage === 'reveal'} style={{ ['--team' as string]: TEAM_COLOURS[i] }}>
            <b>{TEAM_NAMES[i]}</b>
            <span>{t >= 300 ? '–' : `${Math.round(t)} ms off`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The beat is drawn from this phone's own frames at the scheduled server times, and each tap is
 * compared with the beat locally. Practice beats measure this device's usual lag, which is then
 * subtracted, so a slow touchscreen isn't penalised for being a touchscreen.
 */
function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as Data;
  const orb = useRef<HTMLDivElement>(null);
  const practice = useRef<number[]>([]);
  const tapped = useRef(new Set<number>());
  const [label, setLabel] = useState('Get ready…');
  const [last, setLast] = useState<number | null>(null);

  const beatLocal = (k: number) => d.startAt + k * d.period - conn.clock.offset - performance.timeOrigin;

  useEffect(() => {
    let raf = 0;
    const loop = (frame: number) => {
      const t = frame - beatLocal(0);
      const el = orb.current;
      if (el) el.dataset.flash = String(t >= 0 && t % d.period < 140 && t < (d.practice + d.beats) * d.period);
      const k = Math.floor(t / d.period);
      setLabel(t < 0 ? 'Get ready…' : k < d.practice ? `Practice ${k + 1}/${d.practice}: tap with the flash` : k < d.practice + d.beats ? `Beat ${k - d.practice + 1}/${d.beats}` : 'Done!');
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // beatLocal depends on the live clock offset, read each frame.
  }, [d.startAt, d.period, d.practice, d.beats]);

  const tap = (ts: number) => {
    const k = Math.round((ts - beatLocal(0)) / d.period);
    if (k < 0 || k >= d.practice + d.beats || tapped.current.has(k)) return;
    tapped.current.add(k);
    const err = ts - beatLocal(k);
    if (k < d.practice) {
      practice.current.push(err);
      return;
    }
    const bias = practice.current.length ? median(practice.current) : 0;
    const corrected = Math.round(Math.abs(err - bias));
    setLast(corrected);
    conn.intent({ type: 'pulse', beat: k - d.practice, errorMs: corrected });
  };

  useVirtualKeys((e) => {
    if (e.down && !e.repeat) tap(e.timeStamp);
  });

  const team = d.team ?? 0;
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2 style={{ color: TEAM_COLOURS[team] }}>{TEAM_NAMES[team]} team</h2>
        {last !== null && <span className="chip">{last} ms off</span>}
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {label}
      </p>
      <div ref={orb} className="pulse-pad" data-flash="false" role="button" aria-label="Tap on the beat" onPointerDown={(e) => tap(e.timeStamp)}>
        <span>TAP</span>
      </div>
    </div>
  );
}

registerMinigameUi('synchronised-pulse', { Host, Player });
