import { COOP_PAYOUT, ONE_VS_MANY_PAYOUT, ffaCoinsForPlace, teamCoins } from '@partygame/shared';
import { median } from '../timing.ts';
import type { SeatId } from '../types.ts';
import type { MinigamePhase, MinigameResult } from './minigame.ts';

/**
 * Turns a mini game's placement into coins using the design doc's tables, so every game pays
 * on the same scale. Players the autopilot covered receive the median payout.
 */
export function computePayout(phase: Pick<MinigamePhase, 'participants' | 'teams' | 'autopiloted'>, result: MinigameResult): Record<SeatId, number> {
  const out: Record<SeatId, number> = {};
  const n = phase.participants.length;
  switch (result.kind) {
    case 'ffa': {
      const worst = n;
      for (const id of phase.participants) out[id] = ffaCoinsForPlace(result.places[id] ?? worst, n);
      break;
    }
    case 'team': {
      const teams = phase.teams ?? [];
      teams.forEach((team, i) => {
        for (const id of team) out[id] = teamCoins(result.teamPlaces[i] ?? teams.length, teams.length);
      });
      break;
    }
    case '1vN': {
      const [small = [], large = []] = phase.teams ?? [];
      for (const id of small) out[id] = result.smallWins ? ONE_VS_MANY_PAYOUT.smallWins : 0;
      for (const id of large) out[id] = result.smallWins ? 0 : ONE_VS_MANY_PAYOUT.largeWins;
      break;
    }
    case 'coop':
      for (const id of phase.participants) out[id] = COOP_PAYOUT[result.grade];
      break;
    case 'duel':
      // Duels pay their wager, handled by the duel flow.
      for (const id of phase.participants) out[id] = 0;
      break;
  }
  if (phase.autopiloted.length && result.kind !== 'duel') {
    const med = Math.round(median(phase.participants.map((id) => out[id] ?? 0)));
    for (const id of phase.autopiloted) if (id in out) out[id] = med;
  }
  return out;
}
