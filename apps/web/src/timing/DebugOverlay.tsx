import { useEffect, useState } from 'react';
import type { Connection } from '../net/connection.ts';

/** `?debug` on any page shows clock sync health: offset, round trip and stream delay. */
export function DebugOverlay({ conn, streamDelayMs }: { conn: Connection; streamDelayMs?: number }) {
  const enabled = new URLSearchParams(location.search).has('debug');
  const [, tick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [enabled]);
  if (!enabled) return null;
  return (
    <div className="debug-overlay">
      <div>status {conn.status}</div>
      <div>offset {conn.clock.offset.toFixed(0)} ms</div>
      <div>rtt {conn.clock.rtt.toFixed(0)} ms ({conn.clock.sampleCount})</div>
      {streamDelayMs !== undefined && <div>stream {streamDelayMs} ms</div>}
      <div>server {new Date(conn.serverNow()).toISOString().slice(11, 23)}</div>
    </div>
  );
}
