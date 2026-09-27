import type { BoardDef } from '@partygame/engine';
import { useState } from 'react';
import { KeyHint, useDevice, useVirtualKeys, wantsOnScreenControls, Aim } from '../input/index.ts';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { WatchScreen } from '../player/WatchScreen.tsx';
import { Countdown, SpoilerGate } from '../timing/clock.tsx';
import { BoardSvg } from './BoardSvg.tsx';
import { ItemPicker, type ItemUseView } from './ItemPicker.tsx';
import type { ItemId } from '@partygame/shared';
import './board.css';

interface Junction {
  node: number;
  options: { next: number; preview: number[] }[];
  since: number;
}

interface BoardPlayerPhase {
  stage: 'roll' | 'items' | 'move' | 'bid' | 'resolve';
  def: BoardDef | null;
  hand: ItemId[];
  use: ItemUseView | null;
  trap: number | null;
  coupon: boolean;
  stars: number[];
  position: number;
  roll: number | null;
  junction: Junction | null;
  remaining: number;
  done: boolean;
  bid: { mine: number | null; min: number; max: number; rivals: string[] } | null;
  landing: number | null;
  colour: 'blue' | 'red' | null;
  resolveAt: number | null;
  colourKnownAt: number | null;
  starPrice: number;
  endsAt: number | null;
}

const PATH_COLOURS = ['#FF7A1A', '#9B5DE5'];
const PATH_NAMES = ['Orange path', 'Purple path'];
const DIE_PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

export function Die({ value, size = 120 }: { value: number; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`Rolled ${value}`}>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#FFFFFF" stroke="#2B2233" strokeWidth="6" />
      {(DIE_PIPS[value] ?? []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill="#2B2233" />
      ))}
    </svg>
  );
}

function RollStage({ conn, p, view }: { conn: PlayerScreenProps['conn']; p: BoardPlayerPhase; view: PlayerScreenProps['view'] }) {
  const device = useDevice();
  useVirtualKeys((e) => {
    if (e.down && e.key === 'confirm' && p.roll === null) conn.intent({ type: 'roll' });
  }, p.roll === null);
  return (
    <div className="bp">
      <div className="mg-player-head">
        <h2>{p.roll === null ? 'Your turn to roll' : `You rolled ${p.roll}!`}</h2>
        <Countdown conn={conn} until={p.endsAt} />
      </div>
      {p.def && (
        <BoardSvg
          className="bp-map"
          def={p.def}
          stars={p.stars}
          highlights={[{ nodes: [p.position], colour: '#FFD23F' }, ...(p.trap !== null ? [{ nodes: [p.trap], colour: '#E5484D' }] : [])]}
        />
      )}
      {p.def && <ItemPicker conn={conn} view={view} hand={p.hand} use={p.use} def={p.def} position={p.position} stars={p.stars} />}
      {p.coupon && <span className="chip">Star coupon ready: your next star is cheaper</span>}
      {p.roll === null ? (
        <button type="button" className="bp-roll" onPointerDown={() => conn.intent({ type: 'roll' })}>
          Roll!
          {!wantsOnScreenControls(device) && <KeyHint k="Space" />}
        </button>
      ) : (
        <div className="bp-rolled pop-in">
          <Die value={p.roll} />
        </div>
      )}
    </div>
  );
}

/** Branch choice: a private map of both routes on the phone, so nobody waits on the delayed stream. */
function JunctionStage({ conn, p, j }: { conn: PlayerScreenProps['conn']; p: BoardPlayerPhase; j: Junction }) {
  const def = p.def!;
  const at = def.nodes[j.node]!;
  const pts = j.options.flatMap((o) => o.preview.map((id) => def.nodes[id]!));
  const xs = [at.x, ...pts.map((n) => n.x)];
  const ys = [at.y, ...pts.map((n) => n.y)];
  const pad = 70;
  const focus = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
  useVirtualKeys((e) => {
    if (!e.down) return;
    if (e.key === 'left' || e.raw === '1') conn.intent({ type: 'branch', next: j.options[0]!.next });
    if (e.key === 'right' || e.raw === '2') conn.intent({ type: 'branch', next: j.options[1]?.next ?? j.options[0]!.next });
  });
  return (
    <div className="bp">
      <div className="mg-player-head">
        <h2>Which way? {p.remaining} to go</h2>
        <Countdown conn={conn} until={j.since + 10_000} />
      </div>
      <BoardSvg
        className="bp-map"
        def={def}
        stars={p.stars}
        focus={focus}
        highlights={j.options.map((o, i) => ({ nodes: [j.node, ...o.preview], colour: PATH_COLOURS[i]! }))}
      />
      <div className="bp-choices">
        {j.options.map((o, i) => {
          const star = o.preview.some((id) => p.stars.includes(id));
          return (
            <button key={o.next} type="button" className="bp-choice" style={{ ['--path' as string]: PATH_COLOURS[i] }} onClick={() => conn.intent({ type: 'branch', next: o.next })}>
              {PATH_NAMES[i]}
              {star && <span className="chip">★ star</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BidStage({ conn, p }: { conn: PlayerScreenProps['conn']; p: BoardPlayerPhase }) {
  const b = p.bid!;
  const [value, setValue] = useState(b.mine ?? b.min);
  return (
    <div className="bp">
      <div className="mg-player-head">
        <h2>Star contest!</h2>
        <Countdown conn={conn} until={p.endsAt} />
      </div>
      <p style={{ margin: 0 }}>
        {b.rivals.length + 1} of you reached the same star. Sealed bid: the highest bid buys it and pays their own bid. Ties go to whoever has fewer stars.
      </p>
      <Aim params={[{ id: 'bid', label: 'Your bid', min: b.min, max: Math.max(b.min, b.max), step: 1, unit: ' coins' }]} values={{ bid: value }} onChange={(v) => setValue(v.bid!)} locked={b.mine !== null} />
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn white small" disabled={b.mine !== null} onClick={() => setValue(b.min)}>
          Minimum
        </button>
        <button className="btn white small" disabled={b.mine !== null} onClick={() => setValue(Math.min(b.max, value + 5))}>
          +5
        </button>
        <button className="btn white small" disabled={b.mine !== null} onClick={() => setValue(b.max)}>
          All in ({b.max})
        </button>
      </div>
      <button className="btn green big block" disabled={b.mine !== null} onClick={() => conn.intent({ type: 'bid', coins: value })}>
        {b.mine !== null ? `Bid ${b.mine} sealed ✓` : `Seal bid of ${value}`}
      </button>
    </div>
  );
}

export function BoardPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase as unknown as BoardPlayerPhase;
  if (p.stage === 'roll') return <RollStage conn={conn} p={p} view={view} />;
  if (p.stage === 'items') return <WatchScreen text="Items revealed! Watch the screen" />;
  if (p.stage === 'move' && p.junction && p.def) return <JunctionStage conn={conn} p={p} j={p.junction} />;
  if (p.stage === 'move') return <WatchScreen text={p.done ? 'Watch your pawn!' : `Moving ${p.roll ?? ''} spaces…`} />;
  if (p.stage === 'bid' && p.bid) return <BidStage conn={conn} p={p} />;
  if (p.stage === 'resolve' && p.colourKnownAt)
    return (
      <SpoilerGate conn={conn} revealEndsAt={p.colourKnownAt} delayMs={view.me.streamDelayMs} waiting={<WatchScreen />}>
        <div className="bp center pop-in">
          {p.landing !== null && p.landing !== 0 && <div className={`pf-coins ${p.landing < 0 ? 'neg' : ''}`}>{p.landing > 0 ? `+${p.landing}` : p.landing}</div>}
          <div className="bp-colour" data-colour={p.colour}>
            You're {p.colour === 'blue' ? 'BLUE' : 'RED'} this round
          </div>
          <span className="muted">The mini game format comes from the colours everyone landed on.</span>
        </div>
      </SpoilerGate>
    );
  return <WatchScreen />;
}
