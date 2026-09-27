import type { HostView } from '@partygame/engine';
import { useEffect, useState } from 'react';
import { useConnection, useRoomConnection, type Connection } from '../net/connection.ts';
import { hostStore } from '../net/storage.ts';
import { hashParam, navigate } from '../router.ts';
import { HostLobby } from './HostLobby.tsx';
import { Stage } from './Stage.tsx';
import { hostScreens } from './registry.tsx';
import './host.css';
import '../screens.ts';
import { DebugOverlay } from '../timing/DebugOverlay.tsx';

/** Resolve the host token: from a fresh "re-open host screen" link (#t=…) or this tab's session. */
function resolveHostToken(code: string): string | null {
  const fromHash = hashParam('t');
  if (fromHash) {
    hostStore.set(code, fromHash);
    history.replaceState(null, '', location.pathname);
    return fromHash;
  }
  return hostStore.get(code);
}

export default function HostPage({ code }: { code: string }) {
  const [token] = useState(() => resolveHostToken(code));
  if (!token) return <NoHostToken code={code} />;
  return <HostConnected code={code} token={token} />;
}

function HostConnected({ code, token }: { code: string; token: string }) {
  const conn = useRoomConnection<HostView>(code, 'host', token);
  if (!conn) return <Stage>{null}</Stage>;
  return <HostLive code={code} conn={conn} />;
}

function HostLive({ code, conn }: { code: string; conn: Connection<HostView> }) {
  const { status, view } = useConnection(conn);

  useEffect(() => {
    document.title = `${code} · Party Board host`;
  }, [code]);

  if (status === 'gone') {
    return (
      <Stage>
        <div className="center" style={{ position: 'absolute', inset: 0 }}>
          <div className="panel stack" style={{ textAlign: 'center', padding: 48 }}>
            <h2 style={{ fontSize: 64 }}>This room has closed</h2>
            <p className="muted">Rooms close after two hours with nobody around.</p>
            <button className="btn big" onClick={() => navigate('/host')}>
              Host a new game
            </button>
          </div>
        </div>
      </Stage>
    );
  }

  const Screen = view ? hostScreens[view.phase.kind] : undefined;
  return (
    <Stage>
      {view && view.phase.kind === 'lobby' && <HostLobby conn={conn} view={view} />}
      {view && view.phase.kind !== 'lobby' && (Screen ? <Screen conn={conn} view={view} /> : <UnknownPhase kind={view.phase.kind} />)}
      {!view && (
        <div className="center" style={{ position: 'absolute', inset: 0 }}>
          <h2 style={{ fontSize: 64 }}>Connecting…</h2>
        </div>
      )}
      {status === 'reconnecting' && <div className="host-status sticker">Reconnecting…</div>}
      {view?.paused && <div className="host-status sticker" style={{ background: 'var(--star)' }}>Paused</div>}
      <DebugOverlay conn={conn} />
    </Stage>
  );
}

function UnknownPhase({ kind }: { kind: string }) {
  return (
    <div className="center" style={{ position: 'absolute', inset: 0 }}>
      <div className="panel">
        <h2>{kind}</h2>
      </div>
    </div>
  );
}

function NoHostToken({ code }: { code: string }) {
  return (
    <div className="center" style={{ minHeight: '100%', padding: 16 }}>
      <div className="panel stack" style={{ maxWidth: 520 }}>
        <h2>Host screen for {code}</h2>
        <p>
          This tab doesn't hold the host key for this room. If the host screen was closed, the VIP can press <b>Re-open host screen</b> on their
          player screen to get a fresh link.
        </p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => navigate(`/${code}`)}>
            Join as a player
          </button>
          <button className="btn white" onClick={() => navigate('/host')}>
            Host a new game
          </button>
        </div>
      </div>
    </div>
  );
}
