import { useEffect, useRef, useSyncExternalStore } from 'react';
import { sound, type Mood, type Sfx } from './sound.ts';

interface PhaseLike {
  kind: string;
  stage?: string;
  format?: string;
  walks?: Record<string, { roll: number | null }>;
  result?: { kind: string; grade?: string } | null;
  choice?: string | null;
}

function moodFor(p: PhaseLike): Mood {
  switch (p.kind) {
    case 'lobby':
    case 'calibrate':
    case 'reaction':
      return 'lobby';
    case 'minigame':
      return p.format === 'duel' ? 'tense' : 'minigame';
    case 'duelSetup':
    case 'threat':
      return 'tense';
    case 'rules':
      return p.format === 'duel' ? 'tense' : 'board';
    case 'bonus':
    case 'podium':
      return 'podium';
    default:
      return 'board';
  }
}

/** The effect for arriving in a phase (or a new stage of one), if any. */
function cueFor(p: PhaseLike, prev: PhaseLike | null): Sfx | null {
  if (!prev || prev.kind !== p.kind) {
    switch (p.kind) {
      case 'roundIntro':
        return 'whoosh';
      case 'rules':
        return 'card';
      case 'payout':
        return 'coin';
      case 'duelSetup':
        return 'drum';
      case 'duelResult':
      case 'podium':
        return 'fanfare';
      case 'threat':
        return 'fail';
      case 'twist':
      case 'bonus':
        return 'star';
      default:
        return null;
    }
  }
  if (p.stage === prev.stage) {
    if (p.kind === 'twist' && p.choice && !prev.choice) return 'star';
    return null;
  }
  if (p.kind === 'minigame' && p.stage === 'reveal') return p.result?.kind === 'coop' && p.result.grade === 'fail' ? 'fail' : 'fanfare';
  if (p.kind === 'board' && p.stage === 'bid') return 'drum';
  if (p.kind === 'board' && p.stage === 'items') return 'card';
  if (p.kind === 'board' && p.stage === 'resolve') return 'pop';
  return null;
}

const rolls = (p: PhaseLike) => Object.values(p.walks ?? {}).filter((w) => w.roll !== null).length;

/**
 * Host screen soundtrack: a music mood per phase, plus effects on transitions. It reacts to views,
 * so a host screen that reconnects just picks up the current mood.
 */
export function useHostAudio(phase: PhaseLike | null | undefined): void {
  const prev = useRef<PhaseLike | null>(null);
  useEffect(() => {
    if (!phase) return;
    sound.setMood(moodFor(phase));
    const cue = cueFor(phase, prev.current);
    if (cue) sound.play(cue);
    else if (phase.kind === 'board' && phase.stage === 'roll' && prev.current?.kind === 'board' && rolls(phase) > rolls(prev.current)) sound.play('roll');
    prev.current = phase;
  }, [phase]);
  useEffect(() => () => sound.setMood('off'), []);
}

/** Current audio settings, re-rendering when they change. */
export function useSoundSettings() {
  return useSyncExternalStore(
    (fn) => sound.subscribe(fn),
    () => sound.settings,
  );
}
