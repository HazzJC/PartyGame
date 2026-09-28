import { useEffect, useRef, useState } from 'react';
import { useDevice, wantsOnScreenControls } from './device.ts';
import { useVirtualKeys } from './keys.ts';
import { isMashPointer, MashGate, mashStyleOfKey, type MashStyle } from './tapLimiter.ts';

const BATCH_MS = 250;

/**
 * Taps are counted on this device the moment they happen (the pad and its counter react
 * instantly, never waiting on the server) and sent in the background in small batches, with a
 * final send when the pad goes away so no taps are lost at the buzzer.
 */
export function useMashSender<T>(send: (batch: T) => void, empty: () => T, isEmpty: (b: T) => boolean) {
  const pending = useRef<T>(empty());
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    const flush = () => {
      if (isEmpty(pending.current)) return;
      sendRef.current(pending.current);
      pending.current = empty();
    };
    const t = setInterval(flush, BATCH_MS);
    return () => {
      clearInterval(t);
      flush();
    };
    // Only mount and unmount matter: the helpers are pure and `send` is read through a ref.
  }, []);
  return pending;
}

/**
 * Mash pad: tap or left-click the pad, or press Space (or a pad's A button). Taps count from one
 * of those styles at a time, up to 30 a second (see MashGate), and the count shows immediately.
 */
export function Mash({ onMash, disabled = false, label = 'TAP!', showCount = true }: { onMash: (count: number) => void; disabled?: boolean; label?: string; showCount?: boolean }) {
  const device = useDevice();
  const gate = useRef(new MashGate());
  const [pulse, setPulse] = useState(0);
  const [count, setCount] = useState(0);
  const pending = useMashSender<number>(onMash, () => 0, (n) => n === 0);

  const tap = (style: MashStyle, ts: number) => {
    if (disabled || !gate.current.accept(style, ts)) return;
    setPulse((p) => p + 1);
    pending.current++;
    setCount((c) => c + 1);
  };

  useVirtualKeys((e) => {
    const style = e.down ? mashStyleOfKey(e) : null;
    if (style) tap(style, e.timeStamp);
  }, !disabled);

  return (
    <button
      type="button"
      className="mash"
      disabled={disabled}
      onPointerDown={(e) => isMashPointer(e) && tap('pointer', e.timeStamp)}
      onContextMenu={(e) => e.preventDefault()}
      data-pulse={pulse % 2}
    >
      <span className="mash-label">{label}</span>
      {showCount && (
        <span className="mash-count" key={count}>
          {count}
        </span>
      )}
      {!wantsOnScreenControls(device) && <span className="mash-sub">Space or click, one at a time</span>}
    </button>
  );
}
