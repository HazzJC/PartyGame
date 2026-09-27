import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Pick } from '../input/index.ts';
import { AvatarStack, RoundHead, RoundResult, SubmittedRow } from './common.tsx';
import './minigames.css';

interface Data {
  zones: number[];
  limit: number;
  round: number;
  rounds: number;
  stage: 'pick' | 'show';
  closesAt: number;
  submitted?: string[];
  shown?: Record<string, number> | null;
  collapsed: number[];
  shownAt: number;
  myPick?: number | null;
  lastPick?: number | null;
  myScore?: number;
}

const ZONE_NAMES = ['Meadow', 'Orchard', 'Riverbank', 'Old bridge', 'Hilltop', 'Castle', 'Market', 'Lighthouse', 'Volcano', 'Palace'];

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as Data;
  const shown = d.stage === 'show' && d.shown;
  const byZone = new Map<number, string[]>();
  if (shown) for (const [id, z] of Object.entries(d.shown!)) byZone.set(z, [...(byZone.get(z) ?? []), id]);
  return (
    <div className="mg-host">
      <p className="mg-host-lead">
        Round {d.round}/{d.rounds}. {d.limit} or more in one zone and it collapses!
      </p>
      <div className="trample-zones">
        {d.zones.map((pts, z) => {
          const who = byZone.get(z) ?? [];
          const fell = shown && d.collapsed.includes(z);
          return (
            <div key={z} className="trample-zone sticker" data-fell={!!fell} data-empty={shown && who.length === 0}>
              <span className="trample-name">{ZONE_NAMES[z] ?? `Zone ${z + 1}`}</span>
              <span className="trample-pts">+{pts}</span>
              {shown && <AvatarStack view={view} ids={who} />}
              {fell && <span className="trample-fell">COLLAPSED</span>}
            </div>
          );
        })}
      </div>
      {d.stage === 'pick' && <SubmittedRow view={view} ids={mg.participants} submitted={d.submitted ?? []} />}
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as Data;
  if (d.stage === 'show')
    return (
      <RoundResult conn={conn} view={view} shownAt={d.shownAt}>
        <h2 className="pf-title">{d.lastPick !== null && d.lastPick !== undefined && d.collapsed.includes(d.lastPick) ? 'Your zone collapsed!' : `+${d.lastPick !== null && d.lastPick !== undefined ? d.zones[d.lastPick] : 0} points`}</h2>
        <span className="chip">Total {d.myScore ?? 0}</span>
      </RoundResult>
    );
  return (
    <div className="mg-player">
      <RoundHead conn={conn} title="Pick a zone" round={d.round} rounds={d.rounds} closesAt={d.closesAt} />
      <p className="muted" style={{ margin: 0 }}>
        {d.limit}+ players in one zone and it collapses. You have {d.myScore ?? 0} points.
      </p>
      <Pick
        columns={2}
        options={d.zones.map((pts, z) => ({ id: String(z), label: `+${pts}`, sub: ZONE_NAMES[z] }))}
        selected={d.myPick === null || d.myPick === undefined ? null : String(d.myPick)}
        onPick={(id) => conn.intent({ type: 'pick', zone: Number(id) })}
      />
    </div>
  );
}

registerMinigameUi('silent-trample', { Host, Player });
