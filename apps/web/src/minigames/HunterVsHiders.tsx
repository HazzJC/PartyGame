import { useState } from 'react';
import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Pick } from '../input/index.ts';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';

const SEARCHES = 3;

interface HostData {
  zones: number;
  hunters: string[];
  hiders: string[];
  needed: number;
  submitted: string[];
  hides: Record<string, number> | null;
  searches: Record<string, number[]> | null;
}

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const seats = seatMap(view);
  const now = useServerNow(conn, 10);
  const revealMs = 3000 + d.zones * 250;
  const since = mg.revealEndsAt ? now - (mg.revealEndsAt - revealMs) : -1;
  // Reveal: first where everyone hid, then the searchlights one zone at a time.
  const searched = new Set(Object.values(d.searches ?? {}).flat());
  const searchOrder = [...searched].sort((a, b) => a - b);
  const lit = new Set(searchOrder.slice(0, Math.max(0, Math.floor((since - 1500) / 600))));
  const showHides = d.hides && since >= 500;
  const byZone = new Map<number, string[]>();
  for (const [id, z] of Object.entries(d.hides ?? {})) byZone.set(z, [...(byZone.get(z) ?? []), id]);
  const caught = [...lit].reduce((n, z) => n + (byZone.get(z)?.length ?? 0), 0);

  return (
    <div className="mg-host">
      <div className="hunt-roles">
        <span className="chip">Hunter{d.hunters.length > 1 ? 's' : ''}</span>
        {d.hunters.map((id) => {
          const s = seats.get(id);
          return s ? <Avatar key={id} avatar={s.avatar} size={70} dim={mg.stage === 'play' && !d.submitted.includes(id)} /> : null;
        })}
        <span className="mg-host-lead" style={{ flex: 1 }}>
          {mg.stage === 'reveal' ? `Caught ${caught} of ${d.hiders.length} (needs ${d.needed})` : `Catch ${d.needed} of ${d.hiders.length} hiders to win`}
        </span>
      </div>
      <div className="hunt-zones">
        {Array.from({ length: d.zones }, (_, z) => (
          <div key={z} className="hunt-zone sticker" data-lit={lit.has(z)} data-hit={lit.has(z) && (byZone.get(z)?.length ?? 0) > 0}>
            <span className="hunt-n">{z + 1}</span>
            <div className="lun-who">
              {showHides &&
                (byZone.get(z) ?? []).map((id) => {
                  const s = seats.get(id);
                  return s ? <Avatar key={id} avatar={s.avatar} size={48} /> : null;
                })}
            </div>
          </div>
        ))}
      </div>
      {mg.stage === 'play' && (
        <div className="submitted-row">
          {d.hiders.map((id) => {
            const s = seats.get(id);
            return s ? <Avatar key={id} avatar={s.avatar} size={52} dim={!d.submitted.includes(id)} /> : null;
          })}
        </div>
      )}
    </div>
  );
}

interface PlayerData {
  zones: number;
  role: 'hunter' | 'hider';
  needed: number;
  hiders: number;
  closesAt: number;
  myHide: number | null;
  mySearch: number[] | null;
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as PlayerData;
  const [picks, setPicks] = useState<string[]>([]);
  const options = Array.from({ length: d.zones }, (_, z) => ({ id: String(z), label: String(z + 1) }));
  const head = (
    <div className="mg-player-head">
      <h2>{d.role === 'hunter' ? 'You are the hunter!' : 'Hide!'}</h2>
      <Countdown conn={conn} until={d.closesAt} />
    </div>
  );
  if (d.role === 'hider')
    return (
      <div className="mg-player">
        {head}
        <p className="muted" style={{ margin: 0 }}>
          Pick a secret zone. Crowded zones are risky: one search finds everyone there.
        </p>
        <Pick options={options} selected={d.myHide === null ? null : String(d.myHide)} onPick={(id) => conn.intent({ type: 'hide', zone: Number(id) })} />
      </div>
    );
  const locked = d.mySearch !== null;
  return (
    <div className="mg-player">
      {head}
      <p className="muted" style={{ margin: 0 }}>
        Pick {SEARCHES} zones to search. Catch {d.needed} of {d.hiders} hiders to win 15 coins.
      </p>
      <Pick
        options={options}
        selected={locked ? d.mySearch!.map(String) : picks}
        locked={locked}
        onPick={(id) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < SEARCHES ? [...p, id] : p))}
      />
      <button className="btn red big block" disabled={locked || picks.length !== SEARCHES} onClick={() => conn.intent({ type: 'search', zones: picks.map(Number) })}>
        {locked ? 'Searching…' : `Search ${picks.length}/${SEARCHES}`}
      </button>
    </div>
  );
}

registerMinigameUi('hunter-vs-hiders', { Host, Player });
