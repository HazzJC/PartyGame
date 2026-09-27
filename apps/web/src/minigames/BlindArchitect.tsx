import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { seatMap } from '../game/HostFlow.tsx';
import { Grid, TextAnswer } from '../input/index.ts';
import { Countdown } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { TEAM_COLOURS, TEAM_NAMES } from './TugOfWar.tsx';
import './minigames.css';
import './wave-d.css';

const HEIGHT_FILL = ['#f4e9d3', '#ffd6a5', '#ff9f80', '#9b5de5'];

function Heights({ size, cells, small }: { size: number; cells: number[]; small?: boolean }) {
  return (
    <svg className={`arch-svg ${small ? 'small' : ''}`} viewBox={`0 0 ${size} ${size}`}>
      {cells.map((h, c) => (
        <g key={c}>
          <rect x={(c % size) + 0.05} y={Math.floor(c / size) + 0.05} width={0.9} height={0.9} rx={0.12} fill={HEIGHT_FILL[h]} stroke="#2B2233" strokeWidth={0.05} />
          {h > 0 && (
            <text x={(c % size) + 0.5} y={Math.floor(c / size) + 0.68} textAnchor="middle" fontSize={0.5} fontFamily="Fredoka, sans-serif" fontWeight={700} fill={h === 3 ? '#fff' : '#2B2233'}>
              {h}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as { size: number; architects: string[]; target: number[] | null; builds: number[][] | null; scores: number[] | null; chatCounts: number[] };
  const seats = seatMap(view);
  const teams = mg.teams ?? [];
  if (!d.target)
    return (
      <div className="mg-host">
        <p className="mg-host-lead">Each team’s architect can see the plan. Everyone else builds from their messages!</p>
        <div className="arch-teams">
          {teams.map((_, t) => {
            const a = seats.get(d.architects[t] ?? '');
            return (
              <div key={t} className="arch-team sticker" style={{ ['--team' as string]: TEAM_COLOURS[t] }}>
                <h3>{TEAM_NAMES[t]}</h3>
                {a && <Avatar avatar={a.avatar} size={90} />}
                <span>Architect: {a?.name}</span>
                <span className="chip">{d.chatCounts[t] ?? 0} messages</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  return (
    <div className="mg-host arch-results">
      <div className="arch-team sticker">
        <h3>The plan</h3>
        <Heights size={d.size} cells={d.target} small={teams.length > 2} />
      </div>
      {d.builds!.map((b, t) => (
        <div key={t} className="arch-team sticker" style={{ ['--team' as string]: TEAM_COLOURS[t] }}>
          <h3>
            {TEAM_NAMES[t]}: {d.scores?.[t] ?? 0}/{d.size * d.size}
          </h3>
          <Heights size={d.size} cells={b} small={teams.length > 2} />
        </div>
      ))}
    </div>
  );
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as { size: number; maxHeight: number; closesAt: number; team: number; architect: boolean; target: number[] | null; build: number[]; chat: { text: string }[]; chatsLeft: number };
  const colour = TEAM_COLOURS[d.team] ?? '#3D7BFF';
  const log = (
    <ul className="arch-chat">
      {d.chat.length === 0 && <li className="muted">{d.architect ? 'Describe the plan: e.g. “Row 2, col 3: 3 high”' : 'Waiting for your architect’s messages…'}</li>}
      {d.chat.map((m, i) => (
        <li key={i}>{m.text}</li>
      ))}
    </ul>
  );
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2 style={{ color: colour }}>{d.architect ? 'You are the architect' : `${TEAM_NAMES[d.team]} builder`}</h2>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      {d.architect ? (
        <>
          <div className="arch-pair">
            <div>
              <span className="muted">The plan</span>
              <Heights size={d.size} cells={d.target!} small />
            </div>
            <div>
              <span className="muted">Your team’s build</span>
              <Heights size={d.size} cells={d.build} small />
            </div>
          </div>
          {log}
          <TextAnswer placeholder={`Message (${d.chatsLeft} left)`} autoFocus={false} locked={d.chatsLeft <= 0} onSubmit={(text) => conn.intent({ type: 'chat', text })} />
        </>
      ) : (
        <>
          {log}
          <p className="muted" style={{ margin: 0 }}>
            Tap a square to raise it (0 → 3, then back to 0).
          </p>
          <div className="heist-grid">
            <Grid
              w={d.size}
              h={d.size}
              cell={(x, y) => {
                const h = d.build[y * d.size + x] ?? 0;
                return { fill: HEIGHT_FILL[h]!, glyph: h ? String(h) : undefined, glyphColour: h === 3 ? '#fff' : undefined };
              }}
              onCell={(x, y) => {
                const c = y * d.size + x;
                conn.intent({ type: 'build', cell: c, height: ((d.build[c] ?? 0) + 1) % (d.maxHeight + 1) });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

registerMinigameUi('blind-architect', { Host, Player });
