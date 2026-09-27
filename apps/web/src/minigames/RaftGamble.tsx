import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';

interface HostData {
  island: number;
  maxIslands: number;
  stage: 'decide' | 'show';
  aboard: string[];
  carry: Record<string, number>;
  banked: Record<string, number>;
  chance: number;
  sank: boolean | null;
  submitted: string[];
  decisions: Record<string, 'bank' | 'stay'> | null;
  reward: number;
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const seats = seatMap(view);
  const shore = mg.participants.filter((id) => !d.aboard.includes(id) || d.decisions?.[id] === 'bank');
  const raft = mg.participants.filter((id) => !shore.includes(id));
  return (
    <div className="mg-host">
      <p className="mg-host-lead">
        {d.stage === 'show' ? (d.sank ? 'The raft SANK! Everyone aboard lost their treasure.' : 'The raft made it!') : `Island ${d.island} of ${d.maxIslands}: bank or stay? Danger ahead: ${Math.round(d.chance * 100)}%`}
      </p>
      <div className="raft-sea">
        <div className="raft-islands">
          {Array.from({ length: d.maxIslands }, (_, i) => (
            <span key={i} className="raft-island" data-here={i + 1 === d.island} data-past={i + 1 < d.island}>
              {i + 1}
            </span>
          ))}
        </div>
        <div className="raft sticker" data-sank={d.sank === true}>
          {raft.map((id) => {
            const s = seats.get(id);
            return s ? (
              <div key={id} className="raft-seat">
                <Avatar avatar={s.avatar} size={64} />
                <span className="chip">{d.carry[id] ?? 0}</span>
              </div>
            ) : null;
          })}
          {raft.length === 0 && <span className="muted">Empty raft</span>}
        </div>
      </div>
      <div className="raft-shore">
        <span className="chip">On the shore</span>
        {shore.map((id) => {
          const s = seats.get(id);
          return s ? (
            <span key={id} className="raft-banked">
              <Avatar avatar={s.avatar} size={48} />
              {(d.banked[id] ?? 0) + (d.decisions?.[id] === 'bank' ? d.carry[id] ?? 0 : 0)}
            </span>
          ) : null;
        })}
      </div>
      {d.stage === 'decide' && <SubmittedRow view={view} ids={mg.participants} submitted={d.submitted} size={44} />}
    </div>
  );
}

interface PlayerData {
  island: number;
  maxIslands: number;
  stage: 'decide' | 'show';
  closesAt: number;
  aboard: boolean;
  carry: number;
  banked: number;
  sideWins: number;
  chance: number;
  myChoice: 'bank' | 'stay' | null;
  myBet: 'safe' | 'sink' | null;
  shownAt: number;
  sank: boolean | null;
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  if (d.stage === 'show')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt}>
        <h2 className="pf-title">{d.sank ? 'The raft sank!' : 'Safe passage!'}</h2>
        <span className="chip">
          Banked {d.banked} · Side bets +{d.sideWins}
        </span>
      </RoundResult>
    );
  const head = <RoundHead conn={conn} title={`Island ${d.island}`} round={d.island} rounds={d.maxIslands} closesAt={d.closesAt} />;
  if (d.aboard)
    return (
      <div className="mg-player">
        {head}
        <p className="muted" style={{ margin: 0 }}>
          You carry <b>{d.carry}</b> treasure. Chance the raft sinks on the next leg: <b>{Math.round(d.chance * 100)}%</b>.
        </p>
        <div className="raft-choices">
          <button className="raft-choice bank" aria-pressed={d.myChoice === 'bank'} onClick={() => conn.intent({ type: 'raft', choice: 'bank' })}>
            Bank {d.carry}
          </button>
          <button className="raft-choice stay" aria-pressed={d.myChoice === 'stay'} onClick={() => conn.intent({ type: 'raft', choice: 'stay' })}>
            Stay aboard
          </button>
        </div>
      </div>
    );
  return (
    <div className="mg-player">
      {head}
      <p className="muted" style={{ margin: 0 }}>
        You banked {d.banked}. Side bet: will the raft make the next leg? (+3 if right)
      </p>
      <div className="raft-choices">
        <button className="raft-choice stay" aria-pressed={d.myBet === 'safe'} onClick={() => conn.intent({ type: 'sideBet', bet: 'safe' })}>
          It'll make it
        </button>
        <button className="raft-choice bank" aria-pressed={d.myBet === 'sink'} onClick={() => conn.intent({ type: 'sideBet', bet: 'sink' })}>
          It'll sink
        </button>
      </div>
    </div>
  );
}

registerMinigameUi('raft-gamble', { Host, Player });
