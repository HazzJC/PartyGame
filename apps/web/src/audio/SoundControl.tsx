import { useState, useSyncExternalStore } from 'react';
import { sound } from './sound.ts';
import { useSoundSettings } from './useHostAudio.ts';
import './sound.css';

function Speaker({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {muted ? (
        <path d="M16 9 L21 15 M21 9 L16 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M16 8.5 Q19 12 16 15.5 M18.5 6 Q23 12 18.5 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Mute button with music and effects sliders. The host screen's sound reaches players through the stream. */
export function SoundControl() {
  const s = useSoundSettings();
  const [open, setOpen] = useState(false);
  const running = useSyncExternalStore((fn) => sound.subscribe(fn), () => sound.running);
  return (
    <div className="sound-ctl">
      {!running && !s.muted && (
        <button type="button" className="sound-hint chip" onClick={() => sound.unlock()}>
          Click for sound
        </button>
      )}
      <button type="button" className="sound-btn" aria-label={s.muted ? 'Unmute sound' : 'Sound settings'} aria-expanded={open} onClick={() => (s.muted ? sound.update({ muted: false }) : setOpen((o) => !o))}>
        <Speaker muted={s.muted} />
      </button>
      {open && (
        <div className="sound-pop panel" role="dialog" aria-label="Sound">
          <label>
            Music
            <input type="range" min={0} max={1} step={0.05} value={s.music} onChange={(e) => sound.update({ music: Number(e.target.value) })} />
          </label>
          <label>
            Effects
            <input type="range" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => (sound.update({ sfx: Number(e.target.value) }), sound.play('coin'))} />
          </label>
          <div className="row">
            <button type="button" className="btn white small" onClick={() => (sound.update({ muted: true }), setOpen(false))}>
              Mute all
            </button>
            <button type="button" className="btn white small" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
