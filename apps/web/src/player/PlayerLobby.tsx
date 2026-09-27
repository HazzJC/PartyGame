import type { PlayerView } from '@partygame/engine';
import type { Stroke } from '@partygame/shared';
import { useEffect, useState } from 'react';
import { Direction, Draw } from '../input/index.ts';
import type { Connection } from '../net/connection.ts';
import { Avatar } from '../ui/Avatar.tsx';

const LENGTHS = [
  { id: 'quick', label: 'Quick' },
  { id: 'standard', label: 'Standard' },
  { id: 'long', label: 'Long' },
] as const;

export function PlayerLobby({ conn, view }: { conn: Connection<PlayerView>; view: PlayerView }) {
  const me = view.me;
  return (
    <div className="pl stack">
      <div className="pl-hero center stack" style={{ gap: 10 }}>
        <Avatar avatar={me.avatar} size={132} className="pop-in" />
        <h2 className="pl-title">You're in, {me.name}!</h2>
        <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
          Find your sticker on the shared screen. {me.vip ? "You're the VIP, so you start the game." : 'The VIP starts the game.'}
        </p>
        <span className="chip">Stream delay: {(me.streamDelayMs / 1000).toFixed(1)} s</span>
      </div>

      {view.phase.notice && <div className="sticker pl-notice">{view.phase.notice}</div>}

      {me.vip && (
        <section className="panel stack pl-vip">
          <h3>VIP controls</h3>
          <div className="seg small" role="group" aria-label="Game length">
            {LENGTHS.map((l) => (
              <button key={l.id} aria-pressed={view.settings.length === l.id} onClick={() => conn.host({ action: 'settings', settings: { length: l.id } })}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn white small" onClick={() => conn.host({ action: 'addBot' })} disabled={view.seats.length >= 16}>
              + Bot
            </button>
            {view.seats.some((s) => s.isBot) && (
              <button className="btn white small" onClick={() => conn.host({ action: 'removeBots' })}>
                Clear bots
              </button>
            )}
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn white small" onClick={() => conn.host({ action: 'toy', toy: 'calibrate' })}>
              Stream check
            </button>
            <button className="btn white small" onClick={() => conn.host({ action: 'toy', toy: 'reaction' })}>
              Reaction test
            </button>
          </div>
          <button className="btn green big block" onClick={() => conn.host({ action: 'start' })} disabled={view.seats.length < 2}>
            Start game
          </button>
        </section>
      )}

      <LobbyToys conn={conn} view={view} />

      <section className="stack" style={{ gap: 8 }}>
        <h3>
          Players <span className="muted">{view.seats.length}/16</span>
        </h3>
        <ul className="pl-list">
          {view.seats.map((s) => (
            <li key={s.id} className="pl-item">
              <Avatar avatar={s.avatar} size={36} dim={!s.connected} />
              <span className="pl-item-name">
                {s.name}
                {s.id === me.id && <span className="muted"> (you)</span>}
              </span>
              {s.vip && <span className="chip">VIP</span>}
              {s.isBot && <span className="chip">bot</span>}
              {me.vip && s.id !== me.id && (
                <button className="btn white small pl-kick" onClick={() => confirm(`Remove ${s.name}?`) && conn.host({ action: 'kick', seatId: s.id })} aria-label={`Remove ${s.name}`}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Something to do while waiting: doodle a flag for your sticker, or wiggle it with the d-pad. */
function LobbyToys({ conn, view }: { conn: Connection<PlayerView>; view: PlayerView }) {
  const [toy, setToy] = useState<'doodle' | 'wiggle' | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() => (view.phase.myDoodle as Stroke[]) ?? []);
  useEffect(() => {
    if (toy !== 'wiggle') conn.intent({ type: 'lobby.nudge', x: 0, y: 0 });
  }, [toy, conn]);
  return (
    <section className="panel stack pl-toys">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <h3>While you wait</h3>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn white small" aria-pressed={toy === 'doodle'} onClick={() => setToy(toy === 'doodle' ? null : 'doodle')}>
            Doodle a flag
          </button>
          <button className="btn white small" aria-pressed={toy === 'wiggle'} onClick={() => setToy(toy === 'wiggle' ? null : 'wiggle')}>
            Wiggle
          </button>
        </div>
      </div>
      {toy === 'doodle' && (
        <div className="pl-doodle">
          <Draw
            strokes={strokes}
            onChange={(s) => {
              setStrokes(s);
              conn.intent({ type: 'lobby.doodle', strokes: s });
            }}
          />
        </div>
      )}
      {toy === 'wiggle' && (
        <div className="center stack" style={{ gap: 8 }}>
          <Direction mode="8" onChange={(v) => conn.intent({ type: 'lobby.nudge', x: v.x, y: v.y })} />
          <span className="muted">Watch your sticker on the big screen (or use WASD).</span>
        </div>
      )}
    </section>
  );
}
