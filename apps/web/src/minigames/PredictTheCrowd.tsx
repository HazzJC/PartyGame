import { useEffect, useState } from 'react';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Pick, Rank } from '../input/index.ts';
import { RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';
import './wave-b.css';

const BAR_COLOURS = ['#3D7BFF', '#FF4D5E', '#2EC27E', '#FFB703'];

interface HostData {
  round: number;
  rounds: number;
  q: string;
  options: string[];
  stage: 'answer' | 'show';
  submitted: string[];
  counts: number[] | null;
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const max = Math.max(1, ...(d.counts ?? [1]));
  return (
    <div className="mg-host">
      <div className="word-prompt sticker">
        <span className="chip">
          Question {d.round}/{d.rounds}
        </span>
        <h2>{d.q}</h2>
      </div>
      <div className="predict-bars">
        {d.options.map((o, i) => (
          <div key={o} className="predict-bar">
            <div className="predict-fill" style={{ height: d.counts ? `${(d.counts[i]! / max) * 100}%` : '0%', background: BAR_COLOURS[i] }}>
              {d.counts && <span>{d.counts[i]}</span>}
            </div>
            <span className="predict-label sticker">{o}</span>
          </div>
        ))}
      </div>
      {d.stage === 'answer' && <SubmittedRow view={view} ids={mg.participants} submitted={d.submitted} size={48} />}
    </div>
  );
}

interface PlayerData {
  round: number;
  rounds: number;
  q: string;
  options: string[];
  stage: 'answer' | 'show';
  closesAt: number;
  myChoice: number | null;
  myRank: number[] | null;
  gained: number | null;
  points: number;
  shownAt: number;
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  const [order, setOrder] = useState<string[]>(['0', '1', '2', '3']);
  useEffect(() => setOrder(['0', '1', '2', '3']), [d.round]);
  if (d.stage === 'show')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt}>
        <h2 className="pf-title">+{d.gained ?? 0} points</h2>
        <span className="chip">Total {d.points}</span>
      </RoundResult>
    );
  const head = <RoundHead conn={conn} title={d.q} round={d.round} rounds={d.rounds} closesAt={d.closesAt} />;
  if (d.myChoice === null)
    return (
      <div className="mg-player">
        {head}
        <p className="muted" style={{ margin: 0 }}>
          Step 1: your own answer
        </p>
        <Pick columns={2} options={d.options.map((o, i) => ({ id: String(i), label: o }))} selected={null} onPick={(id) => conn.intent({ type: 'choose', option: Number(id) })} />
      </div>
    );
  return (
    <div className="mg-player">
      {head}
      <p className="muted" style={{ margin: 0 }}>
        Step 2: rank them by how many people you think chose each (most at the top).
      </p>
      <Rank items={d.options.map((o, i) => ({ id: String(i), label: o }))} order={d.myRank ? d.myRank.map(String) : order} onChange={setOrder} locked={!!d.myRank} />
      <button className="btn green big block" disabled={!!d.myRank} onClick={() => conn.intent({ type: 'rank', order: order.map(Number) })}>
        {d.myRank ? 'Locked in ✓' : 'Lock in my ranking'}
      </button>
    </div>
  );
}

registerMinigameUi('predict-the-crowd', { Host, Player });
