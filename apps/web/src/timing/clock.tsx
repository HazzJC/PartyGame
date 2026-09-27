import { useEffect, useState, type ReactNode } from 'react';
import type { Connection } from '../net/connection.ts';

/** Convert a DOM event timestamp (performance.now domain) to synced server time. */
export function eventServerTime(conn: Connection, timeStamp: number): number {
  return performance.timeOrigin + timeStamp + conn.clock.offset;
}

/** Re-renders at `fps` with the synced server time. Controllers own their countdowns. */
export function useServerNow(conn: Connection, fps = 10): number {
  const [now, setNow] = useState(() => conn.serverNow());
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last >= 1000 / fps) {
        last = t;
        setNow(conn.serverNow());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [conn, fps]);
  return now;
}

/** Seconds left until a server-time deadline, drawn from the local synced clock. */
export function Countdown({ conn, until, className = 'countdown' }: { conn: Connection; until: number | null | undefined; className?: string }) {
  const now = useServerNow(conn, 8);
  if (!until) return null;
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <span className={className} data-urgent={left <= 3} aria-label={`${left} seconds left`}>
      {left}
    </span>
  );
}

/**
 * No spoilers: children appear only once the host screen's reveal has reached this player's
 * stream (reveal end + their measured stream delay). Until then, show "Watch the screen".
 */
export function SpoilerGate({ conn, revealEndsAt, delayMs, children, waiting }: { conn: Connection; revealEndsAt: number; delayMs: number; children: ReactNode; waiting: ReactNode }) {
  const now = useServerNow(conn, 10);
  return <>{now >= revealEndsAt + delayMs ? children : waiting}</>;
}
