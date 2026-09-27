/** Registers every phase and mini game with the engine. Import once from the server adapter (and tests). */
import '../lobby.ts';
import '../toys/calibrate.ts';
import '../toys/reaction.ts';
import './minigame.ts';
import './flow.ts';
import './games/lun.ts';
import './games/stopwatch.ts';
import './games/count.ts';
import './games/tug.ts';
import './games/hunter.ts';
import '../board/board.ts';
// After the board: the endgame wraps the board's flow steps.
import './endgame.ts';

export * from './state.ts';
export * from './minigame.ts';
export * from './payout.ts';
export * from './flow.ts';
export { lunPlaces } from './games/lun.ts';
export { stopwatchScore } from './games/stopwatch.ts';
export { countGrade } from './games/count.ts';
export * from '../board/generate.ts';
export * from '../board/state.ts';
export { formatFromColours, initBoard } from '../board/board.ts';
export * from './endgame.ts';
export { hunterZones, caught } from './games/hunter.ts';
export * from '../simulate.ts';
