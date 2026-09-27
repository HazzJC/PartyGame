import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Grid } from '../input/index.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';

/** Sonar strength 0..9 → sea colour (flat steps, no gradients, so it survives a stream). */
const SEA = ['#1d3557', '#1f4068', '#234e7a', '#2a628f', '#3178a3', '#3b8fb6', '#4aa6c8', '#63bcd6', '#86d0e2', '#b3e3ee'];

interface HostData {
  side: number;
  round: number;
  rounds: number;
  stage: 'pick' | 'show';
  sonar: number[];
  submitted: string[];
  fish: number[] | null;
  nets: Record<string, number> | null;
  gains: Record<string, number> | null;
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const seats = seatMap(view);
  const byCell = new Map<number, string[]>();
  if (d.nets) for (const [id, c] of Object.entries(d.nets)) byCell.set(c, [...(byCell.get(c) ?? []), id]);
  return (
    <div className="mg-host">
      <p className="mg-host-lead">
        Round {d.round}/{d.rounds}. {d.stage === 'pick' ? 'The public sonar is blurry. Trust your phone!' : 'Nets up!'}
      </p>
      <div className="sonar-grid" style={{ gridTemplateColumns: `repeat(${d.side}, 1fr)` }}>
        {d.sonar.map((v, i) => {
          const who = byCell.get(i) ?? [];
          const tangled = who.length > 1;
          return (
            <div key={i} className="sonar-cell" style={{ background: SEA[d.fish ? d.fish[i]! : v] }} data-tangled={tangled}>
              {d.fish && <span className="sonar-fish">{d.fish[i]}</span>}
              {who.map((id) => {
                const s = seats.get(id);
                return s ? <Avatar key={id} avatar={s.avatar} size={who.length > 1 ? 36 : 52} /> : null;
              })}
            </div>
          );
        })}
      </div>
      {d.stage === 'pick' && <SubmittedRow view={view} ids={mg.participants} submitted={d.submitted} size={48} />}
    </div>
  );
}

interface PlayerData {
  side: number;
  round: number;
  rounds: number;
  stage: 'pick' | 'show';
  closesAt: number;
  sonar: number[];
  reading: [number, number][];
  myNet: number | null;
  myGain: number | null;
  myScore: number;
  shownAt: number;
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  if (d.stage === 'show')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt}>
        <h2 className="pf-title">{d.myGain ? `Caught ${d.myGain} fish!` : 'Empty net…'}</h2>
        <span className="chip">Total {d.myScore}</span>
      </RoundResult>
    );
  const exact = new Map(d.reading);
  return (
    <div className="mg-player">
      <RoundHead conn={conn} title="Drop your net" round={d.round} rounds={d.rounds} closesAt={d.closesAt} />
      <p className="muted" style={{ margin: 0 }}>
        Numbers are your private sonar: exact fish counts. Share or bluff. Two nets on one cell catch nothing.
      </p>
      <Grid
        w={d.side}
        h={d.side}
        cell={(x, y) => {
          const i = y * d.side + x;
          const known = exact.get(i);
          return { fill: d.myNet === i ? '#FFD23F' : SEA[known ?? d.sonar[i]!]!, glyph: known !== undefined ? String(known) : undefined, glyphColour: '#FFFFFF', stroke: known !== undefined ? '#FFFFFF' : undefined };
        }}
        onCell={(x, y) => conn.intent({ type: 'net', cell: y * d.side + x })}
      />
    </div>
  );
}

registerMinigameUi('deep-sea-sonar', { Host, Player });
