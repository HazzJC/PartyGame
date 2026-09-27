import type { PublicSeat } from '@partygame/engine';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Countdown } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';
import './wave-e.css';

const JUNCTIONS = 7;
const EXITS = 8;

interface Payload {
  id: number;
  dest: number;
  at: number | null;
  exit: number | null;
}

/** Node positions: junction j at depth floor(log2(j+1)), exits along the bottom. */
function jPos(j: number): { x: number; y: number } {
  const depth = Math.floor(Math.log2(j + 1));
  const idx = j - (2 ** depth - 1);
  const count = 2 ** depth;
  return { x: ((idx + 0.5) / count) * 100, y: 12 + depth * 24 };
}
const ePos = (e: number) => ({ x: ((e + 0.5) / EXITS) * 100, y: 88 });

function Tracks({ switches, owners, payloads, seats, mine, onFlip }: { switches: (0 | 1)[]; owners: string[]; payloads: Payload[]; seats: Map<string, PublicSeat>; mine?: number[]; onFlip?: (j: number) => void }) {
  const child = (j: number, s: 0 | 1) => {
    const c = 2 * j + 1 + s;
    return c < JUNCTIONS ? jPos(c) : ePos(c - JUNCTIONS);
  };
  return (
    <svg className="switch-svg" viewBox="0 0 100 100">
      {Array.from({ length: JUNCTIONS }, (_, j) =>
        ([0, 1] as const).map((s) => {
          const a = jPos(j);
          const b = child(j, s);
          const on = switches[j] === s;
          return <line key={`${j}-${s}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? '#2B2233' : '#d8cbb3'} strokeWidth={on ? 2.2 : 1.2} strokeLinecap="round" />;
        }),
      )}
      {Array.from({ length: EXITS }, (_, e) => {
        const p = ePos(e);
        return (
          <g key={`e${e}`}>
            <rect x={p.x - 4.5} y={p.y - 4} width={9} height={9} rx={2} fill="#FFD23F" stroke="#2B2233" strokeWidth={0.8} />
            <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize={5.5} fontFamily="Fredoka, sans-serif" fontWeight={700}>
              {e + 1}
            </text>
          </g>
        );
      })}
      {Array.from({ length: JUNCTIONS }, (_, j) => {
        const p = jPos(j);
        const owner = seats.get(owners[j] ?? '');
        const isMine = mine?.includes(j);
        return (
          <g key={`j${j}`} onClick={isMine && onFlip ? () => onFlip(j) : undefined} style={isMine ? { cursor: 'pointer' } : undefined}>
            <circle cx={p.x} cy={p.y} r={isMine ? 6.5 : 5} fill={isMine ? '#9B5DE5' : '#fff'} stroke="#2B2233" strokeWidth={0.8} />
            {owner && (
              <g transform={`translate(${p.x - 3.5} ${p.y - 3.5})`}>
                <Avatar avatar={owner.avatar} size={7} sticker={false} />
              </g>
            )}
          </g>
        );
      })}
      {payloads
        .filter((pl) => pl.at !== null || pl.exit !== null)
        .map((pl) => {
          const p = pl.exit !== null ? ePos(pl.exit) : jPos(pl.at!);
          const ok = pl.exit === null ? null : pl.exit === pl.dest;
          return (
            <g key={`p${pl.id}`} transform={`translate(${p.x + 5} ${p.y - 6})`}>
              <circle r={4} fill={ok === null ? '#FF7A1A' : ok ? '#2EC27E' : '#E5484D'} stroke="#2B2233" strokeWidth={0.7} />
              <text y={1.8} textAnchor="middle" fontSize={4.5} fontFamily="Fredoka, sans-serif" fontWeight={700} fill="#fff">
                {pl.dest + 1}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as { switches: (0 | 1)[]; owners: string[]; payloads: Payload[]; total: number; delivered: number; missed: number };
  return (
    <div className="mg-host switch-host">
      <Tracks switches={d.switches} owners={d.owners} payloads={d.payloads} seats={seatMap(view)} />
      <p className="mg-host-lead">
        Delivered {d.delivered}/{d.total} · Missed {d.missed}. Each payload shows the exit it needs!
      </p>
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as { switches: (0 | 1)[]; owners: string[]; mine: number[]; payloads: Payload[]; total: number; delivered: number; closesAt: number };
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>Tap your junctions</h2>
        <span className="chip">
          {d.delivered}/{d.total}
        </span>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Your {d.mine.length} junction{d.mine.length === 1 ? '' : 's'} are purple. The thick line is where each one points. Send every payload to its number.
      </p>
      <Tracks switches={d.switches} owners={d.owners} payloads={d.payloads} seats={seatMap(view)} mine={d.mine} onFlip={(j) => conn.intent({ type: 'flip', junction: j })} />
    </div>
  );
}

registerMinigameUi('runaway-switchboard', { Host, Player });
