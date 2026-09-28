import { TUTORIAL_SLIDES, TUTORIAL_SLIDE_MS } from '@partygame/shared';
import { definePhase, type PhaseBase } from '../phase.ts';
import type { RoomEngine } from '../room.ts';
import { flowHooks } from './flow.ts';
import { game } from './state.ts';

/**
 * Optional how-to-play intro before round 1 (lobby setting). Slides advance on a timer; once
 * every connected player has pressed "Got it" the rest are skipped.
 */
export interface TutorialPhase extends PhaseBase {
  kind: 'tutorial';
  slide: number;
  slideAt: number;
  ready: string[];
}

function finish(room: RoomEngine): void {
  game(room).tutorialDone = true;
  flowHooks.afterRoundIntro()(room);
}

function everyoneReady(room: RoomEngine, s: TutorialPhase): boolean {
  return room.seats.every((x) => x.isBot || !x.connected || s.ready.includes(x.id));
}

export const tutorialPhase = definePhase<TutorialPhase>({
  kind: 'tutorial',
  enter(room, s) {
    s.slide = 0;
    s.slideAt = room.now();
    s.ready = [];
    s.endsAt = room.now() + TUTORIAL_SLIDES.length * TUTORIAL_SLIDE_MS;
    room.setPhaseTimer('slide', room.now() + TUTORIAL_SLIDE_MS);
  },
  intent(room, s, seatId, intent) {
    if (intent.type !== 'ready' || s.ready.includes(seatId)) return;
    s.ready.push(seatId);
    if (everyoneReady(room, s)) room.setPhaseTimer('done', room.now() + 600);
  },
  timer(room, s, key) {
    if (key === 'done') return finish(room);
    if (key !== 'slide') return;
    if (s.slide + 1 >= TUTORIAL_SLIDES.length) return finish(room);
    s.slide++;
    s.slideAt = room.now();
    room.setPhaseTimer('slide', room.now() + TUTORIAL_SLIDE_MS);
  },
  hostAction(room, _s, action) {
    if (action.action !== 'skip') return false;
    finish(room);
    return true;
  },
  awaiting: (_room, s, seatId) => !s.ready.includes(seatId),
  // Bots don't need teaching; their "ready" is implied.
  hostView: (room, s) => ({ slide: s.slide, slideAt: s.slideAt, slideMs: TUTORIAL_SLIDE_MS, slides: TUTORIAL_SLIDES, ready: s.ready, humans: room.seats.filter((x) => !x.isBot && x.connected).length }),
  playerView: (_room, s, seatId) => ({ slide: s.slide, slides: TUTORIAL_SLIDES, ready: s.ready.includes(seatId) }),
});

// Round 1 starts with the intro when the host turned it on (never in the single-game harness).
const next = flowHooks.afterRoundIntro();
flowHooks.setAfterRoundIntro((room) => {
  const g = game(room);
  if (g.round === 1 && room.state.settings.tutorial && !g.tutorialDone && !room.state.settings.forceGame) room.goto({ kind: 'tutorial' });
  else next(room);
});
