import { useDevice, wantsOnScreenControls } from './device.ts';
import { useVirtualKeys, type VKey } from './keys.ts';

export interface SequenceChip {
  id: string;
  label: string;
  /** Virtual key that adds this chip from a keyboard/gamepad (e.g. 'up'). */
  vkey?: VKey;
}

/**
 * Program a fixed number of steps (Heist routes, Sumo moves). Tap/click chips to append, tap a
 * filled slot to clear it; keys map to chips, Backspace removes the last step.
 */
export function Sequence({ chips, steps, value, onChange, locked = false }: { chips: SequenceChip[]; steps: number; value: string[]; onChange: (v: string[]) => void; locked?: boolean }) {
  const device = useDevice();
  const keys = !wantsOnScreenControls(device);
  const add = (id: string) => {
    if (locked || value.length >= steps) return;
    onChange([...value, id]);
  };

  useVirtualKeys((e) => {
    if (!e.down || locked) return;
    if (e.key === 'back') return onChange(value.slice(0, -1));
    const chip = chips.find((c) => c.vkey === e.key);
    if (chip) add(chip.id);
  });

  const labelOf = (id: string) => chips.find((c) => c.id === id)?.label ?? id;
  return (
    <div className="seq">
      <ol className="seq-slots">
        {Array.from({ length: steps }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              className="seq-slot"
              data-filled={i < value.length}
              disabled={locked || i >= value.length}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={i < value.length ? `Step ${i + 1}: ${labelOf(value[i]!)}, tap to remove` : `Step ${i + 1}: empty`}
            >
              <span className="seq-n">{i + 1}</span>
              {i < value.length ? labelOf(value[i]!) : ''}
            </button>
          </li>
        ))}
      </ol>
      <div className="seq-chips">
        {chips.map((c) => (
          <button key={c.id} type="button" className="btn white" disabled={locked || value.length >= steps} onClick={() => add(c.id)}>
            {c.label}
          </button>
        ))}
        {keys && <span className="muted seq-help">Backspace removes the last step</span>}
      </div>
    </div>
  );
}
