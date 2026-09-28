import { describe, expect, it } from 'vitest';
import { cueFor, musicLevelFor } from './cues.ts';

describe('host transition cues', () => {
  it('uses one motif at round start, star moments, and losses', () => {
    expect(cueFor({ kind: 'roundIntro' }, { kind: 'payout' })).toBe('motifRound');
    expect(cueFor({ kind: 'bonus' }, { kind: 'board' })).toBe('motifStar');
    expect(cueFor({ kind: 'threat' }, { kind: 'board' })).toBe('motifLoss');
    expect(cueFor({ kind: 'minigame', stage: 'reveal', result: { kind: 'coop', grade: 'fail' } }, { kind: 'minigame', stage: 'play' })).toBe('motifLoss');
  });
  it('leaves the recorded podium fanfare alone and avoids repeated cues', () => {
    expect(cueFor({ kind: 'podium' }, { kind: 'bonus' })).toBeNull();
    expect(cueFor({ kind: 'board', stage: 'roll' }, { kind: 'board', stage: 'roll' })).toBeNull();
  });
  it('maps the other named transitions without stacking two effects', () => {
    const cases = [
      [{ kind: 'rules' }, { kind: 'board' }, 'card'],
      [{ kind: 'payout' }, { kind: 'minigame' }, 'coin'],
      [{ kind: 'duelSetup' }, { kind: 'board' }, 'drum'],
      [{ kind: 'board', stage: 'bid' }, { kind: 'board', stage: 'roll' }, 'drum'],
      [{ kind: 'board', stage: 'items' }, { kind: 'board', stage: 'roll' }, 'card'],
      [{ kind: 'board', stage: 'resolve' }, { kind: 'board', stage: 'move' }, 'pop'],
      [{ kind: 'board', stage: 'roll', walks: { a: { roll: 4 } } }, { kind: 'board', stage: 'roll', walks: { a: { roll: null } } }, 'roll'],
    ] as const;
    for (const [next, prev, cue] of cases) expect(cueFor(next, prev)).toBe(cue);
  });
  it('ducks music for rules and decisions', () => {
    expect(musicLevelFor({ kind: 'rules' })).toBeLessThan(musicLevelFor({ kind: 'minigame' }));
    expect(musicLevelFor({ kind: 'board', stage: 'bid' })).toBeLessThan(musicLevelFor({ kind: 'minigame' }));
    expect(musicLevelFor({ kind: 'board', stage: 'move', walks: { a: { roll: 4, deciding: true } } })).toBeLessThan(musicLevelFor({ kind: 'minigame' }));
  });
});
