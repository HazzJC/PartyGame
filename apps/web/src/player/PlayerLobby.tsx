import type { PlayerView } from '@partygame/engine';
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
          <button className="btn green big block" onClick={() => conn.host({ action: 'start' })} disabled={view.seats.length < 2}>
            Start game
          </button>
        </section>
      )}

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
