import { JoinRequest, normaliseCode, randomCode, type CreateRoomResponse } from '@partygame/shared';
import * as v from 'valibot';
import type { Env } from './env.ts';
import { randomToken } from './tokens.ts';

export { Room } from './room.ts';
export { Feedback } from './feedback.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** Best-effort per-isolate rate limit on room creation (free tier friendly, no storage). */
const recentCreates = new Map<string, number[]>();
function allowCreate(ip: string, now: number): boolean {
  const windowMs = 10 * 60 * 1000;
  const list = (recentCreates.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= 20) return false;
  list.push(now);
  recentCreates.set(ip, list);
  if (recentCreates.size > 5000) recentCreates.clear();
  return true;
}

function roomStub(env: Env, code: string) {
  return env.ROOMS.get(env.ROOMS.idFromName(code));
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] === 'api') {
      if (parts[1] === 'health') return json({ ok: true, time: Date.now() });

      // POST /api/rooms → create a room, returning its code and the host token.
      if (parts[1] === 'rooms' && parts.length === 2 && request.method === 'POST') {
        // Local dev (loopback, or no Cloudflare edge header) is exempt so test suites can create many rooms.
        const ip = request.headers.get('cf-connecting-ip');
        const local = !ip || ip === '127.0.0.1' || ip === '::1';
        if (!local && !allowCreate(ip, Date.now())) return json({ error: 'Too many rooms created. Try again in a few minutes.' }, 429);
        for (let attempt = 0; attempt < 12; attempt++) {
          const code = randomCode();
          const hostToken = randomToken();
          if (await roomStub(env, code).init(code, hostToken)) return json({ code, hostToken } satisfies CreateRoomResponse);
        }
        return json({ error: 'Could not allocate a room code.' }, 503);
      }

      if (parts[1] === 'rooms' && parts[2]) {
        const code = normaliseCode(parts[2]);
        if (!code) return json({ error: 'Room codes are 4 letters.' }, 400);
        const stub = roomStub(env, code);
        // GET /api/rooms/:code → does it exist?
        if (parts.length === 3 && request.method === 'GET') return json(await stub.info());
        // POST /api/rooms/:code/join → claim a seat.
        if (parts[3] === 'join' && request.method === 'POST') {
          const body = v.safeParse(JoinRequest, await request.json().catch(() => null));
          if (!body.success) return json({ ok: false, error: 'Names are 1 to 16 characters.' }, 400);
          return json(await stub.join(body.output));
        }
      }

      if (parts[1] === 'admin' && parts[2] === 'feedback') {
        if (!env.ADMIN_KEY || url.searchParams.get('key') !== env.ADMIN_KEY) return json({ error: 'Forbidden' }, 403);
        return json(await env.FEEDBACK.get(env.FEEDBACK.idFromName('global')).list());
      }

      return json({ error: 'Not found' }, 404);
    }

    // GET /ws/:code?role=host|player&token=… → WebSocket into the room.
    if (parts[0] === 'ws' && parts[1]) {
      const code = normaliseCode(parts[1]);
      if (!code) return new Response('Bad code', { status: 400 });
      return roomStub(env, code).fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
