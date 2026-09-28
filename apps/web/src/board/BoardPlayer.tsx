import type { BoardDef } from '@partygame/engine';
import { useState } from 'react';
import { useDevice, useVirtualKeys, wantsOnScreenControls, Aim } from '../input/index.ts';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { WatchScreen } from '../player/WatchScreen.tsx';
import { Countdown, SpoilerGate } from '../timing/clock.tsx';
import { BoardSvg, BoardLegend } from './BoardSvg.tsx';
import { DiceTray, Die } from './DiceTray.tsx';
import { focusedView, ROUTES } from './boardVisual.ts';
import { ItemPicker, type ItemUseView } from './ItemPicker.tsx';
import { TEAM_AVATAR_BASE, type ItemId } from '@partygame/shared';
import { Avatar, avatarColour } from '../ui/Avatar.tsx';
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
  cards: number[] | null;
  myCard: number | null;
  myBranch: number | null;
  team: { name: string; index: number } | null;
  targets: { id: string; name: string; avatar: number }[];
}

/** Team board mode: a banner saying you're choosing with your team (choices are votes). */
function TeamBanner({ p }: { p: BoardPlayerPhase }) {
  if (!p.team) return null;
  return (
    <div className="bp-team" style={{ ['--team' as string]: avatarColour(TEAM_AVATAR_BASE + p.team.index) }}>
      <Avatar avatar={TEAM_AVATAR_BASE + p.team.index} size={34} sticker={false} />
      <span>
        <b>{p.team.name}</b> · your picks are votes, the team's majority wins
      </span>
    </div>
  );
}

/** Movement-card variant: play one of three cards instead of rolling. */
function CardHand({ conn, p }: { conn: PlayerScreenProps['conn']; p: BoardPlayerPhase }) {
  const cards = p.cards!;
  const locked = p.roll !== null;
  useVirtualKeys((e) => {
    if (!e.down || locked) return;
    const i = ['1', '2', '3'].indexOf(e.raw ?? '');
    if (i >= 0) conn.intent({ type: 'card', index: i });
  }, !locked);
  return (
    <div className="bp-cards" role="group" aria-label="Movement cards">
      {cards.map((v, i) => (
        <button key={i} type="button" className="bp-card" aria-pressed={p.myCard === i} disabled={locked} onClick={() => conn.intent({ type: 'card', index: i })}>
          <span className="bp-card-value">{v}</span>
          <span className="muted">spaces</span>
        </button>
      ))}
    </div>
  );
}

function RollStage({ conn, p, view }: { conn: PlayerScreenProps['conn']; p: BoardPlayerPhase; view: PlayerScreenProps['view'] }) {
  const device = useDevice();
  const [fullMap, setFullMap] = useState(false);
  const cards = !!p.cards?.length;
  // The title waits for the die to stop tumbling, so it never gives the number away early.
  const [landed, setLanded] = useState(p.roll !== null);
  // Space throws the die (handled by the dice tray).
  const title = cards
    ? p.roll !== null
      ? `Moving ${p.roll}!`
      : p.myCard !== null
        ? 'Waiting for your team…'
        : 'Play a card'
    : p.roll === null
      ? p.team
        ? 'Roll for your team'
        : 'Your turn to roll'
      : !landed
        ? 'Rolling…'
        : `${p.team ? 'Your team' : 'You'} rolled ${p.roll}!`;
  return (
    <div className="bp">
      <TeamBanner p={p} />
      <div className="mg-player-head">
        <h2>{title}</h2>
        <Countdown conn={conn} until={p.endsAt} />
      </div>
      {p.def && (
        <div className="bp-map-tools">
          <span>{fullMap ? 'Whole board' : 'Near your space'}</span>
          <button type="button" className="btn white small" aria-pressed={fullMap} onClick={() => setFullMap((v) => !v)}>{fullMap ? 'Near me' : 'Full map'}</button>
        </div>
      )}
      {p.def && (
        <BoardSvg
          className="bp-map"
          def={p.def}
          stars={p.stars}
          focus={fullMap ? undefined : focusedView(p.def, p.position)}
          presentation="phone"
          highlights={[{ nodes: [p.position], colour: '#FFD23F' }, ...(p.trap !== null ? [{ nodes: [p.trap], colour: '#E5484D' }] : [])]}
        />
      )}
      {p.def && <BoardLegend />}
      {p.def && <ItemPicker conn={conn} view={view} hand={p.hand} use={p.use} def={p.def} position={p.position} stars={p.stars} targets={p.targets} />}
      {p.coupon && <span className="chip">Star coupon ready: your next star is cheaper</span>}
      {cards ? (
        p.roll === null ? (
          <CardHand conn={conn} p={p} />
        ) : (
          <div className="bp-rolled pop-in">
            <Die value={p.roll} />
          </div>
        )
      ) : (
        <DiceTray value={p.roll} onThrow={() => conn.intent({ type: 'roll' })} onLanded={() => setLanded(true)} keyHint={!wantsOnScreenControls(device)} />
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
      <TeamBanner p={p} />
      <div className="mg-player-head">
        <h2>{p.myBranch !== null ? 'Voted! Waiting for your team…' : `Which way? ${p.remaining} to go`}</h2>
        <Countdown conn={conn} until={j.since + 10_000} />
      </div>
      <BoardSvg
        className="bp-map"
        def={def}
        stars={p.stars}
        focus={focus}
        presentation="focus"
        highlights={j.options.map((o, i) => ({ nodes: [j.node, ...o.preview], colour: ROUTES[i]?.colour ?? ROUTES[0].colour, dash: ROUTES[i]?.dash }))}
      />
      <div className="bp-choices">
        {j.options.map((o, i) => {
          const star = o.preview.some((id) => p.stars.includes(id));
          return (
            <button key={o.next} type="button" className="bp-choice" aria-pressed={p.myBranch === o.next} style={{ ['--path' as string]: ROUTES[i]?.colour ?? ROUTES[0].colour }} onClick={() => conn.intent({ type: 'branch', next: o.next })}>
              <span className={`bp-route-mark ${i === 1 ? 'dashed' : ''}`} aria-hidden="true" />
              {ROUTES[i]?.label ?? 'Route'}
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
        {p.team && ' Your team bids the highest amount any teammate seals.'}
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
            {p.team ? 'Your team landed on' : "You're"} {p.colour === 'blue' ? 'BLUE' : 'RED'}
          </div>
          <span className="muted">{p.team ? 'Team board: the next mini game is a team game, co-op or everyone for their team.' : 'The mini game format comes from the colours everyone landed on.'}</span>
        </div>
      </SpoilerGate>
    );
  return <WatchScreen />;
}
