import { useState } from 'react';
import { useDevice, wantsOnScreenControls } from './device.ts';
import { useVirtualKeys } from './keys.ts';

export interface AimParam {
  id: string;
  label: string;
  min: number;
  max: number;
  /** Identical step size on every device: the parity rule for aiming values. */
  step: number;
  unit?: string;
}

export type AimValues = Record<string, number>;

const clamp = (v: number, p: AimParam) => Math.min(p.max, Math.max(p.min, Math.round((v - p.min) / p.step) * p.step + p.min));

/**
 * Aiming values: a slider and − / + steppers per parameter. Keys: ↑ ↓ choose the row,
 * ← → nudge by one step (Shift for five). Values always snap to the same step grid.
 */
export function Aim({ params, values, onChange, locked = false }: { params: AimParam[]; values: AimValues; onChange: (v: AimValues) => void; locked?: boolean }) {
  const device = useDevice();
  const [row, setRow] = useState(0);
  const keysMode = !wantsOnScreenControls(device);

  const nudge = (i: number, steps: number) => {
    const p = params[i];
    if (!p || locked) return;
    onChange({ ...values, [p.id]: clamp((values[p.id] ?? p.min) + steps * p.step, p) });
  };

  useVirtualKeys((e) => {
    if (!e.down || locked) return;
    if (e.key === 'up') setRow((r) => (r - 1 + params.length) % params.length);
    if (e.key === 'down') setRow((r) => (r + 1) % params.length);
    if (e.key === 'left') nudge(row, e.shift ? -5 : -1);
    if (e.key === 'right') nudge(row, e.shift ? 5 : 1);
  });

  return (
    <div className="aim">
      {params.map((p, i) => {
        const v = values[p.id] ?? p.min;
        return (
          <div key={p.id} className="aim-row" data-active={keysMode && row === i} onPointerDown={() => setRow(i)}>
            <div className="aim-head">
              <span>{p.label}</span>
              <b>
                {Number.isInteger(p.step) ? v : v.toFixed(1)}
                {p.unit}
              </b>
            </div>
            <div className="aim-ctl">
              <button type="button" className="aim-step" onClick={() => nudge(i, -1)} disabled={locked || v <= p.min} aria-label={`Less ${p.label}`}>
                −
              </button>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={v}
                disabled={locked}
                onChange={(e) => onChange({ ...values, [p.id]: clamp(Number(e.target.value), p) })}
                aria-label={p.label}
                tabIndex={-1}
              />
              <button type="button" className="aim-step" onClick={() => nudge(i, 1)} disabled={locked || v >= p.max} aria-label={`More ${p.label}`}>
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
