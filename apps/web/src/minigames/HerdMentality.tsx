import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { TextAnswer } from '../input/index.ts';
import { AvatarStack, RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';
import './wave-b.css';

interface HostData {
  round: number;
  rounds: number;
  mode: 'herd' | 'unique';
  prompt: string;
  stage: 'answer' | 'review' | 'show';
  submitted: string[];
  groups: { label: string; ids: string[] }[];
  mergeVotes: number;
  roundPoints: Record<string, number>;
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const scoring = new Set(Object.keys(d.roundPoints));
  return (
    <div className="mg-host">
      <div className="word-prompt sticker">
        <span className="chip word-mode" data-mode={d.mode}>
          {d.mode === 'herd' ? `Round ${d.round}/${d.rounds}: think like the herd` : 'Final round: be the only one!'}
        </span>
        <h2>{d.prompt}</h2>
      </div>
      {d.stage === 'answer' ? (
        <SubmittedRow view={view} ids={mg.participants} submitted={d.submitted} />
      ) : (
        <div className="herd-groups">
          {d.groups.map((g) => (
            <div key={g.label} className="herd-group sticker" data-scored={d.stage === 'show' && g.ids.some((id) => scoring.has(id))}>
              <b>{g.label}</b>
              <span className="herd-count">{g.ids.length}</span>
              <AvatarStack view={view} ids={g.ids} size={40} />
            </div>
          ))}
        </div>
      )}
      {d.stage === 'review' && <p className="muted" style={{ textAlign: 'center', fontSize: 28, margin: 0 }}>Same meaning, different words? Vote to merge on your phone. ({d.mergeVotes} votes)</p>}
    </div>
  );
}

interface PlayerData {
  round: number;
  rounds: number;
  mode: 'herd' | 'unique';
  prompt: string;
  stage: 'answer' | 'review' | 'show';
  closesAt: number;
  myAnswer: string | null;
  groups: { label: string; size: number; mine: boolean }[];
  myMerge: { from: string; to: string } | null;
  gained: number | null;
  points: number;
  shownAt: number;
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  if (d.stage === 'show')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt}>
        <h2 className="pf-title">{d.gained ? `+${d.gained} point!` : d.mode === 'herd' ? 'Not with the herd this time' : 'Someone had the same idea'}</h2>
        <span className="chip">Total {d.points}</span>
      </RoundResult>
    );
  const head = <RoundHead conn={conn} title={d.mode === 'herd' ? 'Match the herd' : 'Be unique'} round={d.round} rounds={d.rounds} closesAt={d.closesAt} />;
  if (d.stage === 'answer')
    return (
      <div className="mg-player">
        {head}
        <h3 className="word-prompt-small">{d.prompt}</h3>
        <p className="muted" style={{ margin: 0 }}>
          {d.mode === 'herd' ? 'Write what you think MOST people will write.' : 'Write something NOBODY else will write.'}
        </p>
        <TextAnswer onSubmit={(text) => conn.intent({ type: 'answer', text })} submitted={d.myAnswer} locked={false} />
        {d.myAnswer && <span className="chip">Sent: {d.myAnswer} (you can change it)</span>}
      </div>
    );
  const mine = d.groups.find((g) => g.mine);
  return (
    <div className="mg-player">
      {head}
      <p style={{ margin: 0 }}>
        Does another answer mean the same as <b>{mine?.label ?? 'yours'}</b>? Tap it to vote to merge.
      </p>
      <ul className="vote">
        {d.groups
          .filter((g) => !g.mine)
          .map((g) => (
            <li key={g.label}>
              <button
                type="button"
                className="vote-item"
                aria-pressed={d.myMerge?.to === g.label}
                disabled={!mine}
                onClick={() => conn.intent({ type: 'merge', from: mine!.label, to: d.myMerge?.to === g.label ? mine!.label : g.label })}
              >
                <span>{g.label}</span>
                <span className="chip" style={{ marginLeft: 'auto' }}>
                  {g.size}
                </span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

registerMinigameUi('herd-mentality', { Host, Player });
