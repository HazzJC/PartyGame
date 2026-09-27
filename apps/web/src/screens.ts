/** Registers every phase's host and player screens. Imported once by the host page and the player shell. */
import { BoardHost } from './board/BoardHost.tsx';
import { BoardPlayer } from './board/BoardPlayer.tsx';
import { MinigameHost, PayoutHost, PodiumHost, RoundIntroHost, RulesHost } from './game/HostFlow.tsx';
import { MinigamePlayer, PayoutPlayer, PodiumPlayer, RoundIntroPlayer, RulesPlayer } from './game/PlayerFlow.tsx';
import { registerHostScreen } from './host/registry.tsx';
import './minigames/index.ts';
import { registerPlayerScreen } from './player/registry.tsx';
import { CalibrateHost, CalibratePlayer } from './toys/Calibrate.tsx';
import { ReactionHost, ReactionPlayer } from './toys/Reaction.tsx';

registerHostScreen('calibrate', CalibrateHost);
registerPlayerScreen('calibrate', CalibratePlayer);
registerHostScreen('reaction', ReactionHost);
registerPlayerScreen('reaction', ReactionPlayer);

registerHostScreen('roundIntro', RoundIntroHost);
registerPlayerScreen('roundIntro', RoundIntroPlayer);
registerHostScreen('rules', RulesHost);
registerPlayerScreen('rules', RulesPlayer);
registerHostScreen('minigame', MinigameHost);
registerPlayerScreen('minigame', MinigamePlayer);
registerHostScreen('payout', PayoutHost);
registerPlayerScreen('payout', PayoutPlayer);
registerHostScreen('podium', PodiumHost);
registerPlayerScreen('podium', PodiumPlayer);
registerHostScreen('board', BoardHost);
registerPlayerScreen('board', BoardPlayer);
