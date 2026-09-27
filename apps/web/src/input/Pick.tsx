import { useState, type ReactNode } from 'react';
import { useDevice, wantsOnScreenControls } from './device.ts';
import { useVirtualKeys } from './keys.ts';

export interface PickOption {
  id: string;
  label: ReactNode;
  /** Small caption under the label. */
  sub?: ReactNode;
  disabled?: boolean;
  colour?: string;
}

const KEY_LABELS = '1234567890QWERTYUIOP';

/**
 * Secret pick: big tiles laid out in an auto grid. Tap/click, number or letter keys, or arrows +
 * Enter / gamepad d-pad + A. Emits the chosen id; the game decides whether picks can change.
 */
export function Pick({
  options,
  selected,
  onPick,
  columns,
  locked = false,
}: {
  options: PickOption[];
  /** One id, or several for multi-select pickers (e.g. search three zones). */
  selected?: string | string[] | null;
  onPick: (id: string) => void;
  columns?: number;
  locked?: boolean;
}) {
  const device = useDevice();
  const [cursor, setCursor] = useState(0);
  const cols = columns ?? (options.length <= 4 ? 2 : options.length <= 9 ? 3 : options.length <= 16 ? 4 : 5);
  const showKeys = !wantsOnScreenControls(device);

  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled || locked) return;
    onPick(o.id);
  };

  useVirtualKeys((e) => {
    if (!e.down || locked) return;
    if (e.key === 'digit' || e.key === 'char') {
      const i = KEY_LABELS.indexOf((e.raw ?? '').toUpperCase());
      if (i >= 0 && i < options.length) {
        setCursor(i);
        choose(i);
      }
      return;
    }
    const n = options.length;
    if (e.key === 'left') setCursor((c) => (c - 1 + n) % n);
    if (e.key === 'right') setCursor((c) => (c + 1) % n);
    if (e.key === 'up') setCursor((c) => (c - cols + n) % n);
    if (e.key === 'down') setCursor((c) => (c + cols) % n);
    if (e.key === 'confirm') choose(cursor);
  });

  return (
    <div className="pick" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="radiogroup">
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={Array.isArray(selected) ? selected.includes(o.id) : selected === o.id}
          className="pick-tile"
          data-cursor={showKeys && cursor === i}
          disabled={o.disabled || (locked && (Array.isArray(selected) ? !selected.includes(o.id) : selected !== o.id))}
          onClick={() => {
            setCursor(i);
            choose(i);
          }}
          style={o.colour ? { ['--tile' as string]: o.colour } : undefined}
        >
          {showKeys && i < KEY_LABELS.length && <kbd className="pick-key">{KEY_LABELS[i]}</kbd>}
          <span className="pick-label">{o.label}</span>
          {o.sub && <span className="pick-sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}
