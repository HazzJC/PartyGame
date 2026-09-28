import type { PublicSeat } from '@partygame/engine';
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound.ts';
import { PaperPawnSvg } from '../board/PaperPawn.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { decorationOff } from '../ui/prefs.ts';
import { StarIconArt } from '../ui/StarArt.tsx';
import { Coin } from './HostFlow.tsx';
import './standings.css';

export interface StandingRow {
  id: string;
  seat: PublicSeat;
  stars: number;
  coins: number;
  gained: number;
}

/** When each beat of the standings reveal happens (ms after the screen appears). */
const COUNT_AT = 500;
const COUNT_MS = 1300;
const SHUFFLE_AT = COUNT_AT + COUNT_MS + 250;
const ROW_H = 96;
/** Row width: wide in one column (up to 8 players), narrower in two columns (9 to 16). */
const WIDE = 800;
const COL_W = 600;

/** Counts a number up from `from` to `to`, starting after `delay`. */
function CountUp({ from, to, delay, ms }: { from: number; to: number; delay: number; ms: number }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (from === to || decorationOff()) return setV(to);
    let raf = 0;
    const start = performance.now() + delay;
    const step = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / ms));
      setV(Math.round(from + (to - from) * (1 - (1 - t) ** 2)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, delay, ms]);
  return <>{v}</>;
}

/** The ranking (stars, then coins) with ties kept in the given order. */
function rank(rows: StandingRow[], coinsOf: (r: StandingRow) => number): string[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.stars - a.r.stars || coinsOf(b.r) - coinsOf(a.r) || a.i - b.i)
    .map((x) => x.r.id);
}

/** Grid slot for an index: one column up to 8 players, two columns beyond that. */
function slot(i: number, n: number): { x: number; y: number } {
  const perCol = n > 8 ? Math.ceil(n / 2) : n;
  return { x: Math.floor(i / perCol) * COL_W, y: (i % perCol) * ROW_H };
}

/**
 * The standings after a mini game, told as a little show: rows appear in the old order, coins
 * count up with their gains, then everyone slides to their new place with rank-change badges. The
 * leader stands in the spotlight on the left.
 */
export function Standings({ rows, order }: { rows: StandingRow[]; order: string[] }) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const now = order.map((id) => byId.get(id)).filter((r): r is StandingRow => !!r);
  const before = rank(now, (r) => r.coins - r.gained);
  const n = now.length;
  const [shuffled, setShuffled] = useState(false);
  const whooshed = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setShuffled(true);
      if (!whooshed.current && before.join() !== order.join()) {
        whooshed.current = true;
        sound.play('whoosh');
      }
    }, decorationOff() ? 0 : SHUFFLE_AT);
    return () => clearTimeout(t);
    // Runs once per standings screen.
  }, []);

  const leader = now[0];
  // The biggest climber this round (if anyone climbed).
  const moves = now.map((r, i) => ({ r, up: before.indexOf(r.id) - i })).sort((a, b) => b.up - a.up);
  const climber = moves[0] && moves[0].up > 0 ? moves[0] : null;
  const perCol = n > 8 ? Math.ceil(n / 2) : n;

  return (
    <div className="stand">
      <aside className="stand-spot">
        {leader && (
          <>
            <div className="stand-crown" aria-hidden>
              <svg viewBox="0 0 60 40" width={96}>
                <path d="M4 36 L8 10 L20 24 L30 4 L40 24 L52 10 L56 36 Z" fill="#FFD23F" stroke="#2B2233" strokeWidth={4} strokeLinejoin="round" />
                <circle cx="30" cy="4" r="4" fill="#FF4D5E" stroke="#2B2233" strokeWidth={2.5} />
              </svg>
            </div>
            <PaperPawnSvg avatar={leader.seat.avatar} size={170} className="stand-leader" />
            <div className="stand-plinth sticker">
              <span className="stand-plinth-label">In the lead</span>
              <b>{leader.seat.name}</b>
              <span className="stand-plinth-stats">
                <StarIconArt size={40} /> {leader.stars}
                <Coin size={34} /> {leader.coins}
              </span>
            </div>
            {climber && (
              <div className="stand-climber sticker pop-in" style={{ animationDelay: `${SHUFFLE_AT + 600}ms` }}>
                <span className="stand-arrow up">▲{climber.up}</span>
                <Avatar avatar={climber.r.seat.avatar} size={44} />
                <span>
                  <b>{climber.r.seat.name}</b> climbed the most
                </span>
              </div>
            )}
          </>
        )}
      </aside>
      <ol className="stand-list" style={{ height: perCol * ROW_H, width: n > 8 ? COL_W * 2 : WIDE, ['--row-w' as string]: `${n > 8 ? COL_W - 20 : WIDE}px` }}>
        {now.map((r) => {
          const oldI = before.indexOf(r.id);
          const newI = order.indexOf(r.id);
          const at = slot(shuffled ? newI : oldI, n);
          const change = oldI - newI;
          return (
            <li
              key={r.id}
              className="stand-row sticker"
              data-lead={newI === 0 && shuffled}
              style={{ transform: `translate(${at.x}px, ${at.y}px)`, animationDelay: `${oldI * 60}ms` }}
            >
              <span className="stand-rank">{(shuffled ? newI : oldI) + 1}</span>
              <Avatar avatar={r.seat.avatar} size={60} />
              <span className="stand-name">{r.seat.name}</span>
              <span className="stand-stat">
                <StarIconArt size={36} />
                {r.stars}
              </span>
              <span className="stand-stat">
                <Coin size={32} />
                <CountUp from={r.coins - r.gained} to={r.coins} delay={COUNT_AT} ms={COUNT_MS} />
              </span>
              {r.gained ? (
                <span className="stand-gain" data-neg={r.gained < 0} style={{ animationDelay: `${COUNT_AT}ms` }}>
                  {r.gained > 0 ? `+${r.gained}` : r.gained}
                </span>
              ) : (
                <span className="stand-gain none" />
              )}
              {shuffled && change !== 0 && (
                <span className={`stand-arrow ${change > 0 ? 'up' : 'down'}`}>
                  {change > 0 ? '▲' : '▼'}
                  {Math.abs(change)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
