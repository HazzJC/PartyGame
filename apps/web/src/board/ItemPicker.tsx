import type { BoardDef, PlayerView } from '@partygame/engine';
import { ITEMS, type ItemId } from '@partygame/shared';
import { useState } from 'react';
import type { Connection } from '../net/connection.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { BoardSvg } from './BoardSvg.tsx';

export interface ItemUseView {
  item: ItemId;
  target?: string;
  space?: number;
}

/** Item icons drawn as simple glyph stickers (no emoji, so every phone renders them the same). */
export const ITEM_GLYPH: Record<ItemId, string> = {
  doubleRoll: '⚄⚄',
  warp: '↯',
  swap: '⇄',
  steal: '✋',
  starDiscount: '%',
  trap: '⚠',
  duelTicket: 'VS',
};

export function ItemChip({ item, onClick, active, disabled }: { item: ItemId; onClick?: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className="item-chip" aria-pressed={active} onClick={onClick} disabled={disabled} title={ITEMS[item].text}>
      <span className="item-glyph">{ITEM_GLYPH[item]}</span>
      <span>{ITEMS[item].name}</span>
    </button>
  );
}

/**
 * Secret item choice during the roll step: tap an item, pick a player or a space if it needs one.
 * Nothing is revealed until everyone's roll is locked in.
 */
export function ItemPicker({ conn, view, hand, use, def, position, stars, targets }: { conn: Connection<PlayerView>; view: PlayerView; hand: ItemId[]; use: ItemUseView | null; def: BoardDef; position: number; stars: number[]; targets?: { id: string; name: string; avatar: number }[] }) {
  const [picking, setPicking] = useState<ItemId | null>(null);
  if (hand.length === 0) return null;
  const send = (u: ItemUseView | null) => {
    conn.intent(u ? { type: 'useItem', ...u } : { type: 'useItem', item: null });
    setPicking(null);
  };
  // Other board pieces: players, or the other teams in team board mode.
  const others = targets ?? view.seats.filter((s) => s.id !== view.me.id);
  const name = (id?: string) => others.find((s) => s.id === id)?.name ?? '';

  if (picking && ITEMS[picking].target === true)
    return (
      <div className="item-pick panel">
        <h3>{ITEMS[picking].name}: pick a target</h3>
        <div className="item-targets">
          {others.map((s) => (
              <button key={s.id} type="button" className="item-target" onClick={() => send({ item: picking, target: s.id })}>
                <Avatar avatar={s.avatar} size={40} />
                {s.name}
              </button>
            ))}
        </div>
        <button className="btn white small" onClick={() => setPicking(null)}>
          Back
        </button>
      </div>
    );

  if (picking === 'trap') {
    const me = def.nodes[position]!;
    const focus = { x: me.x - 360, y: me.y - 240, w: 720, h: 480 };
    return (
      <div className="item-pick panel">
        <h3>Hide a trap: tap a space</h3>
        <BoardSvg className="bp-map trap-map" def={def} stars={stars} focus={focus} highlights={[{ nodes: [position], colour: '#FFD23F' }]} onNodeClick={(id) => send({ item: 'trap', space: id })} />
        <button className="btn white small" onClick={() => setPicking(null)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="item-hand">
      <span className="muted">{use ? 'Using (secret):' : 'Your items:'}</span>
      {use ? (
        <>
          <ItemChip item={use.item} active />
          {use.target && <span className="chip">→ {name(use.target)}</span>}
          <button className="btn white small" onClick={() => send(null)}>
            Cancel
          </button>
        </>
      ) : (
        hand.map((item, i) => (
          <ItemChip
            key={`${item}${i}`}
            item={item}
            onClick={() => (ITEMS[item].target ? setPicking(item) : send({ item }))}
          />
        ))
      )}
    </div>
  );
}
