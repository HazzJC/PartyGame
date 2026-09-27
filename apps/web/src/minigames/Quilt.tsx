import { DRAW_PALETTE, DRAW_SIZE, strokePath, type Stroke } from '@partygame/shared';
import { useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Draw } from '../input/index.ts';
import { Countdown } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';
import './wave-e.css';

const EDGE = 90;

function Strokes({ strokes, opacity = 1 }: { strokes: Stroke[]; opacity?: number }) {
  return (
    <g opacity={opacity}>
      {strokes.map((s, i) => (
        <path key={i} d={strokePath(s)} stroke={DRAW_PALETTE[s.c]} strokeWidth={s.w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
}

function shift(strokes: Stroke[], dx: number, dy: number): Stroke[] {
  return strokes.map((s) => ({ ...s, p: s.p.map((v, i) => (i % 2 ? v + dy : v + dx)) }));
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as { theme: string; cols: number; rows: number; patches: string[]; drawn: string[]; strokes: Record<string, Stroke[]> | null };
  const seats = seatMap(view);
  return (
    <div className="mg-host quilt-host">
      <p className="mg-host-lead">
        Theme: <b>{d.theme}</b>
        {!d.strokes && ' · Everyone draws one patch'}
      </p>
      <svg className="quilt-svg" viewBox={`0 0 ${d.cols * DRAW_SIZE} ${d.rows * DRAW_SIZE}`}>
        {d.patches.map((id, i) => {
          const x = (i % d.cols) * DRAW_SIZE;
          const y = Math.floor(i / d.cols) * DRAW_SIZE;
          const s = seats.get(id);
          return (
            <g key={id} transform={`translate(${x} ${y})`}>
              <rect x={10} y={10} width={DRAW_SIZE - 20} height={DRAW_SIZE - 20} fill="#fff" stroke="#2B2233" strokeWidth={d.strokes ? 4 : 12} strokeDasharray={d.strokes ? '24 18' : undefined} />
              {d.strokes ? (
                <Strokes strokes={d.strokes[id] ?? []} />
              ) : (
                s && (
                  <g transform={`translate(${DRAW_SIZE / 2 - 150} ${DRAW_SIZE / 2 - 150})`} opacity={d.drawn.includes(id) ? 1 : 0.35}>
                    <Avatar avatar={s.avatar} size={300} />
                  </g>
                )
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as { theme: string; closesAt: number; myStrokes: Stroke[]; edges: Record<string, Stroke[]>; drawing: boolean };
  const [strokes, setStrokes] = useState<Stroke[]>(d.myStrokes);
  if (!d.drawing) return <div className="mg-player center-col"><h2 className="pf-title">Watch the quilt come together</h2></div>;
  // Neighbours' edges, squeezed into your border so you can see where their lines meet yours.
  const bg = (
    <>
      <rect x={0} y={0} width={DRAW_SIZE} height={EDGE} fill="#f1ecff" />
      <rect x={0} y={DRAW_SIZE - EDGE} width={DRAW_SIZE} height={EDGE} fill="#f1ecff" />
      <rect x={0} y={0} width={EDGE} height={DRAW_SIZE} fill="#f1ecff" />
      <rect x={DRAW_SIZE - EDGE} y={0} width={EDGE} height={DRAW_SIZE} fill="#f1ecff" />
      <Strokes strokes={shift(d.edges.top ?? [], 0, -(DRAW_SIZE - EDGE))} opacity={0.6} />
      <Strokes strokes={shift(d.edges.bottom ?? [], 0, DRAW_SIZE - EDGE)} opacity={0.6} />
      <Strokes strokes={shift(d.edges.left ?? [], -(DRAW_SIZE - EDGE), 0)} opacity={0.6} />
      <Strokes strokes={shift(d.edges.right ?? [], DRAW_SIZE - EDGE, 0)} opacity={0.6} />
    </>
  );
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>{d.theme}</h2>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <p className="muted" style={{ margin: 0 }}>
        The shaded border shows where your neighbours’ lines reach your edges. Carry them on!
      </p>
      <Draw
        strokes={strokes}
        background={bg}
        onChange={(s) => {
          setStrokes(s);
          conn.intent({ type: 'patch', strokes: s });
        }}
      />
    </div>
  );
}

registerMinigameUi('collaborative-quilt', { Host, Player });
