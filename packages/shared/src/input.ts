/**
 * Declared input needs of a phase or mini game. The player screen picks the best presentation
 * for each device, and rules cards are generated from these so every player sees *their* controls.
 */
export type InputSpec =
  | { kind: 'pick'; what?: string }
  | { kind: 'direction'; mode: '4' | '8' | 'analog'; what?: string }
  | { kind: 'buttons'; buttons: { id: string; label: string; key: string }[] }
  | { kind: 'mash'; what?: string }
  | { kind: 'timing'; what?: string; release?: boolean }
  | { kind: 'aim'; what?: string }
  | { kind: 'grid'; rotate?: boolean; what?: string }
  | { kind: 'sequence'; steps: number; what?: string }
  | { kind: 'text'; what?: string }
  | { kind: 'draw'; what?: string }
  | { kind: 'rotate'; what?: string }
  | { kind: 'vote'; what?: string }
  | { kind: 'rank'; what?: string };

export type ControlScheme = 'touch' | 'keys' | 'gamepad';

export interface ControlLine {
  /** Short verb phrase, e.g. "Aim". */
  action: string;
  /** How to do it on this scheme, e.g. "Drag the arrow" / "← → then Space". */
  how: string;
}

/** Human-readable controls for one input on one control scheme. */
export function describeInput(spec: InputSpec, scheme: ControlScheme): ControlLine[] {
  const t = scheme === 'touch';
  const g = scheme === 'gamepad';
  switch (spec.kind) {
    case 'pick':
      return [{ action: spec.what ?? 'Pick', how: t ? 'Tap your choice' : g ? 'D-pad, then A' : 'Click it, or press its number' }];
    case 'direction':
      return [{ action: spec.what ?? 'Move', how: t ? (spec.mode === 'analog' ? 'Drag the joystick' : 'Hold the d-pad') : g ? 'Left stick' : 'WASD or arrow keys' }];
    case 'buttons':
      return spec.buttons.map((b) => ({ action: b.label, how: t ? `Tap ${b.label}` : g ? (b.key === 'Space' ? 'A' : 'B') : b.key }));
    case 'mash':
      return [{ action: spec.what ?? 'Mash', how: t ? 'Tap the pad fast' : g ? 'Any button, fast' : 'Any key, fast' }];
    case 'timing':
      return [{ action: spec.what ?? 'React', how: spec.release ? (t ? 'Hold, let go on the cue' : 'Hold Space, let go on the cue') : t ? 'Tap on the cue' : g ? 'A on the cue' : 'Space or click on the cue' }];
    case 'aim':
      return [{ action: spec.what ?? 'Aim', how: t ? 'Drag the sliders or tap − / +' : g ? 'Stick, then A' : '↑ ↓ to choose, ← → to adjust' }];
    case 'grid':
      return [
        { action: spec.what ?? 'Place', how: t ? 'Tap a cell (pinch to zoom)' : g ? 'D-pad, then A' : 'Click a cell, or arrows + Enter' },
        ...(spec.rotate ? [{ action: 'Rotate', how: t ? 'Tap ⟳' : g ? 'B' : 'R' }] : []),
      ];
    case 'sequence':
      return [{ action: spec.what ?? `Plan ${spec.steps} moves`, how: t ? 'Tap moves to add, tap a slot to remove' : g ? 'D-pad adds, B removes' : 'Arrow keys add, Backspace removes' }];
    case 'text':
      return [{ action: spec.what ?? 'Answer', how: t ? 'Type, then Send' : 'Type, then Enter' }];
    case 'draw':
      return [{ action: spec.what ?? 'Draw', how: t ? 'Draw with your finger' : 'Draw with the mouse' }];
    case 'rotate':
      return [{ action: spec.what ?? 'Turn', how: t ? 'Drag around the ring' : g ? 'Left stick' : 'A / D, or point with the mouse' }];
    case 'vote':
      return [{ action: spec.what ?? 'Vote', how: t ? 'Tap your pick' : 'Click, or press its number' }];
    case 'rank':
      return [{ action: spec.what ?? 'Rank', how: t ? 'Drag to reorder, or tap ▲ ▼' : 'Click ▲ ▼, or Shift + ↑ ↓' }];
  }
}

export function describeInputs(specs: InputSpec[], scheme: ControlScheme): ControlLine[] {
  return specs.flatMap((s) => describeInput(s, scheme));
}
