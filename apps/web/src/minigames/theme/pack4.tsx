import { between, Bubble, DemoAvatar, DemoFrame, DemoPhone, fade, Finger, key, useDemoTime } from './demo.tsx';
import { circ, Cloud, Cut, INK, Ink, PAPER, rr, Sparkle, star } from './paper.tsx';
import { registerDemo, registerScene } from './themes.tsx';
import './skins4.css';

/**
 * Pack 4: the Midnight Museum (Heist, both ways), the Explorers' Table (Land Grab), the Glitter
 * Disco (Synchronised Pulse), Crystal Caverns (Mirror Maze), Lighthouse Point (Radar Beacon) and
 * the Brick by Brick site (Blind Architect).
 */

const FONT = 'Fredoka, sans-serif';

// ================================================================== scenes

/** Heist: a gallery after hours, with paintings, velvet ropes and a gem under glass. */
function Frame({ x, y, w, h, art }: { x: number; y: number; w: number; h: number; art: 'hills' | 'sun' | 'face' }) {
  return (
    <g>
      <Cut d={rr(x, y, w, h, 6)} fill="#C9892B" />
      <rect x={x + 16} y={y + 16} width={w - 32} height={h - 32} fill={art === 'sun' ? '#FFE8A0' : art === 'face' ? '#CFE8F2' : '#BFE6F7'} stroke={INK} strokeWidth={4} />
      {art === 'hills' && <path d={`M${x + 16} ${y + h - 16} Q${x + w * 0.35} ${y + h * 0.4} ${x + w * 0.6} ${y + h * 0.7} Q${x + w * 0.8} ${y + h * 0.5} ${x + w - 16} ${y + h * 0.66} V${y + h - 16} Z`} fill="#7CC77F" stroke={INK} strokeWidth={3} />}
      {art === 'sun' && <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.22} fill="#FF9F43" stroke={INK} strokeWidth={4} />}
      {art === 'face' && (
        <g>
          <circle cx={x + w / 2} cy={y + h * 0.48} r={Math.min(w, h) * 0.24} fill="#FFD7B5" stroke={INK} strokeWidth={4} />
          <path d={`M${x + w / 2 - 14} ${y + h * 0.54} Q${x + w / 2} ${y + h * 0.58} ${x + w / 2 + 14} ${y + h * 0.54}`} fill="none" stroke={INK} strokeWidth={3} />
          <circle cx={x + w / 2 - 12} cy={y + h * 0.44} r={3} fill={INK} />
          <circle cx={x + w / 2 + 12} cy={y + h * 0.44} r={3} fill={INK} />
        </g>
      )}
    </g>
  );
}
registerScene('museum', () => (
  <>
    <rect width={1460} height={960} fill="#34495E" />
    {Array.from({ length: 8 }, (_, i) => (
      <rect key={i} x={i * 190 + 60} y={0} width={70} height={720} fill="#3A536B" />
    ))}
    <Frame x={40} y={120} w={240} h={180} art="hills" />
    <Frame x={70} y={360} w={170} h={220} art="face" />
    <Frame x={1200} y={130} w={220} h={220} art="sun" />
    {/* A gem under glass in a spotlight. */}
    <path d="M1310 0 L1160 720 H1460 V0 Z" fill="#FFE98A" opacity={0.12} />
    <g transform="translate(1310 700)">
      <Cut d={rr(-70, -120, 140, 120, 4)} fill="#6B5A48" rim={0} />
      <Cut d={rr(-60, -250, 120, 130, 8)} fill="#CFE8F2" rim={0} opacity={0.9} />
      <g className="anim-bob" style={{ animationDuration: '2.6s' }}>
        <Cut d="M-26 -190 L0 -222 L26 -190 L0 -150 Z" fill="#48CAE4" rim={0} />
        <Ink d="M-26 -190 H26 M-10 -190 L0 -222 L10 -190 L0 -150" w={2.5} />
      </g>
      <Sparkle x={34} y={-230} k={12} className="anim-twinkle" />
    </g>
    {/* Velvet ropes. */}
    {[260, 1040].map((x0) => (
      <g key={x0}>
        {[0, 160].map((o) => (
          <g key={o}>
            <rect x={x0 + o - 7} y={760} width={14} height={120} fill="#C9892B" stroke={INK} strokeWidth={4} />
            <circle cx={x0 + o} cy={756} r={14} fill="#FFD23F" stroke={INK} strokeWidth={4} />
          </g>
        ))}
        <Ink d={`M${x0} 770 Q${x0 + 80} 830 ${x0 + 160} 770`} w={16} />
        <Ink d={`M${x0} 770 Q${x0 + 80} 830 ${x0 + 160} 770`} w={9} stroke="#C0392B" />
      </g>
    ))}
    {/* Checked marble floor. */}
    <Cut d="M0 720 H1460 V960 H0 Z" fill="#E9DCC3" rim={0} />
    {Array.from({ length: 30 }, (_, i) => (
      <rect key={i} x={(i % 15) * 100 + (Math.floor(i / 15) % 2) * 50 - 50} y={800 + Math.floor(i / 15) * 80} width={50} height={80} fill="#D5C6A8" />
    ))}
  </>
));

/** Land Grab: an explorers' table with a map, a compass and a candle. */
registerScene('maptable', () => (
  <>
    <rect width={1460} height={960} fill="#6B4A2B" />
    {Array.from({ length: 10 }, (_, i) => (
      <rect key={i} x={0} y={i * 100 + 40} width={1460} height={6} fill="#5C3F24" />
    ))}
    {/* The map, pinned at the corners. */}
    <Cut d="M60 70 L1400 50 L1420 890 L40 910 Z" fill="#EAD9B0" />
    <path d="M200 700 Q260 560 380 600 Q470 470 600 540 Q650 680 540 760 Q380 820 200 700 Z" fill="#CFE0A8" stroke={INK} strokeWidth={4} strokeDasharray="10 8" />
    <path d="M980 220 Q1100 140 1200 230 Q1260 340 1150 400 Q1020 420 980 220 Z" fill="#CFE0A8" stroke={INK} strokeWidth={4} strokeDasharray="10 8" />
    <Ink d="M420 300 q40 -30 80 0 t80 0 M980 700 q40 -30 80 0 t80 0" w={4} stroke="#7FA9C9" />
    <Ink d="M300 200 L360 260 M360 200 L300 260" w={8} stroke="#C0392B" />
    {[
      [70, 80],
      [1390, 60],
      [1410, 880],
      [50, 900],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={12} fill="#C0392B" stroke={INK} strokeWidth={4} />
    ))}
    {/* A compass rose. */}
    <g transform="translate(1230 740)">
      <Cut d={circ(0, 0, 90)} fill="#F4E9D3" rim={0} />
      <g className="anim-sway" style={{ animationDuration: '4s', transformOrigin: '0px 0px' }}>
        <path d="M0 -76 L14 0 L0 76 L-14 0 Z" fill="#C0392B" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M0 76 L14 0 L-14 0 Z" fill={PAPER} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      </g>
      <text y={-94} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={26} fill={INK}>
        N
      </text>
    </g>
    {/* A candle. */}
    <g transform="translate(160 330)">
      <Cut d={rr(-24, -10, 48, 110, 8)} fill="#FFF6E5" rim={0} />
      <g className="anim-bob" style={{ animationDuration: '0.7s' }}>
        <path d="M0 -44 Q16 -24 0 -12 Q-16 -24 0 -44 Z" fill="#FFB703" stroke={INK} strokeWidth={3} />
      </g>
      <Cut d="M-44 96 H44 V114 H-44 Z" fill="#C9892B" rim={0} edge={4} />
    </g>
  </>
));

/** Synchronised Pulse: a glitter disco with a lit dance floor. */
registerScene('disco', () => (
  <>
    <rect width={1460} height={960} fill="#2A1B4A" />
    {/* Light beams from the ball. */}
    {[-50, -20, 15, 45].map((a, i) => (
      <g key={a} className="anim-sway" style={{ animationDuration: `${3 + i}s`, transformOrigin: '730px 110px' }}>
        <path d={`M730 110 L${730 + Math.sin((a * Math.PI) / 180) * 1200 - 60} 1000 H${730 + Math.sin((a * Math.PI) / 180) * 1200 + 60} Z`} fill={['#FF4D8D', '#FFD23F', '#48CAE4', '#9B5DE5'][i]} opacity={0.14} />
      </g>
    ))}
    {/* The lighting rig (the game's own disco ball hangs below it). */}
    <Cut d={rr(420, 40, 620, 34, 10)} fill="#3B3346" rim={0} />
    {[470, 590, 730, 870, 990].map((x, i) => (
      <g key={x}>
        <Cut d={rr(x - 22, 70, 44, 40, 8)} fill="#5A4D63" rim={0} edge={4} />
        <circle className="anim-twinkle" style={{ animationDuration: '1.2s', animationDelay: `${-i * 0.25}s` }} cx={x} cy={112} r={12} fill={['#FF4D8D', '#FFD23F', '#48CAE4', '#9B5DE5', '#3DBE4B'][i]} stroke={INK} strokeWidth={3} />
      </g>
    ))}
    {/* Speakers. */}
    {[60, 1280].map((x) => (
      <g key={x}>
        <Cut d={rr(x, 400, 120, 330, 12)} fill="#3B3346" />
        <g className="anim-bob" style={{ animationDuration: '0.46s' }}>
          <Cut d={circ(x + 60, 490, 40)} fill="#5A4D63" rim={0} edge={4} />
          <Cut d={circ(x + 60, 640, 50)} fill="#5A4D63" rim={0} edge={4} />
        </g>
      </g>
    ))}
    {/* The dance floor. */}
    <Cut d="M0 740 H1460 V960 H0 Z" fill="#1E1433" rim={0} />
    {Array.from({ length: 30 }, (_, i) => (
      <rect
        key={i}
        className="anim-blink"
        style={{ animationDuration: `${1 + (i % 3) * 0.35}s`, animationDelay: `${-(i % 5) * 0.2}s` }}
        x={(i % 15) * 98 + 4}
        y={750 + Math.floor(i / 15) * 104}
        width={90}
        height={96}
        rx={6}
        fill={['#FF4D8D', '#FFD23F', '#48CAE4', '#9B5DE5', '#3DBE4B'][(i * 3) % 5]}
        stroke={INK}
        strokeWidth={4}
      />
    ))}
  </>
));

/** Mirror Maze: glowing crystal caverns. */
function Crystal({ x, y, s = 1, fill = '#9FE7F5', flip = false }: { x: number; y: number; s?: number; fill?: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <Cut d="M-30 0 L-40 -90 L-10 -150 L14 -96 L6 0 Z" fill={fill} rim={0} />
      <Cut d="M0 0 L20 -120 L46 -170 L60 -110 L40 0 Z" fill={fill} rim={0} />
      <Ink d="M-10 -150 L-8 -20 M46 -170 L32 -20" w={3} opacity={0.4} />
    </g>
  );
}
registerScene('crystalcave', () => (
  <>
    <rect width={1460} height={960} fill="#241A42" />
    {/* Stalactites. */}
    <Cut d="M0 0 H1460 V60 L1400 140 L1360 60 L1280 180 L1220 60 L1120 110 L1060 50 L900 90 L820 40 L640 100 L560 40 L440 130 L380 50 L260 160 L200 60 L100 120 L40 50 L0 90 Z" fill="#3A2C66" rim={0} />
    {/* Glow pools. */}
    {[
      [160, 820, '#6C5CE7'],
      [1300, 800, '#48CAE4'],
    ].map(([x, y, c], i) => (
      <circle key={i} className="anim-twinkle" style={{ animationDuration: '4s' }} cx={x as number} cy={y as number} r={180} fill={c as string} opacity={0.18} />
    ))}
    <Crystal x={130} y={900} s={1.6} fill="#A29BFE" />
    <Crystal x={300} y={920} s={1} fill="#9FE7F5" flip />
    <Crystal x={1290} y={900} s={1.5} fill="#9FE7F5" flip />
    <Crystal x={1150} y={930} s={0.9} fill="#FD79A8" />
    <Cut d="M0 880 Q730 840 1460 880 V960 H0 Z" fill="#1A1233" rim={0} />
    {Array.from({ length: 14 }, (_, i) => (
      <Sparkle key={i} className="anim-twinkle" x={(i * 223) % 1400 + 30} y={200 + ((i * 131) % 560)} k={7} fill="#DCD6FF" />
    ))}
  </>
));

/** Radar Beacon: a lighthouse on the point at night, sweeping the sea. */
registerScene('radar', () => (
  <>
    <rect width={1460} height={960} fill="#152B4A" />
    {Array.from({ length: 18 }, (_, i) => (
      <Sparkle key={i} className="anim-twinkle" x={(i * 263) % 1440 + 10} y={(i * 83) % 360 + 20} k={5} fill="#FFF6CC" />
    ))}
    {/* The lighthouse beam. */}
    <g className="anim-sway" style={{ animationDuration: '5s', transformOrigin: '1250px 330px' }}>
      <path d="M1250 330 L0 180 V480 Z" fill="#FFF3B0" opacity={0.16} />
    </g>
    {/* The sea. */}
    <rect y={620} width={1460} height={340} fill="#1F4E79" />
    <g className="anim-drift" style={{ animationDuration: '7s' }}>
      <Ink d="M60 700 q30 -14 60 0 M360 760 q30 -14 60 0 M700 690 q30 -14 60 0 M960 800 q30 -14 60 0 M200 860 q30 -14 60 0 M580 900 q30 -14 60 0" w={5} stroke="#6FA8DC" />
    </g>
    {/* The rocks and the lighthouse. */}
    <Cut d="M1060 960 Q1080 720 1200 700 Q1330 680 1400 760 L1460 960 Z" fill="#4A4458" rim={0} />
    <g transform="translate(1250 700)">
      <Cut d="M-60 0 L-40 -320 H40 L60 0 Z" fill={PAPER} />
      <path d="M-56 -60 H56 L52 -130 H-52 Z M-47 -190 H47 L44 -260 H-44 Z" fill="#E5484D" stroke={INK} strokeWidth={4} />
      <Cut d={rr(-50, -380, 100, 64, 10)} fill="#FFE98A" rim={0} />
      <Cut d="M-60 -380 L0 -430 L60 -380 Z" fill="#E5484D" rim={0} />
      <Ink d="M-20 -380 V-316 M20 -380 V-316" w={4} />
    </g>
    {/* A little boat far out. */}
    <g className="anim-bob" style={{ animationDuration: '2.2s' }}>
      <Cut d="M300 640 H420 L400 668 H320 Z" fill="#B5793D" rim={0} edge={4} />
      <Cut d="M360 640 V580 L400 632 Z" fill={PAPER} rim={0} edge={4} />
    </g>
  </>
));

/** Blind Architect: a building site with a crane and a half-built wall. */
registerScene('building', () => (
  <>
    <rect width={1460} height={960} fill="#BFE6F7" />
    <g className="anim-drift">
      <Cloud x={420} y={120} s={1.1} />
      <Cloud x={1000} y={90} s={0.8} />
    </g>
    {/* The crane. */}
    <g>
      <Ink d="M1260 880 V150 M1300 880 V150" w={10} stroke="#E1A100" />
      {Array.from({ length: 12 }, (_, i) => (
        <Ink key={i} d={`M1260 ${880 - i * 60} L1300 ${820 - i * 60}`} w={5} stroke="#E1A100" />
      ))}
      <Cut d="M600 150 H1460 V180 H600 Z" fill="#E1A100" rim={0} />
      <Cut d={rr(1250, 110, 90, 70, 6)} fill="#3B3346" rim={0} edge={4} />
      <g className="anim-sway" style={{ animationDuration: '4s', transformOrigin: '760px 180px' }}>
        <Ink d="M760 180 V380" w={4} />
        <Cut d={rr(700, 380, 120, 60, 6)} fill="#D9774F" rim={0} />
        <Ink d="M700 410 H820 M740 380 V410 M780 410 V440" w={3} />
      </g>
    </g>
    {/* A half-built wall. */}
    {Array.from({ length: 20 }, (_, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      if (row === 3 && col > 2) return null;
      return <Cut key={i} d={rr(40 + col * 72 + (row % 2) * 36, 820 - row * 44, 68, 40, 4)} fill={(i * 7) % 3 ? '#D9774F' : '#C4623D'} rim={0} edge={4} />;
    })}
    <Cut d="M0 860 H1460 V960 H0 Z" fill="#C8AE84" rim={0} />
    {/* Traffic cones. */}
    {[560, 900].map((x) => (
      <g key={x}>
        <Cut d={`M${x - 30} 870 L${x - 8} 790 H${x + 8} L${x + 30} 870 Z`} fill="#FF7A1A" rim={0} edge={4} />
        <rect x={x - 20} y={826} width={40} height={12} fill={PAPER} />
        <Cut d={rr(x - 40, 866, 80, 12, 4)} fill="#FF7A1A" rim={0} edge={4} />
      </g>
    ))}
  </>
));

// ================================================================== demos

/** Heist: plan moves, then everyone moves at once. Grab a gem; don't walk into a guard. */
registerDemo('heist', () => {
  const t = useDemoTime(7, 4.2);
  const cell = 56;
  const ox = 160;
  const oy = 40;
  const at = (x: number, y: number) => ({ x: ox + x * cell + cell / 2, y: oy + y * cell + cell / 2 });
  // Fox: right, right, down, down (gem at 2,2). Cat: up into the guard.
  const fox = [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
  ];
  const step = Math.max(0, Math.min(4, (t - 1.6) / 0.5));
  const i = Math.min(3, Math.floor(step));
  const f = step - i;
  const fp = at(fox[i]![0]! + (fox[i + 1]![0]! - fox[i]![0]!) * f, fox[i]![1]! + (fox[i + 1]![1]! - fox[i]![1]!) * f);
  const gemGone = step >= 4;
  const catY = 4 - Math.min(2, Math.max(0, (t - 1.6) / 0.5));
  const guardY = 1 + Math.min(1, Math.max(0, (t - 2.1) / 0.5));
  const caught = t > 2.7;
  return (
    <DemoFrame caption="Plan five moves in secret. Grab gems, dodge the guards" bg="#E9E2F2">
      {Array.from({ length: 25 }, (_, c) => (
        <rect key={c} x={ox + (c % 5) * cell + 2} y={oy + Math.floor(c / 5) * cell + 2} width={cell - 4} height={cell - 4} rx={8} fill={((c % 5) + Math.floor(c / 5)) % 2 ? '#E9DCC3' : '#D5C6A8'} />
      ))}
      <rect x={ox + 3 * cell + 2} y={oy + 1 * cell + 2} width={cell - 4} height={cell - 4} rx={8} fill="#4A3B5C" />
      {!gemGone && <path d={`M${at(2, 2).x - 16} ${at(2, 2).y} L${at(2, 2).x} ${at(2, 2).y - 18} L${at(2, 2).x + 16} ${at(2, 2).y} L${at(2, 2).x} ${at(2, 2).y + 18} Z`} fill="#48CAE4" stroke={INK} strokeWidth={3} />}
      <g opacity={caught ? 1 - fade(t, 3, 6.8) * 0.7 : 1}>
        <DemoAvatar x={at(4, catY).x} y={at(4, catY).y} a={4} s={46} />
      </g>
      <g transform={`translate(${at(4, guardY).x} ${at(4, guardY).y})`}>
        <circle r={20} fill="#1E3A8A" stroke={INK} strokeWidth={3} />
        <path d="M-18 -6 Q0 -30 18 -6 Z" fill="#101C45" stroke={INK} strokeWidth={3} />
        <path d={star(0, 6, 7)} fill="#FFD23F" />
      </g>
      <DemoAvatar x={fp.x} y={fp.y} a={0} s={46} />
      <g opacity={fade(t, 0.2, 1.7)}>
        <Bubble x={500} y={80} text="→ → ↓ ↓" size={22} />
      </g>
      <Bubble x={at(2, 2).x} y={at(2, 2).y - 40} text="+3 gems" fill="#C9F2DC" size={18} show={fade(t, 3.6, 6.8)} />
      <Bubble x={at(4, 2).x + 30} y={at(4, 2).y - 44} text="Caught!" fill="#FFD0D5" size={18} show={fade(t, 2.8, 6.8)} />
    </DemoFrame>
  );
});

/** Heist: Guard: guards plan patrols to cut off the thieves' routes. */
registerDemo('heist-guard', () => {
  const t = useDemoTime(7, 4);
  const cell = 56;
  const ox = 160;
  const oy = 40;
  const at = (x: number, y: number) => ({ x: ox + x * cell + cell / 2, y: oy + y * cell + cell / 2 });
  const s = Math.max(0, Math.min(3, (t - 1.8) / 0.5));
  const thief = at(0 + Math.min(3, s), 2);
  const guard = at(4, Math.max(2, 4 - s));
  const caught = t > 3.2;
  return (
    <DemoFrame caption="Guards plan patrols in secret. Catch the thieves on their way through" bg="#E3E8F2">
      {Array.from({ length: 25 }, (_, c) => (
        <rect key={c} x={ox + (c % 5) * cell + 2} y={oy + Math.floor(c / 5) * cell + 2} width={cell - 4} height={cell - 4} rx={8} fill={((c % 5) + Math.floor(c / 5)) % 2 ? '#E9DCC3' : '#D5C6A8'} />
      ))}
      <Ink d={`M${at(4, 4).x} ${at(4, 4).y} V${at(4, 2).y} H${at(3, 2).x}`} w={5} stroke="#1E3A8A" strokeDasharray="8 8" opacity={1 - fade(t, 1.8, 7)} />
      <g opacity={caught ? 1 - fade(t, 3.4, 6.8) * 0.7 : 1}>
        <DemoAvatar x={thief.x} y={thief.y} a={9} s={46} />
      </g>
      <g transform={`translate(${caught ? at(3, 2).x : guard.x} ${guard.y})`}>
        <circle r={22} fill="#1E3A8A" stroke={INK} strokeWidth={3} />
        <path d="M-20 -6 Q0 -32 20 -6 Z" fill="#101C45" stroke={INK} strokeWidth={3} />
        <path d={star(0, 6, 8)} fill="#FFD23F" />
      </g>
      <DemoPhone x={520} y={190} s={0.75}>
        <text y={-30} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={18} fill={INK}>
          Patrol
        </text>
        <text y={4} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={26} fill="#1E3A8A">
          ↑ ↑ ←
        </text>
      </DemoPhone>
      <Bubble x={at(3, 2).x} y={at(3, 2).y - 46} text="Caught!" fill="#FFD0D5" size={20} show={fade(t, 3.3, 6.8)} />
    </DemoFrame>
  );
});

/** Land Grab: place a piece touching your land; clashing squares go to nobody. */
registerDemo('land-grab', () => {
  const t = useDemoTime(7, 4.2);
  const cell = 40;
  const ox = 150;
  const oy = 30;
  const a = [
    [1, 1],
    [1, 2],
    [2, 2],
  ];
  const b = [
    [5, 5],
    [5, 4],
    [4, 4],
  ];
  const aNew = [
    [3, 2],
    [3, 3],
    [2, 3],
  ];
  const bNew = [
    [4, 3],
    [3, 3],
    [3, 4],
  ];
  const placed = t > 2.4;
  const has = (list: number[][], x: number, y: number) => list.some(([px, py]) => px === x && py === y);
  return (
    <DemoFrame caption="Grow your land. Squares you both claim stay empty for ever" bg="#F4E8C8">
      {Array.from({ length: 49 }, (_, c) => {
        const x = c % 7;
        const y = Math.floor(c / 7);
        const clash = placed && has(aNew, x, y) && has(bNew, x, y);
        const fill = clash ? '#8C8A96' : has(a, x, y) || (placed && has(aNew, x, y)) ? '#FF4D5E' : has(b, x, y) || (placed && has(bNew, x, y)) ? '#3D7BFF' : '#EAD9B0';
        return (
          <g key={c}>
            <rect x={ox + x * cell + 2} y={oy + y * cell + 2} width={cell - 4} height={cell - 4} rx={6} fill={fill} stroke={INK} strokeWidth={clash ? 4 : 1.5} />
            {clash && <Ink d={`M${ox + x * cell + 10} ${oy + y * cell + 10} l20 20 m0 -20 l-20 20`} w={4} stroke={PAPER} />}
          </g>
        );
      })}
      {!placed && (
        <g opacity={fade(t, 0.6, 2.4)}>
          {aNew.map(([x, y]) => (
            <rect key={`a${x}${y}`} x={ox + x! * cell + 4} y={oy + y! * cell + 4 - key([[0.6, 30], [1.6, 0]], t)} width={cell - 8} height={cell - 8} rx={6} fill="none" stroke="#FF4D5E" strokeWidth={4} strokeDasharray="6 4" />
          ))}
          {bNew.map(([x, y]) => (
            <rect key={`b${x}${y}`} x={ox + x! * cell + 4} y={oy + y! * cell + 4 + key([[0.6, 30], [1.6, 0]], t)} width={cell - 8} height={cell - 8} rx={6} fill="none" stroke="#3D7BFF" strokeWidth={4} strokeDasharray="6 4" />
          ))}
        </g>
      )}
      <DemoAvatar x={80} y={100} a={0} s={60} />
      <DemoAvatar x={520} y={260} a={2} s={60} />
      <Bubble x={ox + 3 * cell + 20} y={oy + 3 * cell - 20} text="Nobody's!" fill={PAPER} size={18} show={fade(t, 2.6, 6.8)} />
    </DemoFrame>
  );
});

/** Synchronised Pulse: tap on each flash; the team with the tightest timing wins. */
registerDemo('synchronised-pulse', () => {
  const t = useDemoTime(6.4, 1.6);
  const beat = (t % 0.8) / 0.8;
  const flash = beat < 0.18;
  const beatN = Math.floor(t / 0.8);
  return (
    <DemoFrame caption="Tap on every flash. The team with the tightest timing wins" bg="#2A1B4A">
      <g transform="translate(300 120)">
        <circle r={flash ? 76 : 66} fill={flash ? '#FFD23F' : '#C9CED8'} stroke={INK} strokeWidth={6} />
        <Ink d="M-60 0 H60 M0 -60 V60 M-50 -30 H50 M-50 30 H50" w={2.5} opacity={0.4} />
      </g>
      <DemoAvatar x={130} y={270} a={0} s={64} />
      <DemoAvatar x={470} y={270} a={9} s={64} />
      <Finger x={130} y={300} down={flash} />
      <Finger x={470} y={300} down={beat > 0.3 && beat < 0.48} />
      <Bubble x={130} y={196} text="On the beat!" fill="#C9F2DC" size={18} show={beatN >= 2 ? 1 : 0} />
      <Bubble x={470} y={196} text="Late…" fill="#FFD0D5" size={18} show={beatN >= 2 ? 1 : 0} />
    </DemoFrame>
  );
});

/** Mirror Maze: flip your mirrors so your team's laser crosses the targets. */
registerDemo('mirror-maze', () => {
  const t = useDemoTime(6.5, 3.6);
  const cell = 60;
  const ox = 120;
  const oy = 40;
  const flipped = t > 1.8;
  const c = (x: number, y: number) => ({ x: ox + x * cell + cell / 2, y: oy + y * cell + cell / 2 });
  const beam = flipped ? [c(-0.5, 1), c(2, 1), c(2, 3), c(5.5, 3)] : [c(-0.5, 1), c(2, 1), c(2, -0.5)];
  const hit = flipped && t > 2.2;
  return (
    <DemoFrame caption="Flip your mirrors so your team's laser hits the crystals" bg="#E6E0F5">
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={ox + (i % 6) * cell + 2} y={oy + Math.floor(i / 6) * cell + 2} width={cell - 4} height={cell - 4} rx={8} fill="#F4F1FB" stroke="#C9C1E6" strokeWidth={2} />
      ))}
      {[c(4, 3), c(1, 1)].map((p, i) => (
        <path key={i} d={`M${p.x} ${p.y - 20} L${p.x + 14} ${p.y} L${p.x} ${p.y + 20} L${p.x - 14} ${p.y} Z`} fill={i === 0 && hit ? '#FFD23F' : '#9FE7F5'} stroke={INK} strokeWidth={3} />
      ))}
      <polyline points={beam.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#FF4D5E" strokeWidth={7} strokeLinejoin="round" opacity={0.9} />
      <g transform={`translate(${c(2, 1).x} ${c(2, 1).y}) rotate(${flipped ? 45 : -45})`}>
        <rect x={-26} y={-5} width={52} height={10} rx={4} fill="#DDE3EE" stroke={INK} strokeWidth={3} />
      </g>
      <g transform={`translate(${c(2, 3).x} ${c(2, 3).y}) rotate(45)`}>
        <rect x={-26} y={-5} width={52} height={10} rx={4} fill="#DDE3EE" stroke={INK} strokeWidth={3} />
      </g>
      <path d={`M${ox - 44} ${c(0, 1).y - 16} L${ox - 14} ${c(0, 1).y} L${ox - 44} ${c(0, 1).y + 16} Z`} fill="#FF4D5E" stroke={INK} strokeWidth={3} />
      <Finger x={c(2, 1).x} y={c(2, 1).y + 6} down={between(t, 1.5, 1.9)} show={fade(t, 0.9, 2.4)} />
      <Bubble x={c(4, 3).x} y={c(4, 3).y - 44} text="Hit!" fill="#FFD23F" size={20} show={fade(t, 2.3, 6.3)} />
    </DemoFrame>
  );
});

/** Radar Beacon: each ping gives a distance ring; drop a marker where they cross. */
registerDemo('radar-beacon', () => {
  const t = useDemoTime(7.5, 5.2);
  const beacon = { x: 330, y: 170 };
  const pings = [
    { x: 180, y: 110, at: 0.5 },
    { x: 420, y: 290, at: 1.6 },
    { x: 460, y: 80, at: 2.7 },
  ];
  const dropped = t > 4;
  return (
    <DemoFrame caption="Ping to learn how far the beacon is. Then drop your marker" bg="#12343B">
      {[120, 240, 360, 480].map((v) => (
        <Ink key={v} d={`M${v} 12 V348 M12 ${v - 30} H588`} w={1.5} stroke="#2D6A73" />
      ))}
      {pings.map((p, i) => {
        const r = Math.hypot(p.x - beacon.x, p.y - beacon.y);
        const grow = key([[p.at, 0], [p.at + 0.6, r]], t);
        return (
          <g key={i} opacity={fade(t, p.at, 7.3)}>
            <circle cx={p.x} cy={p.y} r={grow} fill="none" stroke="#FF4D5E" strokeWidth={4} strokeDasharray="10 8" />
            <circle cx={p.x} cy={p.y} r={8} fill="#FF4D5E" stroke={PAPER} strokeWidth={3} />
          </g>
        );
      })}
      {dropped && <rect x={beacon.x + 6} y={beacon.y - 2} width={20} height={20} fill="#FF4D5E" stroke={PAPER} strokeWidth={3} transform={`rotate(45 ${beacon.x + 16} ${beacon.y + 8})`} />}
      <circle cx={beacon.x} cy={beacon.y} r={10} fill="#FFD23F" opacity={fade(t, 4.8, 7.3)} />
      <Bubble x={beacon.x} y={beacon.y - 40} text="Closest!" fill="#FFD23F" size={20} show={fade(t, 5, 7.3)} />
    </DemoFrame>
  );
});

/** Blind Architect: the architect sees the plan and sends short messages; builders tap to build. */
registerDemo('blind-architect', () => {
  const t = useDemoTime(7.5, 5);
  const target = [0, 0, 2, 0, 1, 0, 3, 0, 0];
  const built = [0, 0, t > 3 ? 2 : t > 2.6 ? 1 : 0, 0, t > 4 ? 1 : 0, 0, t > 4.8 ? 3 : 0, 0, 0];
  const FILL = ['#E8E0CF', '#F4C27A', '#E0874F', '#B5541E'];
  const grid = (cells: number[], ox: number, oy: number, s: number) =>
    cells.map((h, c) => (
      <g key={c}>
        <rect x={ox + (c % 3) * s + 2} y={oy + Math.floor(c / 3) * s + 2} width={s - 4} height={s - 4} rx={6} fill={FILL[h]} stroke={INK} strokeWidth={3} />
        {h > 0 && (
          <text x={ox + (c % 3) * s + s / 2} y={oy + Math.floor(c / 3) * s + s / 2 + 8} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill={h === 3 ? PAPER : INK}>
            {h}
          </text>
        )}
      </g>
    ));
  return (
    <DemoFrame caption="Only the architect sees the plan. Build it from their messages" bg="#E5F2FA">
      <DemoPhone x={160} y={196} s={1.5}>
        <text y={-50} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={12} fill={INK}>
          The plan
        </text>
        {grid(target, -33, -40, 22)}
      </DemoPhone>
      <DemoAvatar x={54} y={70} a={4} s={54} />
      <Bubble x={320} y={50} text="Top right 2" size={18} show={fade(t, 1.4, 3.2)} />
      <Bubble x={320} y={50} text="Bottom left 3!" size={18} show={fade(t, 3.6, 7.3)} />
      {grid(built, 396, 90, 62)}
      <Finger x={396 + 2 * 62 + 31} y={90 + 31} down={between(t, 2.4, 2.7) || between(t, 2.8, 3.1)} show={fade(t, 2, 3.4)} />
      <Finger x={396 + 31} y={90 + 2 * 62 + 31} down={between(t, 4.4, 4.7)} show={fade(t, 4.1, 5.2)} />
    </DemoFrame>
  );
});
