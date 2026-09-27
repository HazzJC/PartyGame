import type { Cue, ReactionResult } from '@partygame/engine';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { CueSurface } from '../input/index.ts';
import { useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';
import '../toys/toys.css';

const fmt = (r: ReactionResult | undefined) => (!r || 'missed' in r ? 'no shot' : 'falseStart' in r ? 'too early!' : `${r.ms} ms`);

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as { cues: Cue[]; submitted: string[]; results: Record<string, ReactionResult> | null };
  const seats = seatMap(view);
  const now = useServerNow(conn, 30);
  // For show only: every player reacts to the cue on their own screen.
  const shown = [...d.cues].reverse().find((c) => now >= c.at && (c.real || now < c.at + 550));
  if (mg.stage === 'reveal' && d.results) {
    const order = [...mg.participants].sort((a, b) => {
      const s = (id: string) => {
        const r = d.results![id];
        return !r || 'missed' in r ? 2e6 : 'falseStart' in r ? 1e6 : r.ms;
      };
      return s(a) - s(b);
    });
    return (
      <div className="mg-host">
        <div className="qd-results">
          {order.map((id, i) => {
            const s = seats.get(id);
            return s ? (
              <div key={id} className={`sticker toy-row ${i === 0 ? 'first' : ''}`} style={{ animationDelay: `${i * 120}ms` }}>
                <Avatar avatar={s.avatar} size={56} />
                <span className="grow">{s.name}</span>
                <span className="val">{fmt(d.results![id])}</span>
              </div>
            ) : null;
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="mg-host">
      <p className="mg-host-lead">Hold on your phone. Let go on FIRE!, not on the fakes. Watch your own screen!</p>
      <div className="toy-big-cue" data-go={shown?.real ?? false}>
        {shown?.label ?? '…'}
      </div>
      <div className="submitted-row">
        {mg.participants.map((id) => {
          const s = seats.get(id);
          return s ? <Avatar key={id} avatar={s.avatar} size={56} dim={!d.submitted.includes(id)} /> : null;
        })}
      </div>
    </div>
  );
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as { cues: Cue[]; mine: ReactionResult | null };
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>Quick Draw</h2>
        {d.mine && <span className="chip">{fmt(d.mine)}</span>}
      </div>
      <CueSurface cues={d.cues} serverNow={conn.serverNow} mode="release" done={!!d.mine} idleLabel="Hold…" onResult={(r) => conn.intent({ type: 'react', ...r })} />
    </div>
  );
}

registerMinigameUi('quick-draw', { Host, Player });
