import { ITEMS, type ItemId } from '@partygame/shared';
import { ItemChip, ITEM_GLYPH } from '../board/ItemPicker.tsx';
import type { Connection } from '../net/connection.ts';
import { Countdown } from '../timing/clock.tsx';
import { Coin } from './HostFlow.tsx';

export interface ShopView {
  items: typeof ITEMS;
  hand: ItemId[];
  coins: number;
  max: number;
}

/** The shop opens on this phone only; everyone else keeps watching the standings. */
export function Shop({ conn, shop, endsAt }: { conn: Connection; shop: ShopView; endsAt: number | null }) {
  const full = shop.hand.length >= shop.max;
  return (
    <div className="pf shop">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="pf-title">Shop</h2>
        <span className="chip">
          <Coin size={18} /> {shop.coins}
        </span>
        <Countdown conn={conn} until={endsAt} />
      </div>
      <div className="item-hand">
        <span className="muted">
          Your bag ({shop.hand.length}/{shop.max}):
        </span>
        {shop.hand.length ? shop.hand.map((it, i) => <ItemChip key={`${it}${i}`} item={it} />) : <span className="muted">empty</span>}
      </div>
      <ul className="shop-list">
        {(Object.keys(shop.items) as ItemId[]).map((id) => {
          const it = shop.items[id];
          const cant = full || shop.coins < it.price;
          return (
            <li key={id} className="shop-item sticker">
              <span className="item-glyph big">{ITEM_GLYPH[id]}</span>
              <div className="shop-text">
                <b>{it.name}</b>
                <span>{it.text}</span>
              </div>
              <button className="btn small" disabled={cant} onClick={() => conn.intent({ type: 'buy', item: id })}>
                {it.price}c
              </button>
            </li>
          );
        })}
      </ul>
      <button className="btn white block" onClick={() => conn.intent({ type: 'shopDone' })}>
        Done shopping
      </button>
    </div>
  );
}
