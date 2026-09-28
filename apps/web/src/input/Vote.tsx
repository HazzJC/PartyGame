import { useRef, useState, type ReactNode } from 'react';
import { ArrowIcon } from './ArrowIcon.tsx';
import { useDevice, wantsOnScreenControls } from './device.ts';
import { useVirtualKeys } from './keys.ts';

export interface VoteItem {
  id: string;
  label: ReactNode;
  disabled?: boolean;
}

/** A vertical list of choices (vote for a player, an answer…). Number keys pick directly. */
export function Vote({ items, selected, onVote, locked = false }: { items: VoteItem[]; selected?: string | null; onVote: (id: string) => void; locked?: boolean }) {
  const device = useDevice();
  const keys = !wantsOnScreenControls(device);
  const [cursor, setCursor] = useState(0);
  useVirtualKeys((e) => {
    if (!e.down || locked) return;
    if (e.key === 'digit') {
      const i = e.raw === '0' ? 9 : Number(e.raw) - 1;
      const item = items[i];
      if (item && !item.disabled) onVote(item.id);
    }
    if (e.key === 'up') setCursor((c) => Math.max(0, c - 1));
    if (e.key === 'down') setCursor((c) => Math.min(items.length - 1, c + 1));
    if (e.key === 'confirm' && items[cursor] && !items[cursor]!.disabled) onVote(items[cursor]!.id);
  });
  return (
    <ul className="vote">
      {items.map((it, i) => (
        <li key={it.id}>
          <button type="button" className="vote-item" aria-pressed={selected === it.id} data-cursor={keys && cursor === i} disabled={it.disabled || (locked && selected !== it.id)} onClick={() => onVote(it.id)}>
            {keys && i < 10 && <kbd>{(i + 1) % 10}</kbd>}
            <span>{it.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Rank items by dragging (touch or mouse) or with ▲ ▼ buttons; Shift + ↑ ↓ moves the focused item
 * on a keyboard. Emits the full order after every change.
 */
export function Rank({ items, order, onChange, locked = false }: { items: VoteItem[]; order: string[]; onChange: (order: string[]) => void; locked?: boolean }) {
  const [cursor, setCursor] = useState(0);
  const drag = useRef<{ id: string; startY: number; rowH: number } | null>(null);
  const [dragDy, setDragDy] = useState(0);
  const byId = new Map(items.map((i) => [i.id, i]));

  const move = (from: number, to: number) => {
    if (locked || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    onChange(next);
  };

  useVirtualKeys((e) => {
    if (!e.down || locked) return;
    if (e.key === 'up') {
      if (e.shift) move(cursor, cursor - 1);
      setCursor((c) => Math.max(0, c - 1));
    }
    if (e.key === 'down') {
      if (e.shift) move(cursor, cursor + 1);
      setCursor((c) => Math.min(order.length - 1, c + 1));
    }
  });

  return (
    <ol className="rank">
      {order.map((id, i) => {
        const dragging = drag.current?.id === id;
        return (
          <li
            key={id}
            className="rank-item"
            data-cursor={cursor === i}
            data-dragging={dragging}
            style={dragging ? { transform: `translateY(${dragDy}px)` } : undefined}
            onPointerDown={(e) => {
              if (locked || (e.target as HTMLElement).closest('button')) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { id, startY: e.clientY, rowH: (e.currentTarget as HTMLElement).offsetHeight + 8 };
              setCursor(i);
              setDragDy(0);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.id !== id) return;
              const dy = e.clientY - d.startY;
              const shift = Math.round(dy / d.rowH);
              if (shift !== 0) {
                const to = Math.max(0, Math.min(order.length - 1, i + shift));
                if (to !== i) {
                  move(i, to);
                  d.startY += (to - i) * d.rowH;
                  setCursor(to);
                }
              }
              setDragDy(e.clientY - d.startY);
            }}
            onPointerUp={() => {
              drag.current = null;
              setDragDy(0);
            }}
            onPointerCancel={() => {
              drag.current = null;
              setDragDy(0);
            }}
          >
            <span className="rank-n">{i + 1}</span>
            <span className="rank-label">{byId.get(id)?.label ?? id}</span>
            <span className="rank-arrows">
              <button type="button" onClick={() => move(i, i - 1)} disabled={locked || i === 0} aria-label="Move up">
                <ArrowIcon dir="up" size={24} />
              </button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={locked || i === order.length - 1} aria-label="Move down">
                <ArrowIcon dir="down" size={24} />
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
