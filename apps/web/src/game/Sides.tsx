import type { HostView, PublicSeat } from '@partygame/engine';
import { TEAM_COLOURS } from '@partygame/shared';
import { Avatar } from '../ui/Avatar.tsx';

/**
 * Who is on which side, shown before a team or 1-vs-many game starts: on the host's rules card
 * (grouped, with who has pressed "Got it") and as a banner on each phone ("You're the Hunter!").
 */

export const TEAM_NAMES = ['Red', 'Blue', 'Green', 'Gold'];

/** What each side is called in the 1-vs-many games: the small side (one / several), then the many. */
const ONE_VS_MANY: Record<string, { one: string; few: string; many: string; oneJob: string; manyJob: string }> = {
  'hunter-vs-hiders': { one: 'The Hunter', few: 'The Hunters', many: 'The Hiders', oneJob: 'search the zones and catch the hiders', manyJob: 'hide where the hunter won’t look' },
  'pick-a-door-setter': { one: 'The Trap-setter', few: 'The Trap-setters', many: 'The Door pickers', oneJob: 'rig the doors and knock out half of them', manyJob: 'pick doors and dodge the traps' },
  'artillery-fortress': { one: 'The Fortress crew', few: 'The Fortress crew', many: 'The Attackers', oneJob: 'defend the fortress and pick off the tanks', manyJob: 'bring the fortress down together' },
  'heist-guard': { one: 'The Guard', few: 'The Guards', many: 'The Thieves', oneJob: 'plan patrols and catch the thieves', manyJob: 'grab gems without getting caught' },
};

export function sideNames(gameId: string, format: string, teams: string[][]): string[] {
  if (format === '1vN') {
    const n = ONE_VS_MANY[gameId];
    const small = teams[0]?.length ?? 1;
    return [n ? (small > 1 ? n.few : n.one) : small > 1 ? 'The few' : 'The one', n?.many ?? 'The many'];
  }
  return teams.map((_, i) => `${TEAM_NAMES[i] ?? `Team ${i + 1}`} team`);
}

const sideColour = (format: string, i: number) => (format === '1vN' ? (i === 0 ? '#9B5DE5' : '#1B998B') : (TEAM_COLOURS[i] ?? '#2B2233'));

/** The host's rules card: each side with its players (dimmed until they press "Got it"). */
export function SidesHost({ view, gameId, format, teams, ready }: { view: HostView; gameId: string; format: string; teams: string[][]; ready: Set<string> }) {
  const seats = new Map<string, PublicSeat>(view.seats.map((s) => [s.id, s]));
  const names = sideNames(gameId, format, teams);
  const vs = format === '1vN';
  return (
    <div className="sides" data-format={format}>
      {teams.map((ids, i) => (
        <div key={i} className="side-wrap">
          {i > 0 && <span className="sides-vs">vs</span>}
          <div className="side sticker" style={{ ['--side' as string]: sideColour(format, i) }} data-small={vs && i === 0}>
            <b className="side-name">{names[i]}</b>
            <div className="side-people">
              {ids.map((id) => {
                const s = seats.get(id);
                return s ? (
                  <span key={id} className="side-person rules-ready-av" data-ready={ready.has(id)}>
                    <Avatar avatar={s.avatar} size={vs && i === 0 ? 64 : 46} dim={!ready.has(id)} />
                    {vs && i === 0 && <span className="side-person-name">{s.name}</span>}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The phone's banner: which side you're on, who with, and against whom. */
export function MySide({ view, gameId, format, teams, team }: { view: { seats: PublicSeat[]; me: { id: string } }; gameId: string; format: string; teams: string[][]; team: number }) {
  const seats = new Map<string, PublicSeat>(view.seats.map((s) => [s.id, s]));
  const names = sideNames(gameId, format, teams);
  const mine = teams[team] ?? [];
  const others = teams.filter((_, i) => i !== team).flat();
  const mates = mine.filter((id) => id !== view.me.id);
  const job = ONE_VS_MANY[gameId];
  let headline: string;
  let detail: string;
  if (format === '1vN') {
    const small = team === 0;
    const one = names[0]!.replace(/^The /, '');
    headline = small ? (mine.length > 1 ? `You're one of ${names[0]}!` : `You're ${names[0]}!`) : `You're with ${names[1]}`;
    detail = small
      ? `${mates.length ? `With ${mates.map((id) => seats.get(id)?.name).join(', ')}, against` : 'On your own against'} ${others.length} others. ${job ? `Your job: ${job.oneJob}.` : ''}`
      : `Together against ${mine.length === 1 ? '' : 'the '}${one.toLowerCase()}: ${teams[0]!.map((id) => seats.get(id)?.name).join(', ')}. ${job ? `Your job: ${job.manyJob}.` : ''}`;
  } else {
    headline = `You're on the ${names[team]}`;
    detail = mates.length ? `With ${mates.map((id) => seats.get(id)?.name).join(', ')}` : 'On your own';
  }
  return (
    <div className="my-side sticker" style={{ ['--side' as string]: sideColour(format, team) }}>
      <b>{headline}</b>
      <span>{detail.trim()}</span>
      <div className="my-side-people">
        {mine.map((id) => {
          const s = seats.get(id);
          return s ? <Avatar key={id} avatar={s.avatar} size={30} /> : null;
        })}
        <span className="my-side-vs">vs</span>
        {others.slice(0, 8).map((id) => {
          const s = seats.get(id);
          return s ? <Avatar key={id} avatar={s.avatar} size={30} /> : null;
        })}
        {others.length > 8 && <span className="muted">+{others.length - 8}</span>}
      </div>
    </div>
  );
}
