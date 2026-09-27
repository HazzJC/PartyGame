import { describeInputs, type InputSpec } from '@partygame/shared';
import type { ReactNode } from 'react';
import { controlScheme, useDevice, wantsOnScreenControls } from './device.ts';
import './input.css';

/**
 * Responsive game surface: a stage region plus an optional control dock. Portrait phones stack
 * the dock under the stage (thumb reach); landscape phones split it left/right like a handheld;
 * keyboard players get a key-legend strip instead of on-screen controls.
 */
export function GameLayout({
  stage,
  dockLeft,
  dockRight,
  dock,
  legend,
}: {
  stage: ReactNode;
  /** Landscape: left thumb (usually direction). Portrait: first in the dock row. */
  dockLeft?: ReactNode;
  /** Landscape: right thumb (usually buttons). */
  dockRight?: ReactNode;
  /** Controls that don't split by thumb (sliders, pads). */
  dock?: ReactNode;
  /** Key hints shown to keyboard/gamepad players. */
  legend?: ReactNode;
}) {
  const device = useDevice();
  const onScreen = wantsOnScreenControls(device);
  const hasDock = !!(dockLeft || dockRight || dock);
  return (
    <div className="gl" data-size={device.size} data-onscreen={onScreen} data-dock={hasDock}>
      {hasDock && device.size === 'phone-landscape' && onScreen && <div className="gl-left">{dockLeft}</div>}
      <div className="gl-stage">{stage}</div>
      {hasDock && device.size === 'phone-landscape' && onScreen ? (
        <div className="gl-right">
          {dock}
          {dockRight}
        </div>
      ) : (
        hasDock && (
          <div className="gl-dock">
            {dockLeft}
            {dock}
            {dockRight}
          </div>
        )
      )}
      {!onScreen && legend && <div className="gl-legend">{legend}</div>}
    </div>
  );
}

export function KeyHint({ k, children }: { k: string; children?: ReactNode }) {
  return (
    <span className="keyhint">
      <kbd>{k}</kbd>
      {children && <span>{children}</span>}
    </span>
  );
}

/** Shows the controls for this device, generated from the game's declared inputs. */
export function ControlsCard({ inputs, compact = false }: { inputs: InputSpec[]; compact?: boolean }) {
  const device = useDevice();
  const lines = describeInputs(inputs, controlScheme(device));
  return (
    <ul className={`controls-card ${compact ? 'compact' : ''}`}>
      {lines.map((l, i) => (
        <li key={i}>
          <b>{l.action}</b>
          <span>{l.how}</span>
        </li>
      ))}
    </ul>
  );
}

/** iOS can't lock orientation, so games that want landscape ask nicely and fall back to compact. */
export function OrientationHint({ want, children }: { want: 'landscape' | 'portrait'; children: ReactNode }) {
  const device = useDevice();
  const isPhone = device.size === 'phone-portrait' || device.size === 'phone-landscape';
  const wrong = isPhone && (want === 'landscape' ? device.size === 'phone-portrait' : device.size === 'phone-landscape');
  return (
    <>
      {wrong && (
        <div className="orient-hint" role="status">
          <span className="orient-phone" data-want={want} aria-hidden />
          Rotate your phone for a bigger view
        </div>
      )}
      {children}
    </>
  );
}
