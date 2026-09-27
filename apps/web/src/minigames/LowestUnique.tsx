import { seatMap } from '../game/HostFlow.tsx';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { Pick } from '../input/index.ts';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';

interface HostData {
  max: number;
  closesAt: number;
  submitted: string[];
  picks: Record<string, number> | null;
}

const STEP_MS = 350;

function Host({ conn, view, mg }: MgHostProps) {
  const d = mg.game as HostData;
  const seats = seatMap(view);
  const now = useServerNow(conn, 20);
  const nums = Array.from({ length: d.max }, (_, i) => i + 1);

  if (mg.stage === 'play' || !d.picks)
    return (
      <div className="mg-host">
        <p className="mg-host-lead">Pick a number from 1 to {d.max} on your phone. Lowest number nobody else picked wins.</p>
        <div className="lun-grid">
          {nums.map((n) => (
            <div key={n} className="lun-tile sticker">
              {n}
            </div>
          ))}
        </div>
        <div className="submitted-row">
          {mg.participants.map((id) => {
            const s = seats.get(id);
            return s ? <Avatar key={id} avatar={s.avatar} size={56} dim={!d.submitted.includes(id)} /> : null;
          })}
        </div>
      </div>
    );

  // Reveal: count upwards, uncovering who picked each number.
  const revealMs = 3000 + d.max * STEP_MS;
  const start = (mg.revealEndsAt ?? 0) - revealMs + 800;
  const shownUpTo = Math.floor((now - start) / STEP_MS);
  const byNumber = new Map<number, string[]>();
  for (const [id, n] of Object.entries(d.picks)) byNumber.set(n, [...(byNumber.get(n) ?? []), id]);
  const winner = nums.find((n) => byNumber.get(n)?.length === 1);
  const done = shownUpTo >= d.max;

  return (
    <div className="mg-host">
      <p className="mg-host-lead">{done ? (winner ? `${seats.get(byNumber.get(winner)![0]!)?.name} wins with ${winner}!` : 'Nobody was unique!') : 'Counting up…'}</p>
      <div className="lun-grid">
        {nums.map((n) => {
          const who = byNumber.get(n) ?? [];
          const shown = n <= shownUpTo;
          const state = !shown ? 'hidden' : who.length === 0 ? 'empty' : who.length === 1 ? (done && n === winner ? 'winner' : 'unique') : 'clash';
          return (
            <div key={n} className="lun-tile sticker" data-state={state}>
              <span>{n}</span>
              {shown && who.length > 0 && (
                <div className="lun-who">
                  {who.map((id) => {
                    const s = seats.get(id);
                    return s ? <Avatar key={id} avatar={s.avatar} size={who.length > 3 ? 34 : 46} /> : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as { max: number; closesAt: number; myPick: number | null };
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>{d.myPick ? `You picked ${d.myPick}` : 'Pick a number'}</h2>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Lowest number nobody else picks wins. You can change your mind until time runs out.
      </p>
      <Pick
        options={Array.from({ length: d.max }, (_, i) => ({ id: String(i + 1), label: String(i + 1) }))}
        selected={d.myPick ? String(d.myPick) : null}
        onPick={(id) => conn.intent({ type: 'pick', n: Number(id) })}
        columns={d.max > 12 ? 5 : 4}
      />
    </div>
  );
}

registerMinigameUi('lowest-unique', { Host, Player });
