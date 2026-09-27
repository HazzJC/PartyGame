import * as v from 'valibot';

/** Kinds of device a player screen reports; used for rules cards and parity adjustments. */
export const DeviceKind = v.picklist(['touch', 'mouse', 'unknown']);
export type DeviceKind = v.InferOutput<typeof DeviceKind>;

export const SizeClass = v.picklist(['phone-portrait', 'phone-landscape', 'tablet', 'desktop']);
export type SizeClass = v.InferOutput<typeof SizeClass>;

export const DeviceProfile = v.object({
  kind: DeviceKind,
  size: SizeClass,
  keyboard: v.boolean(),
  gamepad: v.boolean(),
});
export type DeviceProfile = v.InferOutput<typeof DeviceProfile>;

/** A game input. Server code only ever sees intents, never raw DOM events. */
export const Intent = v.looseObject({ type: v.pipe(v.string(), v.maxLength(32)) });
export type Intent = { type: string; [k: string]: unknown };

export const HostAction = v.variant('action', [
  v.object({ action: v.literal('start') }),
  v.object({ action: v.literal('addBot') }),
  v.object({ action: v.literal('removeBots') }),
  v.object({ action: v.literal('kick'), seatId: v.string() }),
  v.object({ action: v.literal('setVip'), seatId: v.string() }),
  v.object({ action: v.literal('skip') }),
  v.object({ action: v.literal('pause'), paused: v.boolean() }),
  v.object({ action: v.literal('backToLobby') }),
  v.object({ action: v.literal('settings'), settings: v.record(v.string(), v.unknown()) }),
  v.object({ action: v.literal('newHostToken') }),
  v.object({ action: v.literal('seatLink') }),
  v.object({ action: v.literal('toy'), toy: v.picklist(['calibrate', 'reaction']) }),
  /** Test/playtest shortcuts; only honoured when the room's settings.devTools is on. */
  v.object({ action: v.literal('dev'), op: v.picklist(['giveItems', 'queueDuel', 'shop']) }),
]);
export type HostAction = v.InferOutput<typeof HostAction>;

export const ClientMsg = v.variant('t', [
  v.object({ t: v.literal('ping'), t0: v.number() }),
  v.object({ t: v.literal('intent'), intent: Intent, sentAt: v.optional(v.number()) }),
  v.object({ t: v.literal('host'), cmd: HostAction }),
  v.object({ t: v.literal('device'), profile: DeviceProfile }),
  v.object({ t: v.literal('feedback'), text: v.pipe(v.string(), v.maxLength(2000)), context: v.optional(v.record(v.string(), v.unknown())) }),
]);
export type ClientMsg = v.InferOutput<typeof ClientMsg>;

export type ServerMsg =
  | { t: 'pong'; t0: number; ts: number }
  | { t: 'view'; view: unknown }
  | { t: 'error'; message: string }
  | { t: 'kicked' }
  | { t: 'hostToken'; token: string }
  | { t: 'seatLink'; token: string }
  | { t: 'tick'; data: unknown };

/** HTTP API shapes. */
export interface CreateRoomResponse { code: string; hostToken: string; }
export const JoinRequest = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(16)),
  avatar: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15))),
});
export type JoinRequest = v.InferOutput<typeof JoinRequest>;
export type JoinResponse =
  | { ok: true; seatToken: string; seatId: string; rejoined: boolean }
  | { ok: false; error: string };

export function parseClientMsg(raw: string): ClientMsg | null {
  try {
    const result = v.safeParse(ClientMsg, JSON.parse(raw));
    return result.success ? result.output : null;
  } catch {
    return null;
  }
}
