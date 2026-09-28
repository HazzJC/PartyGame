/**
 * Balance simulator: plays many all-bot games and reports the economy the design doc estimates
 * (leader stars, coins, format mix, session length). Usage:
 *   pnpm --filter @partygame/sim sim [games=40] [length=standard] [team] [cards]
 * `team` plays team board mode (8+ players, stars counted per team); `cards` uses movement cards.
 */
import { createSimRoom, game, standings } from '@partygame/engine/game';

const games = Number(process.argv[2] ?? 40);
const length = (process.argv[3] ?? 'standard') as 'quick' | 'standard' | 'long';
const flags = new Set(process.argv.slice(4));
const teamBoard = flags.has('team');

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pct = (x: number) => `${Math.round(x * 100)}%`;

console.log(`Simulating ${games} ${length} games per room size (bots only${teamBoard ? ', team board: rows are teams' : ''}${flags.has('cards') ? ', movement cards' : ''})\n`);
console.log('players | leader ★ | median ★ | ★ bought/game | end coins | minutes | ffa / team / 1vN / coop');

for (const n of teamBoard ? [8, 12, 16] : [6, 8, 12, 16]) {
  const leaders: number[] = [];
  const medians: number[] = [];
  const bought: number[] = [];
  const coins: number[] = [];
  const minutes: number[] = [];
  const formats: Record<string, number> = {};
  for (let i = 0; i < games; i++) {
    const { room, run, now } = createSimRoom({ seed: n * 1000 + i, bots: n, length });
    if (teamBoard) room.state.settings.teamBoard = true;
    if (flags.has('cards')) room.state.settings.movement = 'cards';
    const start = now();
    room.hostAction({ action: 'start' }, { role: 'host' });
    run(() => room.phase.kind === 'podium');
    const g = game(room);
    const order = standings(g);
    const bonus = (g.bonus ?? []).reduce((s, b) => s + b.winners.length, 0);
    const stars = order.map((id) => g.players[id]!.stars);
    leaders.push(stars[0]!);
    medians.push(stars[Math.floor(stars.length / 2)]!);
    bought.push(stars.reduce((a, b) => a + b, 0) - bonus);
    coins.push(mean(order.map((id) => g.players[id]!.coins)));
    minutes.push((now() - start) / 60_000);
    for (const h of g.history) formats[h.format] = (formats[h.format] ?? 0) + 1;
  }
  const total = Object.values(formats).reduce((a, b) => a + b, 0);
  const f = (k: string) => pct((formats[k] ?? 0) / total);
  console.log(
    `${String(n).padStart(7)} | ${mean(leaders).toFixed(1).padStart(8)} | ${mean(medians).toFixed(1).padStart(8)} | ${mean(bought).toFixed(1).padStart(13)} | ${mean(coins).toFixed(0).padStart(9)} | ${mean(minutes).toFixed(0).padStart(7)} | ${f('ffa')} / ${f('team')} / ${f('1vN')} / ${f('coop')}`,
  );
}
console.log('\nDesign doc target: a 12-round leader finishes with about 3 to 5 stars (bonus stars included).');
