import { useState } from 'react';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Pick } from '../input/index.ts';
import { WatchScreen } from '../player/WatchScreen.tsx';
import { AvatarStack, RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';

interface HostData {
  variant: 'ffa' | 'setter';
  round: number;
  maxRounds: number;
  doors: number;
  traps: number;
  stage: 'pick' | 'show';
  survivors: string[];
  setters: string[];
  submitted: string[];
  picks: Record<string, number> | null;
  trapDoors: number[] | null;
  justOut: string[];
  largeStart: number;
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const shown = d.stage === 'show' && d.picks;
  const byDoor = new Map<number, string[]>();
  if (shown) for (const [id, door] of Object.entries(d.picks!)) byDoor.set(door, [...(byDoor.get(door) ?? []), id]);
  return (
    <div className="mg-host">
      <p className="mg-host-lead">
        Round {d.round}/{d.maxRounds} · {d.traps} trap door{d.traps > 1 ? 's' : ''} ·{' '}
        {d.variant === 'ffa'
          ? d.setters.length
            ? 'the knocked-out players rigged them!'
            : 'rigged at random'
          : `rigged by the trap-setters · ${d.largeStart - d.survivors.length}/${Math.ceil(d.largeStart / 2)} knocked out`}
      </p>
      <div className="doors">
        {Array.from({ length: d.doors }, (_, i) => {
          const trap = shown && d.trapDoors!.includes(i);
          return (
            <div key={i} className="door sticker" data-trap={!!trap} data-safe={shown && !trap}>
              <span className="door-n">{i + 1}</span>
              <span className="door-knob" />
              {shown && <AvatarStack view={view} ids={byDoor.get(i) ?? []} size={46} />}
              {trap && <span className="door-boom">TRAP!</span>}
            </div>
          );
        })}
      </div>
      {d.stage === 'pick' && (
        <div className="row" style={{ justifyContent: 'center', gap: 40 }}>
          <div className="stack center" style={{ gap: 6 }}>
            <span className="chip">Picking a door</span>
            <SubmittedRow view={view} ids={d.survivors} submitted={d.submitted} size={48} />
          </div>
          {d.setters.length > 0 && (
            <div className="stack center" style={{ gap: 6 }}>
              <span className="chip">Setting traps</span>
              <SubmittedRow view={view} ids={d.setters} submitted={d.submitted} size={48} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PlayerData {
  variant: 'ffa' | 'setter';
  round: number;
  maxRounds: number;
  doors: number;
  traps: number;
  stage: 'pick' | 'show';
  closesAt: number;
  role: 'picker' | 'setter' | 'out';
  myDoor: number | null;
  myTraps: number[] | null;
  maxTraps: number;
  justOut: boolean;
  shownAt: number;
  survivors: number;
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  const [traps, setTraps] = useState<string[]>([]);
  const doors = Array.from({ length: d.doors }, (_, i) => ({ id: String(i), label: `Door ${i + 1}` }));
  if (d.stage === 'show')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt}>
        <h2 className="pf-title">{d.justOut ? 'Trap door! You are out.' : d.role === 'picker' ? 'Safe! Still standing.' : 'Watch who falls…'}</h2>
        {d.justOut && d.variant === 'ffa' && <p className="muted">Next round you set the traps.</p>}
      </RoundResult>
    );
  if (d.role === 'picker')
    return (
      <div className="mg-player">
        <RoundHead conn={conn} title="Pick a door" round={d.round} rounds={d.maxRounds} closesAt={d.closesAt} />
        <p className="muted" style={{ margin: 0 }}>
          {d.traps} of these doors are traps.
        </p>
        <Pick columns={d.doors > 6 ? 3 : 2} options={doors} selected={d.myDoor === null ? null : String(d.myDoor)} onPick={(id) => conn.intent({ type: 'door', door: Number(id) })} />
      </div>
    );
  if (d.role === 'setter') {
    const locked = d.myTraps !== null;
    return (
      <div className="mg-player">
        <RoundHead conn={conn} title="Rig the doors" round={d.round} rounds={d.maxRounds} closesAt={d.closesAt} />
        <p className="muted" style={{ margin: 0 }}>
          Secretly pick {d.maxTraps > 1 ? `up to ${d.maxTraps} doors` : 'a door'} to trap. Guess where they'll go! {d.survivors} still standing.
        </p>
        <Pick
          columns={d.doors > 6 ? 3 : 2}
          options={doors}
          selected={locked ? d.myTraps!.map(String) : traps}
          locked={locked}
          onPick={(id) => setTraps((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id].slice(-d.maxTraps)))}
        />
        <button className="btn red big block" disabled={locked || traps.length === 0} onClick={() => conn.intent({ type: 'traps', doors: traps.map(Number) })}>
          {locked ? 'Traps set ✓' : 'Set trap'}
        </button>
      </div>
    );
  }
  return <WatchScreen text="You're out. Watch the doors!" />;
}

registerMinigameUi('pick-a-door', { Host, Player });
registerMinigameUi('pick-a-door-setter', { Host, Player });
