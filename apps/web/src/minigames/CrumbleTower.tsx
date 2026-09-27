import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';

type Row = [boolean, boolean, boolean];

const points = (row: number) => 1 + Math.floor(row / 2);

interface HostData {
  rows: Row[];
  round: number;
  maxRounds: number;
  stage: 'pick' | 'show';
  submitted: string[];
  log: { id: string; row: number; col: number; outcome: 'took' | 'bumped' | 'toppled' }[];
  fault: string | null;
  shownAt: number;
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const seats = seatMap(view);
  const now = useServerNow(conn, 10);
  // Replay the pulls one by one, lowest first.
  const shownPulls = d.stage === 'show' ? d.log.slice(0, Math.max(0, Math.floor((now - d.shownAt) / 450) + 1)) : [];
  const toppled = shownPulls.some((l) => l.outcome === 'toppled');
  const marks = new Map(shownPulls.map((l) => [`${l.row},${l.col}`, l]));
  return (
    <div className="mg-host tower-host">
      <div className="tower" data-toppled={toppled} style={{ gridTemplateRows: `repeat(${d.rows.length}, 1fr)` }}>
        {[...d.rows].map((row, r) => ({ row, r })).reverse().map(({ row, r }) => (
          <div key={r} className="tower-row" data-odd={r % 2 === 1}>
            {row.map((present, c) => {
              const mark = marks.get(`${r},${c}`);
              const s = mark ? seats.get(mark.id) : undefined;
              return (
                <div key={c} className="tower-block" data-present={present || (!!mark && mark.outcome !== 'bumped')} data-mark={mark?.outcome}>
                  {s && <Avatar avatar={s.avatar} size={30} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="tower-side">
        <p className="mg-host-lead">
          Round {d.round}/{d.maxRounds}
          <br />
          {toppled && d.fault ? `${seats.get(d.fault)?.name} toppled the tower!` : d.stage === 'show' ? 'Pulling blocks, lowest first…' : 'Pick a block on your phone. Higher blocks score more.'}
        </p>
        {d.stage === 'pick' && <SubmittedRow view={view} ids={mg.participants} submitted={d.submitted} size={48} />}
      </div>
    </div>
  );
}

interface PlayerData {
  rows: Row[];
  round: number;
  maxRounds: number;
  stage: 'pick' | 'show';
  closesAt: number;
  myPick: [number, number] | null;
  myScore: number;
  shownAt: number;
  fault: boolean;
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  if (d.stage === 'show')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt + d.rows.length * 20}>
        <h2 className="pf-title">{d.fault ? 'You toppled the tower!' : `${d.myScore} points so far`}</h2>
      </RoundResult>
    );
  const top = d.rows.length - 1;
  return (
    <div className="mg-player">
      <RoundHead conn={conn} title="Pull a block" round={d.round} rounds={d.maxRounds} closesAt={d.closesAt} />
      <p className="muted" style={{ margin: 0 }}>
        A row falls without its middle block and a side block. You have {d.myScore} points.
      </p>
      <div className="tower-pick">
        {[...d.rows].map((row, r) => ({ row, r })).reverse().map(({ row, r }) => (
          <div key={r} className="tower-pick-row">
            <span className="tower-pts">+{points(r)}</span>
            {row.map((present, c) => (
              <button
                key={c}
                type="button"
                className="tower-pick-block"
                disabled={!present || r === top}
                aria-pressed={d.myPick?.[0] === r && d.myPick?.[1] === c}
                onClick={() => conn.intent({ type: 'block', row: r, col: c })}
                aria-label={`Row ${r + 1} ${['left', 'middle', 'right'][c]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

registerMinigameUi('crumble-tower', { Host, Player });
