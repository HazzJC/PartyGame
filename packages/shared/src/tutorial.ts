/** How-to-play slides: shown big on the host screen before round 1, and on each phone. */
export interface TutorialSlide {
  id: 'goal' | 'board' | 'stars' | 'minigames' | 'phone';
  title: string;
  lines: string[];
}

export const TUTORIAL_SLIDES: TutorialSlide[] = [
  { id: 'goal', title: 'Collect the most stars', lines: ['Whoever has the most stars at the end wins.', 'Coins break ties, and coins buy stars.'] },
  { id: 'board', title: 'Everyone moves at once', lines: ['Tap Roll on your phone. Pick paths on your own map.', 'Blue space: +3 coins. Red space: −3 coins. ? is an event, $ is the shop, VS is a duel.'] },
  { id: 'stars', title: 'Pass a star, buy a star', lines: ['Stars cost 20 coins. Pass one with enough coins to buy it.', 'Two people reach the same star? Sealed bids: highest wins.'] },
  { id: 'minigames', title: 'Then a mini game', lines: ['The colours everyone landed on pick the format: free-for-all, teams, 1 vs many or co-op.', 'Better placings earn more coins.'] },
  { id: 'phone', title: 'Your phone is private', lines: ['Items, traps, bids and picks stay secret on your phone.', 'Results show on your phone only once the stream has caught up.'] },
];

export const TUTORIAL_SLIDE_MS = 8000;
