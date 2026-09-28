import { traceLaser, type Mirror, type MirrorLayout } from '@partygame/shared';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Grid } from '../input/index.ts';
import { seatMap } from '../game/HostFlow.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { TEAM_COLOURS, TEAM_NAMES } from './TugOfWar.tsx';
import './minigames.css';
import './wave-d.css';

const NEXT: Record<Mirror, Mirror> = { '': '/', '/': '\\', '\\': '' };

function Board({ layout, board, colour, small }: { layout: MirrorLayout; board: Mirror[] | null; colour: string; small?: boolean }) {
  const { size, source, targets, walls, slots } = layout;
  const trace = board ? traceLaser(layout, board) : null;
  const pts = trace ? [`${source.x + 0.5},${source.y + 0.5}`, ...trace.path.map((c) => `${(c % size) + 0.5},${Math.floor(c / size) + 0.5}`)] : [];
  return (
    <svg className={`mirror-svg ${small ? 'small' : ''}`} viewBox={`-1.2 -0.2 ${size + 1.4} ${size + 0.4}`}>
      {Array.from({ length: size * size }, (_, c) => (
        <rect key={c} x={(c % size) + 0.04} y={Math.floor(c / size) + 0.04} width={0.92} height={0.92} rx={0.12} fill={walls.includes(c) ? '#4b3f8f' : targets.includes(c) ? (trace?.hits.includes(c) ? '#FFD23F' : '#c9f1fa') : '#f4f1fb'} />
      ))}
      {targets.map((c) => (
        <path key={`t${c}`} transform={`translate(${(c % size) + 0.5} ${Math.floor(c / size) + 0.5})`} d="M0 -0.3 L0.2 0 L0 0.3 L-0.2 0 Z" fill={trace?.hits.includes(c) ? '#FFF6CC' : '#9fe7f5'} stroke="#2B2233" strokeWidth={0.06} strokeLinejoin="round" />
      ))}
      {slots.map((c, i) => {
        const m = board?.[i] ?? '';
        const x = c % size;
        const y = Math.floor(c / size);
        return (
          <g key={`s${c}`}>
            <rect x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} rx={0.1} fill="none" stroke="#9B5DE5" strokeWidth={0.06} strokeDasharray="0.12 0.08" />
            {m === '/' && <line x1={x + 0.15} y1={y + 0.85} x2={x + 0.85} y2={y + 0.15} stroke="#2B2233" strokeWidth={0.2} strokeLinecap="round" />}
            {m === '/' && <line x1={x + 0.15} y1={y + 0.85} x2={x + 0.85} y2={y + 0.15} stroke="#dde3ee" strokeWidth={0.1} strokeLinecap="round" />}
            {m === '\\' && <line x1={x + 0.15} y1={y + 0.15} x2={x + 0.85} y2={y + 0.85} stroke="#2B2233" strokeWidth={0.2} strokeLinecap="round" />}
            {m === '\\' && <line x1={x + 0.15} y1={y + 0.15} x2={x + 0.85} y2={y + 0.85} stroke="#dde3ee" strokeWidth={0.1} strokeLinecap="round" />}
          </g>
        );
      })}
      <path d={`M${source.x + 0.1} ${source.y + 0.2} L${source.x + 0.8} ${source.y + 0.5} L${source.x + 0.1} ${source.y + 0.8} Z`} fill="#FF4D5E" stroke="#2B2233" strokeWidth={0.06} />
      {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={colour} strokeWidth={0.14} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />}
    </svg>
  );
}

function Host({ mg }: MgHostProps) {
  const d = mg.game as MirrorLayout & { boards: Mirror[][] | null; scores: number[] | null };
  const teams = mg.teams ?? [];
  if (!d.boards)
    return (
      <div className="mg-host mirror-host">
        <Board layout={d} board={null} colour="#FF4D5E" />
        <p className="mg-host-lead" style={{ flex: 1 }}>
          Every team has this same puzzle. Flip your mirrors to steer the laser through the targets!
        </p>
      </div>
    );
  return (
    <div className="mg-host mirror-results">
      {d.boards.map((b, i) => (
        <div key={i} className="mirror-team sticker" style={{ ['--team' as string]: TEAM_COLOURS[i] }}>
          <h3>
            {TEAM_NAMES[i]}: {d.scores?.[i] ?? 0} targets
          </h3>
          <Board layout={d} board={b} colour={TEAM_COLOURS[i]!} small={teams.length > 2} />
        </div>
      ))}
    </div>
  );
}

function Player({ conn, view, mg }: MgPlayerProps) {
  const d = mg.game as MirrorLayout & { closesAt: number; team: number; board: Mirror[]; owners: string[] };
  const seats = seatMap(view);
  const trace = traceLaser(d, d.board);
  const onPath = new Set(trace.path);
  const colour = TEAM_COLOURS[d.team] ?? '#FF4D5E';
  const mine = d.owners.map((o, i) => (o === view.me.id ? i : -1)).filter((i) => i >= 0).length;
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2 style={{ color: colour }}>{TEAM_NAMES[d.team]} team</h2>
        <span className="chip">{trace.hits.length} targets</span>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Tap your {mine} mirror{mine === 1 ? '' : 's'} (dashed, with your face) to flip them. Your team’s beam updates live.
      </p>
      <div className="heist-grid">
        <Grid
          w={d.size}
          h={d.size}
          cell={(x, y) => {
            const c = y * d.size + x;
            const slot = d.slots.indexOf(c);
            if (d.walls.includes(c)) return { fill: '#2B2233' };
            if (slot >= 0) {
              const owner = d.owners[slot];
              const m = d.board[slot] ?? '';
              const glyph = m === '/' ? '╱' : m === '\\' ? '╲' : owner === view.me.id ? '·' : '';
              return { fill: owner === view.me.id ? '#e3d4ff' : '#f2ecff', glyph, stroke: owner === view.me.id ? '#9B5DE5' : undefined };
            }
            if (d.targets.includes(c)) return { fill: trace.hits.includes(c) ? '#FFD23F' : '#ffe9a8', glyph: '◎' };
            return { fill: onPath.has(c) ? '#ffd0d5' : '#e9dcc3' };
          }}
          onCell={(x, y) => {
            const slot = d.slots.indexOf(y * d.size + x);
            if (slot < 0 || d.owners[slot] !== view.me.id) return;
            conn.intent({ type: 'mirror', slot, mirror: NEXT[d.board[slot] ?? ''] });
          }}
          overlay={
            <>
              <polyline
                points={[`${d.source.x + 0.9},${d.source.y + 0.5}`, ...trace.path.map((c) => `${(c % d.size) + 0.5},${Math.floor(c / d.size) + 0.5}`)].join(' ')}
                fill="none"
                stroke={colour}
                strokeWidth={0.12}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
              {d.slots.map((c, i) => {
                const s = seats.get(d.owners[i] ?? '');
                return s && d.owners[i] === view.me.id ? (
                  <g key={c} transform={`translate(${(c % d.size) + 0.62} ${Math.floor(c / d.size) + 0.02})`} pointerEvents="none">
                    <Avatar avatar={s.avatar} size={0.36} sticker={false} />
                  </g>
                ) : null;
              })}
            </>
          }
        />
      </div>
    </div>
  );
}

registerMinigameUi('mirror-maze', { Host, Player });
