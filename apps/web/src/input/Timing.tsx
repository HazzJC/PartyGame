import { useEffect, useRef } from 'react';
import { useVirtualKeys } from './keys.ts';

export interface TimedCue {
  /** Server time to draw the cue. */
  at: number;
  label: string;
  /** Fake-outs are false; reacting to one is a false start. */
  real: boolean;
}

export type CueResult = { ms: number } | { falseStart: true };

const FAKE_SHOW_MS = 550;
/** Matches MIN_REACTION_MS on the server. */
const MIN_HUMAN_MS = 100;

/**
 * Local timed cue. The cue is drawn on this device at the scheduled server time (never read off
 * the delayed host stream), and the reaction is measured here: input event timestamp minus the
 * timestamp of the frame that first showed the cue. Only the result is sent.
 *
 * The surface writes to the DOM directly from requestAnimationFrame so React rendering never adds
 * latency between the cue time and the paint.
 */
export function CueSurface({
  cues,
  serverNow,
  onResult,
  done = false,
  mode = 'tap',
  idleLabel = 'Wait for it…',
}: {
  cues: TimedCue[];
  serverNow: () => number;
  onResult: (r: CueResult) => void;
  /** True once this player has a result (surface stops listening). */
  done?: boolean;
  /** 'release': hold first, let go on the cue (Quick Draw's holster). */
  mode?: 'tap' | 'release';
  idleLabel?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const state = useRef({ realPaintTs: 0, fakeUntil: 0, sent: false, holding: false });
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const key = cues.map((c) => c.at).join(',');

  useEffect(() => {
    state.current = { realPaintTs: 0, fakeUntil: 0, sent: done, holding: false };
    const node = el.current;
    const text = label.current;
    if (!node || !text) return;
    node.dataset.cue = 'idle';
    text.textContent = mode === 'release' && !done ? 'Hold here' : idleLabel;
    const pending = [...cues].sort((a, b) => a.at - b.at);
    let raf = 0;
    const loop = (frameTs: number) => {
      const now = serverNow();
      while (pending.length && pending[0]!.at <= now) {
        const cue = pending.shift()!;
        if (cue.real) {
          // The frame timestamp of the first frame that draws the cue.
          state.current.realPaintTs = frameTs;
          node.dataset.cue = 'go';
          text.textContent = cue.label;
        } else {
          state.current.fakeUntil = frameTs + FAKE_SHOW_MS;
          node.dataset.cue = 'fake';
          text.textContent = cue.label;
        }
      }
      if (!state.current.realPaintTs && node.dataset.cue === 'fake' && frameTs > state.current.fakeUntil) {
        node.dataset.cue = 'idle';
        text.textContent = mode === 'release' ? (state.current.holding ? 'Steady…' : 'Hold here') : idleLabel;
      }
      if (pending.length || !state.current.realPaintTs) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [key, done]);

  const act = (timeStamp: number) => {
    const s = state.current;
    if (s.sent) return;
    s.sent = true;
    if (!s.realPaintTs) {
      el.current!.dataset.cue = 'early';
      label.current!.textContent = 'Too early!';
      onResultRef.current({ falseStart: true });
      return;
    }
    const ms = Math.max(0, Math.round(timeStamp - s.realPaintTs));
    // Mirror the server's rule so the phone never shows a time the server will reject.
    el.current!.dataset.cue = ms < MIN_HUMAN_MS ? 'early' : 'hit';
    label.current!.textContent = ms < MIN_HUMAN_MS ? 'Too early!' : `${ms} ms`;
    onResultRef.current({ ms });
  };

  const press = (ts: number) => {
    if (mode === 'release') {
      state.current.holding = true;
      if (!state.current.realPaintTs && el.current?.dataset.cue === 'idle') label.current!.textContent = 'Steady…';
    } else act(ts);
  };
  const release = (ts: number) => {
    if (mode !== 'release' || !state.current.holding) return;
    state.current.holding = false;
    act(ts);
  };

  useVirtualKeys(
    (e) => {
      if (e.repeat) return;
      if (e.down) press(e.timeStamp);
      else release(e.timeStamp);
    },
    !done,
  );

  return (
    <div
      ref={el}
      className="cue-surface"
      data-cue="idle"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        press(e.timeStamp);
      }}
      onPointerUp={(e) => release(e.timeStamp)}
      onPointerCancel={(e) => release(e.timeStamp)}
      onContextMenu={(e) => e.preventDefault()}
      role="button"
      aria-label="Reaction pad"
    >
      <span ref={label} className="cue-label" />
    </div>
  );
}
