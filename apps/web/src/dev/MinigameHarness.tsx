import { useEffect, useState } from 'react';
import { api } from '../net/api.ts';
import { Connection } from '../net/connection.ts';
import './lab.css';

/**
 * /dev/minigame/:id?n=6 — one mini game on repeat against bots. Creates a room, joins you as a
 * player, fills the rest with bots and forces that game every round. The host screen and your
 * player screen sit side by side, so a game can be tested solo on one monitor.
 */
export default function MinigameHarness({ gameId }: { gameId: string }) {
  const params = new URLSearchParams(location.search);
  const n = Math.max(2, Math.min(16, Number(params.get('n')) || 6));
  const [room, setRoom] = useState<{ code: string; hostToken: string; seatToken: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let conn: Connection | null = null;
    (async () => {
      const { code, hostToken } = await api.createRoom();
      const joined = await api.join(code, 'Tester', 0);
      if (!joined.ok) throw new Error(joined.error);
      conn = new Connection({ code, role: 'host', token: hostToken });
      // Wait for the socket, then configure and start.
      await new Promise<void>((resolve) => {
        const off = conn!.subscribe(() => {
          if (conn!.status === 'open' && conn!.view) {
            off();
            resolve();
          }
        });
      });
      conn.host({ action: 'settings', settings: { forceGame: gameId, length: 'quick' } });
      for (let i = 1; i < n; i++) conn.host({ action: 'addBot' });
      if (!live) return;
      setRoom({ code, hostToken, seatToken: joined.seatToken });
      // Give the player iframe a moment to connect so it doesn't get autopiloted.
      setTimeout(() => conn?.host({ action: 'start' }), 1500);
    })().catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
      setTimeout(() => conn?.close(), 3000);
    };
  }, [gameId, n]);

  if (error) return <div className="panel" style={{ margin: 20 }}>Harness failed: {error}</div>;
  if (!room) return <div className="center" style={{ height: '100%' }}>Setting up {gameId}…</div>;
  return (
    <div className="harness">
      <iframe title="Host screen" className="harness-host" src={`/host/${room.code}#t=${encodeURIComponent(room.hostToken)}`} />
      <iframe title="Player screen" className="harness-player" src={`/${room.code}#seat=${encodeURIComponent(room.seatToken)}`} allow="screen-wake-lock" />
    </div>
  );
}
