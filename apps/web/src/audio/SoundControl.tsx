import { useEffect, useState, useSyncExternalStore } from 'react';
import { sound } from './sound.ts';
import { useSoundSettings } from './useHostAudio.ts';
import './sound.css';

function Speaker({ muted, level }: { muted: boolean; level: number }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {muted || level === 0 ? (
        <path d="M16 9 L21 15 M21 9 L16 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M16 8.5 Q19 12 16 15.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          {level > 0.5 && <path d="M18.5 6 Q23 12 18.5 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}

/**
 * Host screen volume: a mute button and a volume slider that are always there (bottom right),
 * with music and effects levels one tap away. Press M to mute. Settings are saved in this browser.
 */
export function SoundControl() {
  const s = useSoundSettings();
  const [open, setOpen] = useState(false);
  const running = useSyncExternalStore((fn) => sound.subscribe(fn), () => sound.running);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'm' || e.key === 'M') sound.update({ muted: !sound.settings.muted });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="sound-ctl" data-open={open}>
      {!running && !s.muted && (
        <button type="button" className="sound-hint chip" onClick={() => sound.unlock()}>
          Click for sound
        </button>
      )}
      {open && (
        <div className="sound-pop panel" role="dialog" aria-label="Sound levels">
          <label>
            Music
            <input type="range" min={0} max={1} step={0.05} value={s.music} onChange={(e) => sound.update({ music: Number(e.target.value) })} />
          </label>
          <label>
            Effects
            <input type="range" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => (sound.update({ sfx: Number(e.target.value) }), sound.play('coin'))} />
          </label>
          <p className="muted">Saved in this browser. Press M to mute.</p>
        </div>
      )}
      <div className="sound-bar sticker">
        <button type="button" className="sound-mute" aria-label={s.muted ? 'Unmute' : 'Mute'} aria-pressed={s.muted} onClick={() => sound.update({ muted: !s.muted })}>
          <Speaker muted={s.muted} level={s.volume} />
        </button>
        <input
          type="range"
          className="sound-volume"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.05}
          value={s.muted ? 0 : s.volume}
          onChange={(e) => sound.update({ volume: Number(e.target.value), muted: false })}
        />
        <button type="button" className="sound-more" aria-label="Music and effects levels" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          ⋯
        </button>
      </div>
    </div>
  );
}
