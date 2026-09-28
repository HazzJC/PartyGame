import type { Mood, Sfx } from './sound.ts';

export interface PhaseLike {
  kind: string;
  stage?: string;
  format?: string;
  walks?: Record<string, { roll: number | null; deciding?: boolean }>;
  result?: { kind: string; grade?: string } | null;
  choice?: string | null;
}

export function moodFor(p: PhaseLike): Mood {
  switch (p.kind) {
    case 'lobby': case 'calibrate': case 'reaction': return 'lobby';
    case 'minigame': return p.format === 'duel' ? 'tense' : 'minigame';
    case 'duelSetup': case 'threat': return 'tense';
    case 'rules': return p.format === 'duel' ? 'tense' : 'board';
    case 'podium': return 'podium';
    default: return 'board';
  }
}

/** Music is quieter while people read rules or decide on the board. */
export function musicLevelFor(p: PhaseLike): number {
  if (p.kind === 'rules' || p.kind === 'duelSetup') return 0.24;
  if (p.kind === 'board' && ['roll', 'bid', 'items'].includes(p.stage ?? '')) return 0.30;
  if (p.kind === 'board' && p.stage === 'move' && Object.values(p.walks ?? {}).some((w) => w.deciding)) return 0.30;
  if (p.kind === 'lobby' || p.kind === 'roundIntro') return 0.40;
  if (p.kind === 'podium') return 0.72;
  return 0.55;
}

const rolls = (p: PhaseLike) => Object.values(p.walks ?? {}).filter((w) => w.roll !== null).length;

/** Exactly one effect for each host view transition. Podium uses its recorded intro. */
export function cueFor(p: PhaseLike, prev: PhaseLike | null): Sfx | null {
  if (!prev || prev.kind !== p.kind) {
    switch (p.kind) {
      case 'roundIntro': return 'motifRound';
      case 'rules': return 'card';
      case 'payout': return 'coin';
      case 'duelSetup': return 'drum';
      case 'duelResult': return 'fanfare';
      case 'threat': return 'motifLoss';
      case 'twist': case 'bonus': return 'motifStar';
      default: return null;
    }
  }
  if (p.stage !== prev.stage) {
    if (p.kind === 'minigame' && p.stage === 'reveal') return p.result?.kind === 'coop' && p.result.grade === 'fail' ? 'motifLoss' : 'fanfare';
    if (p.kind === 'board' && p.stage === 'bid') return 'drum';
    if (p.kind === 'board' && p.stage === 'items') return 'card';
    if (p.kind === 'board' && p.stage === 'resolve') return 'pop';
    return null;
  }
  if (p.kind === 'twist' && p.choice && !prev.choice) return 'motifStar';
  if (p.kind === 'board' && p.stage === 'roll' && rolls(p) > rolls(prev)) return 'roll';
  return null;
}
