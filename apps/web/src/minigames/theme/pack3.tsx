import { Sheep } from './pack1.tsx';
import { between, Bubble, DemoAvatar, DemoFrame, DemoPhone, fade, Finger, key, useDemoTime } from './demo.tsx';
import { Bunting, circ, Cloud, Cut, INK, Ink, PAPER, rr } from './paper.tsx';
import { registerDemo, registerScene } from './themes.tsx';
import './skins3.css';

/**
 * Pack 3: Woolly Farm (Herd Mentality), the Detective Agency (Odd One Out), the Paper Post Office
 * (Who Wrote That?), the Big Match (Predict the Crowd), the Sumo Dojo (Sumo Programming) and Windy
 * Hills / Fortress Ridge (Artillery, both ways).
 */

const FONT = 'Fredoka, sans-serif';

// ================================================================== scenes

/** Herd Mentality: a red barn, a windmill and the herd in the paddock. */
registerScene('farm', () => (
  <>
    <rect width={1460} height={960} fill="#BFE6F7" />
    <g className="anim-drift">
      <Cloud x={620} y={110} s={1.2} />
      <Cloud x={980} y={170} s={0.8} />
    </g>
    <Cut d="M0 600 Q400 520 800 580 Q1150 530 1460 590 V960 H0 Z" fill="#8CCB6E" rim={0} />
    {/* The barn. */}
    <g>
      <Cut d="M-20 380 L130 250 L280 380 V860 H-20 Z" fill="#D0463D" />
      <Ink d="M-40 392 L130 236 L300 392" w={22} />
      <Ink d="M-40 392 L130 236 L300 392" w={12} stroke={PAPER} />
      <Cut d={rr(60, 600, 140, 260, 6)} fill="#A8322B" rim={0} />
      <Ink d="M60 600 L200 860 M200 600 L60 860" w={10} stroke={PAPER} />
      <Ink d="M60 600 L200 860 M200 600 L60 860" w={4} />
      <Cut d={circ(130, 420, 40)} fill="#FFE08A" rim={0} />
    </g>
    {/* The windmill. */}
    <g transform="translate(1310 640)">
      <Cut d="M-40 0 L-24 -300 H24 L40 0 Z" fill="#E8E0CF" />
      <g transform="translate(0 -300)">
        <g className="anim-spin" style={{ animationDuration: '9s' }}>
          {[0, 90, 180, 270].map((a) => (
            <Cut key={a} d="M-10 0 L-24 -170 H24 L10 0 Z" fill="#F4E9D3" rim={0} edge={4} transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r={16} fill="#D0463D" stroke={INK} strokeWidth={4} />
      </g>
    </g>
    {/* The paddock fence and the herd. */}
    {Array.from({ length: 9 }, (_, i) => (
      <Cut key={i} d={rr(300 + i * 110, 780, 18, 90, 5)} fill="#C9A06C" rim={0} edge={4} />
    ))}
    <Cut d={rr(290, 800, 900, 14, 5)} fill="#C9A06C" rim={0} edge={4} />
    <Cut d={rr(290, 836, 900, 14, 5)} fill="#C9A06C" rim={0} edge={4} />
    <Sheep x={420} y={740} s={0.9} />
    <Sheep x={1060} y={736} s={0.8} delay={-0.5} />
    <Cut d="M0 880 Q730 850 1460 880 V960 H0 Z" fill="#7CBF62" rim={0} />
  </>
));

/** Odd One Out: a detective's office after dark. */
registerScene('detective', () => (
  <>
    <rect width={1460} height={960} fill="#4F5D75" />
    {/* Wallpaper stripes. */}
    {Array.from({ length: 16 }, (_, i) => (
      <rect key={i} x={i * 96} y={0} width={40} height={960} fill="#56647D" />
    ))}
    {/* A window with the rain outside. */}
    <g>
      <Cut d={rr(1080, 90, 320, 380, 10)} fill="#23304A" />
      <Ink d="M1240 90 V470 M1080 280 H1400" w={10} />
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i} className="anim-bob" style={{ animationDuration: '0.8s', animationDelay: `${-i * 0.13}s` }}>
          <Ink d={`M${1100 + ((i * 53) % 280)} ${120 + ((i * 97) % 300)} l-8 22`} w={3} stroke="#9FB6D6" />
        </g>
      ))}
      <Cut d={circ(1320, 170, 30)} fill="#F4E9C1" rim={0} edge={3} />
    </g>
    {/* The pinboard of clues with red string. */}
    <g>
      <Cut d={rr(40, 110, 330, 280, 10)} fill="#B5793D" />
      {[
        [90, 150, '#FFF6CC', -4],
        [220, 140, '#FFFFFF', 3],
        [120, 270, '#FFFFFF', 5],
        [260, 260, '#FFD0D5', -3],
      ].map(([x, y, c, r], i) => (
        <g key={i} transform={`rotate(${r} ${x} ${y})`}>
          <Cut d={rr(x as number, y as number, 80, 90, 4)} fill={c as string} rim={0} edge={3} />
          <circle cx={(x as number) + 40} cy={(y as number) + 8} r={7} fill="#D0463D" stroke={INK} strokeWidth={2.5} />
        </g>
      ))}
      <Ink d="M130 158 L260 148 L300 268 L160 278 Z" w={3} stroke="#D0463D" />
    </g>
    {/* A desk lamp's pool of light and a magnifying glass. */}
    <path d="M1150 560 L990 900 H1460 V560 Z" fill="#FFE98A" opacity={0.14} />
    <Cut d="M1160 560 L1220 500 L1260 540 L1210 590 Z" fill="#2E7A4F" />
    <Ink d="M1230 520 L1300 600 V880" w={8} />
    <Cut d="M0 860 H1460 V960 H0 Z" fill="#6B4A2B" rim={0} />
    <g transform="translate(180 800) rotate(-24)">
      <Ink d="M44 0 H130" w={16} />
      <Ink d="M44 0 H130" w={9} stroke="#8A5A3C" />
      <Cut d={circ(0, 0, 50)} fill="#CFE8F2" rim={0} edge={10} />
      <path d="M-20 -26 Q-6 -34 8 -30" fill="none" stroke={PAPER} strokeWidth={6} strokeLinecap="round" />
    </g>
    {/* A hat on the hook. */}
    <g transform="translate(1340 640)">
      <Cut d="M-70 10 Q0 -6 70 10 Q60 22 0 20 Q-60 22 -70 10 Z" fill="#6B5A48" rim={0} />
      <Cut d="M-40 10 Q-44 -46 0 -46 Q44 -46 40 10 Z" fill="#6B5A48" rim={0} />
      <rect x={-40} y={-8} width={80} height={10} fill={INK} />
    </g>
  </>
));

/** Who Wrote That?: the sorting room of the Paper Post Office. */
function Envelope({ x, y, r = 0, fill = '#FFF6E5' }: { x: number; y: number; r?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <Cut d={rr(-60, -40, 120, 80, 6)} fill={fill} rim={0} edge={4} />
      <Ink d="M-60 -36 L0 8 L60 -36" w={4} />
      <rect x={28} y={-30} width={22} height={26} fill="#D0463D" stroke={INK} strokeWidth={3} />
    </g>
  );
}
registerScene('postoffice', () => (
  <>
    <rect width={1460} height={960} fill="#F1DDBA" />
    <rect y={0} width={1460} height={90} fill="#D0463D" />
    <Ink d="M0 90 H1460" w={6} />
    {/* Pigeonholes on both walls. */}
    {[
      [30, 150],
      [1170, 150],
    ].map(([x0, y0]) => (
      <g key={x0}>
        <Cut d={rr(x0!, y0!, 260, 520, 8)} fill="#A0703C" />
        {Array.from({ length: 12 }, (_, i) => {
          const x = x0! + 16 + (i % 3) * 80;
          const y = y0! + 16 + Math.floor(i / 3) * 124;
          return (
            <g key={i}>
              <rect x={x} y={y} width={68} height={108} rx={4} fill="#6B4A2B" stroke={INK} strokeWidth={3} />
              {i % 4 !== 1 && <rect x={x + 8} y={y + 40} width={52} height={60} rx={3} fill={i % 3 ? '#FFF6E5' : '#CFE8F2'} stroke={INK} strokeWidth={2.5} />}
            </g>
          );
        })}
      </g>
    ))}
    {/* Letters fluttering down. */}
    <g className="anim-bob" style={{ animationDuration: '2.8s' }}>
      <Envelope x={420} y={220} r={-12} />
    </g>
    <g className="anim-bob" style={{ animationDuration: '3.4s', animationDelay: '-1s' }}>
      <Envelope x={1040} y={260} r={14} fill="#CFE8F2" />
    </g>
    {/* The counter. */}
    <Cut d="M0 800 H1460 V960 H0 Z" fill="#B5793D" rim={0} />
    <Ink d="M0 840 H1460" w={4} opacity={0.4} />
    {/* A post box. */}
    <g transform="translate(1340 800)">
      <Cut d="M-56 0 V-180 Q-56 -230 0 -230 Q56 -230 56 -180 V0 Z" fill="#D0463D" />
      <rect x={-34} y={-170} width={68} height={12} rx={6} fill={INK} />
      <text y={-110} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill="#FFD23F" stroke={INK} strokeWidth={4} paintOrder="stroke">
        POST
      </text>
    </g>
  </>
));

/** Predict the Crowd: the Big Match, with the crowd in the stands. */
registerScene('stadium', () => (
  <>
    <rect width={1460} height={960} fill="#2E86DE" />
    {/* Floodlights. */}
    {[140, 1320].map((x) => (
      <g key={x}>
        <Ink d={`M${x} 360 V120`} w={12} />
        <Cut d={rr(x - 70, 40, 140, 90, 10)} fill="#E8E0CF" />
        {[0, 1, 2].map((c) =>
          [0, 1].map((r) => <circle key={`${c}${r}`} className="anim-twinkle" style={{ animationDuration: '3s', animationDelay: `${-(c + r) * 0.4}s` }} cx={x - 40 + c * 40} cy={66 + r * 38} r={13} fill="#FFF6CC" stroke={INK} strokeWidth={3} />),
        )}
      </g>
    ))}
    {/* The stands, packed with the crowd. */}
    {[0, 1, 2, 3].map((row) => (
      <g key={row}>
        <rect x={0} y={250 + row * 90} width={1460} height={90} fill={row % 2 ? '#26549C' : '#2D63B4'} stroke={INK} strokeWidth={4} />
        {Array.from({ length: 24 }, (_, i) => {
          const x = 30 + i * 62 + (row % 2) * 30;
          const c = ['#FF4D5E', '#FFD23F', '#FFFFFF', '#3DBE4B', '#FF9F43'][(i * 7 + row * 3) % 5];
          return (
            <g key={i} className={(i + row) % 3 === 0 ? 'anim-bob' : undefined} style={{ animationDuration: '0.9s', animationDelay: `${-(i % 5) * 0.2}s` }}>
              <circle cx={x} cy={300 + row * 90} r={20} fill={c} stroke={INK} strokeWidth={3.5} />
            </g>
          );
        })}
      </g>
    ))}
    <Bunting x1={-20} x2={1480} y={238} sag={16} n={20} colours={['#FFD23F', '#FFFFFF', '#FF4D5E']} />
    {/* The pitch. */}
    <Cut d="M0 610 H1460 V960 H0 Z" fill="#3DAE5B" rim={0} />
    {Array.from({ length: 8 }, (_, i) => (
      <rect key={i} x={i * 190} y={612} width={95} height={348} fill="#38A052" />
    ))}
    <Ink d="M730 612 V960 M0 700 H1460" w={6} stroke={PAPER} />
    <circle cx={730} cy={960} r={140} fill="none" stroke={PAPER} strokeWidth={6} />
  </>
));

/** Sumo Programming: a dojo with a hanging roof and lanterns. */
registerScene('dojo', () => (
  <>
    <rect width={1460} height={960} fill="#EAD7B4" />
    {/* Paper screen walls. */}
    {Array.from({ length: 8 }, (_, i) => (
      <g key={i}>
        <rect x={i * 190} y={120} width={184} height={560} fill="#FFF8EA" stroke={INK} strokeWidth={4} />
        <Ink d={`M${i * 190 + 92} 120 V680 M${i * 190} 306 H${i * 190 + 184} M${i * 190} 493 H${i * 190 + 184}`} w={3} opacity={0.5} />
      </g>
    ))}
    {/* The hanging roof. */}
    <Cut d="M-20 120 L120 20 H1340 L1480 120 Z" fill="#6B3A2B" rim={0} />
    <rect x={-20} y={110} width={1500} height={18} fill="#C0392B" stroke={INK} strokeWidth={4} />
    {/* Tassels at the corners of the roof. */}
    {[80, 1380].map((x, i) => (
      <g key={x} className="anim-sway" style={{ animationDelay: `${-i}s`, transformOrigin: `${x}px 128px` }}>
        <Ink d={`M${x} 128 V220`} w={6} stroke={['#3D7BFF', '#FF4D5E'][i]} />
        <Cut d={rr(x - 16, 216, 32, 56, 12)} fill={['#3D7BFF', '#FF4D5E'][i]!} rim={0} edge={4} />
      </g>
    ))}
    {/* Lanterns. */}
    {[300, 1160].map((x, i) => (
      <g key={x} className="anim-sway" style={{ animationDuration: '5s', animationDelay: `${-i * 1.3}s`, transformOrigin: `${x}px 128px` }}>
        <Ink d={`M${x} 128 V180`} w={4} />
        <Cut d={`M${x - 40} 190 Q${x - 54} 240 ${x - 40} 290 H${x + 40} Q${x + 54} 240 ${x + 40} 190 Z`} fill="#FF7A4D" rim={0} />
        <Ink d={`M${x - 46} 220 H${x + 46} M${x - 48} 260 H${x + 48}`} w={3} opacity={0.6} />
      </g>
    ))}
    {/* The tatami floor. */}
    <Cut d="M0 680 H1460 V960 H0 Z" fill="#D8C27A" rim={0} />
    {Array.from({ length: 6 }, (_, i) => (
      <rect key={i} x={i * 250 - 20} y={680} width={240} height={280} fill="none" stroke="#6B5A2B" strokeWidth={5} />
    ))}
  </>
));

/** Artillery: rolling windy hills (and a ridge fort for the fortress game). */
registerScene('hills', () => (
  <>
    <rect width={1460} height={960} fill="#BFE3F2" />
    <g className="anim-drift" style={{ animationDuration: '8s' }}>
      <Cloud x={220} y={130} s={1.2} />
      <Cloud x={760} y={90} s={0.9} />
      <Cloud x={1240} y={160} s={1.1} />
    </g>
    <Cut d="M0 520 Q240 400 520 480 Q820 380 1100 470 Q1300 420 1460 470 V960 H0 Z" fill="#9CCB6E" rim={0} />
    <Cut d="M0 660 Q360 560 760 640 Q1140 570 1460 640 V960 H0 Z" fill="#7EA34F" rim={0} />
    {/* A windsock showing the wind. */}
    <g transform="translate(1320 600)">
      <Ink d="M0 0 V-170" w={8} />
      <g className="anim-flutter" style={{ animationDuration: '1.2s', transformOrigin: '0px -170px' }}>
        <Cut d="M0 -176 L90 -164 V-136 L0 -126 Z" fill="#FF7A1A" rim={0} edge={4} />
        <Ink d="M30 -172 V-130 M60 -168 V-134" w={8} stroke={PAPER} />
      </g>
    </g>
    {Array.from({ length: 8 }, (_, i) => (
      <g key={i} className="anim-sway" style={{ animationDelay: `${-i * 0.3}s`, animationDuration: '2.4s' }}>
        <Ink d={`M${80 + i * 180} 900 l-8 -40 M${88 + i * 180} 900 l4 -48 M${96 + i * 180} 900 l12 -36`} w={6} stroke="#5E8C31" />
      </g>
    ))}
  </>
));

// ================================================================== demos

/** Herd Mentality: four answers, three agree, the herd scores. */
registerDemo('herd-mentality', () => {
  const t = useDemoTime(6.5, 3.8);
  const answers = [
    { a: 0, x: 90, text: 'Pizza', herd: true },
    { a: 4, x: 230, text: 'Pizza', herd: true },
    { a: 9, x: 370, text: 'Sushi', herd: false },
    { a: 2, x: 510, text: 'Pizza', herd: true },
  ];
  const grouped = t > 2.6;
  return (
    <DemoFrame caption="Write what most people will say. The biggest group scores" bg="#E7F4DF">
      <g>
        <Cut d={rr(130, 18, 340, 52, 12)} fill="#D0463D" rim={0} />
        <text x={300} y={53} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={24} fill={PAPER} stroke={INK} strokeWidth={4} paintOrder="stroke">
          Best food on a Friday?
        </text>
      </g>
      {answers.map((ans, i) => {
        const x = grouped ? (ans.herd ? key([[2.6, ans.x], [3.2, 160 + i * 36]], t) : key([[2.6, ans.x], [3.2, 470]], t)) : ans.x;
        return (
          <g key={ans.a}>
            <DemoAvatar x={x} y={270} a={ans.a} s={64} />
            <Bubble x={x} y={190} text={ans.text} size={22} fill={grouped && ans.herd ? '#C9F2DC' : PAPER} show={fade(t, 0.5 + i * 0.35, 6.3) * (grouped && ans.herd && i > 0 ? 0 : 1)} />
          </g>
        );
      })}
      <Bubble x={200} y={340} text="+1 each!" fill="#FFD23F" size={20} show={fade(t, 3.3, 6.3)} />
    </DemoFrame>
  );
});

/** Odd One Out: three have "Lion", one has "Tiger"; clues, then the vote. */
registerDemo('odd-one-out', () => {
  const t = useDemoTime(7.5, 5);
  const people = [
    { a: 0, x: 90, clue: 'Mane', odd: false },
    { a: 4, x: 230, clue: 'Roar', odd: false },
    { a: 9, x: 370, clue: 'Stripes', odd: true },
    { a: 2, x: 510, clue: 'Pride', odd: false },
  ];
  const vote = t > 3.6;
  return (
    <DemoFrame caption="Someone has a slightly different word. Give a clue, then vote them out" bg="#E6EAF1">
      <DemoPhone x={80} y={150} s={0.7} tilt={-6}>
        <text y={0} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill={INK}>
          Lion
        </text>
      </DemoPhone>
      <DemoPhone x={520} y={150} s={0.7} tilt={6}>
        <text y={0} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={28} fill={INK}>
          Tiger
        </text>
      </DemoPhone>
      <g opacity={1 - fade(t, 1.4, 7.4)}>
        <Bubble x={300} y={150} text="Secret words" size={22} />
      </g>
      {people.map((p, i) => (
        <g key={p.a}>
          <DemoAvatar x={p.x} y={300} a={p.a} s={60} />
          <Bubble x={p.x} y={240} text={p.clue} size={18} fill={vote && p.odd ? '#FFD0D5' : '#FFF6CC'} show={fade(t, 1.6 + i * 0.35, 7.3)} />
        </g>
      ))}
      {vote && (
        <g opacity={fade(t, 3.6, 7.3)}>
          {[0, 1, 3].map((from) => (
            <Ink key={from} d={`M${people[from]!.x} 272 Q${(people[from]!.x + 370) / 2} ${190} 370 262`} w={4} stroke="#D0463D" strokeDasharray="8 8" />
          ))}
          <Bubble x={370} y={60} text="Found you!" fill="#FFD23F" size={24} />
        </g>
      )}
    </DemoFrame>
  );
});

/** Who Wrote That?: answers go up anonymously; guess the writer of each. */
registerDemo('who-wrote-that', () => {
  const t = useDemoTime(7, 4.6);
  const cards = [
    { x: 160, text: 'A tiny hat', by: 4 },
    { x: 440, text: 'More cheese', by: 9 },
  ];
  const reveal = t > 3.8;
  return (
    <DemoFrame caption="Guess who wrote each answer. Fool your friends for points" bg="#FBF0DA">
      <text x={300} y={48} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={24} fill={INK}>
        What would make Mondays better?
      </text>
      {cards.map((c, i) => (
        <g key={i} opacity={fade(t, 0.4 + i * 0.4, 6.8)} transform={`rotate(${i ? 3 : -3} ${c.x} 150)`}>
          <Cut d={rr(c.x - 120, 80, 240, 130, 10)} fill="#FFF6E5" rim={0} />
          <rect x={c.x + 70} y={92} width={36} height={42} fill="#D0463D" stroke={INK} strokeWidth={3} strokeDasharray="4 3" />
          <text x={c.x - 100} y={170} fontFamily={FONT} fontWeight={600} fontSize={26} fill={INK}>
            {c.text}
          </text>
          {reveal && <DemoAvatar x={c.x - 80} y={210} a={c.by} s={44} />}
        </g>
      ))}
      {[0, 4, 9].map((a, i) => (
        <DemoAvatar key={a} x={210 + i * 90} y={300} a={a} s={50} />
      ))}
      <Finger x={300} y={292} down={between(t, 2.4, 2.8)} show={fade(t, 1.8, 3.4)} />
      <Bubble x={300} y={250} text="It was Frog!" size={18} fill="#FFF6CC" show={fade(t, 2.6, 3.8)} />
      <Bubble x={440} y={250} text="Fooled 2!" fill="#FFD23F" size={20} show={fade(t, 4, 6.8)} />
    </DemoFrame>
  );
});

/** Predict the Crowd: vote your own answer, then rank all four by the crowd's votes. */
registerDemo('predict-the-crowd', () => {
  const t = useDemoTime(7, 5);
  const opts = [
    { label: 'Cats', votes: 4, c: '#FF4D5E' },
    { label: 'Dogs', votes: 3, c: '#3D7BFF' },
    { label: 'Fish', votes: 1, c: '#3DBE4B' },
    { label: 'Birds', votes: 2, c: '#FFB703' },
  ];
  const grow = key([[2.6, 0], [3.6, 1]], t);
  return (
    <DemoFrame caption="Pick your answer, then rank all four by how the crowd voted" bg="#E3EEFB">
      <DemoPhone x={90} y={185} s={0.95}>
        {['Cats', 'Dogs', 'Birds', 'Fish'].map((l, i) => (
          <g key={l}>
            <path d={rr(-32, -62 + i * 32, 64, 26, 6)} fill={PAPER} stroke={INK} strokeWidth={2.5} />
            <text x={-24} y={-43 + i * 32} fontFamily={FONT} fontWeight={700} fontSize={14} fill={INK}>
              {i + 1}. {l}
            </text>
          </g>
        ))}
      </DemoPhone>
      <Bubble x={90} y={40} text="My ranking" size={18} show={fade(t, 0.3, 6.8)} />
      {opts.map((o, i) => {
        const h = o.votes * 50 * grow;
        const x = 210 + i * 94;
        return (
          <g key={o.label}>
            <rect x={x} y={290 - h} width={70} height={h} rx={8} fill={o.c} stroke={INK} strokeWidth={4} />
            <text x={x + 35} y={320} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} fill={INK}>
              {o.label}
            </text>
          </g>
        );
      })}
      <Bubble x={400} y={48} text="3 in the right place!" fill="#FFD23F" size={20} show={fade(t, 4, 6.8)} />
    </DemoFrame>
  );
});

/** Sumo Programming: aim in secret, then everyone slides at once. */
registerDemo('sumo-programming', () => {
  const t = useDemoTime(6.5, 3.2);
  const go = key([[2.2, 0], [3.2, 1]], t);
  const pucks = [
    { a: 0, x: 220, y: 180, dx: 90, dy: 10 },
    { a: 4, x: 360, y: 190, dx: 150, dy: 30 },
    { a: 9, x: 300, y: 250, dx: -30, dy: -60 },
  ];
  return (
    <DemoFrame caption="Aim in secret, then everyone moves at once. Push rivals off!" bg="#F3E6CC">
      <circle cx={300} cy={195} r={150} fill="#C99A62" stroke={INK} strokeWidth={5} />
      <circle cx={300} cy={195} r={130} fill="#F7D9A8" stroke="#D9B35A" strokeWidth={12} strokeDasharray="22 6" />
      <Ink d="M280 180 V210 M320 180 V210" w={5} stroke={PAPER} />
      {pucks.map((p, i) => {
        // The blue puck gets shoved off the edge by the fox.
        const x = p.x + (i === 1 ? p.dx * key([[2.6, 0], [3.4, 1]], t) : p.dx * go);
        const y = p.y + (i === 1 ? p.dy * key([[2.6, 0], [3.4, 1]], t) : p.dy * go);
        const off = i === 1 && t > 3.3;
        return (
          <g key={p.a} opacity={off ? 1 - fade(t, 3.4, 6.4) * 0.8 : 1}>
            {t < 2.2 && <Ink d={`M${p.x} ${p.y} l${p.dx * 0.5} ${p.dy * 0.5}`} w={5} stroke="#FF4D5E" strokeDasharray="8 6" opacity={fade(t, 0.4 + i * 0.3, 2.2)} />}
            <DemoAvatar x={x} y={y} a={p.a} s={54} />
          </g>
        );
      })}
      <Bubble x={500} y={60} text="Off!" fill="#FFD0D5" size={24} show={fade(t, 3.4, 6.3)} />
    </DemoFrame>
  );
});

/** A little tank for the Artillery demos. */
function Tank({ x, a, flip = false }: { x: number; a: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} 280)`}>
      <Ink d={flip ? 'M-8 -30 L-48 -58' : 'M8 -30 L48 -58'} w={12} />
      <Ink d={flip ? 'M-8 -30 L-48 -58' : 'M8 -30 L48 -58'} w={6} stroke="#5F7A3A" />
      <Cut d={rr(-40, -26, 80, 26, 12)} fill="#5F7A3A" rim={0} edge={4} />
      <DemoAvatar x={0} y={-44} a={a} s={40} />
    </g>
  );
}

/** Artillery: set angle and power; everyone fires at once; the wind pushes the shells. */
registerDemo('artillery', () => {
  const t = useDemoTime(6.5, 3.2);
  const f = key([[1.8, 0], [3.2, 1]], t);
  // Shell arcs from x=100 to x=480, with a peak at y=70.
  const sx = 100 + 380 * f;
  const sy = 240 - 680 * f * (1 - f);
  const boom = t > 3.2;
  return (
    <DemoFrame caption="Set your angle and power. Everyone fires at once. Mind the wind!" bg="#DDF0F8">
      <Cut d="M8 290 Q300 250 592 290 V352 H8 Z" fill="#7EA34F" rim={0} />
      <Tank x={100} a={0} />
      <Tank x={480} a={9} flip />
      <g transform="translate(300 60)">
        <text textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} fill={INK}>
          Wind →
        </text>
      </g>
      {t > 1.8 && !boom && <circle cx={sx} cy={sy} r={10} fill={INK} />}
      {t > 1.8 && <Ink d={`M100 240 Q290 ${240 - 340} ${sx} ${sy}`} w={4} strokeDasharray="10 8" opacity={0.4} />}
      {boom && (
        <g opacity={1 - fade(t, 3.6, 6.4) * 0.3}>
          <path d="M480 250 l14 -34 l8 26 l28 -18 l-12 30 l30 6 l-30 12 l14 26 l-30 -12 l-10 30 l-10 -30 l-30 12 l14 -26 l-30 -12 l30 -6 l-12 -30 l28 18 l8 -26 Z" fill="#FFB703" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        </g>
      )}
      <Bubble x={120} y={140} text="45° · 70%" size={20} show={fade(t, 0.3, 2)} />
      <Bubble x={480} y={140} text="Hit!" fill="#FFD0D5" size={24} show={fade(t, 3.3, 6.3)} />
    </DemoFrame>
  );
});

/** Artillery: Fortress: the attackers' tanks gang up on the fortress; its crew fires back. */
registerDemo('artillery-fortress', () => {
  const t = useDemoTime(7, 3.4);
  const health = key([[2.6, 1], [3.2, 0.6], [4.6, 0.6], [5.2, 0.25]], t);
  const f = key([[1.6, 0], [2.6, 1]], t);
  const g = key([[3.6, 0], [4.6, 1]], t);
  return (
    <DemoFrame caption="Attackers bring the fortress down. Its crew picks them off" bg="#E8EEF2">
      <Cut d="M8 290 Q300 250 592 290 V352 H8 Z" fill="#7EA34F" rim={0} />
      <Tank x={80} a={0} />
      <Tank x={190} a={4} />
      <g transform="translate(470 280)">
        <Cut d={rr(-70, -130, 140, 130, 4)} fill="#B8B2A7" rim={0} />
        {[-70, -34, 2, 38].map((o) => (
          <rect key={o} x={o} y={-154} width={30} height={26} fill="#B8B2A7" stroke={INK} strokeWidth={4} />
        ))}
        <DemoAvatar x={0} y={-60} a={9} s={50} />
        <rect x={-70} y={-186} width={140} height={14} fill={PAPER} stroke={INK} strokeWidth={3} />
        <rect x={-70} y={-186} width={140 * health} height={14} fill="#E5484D" />
      </g>
      {between(t, 1.6, 2.6) && <circle cx={190 + 260 * f} cy={240 - 520 * f * (1 - f)} r={9} fill={INK} />}
      {between(t, 3.6, 4.6) && <circle cx={470 - 390 * g} cy={170 - 420 * g * (1 - g)} r={9} fill={INK} />}
      <Bubble x={470} y={50} text="-40%" fill="#FFD0D5" size={20} show={fade(t, 2.6, 3.6)} />
      <Bubble x={80} y={170} text="Boom!" fill="#FFD23F" size={20} show={fade(t, 4.6, 6.8)} />
    </DemoFrame>
  );
});
