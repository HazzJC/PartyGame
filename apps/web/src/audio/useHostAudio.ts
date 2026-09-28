import { useEffect, useRef, useSyncExternalStore } from 'react';
import { sound } from './sound.ts';
import { cueFor, moodFor, musicLevelFor, type PhaseLike } from './cues.ts';

/**
 * Host screen soundtrack: a music mood per phase, plus effects on transitions. It reacts to views,
 * so a host screen that reconnects just picks up the current mood.
 */
export function useHostAudio(phase: PhaseLike | null | undefined): void {
  const prev = useRef<PhaseLike | null>(null);
  useEffect(() => {
    if (!phase) return;
    sound.setMood(moodFor(phase));
    sound.setPhaseMusicLevel(musicLevelFor(phase));
    const cue = cueFor(phase, prev.current);
    if (cue) sound.play(cue);
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
