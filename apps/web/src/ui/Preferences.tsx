import { useEffect, useState, useSyncExternalStore } from 'react';
import { BINDABLE, azertyPreset, extraBindings, keyLabel, resetBindings, setBinding, subscribeBindings, type BindableKey } from '../input/bindings.ts';
import { displayPrefs, setDisplayPrefs, subscribeDisplayPrefs, type Motion } from './prefs.ts';
import './settings.css';

export const MOTION_LABEL: Record<Motion, string> = { system: 'Auto', full: 'Full', low: 'Low', reduce: 'None' };

/** Accessibility and control preferences for this device: motion, contrast and extra key bindings. */
export function Preferences({ onClose, keys = true }: { onClose(): void; keys?: boolean }) {
  const d = useSyncExternalStore(subscribeDisplayPrefs, displayPrefs);
  const bindings = useSyncExternalStore(subscribeBindings, extraBindings);
  const [capturing, setCapturing] = useState<BindableKey | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key !== 'Escape' && e.key !== 'Tab') setBinding(capturing, e.key);
      setCapturing(null);
    };
    // Capture phase, so the game's own key handlers never see the key being bound.
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [capturing]);

  return (
    <div className="deck-back" onClick={onClose}>
      <div className="panel deck prefs" role="dialog" aria-label="Preferences" onClick={(e) => e.stopPropagation()}>
        <div className="deck-head">
          <h2>Preferences</h2>
          <button className="btn green" onClick={onClose}>
            Done
          </button>
        </div>
        <section className="deck-group">
          <h3>Motion</h3>
          <div className="seg small" role="group" aria-label="Motion">
            {(['system', 'full', 'low', 'reduce'] as Motion[]).map((m) => (
              <button key={m} aria-pressed={d.motion === m} onClick={() => setDisplayPrefs({ motion: m })}>
                {MOTION_LABEL[m]}
              </button>
            ))}
          </div>
        </section>
        <label className="gopts-row gopts-check">
          <input type="checkbox" checked={d.highContrast} onChange={(e) => setDisplayPrefs({ highContrast: e.target.checked })} />
          <span>
            <b>High contrast</b> <span className="muted">· darker text and bolder edges</span>
          </span>
        </label>
        {keys && (
          <section className="deck-group">
            <div className="deck-group-head">
              <h3>Extra keys</h3>
              <button className="btn white small" onClick={azertyPreset}>
                AZERTY (ZQSD)
              </button>
              <button className="btn white small" onClick={resetBindings}>
                Reset
              </button>
            </div>
            <p className="muted">The usual keys always work. Add one more key for any action, e.g. for one-handed play.</p>
            <div className="prefs-keys">
              {BINDABLE.map((b) => (
                <div key={b.key} className="prefs-key">
                  <span>
                    <b>{b.label}</b> <span className="muted">{b.defaults}</span>
                  </span>
                  <button className="btn white small" aria-label={`Extra key for ${b.label}`} onClick={() => setCapturing(b.key)}>
                    {capturing === b.key ? 'Press a key…' : bindings[b.key] ? keyLabel(bindings[b.key]!) : '+ Add'}
                  </button>
                  {bindings[b.key] && (
                    <button className="btn white small" aria-label={`Remove extra key for ${b.label}`} onClick={() => setBinding(b.key, null)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
