import { Pick } from '../input/index.ts';
import type { HostScreenProps } from '../host/registry.tsx';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { WatchScreen } from '../player/WatchScreen.tsx';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { HostGameFrame, StarIcon, seatMap } from './HostFlow.tsx';
import './game.css';

type Twists = Record<string, { name: string; text: string }>;

export function TwistHost({ conn, view }: HostScreenProps) {
  const p = view.phase;
  const chooser = seatMap(view).get(p.chooser);
  const twists = p.twists as Twists;
  return (
    <HostGameFrame view={view} title="Final stretch!" right={<Countdown conn={conn} until={p.endsAt} />}>
      <div className="twist">
        <div className="twist-who">
          {chooser && <Avatar avatar={chooser.avatar} size={150} className="pop-in" />}
          <p className="mg-host-lead">
            <b>{chooser?.name}</b> is in last place and picks a twist for the rest of the game. Spaces now pay double!
          </p>
        </div>
        <div className="twist-cards">
          {Object.entries(twists).map(([id, t]) => (
            <div key={id} className="sticker twist-card" data-chosen={p.choice === id} data-dim={!!p.choice && p.choice !== id}>
              <h3>{t.name}</h3>
              <p>{t.text}</p>
            </div>
          ))}
        </div>
      </div>
    </HostGameFrame>
  );
}

export function TwistPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase;
  const twists = p.twists as Twists;
  if (!p.choosing) return <WatchScreen text="Last place is picking a twist…" />;
  return (
    <div className="pf">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="pf-title">Pick a twist</h2>
        <Countdown conn={conn} until={p.endsAt} />
      </div>
      <p className="pf-blurb">You're in last place, so you choose how the final stretch plays.</p>
      <Pick
        columns={1}
        options={Object.entries(twists).map(([id, t]) => ({ id, label: t.name, sub: t.text }))}
        selected={p.choice}
        locked={!!p.choice}
        onPick={(id) => conn.intent({ type: 'twist', twist: id })}
      />
    </div>
  );
}

export function ThreatHost({ view }: HostScreenProps) {
  const p = view.phase;
  return (
    <HostGameFrame view={view} title="Uh oh…">
      <div className="spot-back" style={{ position: 'relative', flex: 1, background: 'transparent' }}>
        <div className="spot-card sticker pop-in threat-card">
          <div className="spot-title">The threat meter is full!</div>
          <p className="spot-text">Too many failed co-op games. A storm blows through: everyone loses {p.amount} coins.</p>
        </div>
      </div>
    </HostGameFrame>
  );
}

export function ThreatPlayer({ view }: PlayerScreenProps) {
  return (
    <div className="pf center">
      <h2 className="pf-title">The storm hits!</h2>
      <div className="pf-coins neg">−{view.phase.lost}</div>
    </div>
  );
}

interface Award {
  id: string;
  winners: string[];
  value: number;
}

export function BonusHost({ conn, view }: HostScreenProps) {
  const p = view.phase;
  const now = useServerNow(conn, 10);
  const seats = seatMap(view);
  const info = p.info as Record<string, { name: string; text: string }>;
  const awards = p.awards as Award[];
  const revealAt = p.revealAt as number[];
  const current = revealAt.filter((t) => now >= t).length - 1;
  const award = current >= 0 ? awards[current] : null;
  return (
    <HostGameFrame view={view} title="Bonus stars">
      <div className="spot-back" style={{ position: 'relative', flex: 1, background: 'transparent' }}>
        {award ? (
          <div key={award.id} className="spot-card sticker pop-in" data-kind="star">
            <div className="spot-title">
              <StarIcon size={70} /> {info[award.id]?.name}
            </div>
            <p className="spot-text">{info[award.id]?.text}</p>
            <div className="spot-avatars">
              {award.winners.map((id) => {
                const s = seats.get(id);
                return s ? (
                  <div key={id} className="spot-av" data-winner="true">
                    <Avatar avatar={s.avatar} size={award.winners.length > 3 ? 100 : 150} />
                    <span className="chip spot-bid">{s.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        ) : (
          <div className="spot-card sticker pop-in">
            <div className="spot-title">
              <StarIcon size={70} /> {awards.length} bonus stars
            </div>
            <p className="spot-text">Drawn at random from the pool. Nobody could play for them!</p>
          </div>
        )}
      </div>
    </HostGameFrame>
  );
}

export function BonusPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase;
  const now = useServerNow(conn, 5);
  const info = p.info as Record<string, { name: string }>;
  const revealAt = p.revealAt as number[];
  // Each award appears on the phone only after it has reached this player's stream.
  const mine = (p.awards as { id: string; mine: boolean }[]).filter((a, i) => a.mine && now >= revealAt[i]! + 2500 + view.me.streamDelayMs);
  if (mine.length === 0) return <WatchScreen text="Bonus stars!" />;
  return (
    <div className="pf center pop-in">
      <StarIcon size={96} />
      <h2 className="pf-title" style={{ textAlign: 'center' }}>
        You got {mine.map((a) => info[a.id]?.name).join(' and ')}!
      </h2>
    </div>
  );
}
