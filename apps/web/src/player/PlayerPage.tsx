import type { PlayerView } from '@partygame/engine';
import { ANIMALS } from '@partygame/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../net/api.ts';
import { useConnection, useRoomConnection, type Connection } from '../net/connection.ts';
import { prefs, seatStore } from '../net/storage.ts';
import { hashParam, navigate } from '../router.ts';
import { Avatar, animalName } from '../ui/Avatar.tsx';
import { PlayerShell } from './PlayerShell.tsx';
import './player.css';

function resolveSeatToken(code: string): string | null {
  const fromHash = hashParam('seat');
  if (fromHash) {
    seatStore.set(code, fromHash);
    return fromHash;
  }
  return seatStore.get(code);
}

export default function PlayerPage({ code }: { code: string }) {
  const [token, setToken] = useState(() => resolveSeatToken(code));
  useEffect(() => {
    document.title = `${code} · Party Board`;
  }, [code]);
  if (!token) return <JoinForm code={code} onJoined={setToken} />;
  return <PlayerConnected key={token} code={code} token={token} onForget={() => { seatStore.clear(code); history.replaceState(null, '', location.pathname); setToken(null); }} />;
}

function PlayerConnected({ code, token, onForget }: { code: string; token: string; onForget: () => void }) {
  const conn = useRoomConnection<PlayerView>(code, 'player', token);
  if (!conn) return <Notice title="Connecting…" />;
  return <PlayerLive conn={conn} token={token} onForget={onForget} />;
}

function PlayerLive({ conn, token, onForget }: { conn: Connection<PlayerView>; token: string; onForget: () => void }) {
  const { status, view } = useConnection(conn);

  // Keep the personal link in the address bar so a refresh or bookmark always reclaims this seat.
  useEffect(() => {
    if (!location.hash.includes('seat=')) history.replaceState(null, '', `${location.pathname}#seat=${encodeURIComponent(token)}`);
  }, [token]);

  if (status === 'kicked') return <Notice title="You were removed from this room" action={<button className="btn" onClick={onForget}>Join again</button>} />;
  if (status === 'gone')
    return (
      <Notice
        title="This room has closed"
        body="The code may have expired, or this link belongs to an old game."
        action={
          <div className="row">
            <button className="btn" onClick={() => navigate('/')}>Enter a new code</button>
            <button className="btn white" onClick={onForget}>Rejoin by name</button>
          </div>
        }
      />
    );
  if (!view) return <Notice title={status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'} />;
  return <PlayerShell conn={conn} view={view} status={status} />;
}

function Notice({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="center" style={{ minHeight: '100%', padding: 16 }}>
      <div className="panel stack" style={{ textAlign: 'center', maxWidth: 440 }}>
        <h2>{title}</h2>
        {body && <p className="muted" style={{ margin: 0 }}>{body}</p>}
        {action}
      </div>
    </div>
  );
}

function JoinForm({ code, onJoined }: { code: string; onJoined: (token: string) => void }) {
  const [name, setName] = useState(() => prefs.get('name') ?? '');
  const [avatar, setAvatar] = useState(() => {
    const saved = Number(prefs.get('avatar'));
    return Number.isInteger(saved) && saved >= 0 && saved < ANIMALS.length ? saved : Math.floor(Math.random() * ANIMALS.length);
  });
  const [info, setInfo] = useState<{ exists: boolean; phase?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.roomInfo(code).then(setInfo).catch(() => setInfo({ exists: false }));
  }, [code]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.join(code, name, avatar);
      if (!res.ok) throw new Error(res.error);
      prefs.set('name', name.trim());
      prefs.set('avatar', String(avatar));
      seatStore.set(code, res.seatToken);
      history.replaceState(null, '', `${location.pathname}#seat=${encodeURIComponent(res.seatToken)}`);
      onJoined(res.seatToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (info && !info.exists)
    return <Notice title={`No room called ${code}`} body="Check the code on the shared screen. Rooms close after two idle hours." action={<button className="btn" onClick={() => navigate('/')}>Try another code</button>} />;

  const inGame = info?.phase && info.phase !== 'lobby';
  return (
    <main className="join">
      <form className="panel stack join-card" onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Join {code}</h2>
          <span className="chip">{animalName(avatar)}</span>
        </div>
        {inGame && <p className="muted" style={{ margin: 0 }}>This game has started. Use the same name as before to take your seat back.</p>}
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 16))}
          placeholder="Your name"
          aria-label="Your name"
          autoComplete="nickname"
          enterKeyHint="go"
          maxLength={16}
        />
        {!inGame && (
          <div className="join-avatars" role="radiogroup" aria-label="Pick your animal">
            {ANIMALS.map((_, i) => (
              <button key={i} type="button" role="radio" aria-checked={avatar === i} onClick={() => setAvatar(i)} title={animalName(i)}>
                <Avatar avatar={i} size={56} />
              </button>
            ))}
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        <button className="btn green big block" disabled={!name.trim() || busy}>
          {inGame ? 'Rejoin' : "I'm in!"}
        </button>
        <p className="muted small-print">If your animal is taken, you'll get the next free one.</p>
      </form>
    </main>
  );
}
