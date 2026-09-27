/** Registers every phase and mini game with the engine. Import once from the server adapter (and tests). */
import '../lobby.ts';
import '../toys/calibrate.ts';
import '../toys/reaction.ts';
import './minigame.ts';
import './flow.ts';
import './games/lun.ts';
import './games/stopwatch.ts';
import './games/count.ts';

export * from './state.ts';
export * from './minigame.ts';
export * from './payout.ts';
export * from './flow.ts';
export { lunPlaces } from './games/lun.ts';
export { stopwatchScore } from './games/stopwatch.ts';
export { countGrade } from './games/count.ts';
