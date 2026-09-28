import type { RoomEngine } from '../room.ts';
import { addCoins, entityName, game } from '../game/state.ts';
import { board, moveStar, type Spotlight } from './state.ts';

/** Board events from event spaces. Each is shown in the spotlight (or the summary past the cap). */
export const BOARD_EVENTS = ['lucky', 'unlucky', 'toll', 'charity', 'starShuffle'] as const;
export type BoardEvent = (typeof BOARD_EVENTS)[number];

export function applyBoardEvent(room: RoomEngine, id: string, ev: BoardEvent): Spotlight {
  const g = game(room);
  const name = entityName(room, g, id);
  switch (ev) {
    case 'lucky': {
      const got = addCoins(g, id, 8);
      return { kind: 'event', seats: [id], title: 'Lucky find!', text: `${name} finds ${got} coins under the table` };
    }
    case 'unlucky': {
      const lost = -addCoins(g, id, -5);
      return { kind: 'event', seats: [id], title: 'Butterfingers', text: `${name} drops ${lost} coins down the sofa` };
    }
    case 'toll': {
      let total = 0;
      for (const other of g.order) if (other !== id) total += -addCoins(g, other, -1);
      addCoins(g, id, total);
      return { kind: 'event', seats: [id], title: 'Party toll', text: `Everyone pays ${name} a coin (${total} total)` };
    }
    case 'charity': {
      const poorest = [...g.order].filter((x) => x !== id).sort((a, b) => g.players[a]!.coins - g.players[b]!.coins).slice(0, 3);
      for (const p of poorest) addCoins(g, p, 3);
      return { kind: 'event', seats: [id, ...poorest], title: 'Charity drive', text: `${name} starts a charity: the 3 poorest ${g.teamBoard ? 'teams' : 'players'} get 3 coins each` };
    }
    case 'starShuffle': {
      const b = board(g);
      for (const star of [...b.stars]) moveStar(room, b, star);
      return { kind: 'event', seats: [id], title: 'Star shuffle!', text: `${name} spooks the stars: they fly to new spots` };
    }
  }
}
