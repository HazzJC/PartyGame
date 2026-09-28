import type { PublicSeat, Settings } from '@partygame/engine';
import { useState } from 'react';
import './settings.css';

interface CatalogueEntry {
  id: string;
  name: string;
  formats: string[];
  minPlayers: number;
}

interface SettingsHost {
  host(action: { action: 'settings'; settings: Partial<Settings> }): void;
}

const FORMATS = [
  { id: 'ffa', label: 'Free-for-all' },
  { id: 'team', label: 'Team' },
  { id: '1vN', label: '1 vs many' },
  { id: 'coop', label: 'Co-op' },
] as const;

/** Team board mode needs this many seats (mirrors the engine's TEAM_BOARD_MIN). */
const TEAM_BOARD_MIN = 8;

/**
 * Extra game options for the host screen and the VIP's phone: dice or movement cards, team board
 * mode for big rooms, and the mini game deck.
 */
export function GameOptions({ conn, view, compact = false }: { conn: SettingsHost; view: { settings: Settings; seats: PublicSeat[]; phase: object }; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const s = view.settings;
  const catalogue = (view.phase as { catalogue?: CatalogueEntry[] }).catalogue ?? [];
  const off = s.removedGames.filter((id) => catalogue.some((c) => c.id === id)).length;
  const bigEnough = view.seats.length >= TEAM_BOARD_MIN;
  const set = (settings: Partial<Settings>) => conn.host({ action: 'settings', settings });
  return (
    <div className="gopts" data-compact={compact}>
      <div className="gopts-row">
        <span className="gopts-label">Movement</span>
        <div className={`seg ${compact ? 'small' : ''}`} role="group" aria-label="Movement">
          <button aria-pressed={s.movement === 'dice'} onClick={() => set({ movement: 'dice' })}>
            Dice
          </button>
          <button aria-pressed={s.movement === 'cards'} onClick={() => set({ movement: 'cards' })}>
            Cards
          </button>
        </div>
      </div>
      <label className="gopts-row gopts-check">
        <input type="checkbox" checked={!!s.teamBoard} onChange={(e) => set({ teamBoard: e.target.checked })} />
        <span>
          <b>Team board</b>
          <span className="muted"> · four teams share a pawn and purse{bigEnough ? '' : ` (needs ${TEAM_BOARD_MIN}+ players)`}</span>
        </span>
      </label>
      {catalogue.length > 0 && (
        <button className={`btn white ${compact ? 'small' : ''}`} onClick={() => setEditing(true)}>
          Mini games: {catalogue.length - off}/{catalogue.length} on
        </button>
      )}
      {editing && <DeckEditor catalogue={catalogue} removed={s.removedGames} players={view.seats.length} onChange={(removedGames) => set({ removedGames })} onClose={() => setEditing(false)} />}
    </div>
  );
}

function DeckEditor({ catalogue, removed, players, onChange, onClose }: { catalogue: CatalogueEntry[]; removed: string[]; players: number; onChange(removed: string[]): void; onClose(): void }) {
  const off = new Set(removed);
  const toggle = (id: string, on: boolean) => onChange(on ? removed.filter((x) => x !== id) : [...new Set([...removed, id])]);
  const setGroup = (ids: string[], on: boolean) => onChange(on ? removed.filter((x) => !ids.includes(x)) : [...new Set([...removed, ...ids])]);
  return (
    <div className="deck-back" onClick={onClose}>
      <div className="panel deck" role="dialog" aria-label="Mini game deck" onClick={(e) => e.stopPropagation()}>
        <div className="deck-head">
          <h2>Mini games</h2>
          <button className="btn green" onClick={onClose}>
            Done
          </button>
        </div>
        <p className="muted">Untick games you don't want dealt. If a format runs out, its round becomes a free-for-all, and free-for-all always keeps at least its full deck.</p>
        {FORMATS.map((f) => {
          const games = catalogue.filter((c) => c.formats.includes(f.id));
          if (!games.length) return null;
          const ids = games.map((g) => g.id);
          return (
            <section key={f.id} className="deck-group">
              <div className="deck-group-head">
                <h3>{f.label}</h3>
                <button className="btn white small" onClick={() => setGroup(ids, true)}>
                  All on
                </button>
                <button className="btn white small" onClick={() => setGroup(ids, false)}>
                  All off
                </button>
              </div>
              <div className="deck-list">
                {games.map((g) => (
                  <label key={g.id} className="deck-item" data-off={off.has(g.id)}>
                    <input type="checkbox" checked={!off.has(g.id)} onChange={(e) => toggle(g.id, e.target.checked)} />
                    <span>{g.name}</span>
                    {g.minPlayers > players && <span className="muted"> ({g.minPlayers}+)</span>}
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
