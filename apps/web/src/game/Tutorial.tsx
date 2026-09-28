import type { TutorialSlide } from '@partygame/shared';
import type { HostScreenProps } from '../host/registry.tsx';
import { useVirtualKeys } from '../input/index.ts';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { Countdown } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { Coin, HostGameFrame, StarIcon } from './HostFlow.tsx';
import './game.css';
import { Icon } from '../ui/Icons.tsx';
import './tutorial.css';

const SPACE_COLOURS: Record<string, string> = { blue: '#3D7BFF', red: '#FF4D5E', event: '#9B5DE5', shop: '#FFB703', duel: '#1B998B' };
const SPACE_GLYPH: Record<string, string> = { blue: '+', red: '−', event: '?', shop: '$', duel: 'VS' };

function Space({ kind, size = 84 }: { kind: string; size?: number }) {
  return (
    <span className="tut-space" style={{ width: size, height: size, background: SPACE_COLOURS[kind], fontSize: size * 0.42 }}>
      {SPACE_GLYPH[kind]}
    </span>
  );
}

/** One simple sticker illustration per slide. */
function Picture({ id }: { id: TutorialSlide['id'] }) {
  switch (id) {
    case 'goal':
      return (
        <div className="tut-pic">
          <StarIcon size={150} />
          <StarIcon size={110} />
          <Coin size={90} />
        </div>
      );
    case 'board':
      return (
        <div className="tut-pic">
          {['blue', 'red', 'event', 'shop', 'duel'].map((k) => (
            <Space key={k} kind={k} />
          ))}
        </div>
      );
    case 'stars':
      return (
        <div className="tut-pic">
          <Avatar avatar={0} size={110} />
          <span className="tut-arrow">→</span>
          <StarIcon size={130} />
          <span className="tut-price">
            20 <Coin size={44} />
          </span>
        </div>
      );
    case 'minigames':
      return (
        <div className="tut-pic">
          <span className="chip tut-chip blue">Blue 5</span>
          <span className="chip tut-chip red">Red 3</span>
          <span className="tut-arrow">→</span>
          <span className="chip tut-chip">Team game!</span>
        </div>
      );
    case 'phone':
      return (
        <div className="tut-pic">
          <span className="tut-phone">
            <Icon name="secret" size={60} />
          </span>
          <Avatar avatar={5} size={100} />
          <Avatar avatar={9} size={100} />
        </div>
      );
  }
}

interface TutorialView {
  slide: number;
  slideAt: number;
  slideMs: number;
  slides: TutorialSlide[];
  ready: string[];
  humans: number;
}

export function TutorialHost({ conn, view }: HostScreenProps) {
  const p = view.phase as unknown as TutorialView;
  const s = p.slides[p.slide]!;
  return (
    <HostGameFrame view={view} title="How to play" right={<Countdown conn={conn} until={p.slideAt + p.slideMs} />}>
      <div key={s.id} className="tut-card sticker pop-in">
        <Picture id={s.id} />
        <h1>{s.title}</h1>
        {s.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
        <div className="tut-foot">
          <span className="tut-dots" aria-label={`Slide ${p.slide + 1} of ${p.slides.length}`}>
            {p.slides.map((x, i) => (
              <span key={x.id} data-on={i === p.slide} />
            ))}
          </span>
          <span className="muted">
            {p.ready.length}/{p.humans} got it · press Got it on your phone to skip ahead
          </span>
        </div>
      </div>
    </HostGameFrame>
  );
}

export function TutorialPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase as unknown as { slide: number; slides: TutorialSlide[]; ready: boolean };
  const s = p.slides[p.slide]!;
  useVirtualKeys((e) => {
    if (e.down && e.key === 'confirm' && !p.ready) conn.intent({ type: 'ready' });
  }, !p.ready);
  return (
    <div className="pf">
      <h2 className="pf-title">{s.title}</h2>
      {s.lines.map((l) => (
        <p key={l} className="pf-blurb">
          {l}
        </p>
      ))}
      <span className="tut-dots">
        {p.slides.map((x, i) => (
          <span key={x.id} data-on={i === p.slide} />
        ))}
      </span>
      <button className="btn green big block" disabled={p.ready} onClick={() => conn.intent({ type: 'ready' })}>
        {p.ready ? 'Waiting for the others…' : 'Got it'}
      </button>
    </div>
  );
}
