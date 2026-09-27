import { useRef, useState } from 'react';
import { useDevice, wantsOnScreenControls } from './device.ts';
import { useVirtualKeys, type VKey } from './keys.ts';
import { KeyHint } from './Layout.tsx';

export interface ActionButton {
  id: string;
  label: string;
  /** Keyboard key shown in hints and matched against: "Space", "J", "K", "E", … */
  key: string;
  colour?: 'red' | 'blue' | 'green' | 'purple';
}

function matches(b: ActionButton, raw: string | undefined, vkey: VKey, index: number): boolean {
  if (b.key === 'Space') return raw === ' ';
  if (b.key === 'Enter') return raw === 'Enter';
  if (raw && raw.length === 1 && raw.toUpperCase() === b.key.toUpperCase()) return true;
  // Gamepad: first button is A (confirm), second is B (back).
  return (index === 0 && vkey === 'confirm' && !raw) || (index === 1 && vkey === 'back' && !raw);
}

/**
 * Thumb buttons with hold/release semantics. Reports down and up with the input's own timestamp,
 * so timing games can measure locally.
 */
export function Buttons({ buttons, onChange, big = false }: { buttons: ActionButton[]; onChange: (id: string, down: boolean, timeStamp: number) => void; big?: boolean }) {
  const device = useDevice();
  const onScreen = wantsOnScreenControls(device);
  const held = useRef(new Set<string>());
  const [pressed, setPressed] = useState<Record<string, boolean>>({});

  const set = (id: string, down: boolean, ts: number) => {
    if (down === held.current.has(id)) return;
    if (down) held.current.add(id);
    else held.current.delete(id);
    setPressed((p) => ({ ...p, [id]: down }));
    onChange(id, down, ts);
  };

  useVirtualKeys((e) => {
    if (e.repeat) return;
    buttons.forEach((b, i) => {
      if (matches(b, e.raw, e.key, i)) set(b.id, e.down, e.timeStamp);
    });
  });

  if (!onScreen)
    return (
      <div className="btn-hints">
        {buttons.map((b) => (
          <KeyHint key={b.id} k={b.key}>
            {b.label}
          </KeyHint>
        ))}
      </div>
    );

  return (
    <div className={`thumbs ${big ? 'big' : ''}`}>
      {buttons.map((b) => (
        <button
          key={b.id}
          type="button"
          className={`thumb ${b.colour ?? ''}`}
          data-pressed={!!pressed[b.id]}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            set(b.id, true, e.timeStamp);
          }}
          onPointerUp={(e) => set(b.id, false, e.timeStamp)}
          onPointerCancel={(e) => set(b.id, false, e.timeStamp)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
