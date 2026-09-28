import type { InputSpec, Stroke } from '@partygame/shared';
import { useState, type ReactNode } from 'react';
import {
  Aim,
  Buttons,
  ControlsCard,
  Direction,
  Draw,
  GameLayout,
  Grid,
  KeyHint,
  Mash,
  OrientationHint,
  Pick,
  Rank,
  Rotate,
  Sequence,
  ArrowIcon,
  TextAnswer,
  Vote,
  useDevice,
  type AimValues,
} from '../input/index.ts';
import { navigate } from '../router.ts';
import { Icon } from '../ui/Icons.tsx';
import './lab.css';

type Log = (entry: string) => void;

interface LabItem {
  id: string;
  name: string;
  inputs: InputSpec[];
  render: (log: Log) => ReactNode;
}

function PickDemo({ log }: { log: Log }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <Pick
      options={Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1), label: String(i + 1), sub: i === 0 ? 'lowest' : undefined }))}
      selected={sel}
      onPick={(id) => {
        setSel(id);
        log(`pick{${id}}`);
      }}
    />
  );
}

function DirectionDemo({ log, mode }: { log: Log; mode: '4' | '8' | 'analog' }) {
  const [v, setV] = useState({ x: 0, y: 0 });
  return (
    <GameLayout
      stage={
        <div className="lab-arena">
          <div className="lab-dot" style={{ transform: `translate(${v.x * 70}px, ${v.y * 70}px)` }} />
        </div>
      }
      dockLeft={
        <Direction
          mode={mode}
          onChange={(nv) => {
            setV(nv);
            log(`dir{${nv.x},${nv.y}}`);
          }}
        />
      }
      dockRight={<Buttons buttons={[{ id: 'jump', label: 'Jump', key: 'Space', colour: 'blue' }]} onChange={(id, down) => log(`btn{${id},${down}}`)} />}
      legend={
        <>
          <KeyHint k="WASD">move</KeyHint>
          <KeyHint k="Space">jump</KeyHint>
        </>
      }
    />
  );
}

function AimDemo({ log }: { log: Log }) {
  const [v, setV] = useState<AimValues>({ angle: 45, power: 60 });
  return (
    <div className="stack">
      <svg viewBox="0 0 200 110" className="lab-aim">
        <line x1="20" y1="100" x2={20 + Math.cos((v.angle! * Math.PI) / 180) * v.power! * 1.4} y2={100 - Math.sin((v.angle! * Math.PI) / 180) * v.power! * 1.4} stroke="#2B2233" strokeWidth="6" strokeLinecap="round" />
        <circle cx="20" cy="100" r="10" fill="#3D7BFF" stroke="#2B2233" strokeWidth="3" />
      </svg>
      <Aim
        params={[
          { id: 'angle', label: 'Angle', min: 5, max: 85, step: 5, unit: '°' },
          { id: 'power', label: 'Power', min: 10, max: 100, step: 5, unit: '%' },
        ]}
        values={v}
        onChange={(nv) => {
          setV(nv);
          log(`aim{${nv.angle},${nv.power}}`);
        }}
      />
    </div>
  );
}

function GridDemo({ log }: { log: Log }) {
  const [owned, setOwned] = useState<Set<string>>(new Set(['7,7', '8,7', '7,8']));
  const [rot, setRot] = useState(0);
  const shapes: [number, number][][] = [
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [0, 1], [-1, 0]],
    [[0, 0], [-1, 0], [0, -1]],
    [[0, 0], [0, -1], [1, 0]],
  ];
  return (
    <Grid
      w={16}
      h={16}
      focus={{ x: 4, y: 4, w: 8, h: 8 }}
      shape={shapes[rot]}
      onRotate={() => {
        setRot((r) => (r + 1) % 4);
        log('rotate');
      }}
      cell={(x, y) => ({ fill: owned.has(`${x},${y}`) ? '#FF7A1A' : '#FFFFFF' })}
      onCell={(x, y) => {
        setOwned((o) => new Set([...o, ...shapes[rot]!.map(([dx, dy]) => `${x + dx},${y + dy}`)]));
        log(`cell{${x},${y},rot ${rot}}`);
      }}
    />
  );
}

function SequenceDemo({ log }: { log: Log }) {
  const [v, setV] = useState<string[]>([]);
  return (
    <Sequence
      steps={5}
      value={v}
      onChange={(nv) => {
        setV(nv);
        log(`program[${nv.join(',')}]`);
      }}
      chips={[
        { id: 'U', label: '↑', vkey: 'up' },
        { id: 'D', label: '↓', vkey: 'down' },
        { id: 'L', label: '←', vkey: 'left' },
        { id: 'R', label: '→', vkey: 'right' },
        { id: 'W', label: 'Wait', vkey: 'confirm' },
      ]}
    />
  );
}

function DrawDemo({ log }: { log: Log }) {
  const [s, setS] = useState<Stroke[]>([]);
  const bytes = JSON.stringify(s).length;
  return (
    <div className="stack" style={{ height: '100%' }}>
      <Draw
        strokes={s}
        onChange={(ns) => {
          setS(ns);
          log(`strokes[${ns.length}] ${JSON.stringify(ns).length} bytes`);
        }}
      />
      <span className="muted">{bytes} bytes</span>
    </div>
  );
}

function RotateDemo({ log }: { log: Log }) {
  const [a, setA] = useState(0);
  return (
    <div className="center">
      <Rotate
        angle={a}
        onChange={(na) => {
          setA(na);
          log(`angle{${na.toFixed(2)}}`);
        }}
      />
    </div>
  );
}

function VoteRankDemo({ log }: { log: Log }) {
  const [vote, setVote] = useState<string | null>(null);
  const items = ['Pizza', 'Tacos', 'Sushi', 'Curry'].map((x) => ({ id: x, label: x }));
  const [order, setOrder] = useState(items.map((i) => i.id));
  return (
    <div className="stack">
      <Vote
        items={items}
        selected={vote}
        onVote={(id) => {
          setVote(id);
          log(`vote{${id}}`);
        }}
      />
      <Rank
        items={items}
        order={order}
        onChange={(o) => {
          setOrder(o);
          log(`rank[${o.join(',')}]`);
        }}
      />
    </div>
  );
}

const ITEMS: LabItem[] = [
  { id: 'pick', name: 'Pick', inputs: [{ kind: 'pick' }], render: (log) => <PickDemo log={log} /> },
  { id: 'dpad', name: 'D-pad', inputs: [{ kind: 'direction', mode: '4' }, { kind: 'buttons', buttons: [{ id: 'jump', label: 'Jump', key: 'Space' }] }], render: (log) => <DirectionDemo log={log} mode="4" /> },
  { id: 'stick', name: 'Joystick', inputs: [{ kind: 'direction', mode: 'analog' }], render: (log) => <DirectionDemo log={log} mode="analog" /> },
  { id: 'mash', name: 'Mash', inputs: [{ kind: 'mash' }], render: (log) => <Mash onMash={(n) => log(`mash{${n}}`)} /> },
  { id: 'aim', name: 'Aim', inputs: [{ kind: 'aim' }], render: (log) => <AimDemo log={log} /> },
  { id: 'grid', name: 'Grid', inputs: [{ kind: 'grid', rotate: true }], render: (log) => <GridDemo log={log} /> },
  { id: 'seq', name: 'Sequence', inputs: [{ kind: 'sequence', steps: 5 }], render: (log) => <SequenceDemo log={log} /> },
  { id: 'text', name: 'Text', inputs: [{ kind: 'text' }], render: (log) => <TextAnswer onSubmit={(t) => log(`text{${t}}`)} autoFocus={false} /> },
  { id: 'draw', name: 'Draw', inputs: [{ kind: 'draw' }], render: (log) => <DrawDemo log={log} /> },
  { id: 'rotate', name: 'Rotate', inputs: [{ kind: 'rotate' }], render: (log) => <RotateDemo log={log} /> },
  { id: 'vote', name: 'Vote + Rank', inputs: [{ kind: 'vote' }, { kind: 'rank' }], render: (log) => <VoteRankDemo log={log} /> },
];

/** /dev/input-lab: every input primitive on this device, with a live intent log. */
/** Back to wherever the lab was opened from (e.g. a lobby's "Test your device"), or home. */
function goBack() {
  const fromHere = document.referrer && new URL(document.referrer).origin === location.origin;
  if (fromHere && history.length > 1) history.back();
  else navigate('/');
}

export default function InputLab() {
  const device = useDevice();
  const [active, setActive] = useState(() => (location.hash.slice(1) && ITEMS.some((i) => i.id === location.hash.slice(1)) ? location.hash.slice(1) : 'pick'));
  const [log, setLog] = useState<string[]>([]);
  const item = ITEMS.find((i) => i.id === active)!;
  const push: Log = (e) => setLog((l) => [`${new Date().toLocaleTimeString()} ${e}`, ...l].slice(0, 40));

  return (
    <div className="lab">
      <header className="lab-head">
        <button type="button" className="btn white small" onClick={goBack}>
          <ArrowIcon dir="left" size={20} /> Back
        </button>
        <h1>Input Lab</h1>
        <span className="chip">
          {device.kind} · {device.size} · last: {device.last}
          {device.gamepad ? (
            <>
              {' · '}
              <Icon name="gamepad" size={20} label="Gamepad" />
            </>
          ) : null}
        </span>
      </header>
      <nav className="lab-tabs">
        {ITEMS.map((i) => (
          <button
            key={i.id}
            className="btn small white"
            aria-pressed={i.id === active}
            onClick={() => {
              setActive(i.id);
              history.replaceState(null, '', `#${i.id}`);
            }}
          >
            {i.name}
          </button>
        ))}
      </nav>
      <section className="lab-body">
        <div className="lab-demo panel">
          <OrientationHint want={active === 'dpad' || active === 'stick' ? 'landscape' : 'portrait'}>
            <div className="lab-demo-inner" key={active}>
              {item.render(push)}
            </div>
          </OrientationHint>
        </div>
        <aside className="lab-side">
          <div className="panel">
            <h3>Your controls</h3>
            <ControlsCard inputs={item.inputs} compact />
          </div>
          <div className="panel lab-log">
            <h3>Intents sent</h3>
            <ol>
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          </div>
        </aside>
      </section>
    </div>
  );
}
