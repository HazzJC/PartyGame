import { useEffect, useRef, useState } from 'react';
import { useDevice, wantsOnScreenControls } from './device.ts';
import { useVirtualKeys } from './keys.ts';
import { TapLimiter } from './tapLimiter.ts';

const BATCH_MS = 250;


/**
 * Mash pad: tap anywhere on the pad, or any key / button. Counted taps are capped and sent in
 * small batches so mashing doesn't flood the network.
 */
export function Mash({ onMash, disabled = false, label = 'TAP!' }: { onMash: (count: number) => void; disabled?: boolean; label?: string }) {
  const device = useDevice();
  const limiter = useRef(new TapLimiter());
  const pending = useRef(0);
  const [pulse, setPulse] = useState(0);
  const onMashRef = useRef(onMash);
  onMashRef.current = onMash;

  useEffect(() => {
    const t = setInterval(() => {
      if (pending.current > 0) {
        onMashRef.current(pending.current);
        pending.current = 0;
      }
    }, BATCH_MS);
    return () => clearInterval(t);
  }, []);

  const tap = (ts: number) => {
    if (disabled) return;
    setPulse((p) => p + 1);
    if (limiter.current.accept(ts)) pending.current++;
  };

  useVirtualKeys((e) => {
    if (e.down && !e.repeat) tap(e.timeStamp);
  }, !disabled);

  return (
    <button
      type="button"
      className="mash"
      disabled={disabled}
      onPointerDown={(e) => tap(e.timeStamp)}
      onContextMenu={(e) => e.preventDefault()}
      data-pulse={pulse % 2}
    >
      <span className="mash-label">{label}</span>
      {!wantsOnScreenControls(device) && <span className="mash-sub">any key</span>}
    </button>
  );
}
