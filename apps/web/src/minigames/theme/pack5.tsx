import { between, Bubble, DemoAvatar, DemoFrame, DemoPhone, fade, Finger, key, useDemoTime } from './demo.tsx';
import { circ, Cloud, Cut, INK, Ink, PAPER, rr, Sparkle } from './paper.tsx';
import { registerDemo, registerScene } from './themes.tsx';
import './skins5.css';

/**
 * Pack 5, the co-op games: the Sticker Diner (Recipe Assembly), Junction Yard (Runaway
 * Switchboard), the Boiler Room (Pressure Valve), the Quiet Summit (The Mind), the Sewing Circle
 * (Collaborative Quilt), the Bomb Bunker (Defuse the Circuit) and Orbit Station (Meteor Shield).
 */

const FONT = 'Fredoka, sans-serif';

// ================================================================== scenes

/** Recipe Assembly: a checker-floored diner with a neon sign. */
registerScene('diner', () => (
  <>
    <rect width={1460} height={960} fill="#FBE3D0" />
    <rect y={0} width={1460} height={300} fill="#E74C3C" />
    <rect y={300} width={1460} height={20} fill={PAPER} stroke={INK} strokeWidth={4} />
    {/* The neon sign. */}
    <g transform="translate(1210 130)">
      <Cut d={rr(-130, -70, 260, 140, 30)} fill="#3B3346" />
      <text className="anim-blink" style={{ animationDuration: '2.4s' }} y={24} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={70} fill="#FFE98A" stroke="#FF7A1A" strokeWidth={3}>
        EAT
      </text>
    </g>
    {/* A pie under a glass dome. */}
    <g transform="translate(170 560)">
      <Cut d="M-100 0 Q-100 -150 0 -150 Q100 -150 100 0 Z" fill="#E8F6FA" rim={0} opacity={0.9} />
      <Cut d="M-80 0 Q-70 -50 0 -54 Q70 -50 80 0 Z" fill="#E0A458" rim={0} />
      <Ink d="M-50 -30 L-20 -48 M0 -30 L30 -48 M40 -24 L60 -40" w={3} />
      <Cut d={rr(-120, 0, 240, 20, 8)} fill="#C9CED8" rim={0} edge={4} />
    </g>
    {/* The counter and its stools. */}
    <Cut d="M0 600 H1460 V700 H0 Z" fill="#48CAE4" rim={0} />
    <rect y={600} width={1460} height={20} fill="#C9CED8" stroke={INK} strokeWidth={4} />
    {[260, 560, 860, 1160].map((x) => (
      <g key={x}>
        <Ink d={`M${x} 760 V860`} w={12} stroke="#8C8A96" />
        <Cut d={rr(x - 60, 730, 120, 34, 16)} fill="#E74C3C" rim={0} />
      </g>
    ))}
    {/* The checker floor. */}
    <rect y={860} width={1460} height={100} fill={PAPER} stroke={INK} strokeWidth={4} />
    {Array.from({ length: 30 }, (_, i) => (
      <rect key={i} x={(i % 15) * 100 + (Math.floor(i / 15) % 2) * 50} y={862 + Math.floor(i / 15) * 50} width={50} height={50} fill={INK} opacity={0.85} />
    ))}
    {/* Steam from the kitchen. */}
    <g className="anim-bob" style={{ animationDuration: '2s' }}>
      <Ink d="M700 420 q-20 -30 0 -60 q20 -30 0 -60 M760 430 q-20 -30 0 -60 q20 -30 0 -60" w={8} stroke={PAPER} opacity={0.7} />
    </g>
  </>
));

/** Runaway Switchboard: the rail yard, with signals and a little engine. */
registerScene('railyard', () => (
  <>
    <rect width={1460} height={960} fill="#CFE8F2" />
    <g className="anim-drift">
      <Cloud x={380} y={120} />
      <Cloud x={1000} y={90} s={0.8} />
    </g>
    <Cut d="M0 520 Q730 470 1460 520 V960 H0 Z" fill="#9CCB6E" rim={0} />
    <Cut d="M0 640 H1460 V960 H0 Z" fill="#C8AE84" rim={0} />
    {/* Tracks and sleepers. */}
    {[700, 840].map((y) => (
      <g key={y}>
        {Array.from({ length: 30 }, (_, i) => (
          <rect key={i} x={i * 50} y={y - 16} width={20} height={52} fill="#8A5A3C" stroke={INK} strokeWidth={3} />
        ))}
        <Ink d={`M0 ${y} H1460 M0 ${y + 20} H1460`} w={7} stroke="#8C8A96" />
      </g>
    ))}
    {/* Signals. */}
    {[140, 1320].map((x, i) => (
      <g key={x}>
        <Ink d={`M${x} 690 V420`} w={10} />
        <Cut d={rr(x - 34, 320, 68, 130, 14)} fill="#3B3346" rim={0} />
        <circle className="anim-blink" style={{ animationDuration: '1.8s', animationDelay: `${-i * 0.9}s` }} cx={x} cy={356} r={18} fill="#E5484D" stroke={INK} strokeWidth={3} />
        <circle cx={x} cy={412} r={18} fill="#2EC27E" stroke={INK} strokeWidth={3} />
      </g>
    ))}
    {/* A little engine puffing along. */}
    <g className="anim-drift" style={{ animationDuration: '10s' }}>
      <g transform="translate(560 830)">
        <Cut d={rr(-120, -110, 150, 100, 12)} fill="#C0392B" />
        <Cut d={rr(30, -80, 110, 70, 12)} fill="#C0392B" />
        <Cut d={rr(-110, -150, 80, 50, 8)} fill="#3B3346" rim={0} />
        <Cut d={rr(96, -120, 26, 44, 6)} fill="#3B3346" rim={0} />
        {[-80, -10, 80].map((wx) => (
          <Cut key={wx} d={circ(wx, -6, 24)} fill="#3B3346" rim={0} />
        ))}
        <g className="anim-bob" style={{ animationDuration: '0.8s' }}>
          <Cut d={circ(110, -150, 22)} fill={PAPER} rim={0} edge={3} />
          <Cut d={circ(140, -186, 16)} fill={PAPER} rim={0} edge={3} />
        </g>
      </g>
    </g>
  </>
));

/** Pressure Valve: the boiler room, all pipes, gauges and steam. */
function Gauge({ x, y, r, a }: { x: number; y: number; r: number; a: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Cut d={circ(0, 0, r)} fill="#FFF6E5" rim={0} />
      <circle r={r - 8} fill="none" stroke="#B87333" strokeWidth={6} />
      <g className="anim-sway" style={{ animationDuration: '1.6s', transformOrigin: '0px 0px' }}>
        <Ink d={`M0 0 L${Math.cos(a) * (r - 18)} ${Math.sin(a) * (r - 18)}`} w={6} stroke="#C81E3A" />
      </g>
      <circle r={7} fill={INK} />
    </g>
  );
}
registerScene('boiler', () => (
  <>
    <rect width={1460} height={960} fill="#5A3E2B" />
    {Array.from({ length: 12 }, (_, i) => (
      <rect key={i} x={0} y={i * 80} width={1460} height={4} fill="#4E3524" />
    ))}
    {/* Pipes. */}
    <Ink d="M0 180 H420 Q460 180 460 220 V960 M1460 240 H1060 Q1020 240 1020 280 V960 M0 420 H200 M1460 520 H1260" w={46} />
    <Ink d="M0 180 H420 Q460 180 460 220 V960 M1460 240 H1060 Q1020 240 1020 280 V960 M0 420 H200 M1460 520 H1260" w={34} stroke="#B87333" />
    {[180, 460, 700].map((y) => (
      <rect key={y} x={444} y={y} width={32} height={20} fill="#8A5A2B" stroke={INK} strokeWidth={3} />
    ))}
    <Gauge x={200} y={300} r={70} a={-0.8} />
    <Gauge x={1260} y={400} r={60} a={-2.2} />
    {/* The furnace glow. */}
    <g transform="translate(730 960)">
      <Cut d="M-220 0 V-180 Q-220 -240 -160 -240 H160 Q220 -240 220 -180 V0 Z" fill="#3B3346" />
      <Cut d="M-140 0 V-120 Q-140 -170 0 -170 Q140 -170 140 -120 V0 Z" fill="#FF7A1A" rim={0} />
      <g className="anim-bob" style={{ animationDuration: '0.6s' }}>
        <path d="M-80 0 Q-60 -90 -20 -60 Q0 -130 30 -70 Q70 -110 80 0 Z" fill="#FFD23F" stroke={INK} strokeWidth={4} />
      </g>
    </g>
    {/* Steam puffs. */}
    {[
      [460, 120],
      [1020, 200],
    ].map(([x, y], i) => (
      <g key={i} className="anim-bob" style={{ animationDuration: '1.8s', animationDelay: `${-i * 0.7}s` }}>
        <Cloud x={x!} y={y! - 40} s={0.8} fill="#F4F1FB" />
      </g>
    ))}
  </>
));

/** The Mind: a quiet summit above the clouds. */
registerScene('zen', () => (
  <>
    <rect width={1460} height={960} fill="#E6E4F5" />
    <rect width={1460} height={260} fill="#D5D2EE" />
    <Cut d={circ(1150, 220, 110)} fill="#FF9F80" rim={0} />
    {/* Mountains. */}
    <Cut d="M-40 760 L260 330 L420 520 L560 380 L820 760 Z" fill="#8F95C9" rim={0} />
    <Ink d="M260 330 L228 376 L246 368 L262 382 L278 368 L295 372 Z" w={3} fill={PAPER} />
    <Cut d="M700 760 L1000 420 L1200 600 L1320 470 L1520 760 Z" fill="#7A80B8" rim={0} />
    {/* Mist. */}
    <g className="anim-drift" style={{ animationDuration: '20s' }}>
      <Cloud x={300} y={640} s={1.8} fill="#F4F2FC" />
      <Cloud x={1100} y={680} s={1.6} fill="#F4F2FC" />
    </g>
    {/* A pagoda roof and a blossom branch. */}
    <g transform="translate(1300 960)">
      <Cut d="M-120 0 V-120 H120 V0 Z" fill="#C0392B" />
      <Cut d="M-170 -120 Q0 -190 170 -120 Q100 -140 0 -150 Q-100 -140 -170 -120 Z" fill="#3B3346" />
      <Cut d="M-90 -170 V-230 H90 V-170 Z" fill="#C0392B" />
      <Cut d="M-130 -230 Q0 -290 130 -230 Q70 -250 0 -256 Q-70 -250 -130 -230 Z" fill="#3B3346" />
    </g>
    <Ink d="M0 120 Q160 150 260 110 Q340 80 420 120" w={12} stroke="#5A3E2B" />
    {[
      [120, 130],
      [210, 124],
      [300, 100],
      [380, 110],
    ].map(([x, y], i) => (
      <g key={i}>
        <Cut d={circ(x!, y!, 18)} fill="#FFB6C9" rim={0} edge={3} />
        <circle cx={x} cy={y} r={5} fill="#FF7A9C" />
      </g>
    ))}
    {/* Petals drifting down. */}
    {Array.from({ length: 6 }, (_, i) => (
      <g key={i} className="anim-bob" style={{ animationDuration: `${2.6 + i * 0.3}s`, animationDelay: `${-i * 0.5}s` }}>
        <ellipse cx={180 + i * 90} cy={220 + (i % 3) * 90} rx={9} ry={5} fill="#FFB6C9" stroke={INK} strokeWidth={2} transform={`rotate(${i * 40} ${180 + i * 90} ${220 + (i % 3) * 90})`} />
      </g>
    ))}
  </>
));

/** Collaborative Quilt: a sewing table with spools, pins and a tape measure. */
function Spool({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Cut d={rr(-40, -70, 80, 16, 4)} fill="#C9A06C" rim={0} edge={4} />
      <Cut d={rr(-32, -56, 64, 56, 6)} fill={fill} rim={0} edge={4} />
      <Ink d="M-32 -42 H32 M-32 -28 H32 M-32 -14 H32" w={2.5} opacity={0.35} />
      <Cut d={rr(-40, 0, 80, 16, 4)} fill="#C9A06C" rim={0} edge={4} />
    </g>
  );
}
registerScene('sewing', () => (
  <>
    <rect width={1460} height={960} fill="#F7D9C4" />
    {/* Gingham tablecloth. */}
    {Array.from({ length: 16 }, (_, i) => (
      <rect key={`v${i}`} x={i * 96} y={0} width={48} height={960} fill="#F1C3A6" />
    ))}
    {Array.from({ length: 10 }, (_, i) => (
      <rect key={`h${i}`} x={0} y={i * 96} width={1460} height={48} fill="#E17055" opacity={0.18} />
    ))}
    <Spool x={140} y={300} fill="#3D7BFF" />
    <Spool x={250} y={330} fill="#FFD23F" />
    <Spool x={1300} y={320} fill="#2EC27E" />
    {/* A pin cushion. */}
    <g transform="translate(1250 700)">
      <Cut d="M-90 0 Q-100 -90 0 -96 Q100 -90 90 0 Z" fill="#E5484D" rim={0} />
      {[
        [-40, -70, '#FFD23F'],
        [10, -90, '#3D7BFF'],
        [50, -60, '#9B5DE5'],
      ].map(([px, py, c], i) => (
        <g key={i}>
          <Ink d={`M${px} ${py} L${(px as number) + 10} ${(py as number) - 50}`} w={4} stroke="#8C8A96" />
          <Cut d={circ((px as number) + 10, (py as number) - 54, 10)} fill={c as string} rim={0} edge={3} />
        </g>
      ))}
      <Cut d={rr(-100, 0, 200, 24, 8)} fill="#C9A06C" rim={0} edge={4} />
    </g>
    {/* A tape measure curling across the corner. */}
    <path d="M0 860 Q300 800 520 900 Q640 960 760 930" fill="none" stroke={INK} strokeWidth={38} strokeLinecap="round" />
    <path d="M0 860 Q300 800 520 900 Q640 960 760 930" fill="none" stroke="#FFD23F" strokeWidth={28} strokeLinecap="round" />
    <path d="M0 860 Q300 800 520 900 Q640 960 760 930" fill="none" stroke={INK} strokeWidth={14} strokeDasharray="3 22" />
    {/* Scissors. */}
    <g transform="translate(160 720) rotate(-20)">
      <Ink d="M0 0 L140 -30 M0 0 L140 30" w={10} stroke="#8C8A96" />
      <Cut d={circ(-26, -20, 22)} fill="none" rim={0} edge={8} />
      <Cut d={circ(-26, 20, 22)} fill="none" rim={0} edge={8} />
    </g>
  </>
));

/** Defuse the Circuit: a concrete bunker with hazard stripes and a blinking alarm. */
registerScene('bunker', () => (
  <>
    <rect width={1460} height={960} fill="#5E6670" />
    {Array.from({ length: 6 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => <rect key={`${r}${c}`} x={c * 190 + (r % 2) * 95 - 95} y={r * 120} width={186} height={116} fill="#66707B" stroke="#555D66" strokeWidth={4} />),
    )}
    {/* The alarm light. */}
    <g transform="translate(730 40)">
      <Cut d={rr(-50, -20, 100, 40, 8)} fill="#3B3346" rim={0} />
      <circle className="anim-blink" style={{ animationDuration: '0.9s' }} cy={30} r={34} fill="#E5484D" stroke={INK} strokeWidth={5} />
    </g>
    {/* Hazard stripes along the floor. */}
    <rect y={860} width={1460} height={100} fill="#FFD23F" stroke={INK} strokeWidth={5} />
    {Array.from({ length: 22 }, (_, i) => (
      <path key={i} d={`M${i * 70 - 40} 960 L${i * 70} 862 H${i * 70 + 34} L${i * 70 - 6} 960 Z`} fill={INK} />
    ))}
    {/* Crates. */}
    {[
      [60, 700, 180],
      [220, 740, 130],
      [1240, 690, 190],
    ].map(([x, y, s], i) => (
      <g key={i}>
        <Cut d={rr(x!, y!, s!, 860 - y!, 6)} fill="#8A6A3C" rim={0} />
        <Ink d={`M${x} ${y} L${x! + s!} 860 M${x! + s!} ${y} L${x} 860`} w={5} opacity={0.5} />
      </g>
    ))}
    {/* Wires along the wall. */}
    <path d="M0 240 Q200 300 400 240 T800 250 T1460 230" fill="none" stroke="#E5484D" strokeWidth={8} />
    <path d="M0 270 Q260 320 520 270 T1040 280 T1460 260" fill="none" stroke="#3D7BFF" strokeWidth={8} />
    <path d="M0 300 Q220 350 440 300 T900 310 T1460 290" fill="none" stroke="#FFD23F" strokeWidth={8} />
  </>
));

/** Meteor Shield: orbit station among the stars. */
registerScene('space', () => (
  <>
    <rect width={1460} height={960} fill="#141A3A" />
    {Array.from({ length: 50 }, (_, i) => (
      <Sparkle key={i} className={i % 3 ? undefined : 'anim-twinkle'} x={(i * 293) % 1450 + 5} y={(i * 157) % 950 + 5} k={i % 4 === 0 ? 8 : 4} fill="#FFF6CC" />
    ))}
    {/* A ringed planet. */}
    <g transform="translate(1260 200)">
      <ellipse rx={150} ry={34} fill="none" stroke={INK} strokeWidth={22} transform="rotate(-16)" />
      <Cut d={circ(0, 0, 90)} fill="#9B5DE5" rim={0} />
      <ellipse rx={150} ry={34} fill="none" stroke="#FFD23F" strokeWidth={12} transform="rotate(-16)" strokeDasharray="240 170" strokeDashoffset={-40} />
    </g>
    {/* A moon. */}
    <Cut d={circ(170, 780, 110)} fill="#C9CED8" rim={0} />
    {[
      [140, 750, 22],
      [210, 820, 14],
      [190, 720, 10],
    ].map(([x, y, r], i) => (
      <circle key={i} cx={x} cy={y} r={r} fill="#A9AFBC" stroke={INK} strokeWidth={3} />
    ))}
    {/* A satellite drifting by. */}
    <g className="anim-drift" style={{ animationDuration: '16s' }}>
      <g transform="translate(260 200) rotate(-20)">
        <Cut d={rr(-80, -20, 60, 40, 4)} fill="#3D7BFF" rim={0} edge={4} />
        <Cut d={rr(20, -20, 60, 40, 4)} fill="#3D7BFF" rim={0} edge={4} />
        <Cut d={rr(-20, -30, 40, 60, 8)} fill="#E8E0CF" rim={0} edge={4} />
        <Ink d="M-80 0 H-20 M20 0 H80" w={2.5} opacity={0.5} />
      </g>
    </g>
  </>
));

// ================================================================== demos

/** Recipe Assembly: claim the next slot, then add the right ingredient. */
registerDemo('recipe-assembly', () => {
  const t = useDemoTime(7.5, 4.8);
  const layers = [
    { name: 'Bun', c: '#E0A458', at: 0.8 },
    { name: 'Patty', c: '#7A4A2B', at: 1.8 },
    { name: 'Cheese', c: '#FFD23F', at: 2.8 },
    { name: 'Bun', c: '#E0A458', at: 5.2 },
  ];
  const oops = between(t, 3.8, 5);
  return (
    <DemoFrame caption="Build the order in turn. Claim the next slot, then add the right thing" bg="#FDEBDD">
      <g transform="translate(20 20)">
        <Cut d={rr(0, 0, 160, 240, 10)} fill="#FFF6E5" rim={0} />
        <rect x={0} y={0} width={160} height={30} rx={10} fill="#E74C3C" stroke={INK} strokeWidth={4} />
        <text x={80} y={22} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={18} fill={PAPER}>
          Order #1
        </text>
        {layers.map((l, i) => (
          <text key={i} x={20} y={220 - i * 44} fontFamily={FONT} fontWeight={700} fontSize={22} fill={INK} textDecoration={t > l.at + 0.2 ? 'line-through' : undefined}>
            {i + 1}. {l.name}
          </text>
        ))}
      </g>
      {/* The burger stacks up on the plate. */}
      <Cut d={rr(270, 300, 220, 20, 10)} fill={PAPER} rim={0} />
      {layers.map((l, i) =>
        t > l.at ? (
          <g key={i} transform={`translate(380 ${300 - i * 34 - 18 - key([[l.at, 60], [l.at + 0.3, 0]], t)})`}>
            <Cut d={i === 0 ? rr(-80, -4, 160, 22, 8) : i === 3 ? 'M-80 16 Q-80 -34 0 -36 Q80 -34 80 16 Z' : rr(-86, -6, 172, 24, 10)} fill={l.c} rim={0} edge={4} />
          </g>
        ) : null,
      )}
      {oops && (
        <g>
          <Bubble x={380} y={60} text="Wrong item! Strike" fill="#FFD0D5" size={20} />
          <Ink d="M530 70 l40 40 m0 -40 l-40 40" w={10} stroke="#E5484D" />
        </g>
      )}
      <DemoAvatar x={560} y={250} a={0} s={56} />
      <Bubble x={560} y={180} text="Mine!" size={18} show={fade(t, 4.8, 5.4)} />
    </DemoFrame>
  );
});

/** Runaway Switchboard: flip your junction so each payload reaches its exit. */
registerDemo('runaway-switchboard', () => {
  const t = useDemoTime(6.5, 3.4);
  const flipped = t > 1.4;
  const p = Math.max(0, Math.min(1, (t - 1.8) / 1.6));
  // The payload rolls in from the left, then takes the lower branch once flipped.
  const x = 60 + p * 440;
  const y = p < 0.45 ? 170 : 170 + (flipped ? (p - 0.45) * 220 : 0);
  return (
    <DemoFrame caption="Flip your junctions so every payload reaches its number" bg="#EEF6E4">
      <Ink d="M40 170 H290 L530 170" w={10} stroke="#8C8A96" />
      <Ink d="M290 170 L530 290" w={10} stroke="#8C8A96" />
      <g transform="translate(290 170)">
        <circle r={20} fill={flipped ? '#9B5DE5' : PAPER} stroke={INK} strokeWidth={4} />
        <Ink d={flipped ? 'M-12 -6 L12 8' : 'M-14 0 H14'} w={5} />
      </g>
      {[
        [540, 170, '1'],
        [540, 290, '2'],
      ].map(([ex, ey, n]) => (
        <g key={n} transform={`translate(${ex} ${ey})`}>
          <circle r={22} fill={n === '2' && p >= 1 ? '#2EC27E' : '#FF7A1A'} stroke={INK} strokeWidth={4} />
          <text y={8} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill={PAPER}>
            {n}
          </text>
        </g>
      ))}
      <g transform={`translate(${x} ${y})`}>
        <rect x={-22} y={-20} width={44} height={40} rx={8} fill="#FFD23F" stroke={INK} strokeWidth={4} />
        <text y={8} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill={INK}>
          2
        </text>
      </g>
      <Finger x={290} y={180} down={between(t, 1.1, 1.5)} show={fade(t, 0.5, 2.2)} />
      <Bubble x={500} y={80} text="Delivered!" fill="#C9F2DC" size={22} show={fade(t, 3.5, 6.3)} />
    </DemoFrame>
  );
});

/** Pressure Valve: pump and vent to keep the needle in the green; don't all press at once. */
registerDemo('pressure-valve', () => {
  const t = useDemoTime(7, 2.4);
  const v = key([[0, 0.5], [1.2, 0.78], [1.6, 0.6], [3, 0.3], [3.6, 0.52], [5, 0.6], [5.6, 0.1], [7, 0.5]], t);
  const inGreen = v > 0.38 && v < 0.68;
  return (
    <DemoFrame caption="Keep the needle in the green. Don't all press at once!" bg="#F6E4D6">
      <g transform="translate(160 40)">
        <Cut d={rr(0, 0, 90, 280, 20)} fill="#FFE1D6" rim={0} />
        <rect x={4} y={280 - 0.68 * 280} width={82} height={0.3 * 280} fill="#7ED49A" />
        <rect x={-8} y={280 - v * 280 - 3} width={106} height={6} fill={INK} />
      </g>
      <DemoAvatar x={400} y={110} a={0} s={56} />
      <DemoAvatar x={400} y={240} a={9} s={56} />
      <Bubble x={500} y={110} text="Vent" fill={between(t, 1.2, 1.6) || between(t, 5, 5.6) ? '#48CAE4' : PAPER} size={20} />
      <Bubble x={500} y={240} text="Pump" fill={between(t, 3, 3.6) ? '#FF9F43' : between(t, 5, 5.6) ? '#48CAE4' : PAPER} size={20} />
      <Bubble x={205} y={340} text={inGreen ? 'Steady!' : v < 0.38 ? 'Too low!' : 'Too high!'} fill={inGreen ? '#C9F2DC' : '#FFD0D5'} size={18} />
    </DemoFrame>
  );
});

/** The Mind: play your numbers lowest first, all together, without talking. */
registerDemo('the-mind', () => {
  const t = useDemoTime(7.5, 4.6);
  const cards = [
    { a: 0, n: 12, x: 120, at: 1.2 },
    { a: 4, n: 35, x: 300, at: 2.6 },
    { a: 9, n: 71, x: 480, at: 3.8 },
  ];
  return (
    <DemoFrame caption="Play your numbers lowest first, together, with no talking" bg="#EEEDF8">
      {cards.map((c) => {
        const played = t > c.at;
        const x = played ? key([[c.at, c.x], [c.at + 0.4, 300]], t) : c.x;
        const y = played ? key([[c.at, 250], [c.at + 0.4, 120]], t) : 250;
        return (
          <g key={c.a}>
            <DemoAvatar x={c.x} y={310} a={c.a} s={52} />
            <g transform={`translate(${x} ${y}) rotate(${played ? (c.n % 7) - 3 : 0})`}>
              <Cut d={rr(-38, -52, 76, 104, 10)} fill="#FBF6EA" rim={0} />
              <text y={14} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={38} fill={INK}>
                {c.n}
              </text>
              <circle cx={24} cy={36} r={8} fill="#C0392B" />
            </g>
          </g>
        );
      })}
      <Bubble x={300} y={36} text="…in order!" fill="#C9F2DC" size={22} show={fade(t, 4.4, 7.2)} />
    </DemoFrame>
  );
});

/** Collaborative Quilt: each patch is yours; carry your lines across the seams. */
registerDemo('collaborative-quilt', () => {
  const t = useDemoTime(7, 5);
  const draw = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const len = 280;
  return (
    <DemoFrame caption="Draw your patch. Carry the lines over the seams to your neighbours" bg="#FCE9DF">
      {[
        [160, 40, '#FFF6E5'],
        [300, 40, '#FFF1B8'],
        [160, 180, '#E4F2FF'],
        [300, 180, '#FFE4EC'],
      ].map(([x, y, c], i) => (
        <rect key={i} x={x as number} y={y as number} width={140} height={140} fill={c as string} stroke="#E17055" strokeWidth={4} strokeDasharray="10 7" />
      ))}
      <rect x={160} y={40} width={280} height={280} fill="none" stroke={INK} strokeWidth={6} rx={6} />
      {/* A rainbow drawn by two players meets across the seam. */}
      {[
        ['#FF4D5E', 0],
        ['#FFD23F', 16],
        ['#3D7BFF', 32],
      ].map(([c, o]) => (
        <path key={c as string} d={`M${190 + (o as number)} 320 Q${190 + (o as number)} ${120 + (o as number)} 300 ${120 + (o as number)} Q${410 - (o as number)} ${120 + (o as number)} ${410 - (o as number)} 320`} fill="none" stroke={c as string} strokeWidth={10} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw(0.4, 3.4))} />
      ))}
      <DemoAvatar x={90} y={110} a={0} s={56} />
      <DemoAvatar x={510} y={110} a={2} s={56} />
      <Bubble x={300} y={100} text="Lined up!" fill="#C9F2DC" size={20} show={fade(t, 3.6, 6.8)} />
    </DemoFrame>
  );
});

/** Defuse the Circuit: the operator describes, the readers look it up, the right wire gets cut. */
registerDemo('defuse-circuit', () => {
  const t = useDemoTime(8, 5.2);
  const cut = t > 4.2;
  const wires = ['#E5484D', '#3D7BFF', '#FFD23F', '#2B2233'];
  return (
    <DemoFrame caption="One sees the bomb, the rest have the manual. Talk it through!" bg="#E6E9EE">
      <g transform="translate(40 60)">
        <Cut d={rr(0, 0, 250, 220, 16)} fill="#5E6670" rim={0} />
        <circle cx={220} cy={28} r={12} fill={cut ? '#2EC27E' : '#E5484D'} stroke={INK} strokeWidth={3} />
        {wires.map((c, i) => (
          <g key={c}>
            <Ink d={`M30 ${60 + i * 40} H${i === 1 && cut ? 110 : 220}`} w={12} />
            <Ink d={`M30 ${60 + i * 40} H${i === 1 && cut ? 110 : 220}`} w={7} stroke={c} />
            {i === 1 && cut && <Ink d={`M140 ${60 + i * 40} H220`} w={7} stroke={c} />}
          </g>
        ))}
      </g>
      <DemoAvatar x={160} y={330} a={0} s={48} />
      <Bubble x={170} y={36} text="Red, blue, yellow, black" size={16} show={fade(t, 0.5, 2.4)} />
      <g transform="translate(450 180)">
        <Cut d={rr(-90, -110, 180, 220, 8)} fill="#D8CFA8" rim={0} />
        <text y={-80} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={16} fill={INK}>
          MANUAL
        </text>
        <Ink d="M-70 -56 H70 M-70 -36 H50 M-70 -16 H66 M-70 4 H40" w={4} opacity={0.35} />
        <Finger x={-20} y={-30} down={between(t, 2.4, 3)} show={fade(t, 2, 3.4)} />
      </g>
      <DemoAvatar x={450} y={330} a={9} s={48} />
      <Bubble x={450} y={36} text="Cut the blue one!" fill="#FFF6CC" size={18} show={fade(t, 3, 4.6)} />
      <Bubble x={165} y={36} text="Defused!" fill="#C9F2DC" size={22} show={fade(t, 4.6, 7.8)} />
    </DemoFrame>
  );
});

/** Meteor Shield: turn your piece of the shield to cover every falling meteor. */
registerDemo('meteor-shield', () => {
  const t = useDemoTime(6.5, 3.4);
  const shieldA = key([[0.6, -2.4], [1.8, -0.9]], t);
  const m = Math.max(0, Math.min(1, (t - 0.6) / 2.4));
  const mr = 170 - m * 60;
  const ma = -0.9;
  const blocked = t > 3;
  const arc = (a: number, r: number, span: number, c: string) => (
    <path d={`M${300 + Math.cos(a - span) * r} ${185 + Math.sin(a - span) * r} A${r} ${r} 0 0 1 ${300 + Math.cos(a + span) * r} ${185 + Math.sin(a + span) * r}`} fill="none" stroke={c} strokeWidth={14} strokeLinecap="round" />
  );
  return (
    <DemoFrame caption="Turn your piece of the shield. Cover every meteor before it lands" bg="#141A3A">
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={(i * 137) % 580 + 10} cy={(i * 71) % 340 + 10} r={2} fill="#FFF6CC" />
      ))}
      <circle cx={300} cy={185} r={62} fill="#3D7BFF" stroke={INK} strokeWidth={5} />
      <path d="M262 170 Q280 130 320 150 Q330 180 300 190 Q270 200 262 170 Z" fill="#3DBE4B" stroke={INK} strokeWidth={3} />
      {arc(shieldA, 104, 0.45, '#FF4D5E')}
      {arc(1.4, 104, 0.45, '#FFD23F')}
      {arc(3.2, 104, 0.45, '#2EC27E')}
      {!blocked && (
        <g transform={`translate(${300 + Math.cos(ma) * mr} ${185 + Math.sin(ma) * mr})`}>
          <Ink d={`M0 0 L${Math.cos(ma) * 40} ${Math.sin(ma) * 40}`} w={10} stroke="#FF9F43" opacity={0.7} />
          <circle r={12} fill="#FF7A1A" stroke={INK} strokeWidth={3} />
        </g>
      )}
      <Bubble x={470} y={60} text="Blocked!" fill="#FFD23F" size={22} show={fade(t, 3, 6.3)} />
      <DemoPhone x={520} y={250} s={0.6}>
        <circle r={26} fill="none" stroke={INK} strokeWidth={4} />
        <path d="M-22 -14 A26 26 0 0 1 14 -22" fill="none" stroke="#FF4D5E" strokeWidth={8} strokeLinecap="round" />
      </DemoPhone>
    </DemoFrame>
  );
});
