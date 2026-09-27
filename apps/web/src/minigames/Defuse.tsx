import { useRef, useState } from 'react';
import { registerMinigameUi, type MgHostProps, type MgPlayerProps } from '../game/registry.ts';
import { seatMap } from '../game/HostFlow.tsx';
import { Countdown, useServerNow } from '../timing/clock.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import './minigames.css';
import './wave-e.css';

const WIRE_FILL: Record<string, string> = { red: '#e5484d', blue: '#3d7bff', yellow: '#ffd23f', white: '#ffffff', black: '#2b2233' };
const KEYPAD_COLUMNS = [
  ['Ω', '♣', '☀', '✿', '♜', '☯'],
  ['★', '☂', '◆', '⚓', '✈', 'Ω'],
  ['♞', '✿', '☂', '★', '♣', '⚓'],
];

interface BombView {
  wires: string[];
  cut: number[];
  wiresDone: boolean;
  buttonColour: 'red' | 'blue' | 'yellow';
  buttonLabel: string;
  buttonDone: boolean;
  keys: string[];
  pressed: string[];
  keypadDone: boolean;
  strikes: number;
  exploded: boolean;
}

function Host({ view, mg }: MgHostProps) {
  const d = mg.game as { operators: string[]; bombs: { modules: boolean[]; strikes: number; exploded: boolean }[] };
  const seats = seatMap(view);
  return (
    <div className="mg-host">
      <p className="mg-host-lead">Talk! The operator{d.operators.length > 1 ? 's see the bombs' : ' sees the bomb'}. Everyone else has part of the manual on their phone.</p>
      <div className="defuse-bombs">
        {d.bombs.map((b, i) => {
          const op = seats.get(d.operators[i]!);
          return (
            <div key={i} className="defuse-bomb sticker" data-exploded={b.exploded}>
              {op && <Avatar avatar={op.avatar} size={90} />}
              <b>Operator: {op?.name}</b>
              <div className="defuse-lights">
                {['Wires', 'Button', 'Keypad'].map((name, k) => (
                  <span key={name} className="chip" data-on={b.modules[k]}>
                    {name} {b.modules[k] ? '✓' : '…'}
                  </span>
                ))}
              </div>
              <span className="defuse-strikes">{'✗'.repeat(b.strikes) || 'No strikes'}</span>
              {b.exploded && <span className="door-boom">BOOM</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Operator({ conn, b, serial, closesAt }: { conn: MgPlayerProps['conn']; b: BombView; serial: number; closesAt: number }) {
  const now = useServerNow(conn, 5);
  const secondsLeft = Math.max(0, Math.ceil((closesAt - now) / 1000));
  const holdStart = useRef(0);
  const [holding, setHolding] = useState(false);
  return (
    <div className="defuse-op">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="chip">Serial {serial}</span>
        <span className="chip">Strikes {b.strikes}/3</span>
      </div>
      <section className="defuse-module sticker" data-done={b.wiresDone}>
        <h3>Wires {b.wiresDone && '✓'}</h3>
        <div className="defuse-wires">
          {b.wires.map((w, i) => (
            <button key={i} className="defuse-wire" disabled={b.wiresDone || b.cut.includes(i)} data-cut={b.cut.includes(i)} style={{ background: WIRE_FILL[w] }} onClick={() => conn.intent({ type: 'cut', wire: i })} aria-label={`Cut wire ${i + 1} (${w})`}>
              {b.cut.includes(i) ? '✂' : ''}
            </button>
          ))}
        </div>
      </section>
      <section className="defuse-module sticker" data-done={b.buttonDone}>
        <h3>Button {b.buttonDone && '✓'}</h3>
        <div className="row">
          <button
            className="defuse-button"
            data-holding={holding}
            disabled={b.buttonDone}
            style={{ background: WIRE_FILL[b.buttonColour] }}
            onPointerDown={() => {
              holdStart.current = performance.now();
              setHolding(true);
            }}
            onPointerUp={() => {
              setHolding(false);
              const held = performance.now() - holdStart.current > 800;
              conn.intent({ type: 'button', how: held ? 'hold' : 'tap', releaseDigit: secondsLeft % 10 });
            }}
          >
            {b.buttonLabel}
          </button>
          <span className="muted">Timer: {secondsLeft}s</span>
        </div>
      </section>
      <section className="defuse-module sticker" data-done={b.keypadDone}>
        <h3>Keypad {b.keypadDone && '✓'}</h3>
        <div className="defuse-keys">
          {b.keys.map((k) => (
            <button key={k} className="defuse-key" disabled={b.keypadDone} data-pressed={b.pressed.includes(k)} onClick={() => conn.intent({ type: 'key', key: k })}>
              {k}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Manual({ pages }: { pages: string[] }) {
  return (
    <div className="defuse-manual">
      {pages.includes('wires') && (
        <section className="sticker defuse-page">
          <h3>Wires</h3>
          <p><b>3 wires:</b> no red → cut the 2nd. Last wire white → cut the last. More than one blue → cut the last blue. Otherwise cut the last.</p>
          <p><b>4 wires:</b> more than one red and the serial is odd → cut the last red. Last wire yellow and no red → cut the 1st. Exactly one blue → cut the 1st. Otherwise cut the 2nd.</p>
          <p><b>5 wires:</b> last wire black and the serial is odd → cut the 4th. One red and more than one yellow → cut the 1st. No black → cut the 2nd. Otherwise cut the 1st.</p>
        </section>
      )}
      {pages.includes('button') && (
        <section className="sticker defuse-page">
          <h3>Button</h3>
          <p>Blue button saying ABORT → <b>hold</b>. Any button saying PRESS → <b>tap</b>. Red button saying HOLD → <b>tap</b>. Anything else → <b>hold</b>.</p>
          <p>When holding: let go when the timer’s last digit is <b>4</b> for a blue button, or <b>1</b> for any other colour.</p>
        </section>
      )}
      {pages.includes('keypad') && (
        <section className="sticker defuse-page">
          <h3>Keypad</h3>
          <p>Find the column that has all four symbols. Press them in the order they appear, top to bottom.</p>
          <div className="defuse-columns">
            {KEYPAD_COLUMNS.map((c, i) => (
              <ol key={i}>
                {c.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Player({ conn, mg }: MgPlayerProps) {
  const d = mg.game as { role: 'operator' | 'reader'; closesAt: number; serial: number; bomb: BombView | null; pages: string[]; bombIndex: number; bombsN: number };
  return (
    <div className="mg-player">
      <div className="mg-player-head">
        <h2>{d.role === 'operator' ? 'You have the bomb!' : `Manual${d.bombsN > 1 ? ` (bomb ${d.bombIndex + 1})` : ''}`}</h2>
        <Countdown conn={conn} until={d.closesAt} />
      </div>
      {d.role === 'operator' && d.bomb ? <Operator conn={conn} b={d.bomb} serial={d.serial} closesAt={d.closesAt} /> : <Manual pages={d.pages} />}
    </div>
  );
}

registerMinigameUi('defuse-circuit', { Host, Player });
