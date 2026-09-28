import './format-badge.css';

const FORMATS = {
  ffa: { label: 'Free-for-all', mark: '✦', tone: 'blue' },
  team: { label: 'Team game', mark: '▣', tone: 'orange' },
  '1vN': { label: '1 vs many', mark: '◉', tone: 'purple' },
  coop: { label: 'Co-op', mark: '∞', tone: 'green' },
  duel: { label: 'Duel', mark: '⚔︎', tone: 'red' },
} as const;

export type GameFormat = keyof typeof FORMATS;

/** One illustration language for every game format. The mini games keep their own play art. */
export function FormatBadge({ format, compact = false }: { format: string; compact?: boolean }) {
  const item = FORMATS[format as GameFormat] ?? FORMATS.ffa;
  return <span className="format-badge" data-tone={item.tone} data-compact={compact} aria-label={item.label}>
    <span className="format-badge-art" aria-hidden="true"><i /><b>{item.mark}</b><i /></span>
    <span>{item.label}</span>
  </span>;
}

export function FormatParade() {
  return <div className="format-parade" aria-label="Game formats">{Object.keys(FORMATS).map((format) => <FormatBadge key={format} format={format} compact />)}</div>;
}
