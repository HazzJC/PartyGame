import type { PlayerView } from '@partygame/engine';
import type { ReactNode } from 'react';
import type { Connection } from '../net/connection.ts';
import { WatchScreen } from '../player/WatchScreen.tsx';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { seatMap } from '../game/HostFlow.tsx';
import type { HostView } from '@partygame/engine';

/** Time the host takes to animate a round's reveal before phones may show personal results. */
export const ROUND_REVEAL_MS = 1500;

/**
 * Multi-round games: between rounds the phone shows "Watch the screen" until the host's reveal
 * has reached this player's stream, then their own round result.
 */
export function RoundResult({ conn, view, shownAt, children }: { conn: Connection<PlayerView>; view: PlayerView; shownAt: number; children: ReactNode }) {
  const now = useServerNow(conn, 8);
  if (now < shownAt + ROUND_REVEAL_MS + view.me.streamDelayMs) return <WatchScreen />;
  return <div className="mg-player center-col pop-in">{children}</div>;
}

export function RoundHead({ conn, title, round, rounds, closesAt }: { conn: Connection; title: ReactNode; round: number; rounds: number; closesAt: number }) {
  return (
    <div className="mg-player-head">
      <h2>{title}</h2>
      <span className="chip">
        Round {round}/{rounds}
      </span>
      <Countdown conn={conn} until={closesAt} />
    </div>
  );
}

/** Avatars of everyone who has locked in (dimmed until they have). */
export function SubmittedRow({ view, ids, submitted, size = 56 }: { view: HostView; ids: string[]; submitted: string[]; size?: number }) {
  const seats = seatMap(view);
  return (
    <div className="submitted-row">
      {ids.map((id) => {
        const s = seats.get(id);
        return s ? <Avatar key={id} avatar={s.avatar} size={size} dim={!submitted.includes(id)} /> : null;
      })}
    </div>
  );
}

export function AvatarStack({ view, ids, size = 44 }: { view: HostView; ids: string[]; size?: number }) {
  const seats = seatMap(view);
  return (
    <div className="lun-who">
      {ids.map((id) => {
        const s = seats.get(id);
        return s ? <Avatar key={id} avatar={s.avatar} size={ids.length > 4 ? Math.round(size * 0.7) : size} /> : null;
      })}
    </div>
  );
}
