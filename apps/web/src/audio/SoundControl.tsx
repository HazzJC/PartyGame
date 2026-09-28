import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { displayPrefs, setDisplayPrefs, subscribeDisplayPrefs, type Motion } from '../ui/prefs.ts';
import { MOTION_LABEL } from '../ui/Preferences.tsx';
import { sound } from './sound.ts';
import { useSoundSettings } from './useHostAudio.ts';
import './sound.css';

function Speaker({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {muted ? (
        <path d="M16 9 L21 15 M21 9 L16 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M16 8.5 Q19 12 16 15.5 M18.5 6 Q23 12 18.5 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function Cog() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path
        d="M12 2.5 L14 5 L17.2 4.3 L17.9 7.5 L20.8 9 L19.6 12 L20.8 15 L17.9 16.5 L17.2 19.7 L14 19 L12 21.5 L10 19 L6.8 19.7 L6.1 16.5 L3.2 15 L4.4 12 L3.2 9 L6.1 7.5 L6.8 4.3 L10 5 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.6" fill="var(--paper)" />
    </svg>
  );
}

/**
 * Host screen options: one small button in the corner (so nothing covers the stream) that opens
 * volume, music and effects levels, plus an animation level for slower PCs. Saved per browser.
 * Press M to mute.
 */
export function SoundControl() {
  const s = useSoundSettings();
  const d = useSyncExternalStore(subscribeDisplayPrefs, displayPrefs);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const running = useSyncExternalStore((fn) => sound.subscribe(fn), () => sound.running);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'm' || e.key === 'M') sound.update({ muted: !sound.settings.muted });
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div className="sound-ctl" ref={box} data-open={open}>
      {open && (
        <div className="sound-pop panel" role="dialog" aria-label="Host options">
          <div className="sound-row">
            <button type="button" className="btn white small" aria-label={s.muted ? 'Unmute' : 'Mute'} aria-pressed={s.muted} onClick={() => sound.update({ muted: !s.muted })}>
              <Speaker muted={s.muted} />
              {s.muted ? 'Muted' : 'Sound on'}
            </button>
            {!running && !s.muted && (
              <button type="button" className="btn small" onClick={() => sound.unlock()}>
                Enable audio
              </button>
            )}
          </div>
          <label>
            Volume
            <input type="range" aria-label="Volume" min={0} max={1} step={0.05} value={s.muted ? 0 : s.volume} onChange={(e) => sound.update({ volume: Number(e.target.value), muted: false })} />
          </label>
          <label>
            Music
            <input type="range" aria-label="Music" min={0} max={1} step={0.05} value={s.music} onChange={(e) => sound.update({ music: Number(e.target.value) })} />
          </label>
          <label>
            Effects
            <input type="range" aria-label="Effects" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => (sound.update({ sfx: Number(e.target.value) }), sound.play('coin'))} />
          </label>
          <div className="sound-anim">
            <span>Animation</span>
            <div className="seg small" role="group" aria-label="Animation">
              {(['system', 'full', 'low', 'reduce'] as Motion[]).map((m) => (
                <button key={m} type="button" aria-pressed={d.motion === m} onClick={() => setDisplayPrefs({ motion: m })}>
                  {MOTION_LABEL[m]}
                </button>
              ))}
            </div>
            <p className="muted">Low keeps pawns and dice moving but stills the scenery, for slower PCs.</p>
          </div>
          <p className="muted">Saved in this browser. Press M to mute.</p>
        </div>
      )}
      <button type="button" className="sound-btn" aria-label="Host options: sound and animation" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {s.muted ? <Speaker muted /> : <Cog />}
        {!running && !s.muted && <span className="sound-dot" aria-hidden />}
      </button>
    </div>
  );
}
