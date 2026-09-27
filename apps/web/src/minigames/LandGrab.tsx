import { PLAYER_COLOURS, LAND_NEUTRAL, placementCells, rotateShape, type Shape } from '@partygame/shared';
import { useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Grid } from '../input/index.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';
import './wave-c.css';

function ownerColour(view: { seats: { id: string; avatar: number }[] }, order: string[], v: number): string {
  if (v === LAND_NEUTRAL) return '#5a4d63';
  if (v < 0) return '#f4e9d3';
  const seat = view.seats.find((s) => s.id === order[v]);
  return seat ? PLAYER_COLOURS[seat.avatar % PLAYER_COLOURS.length]! : '#999';
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as { side: number; cells: number[]; order: string[]; round: number; maxRounds: number; stage: 'place' | 'show'; submitted: string[]; lastClaims: Record<number, number>; scores: Record<string, number> };
  const seats = seatMap(view);
  const ranked = [...d.order].sort((a, b) => (d.scores[b] ?? 0) - (d.scores[a] ?? 0));
  return (
    <div className="mg-host land-host">
      <svg className="land-svg" viewBox={`0 0 ${d.side} ${d.side}`}>
        {d.cells.map((v, c) => (
          <rect
            key={c}
            x={(c % d.side) + 0.04}
            y={Math.floor(c / d.side) + 0.04}
            width={0.92}
            height={0.92}
            rx={0.15}
            fill={ownerColour(view, d.order, v)}
            stroke={c in d.lastClaims ? '#2B2233' : 'rgba(43,34,51,0.15)'}
            strokeWidth={c in d.lastClaims ? 0.12 : 0.04}
          />
        ))}
      </svg>
      <div className="land-side">
        <p className="mg-host-lead">
          Round {d.round}/{d.maxRounds}
        </p>
        {d.stage === 'place' && <SubmittedRow view={view} ids={d.order} submitted={d.submitted} size={40} />}
        <ol className="land-scores">
          {ranked.slice(0, 8).map((id) => {
            const s = seats.get(id);
            return s ? (
              <li key={id}>
                <Avatar avatar={s.avatar} size={36} />
                <span className="grow">{s.name}</span>
                <b>{d.scores[id] ?? 0}</b>
              </li>
            ) : null;
          })}
        </ol>
      </div>
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as { side: number; cells: number[]; order: string[]; me: number; piece: Shape; round: number; maxRounds: number; stage: 'place' | 'show'; closesAt: number; myPlacement: { x: number; y: number; rot: number } | null; myScore: number; shownAt: number };
  const [rot, setRot] = useState(0);
  const [error, setError] = useState<string | null>(null);
  if (d.stage === 'show')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt}>
        <h2 className="pf-title">You hold {d.myScore} squares</h2>
      </RoundResult>
    );
  // Zoom to your own territory with some room around it.
  const mine = d.cells.map((v, i) => (v === d.me ? i : -1)).filter((i) => i >= 0);
  const xs = mine.map((c) => c % d.side);
  const ys = mine.map((c) => Math.floor(c / d.side));
  const pad = 4;
  const x0 = Math.max(0, Math.min(...xs) - pad);
  const y0 = Math.max(0, Math.min(...ys) - pad);
  const span = Math.min(d.side, Math.max(9, Math.max(...xs) - Math.min(...xs) + pad * 2 + 1, Math.max(...ys) - Math.min(...ys) + pad * 2 + 1));
  const focus = { x: Math.min(x0, d.side - span), y: Math.min(y0, d.side - span), w: span, h: span };
  const shape = rotateShape(d.piece, rot);
  const placed = d.myPlacement ? new Set(placementCells(d, d.me, d.piece, d.myPlacement.x, d.myPlacement.y, d.myPlacement.rot) ?? []) : new Set<number>();
  return (
    <div className="mg-player">
      <RoundHead conn={conn} title="Place your piece" round={d.round} rounds={d.maxRounds} closesAt={d.closesAt} />
      <p className="muted" style={{ margin: 0 }}>
        Touch your own land. You hold {d.myScore}. {error ?? 'Tap a square to place; ⟳ rotates.'}
      </p>
      <div className="heist-grid">
        <Grid
          w={d.side}
          h={d.side}
          focus={focus}
          shape={shape}
          onRotate={() => setRot((r) => (r + 1) % 4)}
          cell={(x, y) => {
            const c = y * d.side + x;
            if (placed.has(c)) return { fill: '#FFD23F', stroke: '#2B2233' };
            return { fill: ownerColour(view, d.order, d.cells[c]!), glyph: d.cells[c] === d.me ? '•' : undefined };
          }}
          onCell={(x, y) => {
            if (!placementCells(d, d.me, d.piece, x, y, rot)) {
              setError('That spot doesn’t touch your land or overlaps.');
              return;
            }
            setError(null);
            conn.intent({ type: 'place', x, y, rot });
          }}
        />
      </div>
    </div>
  );
}

registerMinigameUi('land-grab', { Host, Player });
