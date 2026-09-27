import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { TextAnswer } from '../input/index.ts';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { AvatarStack, SubmittedRow } from './common.tsx';
import './minigames.css';
import './wave-b.css';

interface HostData {
  prompt: string;
  stage: 'write' | 'match' | 'show';
  submitted: string[];
  cards: string[];
  writers: string[] | null;
  correct: string[][] | null;
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const seats = seatMap(view);
  const now = useServerNow(conn, 5);
  // Unmask one card at a time during the reveal.
  const revealed = d.writers && mg.revealEndsAt ? Math.floor((now - (mg.revealEndsAt - (3000 + d.cards.length * 1400)) - 1500) / 1400) + 1 : 0;
  return (
    <div className="mg-host">
      <div className="word-prompt sticker">
        <h2>{d.prompt}</h2>
      </div>
      {d.stage === 'write' ? (
        <SubmittedRow view={view} ids={mg.participants} submitted={d.submitted} />
      ) : (
        <div className="who-cards">
          {d.cards.map((text, i) => {
            const writer = d.writers && i < revealed ? seats.get(d.writers[i]!) : undefined;
            return (
              <div key={i} className="who-card sticker" data-revealed={!!writer}>
                <span className="who-n">{i + 1}</span>
                <p>{text}</p>
                {writer && (
                  <div className="who-writer pop-in">
                    <Avatar avatar={writer.avatar} size={52} />
                    <b>{writer.name}</b>
                    {d.correct && <AvatarStack view={view} ids={d.correct[i] ?? []} size={30} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PlayerData {
  prompt: string;
  stage: 'write' | 'match' | 'show';
  closesAt: number;
  myAnswer: string | null;
  cards: { i: number; text: string }[];
  myGuesses: Record<number, string>;
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  const others = view.seats.filter((s) => s.id !== view.me.id);
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>{d.stage === 'write' ? 'Write an answer' : 'Who wrote it?'}</h2>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <h3 className="word-prompt-small">{d.prompt}</h3>
      {d.stage === 'write' ? (
        <TextAnswer placeholder="Your answer" onSubmit={(text) => conn.intent({ type: 'write', text })} submitted={d.myAnswer} locked={!!d.myAnswer} />
      ) : (
        <div className="who-guess-list">
          {d.cards.map((c) => (
            <div key={c.i} className="who-guess sticker">
              <p>“{c.text}”</p>
              <div className="who-guess-row">
                {others.map((s) => (
                  <button key={s.id} type="button" className="who-guess-btn" aria-pressed={d.myGuesses[c.i] === s.id} onClick={() => conn.intent({ type: 'guess', card: c.i, writer: s.id })} title={s.name}>
                    <Avatar avatar={s.avatar} size={36} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

registerMinigameUi('who-wrote-that', { Host, Player });
