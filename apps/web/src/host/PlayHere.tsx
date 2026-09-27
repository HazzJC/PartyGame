import type { HostView, PublicSeat } from '@partygame/engine';
import { ANIMALS } from '@partygame/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../net/api.ts';
import { prefs, seatLink } from '../net/storage.ts';
import { Avatar, animalName } from '../ui/Avatar.tsx';
import { Qr } from '../ui/Qr.tsx';

/** The host's own seat, remembered for this tab only (never shown on the shared screen). */
const hostSeatStore = {
  get(code: string): { seatId: string; token: string } | null {
    try {
      const raw = sessionStorage.getItem(`hostseat:${code}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(code: string, v: { seatId: string; token: string }) {
    try {
      sessionStorage.setItem(`hostseat:${code}`, JSON.stringify(v));
    } catch {
      // Private mode: the host can still use the link this once.
    }
  },
};

export function useHostSeat(code: string, view: HostView): PublicSeat | null {
  const mine = hostSeatStore.get(code);
  return (mine && view.seats.find((s) => s.id === mine.seatId)) || null;
}

const QR_REVEAL_MS = 30_000;

/**
 * "Play from this computer or your phone": joins the host as a player and hands them a personal
 * link. Streaming mode keeps the secret link off the shared screen unless deliberately revealed.
 */
export function PlayHere({ view, onClose }: { view: HostView; onClose: () => void }) {
  const [mine, setMine] = useState(() => hostSeatStore.get(view.code));
  const seat = mine ? view.seats.find((s) => s.id === mine.seatId) : undefined;
  const [streaming, setStreaming] = useState(() => prefs.get('streaming') !== 'off');
  const [qrShown, setQrShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const wasConnected = useRef(seat?.connected ?? false);

  // Once the host's player screen connects, the panel's job is done: close it so nothing lingers on stream.
  useEffect(() => {
    if (seat?.connected && !wasConnected.current) onClose();
    wasConnected.current = seat?.connected ?? false;
  }, [seat?.connected, onClose]);

  useEffect(() => {
    if (!qrShown || !streaming) return;
    const t = setTimeout(() => setQrShown(false), QR_REVEAL_MS);
    return () => clearTimeout(t);
  }, [qrShown, streaming]);

  const toggleStreaming = (on: boolean) => {
    setStreaming(on);
    prefs.set('streaming', on ? 'on' : 'off');
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="panel modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Play from this computer or your phone">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>{seat ? `You're ${seat.name}` : 'Join as a player'}</h2>
          <button className="btn white" onClick={onClose}>
            Close
          </button>
        </div>
        {!mine || !seat ? (
          <JoinAsHost view={view} onJoined={(v) => setMine(v)} />
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 26 }}>
              Keep <b>this window</b> on the shared screen. Play from a <b>separate window</b> or your phone with your personal link.
            </p>
            <div className="play-options">
              <div className="sticker play-option">
                <span className="display" style={{ fontSize: 30 }}>
                  This computer
                </span>
                <span className="muted">Opens your player screen in its own window, so this one stays visible on the stream.</span>
                <button
                  className="btn blue"
                  onClick={() => {
                    const w = window.open(seatLink(view.code, mine.token), `partygame-player-${view.code}`, 'popup,width=480,height=860');
                    w?.focus();
                  }}
                >
                  Open player window
                </button>
              </div>
              <div className="sticker play-option">
                <span className="display" style={{ fontSize: 30 }}>
                  My phone
                </span>
                <div className={`secret-box ${qrShown ? '' : 'hidden-secret'}`}>
                  {qrShown ? <Qr text={seatLink(view.code, mine.token)} size={200} /> : <div style={{ width: 200, height: 200, background: 'var(--felt-dark)', borderRadius: 12 }} />}
                  {!qrShown && (
                    <div className="secret-cover">
                      <button className="btn" onClick={() => setQrShown(true)}>
                        Show my QR
                      </button>
                    </div>
                  )}
                </div>
                <span className="muted" style={{ fontSize: 20 }}>
                  {streaming ? 'Hidden until you press it, then hides after 30 s.' : 'Streaming mode is off.'}
                </span>
              </div>
              <div className="sticker play-option">
                <span className="display" style={{ fontSize: 30 }}>
                  Copy link
                </span>
                <span className="muted">Paste it into another browser or send it to yourself.</span>
                <button
                  className="btn white"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(seatLink(view.code, mine.token));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    } catch {
                      setQrShown(true);
                    }
                  }}
                >
                  {copied ? 'Copied!' : 'Copy my link'}
                </button>
              </div>
            </div>
          </>
        )}
        <label className="toggle">
          <input type="checkbox" checked={streaming} onChange={(e) => toggleStreaming(e.target.checked)} />
          Streaming mode: keep personal links hidden on this screen
        </label>
        <p className="muted" style={{ margin: 0, fontSize: 20 }}>
          Your personal link claims your seat. Don't share it. Everyone else joins with the room code.
        </p>
      </div>
    </div>
  );
}

function JoinAsHost({ view, onJoined }: { view: HostView; onJoined: (v: { seatId: string; token: string }) => void }) {
  const taken = new Set(view.seats.map((s) => s.avatar));
  const [name, setName] = useState(() => prefs.get('name') ?? '');
  const [avatar, setAvatar] = useState(() => {
    const saved = Number(prefs.get('avatar'));
    if (Number.isInteger(saved) && !taken.has(saved)) return saved;
    return ANIMALS.findIndex((_, i) => !taken.has(i));
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.join(view.code, name, avatar);
      if (!res.ok) throw new Error(res.error);
      prefs.set('name', name.trim());
      prefs.set('avatar', String(avatar));
      const v = { seatId: res.seatId, token: res.seatToken };
      hostSeatStore.set(view.code, v);
      onJoined(v);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} style={{ gap: 20 }}>
      <input className="field" value={name} onChange={(e) => setName(e.target.value.slice(0, 16))} placeholder="Your name" aria-label="Your name" autoFocus />
      <div className="avatar-grid">
        {ANIMALS.map((_, i) => (
          <button key={i} type="button" aria-pressed={avatar === i} disabled={taken.has(i)} onClick={() => setAvatar(i)} title={animalName(i)}>
            <Avatar avatar={i} size={96} />
          </button>
        ))}
      </div>
      {error && <p className="error-text" style={{ margin: 0, color: 'var(--bad)' }}>{error}</p>}
      <button className="btn green big" disabled={!name.trim() || busy || avatar < 0}>
        Take a seat
      </button>
    </form>
  );
}
