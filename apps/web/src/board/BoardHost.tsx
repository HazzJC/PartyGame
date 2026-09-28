import type { BoardDef, HostView, Spotlight } from '@partygame/engine';
import { HostGameFrame, seatMap, StarIcon } from '../game/HostFlow.tsx';
import type { HostScreenProps } from '../host/registry.tsx';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { BoardSvg, BoardLegend, type Pawn } from './BoardSvg.tsx';
import { pawnXY } from './walk.ts';
import { useEffect } from 'react';
import { sound } from '../audio/sound.ts';
import { Burst } from '../ui/Confetti.tsx';
import './board.css';

interface HostWalk {
  roll: number | null;
  path: number[];
  start: number;
  finalAt: number | null;
  deciding: boolean;
}

interface BoardHostPhase {
  stage: 'roll' | 'items' | 'move' | 'bid' | 'resolve';
  itemLines: string[];
  cards?: boolean;
  def: BoardDef;
  stars: number[];
  starPrice: number;
  walks: Record<string, HostWalk>;
  positions: Record<string, number>;
  contests: { star: number; bidders: string[]; submitted: string[] }[];
  landing: Record<string, number>;
  colours: Record<string, 'blue' | 'red'>;
  flipped: string[];
  spotlights: Spotlight[];
  summary: string[];
  resolveAt: number | null;
  stepMs: number;
  timeline: { landingMs: number; flipMs: number; spotlightMs: number; summaryMs: number };
  endsAt: number | null;
}


function SpotlightCard({ spot, view }: { spot: Spotlight; view: HostView }) {
  const seats = seatMap(view);
  const data = spot.data as { winner?: string; bids?: Record<string, number> } | undefined;
  const starry = spot.kind === 'star' || spot.kind === 'contest';
  useEffect(() => sound.play(starry ? 'motifStar' : /lost|drops|paid|trap/i.test(spot.text) ? 'motifLoss' : 'pop'), [spot, starry]);
  return (
    <div className="spot-back">
      <div className="spot-card sticker pop-in" data-kind={spot.kind}>
        <div className="spot-announcement">{starry ? '★ Star moment!' : 'Board event!'}</div>
        {starry && <div className="spot-celebration"><Burst kind="star" count={12} delayMs={1050} /></div>}
        <div className="spot-title">
          {(spot.kind === 'star' || spot.kind === 'contest') && <StarIcon size={70} />}
          {spot.title}
        </div>
        <div className="spot-avatars">
          {spot.seats.map((id) => {
            const s = seats.get(id);
            return s ? (
              <div key={id} className="spot-av" data-winner={data?.winner === id}>
                <Avatar avatar={s.avatar} size={spot.seats.length > 3 ? 110 : 150} />
                {data?.bids && <span className="chip spot-bid">{data.bids[id]} coins</span>}
              </div>
            ) : null;
          })}
        </div>
        <p className="spot-text">{spot.text}</p>
      </div>
    </div>
  );
}

export function BoardHost({ conn, view }: HostScreenProps) {
  const p = view.phase as unknown as BoardHostPhase;
  const now = useServerNow(conn, p.stage === 'move' || p.stage === 'resolve' ? 60 : 8);
  const seats = seatMap(view);
  const def = p.def;

  // Resolve timeline: landing numbers → coin flips → spotlights → summary.
  const tl = p.timeline;
  const since = p.resolveAt ? now - p.resolveAt : -1;
  const inLanding = p.stage === 'resolve' && since >= 0 && since < tl.landingMs;
  const inFlip = p.stage === 'resolve' && since >= tl.landingMs && since < tl.landingMs + tl.flipMs;
  const spotIndex = p.stage === 'resolve' ? Math.floor((since - tl.landingMs - tl.flipMs) / tl.spotlightMs) : -1;
  const spot = spotIndex >= 0 && spotIndex < p.spotlights.length ? p.spotlights[spotIndex] : null;
  const inSummary = p.stage === 'resolve' && p.summary.length > 0 && spotIndex >= p.spotlights.length;
  const colourShown = p.stage === 'resolve' && since >= tl.landingMs + tl.flipMs;

  // Pawns belong to board pieces: players, or teams in team board mode.
  const pieces = Object.keys(p.positions)
    .map((id) => seats.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const pawns: Pawn[] = pieces.map((s) => {
    const w = p.walks[s.id];
    const at = w ? pawnXY(def, w, now, p.stepMs) : { ...def.nodes[p.positions[s.id] ?? def.start]!, facing: 1 as const, walking: false };
    let badge: Pawn['badge'];
    let badgeTone: Pawn['badgeTone'] = 'plain';
    if (p.stage === 'roll' && w?.roll) badge = w.roll;
    else if (p.stage === 'move' && w?.deciding) badge = '?';
    else if (p.stage === 'move' && w?.finalAt && now - w.finalAt < w.path.length * p.stepMs) badge = Math.max(0, w.path.length - Math.floor((now - w.finalAt) / p.stepMs));
    else if (inLanding && p.landing[s.id] !== undefined && p.landing[s.id] !== 0) {
      badge = p.landing[s.id]! > 0 ? `+${p.landing[s.id]}` : `${p.landing[s.id]}`;
      badgeTone = p.landing[s.id]! > 0 ? 'good' : 'bad';
    }
    const moving = p.stage === 'move' && !!w?.finalAt && now >= w.finalAt && now < w.finalAt + w.path.length * p.stepMs;
    return { id: s.id, avatar: s.avatar, x: at.x, y: at.y, dim: !s.connected, badge, badgeTone, stationary: !moving, facing: at.facing, walking: at.walking };
  });

  const rolled = Object.values(p.walks).filter((w) => w.roll !== null).length;
  const blue = Object.values(p.colours).filter((c) => c === 'blue').length;
  const red = Object.values(p.colours).filter((c) => c === 'red').length;

  return (
    <HostGameFrame
      view={view}
      title={
        p.stage === 'roll' ? (
          `${p.cards ? 'Play a movement card' : 'Tap Roll'} on your phone · ${rolled}/${pieces.length}`
        ) : p.stage === 'move' ? (
          Object.values(p.walks).some((w) => w.deciding) ? 'Players marked ? are choosing a path' : 'Moving'
        ) : p.stage === 'bid' ? (
          'Star contest!'
        ) : p.stage === 'items' ? (
          'Items revealed'
        ) : colourShown ? (
          <span className="board-sides">
            <span className="side blue">Blue {blue}</span> · <span className="side red">Red {red}</span>
          </span>
        ) : (
          'Landing'
        )
      }
      right={p.stage === 'roll' || p.stage === 'bid' ? <Countdown conn={conn} until={p.endsAt} /> : <span className="chip">★ {p.starPrice} coins</span>}
    >
      <div className="board-host">
        <BoardSvg className="board-svg" def={def} stars={p.stars} pawns={pawns} pawnSize={pawns.length > 10 ? 46 : 56} presentation="host" />
        <BoardLegend />
        {p.stage === 'bid' &&
          p.contests.map((c, i) => (
            <div key={i} className="spot-back">
              <div className="spot-card sticker pop-in" data-kind="contest">
                <div className="spot-title">
                  <StarIcon size={70} /> Star contest!
                </div>
                <p className="spot-text">Sealed bids on your phones. Highest bid buys the star.</p>
                <div className="spot-avatars">
                  {c.bidders.map((id) => {
                    const s = seats.get(id);
                    return s ? (
                      <div key={id} className="spot-av">
                        <Avatar avatar={s.avatar} size={130} dim={!c.submitted.includes(id)} />
                        <span className="chip spot-bid">{c.submitted.includes(id) ? 'Bid in ✓' : 'Thinking…'}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          ))}
        {p.stage === 'items' && (
          <div className="spot-back">
            <div className="spot-card sticker pop-in">
              <div className="spot-title">Items!</div>
              <ul className="spot-summary">
                {p.itemLines.map((t, i) => (
                  <li key={i} className="pop-in" style={{ animationDelay: `${i * 250}ms` }}>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {inFlip && (
          <div className="spot-back">
            <div className="spot-card sticker pop-in">
              <div className="spot-title">Coin flip!</div>
              <p className="spot-text">Neutral spaces get a colour at random</p>
              <div className="spot-avatars">
                {p.flipped.map((id) => {
                  const s = seats.get(id);
                  const shown = since >= tl.landingMs + 1100;
                  return s ? (
                    <div key={id} className="spot-av">
                      <Avatar avatar={s.avatar} size={110} />
                      <span className="flip-coin" data-colour={shown ? p.colours[id] : 'spin'}>
                        {shown ? (p.colours[id] === 'blue' ? 'BLUE' : 'RED') : ''}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}
        {spot && <SpotlightCard key={spotIndex} spot={spot} view={view} />}
        {inSummary && (
          <div className="spot-back">
            <div className="spot-card sticker pop-in">
              <div className="spot-title">Also this round</div>
              <ul className="spot-summary">
                {p.summary.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </HostGameFrame>
  );
}
