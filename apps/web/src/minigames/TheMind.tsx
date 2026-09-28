import { useEffect, useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { useVirtualKeys } from '../input/index.ts';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';
import { Icon } from '../ui/Icons.tsx';
import './wave-e.css';

function Lives({ n }: { n: number }) {
  return (
    <span className="mind-lives" aria-label={`${n} lives`}>
      {[0, 1, 2].map((i) => (
        <span key={i} data-on={i < n}>
          <Icon name="heart" size={30} />
        </span>
      ))}
    </span>
  );
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as { pile: { card: number; by: string }[]; discarded: { card: number }[]; lives: number; left: number; lastMistake: number | null; pending: string[] };
  const seats = seatMap(view);
  const now = useServerNow(conn, 10);
  const top = d.pile[d.pile.length - 1];
  const oops = d.lastMistake !== null && now - d.lastMistake < 2500;
  return (
    <div className="mg-host mind-host">
      <div className="mind-top">
        <Lives n={d.lives} />
        <span className="chip">{d.left} cards still hidden</span>
      </div>
      <div className="mind-card big sticker" data-oops={oops}>
        {top ? top.card : '–'}
        {top && seats.get(top.by) && <Avatar avatar={seats.get(top.by)!.avatar} size={80} />}
      </div>
      <div className="mind-pile">
        {d.pile.slice(-10, -1).map((p, i) => (
          <span key={i} className="mind-card small">
            {p.card}
          </span>
        ))}
      </div>
      {oops && <p className="mg-host-lead">Too soon! Lower cards were still out: {d.discarded.slice(-4).map((x) => x.card).join(', ')}</p>}
      <div className="submitted-row">
        {d.pending.map((id) => {
          const s = seats.get(id);
          return s ? <Avatar key={id} avatar={s.avatar} size={56} /> : null;
        })}
      </div>
    </div>
  );
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as { hand: number[]; top: number; lives: number; left: number; closesAt: number; pending: boolean };
  // Your own play shows as pending instantly, before the server settles the order.
  const [sent, setSent] = useState(false);
  useEffect(() => setSent(false), [d.hand.length, d.top]);
  const lowest = d.hand[0];
  const play = () => {
    if (lowest === undefined || d.pending || sent) return;
    setSent(true);
    conn.intent({ type: 'play' });
  };
  useVirtualKeys((e) => {
    if (e.down && !e.repeat && e.key === 'confirm') play();
  });
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <Lives n={d.lives} />
        <span className="chip">Top card {d.top || '–'}</span>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <div className="mind-hand">
        {d.hand.map((c) => (
          <span key={c} className="mind-card">
            {c}
          </span>
        ))}
        {d.hand.length === 0 && <span className="muted">All your cards are played</span>}
      </div>
      <button className="count-say" disabled={lowest === undefined || d.pending || sent} onPointerDown={play}>
        {d.pending || sent ? `Playing ${lowest}…` : lowest !== undefined ? `Play ${lowest}` : 'Done'}
      </button>
      <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
        No talking. Play when it feels like your turn.
      </p>
    </div>
  );
}

registerMinigameUi('the-mind', { Host, Player });
