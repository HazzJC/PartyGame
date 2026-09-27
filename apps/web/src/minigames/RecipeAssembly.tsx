import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { useVirtualKeys } from '../input/index.ts';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';
import './wave-e.css';

const ITEM_COLOUR: Record<string, string> = { Bun: '#e8a95b', Patty: '#7a4a2a', Cheese: '#ffd23f', Lettuce: '#5cc26a', Tomato: '#ff4d5e', Onion: '#d7b8f3', Pickle: '#7c9a3a', Sauce: '#c1121f' };

function Ticket({ order, filled }: { order: string[]; filled: number }) {
  return (
    <ol className="recipe-ticket">
      {order.map((item, i) => (
        <li key={i} className="recipe-item" data-state={i < filled ? 'done' : i === filled ? 'next' : 'todo'} style={{ ['--item' as string]: ITEM_COLOUR[item] ?? '#ccc' }}>
          <span className="recipe-swatch" />
          {item}
        </li>
      ))}
    </ol>
  );
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as { order: string[]; filled: number; completed: number; strikes: number; claim: { by: string; until: number } | null; log: { by: string; item: string; ok: boolean }[] };
  const seats = seatMap(view);
  const claimer = d.claim ? seats.get(d.claim.by) : undefined;
  return (
    <div className="mg-host recipe-host">
      <Ticket order={d.order} filled={d.filled} />
      <div className="recipe-side">
        <p className="mg-host-lead">
          Burgers done: <b>{d.completed}</b> · Strikes: <b>{d.strikes}</b>
        </p>
        <div className="recipe-claim sticker">{claimer ? <><Avatar avatar={claimer.avatar} size={64} /> {claimer.name} has the next slot</> : 'Next slot is free: claim it!'}</div>
        <ul className="heist-log">
          {d.log.map((l, i) => (
            <li key={i}>
              {seats.get(l.by)?.name} added {l.item} {l.ok ? '✓' : '✗'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as { hand: string[]; order: string[]; filled: number; completed: number; strikes: number; claimBy: string | null; claimUntil: number; closesAt: number };
  const now = useServerNow(conn, 8);
  const seats = seatMap(view);
  const mine = d.claimBy === view.me.id && d.claimUntil > now;
  const free = !d.claimBy || d.claimUntil <= now;
  const need = d.order[d.filled];
  useVirtualKeys((e) => {
    if (e.down && e.key === 'confirm' && free) conn.intent({ type: 'claim' });
  });
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>Burger #{d.completed + 1}</h2>
        <span className="chip">Strikes {d.strikes}</span>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <Ticket order={d.order} filled={d.filled} />
      <button className="btn big block" disabled={!free} onClick={() => conn.intent({ type: 'claim' })}>
        {mine ? 'You have it! Add an item' : free ? `Claim the next slot (${need})` : `${seats.get(d.claimBy ?? '')?.name ?? 'Someone'} has it`}
      </button>
      <div className="recipe-hand">
        {d.hand.map((item) => (
          <button key={item} className="recipe-card" disabled={!mine} style={{ ['--item' as string]: ITEM_COLOUR[item] ?? '#ccc' }} onClick={() => conn.intent({ type: 'add', item })}>
            <span className="recipe-swatch" />
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

registerMinigameUi('recipe-assembly', { Host, Player });
