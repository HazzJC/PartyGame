import { useEffect, useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { KeyHint, useDevice, useVirtualKeys, wantsOnScreenControls } from '../input/index.ts';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { Icon } from '../ui/Icons.tsx';
import { INK } from './theme/paper.tsx';
import { Sheep } from './theme/pack1.tsx';
import './minigames.css';

/** A sheep hops the fence for every number counted; on a clash it bonks into it. */
function SheepHop({ count, clash }: { count: number; clash: boolean }) {
  const cls = clash ? 'hop-bonk' : count === 0 ? 'hop-wait' : 'hop-jump';
  return (
    <svg className="count-hop" viewBox="0 0 520 176" aria-hidden="true">
      <path d="M0 164 H520" stroke={INK} strokeWidth={5} />
      <g fill="#C8995F" stroke={INK} strokeWidth={4} strokeLinejoin="round">
        <rect x={214} y={112} width={92} height={12} rx={4} />
        <rect x={214} y={136} width={92} height={12} rx={4} />
        <rect x={222} y={96} width={16} height={68} rx={4} />
        <rect x={282} y={96} width={16} height={68} rx={4} />
      </g>
      <g key={`${cls}${count}`} className={cls} transform={clash ? 'translate(120 130)' : count === 0 ? 'translate(70 130)' : 'translate(450 130)'}>
        <Sheep x={0} y={0} s={0.8} />
      </g>
    </svg>
  );
}

interface Data {
  target: number;
  count: number;
  resets: number;
  closesAt: number;
  clashAt: number | null;
  log?: { n: number; by: string; clash?: string }[];
  mineLast?: boolean;
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as Data;
  const seats = seatMap(view);
  const now = useServerNow(conn, 20);
  const clashing = d.clashAt !== null && now - d.clashAt < 1200;
  const grade = mg.result?.grade as string | undefined;
  return (
    <div className="mg-host">
      <p className="mg-host-lead">
        {mg.stage === 'reveal' ? (grade === 'fail' ? 'Out of time!' : `Made it! ${grade?.toUpperCase()} with ${d.resets} reset${d.resets === 1 ? '' : 's'}`) : 'Count together. Two at once and it starts again!'}
      </p>
      <div className="count-big" data-clash={clashing}>
        {clashing ? 'CLASH!' : d.count}
        <span className="count-target">/ {d.target}</span>
      </div>
      {mg.stage === 'play' && <SheepHop count={d.count} clash={clashing} />}
      <div className="count-log">
        {(d.log ?? []).map((l, i) => {
          const s = seats.get(l.by);
          const other = l.clash ? seats.get(l.clash) : null;
          return (
            <span key={i} className="sticker count-call" data-clash={!!l.clash}>
              {s && <Avatar avatar={s.avatar} size={40} />}
              {other && <Avatar avatar={other.avatar} size={40} />}
              {l.clash ? <Icon name="clash" size={34} label="Clash" /> : l.n}
            </span>
          );
        })}
      </div>
      <p className="muted" style={{ textAlign: 'center', margin: 0, fontSize: 28 }}>
        Resets: {d.resets}
      </p>
    </div>
  );
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as Data;
  const device = useDevice();
  const now = useServerNow(conn, 20);
  // Show your own tap instantly; the server confirms (or resets) a moment later.
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => setPending(null), [d.count, d.resets]);
  // If the server ignored the tap (e.g. a dropped packet), let the player try again.
  useEffect(() => {
    if (pending === null) return;
    const t = setTimeout(() => setPending(null), 1500);
    return () => clearTimeout(t);
  }, [pending]);
  const clashing = d.clashAt !== null && now - d.clashAt < 1200;
  const blocked = !!d.mineLast || pending !== null;

  const say = () => {
    if (blocked) return;
    setPending(d.count + 1);
    conn.intent({ type: 'say' });
  };
  useVirtualKeys((e) => {
    if (e.down && !e.repeat && e.key === 'confirm') say();
  });

  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>
          {d.count} / {d.target}
        </h2>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <button type="button" className="count-say" data-clash={clashing} disabled={blocked} onPointerDown={say}>
        {clashing ? 'Back to 0!' : pending !== null ? `You said ${pending}…` : d.mineLast ? 'Someone else next' : `Say ${d.count + 1}`}
        {!wantsOnScreenControls(device) && !blocked && <KeyHint k="Space" />}
      </button>
      <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
        No talking. Nobody says two in a row.
      </p>
    </div>
  );
}

registerMinigameUi('count-to', { Host, Player });
