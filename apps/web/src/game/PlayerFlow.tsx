import { ControlsCard, useVirtualKeys } from '../input/index.ts';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { WatchScreen } from '../player/WatchScreen.tsx';
import { Countdown, SpoilerGate } from '../timing/clock.tsx';
import { minigameUi, type MgPlayerPhase } from './registry.ts';
import './game.css';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

export function RoundIntroPlayer({ view }: PlayerScreenProps) {
  return <WatchScreen text={`${view.phase.finalStretch ? 'Final stretch! ' : ''}Round ${view.phase.round} of ${view.phase.rounds}`} />;
}

export function RulesPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase;
  useVirtualKeys((e) => {
    if (e.down && e.key === 'confirm' && !p.ready) conn.intent({ type: 'ready' });
  }, !p.ready);
  if (!p.playing) return <WatchScreen text={`${p.name}: you're watching this one`} />;
  return (
    <div className="pf">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="pf-title">{p.name}</h2>
        <Countdown conn={conn} until={p.endsAt} />
      </div>
      {p.team !== null && p.team >= 0 && <span className="chip pf-team">Team {p.team + 1}</span>}
      <p className="pf-blurb">{p.blurb}</p>
      <div className="panel">
        <ControlsCard inputs={p.inputs} />
      </div>
      <button className="btn green big block" disabled={p.ready} onClick={() => conn.intent({ type: 'ready' })}>
        {p.ready ? 'Ready! Waiting for others…' : 'Ready'}
      </button>
    </div>
  );
}

/** What the player sees once the reveal has reached their stream. */
function PersonalResult({ mg }: { mg: MgPlayerPhase }) {
  const r = mg.mine;
  if (!r) return <WatchScreen />;
  let headline = '';
  if (r.result?.kind === 'ffa' && r.place) headline = r.place === 1 ? 'You won!' : `You came ${ordinal(r.place)}`;
  else if (r.result?.kind === 'coop') headline = r.result.grade === 'fail' ? 'The team failed…' : `Team ${r.result.grade}!`;
  else if (r.result?.kind === '1vN' || r.result?.kind === 'team') headline = r.coins >= 8 ? 'Your side won!' : 'Your side lost';
  return (
    <div className="pf center pop-in">
      <h2 className="pf-title" style={{ textAlign: 'center' }}>
        {headline}
      </h2>
      <div className="pf-coins">+{r.coins}</div>
      <span className="muted">coins</span>
    </div>
  );
}

export function MinigamePlayer({ conn, view }: PlayerScreenProps) {
  const mg = view.phase as unknown as MgPlayerPhase;
  const ui = minigameUi(mg.gameId);
  if (mg.stage === 'reveal')
    return (
      <SpoilerGate conn={conn} revealEndsAt={mg.revealEndsAt ?? 0} delayMs={view.me.streamDelayMs} waiting={<WatchScreen />}>
        <PersonalResult mg={mg} />
      </SpoilerGate>
    );
  if (!mg.playing) return <WatchScreen text="You're watching this one" />;
  return ui ? <ui.Player conn={conn} view={view} mg={mg} /> : <WatchScreen text={`Missing UI for ${mg.gameId}`} />;
}

export function PayoutPlayer({ view }: PlayerScreenProps) {
  const p = view.phase;
  return (
    <div className="pf center">
      <span className="muted">This round</span>
      <div className="pf-coins">+{p.gained}</div>
      <h2 className="pf-title">
        You're {ordinal(p.rank)} of {p.of}
      </h2>
    </div>
  );
}

export function PodiumPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase;
  return (
    <div className="pf center">
      <h2 className="pf-title">{p.rank === 1 ? 'You won the game!' : `You finished ${ordinal(p.rank)}`}</h2>
      {view.me.vip && (
        <div className="stack" style={{ width: '100%' }}>
          <button className="btn green big block" onClick={() => conn.host({ action: 'start' })}>
            Play again
          </button>
          <button className="btn white block" onClick={() => conn.host({ action: 'backToLobby' })}>
            Back to lobby
          </button>
        </div>
      )}
    </div>
  );
}
