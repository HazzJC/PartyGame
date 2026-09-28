import { useEffect, useState } from 'react';
import { sound } from './sound.ts';

const KEY = 'pg.titleMusic';

function load(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function Note() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
      <path d="M9 18 V5 L19 3 V16" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={6.5} cy={18} r={3.2} fill="currentColor" />
      <circle cx={16.5} cy={16} r={3.2} fill="currentColor" />
    </svg>
  );
}

/**
 * Title page music: plays the lobby tune while you're on the home page. Off by default and
 * remembered per browser; it stops when you move on (the host screen has its own soundtrack).
 */
export function TitleMusic() {
  const [on, setOn] = useState(load);
  useEffect(() => {
    // If it was left on, it starts with the first click on the page (browsers require one).
    sound.setMood(on ? 'lobby' : 'off');
  }, [on]);
  useEffect(() => () => sound.setMood('off'), []);
  const toggle = () => {
    const next = !on;
    try {
      localStorage.setItem(KEY, next ? '1' : '0');
    } catch {
      // Private mode: just for this visit.
    }
    sound.unlock();
    if (next && sound.settings.muted) sound.update({ muted: false });
    setOn(next);
  };
  return (
    <button type="button" className="btn white small title-music" aria-pressed={on} onClick={toggle}>
      <Note />
      Music {on ? 'on' : 'off'}
    </button>
  );
}
