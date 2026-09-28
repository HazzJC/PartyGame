import type { HostView, PublicSeat } from '@partygame/engine';
import { describeInputs, type InputSpec } from '@partygame/shared';
import type { ReactNode } from 'react';
import type { HostScreenProps } from '../host/registry.tsx';
import { Countdown } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { minigameUi, type MgHostPhase } from './registry.ts';
import './game.css';

export interface EntityInfo {
  id: string;
  name: string;
  avatar: number;
  team: number | null;
  members: string[];
}

interface GameHostView {
  round: number;
  rounds: number;
  finalStretch: boolean;
  threat: number;
  threatMax: number;
  players: { id: string; coins: number; stars: number; items: number }[];
  entities?: EntityInfo[];
  teamBoard?: boolean;
}

/**
 * Seats by id. In team board mode the board, purse and stars belong to teams, so each team is
 * added as a pseudo-seat (with a team badge avatar); everything that names a board piece works for both.
 */
export const seatMap = (view: { seats: PublicSeat[]; game?: unknown }) => {
  const map = new Map(view.seats.map((s) => [s.id, s]));
  const g = view.game as { teamBoard?: boolean; entities?: EntityInfo[] } | null | undefined;
  if (g?.teamBoard && g.entities)
    for (const e of g.entities) {
      const members = e.members.map((id) => map.get(id)).filter((s): s is PublicSeat => !!s);
      map.set(e.id, { id: e.id, name: e.name, avatar: e.avatar, isBot: members.every((m) => m.isBot), vip: false, connected: members.some((m) => m.connected), device: null, streamDelayMs: 0 });
    }
  return map;
};

/** The board piece this player plays for (their team in team board mode), and the others. */
export function myEntity(view: { me: { id: string }; game?: unknown }): string {
  return (view.game as { entity?: string } | null | undefined)?.entity ?? view.me.id;
}

export function otherPieces(view: { me: { id: string }; seats: PublicSeat[]; game?: unknown }): { id: string; name: string; avatar: number }[] {
  const g = view.game as { teamBoard?: boolean; entities?: EntityInfo[] } | null | undefined;
  const mine = myEntity(view);
  if (g?.teamBoard && g.entities) return g.entities.filter((e) => e.id !== mine);
  return view.seats.filter((s) => s.id !== view.me.id);
}

/** Members of a team (or just the player), for small avatar rows. */
export function membersOfEntity(view: { game?: unknown }, id: string): string[] {
  const g = view.game as { entities?: EntityInfo[] } | null | undefined;
  return g?.entities?.find((e) => e.id === id)?.members ?? [id];
}

export function Coin({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden style={{ flex: 'none' }}>
      <circle cx="10" cy="10" r="8.5" fill="#FFB703" stroke="#2B2233" strokeWidth="2" />
      <circle cx="10" cy="10" r="4.5" fill="none" stroke="#2B2233" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

export function StarIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden style={{ flex: 'none' }}>
      <path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 71 L21 92 L32 58 L4 38 L38 38 Z" fill="#FFD23F" stroke="#2B2233" strokeWidth="8" strokeLinejoin="round" />
    </svg>
  );
}

/** Top banner + right-hand player rail shared by every in-game host screen. */
export function HostGameFrame({ view, title, right, children, rail = true }: { view: HostView; title?: ReactNode; right?: ReactNode; children: ReactNode; rail?: boolean }) {
  const g = view.game as GameHostView | null;
  const seats = seatMap(view);
  return (
    <div className="hg" data-rail={rail} data-dense={(g?.players.length ?? 0) > 10} data-teams={!!g?.teamBoard}>
      <header className="hg-top">
        <div className="hg-round">
          {g && (
            <>
              Round <b>{g.round}</b>/{g.rounds}
              {g.finalStretch && <span className="hg-final">Final stretch!</span>}
            </>
          )}
        </div>
        <div className="hg-title">{title}</div>
        <div className="hg-right">{right}</div>
      </header>
      <main className="hg-stage">{children}</main>
      {rail && <aside className="hg-rail">
        {g?.players.map((p) => {
          const s = seats.get(p.id);
          if (!s) return null;
          return (
            <div key={p.id} className="hg-player" data-away={!s.connected}>
              <Avatar avatar={s.avatar} size={44} dim={!s.connected} />
              <span className="hg-name">
                {s.name}
                {g.teamBoard && (
                  <span className="hg-members">
                    {membersOfEntity(view, p.id).map((m) => {
                      const ms = seats.get(m);
                      return ms ? <Avatar key={m} avatar={ms.avatar} size={22} sticker={false} dim={!ms.connected} title={ms.name} /> : null;
                    })}
                  </span>
                )}
              </span>
              <span className="hg-stat">
                <StarIcon size={22} />
                {p.stars}
              </span>
              <span className="hg-stat">
                <Coin size={22} />
                {p.coins}
              </span>
            </div>
          );
        })}
        {g && g.threat > 0 && (
          <div className="hg-threat">
            Threat {g.threat}/{g.threatMax}
          </div>
        )}
      </aside>}
    </div>
  );
}

export function RoundIntroHost({ view }: HostScreenProps) {
  const p = view.phase;
  return (
    <HostGameFrame view={view}>
      <div className="hg-banner pop-in">
        <span className="hg-banner-small">{p.finalStretch ? 'Final stretch' : 'Round'}</span>
        <span className="hg-banner-big">
          {p.round}
          <span className="muted">/{p.rounds}</span>
        </span>
      </div>
    </HostGameFrame>
  );
}

function ControlsColumn({ title, inputs, scheme }: { title: string; inputs: InputSpec[]; scheme: 'touch' | 'keys' }) {
  return (
    <div className="rules-col">
      <h3>{title}</h3>
      <ul>
        {describeInputs(inputs, scheme).map((l, i) => (
          <li key={i}>
            <b>{l.action}</b> {l.how}
          </li>
        ))}
      </ul>
    </div>
  );
}

const FORMAT_LABEL: Record<string, string> = { ffa: 'Free-for-all', team: 'Team game', '1vN': '1 vs many', coop: 'Co-op', duel: 'Duel' };

export function RulesHost({ conn, view }: HostScreenProps) {
  const p = view.phase;
  const seats = seatMap(view);
  const ready = new Set(p.ready as string[]);
  return (
    <HostGameFrame view={view} title={<span className="chip hg-format">{FORMAT_LABEL[p.format] ?? p.format}</span>} right={<Countdown conn={conn} until={p.endsAt} />}>
      <div className="rules-card sticker pop-in">
        <h1>{p.name}</h1>
        <p className="rules-blurb">{p.blurb}</p>
        {p.fallback && <p className="muted">No games of that format yet, so it's a free-for-all instead.</p>}
        {(view.game as GameHostView | null)?.teamBoard && p.format === 'ffa' && <p className="muted">Team board: everyone plays for themselves, and each team scores its members' average placing.</p>}
        <div className="rules-cols">
          <ControlsColumn title="📱 Touch" inputs={p.inputs} scheme="touch" />
          <ControlsColumn title="💻 Keyboard" inputs={p.inputs} scheme="keys" />
        </div>
        <div className="rules-ready">
          {(p.participants as string[]).map((id) => {
            const s = seats.get(id);
            return s ? (
              <span key={id} className="rules-ready-av" data-ready={ready.has(id)}>
                <Avatar avatar={s.avatar} size={52} dim={!ready.has(id)} />
              </span>
            ) : null;
          })}
          <span className="muted">Press Ready on your phone</span>
        </div>
      </div>
    </HostGameFrame>
  );
}

export function MinigameHost({ conn, view }: HostScreenProps) {
  const mg = view.phase as unknown as MgHostPhase;
  const ui = minigameUi(mg.gameId);
  return (
    <HostGameFrame view={view} title={mg.name} right={mg.stage === 'play' ? <Countdown conn={conn} until={mg.endsAt} /> : <span className="chip">Results</span>}>
      {ui ? <ui.Host conn={conn} view={view} mg={mg} /> : <div className="center">Missing UI for {mg.gameId}</div>}
    </HostGameFrame>
  );
}

export function PayoutHost({ view }: HostScreenProps) {
  const p = view.phase;
  const g = view.game as GameHostView;
  const seats = seatMap(view);
  const gains = p.lastPayout as Record<string, number> | null;
  const byId = new Map(g.players.map((x) => [x.id, x]));
  const shoppers = (p.shoppers ?? []) as string[];
  return (
    <HostGameFrame view={view} title={shoppers.length ? `Standings · ${shoppers.map((id) => seats.get(id)?.name).join(', ')} shopping` : 'Standings'} rail={false}>
      <ol className="standings">
        {(p.standings as string[]).map((id, i) => {
          const s = seats.get(id);
          const pl = byId.get(id);
          if (!s || !pl) return null;
          return (
            <li key={id} className="sticker standing" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="standing-rank">{i + 1}</span>
              <Avatar avatar={s.avatar} size={60} />
              <span className="standing-name">{s.name}</span>
              <span className="hg-stat big">
                <StarIcon size={34} />
                {pl.stars}
              </span>
              <span className="hg-stat big">
                <Coin size={34} />
                {pl.coins}
              </span>
              {gains?.[id] ? <span className="standing-gain">+{gains[id]}</span> : <span className="standing-gain none" />}
            </li>
          );
        })}
      </ol>
    </HostGameFrame>
  );
}

function PodiumBlock({ s, place, height }: { s: PublicSeat | undefined; place: number; height: number }) {
  if (!s) return <div className="podium-col" />;
  return (
    <div className="podium-col">
      <Avatar avatar={s.avatar} size={place === 1 ? 170 : 130} className="pop-in" />
      <span className="podium-name">{s.name}</span>
      <div className={`podium-block p${place}`} style={{ height }}>
        {place}
      </div>
    </div>
  );
}

export function PodiumHost({ conn, view }: HostScreenProps) {
  const order = view.phase.standings as string[];
  const seats = seatMap(view);
  const g = view.game as GameHostView;
  const byId = new Map(g.players.map((x) => [x.id, x]));
  return (
    <HostGameFrame view={view} title="Final results" rail={false}>
      <div className="podium">
        <div className="podium-row">
          <PodiumBlock s={seats.get(order[1]!)} place={2} height={220} />
          <PodiumBlock s={seats.get(order[0]!)} place={1} height={320} />
          <PodiumBlock s={seats.get(order[2]!)} place={3} height={160} />
        </div>
        <div className="podium-rest">
          {order.slice(3).map((id, i) => {
            const s = seats.get(id);
            return s ? (
              <span key={id} className="chip">
                {i + 4}. {s.name} · ★{byId.get(id)?.stars} · {byId.get(id)?.coins}c
              </span>
            ) : null;
          })}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn green big" onClick={() => conn.host({ action: 'start' })}>
            Play again
          </button>
          <button className="btn white big" onClick={() => conn.host({ action: 'backToLobby' })}>
            Back to lobby
          </button>
        </div>
      </div>
    </HostGameFrame>
  );
}
