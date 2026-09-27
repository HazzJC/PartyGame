import type { CreateRoomResponse, JoinResponse } from '@partygame/shared';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  // Join replies carry { ok, error } even on 4xx; anything else that fails is thrown.
  if (!res.ok && !('ok' in body)) throw new Error(body.error ?? res.statusText);
  return body;
}

export const api = {
  createRoom: () => call<CreateRoomResponse>('/api/rooms', { method: 'POST' }),
  roomInfo: (code: string) => call<{ exists: boolean; phase?: string; players?: number }>(`/api/rooms/${code}`),
  join: (code: string, name: string, avatar?: number) =>
    call<JoinResponse>(`/api/rooms/${code}/join`, { method: 'POST', body: JSON.stringify({ name, avatar }) }),
};
