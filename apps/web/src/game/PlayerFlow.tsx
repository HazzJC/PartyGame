import { ControlsCard, useVirtualKeys } from '../input/index.ts';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { WatchScreen } from '../player/WatchScreen.tsx';
import { Countdown, SpoilerGate } from '../timing/clock.tsx';
import { minigameUi, type MgPlayerPhase } from './registry.ts';
import { Shop } from './Shop.tsx';
import { FormatBadge } from '../ui/FormatBadge.tsx';
import { Demo, SceneStrip, themeOf, themeStyle } from '../minigames/theme/themes.tsx';
import { MySide } from './Sides.tsx';
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
  const teamBoard = !!(view.game as { teamBoard?: boolean } | null)?.teamBoard;
  if (!p.playing) return <WatchScreen text={`${p.name}: you're watching this one`} />;
  const gotIt = p.ready && !p.practice;
  return (
    <div className="pf">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="pf-title">{p.name}</h2>
        <Countdown conn={conn} until={p.endsAt} />
      </div>
      {p.practised ? <span className="chip rules-practised">Practice done: this one counts!</span> : <FormatBadge format={p.format} compact />}
      {p.teams && p.team !== null && p.team >= 0 && (p.format === '1vN' || p.format === 'team') && <MySide view={view} gameId={p.gameId} format={p.format} teams={p.teams} team={p.team} />}
      <Demo gameId={p.gameId} />
      <p className="pf-blurb">{p.blurb}</p>
      {teamBoard && p.format === 'ffa' && <p className="muted" style={{ margin: 0 }}>Team board: your placing counts towards your team's average.</p>}
      <div className="panel">
        <ControlsCard inputs={p.inputs} />
      </div>
      <div className="rules-choice">
        <button className="btn green big block" aria-pressed={gotIt} onClick={() => conn.intent({ type: 'ready' })}>
          {gotIt ? 'Got it! Waiting for the others…' : p.practised ? 'Got it: play for real' : "Got it, let's play"}
        </button>
        {p.canPractise && (
          <button className="btn white block" aria-pressed={!!p.practice} onClick={() => conn.intent({ type: 'practice' })}>
            {p.practice ? `You asked for practice (${p.practiceVotes} of ${p.voters})` : 'Practice first (no coins)'}
          </button>
        )}
      </div>
    </div>
  );
}

/** What the player sees once the reveal has reached their stream. */
function PersonalResult({ mg }: { mg: MgPlayerPhase }) {
  const r = mg.mine;
  if (!r) return <WatchScreen />;
  let headline = '';
  const res = r.result;
  if (res?.kind === 'ffa' && r.place) headline = r.place === 1 ? 'You won!' : `You came ${ordinal(r.place)}`;
  else if (res?.kind === 'coop') headline = res.grade === 'fail' ? 'The team failed…' : `Team ${res.grade}!`;
  else if (res?.kind === '1vN') headline = (mg.team === 0) === res.smallWins ? 'Your side won!' : 'Your side lost';
  else if (res?.kind === 'team' && mg.team !== null) headline = res.teamPlaces[mg.team] === 1 ? 'Your side won!' : 'Your side lost';
  return (
    <div className="pf center pop-in">
      {mg.practice ? <span className="chip rules-practised">Practice round</span> : <FormatBadge format={mg.format} compact />}
      <h2 className="pf-title" style={{ textAlign: 'center' }}>
        {headline}
      </h2>
      {mg.practice ? (
        <span className="muted">No coins for practice. The real one is next!</span>
      ) : (
        <>
          <div className="pf-coins">+{r.coins}</div>
          <span className="muted">coins</span>
        </>
      )}
    </div>
  );
}

export function MinigamePlayer({ conn, view }: PlayerScreenProps) {
  const mg = view.phase as unknown as MgPlayerPhase;
  const ui = minigameUi(mg.gameId);
  // Duels settle on their own result screen.
  if (mg.stage === 'reveal' && mg.format === 'duel') return <WatchScreen />;
  if (mg.stage === 'reveal')
    return (
      <SpoilerGate conn={conn} revealEndsAt={mg.revealEndsAt ?? 0} delayMs={view.me.streamDelayMs} waiting={<WatchScreen />}>
        <PersonalResult mg={mg} />
      </SpoilerGate>
    );
  if (!mg.playing) return <WatchScreen text="You're watching this one" />;
  if (!ui) return <WatchScreen text={`Missing UI for ${mg.gameId}`} />;
  // A slice of the game's scene across the top, so each game feels like its own place.
  return (
    <div className="mg-player-themed" data-game={mg.gameId} style={themeStyle(mg.gameId)}>
      {mg.practice && <div className="practice-strip">Practice round · no coins</div>}
      {themeOf(mg.gameId) && (
        <div className="mg-player-band">
          <SceneStrip gameId={mg.gameId} />
        </div>
      )}
      <ui.Player conn={conn} view={view} mg={mg} />
    </div>
  );
}

export function PayoutPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase;
  if (p.shop) return <Shop conn={conn} shop={p.shop} endsAt={p.endsAt} />;
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
