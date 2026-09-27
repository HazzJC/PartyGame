import { ClockEstimator, type ClientMsg, type HostAction, type Intent, type ServerMsg } from '@partygame/shared';
import { useEffect, useState, useSyncExternalStore } from 'react';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'kicked' | 'gone';

export interface ConnOptions {
  code: string;
  role: 'host' | 'player';
  token: string;
}

type MsgHandler = (msg: ServerMsg) => void;

const HEARTBEAT = '{"t":"hb"}';

/** Local monotonic milliseconds on the same scale as Date.now(). */
export const localNow = () => performance.timeOrigin + performance.now();

/**
 * One WebSocket to the room: reconnects with backoff, keeps the clock in sync with
 * the server, and holds the latest view the server projected for this client.
 */
export class Connection<V = any> {
  status: ConnStatus = 'connecting';
  view: V | null = null;
  readonly clock = new ClockEstimator();
  private ws: WebSocket | null = null;
  private listeners = new Set<() => void>();
  private handlers = new Set<MsgHandler>();
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private snapshot: { status: ConnStatus; view: V | null } = { status: this.status, view: null };

  constructor(readonly opts: ConnOptions) {
    // Deferred a tick so an immediate close (StrictMode's double mount) never opens a socket.
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, 0);
    window.addEventListener('online', this.nudge);
    document.addEventListener('visibilitychange', this.nudge);
  }

  /** Server time now, according to the synced clock. */
  serverNow = (): number => localNow() + this.clock.offset;

  private url(): string {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const q = new URLSearchParams({ role: this.opts.role, token: this.opts.token });
    return `${proto}//${location.host}/ws/${this.opts.code}?${q}`;
  }

  private connect(): void {
    if (this.closed) return;
    const ws = new WebSocket(this.url());
    this.ws = ws;
    let opened = false;
    ws.onopen = () => {
      opened = true;
      this.retry = 0;
      this.setStatus('open');
      this.syncBurst(8);
      if (this.syncTimer) clearInterval(this.syncTimer);
      this.syncTimer = setInterval(() => this.syncBurst(3), 30_000);
      // Liveness: answered by the server runtime without waking the room.
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(HEARTBEAT);
      }, 10_000);
    };
    ws.onmessage = (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(ev.data as string) as ServerMsg;
      } catch {
        return;
      }
      if ((msg as { t: string }).t === 'hb') return;
      if (msg.t === 'pong') this.clock.add({ t0: msg.t0, t1: localNow(), ts: msg.ts });
      else if (msg.t === 'view') {
        this.view = msg.view as V;
        this.emit();
      } else if (msg.t === 'kicked') {
        this.closed = true;
        this.setStatus('kicked');
      }
      for (const h of this.handlers) h(msg);
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.syncTimer) clearInterval(this.syncTimer);
      if (this.heartbeat) clearInterval(this.heartbeat);
      if (this.closed) return;
      if (ev.code === 4001) return this.setStatus('kicked');
      if (ev.code === 4000) return this.setStatus('gone');
      if (!opened) void this.checkGone();
      this.setStatus('reconnecting');
      this.scheduleRetry();
    };
  }

  /** A handshake that never opens may mean the room expired or the token is stale. */
  private async checkGone(): Promise<void> {
    if (this.retry < 2) return;
    try {
      const res = await fetch(`/api/rooms/${this.opts.code}`);
      const info = (await res.json()) as { exists: boolean };
      if (!info.exists) {
        this.closed = true;
        this.setStatus('gone');
      }
    } catch {
      // Offline: keep retrying.
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    const delay = Math.min(5000, 250 * 2 ** this.retry) * (0.75 + Math.random() * 0.5);
    this.retry++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  /** Reconnect immediately when the tab comes back or the network returns (phones lock a lot). */
  private nudge = (): void => {
    if (this.closed || document.visibilityState !== 'visible') return;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.retry = 0;
      this.connect();
    } else if (this.ws.readyState === WebSocket.OPEN) {
      this.syncBurst(3);
    }
  };

  private syncBurst(n: number): void {
    for (let i = 0; i < n; i++) setTimeout(() => this.send({ t: 'ping', t0: localNow() }), i * 70);
  }

  send(msg: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  intent(intent: Intent): void {
    this.send({ t: 'intent', intent, sentAt: this.clock.ready ? this.serverNow() : undefined });
  }

  host(cmd: HostAction): void {
    this.send({ t: 'host', cmd });
  }

  onMessage(handler: MsgHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  private setStatus(s: ConnStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.emit();
  }

  private emit(): void {
    this.snapshot = { status: this.status, view: this.view };
    for (const l of this.listeners) l();
  }

  close(): void {
    this.closed = true;
    window.removeEventListener('online', this.nudge);
    document.removeEventListener('visibilitychange', this.nudge);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.ws?.close();
  }
}

export function useConnection<V>(conn: Connection<V>): { status: ConnStatus; view: V | null } {
  return useSyncExternalStore(conn.subscribe, conn.getSnapshot);
}

/** Owns a Connection for the component's lifetime (safe under StrictMode's double mount). */
export function useRoomConnection<V>(code: string, role: 'host' | 'player', token: string): Connection<V> | null {
  const [conn, setConn] = useState<Connection<V> | null>(null);
  useEffect(() => {
    const c = new Connection<V>({ code, role, token });
    setConn(c);
    return () => {
      c.close();
      setConn(null);
    };
  }, [code, role, token]);
  return conn;
}

