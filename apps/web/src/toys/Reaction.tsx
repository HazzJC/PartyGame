import type { Cue, PublicSeat, ReactionResult } from '@partygame/engine';
import type { HostScreenProps } from '../host/registry.tsx';
import { ControlsCard, CueSurface } from '../input/index.ts';
import type { PlayerScreenProps } from '../player/registry.tsx';
import { useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './toys.css';

const fmt = (r: ReactionResult | undefined) => (!r ? '…' : 'ms' in r ? `${r.ms} ms` : 'falseStart' in r ? 'too early' : 'missed');
const deviceIcon = (s: PublicSeat) => (s.isBot ? '🤖' : s.device === 'touch' ? '📱' : s.device === 'mouse' ? '💻' : '');

export function ReactionHost({ conn, view }: HostScreenProps) {
  const p = view.phase;
  const now = useServerNow(conn, 30);
  const cues = (p.cues ?? []) as Cue[];
  // The host shows the cue too, but only for spectacle: players react to their own screens.
  const shown = [...cues].reverse().find((c) => now >= c.at && (c.real || now < c.at + 550));
  const results = p.results as Record<string, ReactionResult>;
  const totals = p.totals as Record<string, number>;
  const submitted = new Set(p.submitted as string[]);
  const final = p.stage === 'final';
  const rows = [...view.seats].sort((a, b) =>
    final ? (totals[a.id] ?? 0) - (totals[b.id] ?? 0) : ((results[a.id] && 'ms' in results[a.id]! ? (results[a.id] as { ms: number }).ms : 9e9) - (results[b.id] && 'ms' in results[b.id]! ? (results[b.id] as { ms: number }).ms : 9e9)),
  );

  return (
    <div className="toy-host">
      <div className="toy-main">
        <h1>Reaction test</h1>
        <p className="lead">
          {final ? 'Final times (lower is better)' : p.stage === 'ready' ? 'Get ready. Watch YOUR OWN screen, not this one.' : `Round ${p.round} of ${p.rounds}. Tap on FIRE!, not on the fakes.`}
        </p>
        <div className="toy-big-cue" data-go={p.stage === 'live' && (shown?.real ?? false)}>
          {p.stage === 'live' ? shown?.label ?? '…' : final ? '🏆' : p.stage === 'reveal' ? 'Results' : 'Ready?'}
        </div>
      </div>
      <div className="toy-list">
        <h2 style={{ fontSize: 44 }}>{final ? 'Totals' : 'This round'}</h2>
        {rows.map((s, i) => (
          <div key={s.id} className={`sticker toy-row ${i === 0 && p.stage !== 'live' ? 'first' : ''}`}>
            <Avatar avatar={s.avatar} size={52} />
            <span className="grow">
              {s.name} <span style={{ fontSize: 24 }}>{deviceIcon(s)}</span>
            </span>
            <span className="val">{p.stage === 'live' ? (submitted.has(s.id) ? '✓' : '') : final ? `${totals[s.id] ?? 0} ms` : fmt(results[s.id])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReactionPlayer({ conn, view }: PlayerScreenProps) {
  const p = view.phase;
  const mine = p.mine as ReactionResult | null;
  if (p.stage === 'ready')
    return (
      <div className="toy-player center">
        <h2>Reaction test</h2>
        <p>Tap the moment it says FIRE! Tapping on a fake counts as too early.</p>
        <ControlsCard inputs={[{ kind: 'timing', what: 'Fire' }]} />
      </div>
    );
  if (p.stage === 'final')
    return (
      <div className="toy-player center">
        <h2>Your total</h2>
        <div className="big-result">{p.myTotal} ms</div>
        <p className="muted">Too early or missed adds 1500 ms.</p>
      </div>
    );
  return (
    <div className="toy-player">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>
          Round {p.round}/{p.rounds}
        </h2>
        {mine && <span className="chip">{fmt(mine)}</span>}
      </div>
      <CueSurface key={p.round} cues={p.cues as Cue[]} serverNow={conn.serverNow} done={!!mine || p.stage !== 'live'} onResult={(r) => conn.intent({ type: 'react', ...r })} />
    </div>
  );
}
