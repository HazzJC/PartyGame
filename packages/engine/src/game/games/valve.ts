import type { CoopGrade } from '@partygame/shared';
import { defineMinigame } from '../minigame.ts';

/**
 * Pressure Valve Balancer (co-op): a pressure gauge drifts on its own. Everyone has Pump and Vent,
 * each with a cooldown, to hold it inside the green band. Pump and vent amounts shrink as the room
 * grows, so the total push the room can give stays about the same.
 */
export interface ValveData {
  pressure: number;
  drift: number;
  band: [number, number];
  startAt: number;
  closesAt: number;
  ticks: number;
  inBand: number;
  cooldowns: Record<string, number>;
  lastTickAt: number;
  history: number[];
}

const TIME_MS = 40_000;
export const COOLDOWN_MS = 2500;
export const pushAmount = (n: number): number => Math.max(3, Math.round(40 / n));

export function valveGrade(fraction: number): CoopGrade {
  return fraction >= 0.8 ? 'gold' : fraction >= 0.6 ? 'silver' : fraction >= 0.4 ? 'bronze' : 'fail';
}

export const pressureValve = defineMinigame<ValveData>({
  id: 'pressure-valve',
  name: 'Pressure Valve Balancer',
  formats: ['coop'],
  inputs: [{ kind: 'buttons', buttons: [{ id: 'pump', label: 'Pump', key: 'W' }, { id: 'vent', label: 'Vent', key: 'S' }] }],
  blurb: 'Keep the pressure in the green band. Pump raises it, Vent lowers it, and each has a cooldown. Don’t all press at once!',
  setup(ctx) {
    const startAt = ctx.now() + 3000;
    const closesAt = startAt + TIME_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt);
    return { pressure: 50, drift: 0, band: [38, 62], startAt, closesAt, ticks: 0, inBand: 0, cooldowns: {}, lastTickAt: startAt, history: [] };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'pump' && intent.type !== 'vent') return;
    const now = ctx.now();
    if (now < d.startAt || (d.cooldowns[seatId] ?? 0) > now) return;
    d.cooldowns[seatId] = now + COOLDOWN_MS;
    d.pressure = Math.max(0, Math.min(100, d.pressure + (intent.type === 'pump' ? 1 : -1) * pushAmount(ctx.n)));
  },
  tickHz: (ctx, d) => (ctx.now() >= d.startAt && ctx.now() < d.closesAt ? 5 : 0),
  tick(ctx, d) {
    const now = ctx.now();
    const dt = Math.min(0.5, (now - d.lastTickAt) / 1000);
    d.lastTickAt = now;
    // A wandering drift that sometimes turns sharply.
    if (ctx.rng.chance(0.08)) d.drift = (ctx.rng.next() - 0.5) * 16;
    d.pressure = Math.max(0, Math.min(100, d.pressure + d.drift * dt + (ctx.rng.next() - 0.5) * 3));
    d.ticks++;
    if (d.pressure >= d.band[0] && d.pressure <= d.band[1]) d.inBand++;
    if (d.ticks % 5 === 0) d.history = [...d.history, Math.round(d.pressure)].slice(-40);
    return undefined;
  },
  timer(ctx, d, key) {
    if (key === 'deadline') ctx.finish({ kind: 'coop', grade: valveGrade(d.inBand / Math.max(1, d.ticks)) }, 4000);
  },
  awaiting: (ctx, d, seatId) => ctx.now() >= d.startAt && (d.cooldowns[seatId] ?? 0) <= ctx.now(),
  botDelay: [900, 3000],
  bot(ctx, d) {
    const mid = (d.band[0] + d.band[1]) / 2;
    // Bots only act when it's clearly needed, and sometimes hold off to let others.
    if (Math.abs(d.pressure - mid) < 6 || ctx.rng.chance(0.4)) return null;
    return { type: d.pressure < mid ? 'pump' : 'vent' };
  },
  hostView: (_ctx, d) => ({ pressure: Math.round(d.pressure), band: d.band, startAt: d.startAt, closesAt: d.closesAt, fraction: d.ticks ? d.inBand / d.ticks : 1, history: d.history }),
  playerView: (_ctx, d, seatId) => ({ pressure: Math.round(d.pressure), band: d.band, startAt: d.startAt, closesAt: d.closesAt, cooldownUntil: d.cooldowns[seatId] ?? 0, fraction: d.ticks ? d.inBand / d.ticks : 1 }),
});
