import { DurableObject } from 'cloudflare:workers';
import { RoomEngine, type RoomState, type Sender } from '@partygame/engine';
import { parseClientMsg, type JoinRequest, type JoinResponse, type ServerMsg } from '@partygame/shared';
import '@partygame/engine/game';
import type { Env } from './env.ts';
import { randomToken } from './tokens.ts';

interface Attachment {
  role: 'host' | 'player';
  seatId: string | null;
  /** Unique per socket: getWebSockets() hands back fresh wrappers, so identity checks don't work. */
  connId: string;
  openedAt: number;
}

/** Heartbeats are answered by the runtime without waking the object; we only read their timestamps. */
export const HEARTBEAT = '{"t":"hb"}';
const STALE_AFTER_MS = 30_000;
const SWEEP_EVERY_MS = 15_000;

const PERSIST_DEBOUNCE_MS = 1000;
const clock = { now: () => Date.now() };

/**
 * One Durable Object per party code. It adapts the pure engine to WebSockets
 * (hibernation API), alarms (engine timers) and storage (state snapshots).
 */
export class Room extends DurableObject<Env> {
  private engine: RoomEngine | null = null;
  private lastSent = new WeakMap<WebSocket, string>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistedPhaseNo = -1;
  private alarmAt: number | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(HEARTBEAT, HEARTBEAT));
    ctx.blockConcurrencyWhile(async () => {
      const state = await ctx.storage.get<RoomState>('state');
      if (state) {
        this.engine = new RoomEngine(state, { clock, token: randomToken });
        this.persistedPhaseNo = state.phaseNo;
      }
      this.alarmAt = await ctx.storage.getAlarm();
    });
  }

  // ------------------------------------------------------------------ RPC from the Worker

  async init(code: string, hostToken: string): Promise<boolean> {
    if (this.engine && !this.engine.isExpired()) return false;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    this.engine = new RoomEngine(RoomEngine.createState(code, hostToken, Date.now(), seed), { clock, token: randomToken });
    await this.persistNow();
    this.after();
    return true;
  }

  async info(): Promise<{ exists: boolean; phase?: string; players?: number }> {
    if (!this.engine || this.engine.isExpired()) return { exists: false };
    return { exists: true, phase: this.engine.phase.kind, players: this.engine.seats.length };
  }

  async join(req: JoinRequest): Promise<JoinResponse> {
    const engine = this.engine;
    if (!engine || engine.isExpired()) return { ok: false, error: 'That room code has expired or does not exist.' };
    const result = engine.join(req.name, req.avatar);
    if (!result.ok) return result;
    this.after();
    return { ok: true, seatToken: result.seat.token, seatId: result.seat.id, rejoined: result.rejoined };
  }

  // ------------------------------------------------------------------ WebSockets

  override async fetch(request: Request): Promise<Response> {
    const engine = this.engine;
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    if (!engine || engine.isExpired()) return new Response('Room not found', { status: 404 });

    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const token = url.searchParams.get('token') ?? '';
    let attachment: Attachment;
    if (role === 'host') {
      if (token !== engine.state.hostToken) return new Response('Bad host token', { status: 403 });
      attachment = { role: 'host', seatId: null, connId: randomToken(), openedAt: Date.now() };
    } else {
      const seat = engine.seatByToken(token);
      if (!seat || seat.isBot) return new Response('Unknown seat', { status: 403 });
      attachment = { role: 'player', seatId: seat.id, connId: randomToken(), openedAt: Date.now() };
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [attachment.role, attachment.seatId ?? 'host']);
    server.serializeAttachment(attachment);
    if (attachment.seatId) engine.setConnected(attachment.seatId, true);
    engine.touch();
    this.after();
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const engine = this.engine;
    if (!engine) return;
    const att = ws.deserializeAttachment() as Attachment;
    const msg = typeof raw === 'string' ? parseClientMsg(raw) : null;
    if (!msg) return;

    switch (msg.t) {
      case 'ping':
        // Clock sync: no state change, so skip broadcasting.
        this.send(ws, { t: 'pong', t0: msg.t0, ts: Date.now() });
        return;
      case 'intent':
        if (att.seatId) engine.intent(att.seatId, msg.intent, msg.sentAt ?? null);
        break;
      case 'host': {
        const by: Sender = att.role === 'host' ? { role: 'host' } : { role: 'player', seatId: att.seatId! };
        const reply = engine.hostAction(msg.cmd, by);
        if (reply) this.send(ws, reply);
        break;
      }
      case 'device':
        if (att.seatId) engine.setDevice(att.seatId, msg.profile);
        break;
      case 'feedback': {
        const stub = this.env.FEEDBACK.get(this.env.FEEDBACK.idFromName('global'));
        const context = { ...(msg.context ?? {}), phase: engine.phase.kind, seats: engine.seats.length, round: engine.state.game?.round ?? null };
        this.ctx.waitUntil(stub.add({ at: Date.now(), code: engine.state.code, seat: att.seatId ?? 'host', text: msg.text, context }));
        return;
      }
    }
    this.after();
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    // Complete the close handshake so the socket stops counting as open.
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye');
    } catch {
      // Already closed.
    }
    this.onSocketGone(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    this.onSocketGone(ws);
  }

  private onSocketGone(ws: WebSocket): void {
    const engine = this.engine;
    if (!engine) return;
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att?.seatId) {
      const stillOpen = this.ctx.getWebSockets(att.seatId).some((other) => {
        const o = other.deserializeAttachment() as Attachment | null;
        return o?.connId !== att.connId && other.readyState === WebSocket.OPEN && !this.isStale(other);
      });
      if (!stillOpen) engine.setConnected(att.seatId, false);
    }
    this.after();
  }

  private isStale(ws: WebSocket): boolean {
    const att = ws.deserializeAttachment() as Attachment | null;
    const hb = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? 0;
    return Date.now() - Math.max(hb, att?.openedAt ?? 0) > STALE_AFTER_MS;
  }

  /** Closes sockets whose client stopped heartbeating (phones that dropped without a close frame). */
  private sweep(): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (!this.isStale(ws)) continue;
      try {
        ws.close(4002, 'Stale');
      } catch {
        // Already closed.
      }
      this.onSocketGone(ws);
    }
  }

  // ------------------------------------------------------------------ alarms

  override async alarm(): Promise<void> {
    this.alarmAt = null;
    const engine = this.engine;
    if (!engine) return;
    if (engine.isExpired()) {
      for (const ws of this.ctx.getWebSockets()) ws.close(4000, 'Room expired');
      this.engine = null;
      await this.ctx.storage.deleteAll();
      return;
    }
    this.sweep();
    engine.fireTimers();
    this.after();
  }

  // ------------------------------------------------------------------ plumbing

  /** Call after every engine mutation: drains kicks, broadcasts, persists and reschedules. */
  private after(): void {
    const engine = this.engine;
    if (!engine) return;
    // Timers that became due while handling a message run now rather than waiting for the alarm.
    engine.fireTimers();

    for (const seatId of engine.kicked.splice(0)) {
      for (const ws of this.ctx.getWebSockets(seatId)) {
        this.send(ws, { t: 'kicked' });
        ws.close(4001, 'Kicked');
      }
    }

    this.broadcast();
    this.updateTicker();

    if (engine.state.phaseNo !== this.persistedPhaseNo) {
      this.ctx.waitUntil(this.persistNow());
    } else if (!this.persistTimer) {
      this.persistTimer = setTimeout(() => {
        this.persistTimer = null;
        this.ctx.waitUntil(this.persistNow());
      }, PERSIST_DEBOUNCE_MS);
    }

    const next = engine.nextTimerAt();
    const expiry = engine.state.lastActivity + 2 * 60 * 60 * 1000 + 1000;
    let want = next === null ? expiry : Math.min(next, expiry);
    if (this.ctx.getWebSockets().length > 0) want = Math.min(want, Date.now() + SWEEP_EVERY_MS);
    // Only ever pull the alarm earlier: an early wake-up just recomputes, a late one would miss a timer.
    if (this.alarmAt === null || want < this.alarmAt - 5) {
      this.alarmAt = want;
      this.ctx.waitUntil(this.ctx.storage.setAlarm(want));
    }
  }

  /** Real-time mini games ask for a fixed-rate tick while they run. */
  private updateTicker(): void {
    const engine = this.engine;
    const hz = engine?.tickHz() ?? 0;
    if (hz > 0 && !this.tickTimer) {
      this.tickTimer = setInterval(() => {
        const e = this.engine;
        if (!e || e.tickHz() === 0) {
          if (this.tickTimer) clearInterval(this.tickTimer);
          this.tickTimer = null;
          return;
        }
        const data = e.tick();
        if (data !== undefined) {
          const msg = JSON.stringify({ t: 'tick', data } satisfies ServerMsg);
          for (const ws of this.ctx.getWebSockets()) this.sendRaw(ws, msg);
        }
        this.after();
      }, Math.round(1000 / hz));
    } else if (hz === 0 && this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private async persistNow(): Promise<void> {
    const engine = this.engine;
    if (!engine) return;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.persistedPhaseNo = engine.state.phaseNo;
    await this.ctx.storage.put('state', engine.snapshot());
  }

  private broadcast(): void {
    const engine = this.engine;
    if (!engine) return;
    const cache = new Map<string, string>();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const att = ws.deserializeAttachment() as Attachment | null;
      if (!att) continue;
      const key = att.seatId ?? 'host';
      let payload = cache.get(key);
      if (payload === undefined) {
        const view = att.seatId ? engine.playerView(att.seatId) : engine.hostView();
        payload = JSON.stringify({ t: 'view', view } satisfies ServerMsg);
        cache.set(key, payload);
      }
      if (this.lastSent.get(ws) === payload) continue;
      this.lastSent.set(ws, payload);
      this.sendRaw(ws, payload);
    }
  }

  private send(ws: WebSocket, msg: ServerMsg): void {
    this.sendRaw(ws, JSON.stringify(msg));
  }

  private sendRaw(ws: WebSocket, payload: string): void {
    try {
      ws.send(payload);
    } catch {
      // Socket already closing; the close handler tidies up.
    }
  }
}
