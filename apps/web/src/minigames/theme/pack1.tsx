import { between, Bubble, DemoAvatar, DemoFrame, DemoPhone, fade, Finger, key, useDemoTime } from './demo.tsx';
import { Bunting, circ, Cloud, Cut, INK, Ink, PAPER, rr, Sparkle, star } from './paper.tsx';
import { registerDemo, registerScene } from './themes.tsx';
import './skins1.css';

/**
 * Pack 1: the TV studio (Lowest Unique Number), the clockmaker's workshop (Stopwatch Chicken),
 * the sleepy sheep meadow (Count Together), the mud pit fair (Tug of War) and the midnight woods
 * (Hunter vs Hiders).
 */

// ================================================================== scenes

/** Lowest Unique Number: a paper TV game-show studio. */
registerScene('studio', () => (
  <>
    <rect width={1460} height={960} fill="#3B2A5C" />
    {/* Wall panels. */}
    {Array.from({ length: 9 }, (_, i) => (
      <rect key={i} x={i * 170 - 40} y={0} width={120} height={960} fill="#46336B" />
    ))}
    {/* Spotlight beams from the rig. */}
    {[240, 730, 1220].map((x, i) => (
      <g key={x} className="anim-sway" style={{ animationDuration: `${6 + i}s`, transformOrigin: `${x}px 60px` }}>
        <path d={`M${x - 26} 70 L${x - 190} 960 H${x + 190} L${x + 26} 70 Z`} fill="#FFE98A" opacity={0.12} />
      </g>
    ))}
    <rect x={0} y={0} width={1460} height={60} fill="#2A1E42" />
    {[240, 730, 1220].map((x) => (
      <g key={x}>
        <Cut d={rr(x - 36, 34, 72, 50, 14)} fill="#595067" rim={0} />
        <circle cx={x} cy={80} r={16} fill="#FFE98A" stroke={INK} strokeWidth={4} />
      </g>
    ))}
    {/* Curtains. */}
    {[
      [0, 1],
      [1460, -1],
    ].map(([x, dir]) => (
      <g key={x} transform={`translate(${x} 0) scale(${dir} 1)`}>
        <Cut d="M0 0 H150 Q130 260 170 520 Q120 700 150 960 H0 Z" fill="#D0463D" rim={10} />
        <Ink d="M40 0 Q30 400 50 960 M90 0 Q80 400 100 960" w={4} />
        <Cut d="M120 500 Q160 490 175 520 Q160 552 120 540 Z" fill="#FFD23F" rim={0} />
      </g>
    ))}
    {/* Stage floor with a bulb marquee. */}
    <Cut d="M0 860 H1460 V960 H0 Z" fill="#B57B4E" rim={0} />
    <rect x={0} y={860} width={1460} height={22} fill="#FFD23F" stroke={INK} strokeWidth={5} />
    {Array.from({ length: 24 }, (_, i) => (
      <circle key={i} className="anim-twinkle" style={{ animationDelay: `${-(i % 4) * 0.6}s` }} cx={30 + i * 61} cy={871} r={7} fill="#FFF6CC" stroke={INK} strokeWidth={2.5} />
    ))}
  </>
));

/** Stopwatch Chicken: the clockmaker's workshop. */
function Gear({ x, y, r, teeth, fill, dur, rev = false }: { x: number; y: number; r: number; teeth: number; fill: string; dur: number; rev?: boolean }) {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const k = i % 2 ? r * 0.82 : r;
    pts.push(`${(Math.cos(a) * k).toFixed(1)} ${(Math.sin(a) * k).toFixed(1)}`);
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="anim-spin" style={{ animationDuration: `${dur}s`, animationDirection: rev ? 'reverse' : 'normal' }}>
        <Cut d={`M${pts.join('L')}Z`} fill={fill} rim={0} />
        <circle r={r * 0.3} fill="#F4E9D3" stroke={INK} strokeWidth={5} />
      </g>
    </g>
  );
}
registerScene('workshop', () => (
  <>
    <rect width={1460} height={960} fill="#E8CDA2" />
    {Array.from({ length: 12 }, (_, i) => (
      <rect key={i} x={0} y={i * 80} width={1460} height={4} fill="#D9B784" />
    ))}
    <Gear x={70} y={140} r={150} teeth={14} fill="#C9892B" dur={30} />
    <Gear x={250} y={330} r={80} teeth={9} fill="#B87333" dur={16} rev />
    <Gear x={1420} y={760} r={170} teeth={16} fill="#C9892B" dur={34} rev />
    {/* A shelf of little clocks. */}
    <Cut d={rr(1080, 150, 360, 26, 8)} fill="#8A5A3C" rim={0} />
    {[1130, 1230, 1340].map((x, i) => (
      <g key={x}>
        <Cut d={circ(x, 110 - (i % 2) * 12, 38 + (i % 2) * 8)} fill={['#FFF6E5', '#FFD23F', '#FFF6E5'][i]!} rim={8} />
        <Ink d={`M${x} ${110 - (i % 2) * 12} V${85 - (i % 2) * 12} M${x} ${110 - (i % 2) * 12} H${x + 20}`} w={5} />
      </g>
    ))}
    {/* Grandfather clock with a swinging pendulum. */}
    <Cut d={rr(30, 470, 170, 490, 18)} fill="#8A5A3C" />
    <Cut d={circ(115, 560, 58)} fill="#FFF6E5" rim={0} />
    <Ink d="M115 560 V520 M115 560 L140 575" w={6} />
    <rect x={62} y={640} width={106} height={290} rx={10} fill="#5C3A25" stroke={INK} strokeWidth={4} />
    <g className="anim-sway" style={{ transformOrigin: '115px 650px', animationDuration: '1.2s' }}>
      <Ink d="M115 650 V860" w={5} />
      <Cut d={circ(115, 870, 26)} fill="#FFD23F" rim={0} />
    </g>
    {/* Workbench. */}
    <Cut d="M0 900 H1460 V960 H0 Z" fill="#A86B42" rim={0} />
  </>
));

/** Count Together: a sleepy moonlit meadow where the sheep take turns to hop the fence. */
export function Sheep({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="anim-bob" style={{ animationDuration: '1.4s', animationDelay: `${delay}s` }}>
        <Cut d="M-46 0 Q-56 -30 -30 -36 Q-20 -56 4 -48 Q26 -60 40 -40 Q62 -34 52 -8 Q56 12 30 12 H-30 Q-54 16 -46 0 Z" fill={PAPER} rim={0} />
        <Cut d={rr(34, -34, 30, 30, 12)} fill="#3B3346" rim={0} />
        <circle cx={54} cy={-22} r={3} fill={PAPER} />
        <Ink d="M-26 12 V32 M-6 12 V32 M16 12 V32 M32 12 V32" w={6} />
      </g>
    </g>
  );
}
registerScene('sheepfield', () => (
  <>
    <rect width={1460} height={960} fill="#2C2F6B" />
    {Array.from({ length: 36 }, (_, i) => (
      <Sparkle key={i} className="anim-twinkle" x={(i * 331) % 1440 + 10} y={(i * 97) % 520 + 20} k={6 + (i % 3) * 3} fill="#FFF6CC" />
    ))}
    <Cut d={circ(1240, 150, 80)} fill="#FFF3B0" rim={0} />
    <circle cx={1210} cy={130} r={16} fill="#EFE0A0" />
    <Cut d="M0 700 Q300 600 620 690 Q950 600 1460 700 V960 H0 Z" fill="#35644A" rim={0} />
    <Cut d="M0 820 Q420 740 820 810 Q1180 760 1460 820 V960 H0 Z" fill="#2B5240" rim={0} />
    {/* The fence the sheep hop. */}
    {Array.from({ length: 16 }, (_, i) => (
      <Cut key={i} d={rr(i * 96 + 10, 780, 20, 110, 6)} fill="#C9A06C" rim={0} edge={4} />
    ))}
    <Cut d={rr(0, 806, 1460, 16, 6)} fill="#C9A06C" rim={0} edge={4} />
    <Cut d={rr(0, 846, 1460, 16, 6)} fill="#C9A06C" rim={0} edge={4} />
    <Sheep x={140} y={750} s={1.2} />
    <Sheep x={1330} y={745} s={1.1} delay={-0.7} />
    <text x={1310} y={640} fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={40} fill="#FFF3B0" className="anim-bob">
      z z z
    </text>
  </>
));

/** Tug of War: the mud pit fair. */
registerScene('mudpit', () => (
  <>
    <rect width={1460} height={960} fill="#9FD8F2" />
    <g className="anim-drift">
      <Cloud x={260} y={130} s={1.3} />
      <Cloud x={1120} y={100} s={1.1} />
    </g>
    <Bunting x1={-20} x2={1480} y={40} sag={40} n={16} />
    {/* Striped fair tents at the sides. */}
    {[
      [150, '#FF4D5E'],
      [1310, '#3D7BFF'],
    ].map(([x, c]) => (
      <g key={x as number}>
        <Cut d={`M${(x as number) - 140} 620 L${x} 380 L${(x as number) + 140} 620 Z`} fill={c as string} />
        <Ink d={`M${x} 380 L${(x as number) - 50} 620 M${x} 380 L${(x as number) + 50} 620`} w={4} />
        <Cut d={rr((x as number) - 110, 620, 220, 160, 8)} fill={PAPER} rim={0} />
        <Cut d={`M${(x as number) - 30} 780 V690 Q${x} 660 ${(x as number) + 30} 690 V780 Z`} fill="#3B2A5C" rim={0} edge={4} />
      </g>
    ))}
    <Cut d="M0 720 Q730 640 1460 720 V960 H0 Z" fill="#7CC77F" rim={0} />
    {/* The mud pit itself. */}
    <Cut d="M430 880 Q730 780 1030 880 Q730 960 430 880 Z" fill="#8A5A3C" />
    {[560, 700, 880].map((x, i) => (
      <circle key={x} className="anim-twinkle" style={{ animationDuration: `${1.6 + i * 0.4}s` }} cx={x} cy={872 + (i % 2) * 10} r={10} fill="#A8744F" stroke={INK} strokeWidth={3} />
    ))}
  </>
));

/** Hunter vs Hiders: the midnight woods. */
function Pine({ x, y, s = 1, fill = '#1F4F3A' }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Cut d="M0 -260 L70 -130 H40 L100 -20 H-100 L-40 -130 H-70 Z" fill={fill} rim={0} />
      <rect x={-12} y={-20} width={24} height={40} fill="#4A3228" stroke={INK} strokeWidth={4} />
    </g>
  );
}
registerScene('nightwoods', () => (
  <>
    <rect width={1460} height={960} fill="#17263F" />
    <Cut d={circ(1180, 140, 70)} fill="#FFF3B0" rim={0} />
    {Array.from({ length: 20 }, (_, i) => (
      <Sparkle key={i} className="anim-twinkle" x={(i * 283) % 1440 + 10} y={(i * 71) % 300 + 20} k={5} fill="#FFF6CC" />
    ))}
    {[-40, 180, 1280, 1500].map((x, i) => (
      <Pine key={x} x={x} y={900} s={1.6 - (i % 2) * 0.2} fill={i % 2 ? '#1F4F3A' : '#255C44'} />
    ))}
    {[90, 1370].map((x, i) => (
      <Pine key={x} x={x} y={960} s={1.9} fill={i ? '#183F2F' : '#1B4634'} />
    ))}
    {/* An owl watching from a hollow. */}
    <g transform="translate(1290 420)">
      <Cut d={circ(0, 0, 44)} fill="#3A2A20" rim={0} />
      <circle cx={-14} cy={-4} r={11} fill="#FFD23F" stroke={INK} strokeWidth={3} className="anim-blink" />
      <circle cx={14} cy={-4} r={11} fill="#FFD23F" stroke={INK} strokeWidth={3} className="anim-blink" />
    </g>
    {/* Fireflies. */}
    {Array.from({ length: 14 }, (_, i) => (
      <circle key={i} className="anim-twinkle" style={{ animationDelay: `${-i * 0.37}s` }} cx={(i * 211) % 1400 + 30} cy={500 + ((i * 131) % 380)} r={6} fill="#E8FF7A" />
    ))}
    <Cut d="M0 900 Q730 850 1460 900 V960 H0 Z" fill="#12321F" rim={0} />
  </>
));

// ================================================================== demos

/** Lowest Unique Number: four picks, two clash on 2, the lone 3 wins. */
registerDemo('lowest-unique', () => {
  const t = useDemoTime(6.5, 4.5);
  const picks = [
    { a: 0, n: 2, x: 100 },
    { a: 4, n: 2, x: 230 },
    { a: 2, n: 3, x: 370 },
    { a: 11, n: 5, x: 500 },
  ];
  return (
    <DemoFrame caption="The lowest number nobody else picked wins" bg="#EFE6FF">
      {picks.map((p, i) => {
        const shown = fade(t, 0.3 + i * 0.3, 6.3);
        const clash = p.n === 2 && t > 2.8;
        const win = p.n === 3 && t > 3.6;
        return (
          <g key={i}>
            <DemoAvatar x={p.x} y={255} a={p.a} s={70} />
            <g opacity={shown} transform={`translate(${p.x} ${150 - (win ? key([[3.6, 0], [3.9, 14], [4.2, 8]], t) : 0)})`}>
              <Cut d={rr(-42, -46, 84, 84, 16)} fill={clash ? '#FFD0D5' : win ? '#FFD23F' : PAPER} rim={0} />
              <text y={18} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={52} fill={INK}>
                {p.n}
              </text>
              {clash && <Ink d="M-30 -30 L30 30 M30 -30 L-30 30" w={8} stroke="#E5484D" />}
            </g>
          </g>
        );
      })}
      <Bubble x={166} y={60} text="Clash!" fill="#FFD0D5" show={fade(t, 2.9, 6.3)} />
      <g opacity={fade(t, 3.7, 6.3)}>
        <Sparkle x={330} y={70} k={14} />
        <Sparkle x={420} y={100} k={10} />
        <Bubble x={370} y={330} text="Winner!" fill="#FFD23F" size={24} />
      </g>
    </DemoFrame>
  );
});

/** Stopwatch Chicken: the clock goes dark after 3 s; stop near the target without going over. */
registerDemo('stopwatch-chicken', () => {
  const t = useDemoTime(7, 5.6);
  const running = Math.min(t, 5.2);
  const dark = t > 3 && t < 5.2;
  const stopped = t >= 5.2;
  return (
    <DemoFrame caption="Stop the hidden clock as close to 6.0 as you dare: over is bust" bg="#FFF3DC">
      <text x={300} y={70} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={30} fill={INK}>
        Target 6.0 s
      </text>
      <g transform="translate(300 175)">
        <Cut d={rr(-170, -62, 340, 124, 26)} fill={dark ? INK : PAPER} rim={0} />
        <text y={28} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={80} fill={dark ? PAPER : INK}>
          {dark ? '?.??' : running.toFixed(2)}
        </text>
      </g>
      <DemoPhone x={510} y={250} s={0.75}>
        <Cut d={circ(0, -10, 30)} fill={stopped ? '#2EC27E' : '#FF4D5E'} rim={0} />
        <text y={46} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={18} fill={INK}>
          STOP
        </text>
      </DemoPhone>
      <Finger x={510} y={240} down={between(t, 5.1, 5.5)} show={fade(t, 4.4, 6.9)} />
      <Bubble x={210} y={310} text="0.8 under: nice!" fill="#C9F2DC" size={22} show={fade(t, 5.4, 6.9)} />
    </DemoFrame>
  );
});

/** Count Together: take turns 1, 2, 3… two at once on 4 and it resets. */
registerDemo('count-to', () => {
  const t = useDemoTime(7, 4.6);
  const calls = [
    { a: 0, x: 120, at: 0.6, n: '1' },
    { a: 9, x: 300, at: 1.5, n: '2' },
    { a: 2, x: 480, at: 2.4, n: '3' },
  ];
  const clash = t > 3.6;
  return (
    <DemoFrame caption="Count up in turns without talking. Two at once? Back to zero!" bg="#E6E9FF">
      {calls.map((c) => (
        <g key={c.a}>
          <DemoAvatar x={c.x} y={260} a={c.a} s={70} />
          <Bubble x={c.x} y={150} text={c.n} size={40} show={fade(t, c.at, 3.5)} />
        </g>
      ))}
      <g opacity={fade(t, 3.5, 6.8)}>
        <Bubble x={210} y={150} text="4" size={40} fill="#FFD0D5" />
        <Bubble x={390} y={150} text="4" size={40} fill="#FFD0D5" />
        <path d={star(300, 100, 40, 18)} fill="#FF7A1A" stroke={INK} strokeWidth={4} strokeLinejoin="round" transform={`rotate(${key([[3.6, 0], [4.2, 20]], t)} 300 100)`} />
        <Bubble x={300} y={330} text={clash ? 'Back to 0!' : ''} fill="#FFD0D5" size={24} />
      </g>
    </DemoFrame>
  );
});

/** Tug of War: mash to pull; freeze when the rope flashes red. */
registerDemo('tug-of-war', () => {
  const t = useDemoTime(7, 2);
  const slippery = between(t, 3.4, 5);
  const knot = key([[0, 0], [3.3, 70], [5, 40], [7, 140]], t);
  const mash = !slippery && Math.floor(t * 8) % 2 === 0;
  return (
    <DemoFrame caption="Mash to pull. When the rope flashes red, stop!" bg="#E7F7E4">
      <Cut d="M60 200 H540 V214 H60 Z" fill={slippery ? '#FF4D5E' : '#C9A06C'} rim={0} edge={4} />
      <Cut d={rr(290 + knot - 14, 186, 28, 42, 8)} fill="#FF4D5E" rim={0} />
      <path d="M300 170 V250" stroke={INK} strokeWidth={4} strokeDasharray="8 8" />
      {[
        { a: 0, x: 80 + knot * 0.5 },
        { a: 4, x: 150 + knot * 0.5 },
      ].map((p) => (
        <DemoAvatar key={p.a} x={p.x} y={200} a={p.a} s={64} />
      ))}
      {[
        { a: 9, x: 450 + knot * 0.5 },
        { a: 2, x: 520 + knot * 0.5 },
      ].map((p) => (
        <DemoAvatar key={p.a} x={p.x} y={200} a={p.a} s={64} />
      ))}
      <Finger x={300} y={275} down={mash} />
      <Bubble x={300} y={80} text={slippery ? 'STOP!' : 'PULL!'} fill={slippery ? '#FFD0D5' : '#FFD23F'} size={34} />
    </DemoFrame>
  );
});

/** Hunter vs Hiders: hiders pick zones; the hunter searches three. */
registerDemo('hunter-vs-hiders', () => {
  const t = useDemoTime(7.5, 5);
  const zones = Array.from({ length: 8 }, (_, i) => ({ x: 95 + (i % 4) * 137, y: 130 + Math.floor(i / 4) * 120 }));
  const hiders = [
    { a: 2, z: 1, at: 0.6 },
    { a: 9, z: 4, at: 1.0 },
    { a: 11, z: 6, at: 1.4 },
  ];
  const searches = [
    { z: 0, at: 2.6 },
    { z: 4, at: 3.6 },
    { z: 7, at: 4.6 },
  ];
  const caught = t > 3.9;
  return (
    <DemoFrame caption="Hiders pick a zone in secret. The hunter searches three" bg="#E3ECF5">
      {zones.map((z, i) => (
        <g key={i}>
          <Cut d={rr(z.x - 58, z.y - 48, 116, 96, 22)} fill="#6FA86F" rim={0} edge={4} />
          <text x={z.x - 44} y={z.y - 24} fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={20} fill={PAPER}>
            {i + 1}
          </text>
        </g>
      ))}
      {hiders.map((h) => (
        <g key={h.a} opacity={fade(t, h.at, 7.3)}>
          <DemoAvatar x={zones[h.z]!.x} y={zones[h.z]!.y + 6} a={h.a} s={h.z === 4 && caught ? 64 : 54} />
        </g>
      ))}
      {searches.map((sr) => (
        <circle key={sr.z} cx={zones[sr.z]!.x} cy={zones[sr.z]!.y} r={60} fill="#FFF3B0" opacity={0.45 * fade(t, sr.at, 7.3)} stroke="#FFD23F" strokeWidth={5} />
      ))}
      <Bubble x={zones[4]!.x + 40} y={zones[4]!.y - 60} text="Caught!" fill="#FFD0D5" size={22} show={fade(t, 3.9, 7.3)} />
    </DemoFrame>
  );
});

