/** Registers every phase's host and player screens. Imported once by the host page and the player shell. */
import { registerHostScreen } from './host/registry.tsx';
import { registerPlayerScreen } from './player/registry.tsx';
import { CalibrateHost, CalibratePlayer } from './toys/Calibrate.tsx';
import { ReactionHost, ReactionPlayer } from './toys/Reaction.tsx';

registerHostScreen('calibrate', CalibrateHost);
registerPlayerScreen('calibrate', CalibratePlayer);
registerHostScreen('reaction', ReactionHost);
registerPlayerScreen('reaction', ReactionPlayer);
