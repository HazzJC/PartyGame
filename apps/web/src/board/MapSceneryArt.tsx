import { memo, useId, type ReactNode } from 'react';
import './scenery.css';

/**
 * The world under the board: a paper island with four pop-up districts, one centred in each
 * quadrant of the loop, plus trees, clouds, birds and a waterfall. Everything here sits below the
 * road and spaces. Moving parts are kept out of the filtered (drop-shadow) groups so animating them
 * never forces a big filter to redraw; they carry flat paper shadows instead. Animations only run
 * on the host screen (see scenery.css), and never with reduced motion.
 */

const INK = '#2B2233';
const W = 1440;
const H = 940;
/** The loop runs 80 px in from the edges; each district is centred in one quadrant inside it. */
export const QUADRANTS = {
  pier: { x: (80 + W / 2) / 2, y: (80 + H / 2) / 2 },
  grove: { x: (W / 2 + W - 80) / 2, y: (80 + H / 2) / 2 },
  plaza: { x: (80 + W / 2) / 2, y: (H / 2 + H - 80) / 2 },
  hill: { x: (W / 2 + W - 80) / 2, y: (H / 2 + H - 80) / 2 },
};

/**
 * Each district's art isn't symmetric about its own origin, so it's nudged by the offset of its
 * visible centre (measured with getBBox in the browser) to sit exactly in its quadrant's middle.
 */
const CENTRE_FIX: Record<keyof typeof QUADRANTS, { x: number; y: number }> = {
  pier: { x: -13, y: 2 },
  grove: { x: 1, y: -18 },
  plaza: { x: -1, y: 24 },
  hill: { x: 0, y: 11 },
};
const PLACE = Object.fromEntries(
  (Object.keys(QUADRANTS) as (keyof typeof QUADRANTS)[]).map((k) => [k, { x: QUADRANTS[k].x - CENTRE_FIX[k].x, y: QUADRANTS[k].y - CENTRE_FIX[k].y }]),
) as Record<keyof typeof QUADRANTS, { x: number; y: number }>;

type Ref = (name: string) => string;

function Plaque({ y, text, colour, w }: { y: number; text: string; colour: string; w: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <path d={`M${-w / 2 - 12} 7l-18 12l18 12M${w / 2 + 12} 7l18 12l-18 12`} fill={colour} stroke={INK} strokeWidth={3} />
      <rect x={-w / 2} y={-2} width={w} height={42} rx={10} fill="#FFF9E9" stroke={INK} strokeWidth={4} />
      <text y={27} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

/** A paper tree: trunk, three canopy lobes and a highlight, swaying from its base. */
function Tree({ x, y, s = 1, tone = 0, sway = 5 }: { x: number; y: number; s?: number; tone?: number; sway?: number }) {
  const greens = [
    ['#4EAE73', '#2E7A4F'],
    ['#6CC47F', '#3B8A55'],
    ['#8FD27A', '#4E8F45'],
  ][tone % 3]!;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy={4} rx={34} ry={8} fill={INK} opacity={0.16} />
      <g className="sc-sway" style={{ animationDuration: `${sway}s`, animationDelay: `${-(x % 7)}s` }}>
        <path d="M-6 0 L-4 -40 H4 L6 0 Z" fill="#8A5A44" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M-40 -46 Q-46 -76 -18 -80 Q-12 -108 14 -100 Q42 -104 40 -74 Q52 -50 30 -40 Q6 -30 -18 -38 Q-42 -30 -40 -46 Z" fill={greens[0]} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M-26 -62 Q-24 -82 -6 -84" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.45} />
        <path d="M-30 -44 Q-6 -34 26 -44" fill="none" stroke={greens[1]} strokeWidth={4} strokeLinecap="round" />
      </g>
    </g>
  );
}

/** A little pine for variety. */
function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy={3} rx={24} ry={6} fill={INK} opacity={0.16} />
      <g className="sc-sway" style={{ animationDuration: '6s', animationDelay: `${-(x % 5)}s` }}>
        <path d="M-4 0V-14H4V0Z" fill="#8A5A44" stroke={INK} strokeWidth={3.5} />
        <path d="M0 -84 L22 -46 H12 L28 -14 H-28 L-12 -46 H-22 Z" fill="#3E9B63" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M-8 -60 L0 -74" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.4} />
      </g>
    </g>
  );
}

function Flowers({ x, y, colours = ['#FF7FA6', '#FFE36E', '#FFFFFF'] }: { x: number; y: number; colours?: string[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {colours.map((c, i) => (
        <g key={i} transform={`translate(${i * 14 - 14} ${i % 2 ? 4 : 0})`} className="sc-sway" style={{ animationDuration: `${3 + i}s` }}>
          <path d="M0 0V-16" stroke="#3B8A55" strokeWidth={3} />
          <circle cy={-19} r={6} fill={c} stroke={INK} strokeWidth={2.5} />
          <circle cy={-19} r={2} fill={INK} opacity={0.6} />
        </g>
      ))}
    </g>
  );
}

/** A cloud cut-out on a stick, bobbing like a stage prop. */
function Cloud({ x, y, s = 1, dur = 7 }: { x: number; y: number; s?: number; dur?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="sc-drift" style={{ animationDuration: `${dur}s`, animationDelay: `${-(x % 9)}s` }}>
        <path d="M0 16V40" stroke="#B9A07A" strokeWidth={4} strokeLinecap="round" />
        <path d="M-44 14 Q-52 -6 -30 -8 Q-24 -28 -2 -22 Q14 -36 32 -18 Q54 -18 48 6 Q52 20 30 20 H-30 Q-48 22 -44 14 Z" fill="#FFFFFF" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M-30 6 Q-20 -2 -8 2" fill="none" stroke="#DCE9F5" strokeWidth={5} strokeLinecap="round" />
      </g>
    </g>
  );
}

// ------------------------------------------------------------------ districts (local coords, centred on 0,0)

/** Paper Pier: a cliff waterfall pouring into a lagoon, a dock, a lighthouse and a bobbing boat. */
function Pier({ u: r, clip }: { u: Ref; clip: string }) {
  const lagoon = 'M-205 -18Q-150 -52 -70 -34Q20 -64 120 -40Q205 -48 222 12L214 96Q150 126 70 110Q-20 132 -110 112L-212 104Q-236 40 -205 -18Z';
  return (
    <>
      <g filter={r('cut-shadow')}>
        {/* Cliff behind the lagoon, with a grassy top. */}
        <path d="M-236 60 L-246 -96 Q-226 -142 -176 -140 Q-150 -168 -106 -150 Q-78 -142 -70 -110 L-58 40 Z" fill="#B8A7C9" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <path d="M-222 -60 Q-190 -76 -160 -58 M-206 -12 Q-170 -30 -130 -12 M-120 -80 Q-100 -96 -80 -84" fill="none" stroke="#8D7AA3" strokeWidth={5} strokeLinecap="round" />
        <path d="M-248 -98 Q-226 -150 -176 -146 Q-148 -176 -104 -156 Q-72 -150 -66 -116 Q-120 -104 -150 -118 Q-200 -100 -248 -98 Z" fill="#7FCB6E" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        {/* The lagoon: white paper rim, then water. */}
        <path d={lagoon} fill="#FFF8E9" stroke="#FFFFFF" strokeWidth={22} />
        <path d={lagoon} fill="#75CFE4" stroke="#3B4D69" strokeWidth={6} />
        {/* Sand bank and the dock. */}
        <path d="M60 104 Q120 80 214 86 L214 96 Q150 126 70 110 Z" fill="#F7D99F" stroke="#E7C27C" strokeWidth={3} />
        <path d="M18 30 H176 V48 H18 Z M40 48 V84 M96 48 V88 M152 48 V82" fill="#D78A56" stroke="#583D47" strokeWidth={5} strokeLinejoin="round" />
        {/* Lighthouse on the end of the dock. */}
        <path d="M130 30 L140 -70 H176 L186 30 Z" fill="#FFF4DB" stroke="#583D47" strokeWidth={5} strokeLinejoin="round" />
        <path d="M134 -8 H182 M137 -38 H179" stroke="#EC6B73" strokeWidth={12} />
        <path d="M134 -70 H182 L176 -92 H140 Z" fill="#FFE793" stroke="#583D47" strokeWidth={5} strokeLinejoin="round" />
        <path d="M136 -92 L158 -114 L180 -92 Z" fill="#EC6B73" stroke="#583D47" strokeWidth={5} strokeLinejoin="round" />
      </g>
      {/* Water that moves: waves drift inside the lagoon. */}
      <g clipPath={`url(#${clip})`}>
        <g className="sc-waves">
          {[-10, 30, 70].map((y, i) => (
            <path key={y} d={`M-320 ${y + i * 4} q18 -12 37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0`} fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.7} />
          ))}
        </g>
      </g>
      {/* Waterfall pouring off the cliff lip into the lagoon. */}
      <g>
        <path d="M-176 -122 Q-164 -130 -128 -124 L-122 24 Q-150 32 -180 22 Z" fill="#8FDCEE" stroke="#3B4D69" strokeWidth={5} strokeLinejoin="round" />
        {[-168, -156, -144, -134].map((x, i) => (
          <path key={x} d={`M${x} -118 L${x + 2} 18`} className="sc-fall" style={{ animationDuration: `${0.7 + i * 0.12}s` }} stroke="#FFFFFF" strokeWidth={i % 2 ? 4 : 6} strokeDasharray="22 26" strokeLinecap="round" opacity={0.85} />
        ))}
        {/* Foam where it lands. */}
        {[
          [-180, 22, 14],
          [-152, 30, 18],
          [-122, 22, 13],
          [-100, 32, 9],
        ].map(([x, y, rr], i) => (
          <circle key={i} cx={x} cy={y} r={rr} className="sc-foam" style={{ animationDelay: `${-i * 0.35}s` }} fill="#FFFFFF" stroke="#3B4D69" strokeWidth={3} />
        ))}
      </g>
      {/* The boat bobs on the water. */}
      <g transform="translate(-10 70)">
        <ellipse cy={20} rx={52} ry={7} fill="#3B4D69" opacity={0.2} />
        <g className="sc-boat">
          <path d="M-50 4 Q0 16 50 4 L36 26 Q0 36 -34 26 Z" fill="#FFF1D0" stroke="#583D47" strokeWidth={5} strokeLinejoin="round" />
          <path d="M0 4 V-56" stroke="#583D47" strokeWidth={5} />
          <path d="M4 -54 L40 -2 H4 Z" fill="#FFF5DB" stroke="#583D47" strokeWidth={5} strokeLinejoin="round" />
          <path d="M-4 -48 L-30 -4 H-4 Z" fill="#75CFE4" stroke="#583D47" strokeWidth={5} strokeLinejoin="round" />
        </g>
      </g>
      <Plaque y={128} text="PAPER PIER" colour="#75CFE4" w={204} />
    </>
  );
}

/** Doodle Grove: a leafy mound with swaying trees, a treehouse and mushrooms. */
function Grove({ u: r }: { u: Ref }) {
  const mound = 'M-236 20Q-230 -70 -150 -92Q-80 -130 0 -112Q90 -134 170 -96Q238 -70 238 10Q244 80 180 100Q80 124 0 108Q-90 126 -180 102Q-242 84 -236 20Z';
  return (
    <>
      <g filter={r('cut-shadow')}>
        <path d={mound} fill="#FFF9E7" stroke="#FFFFFF" strokeWidth={22} />
        <path d={mound} fill="#A6DB8F" stroke="#3E5D4B" strokeWidth={6} />
        <path d="M-226 50Q-100 90 0 70Q120 92 232 46L220 90Q80 124 0 108Q-90 126 -190 100Z" fill="#7CC77F" stroke="none" />
        {/* A winding stream through the grove. */}
        <path d="M-150 104 Q-110 60 -40 70 T90 50 T200 -20" fill="none" stroke="#FFFFFF" strokeWidth={18} strokeLinecap="round" />
        <path d="M-150 104 Q-110 60 -40 70 T90 50 T200 -20" fill="none" stroke="#75CFE4" strokeWidth={11} strokeLinecap="round" />
      </g>
      <Tree x={-150} y={20} s={1.05} tone={0} sway={5.5} />
      <Pine x={-70} y={-8} s={1.1} />
      {/* Treehouse in the big middle tree. */}
      <g transform="translate(20 40)">
        <ellipse cy={4} rx={44} ry={9} fill={INK} opacity={0.16} />
        <path d="M-8 0 L-6 -58 H6 L8 0Z" fill="#8A5A44" stroke={INK} strokeWidth={4} />
        <g className="sc-sway" style={{ animationDuration: '7s' }}>
          <path d="M-62 -66 Q-70 -110 -30 -116 Q-20 -150 16 -140 Q58 -146 58 -106 Q76 -76 44 -60 Q10 -46 -24 -56 Q-60 -44 -62 -66 Z" fill="#5FC182" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M-40 -92 Q-36 -118 -10 -120" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.45} />
        </g>
        <path d="M-22 -70 H22 V-40 H-22 Z" fill="#F9D78B" stroke="#563F45" strokeWidth={4} />
        <path d="M-28 -70 L0 -92 L28 -70 Z" fill="#ED7377" stroke="#563F45" strokeWidth={4} strokeLinejoin="round" />
        <circle cy={-55} r={7} fill="#8C5EB2" stroke="#563F45" strokeWidth={3} />
        <path d="M14 -40 L18 0 M24 -40 L28 0 M15 -28 H26 M16 -14 H27" stroke="#8A5A44" strokeWidth={3.5} />
      </g>
      <Tree x={120} y={16} s={0.95} tone={1} sway={6.5} />
      <Pine x={190} y={-26} s={0.8} />
      {/* Mushrooms and flowers. */}
      {[
        [-205, 64],
        [178, 70],
      ].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M-6 0 V-12 H6 V0 Z" fill="#FFF1D3" stroke={INK} strokeWidth={3} />
          <path d="M-18 -12 Q0 -36 18 -12 Z" fill="#E96D77" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
          <circle cx={-5} cy={-20} r={3} fill="#FFFFFF" />
          <circle cx={6} cy={-17} r={2.4} fill="#FFFFFF" />
        </g>
      ))}
      <Flowers x={-40} y={86} />
      <Flowers x={80} y={96} colours={['#FFE36E', '#B98CF0', '#FF7FA6']} />
      {/* The shortcut road cuts across the bottom of the grove, so its sign hangs at the top. */}
      <Plaque y={-150} text="DOODLE GROVE" colour="#9FD88D" w={228} />
    </>
  );
}

/** Patchwork Plaza: a quilted square, a striped market stall, a splashing fountain and a windmill. */
function Plaza({ u: r }: { u: Ref }) {
  const square = 'M-222 -86L-140 -110L-60 -94L30 -116L180 -80L222 -60L218 110L120 122L20 100L-80 124L-224 100Z';
  return (
    <>
      <g filter={r('cut-shadow')}>
        <path d={square} fill="#FFF9E9" stroke="#FFFFFF" strokeWidth={22} />
        <path d={square} fill="#DDA3C6" stroke="#664D74" strokeWidth={6} />
        <path d="M-200 -82H200V100H-200Z" fill={r('quilt')} opacity={0.86} />
        {/* Market stall. */}
        <path d="M-150 60 V-22 L-126 -50 H40 L64 -22 V60 Z" fill="#FCEFCF" stroke="#644A61" strokeWidth={6} strokeLinejoin="round" />
        <path d="M-156 -20 L-128 -56 H42 L70 -20 Z" fill="#EE6F87" stroke="#644A61" strokeWidth={6} strokeLinejoin="round" />
        <path d="M-122 -54V-20M-82 -54V-20M-42 -54V-20M-2 -54V-20M38 -54V-20" stroke="#FFF5DC" strokeWidth={13} />
        <path d="M-122 10 H40 M-122 32 H40" stroke="#B57961" strokeWidth={6} />
        <circle cx={-90} cy={0} r={9} fill="#FFD23F" stroke="#644A61" strokeWidth={3} />
        <circle cx={-60} cy={2} r={9} fill="#7ED49A" stroke="#644A61" strokeWidth={3} />
        <circle cx={-30} cy={0} r={9} fill="#FF7FA6" stroke="#644A61" strokeWidth={3} />
        {/* Fountain basin. */}
        <ellipse cx={-178} cy={74} rx={30} ry={12} fill="#71C6D6" stroke="#644A61" strokeWidth={5} />
      </g>
      {/* Bunting that flutters. */}
      <path d="M-200 -86 Q-20 -126 170 -86" fill="none" stroke="#644A61" strokeWidth={3} />
      {Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        const x = -190 + t * 350;
        const y = -88 - Math.sin(t * Math.PI) * 18;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path className="sc-flutter" style={{ animationDelay: `${-i * 0.2}s` }} d="M-8 0 H8 L0 18 Z" fill={['#FAD372', '#75CFE4', '#F47D86'][i % 3]} stroke="#644A61" strokeWidth={3} strokeLinejoin="round" />
          </g>
        );
      })}
      {/* Fountain spray. */}
      <g transform="translate(-178 70)">
        <path d="M-4 0 V-26 H4 V0 Z" fill="#FFF1D3" stroke="#644A61" strokeWidth={3} />
        {[-12, 0, 12].map((dx, i) => (
          <circle key={dx} cx={dx} cy={-32} r={5} className="sc-spray" style={{ animationDelay: `${-i * 0.25}s` }} fill="#BFEAF4" stroke="#3B4D69" strokeWidth={2} />
        ))}
      </g>
      {/* Windmill with turning sails. */}
      <g transform="translate(150 40)">
        <ellipse cy={60} rx={40} ry={9} fill={INK} opacity={0.16} />
        <path d="M-26 60 L-16 -44 H16 L26 60 Z" fill="#FFF4DB" stroke="#644A61" strokeWidth={5} strokeLinejoin="round" />
        <path d="M-10 60 V36 Q0 26 10 36 V60" fill="#B57961" stroke="#644A61" strokeWidth={4} />
        <path d="M-22 -44 L0 -70 L22 -44 Z" fill="#EE6F87" stroke="#644A61" strokeWidth={5} strokeLinejoin="round" />
        <g transform="translate(0 -40)">
          <g className="sc-spin" style={{ animationDuration: '9s' }}>
            {[0, 90, 180, 270].map((a) => (
              <g key={a} transform={`rotate(${a})`}>
                <path d="M-3 0 V-62" stroke="#644A61" strokeWidth={5} />
                <path d="M2 -14 H22 V-60 H2 Z" fill="#FFFFFF" stroke="#644A61" strokeWidth={4} strokeLinejoin="round" />
                <path d="M12 -18 V-56" stroke="#DDA3C6" strokeWidth={3} />
              </g>
            ))}
          </g>
          <circle r={7} fill="#FAD372" stroke="#644A61" strokeWidth={4} />
        </g>
      </g>
      <Plaque y={124} text="PATCHWORK PLAZA" colour="#DDA3C6" w={250} />
    </>
  );
}

/** Lantern Hill: terraced hills, a winding stair, a gazebo, flickering lanterns and a balloon overhead. */
function Hill({ u: r }: { u: Ref }) {
  const hills = 'M-238 60Q-176 -34 -98 0Q2 -84 80 -22Q172 -40 238 60L228 118Q120 136 60 110Q-56 148 -126 110L-236 118Z';
  return (
    <>
      <g filter={r('cut-shadow')}>
        <path d={hills} fill="#FFF9E7" stroke="#FFFFFF" strokeWidth={22} />
        <path d={hills} fill="#F4B769" stroke="#835C5D" strokeWidth={6} />
        <path d="M-232 94Q-150 52 -66 90Q32 36 128 84Q202 58 234 96V118Q128 146 58 114Q-50 146 -124 114L-236 122Z" fill="#E89269" />
        <path d="M-210 112Q-150 64 -100 94T24 76T164 88" fill="none" stroke="#FFF2CF" strokeWidth={22} />
        <path d="M-210 112Q-150 64 -100 94T24 76T164 88" fill="none" stroke="#9E6B60" strokeWidth={3} strokeDasharray="8 13" />
        {/* Gazebo. */}
        <path d="M40 22 L106 -22 L172 22 Z" fill="#D76675" stroke="#704C55" strokeWidth={6} strokeLinejoin="round" />
        <path d="M52 22 V78 H160 V22 M66 42 H146" fill="#FFE9B3" stroke="#704C55" strokeWidth={6} />
        <circle cx={106} cy={52} r={14} fill="#FFD76D" stroke="#704C55" strokeWidth={4} />
      </g>
      {/* A string of lanterns that sway and glow. */}
      <path d="M-196 -30 Q-20 -84 190 -30" fill="none" stroke="#704C55" strokeWidth={4} />
      {Array.from({ length: 7 }, (_, i) => {
        const t = i / 6;
        const x = -180 + t * 356;
        const y = -34 - Math.sin(t * Math.PI) * 26;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g className="sc-lantern" style={{ animationDelay: `${-i * 0.45}s` }}>
              <path d="M0 0 V14" stroke="#704C55" strokeWidth={3} />
              <path d="M-12 14 Q0 2 12 14 L9 34 H-9 Z" fill={i % 2 ? '#FFE59A' : '#F6CF74'} stroke="#704C55" strokeWidth={4} strokeLinejoin="round" />
              <circle cy={24} r={4} className="sc-glow" fill="#FFFFFF" />
            </g>
          </g>
        );
      })}
      {/* A paper hot-air balloon bobbing over the hill. */}
      <g transform="translate(-120 -96)">
        <g className="sc-float">
          <path d="M0 -44 Q30 -44 30 -12 Q30 10 8 26 H-8 Q-30 10 -30 -12 Q-30 -44 0 -44 Z" fill="#FF7FA6" stroke="#704C55" strokeWidth={4} strokeLinejoin="round" />
          <path d="M0 -44 Q12 -20 8 26 M0 -44 Q-12 -20 -8 26" fill="none" stroke="#FFE59A" strokeWidth={5} />
          <path d="M-8 26 L-7 36 M8 26 L7 36" stroke="#704C55" strokeWidth={2.5} />
          <path d="M-9 36 H9 V46 H-9 Z" fill="#B57961" stroke="#704C55" strokeWidth={3.5} />
        </g>
      </g>
      <Plaque y={122} text="LANTERN HILL" colour="#F4B769" w={228} />
    </>
  );
}

function District({ name, at, children }: { name: string; at: { x: number; y: number }; children: ReactNode }) {
  return (
    <g data-district={name} transform={`translate(${at.x} ${at.y})`}>
      {children}
    </g>
  );
}

export const MapSceneryArt = memo(function MapSceneryArt() {
  // A phone can show two maps at once (route map and trap picker): each gets its own ids.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `map-${name}-${uid}`;
  const ref: Ref = (name) => `url(#${id(name)})`;
  const lagoonClip = id('lagoon');
  return (
    <g className="map-scenery" aria-hidden="true" strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <filter id={id('cut-shadow')} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="9" stdDeviation="1.5" floodColor="#412B38" floodOpacity=".35" />
        </filter>
        <pattern id={id('grass')} width="46" height="40" patternUnits="userSpaceOnUse">
          <path d="M8 26 l4 -8 l4 8 M30 12 l3 -7 l3 7" fill="none" stroke="#7FB866" strokeWidth="3" strokeLinecap="round" />
          <circle cx="38" cy="30" r="2" fill="#FFFFFF" opacity=".5" />
        </pattern>
        <pattern id={id('quilt')} width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M0 0H100V100H0Z M0 50H100 M50 0V100" fill="none" stroke="#B65D8A" strokeWidth="4" opacity=".34" />
          <path d="M0 0L50 50L100 0 M0 100L50 50L100 100" fill="none" stroke="#FFF5D8" strokeWidth="4" opacity=".65" />
        </pattern>
        <clipPath id={lagoonClip}>
          <path transform={`translate(${PLACE.pier.x} ${PLACE.pier.y})`} d="M-205 -18Q-150 -52 -70 -34Q20 -64 120 -40Q205 -48 222 12L214 96Q150 126 70 110Q-20 132 -110 112L-212 104Q-236 40 -205 -18Z" />
        </clipPath>
      </defs>

      {/* The paper island: an ink edge, a white paper rim, and a grassy meadow. */}
      <rect x={4} y={10} width={W - 8} height={H - 12} rx={60} fill="#7FA95F" stroke={INK} strokeWidth={6} />
      <rect x={4} y={4} width={W - 8} height={H - 14} rx={60} fill="#FFFFFF" stroke={INK} strokeWidth={6} />
      <rect x={16} y={16} width={W - 32} height={H - 38} rx={50} fill="#BFE39B" />
      <rect x={16} y={16} width={W - 32} height={H - 38} rx={50} fill={ref('grass')} />

      {/* Corner woods, outside the loop. */}
      <Tree x={62} y={92} s={0.7} tone={1} sway={6} />
      <Pine x={1388} y={96} s={0.75} />
      <Tree x={62} y={900} s={0.7} tone={2} sway={5} />
      <Tree x={1384} y={900} s={0.7} tone={0} sway={7} />
      <Flowers x={40} y={470} />
      <Flowers x={1404} y={470} colours={['#FFE36E', '#FF7FA6', '#B98CF0']} />

      {/* Clouds on sticks along the top edge. */}
      <Cloud x={430} y={26} s={0.55} dur={8} />
      <Cloud x={1010} y={22} s={0.5} dur={10} />

      <District name="pier" at={PLACE.pier}>
        <Pier u={ref} clip={lagoonClip} />
      </District>
      <District name="grove" at={PLACE.grove}>
        <Grove u={ref} />
      </District>
      <District name="plaza" at={PLACE.plaza}>
        <Plaza u={ref} />
      </District>
      <District name="hill" at={PLACE.hill}>
        <Hill u={ref} />
      </District>

      {/* A flock of paper birds crossing the middle of the island now and then. */}
      <g className="sc-flock">
        {[
          [0, 0],
          [34, -14],
          [30, 18],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path className="sc-flap" style={{ animationDelay: `${-i * 0.15}s` }} d="M-14 0 Q-7 -9 0 0 Q7 -9 14 0" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          </g>
        ))}
      </g>
    </g>
  );
});
