import { estimateStreamDelay } from '@partygame/engine';
import { useEffect, useRef, useState } from 'react';
import type { HostScreenProps } from '../host/registry.tsx';
import { CueSurface } from '../input/index.ts';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { eventServerTime, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './toys.css';

const FLASH_MS = 450;
const LOCAL_FLASHES = 3;

export function Star({ size }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 71 L21 92 L32 58 L4 38 L38 38 Z" fill="#FFD23F" stroke="#2B2233" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

/** Host side: flashes the star at the scheduled server times, drawn from the host's own synced clock. */
export function CalibrateHost({ conn, view }: HostScreenProps) {
  const now = useServerNow(conn, 60);
  const flashes = view.phase.flashes as number[];
  const on = flashes.some((f) => now >= f && now < f + FLASH_MS);
  const results = view.phase.results as Record<string, number | null>;
  const humans = view.seats.filter((s) => !s.isBot);
  const seen = flashes.filter((f) => now >= f).length;
  return (
    <div className="toy-host">
      <div className="toy-main">
        <h1>Stream check</h1>
        <p className="lead">
          Tap your phone every time the star lights up <b>here</b>. This measures how far behind the stream you are.
        </p>
        <div className="flash-star" data-on={on} data-flashes={flashes.join(',')}>
          {on ? (
            <Star />
          ) : (
            <span className="display" style={{ fontSize: 60, color: 'var(--ink-soft)' }}>
              {seen >= flashes.length ? 'Done!' : `${seen}/${flashes.length}`}
            </span>
          )}
        </div>
      </div>
      <div className="toy-list">
        <h2 style={{ fontSize: 44 }}>Delays</h2>
        {humans.map((s) => (
          <div key={s.id} className="sticker toy-row">
            <Avatar avatar={s.avatar} size={56} />
            <span className="grow">{s.name}</span>
            <span className="val">{s.id in results ? (results[s.id] === null ? 'skipped' : `${((results[s.id] ?? 0) / 1000).toFixed(1)} s`) : '…'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Step = 'stream' | 'local' | 'sent';

/** Player side: tap on stream flashes, then on local flashes; report the difference. */
export function CalibratePlayer({ conn, view }: PlayerScreenProps) {
  const flashes = view.phase.flashes as number[];
  const [step, setStep] = useState<Step>(view.phase.submitted ? 'sent' : 'stream');
  const taps = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const reactions = useRef<number[]>([]);
  const [round, setRound] = useState(0);
  const [localCue, setLocalCue] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const now = useServerNow(conn, 4);
  const last = flashes[flashes.length - 1] ?? 0;

  // Move on after enough taps, or once even a slow stream would have shown every flash.
  useEffect(() => {
    if (step === 'stream' && (tapCount >= flashes.length || now > last + 7000)) setStep('local');
  }, [step, tapCount, now, last, flashes.length]);

  useEffect(() => {
    if (step === 'local') setLocalCue(conn.serverNow() + 1200 + Math.random() * 1800);
  }, [step, round, conn]);

  const send = (delay: number | null) => {
    conn.intent({ type: 'cal.result', delayMs: delay });
    setResult(delay);
    setStep('sent');
  };

  if (step === 'sent' || view.phase.submitted)
    return (
      <div className="toy-player center">
        <h2>Your stream delay</h2>
        <div className="big-result">{((result ?? view.me.streamDelayMs) / 1000).toFixed(1)} s</div>
        <p className="muted" style={{ textAlign: 'center' }}>
          Results on your phone wait this long, so you never see a spoiler before the stream shows it.
        </p>
      </div>
    );

  if (step === 'local')
    return (
      <div className="toy-player">
        <h2>Now tap when THIS screen flashes</h2>
        <div className="dots">
          {Array.from({ length: LOCAL_FLASHES }, (_, i) => (
            <span key={i} data-on={i < reactions.current.length} />
          ))}
        </div>
        <CueSurface
          key={round}
          cues={[{ at: localCue, label: 'TAP!', real: true }]}
          serverNow={conn.serverNow}
          idleLabel="Watch this screen…"
          onResult={(r) => {
            if ('ms' in r) reactions.current.push(r.ms);
            setTimeout(() => {
              if (reactions.current.length >= LOCAL_FLASHES) send(estimateStreamDelay(flashes, taps.current, reactions.current));
              else setRound((n) => n + 1);
            }, 600);
          }}
        />
      </div>
    );

  return (
    <div className="toy-player">
      <h2>Tap when the star flashes on the shared screen</h2>
      <p className="muted">Look at the stream or TV, not your phone.</p>
      <div className="dots">
        {flashes.map((_, i) => (
          <span key={i} data-on={i < tapCount} />
        ))}
      </div>
      <div
        className="tap-pad"
        role="button"
        aria-label="Tap when you see the star"
        onPointerDown={(e) => {
          const t = eventServerTime(conn, e.timeStamp);
          if (t < flashes[0]! - 300) return;
          taps.current.push(t);
          setTapCount(taps.current.length);
        }}
      >
        TAP
      </div>
      <button className="btn white" onClick={() => send(0)}>
        Skip: I'm watching a TV in the room
      </button>
    </div>
  );
}
