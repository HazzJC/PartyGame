import type { PlayerView } from '@partygame/engine';
import { useEffect, useState } from 'react';
import { getProfile, reportDevice } from '../input/device.ts';
import type { Connection, ConnStatus } from '../net/connection.ts';
import { seatLink } from '../net/storage.ts';
import { Avatar, avatarColour } from '../ui/Avatar.tsx';
import { Qr } from '../ui/Qr.tsx';
import { PlayerLobby } from './PlayerLobby.tsx';
import { playerScreens } from './registry.tsx';
import { useWakeLock } from './wakeLock.ts';
import { WatchScreen } from './WatchScreen.tsx';

export { WatchScreen };
import '../screens.ts';
import { DebugOverlay } from '../timing/DebugOverlay.tsx';

/**
 * The player screen is a thin shell (identity header, system states, menu) around a surface
 * owned entirely by the current phase or mini game.
 */
export function PlayerShell({ conn, view, status }: { conn: Connection<PlayerView>; view: PlayerView; status: ConnStatus }) {
  const [menu, setMenu] = useState(false);
  useWakeLock();
  useEffect(() => reportDevice((profile) => conn.send({ t: 'device', profile })), [conn]);
  // Re-send after every reconnect: the server may have restarted.
  useEffect(() => {
    if (status !== 'open') return;
    const { kind, size, keyboard, gamepad } = getProfile();
    conn.send({ t: 'device', profile: { kind, size, keyboard, gamepad } });
  }, [status, conn]);
  const me = view.me;
  const Screen = playerScreens[view.phase.kind];
  const game = view.game as { coins?: number; stars?: number } | null;

  return (
    <div className="ps" style={{ ['--me' as string]: avatarColour(me.avatar) }}>
      <header className="ps-head">
        <Avatar avatar={me.avatar} size={40} />
        <span className="ps-name">{me.name}</span>
        {me.vip && <span className="chip ps-vip">VIP</span>}
        {game && (
          <span className="ps-stats">
            <span className="chip">★ {game.stars ?? 0}</span>
            <span className="chip">● {game.coins ?? 0}</span>
          </span>
        )}
        <span className={`ps-dot ${status}`} title={status} />
        <button className="ps-menu-btn" onClick={() => setMenu(true)} aria-label="Menu">
          ⋯
        </button>
      </header>
      {status === 'reconnecting' && <div className="ps-banner">Reconnecting…</div>}
      {view.paused && <div className="ps-banner paused">Paused by the host</div>}
      <main className="ps-body">
        {view.phase.kind === 'lobby' ? <PlayerLobby conn={conn} view={view} /> : Screen ? <Screen conn={conn} view={view} /> : <WatchScreen />}
      </main>
      {menu && <PlayerMenu conn={conn} view={view} onClose={() => setMenu(false)} />}
      <DebugOverlay conn={conn} streamDelayMs={me.streamDelayMs} />
    </div>
  );
}

function PlayerMenu({ conn, view, onClose }: { conn: Connection<PlayerView>; view: PlayerView; onClose: () => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(
    () =>
      conn.onMessage((msg) => {
        if (msg.t === 'seatLink') setLink(seatLink(view.code, msg.token));
      }),
    [conn, view.code],
  );

  function reopenHost() {
    // Open the window during the click so popup blockers allow it, then point it at the new token.
    const w = window.open('about:blank', `partygame-host-${view.code}`);
    const off = conn.onMessage((msg) => {
      if (msg.t !== 'hostToken') return;
      off();
      const url = `/host/${view.code}#t=${encodeURIComponent(msg.token)}`;
      if (w) w.location.href = url;
      else location.href = url;
    });
    conn.host({ action: 'newHostToken' });
  }

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet panel stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Menu">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Menu</h2>
          <button className="btn white small" onClick={onClose}>
            Close
          </button>
        </div>

        <section className="stack" style={{ gap: 10 }}>
          <h3>Play on another device</h3>
          <p className="muted" style={{ margin: 0 }}>
            Your personal link takes your seat anywhere. Keep it to yourself.
          </p>
          {link ? (
            <div className="stack center" style={{ gap: 10 }}>
              <Qr text={link} size={200} />
              <button
                className="btn white small"
                onClick={() => {
                  navigator.clipboard?.writeText(link).catch(() => undefined);
                }}
              >
                Copy link
              </button>
            </div>
          ) : (
            <button className="btn white" onClick={() => conn.host({ action: 'seatLink' })}>
              Show my personal link
            </button>
          )}
        </section>

        {view.me.vip && (
          <section className="stack" style={{ gap: 10 }}>
            <h3>Host tools</h3>
            <button className="btn white" onClick={reopenHost}>
              Re-open host screen
            </button>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {view.phase.kind !== 'lobby' && (
                <>
                  <button className="btn white small" onClick={() => conn.host({ action: 'pause', paused: !view.paused })}>
                    {view.paused ? 'Resume' : 'Pause'}
                  </button>
                  <button className="btn white small" onClick={() => conn.host({ action: 'skip' })}>
                    Skip this step
                  </button>
                  <button
                    className="btn red small"
                    onClick={() => {
                      if (confirm('End the game and go back to the lobby?')) conn.host({ action: 'backToLobby' });
                    }}
                  >
                    End game
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        <section className="stack" style={{ gap: 10 }}>
          <h3>Report a problem</h3>
          {sent ? (
            <p style={{ margin: 0 }}>Thanks! Sent with the game's current state.</p>
          ) : (
            <>
              <textarea
                className="field"
                style={{ fontSize: 18, minHeight: 90, fontFamily: 'var(--font-body)' }}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
                placeholder="What went wrong, or what felt off?"
              />
              <button
                className="btn small"
                disabled={!feedback.trim()}
                onClick={() => {
                  conn.send({
                    t: 'feedback',
                    text: feedback.trim(),
                    context: { ua: navigator.userAgent, w: innerWidth, h: innerHeight, rtt: conn.clock.rtt, offset: conn.clock.offset },
                  });
                  setSent(true);
                }}
              >
                Send report
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
