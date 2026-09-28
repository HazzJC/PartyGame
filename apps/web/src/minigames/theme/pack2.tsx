import { between, Bubble, DemoAvatar, DemoFrame, DemoPhone, fade, Finger, key, useDemoTime } from './demo.tsx';
import { circ, Cloud, Cut, INK, Ink, PAPER, rr, Sparkle } from './paper.tsx';
import { registerDemo, registerScene } from './themes.tsx';
import './skins2.css';

/**
 * Pack 2: Tumbleweed Main Street (Quick Draw), the stampede plains (Silent Trample), Creaky Manor
 * (Pick a Door, both ways), the paper deep (Deep Sea Sonar), Rapids River (Raft Gamble) and Wobbly
 * Castle (Crumble Tower).
 */

const FONT = 'Fredoka, sans-serif';

// ================================================================== scenes

/** Quick Draw: a sunset street between a saloon and the water tower. */
function Cactus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Cut d="M-18 0 V-150 Q-18 -170 0 -170 Q18 -170 18 -150 V0 Z" fill="#4F9A55" rim={0} />
      <Cut d="M-18 -70 H-46 Q-58 -70 -58 -84 V-118 Q-58 -128 -48 -128 Q-38 -128 -38 -118 V-92 H-18 Z" fill="#4F9A55" rim={0} />
      <Cut d="M18 -90 H44 Q56 -90 56 -104 V-128 Q56 -138 46 -138 Q36 -138 36 -128 V-110 H18 Z" fill="#4F9A55" rim={0} />
    </g>
  );
}
registerScene('western', () => (
  <>
    <rect width={1460} height={960} fill="#F7C07E" />
    <rect width={1460} height={150} fill="#F39A56" />
    <rect y={150} width={1460} height={110} fill="#F5AE6A" />
    <Cut d={circ(1080, 330, 120)} fill="#FFD66B" rim={0} />
    {/* Mesas on the horizon. */}
    <Cut d="M260 600 L300 450 Q306 430 330 430 H520 Q544 430 550 450 L600 600 Z" fill="#C8693C" rim={0} />
    <Cut d="M880 600 L910 500 H1060 L1100 600 Z" fill="#B85A33" rim={0} />
    {/* The street. */}
    <Cut d="M0 600 H1460 V960 H0 Z" fill="#E3B27A" rim={0} />
    <Ink d="M0 760 Q730 730 1460 760 M0 860 Q730 830 1460 860" w={4} opacity={0.35} />
    {/* The saloon. */}
    <Cut d="M-20 250 H280 V300 H300 V760 H-20 Z" fill="#A0643A" />
    <Cut d={rr(20, 270, 230, 64, 10)} fill="#F4E0B0" rim={0} />
    <text x={135} y={316} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={40} fill="#A0643A" stroke={INK} strokeWidth={2}>
      SALOON
    </text>
    <Cut d={rr(40, 400, 80, 90, 8)} fill="#FFE08A" rim={0} edge={4} />
    <Cut d={rr(170, 400, 80, 90, 8)} fill="#FFE08A" rim={0} edge={4} />
    <g className="anim-flutter" style={{ animationDuration: '2.6s' }}>
      <Cut d="M110 600 H144 V690 H110 Z" fill="#C98A52" rim={0} edge={4} />
      <Cut d="M150 600 H184 V690 H150 Z" fill="#C98A52" rim={0} edge={4} />
    </g>
    <Cut d="M-20 560 H300 V580 H-20 Z" fill="#7A4A2B" rim={0} edge={4} />
    {/* The water tower. */}
    <g transform="translate(1270 0)">
      <Ink d="M-80 700 L-60 380 M80 700 L60 380 M-70 560 L70 480 M70 560 L-70 480" w={10} />
      <Cut d="M-100 380 V250 Q-100 220 0 220 Q100 220 100 250 V380 Z" fill="#B87333" />
      <Ink d="M-100 290 H100 M-100 340 H100" w={4} />
      <Cut d="M-110 230 Q0 150 110 230 Z" fill="#8A5A3C" rim={0} />
    </g>
    <Cactus x={420} y={690} s={0.9} />
    <Cactus x={1100} y={720} s={1.1} />
    {/* A tumbleweed rolling through. */}
    <g className="anim-drift" style={{ animationDuration: '9s' }}>
      <g transform="translate(700 870)">
        <g className="anim-spin" style={{ animationDuration: '3s' }}>
          <Cut d={circ(0, 0, 42)} fill="#D9B06A" rim={0} edge={4} />
          <Ink d="M-30 -20 Q0 10 30 -24 M-34 12 Q0 -12 32 18 M-10 -38 Q10 0 -6 38" w={3.5} />
        </g>
      </g>
    </g>
  </>
));

/** Silent Trample: the stampede plains at golden hour. */
function Acacia({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Cut d="M-14 0 L-8 -140 L-60 -200 L-50 -208 L0 -160 L40 -214 L52 -206 L10 -140 L14 0 Z" fill="#6B4A2B" rim={0} />
      <g className="anim-sway" style={{ animationDuration: '7s' }}>
        <Cut d="M-170 -206 Q-150 -262 -40 -262 Q10 -290 80 -262 Q170 -262 180 -212 Q100 -190 0 -198 Q-100 -186 -170 -206 Z" fill="#7C9A3A" rim={0} />
      </g>
    </g>
  );
}
registerScene('savanna', () => (
  <>
    <rect width={1460} height={960} fill="#FBD38D" />
    <rect width={1460} height={180} fill="#F9C46B" />
    <Cut d={circ(1120, 260, 110)} fill="#FFE8A0" rim={0} />
    {/* Birds heading home. */}
    <g className="anim-drift" style={{ animationDuration: '16s' }}>
      <Ink d="M300 180 q14 -14 28 0 q14 -14 28 0 M380 220 q10 -10 20 0 q10 -10 20 0 M250 240 q10 -10 20 0 q10 -10 20 0" w={4} />
    </g>
    <Cut d="M0 620 Q360 540 760 600 Q1100 540 1460 610 V960 H0 Z" fill="#E3A857" rim={0} />
    <Cut d="M0 720 Q500 660 1000 710 Q1260 680 1460 720 V960 H0 Z" fill="#D9B350" rim={0} />
    <Acacia x={170} y={760} s={1.2} />
    <Acacia x={1300} y={700} s={0.9} />
    {/* A giraffe browsing by the far tree. */}
    <g transform="translate(1150 700)">
      <Ink d="M-36 -40 V0 M-16 -40 V0 M30 -40 V0 M48 -40 V0" w={9} />
      <Cut d="M-52 -58 Q-52 -86 -18 -86 H44 Q70 -86 70 -60 Q70 -36 42 -36 H-24 Q-52 -36 -52 -58 Z" fill="#F2B84B" rim={0} />
      <Cut d="M34 -80 L66 -214 Q70 -232 88 -230 L112 -220 Q122 -210 110 -202 L88 -204 L60 -72 Z" fill="#F2B84B" rim={0} />
      <Ink d="M-52 -64 Q-70 -60 -74 -40" w={5} />
      <circle cx={-20} cy={-64} r={9} fill="#A8652B" />
      <circle cx={20} cy={-54} r={8} fill="#A8652B" />
      <circle cx={52} cy={-128} r={6} fill="#A8652B" />
      <circle cx={62} cy={-170} r={5} fill="#A8652B" />
      <Ink d="M76 -228 L72 -246 M86 -230 L86 -248" w={5} />
      <circle cx={96} cy={-218} r={3.5} fill={INK} />
    </g>
    {/* Grass tufts. */}
    {Array.from({ length: 10 }, (_, i) => (
      <g key={i} className="anim-sway" style={{ animationDelay: `${-i * 0.4}s`, animationDuration: '3.4s' }}>
        <Ink d={`M${60 + i * 150} 930 l-10 -46 M${70 + i * 150} 930 l2 -56 M${80 + i * 150} 930 l12 -44`} w={6} stroke="#8E7A2A" />
      </g>
    ))}
    {/* Dust from the herd. */}
    <g className="anim-drift" style={{ animationDuration: '11s' }}>
      <Cloud x={400} y={860} s={0.9} fill="#F0D9A6" />
      <Cloud x={1040} y={880} s={0.7} fill="#F0D9A6" />
    </g>
  </>
));

/** Pick a Door: Creaky Manor on a moonlit hill. */
function Bat({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <g className="anim-bob" style={{ animationDelay: `${delay}s`, animationDuration: '1.1s' }}>
      <path d={`M${x} ${y} q-18 -22 -44 -10 q10 4 8 16 q14 -10 24 4 q6 -12 12 -10 q6 -2 12 10 q10 -14 24 -4 q-2 -12 8 -16 q-26 -12 -44 10 z`} fill="#241A38" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
}
registerScene('haunted', () => (
  <>
    <rect width={1460} height={960} fill="#2B1E47" />
    <Cut d={circ(1150, 170, 96)} fill="#F4E9C1" rim={0} />
    <circle cx={1120} cy={150} r={16} fill="#E3D6A6" />
    <circle cx={1180} cy={200} r={10} fill="#E3D6A6" />
    <g className="anim-drift" style={{ animationDuration: '18s' }}>
      <Cloud x={1010} y={230} s={1.2} fill="#4A3B6B" />
    </g>
    <Bat x={420} y={160} />
    <Bat x={560} y={110} delay={-0.4} />
    <Bat x={880} y={190} delay={-0.8} />
    {/* The manor. */}
    <g>
      <Cut d="M-20 300 H200 L240 380 V900 H-20 Z" fill="#3E2F5E" />
      <Cut d="M60 300 L130 140 L200 300 Z" fill="#5A3F7A" rim={0} />
      <Cut d="M-20 380 L20 240 L80 380 Z" fill="#5A3F7A" rim={0} />
      {[
        [40, 440],
        [140, 440],
        [40, 600],
        [140, 600],
      ].map(([x, y], i) => (
        <g key={i}>
          <Cut d={`M${x} ${y! + 80} V${y! + 20} Q${x} ${y} ${x! + 30} ${y} Q${x! + 60} ${y} ${x! + 60} ${y! + 20} V${y! + 80} Z`} fill="#FFD66B" rim={0} edge={4} className={i % 3 === 1 ? 'anim-blink' : undefined} style={{ animationDuration: '3.2s' }} />
          <Ink d={`M${x! + 30} ${y} V${y! + 80} M${x} ${y! + 40} H${x! + 60}`} w={3.5} />
        </g>
      ))}
    </g>
    {/* A dead tree. */}
    <Ink d="M1320 900 Q1300 700 1340 560 M1330 640 Q1260 590 1230 520 M1335 600 Q1400 540 1420 470 M1340 560 Q1330 500 1360 440" w={22} stroke="#1B1330" />
    <Ink d="M1320 900 Q1300 700 1340 560 M1330 640 Q1260 590 1230 520 M1335 600 Q1400 540 1420 470 M1340 560 Q1330 500 1360 440" w={12} stroke="#3A2A55" />
    {/* A little ghost. */}
    <g className="anim-bob" style={{ animationDuration: '2.6s' }}>
      <g transform="translate(1180 520)">
        <Cut d="M-40 50 V-10 Q-40 -54 0 -54 Q40 -54 40 -10 V50 L26 38 L12 52 L0 40 L-12 52 L-26 38 Z" fill="#F7F3FF" />
        <circle cx={-12} cy={-12} r={6} fill={INK} />
        <circle cx={12} cy={-12} r={6} fill={INK} />
        <ellipse cx={0} cy={8} rx={7} ry={9} fill={INK} />
      </g>
    </g>
    <Cut d="M0 880 Q730 830 1460 880 V960 H0 Z" fill="#1E1633" rim={0} />
    {/* Gravestones. */}
    {[330, 1060].map((x) => (
      <Cut key={x} d={`M${x - 34} 900 V840 Q${x - 34} 800 ${x} 800 Q${x + 34} 800 ${x + 34} 840 V900 Z`} fill="#6B6680" rim={0} edge={4} />
    ))}
    {/* Cobweb in the corner. */}
    <Ink d="M1460 0 L1330 0 M1460 0 L1460 130 M1460 0 L1360 100 M1400 0 Q1420 40 1460 60 M1360 0 Q1400 80 1460 100" w={2.5} stroke="#9A8FC0" />
  </>
));

/** Deep Sea Sonar: the paper deep. */
function Fish({ x, y, s = 1, fill, flip = false }: { x: number; y: number; s?: number; fill: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <Cut d="M-40 0 Q-10 -30 30 -8 L52 -26 V26 L30 8 Q-10 30 -40 0 Z" fill={fill} rim={0} edge={4} />
      <circle cx={-22} cy={-4} r={4} fill={INK} />
    </g>
  );
}
function Weed({ x, h, fill = '#2E9E6B', delay = 0 }: { x: number; h: number; fill?: string; delay?: number }) {
  return (
    <g className="anim-sway" style={{ animationDelay: `${delay}s`, animationDuration: '4s' }}>
      <Cut d={`M${x - 10} 960 Q${x - 40} ${960 - h * 0.5} ${x} ${960 - h} Q${x + 10} ${960 - h * 0.5} ${x + 14} 960 Z`} fill={fill} rim={0} edge={4} />
    </g>
  );
}
registerScene('underwater', () => (
  <>
    <rect width={1460} height={960} fill="#1B5E95" />
    <rect width={1460} height={240} fill="#3FA9D6" />
    <rect y={240} width={1460} height={240} fill="#2E8FC2" />
    <rect y={480} width={1460} height={240} fill="#2275AE" />
    {/* Light from the surface. */}
    {[260, 700, 1160].map((x) => (
      <path key={x} d={`M${x - 40} 0 L${x - 160} 960 H${x + 60} L${x + 40} 0 Z`} fill="#FFFFFF" opacity={0.07} />
    ))}
    <g className="anim-drift" style={{ animationDuration: '12s' }}>
      <Fish x={330} y={220} fill="#FF9F43" />
      <Fish x={420} y={260} s={0.7} fill="#FFD23F" />
    </g>
    <g className="anim-drift" style={{ animationDuration: '15s', animationDirection: 'alternate-reverse' }}>
      <Fish x={1100} y={420} fill="#FF6B8B" flip />
      <Fish x={1180} y={380} s={0.6} fill="#FFD23F" flip />
    </g>
    {/* Bubbles. */}
    {[140, 1300, 1360, 90].map((x, i) => (
      <g key={i} className="anim-bob" style={{ animationDelay: `${-i * 0.7}s`, animationDuration: '2.4s' }}>
        <circle cx={x} cy={520 - i * 90} r={14 - i * 2} fill="none" stroke={PAPER} strokeWidth={4} />
        <circle cx={x + 20} cy={470 - i * 90} r={8} fill="none" stroke={PAPER} strokeWidth={3} />
      </g>
    ))}
    {/* The sea bed. */}
    <Cut d="M0 880 Q200 850 420 876 Q760 840 1040 872 Q1260 850 1460 876 V960 H0 Z" fill="#E8D39A" rim={0} />
    <Weed x={60} h={420} />
    <Weed x={120} h={300} fill="#3BB57A" delay={-1} />
    <Weed x={1360} h={380} delay={-2} />
    <Weed x={1410} h={260} fill="#3BB57A" delay={-0.5} />
    {/* Coral and a sunken chest. */}
    <Cut d="M230 900 V820 M230 850 L200 800 M230 840 L262 790" fill="none" rim={0} edge={16} />
    <Ink d="M230 900 V820 M230 850 L200 800 M230 840 L262 790" w={10} stroke="#FF7A8A" />
    <g transform="translate(1180 880)">
      <Cut d="M-60 0 V-50 H60 V0 Z" fill="#8A5A3C" rim={0} />
      <Cut d="M-64 -50 Q0 -96 64 -50 Z" fill="#A0703C" rim={0} />
      <rect x={-10} y={-56} width={20} height={24} rx={4} fill="#FFD23F" stroke={INK} strokeWidth={4} />
      <Sparkle x={40} y={-90} k={12} className="anim-twinkle" />
    </g>
  </>
));

/** Raft Gamble: Rapids River with islands downstream. */
registerScene('river', () => (
  <>
    <rect width={1460} height={960} fill="#BFE6F7" />
    <g className="anim-drift">
      <Cloud x={300} y={110} s={1.1} />
      <Cloud x={1150} y={80} />
    </g>
    {/* The far bank and its trees. */}
    <Cut d="M0 330 Q730 280 1460 330 V420 H0 Z" fill="#7CC77F" rim={0} />
    {[90, 260, 1210, 1380].map((x, i) => (
      <g key={x} className="anim-sway" style={{ animationDelay: `${-i}s` }}>
        <rect x={x - 10} y={290} width={20} height={60} fill="#6B4A2B" stroke={INK} strokeWidth={4} />
        <Cut d={circ(x, 260 - (i % 2) * 20, 58 + (i % 2) * 12)} fill={i % 2 ? '#3E9A4E' : '#4FAF5C'} rim={0} />
      </g>
    ))}
    {/* The river. */}
    <rect y={400} width={1460} height={420} fill="#3D9BD1" />
    <g className="anim-drift" style={{ animationDuration: '6s' }}>
      <Ink d="M80 480 q30 -14 60 0 M420 540 q30 -14 60 0 M900 470 q30 -14 60 0 M1180 560 q30 -14 60 0 M240 640 q30 -14 60 0 M700 700 q30 -14 60 0 M1080 680 q30 -14 60 0 M1320 740 q30 -14 60 0" w={5} stroke="#BFE6F7" />
    </g>
    {/* Rapids. */}
    <g className="anim-bob" style={{ animationDuration: '0.9s' }}>
      <Ink d="M620 600 l20 -14 l20 14 l20 -14 l20 14 M1260 470 l16 -12 l16 12 l16 -12" w={5} stroke={PAPER} />
    </g>
    {/* Rocks. */}
    <Cut d="M560 620 Q590 580 630 600 Q660 620 640 640 H570 Z" fill="#8C8A96" rim={0} />
    <Cut d="M1230 486 Q1250 460 1280 470 Q1300 486 1290 500 H1236 Z" fill="#8C8A96" rim={0} />
    {/* The near bank with a jetty. */}
    <Cut d="M0 800 Q730 760 1460 800 V960 H0 Z" fill="#8CCB6E" rim={0} />
    <Cut d="M0 740 H260 V768 H0 Z" fill="#A0703C" rim={0} />
    {[40, 140, 240].map((x) => (
      <rect key={x} x={x - 8} y={760} width={16} height={60} fill="#6B4A2B" stroke={INK} strokeWidth={4} />
    ))}
    {/* Reeds. */}
    {[1260, 1300, 1340, 1390].map((x, i) => (
      <g key={x} className="anim-sway" style={{ animationDelay: `${-i * 0.5}s`, animationDuration: '3s' }}>
        <Ink d={`M${x} 860 V${740 - (i % 2) * 30}`} w={7} stroke="#4F7A2E" />
        <Cut d={rr(x - 8, 720 - (i % 2) * 30, 16, 40, 8)} fill="#8A5A3C" rim={0} edge={3.5} />
      </g>
    ))}
  </>
));

/** Crumble Tower: Wobbly Castle's courtyard. */
function Tower({ x, y, w, h, roof = '#C0392B', flag = '#FFD23F' }: { x: number; y: number; w: number; h: number; roof?: string; flag?: string }) {
  const cren = Array.from({ length: Math.floor(w / 36) }, (_, i) => (
    <rect key={i} x={x - w / 2 + 6 + i * 36} y={y - h - 22} width={22} height={26} fill="#B8B2A7" stroke={INK} strokeWidth={4} />
  ));
  return (
    <g>
      {cren}
      <Cut d={rr(x - w / 2, y - h, w, h, 6)} fill="#B8B2A7" />
      <Ink d={`M${x - w / 2} ${y - h * 0.66} H${x + w / 2} M${x - w / 2} ${y - h * 0.33} H${x + w / 2}`} w={3} opacity={0.4} />
      <Cut d={`M${x - w / 2 - 14} ${y - h - 20} L${x} ${y - h - 150} L${x + w / 2 + 14} ${y - h - 20} Z`} fill={roof} rim={0} />
      <Ink d={`M${x} ${y - h - 150} V${y - h - 210}`} w={5} />
      <path className="anim-flutter" d={`M${x} ${y - h - 210} L${x + 50} ${y - h - 196} L${x} ${y - h - 182} Z`} fill={flag} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <Cut d={`M${x - 16} ${y - h * 0.55} V${y - h * 0.7} Q${x} ${y - h * 0.8} ${x + 16} ${y - h * 0.7} V${y - h * 0.55} Z`} fill="#3B3346" rim={0} edge={4} />
    </g>
  );
}
registerScene('castle', () => (
  <>
    <rect width={1460} height={960} fill="#A7D8F0" />
    <g className="anim-drift">
      <Cloud x={560} y={120} s={1.2} />
      <Cloud x={960} y={170} s={0.9} />
    </g>
    <Cut d="M0 640 Q360 560 760 620 Q1100 560 1460 630 V960 H0 Z" fill="#8CCB6E" rim={0} />
    <Tower x={60} y={880} w={140} h={300} />
    <Tower x={1350} y={880} w={200} h={560} roof="#3D7BFF" flag="#FF4D5E" />
    {/* Curtain walls. */}
    <Cut d={rr(200, 620, 150, 260, 4)} fill="#A9A396" rim={0} />
    <Cut d={rr(1110, 620, 150, 260, 4)} fill="#A9A396" rim={0} />
    {/* Banners on the walls. */}
    {[275, 1185].map((x, i) => (
      <path key={x} className="anim-flutter" style={{ animationDuration: '2.2s' }} d={`M${x - 30} 650 H${x + 30} V760 L${x} 736 L${x - 30} 760 Z`} fill={i ? '#3D7BFF' : '#C0392B'} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    ))}
    <Cut d="M0 880 H1460 V960 H0 Z" fill="#C8AE84" rim={0} />
    <Ink d="M0 912 H1460" w={3} opacity={0.3} />
  </>
));

// ================================================================== demos

/** A cowboy hat for the Quick Draw demo. */
function Hat({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Cut d="M-44 6 Q0 -6 44 6 Q40 14 0 12 Q-40 14 -44 6 Z" fill="#A0643A" rim={0} edge={4} />
      <Cut d="M-22 4 Q-24 -30 0 -30 Q24 -30 22 4 Z" fill="#A0643A" rim={0} edge={4} />
      <rect x={-22} y={-6} width={44} height={7} fill="#C0392B" stroke={INK} strokeWidth={2.5} />
    </g>
  );
}

/** Quick Draw: hold, ignore the fake, let go on FIRE! */
registerDemo('quick-draw', () => {
  const t = useDemoTime(6, 3.5);
  const cue = between(t, 1, 1.7) ? 'fake' : t >= 2.9 ? 'go' : 'idle';
  const held = t < 3.1;
  return (
    <DemoFrame caption="Hold your phone. Let go on FIRE! Not on the fakes" bg="#FFE9CC">
      <DemoAvatar x={90} y={240} a={0} s={78} />
      <Hat x={90} y={196} />
      <DemoAvatar x={510} y={240} a={6} s={78} />
      <Hat x={510} y={196} />
      <DemoPhone x={300} y={190}>
        <path d={rr(-38, -70, 76, 136, 6)} fill={cue === 'go' ? '#FF4D5E' : cue === 'fake' ? '#9B5DE5' : '#B5793D'} stroke={INK} strokeWidth={2.5} />
        <text y={8} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={cue === 'idle' ? 16 : 22} fill={PAPER} stroke={INK} strokeWidth={4} paintOrder="stroke">
          {cue === 'go' ? 'FIRE!' : cue === 'fake' ? 'FISH!' : 'Hold…'}
        </text>
      </DemoPhone>
      <Finger x={300} y={210} down={held} />
      <Bubble x={300} y={48} text="Not yet!" fill="#EBDDFF" size={24} show={fade(t, 1.05, 1.9)} />
      <Bubble x={300} y={48} text="212 ms!" fill="#FFD23F" size={26} show={fade(t, 3.2, 5.8)} />
    </DemoFrame>
  );
});

/** Silent Trample: everyone rushes the +5 zone and it collapses; the lone +2 scores. */
registerDemo('silent-trample', () => {
  const t = useDemoTime(6.5, 3.4);
  const zones = [
    { x: 110, pts: 2 },
    { x: 300, pts: 5 },
    { x: 490, pts: 3 },
  ];
  const fell = t > 2.8;
  const runners = [
    { a: 0, from: 100, to: 260, z: 1 },
    { a: 4, from: 250, to: 300, z: 1 },
    { a: 9, from: 400, to: 340, z: 1 },
    { a: 2, from: 520, to: 110, z: 0 },
  ];
  return (
    <DemoFrame caption="Pick a zone. Three or more in one and it collapses!" bg="#FFF1CF">
      {zones.map((z, i) => {
        const drop = i === 1 ? key([[2.8, 0], [3.2, 26]], t) : 0;
        return (
          <g key={i} transform={`translate(0 ${drop})`}>
            <Cut d={rr(z.x - 80, 110, 160, 130, 26)} fill={i === 1 && fell ? '#6B4A2B' : '#E8D27A'} rim={0} />
            <text x={z.x} y={162} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={36} fill={i === 1 && fell ? '#E8D27A' : '#3F7F3A'} stroke={INK} strokeWidth={5} paintOrder="stroke">
              +{z.pts}
            </text>
          </g>
        );
      })}
      {runners.map((r, i) => {
        const x = key([[0.4 + i * 0.2, r.from], [1.4 + i * 0.2, r.to]], t);
        const y = key([[0.4 + i * 0.2, 320], [1.4 + i * 0.2, 214]], t) + (r.z === 1 ? key([[2.8, 0], [3.3, 40]], t) : 0);
        return (
          <g key={r.a} opacity={r.z === 1 ? 1 - fade(t, 3.3, 6.4) * 0.6 : 1}>
            <DemoAvatar x={x} y={y} a={r.a} s={56} />
          </g>
        );
      })}
      <Bubble x={300} y={62} text="Collapsed!" fill="#FFD0D5" size={24} show={fade(t, 2.9, 6.3)} />
      <Bubble x={110} y={62} text="+2" fill="#C9F2DC" size={24} show={fade(t, 3.3, 6.3)} />
    </DemoFrame>
  );
});

/** A little arched door. */
function Door({ x, y, n, state }: { x: number; y: number; n: number; state: 'shut' | 'safe' | 'trap' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Cut d="M-50 90 V-40 Q-50 -90 0 -90 Q50 -90 50 -40 V90 Z" fill={state === 'trap' ? INK : state === 'safe' ? '#FFE08A' : '#6B4A8A'} rim={0} />
      {state === 'shut' && <Ink d="M-17 -80 V90 M17 -80 V90" w={3} opacity={0.5} />}
      {state === 'trap' && (
        <g>
          <circle cx={-14} cy={-10} r={6} fill="#FFD23F" />
          <circle cx={14} cy={-10} r={6} fill="#FFD23F" />
        </g>
      )}
      {state === 'shut' && <circle cx={32} cy={10} r={7} fill="#FFD23F" stroke={INK} strokeWidth={3} />}
      <text y={-44} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={28} fill={PAPER} stroke={INK} strokeWidth={5} paintOrder="stroke">
        {n}
      </text>
    </g>
  );
}

/** Pick a Door: each player picks a door; the trap door drops whoever chose it. */
registerDemo('pick-a-door', () => {
  const t = useDemoTime(6.5, 3.6);
  const open = t > 2.8;
  const pickers = [
    { a: 0, door: 0 },
    { a: 4, door: 1 },
    { a: 9, door: 2 },
    { a: 2, door: 2 },
  ];
  const doorX = [150, 300, 450];
  return (
    <DemoFrame caption="Pick a door in secret. Behind a trap door, you're out" bg="#EAE3F7">
      {doorX.map((x, i) => (
        <Door key={i} x={x} y={170} n={i + 1} state={!open ? 'shut' : i === 1 ? 'trap' : 'safe'} />
      ))}
      {pickers.map((p, i) => {
        const x = key([[0.4 + i * 0.2, 90 + i * 140], [1.4 + i * 0.2, doorX[p.door]! + (p.a === 2 ? 30 : p.a === 9 ? -30 : 0)]], t);
        const fall = p.door === 1 ? key([[3, 0], [3.6, 120]], t) : 0;
        return (
          <g key={p.a} opacity={p.door === 1 ? 1 - fade(t, 3.3, 6.4) : 1}>
            <DemoAvatar x={x} y={300 + fall} a={p.a} s={60} />
          </g>
        );
      })}
      <Bubble x={300} y={46} text="Trap!" fill="#FFD0D5" size={26} show={fade(t, 2.9, 6.3)} />
    </DemoFrame>
  );
});

/** Pick a Door, trap-setters: a setter rigs a door on their phone; a picker walks into it. */
registerDemo('pick-a-door-setter', () => {
  const t = useDemoTime(7, 4.8);
  const set = t > 1.4;
  const open = t > 4;
  const doorX = [270, 390, 510];
  return (
    <DemoFrame caption="Trap-setters rig doors in secret. Pickers try to dodge them" bg="#F2E3EE">
      <DemoPhone x={100} y={190} s={0.95}>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <path d={rr(-30, -60 + i * 42, 60, 34, 8)} fill={set && i === 2 ? '#FF4D5E' : '#6B4A8A'} stroke={INK} strokeWidth={3} />
            <text y={-37 + i * 42} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={16} fill={PAPER}>
              Door {i + 1}
            </text>
          </g>
        ))}
      </DemoPhone>
      <Finger x={100} y={212} down={between(t, 1.1, 1.5)} show={fade(t, 0.5, 2.2)} />
      <Bubble x={100} y={48} text="Trap set" fill="#FFD0D5" size={20} show={fade(t, 1.5, 3.6)} />
      {doorX.map((x, i) => (
        <Door key={i} x={x} y={170} n={i + 1} state={!open ? 'shut' : i === 2 ? 'trap' : 'safe'} />
      ))}
      {[
        { a: 9, door: 0 },
        { a: 2, door: 2 },
      ].map((p, i) => {
        const x = key([[2 + i * 0.3, 300 + i * 120], [3 + i * 0.3, doorX[p.door]!]], t);
        const fall = p.door === 2 ? key([[4.2, 0], [4.8, 120]], t) : 0;
        return (
          <g key={p.a} opacity={p.door === 2 ? 1 - fade(t, 4.5, 6.9) : fade(t, 1.9, 6.9)}>
            <DemoAvatar x={x} y={300 + fall} a={p.a} s={58} />
          </g>
        );
      })}
      <Bubble x={440} y={46} text="Gotcha!" fill="#FFD23F" size={24} show={fade(t, 4.2, 6.8)} />
    </DemoFrame>
  );
});

/** Deep Sea Sonar: the host's sonar is blurry; your phone knows some cells exactly. */
registerDemo('deep-sea-sonar', () => {
  const t = useDemoTime(7, 4.6);
  const SEA = ['#1d3557', '#234e7a', '#3178a3', '#4aa6c8', '#86d0e2'];
  const blur = [1, 2, 1, 0, 2, 3, 2, 1, 1, 4, 3, 1, 0, 1, 2, 2];
  const exact = new Map([
    [5, 5],
    [9, 7],
    [14, 3],
  ]);
  const cell = (i: number, ox: number, oy: number, s: number) => ({ x: ox + (i % 4) * s, y: oy + Math.floor(i / 4) * s });
  const net = t > 2;
  const tangle = t > 3.4;
  return (
    <DemoFrame caption="Your phone shows exact fish. Two nets in one spot catch nothing" bg="#DDF1FA">
      <path d={rr(40, 50, 260, 260, 20)} fill={INK} />
      {blur.map((v, i) => {
        const c = cell(i, 50, 60, 60);
        return <rect key={i} x={c.x} y={c.y} width={56} height={56} rx={8} fill={SEA[v]} />;
      })}
      {net && (
        <g>
          <DemoAvatar x={cell(9, 50, 60, 60).x + 28} y={cell(9, 50, 60, 60).y + 28} a={0} s={46} />
          <Bubble x={cell(9, 50, 60, 60).x + 28} y={cell(9, 50, 60, 60).y - 8} text="+7" fill="#C9F2DC" size={18} show={fade(t, 2.2, 6.8)} />
        </g>
      )}
      {tangle && (
        <g>
          <rect x={cell(5, 50, 60, 60).x} y={cell(5, 50, 60, 60).y} width={56} height={56} rx={8} fill="none" stroke="#FF4D5E" strokeWidth={6} />
          <DemoAvatar x={cell(5, 50, 60, 60).x + 16} y={cell(5, 50, 60, 60).y + 30} a={4} s={34} />
          <DemoAvatar x={cell(5, 50, 60, 60).x + 40} y={cell(5, 50, 60, 60).y + 30} a={9} s={34} />
          <Bubble x={cell(5, 50, 60, 60).x + 28} y={cell(5, 50, 60, 60).y - 10} text="Tangled!" fill="#FFD0D5" size={18} />
        </g>
      )}
      <DemoPhone x={455} y={185} s={1.5}>
        {blur.map((v, i) => {
          const c = cell(i, -34, -56, 17.5);
          const e = exact.get(i);
          return (
            <g key={i}>
              <rect x={c.x} y={c.y} width={16} height={16} rx={3} fill={i === 9 && net ? '#FFD23F' : SEA[e ?? v]} stroke={e !== undefined ? PAPER : 'none'} strokeWidth={1.5} />
              {e !== undefined && (
                <text x={c.x + 8} y={c.y + 12.5} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={11} fill={i === 9 && net ? INK : PAPER}>
                  {e}
                </text>
              )}
            </g>
          );
        })}
      </DemoPhone>
      <Finger x={455 + (cell(9, -34, -56, 17.5).x + 8) * 1.5} y={185 + (cell(9, -34, -56, 17.5).y + 8) * 1.5} down={between(t, 1.6, 2)} show={fade(t, 1, 2.6)} />
    </DemoFrame>
  );
});

/** Raft Gamble: one player banks on an island; the raft sinks on the next leg. */
registerDemo('raft-gamble', () => {
  const t = useDemoTime(7, 4.8);
  const islands = [90, 230, 370, 510];
  const raftX = key([[0.3, 90], [1.3, 230], [2.6, 230], [3.6, 370]], t);
  const sink = t > 3.8;
  const banked = t > 1.8;
  return (
    <DemoFrame caption="Bank your treasure, or ride on for more. If the raft sinks, it's lost" bg="#D9F0FA">
      <rect x={8} y={130} width={584} height={170} fill="#3D9BD1" />
      <Ink d="M40 170 q20 -10 40 0 M300 250 q20 -10 40 0 M470 180 q20 -10 40 0" w={4} stroke="#BFE6F7" />
      {islands.map((x, i) => (
        <g key={x}>
          <Cut d={`M${x - 44} 130 Q${x} 90 ${x + 44} 130 Z`} fill="#E8C77A" rim={0} />
          <text x={x} y={124} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} fill={INK}>
            {i + 1}
          </text>
        </g>
      ))}
      <g transform={`translate(${raftX} ${210 + (sink ? key([[3.8, 0], [4.4, 50]], t) : 0)}) rotate(${sink ? key([[3.8, 0], [4.4, 14]], t) : 0})`} opacity={sink ? 1 - fade(t, 4.2, 6.9) * 0.7 : 1}>
        <Cut d={rr(-80, 0, 160, 26, 10)} fill="#A0703C" rim={0} />
        <Ink d="M-40 0 V26 M0 0 V26 M40 0 V26" w={3} />
        <DemoAvatar x={-40} y={-18} a={0} s={46} />
        <DemoAvatar x={40} y={-18} a={9} s={46} />
        {!banked && <DemoAvatar x={0} y={-18} a={4} s={46} />}
      </g>
      {banked && (
        <g>
          <DemoAvatar x={key([[1.8, 230], [2.4, 160]], t)} y={key([[1.8, 192], [2.4, 330]], t)} a={4} s={46} />
          <Bubble x={230} y={340} text="Banked 6!" fill="#FFD23F" size={20} show={fade(t, 2.3, 6.8)} />
        </g>
      )}
      <Bubble x={440} y={60} text="Sank!" fill="#FFD0D5" size={26} show={fade(t, 4, 6.8)} />
    </DemoFrame>
  );
});

/** Crumble Tower: pull blocks for points; a row with no middle and a side topples it. */
registerDemo('crumble-tower', () => {
  const t = useDemoTime(7, 4);
  const rows = 5;
  const firstOut = t > 1;
  const secondOut = t > 2.4;
  const tip = key([[2.9, 0], [3.8, 24]], t);
  return (
    <DemoFrame caption="Pull a block: higher scores more. No middle and a side? It topples!" bg="#E3F1FA">
      <rect x={8} y={316} width={584} height={36} fill="#C8AE84" />
      <g transform={`rotate(${tip} 390 316)`}>
        {Array.from({ length: rows }, (_, r) =>
          [0, 1, 2].map((c) => {
            const out = r === 1 && ((c === 1 && firstOut) || (c === 2 && secondOut));
            const slide = r === 1 && c === 1 ? key([[0.6, 0], [1, -150]], t) : r === 1 && c === 2 ? key([[2, 0], [2.4, 150]], t) : 0;
            if (out && Math.abs(slide) >= 150) return null;
            return <Cut key={`${r}${c}`} d={rr(210 + c * 60 + slide, 272 - r * 44, 58, 42, 6)} fill={r % 2 ? '#A9A396' : '#B8B2A7'} rim={0} edge={4} />;
          }),
        )}
      </g>
      <Bubble x={140} y={200} text="+1" fill="#C9F2DC" size={22} show={fade(t, 1, 2.2)} />
      <Bubble x={470} y={200} text="+1" fill="#C9F2DC" size={22} show={fade(t, 2.4, 3)} />
      <Bubble x={300} y={48} text="Toppled!" fill="#FFD0D5" size={26} show={fade(t, 3.1, 6.8)} />
    </DemoFrame>
  );
});
