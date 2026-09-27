import { useState } from 'react';
import type { HostScreenProps } from '../host/registry.tsx';
import { Pick } from '../input/index.ts';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { WatchScreen } from '../player/WatchScreen.tsx';
import { Countdown, SpoilerGate } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { Coin, HostGameFrame, seatMap } from './HostFlow.tsx';
import './game.css';

const REASON: Record<string, string> = { space: 'landed on a duel space', meet: 'met on the same space', ticket: 'used a Duel Ticket' };

export function DuelSetupHost({ conn, view }: HostScreenProps) {
  const p = view.phase;
  const seats = seatMap(view);
  const a = seats.get(p.a);
  const b = p.b ? seats.get(p.b) : undefined;
  return (
    <HostGameFrame view={view} title="DUEL!" right={<Countdown conn={conn} until={p.endsAt} />}>
      <div className="duel">
        <div className="duel-vs">
          <div className="duel-side">
            {a && <Avatar avatar={a.avatar} size={200} className="pop-in" />}
            <span className="duel-name">{a?.name}</span>
            {p.stage === 'bet' && <span className="chip duel-bets">{p.bets.a.count} bets · {p.bets.a.coins}c</span>}
          </div>
          <span className="duel-vs-text">VS</span>
          <div className="duel-side">
            {b ? <Avatar avatar={b.avatar} size={200} className="pop-in" /> : <div className="duel-mystery">?</div>}
            <span className="duel-name">{b?.name ?? 'Choosing…'}</span>
            {p.stage === 'bet' && <span className="chip duel-bets">{p.bets.b.count} bets · {p.bets.b.coins}c</span>}
          </div>
        </div>
        <p className="mg-host-lead">
          {a?.name} {REASON[p.reason] ?? 'started a duel'}.{' '}
          {p.stage === 'challenge' ? 'Setting the wager…' : `Wager: ${p.stake} coins. Game: ${p.gameName}. Everyone else: bet on your phones!`}
        </p>
      </div>
    </HostGameFrame>
  );
}

export function DuelSetupPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase;
  const seats = seatMap(view);
  const [opponent, setOpponent] = useState<string | null>(p.b);
  const [stake, setStake] = useState<number>(5);
  const [side, setSide] = useState<'a' | 'b' | null>(null);
  const [coins, setCoins] = useState(1);
  const a = seats.get(p.a);
  const b = p.b ? seats.get(p.b) : undefined;

  if (p.stage === 'challenge' && p.role === 'a') {
    const others = view.seats.filter((s) => s.id !== view.me.id);
    return (
      <div className="pf">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="pf-title">Duel!</h2>
          <Countdown conn={conn} until={p.endsAt} />
        </div>
        {p.needsOpponent && (
          <>
            <p className="pf-blurb">Pick who to challenge.</p>
            <Pick columns={2} options={others.map((s) => ({ id: s.id, label: s.name }))} selected={opponent} onPick={setOpponent} />
          </>
        )}
        <p className="pf-blurb">Wager (the winner takes both stakes, capped at what the poorer player has):</p>
        <Pick columns={3} options={(p.stakes as number[]).map((x) => ({ id: String(x), label: `${x}c` }))} selected={String(stake)} onPick={(id) => setStake(Number(id))} />
        <button className="btn red big block" disabled={p.needsOpponent && !opponent} onClick={() => conn.intent({ type: 'challenge', opponent, stake })}>
          Challenge!
        </button>
      </div>
    );
  }
  if (p.stage === 'bet' && p.role === 'spectator') {
    if (p.myBet)
      return <WatchScreen text={`You bet ${p.myBet.coins}c on ${(p.myBet.side === 'a' ? a : b)?.name}`} />;
    if (p.maxBet < 1) return <WatchScreen text="No coins to bet this time" />;
    return (
      <div className="pf">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="pf-title">Place a bet</h2>
          <Countdown conn={conn} until={p.endsAt} />
        </div>
        <p className="pf-blurb">
          {p.gameName}. Winners split the losers' coins by how much they bet. Underdog picks pay more.
        </p>
        <div className="duel-bet-sides">
          {(['a', 'b'] as const).map((sd) => {
            const s = sd === 'a' ? a : b;
            return (
              <button key={sd} type="button" className="duel-bet-side" aria-pressed={side === sd} onClick={() => setSide(sd)}>
                {s && <Avatar avatar={s.avatar} size={72} />}
                {s?.name}
              </button>
            );
          })}
        </div>
        <Pick columns={3} options={[1, 2, 3].map((x) => ({ id: String(x), label: `${x}c`, disabled: x > p.maxBet }))} selected={String(coins)} onPick={(id) => setCoins(Number(id))} />
        <button className="btn green big block" disabled={!side} onClick={() => conn.intent({ type: 'bet', side, coins })}>
          Bet {coins}c
        </button>
      </div>
    );
  }
  if (p.role !== 'spectator') return <WatchScreen text={p.stage === 'bet' ? `Wager ${p.stake}c. Everyone is betting on you…` : 'Your opponent is setting the wager…'} />;
  return <WatchScreen text="A duel is starting!" />;
}

export function DuelResultHost({ view }: HostScreenProps) {
  const p = view.phase;
  const seats = seatMap(view);
  const w = p.winner ? seats.get(p.winner) : undefined;
  const bettors = Object.entries(p.betNet as Record<string, number>);
  return (
    <HostGameFrame view={view} title="Duel result">
      <div className="duel">
        {w ? (
          <>
            <Avatar avatar={w.avatar} size={220} className="pop-in" />
            <p className="mg-host-lead">
              <b>{w.name}</b> wins the duel and takes {p.moved} coins!
            </p>
          </>
        ) : (
          <p className="mg-host-lead">A draw! Stakes and bets go back.</p>
        )}
        {bettors.length > 0 && (
          <div className="submitted-row">
            {bettors.map(([id, net]) => {
              const s = seats.get(id);
              return s ? (
                <span key={id} className="chip duel-bets" data-good={net > 0}>
                  <Avatar avatar={s.avatar} size={36} /> {net > 0 ? `+${net}` : net === 0 ? '±0' : net}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
    </HostGameFrame>
  );
}

export function DuelResultPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase;
  // The duel's reveal already played on the host; results wait for this player's stream to catch up.
  return (
    <SpoilerGate conn={conn} revealEndsAt={p.startedAt} delayMs={view.me.streamDelayMs} waiting={<WatchScreen />}>
      <div className="pf center pop-in">
        {p.dueled ? (
          <>
            <h2 className="pf-title">{p.winner === null ? 'A draw!' : p.won ? 'You won the duel!' : 'You lost the duel'}</h2>
            {p.winner !== null && <div className={`pf-coins ${p.won ? '' : 'neg'}`}>{p.won ? `+${p.moved}` : `−${p.moved}`}</div>}
          </>
        ) : p.betNet !== null ? (
          <>
            <h2 className="pf-title">{p.betNet > 0 ? 'Your bet paid off!' : p.betNet === 0 ? 'Bet returned' : 'Your bet lost'}</h2>
            <div className={`pf-coins ${p.betNet < 0 ? 'neg' : ''}`}>
              <Coin size={60} /> {p.betNet > 0 ? `+${p.betNet}` : p.betNet}
            </div>
          </>
        ) : (
          <WatchScreen />
        )}
      </div>
    </SpoilerGate>
  );
}
