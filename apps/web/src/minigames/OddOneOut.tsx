import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { TextAnswer, Vote } from '../input/index.ts';
import { Countdown } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { SubmittedRow } from './common.tsx';
import './minigames.css';
import './wave-b.css';

interface HostData {
  stage: 'clue' | 'vote' | 'show';
  submitted: string[];
  clues: Record<string, string>;
  votes: Record<string, string> | null;
  imposters: string[] | null;
  words: [string, string] | null;
  accused: string[];
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const seats = seatMap(view);
  const tally = new Map<string, number>();
  if (d.votes) for (const t of Object.values(d.votes)) tally.set(t, (tally.get(t) ?? 0) + 1);
  return (
    <div className="mg-host">
      <p className="mg-host-lead">
        {d.words ? (
          <>
            The word was <b>{d.words[0]}</b>. The odd one out had <b>{d.words[1]}</b>.
          </>
        ) : d.stage === 'clue' ? (
          'Everyone has a secret word on their phone. Someone’s is different, and they don’t know it!'
        ) : (
          'Who is the odd one out? Vote on your phone.'
        )}
      </p>
      {d.stage === 'clue' ? (
        <SubmittedRow view={view} ids={mg.participants} submitted={d.submitted} size={64} />
      ) : (
        <div className="odd-cards">
          {mg.participants.map((id) => {
            const s = seats.get(id);
            if (!s) return null;
            const imposter = d.imposters?.includes(id);
            return (
              <div key={id} className="odd-card sticker" data-imposter={!!imposter} data-accused={d.accused.includes(id)}>
                <Avatar avatar={s.avatar} size={64} dim={d.stage === 'vote' && !d.submitted.includes(id)} />
                <span className="odd-name">{s.name}</span>
                <span className="odd-clue">“{d.clues[id] ?? '…'}”</span>
                {d.votes && <span className="chip">{tally.get(id) ?? 0} votes</span>}
                {imposter && <span className="odd-tag">ODD ONE</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PlayerData {
  stage: 'clue' | 'vote' | 'show';
  closesAt: number;
  word: string;
  myClue: string | null;
  myVote: string | null;
  clues: Record<string, string>;
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  const seats = seatMap(view);
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>{d.stage === 'clue' ? 'Give a clue' : 'Vote'}</h2>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <div className="odd-word sticker">
        <span className="muted">Your secret word</span>
        <b>{d.word}</b>
      </div>
      {d.stage === 'clue' ? (
        <>
          <p className="muted" style={{ margin: 0 }}>
            One word that fits it, without giving it away. Someone may have a different word!
          </p>
          <TextAnswer placeholder="Your clue" maxLength={20} onSubmit={(text) => conn.intent({ type: 'clue', text })} submitted={d.myClue} locked={!!d.myClue} />
        </>
      ) : (
        <Vote
          items={Object.entries(d.clues)
            .filter(([id]) => id !== view.me.id)
            .map(([id, clue]) => ({ id, label: `${seats.get(id)?.name ?? '?'}: “${clue}”` }))}
          selected={d.myVote}
          onVote={(target) => conn.intent({ type: 'vote', target })}
        />
      )}
    </div>
  );
}

registerMinigameUi('odd-one-out', { Host, Player });
