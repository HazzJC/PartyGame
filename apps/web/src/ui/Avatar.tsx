import { ANIMALS, PLAYER_COLOURS, TEAM_AVATAR_BASE, TEAM_COLOURS, isTeamAvatar } from '@partygame/shared';
import type { ReactNode } from 'react';

const INK = '#2B2233';
const W = '#FFFFFF';
const PINK = '#FF9EB5';
const S = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Eyes({ y = 50, dx = 11, r = 4.5, x = 50 }: { y?: number; dx?: number; r?: number; x?: number }) {
  return (
    <>
      <circle cx={x - dx} cy={y} r={r} fill={INK} />
      <circle cx={x + dx} cy={y} r={r} fill={INK} />
      <circle cx={x - dx + 1.5} cy={y - 1.5} r={1.4} fill={W} />
      <circle cx={x + dx + 1.5} cy={y - 1.5} r={1.4} fill={W} />
    </>
  );
}

function Smile({ y = 66, w = 7 }: { y?: number; w?: number }) {
  return <path d={`M${50 - w} ${y} Q50 ${y + 6} ${50 + w} ${y}`} fill="none" {...S} strokeWidth={3.5} />;
}

/** Each animal is drawn in a 100×100 box; `c` is the player's colour. Shape carries identity. */
const faces: Record<(typeof ANIMALS)[number], (c: string) => ReactNode> = {
  fox: (c) => (
    <>
      <path d="M18 44 L26 12 L46 30 Z" fill={c} {...S} />
      <path d="M82 44 L74 12 L54 30 Z" fill={c} {...S} />
      <path d="M26 20 L30 32 L38 28 Z" fill={INK} />
      <path d="M74 20 L70 32 L62 28 Z" fill={INK} />
      <path d="M14 46 Q50 12 86 46 Q84 72 50 88 Q16 72 14 46 Z" fill={c} {...S} />
      <path d="M22 58 Q36 62 50 88 Q64 62 78 58 Q70 78 50 88 Q30 78 22 58 Z" fill={W} {...S} strokeWidth={3} />
      <Eyes y={50} dx={14} />
      <ellipse cx="50" cy="72" rx="6" ry="4.5" fill={INK} />
    </>
  ),
  panda: (c) => (
    <>
      <circle cx="24" cy="26" r="12" fill={c} {...S} />
      <circle cx="76" cy="26" r="12" fill={c} {...S} />
      <circle cx="50" cy="54" r="36" fill={W} {...S} />
      <ellipse cx="36" cy="50" rx="10" ry="13" fill={c} transform="rotate(-25 36 50)" />
      <ellipse cx="64" cy="50" rx="10" ry="13" fill={c} transform="rotate(25 64 50)" />
      <circle cx="37" cy="49" r="4" fill={W} />
      <circle cx="63" cy="49" r="4" fill={W} />
      <ellipse cx="50" cy="66" rx="6" ry="4" fill={INK} />
      <Smile y={72} w={6} />
    </>
  ),
  frog: (c) => (
    <>
      <circle cx="30" cy="30" r="14" fill={c} {...S} />
      <circle cx="70" cy="30" r="14" fill={c} {...S} />
      <ellipse cx="50" cy="60" rx="40" ry="28" fill={c} {...S} />
      <circle cx="30" cy="30" r="8" fill={W} />
      <circle cx="70" cy="30" r="8" fill={W} />
      <circle cx="31" cy="31" r="4.5" fill={INK} />
      <circle cx="71" cy="31" r="4.5" fill={INK} />
      <path d="M26 64 Q50 82 74 64" fill="none" {...S} />
      <circle cx="44" cy="52" r="1.8" fill={INK} />
      <circle cx="56" cy="52" r="1.8" fill={INK} />
    </>
  ),
  octopus: (c) => (
    <>
      <path d="M16 70 Q14 18 50 14 Q86 18 84 70 Q78 88 70 76 Q64 90 56 78 Q50 90 44 78 Q36 90 30 76 Q22 88 16 70 Z" fill={c} {...S} />
      <Eyes y={48} dx={13} r={5.5} />
      <ellipse cx="50" cy="62" rx="5" ry="4" fill={INK} />
      <circle cx="30" cy="30" r="3.5" fill={W} opacity="0.6" />
      <circle cx="38" cy="24" r="2.5" fill={W} opacity="0.6" />
    </>
  ),
  cat: (c) => (
    <>
      <path d="M16 50 L20 12 L44 28 Z" fill={c} {...S} />
      <path d="M84 50 L80 12 L56 28 Z" fill={c} {...S} />
      <path d="M22 20 L24 34 L34 28 Z" fill={PINK} />
      <path d="M78 20 L76 34 L66 28 Z" fill={PINK} />
      <ellipse cx="50" cy="56" rx="36" ry="32" fill={c} {...S} />
      <Eyes y={52} dx={13} />
      <path d="M46 62 L54 62 L50 67 Z" fill={PINK} {...S} strokeWidth={2.5} />
      <path d="M50 67 Q44 74 40 70 M50 67 Q56 74 60 70" fill="none" {...S} strokeWidth={3} />
      <path d="M8 58 L28 62 M8 68 L28 66 M92 58 L72 62 M92 68 L72 66" {...S} strokeWidth={2.5} />
    </>
  ),
  dog: (c) => (
    <>
      <circle cx="50" cy="50" r="34" fill={c} {...S} />
      <path d="M20 26 Q4 34 10 62 Q20 66 26 50 Z" fill="#6B3E26" {...S} />
      <path d="M80 26 Q96 34 90 62 Q80 66 74 50 Z" fill="#6B3E26" {...S} />
      <ellipse cx="50" cy="66" rx="18" ry="14" fill={W} {...S} strokeWidth={3} />
      <Eyes y={46} dx={13} />
      <ellipse cx="50" cy="60" rx="7" ry="5" fill={INK} />
      <path d="M50 65 L50 72 M42 72 Q50 78 58 72" fill="none" {...S} strokeWidth={3} />
      <path d="M50 76 Q50 84 55 82" fill={PINK} {...S} strokeWidth={2.5} />
    </>
  ),
  bear: (c) => (
    <>
      <circle cx="22" cy="24" r="13" fill={c} {...S} />
      <circle cx="78" cy="24" r="13" fill={c} {...S} />
      <circle cx="22" cy="24" r="6" fill="#E8B98A" />
      <circle cx="78" cy="24" r="6" fill="#E8B98A" />
      <circle cx="50" cy="54" r="36" fill={c} {...S} />
      <ellipse cx="50" cy="66" rx="16" ry="12" fill="#E8B98A" {...S} strokeWidth={3} />
      <Eyes y={48} dx={14} />
      <ellipse cx="50" cy="61" rx="6" ry="4.5" fill={INK} />
      <path d="M50 65 L50 70 M44 72 Q50 76 56 72" fill="none" {...S} strokeWidth={3} />
    </>
  ),
  rabbit: (c) => (
    <>
      <ellipse cx="36" cy="22" rx="9" ry="22" fill={c} {...S} transform="rotate(-8 36 22)" />
      <ellipse cx="64" cy="22" rx="9" ry="22" fill={c} {...S} transform="rotate(8 64 22)" />
      <ellipse cx="36" cy="22" rx="4" ry="15" fill={PINK} transform="rotate(-8 36 22)" />
      <ellipse cx="64" cy="22" rx="4" ry="15" fill={PINK} transform="rotate(8 64 22)" />
      <ellipse cx="50" cy="62" rx="32" ry="28" fill={c} {...S} />
      <Eyes y={58} dx={12} />
      <path d="M46 67 L54 67 L50 71 Z" fill={PINK} {...S} strokeWidth={2.5} />
      <path d="M50 71 L50 76 M45 80 L45 84 L55 84 L55 80" fill={W} {...S} strokeWidth={2.5} />
      <circle cx="30" cy="70" r="4" fill={PINK} opacity="0.7" />
      <circle cx="70" cy="70" r="4" fill={PINK} opacity="0.7" />
    </>
  ),
  pig: (c) => (
    <>
      <path d="M18 34 L22 12 L40 24 Z" fill={c} {...S} />
      <path d="M82 34 L78 12 L60 24 Z" fill={c} {...S} />
      <circle cx="50" cy="54" r="36" fill={c} {...S} />
      <Eyes y={44} dx={15} />
      <ellipse cx="50" cy="64" rx="16" ry="11" fill="#FFC2CE" {...S} />
      <ellipse cx="44" cy="64" rx="3" ry="4.5" fill={INK} />
      <ellipse cx="56" cy="64" rx="3" ry="4.5" fill={INK} />
    </>
  ),
  owl: (c) => (
    <>
      <path d="M18 30 L24 8 L38 24 Z" fill={c} {...S} />
      <path d="M82 30 L76 8 L62 24 Z" fill={c} {...S} />
      <path d="M14 52 Q14 16 50 16 Q86 16 86 52 Q86 88 50 88 Q14 88 14 52 Z" fill={c} {...S} />
      <circle cx="34" cy="46" r="15" fill={W} {...S} />
      <circle cx="66" cy="46" r="15" fill={W} {...S} />
      <circle cx="35" cy="47" r="6.5" fill={INK} />
      <circle cx="65" cy="47" r="6.5" fill={INK} />
      <circle cx="37" cy="45" r="2" fill={W} />
      <circle cx="67" cy="45" r="2" fill={W} />
      <path d="M44 60 L56 60 L50 72 Z" fill="#FFB703" {...S} strokeWidth={3} />
      <path d="M36 80 Q40 76 44 80 M56 80 Q60 76 64 80" fill="none" {...S} strokeWidth={2.5} />
    </>
  ),
  penguin: (c) => (
    <>
      <circle cx="50" cy="52" r="38" fill={c} {...S} />
      <path d="M50 30 Q70 26 76 46 Q80 74 50 84 Q20 74 24 46 Q30 26 50 30 Z" fill={W} {...S} strokeWidth={3} />
      <Eyes y={48} dx={11} />
      <path d="M42 58 L58 58 L50 68 Z" fill="#FFB703" {...S} strokeWidth={3} />
      <circle cx="32" cy="64" r="4" fill={PINK} opacity="0.7" />
      <circle cx="68" cy="64" r="4" fill={PINK} opacity="0.7" />
    </>
  ),
  lion: (c) => (
    <>
      <path
        d="M50 4 L60 14 L74 8 L78 22 L92 24 L88 38 L98 50 L88 62 L92 76 L78 78 L74 92 L60 86 L50 96 L40 86 L26 92 L22 78 L8 76 L12 62 L2 50 L12 38 L8 24 L22 22 L26 8 L40 14 Z"
        fill="#B5541E"
        {...S}
      />
      <circle cx="50" cy="52" r="30" fill={c} {...S} />
      <Eyes y={46} dx={11} />
      <path d="M44 58 L56 58 L50 64 Z" fill={INK} />
      <path d="M50 64 Q44 72 38 68 M50 64 Q56 72 62 68" fill="none" {...S} strokeWidth={3} />
    </>
  ),
  mouse: (c) => (
    <>
      <circle cx="22" cy="32" r="18" fill={c} {...S} />
      <circle cx="78" cy="32" r="18" fill={c} {...S} />
      <circle cx="22" cy="32" r="10" fill={PINK} />
      <circle cx="78" cy="32" r="10" fill={PINK} />
      <path d="M22 56 Q30 30 50 30 Q70 30 78 56 Q74 80 50 90 Q26 80 22 56 Z" fill={c} {...S} />
      <Eyes y={56} dx={11} />
      <circle cx="50" cy="74" r="5" fill={PINK} {...S} strokeWidth={2.5} />
      <path d="M14 70 L36 74 M14 80 L36 78 M86 70 L64 74 M86 80 L64 78" {...S} strokeWidth={2.5} />
    </>
  ),
  koala: (c) => (
    <>
      <circle cx="18" cy="38" r="17" fill={c} {...S} />
      <circle cx="82" cy="38" r="17" fill={c} {...S} />
      <circle cx="18" cy="38" r="9" fill={W} />
      <circle cx="82" cy="38" r="9" fill={W} />
      <ellipse cx="50" cy="56" rx="32" ry="30" fill={c} {...S} />
      <Eyes y={50} dx={14} r={4} />
      <ellipse cx="50" cy="64" rx="9" ry="12" fill={INK} />
      <ellipse cx="47" cy="59" rx="2.5" ry="3.5" fill={W} opacity="0.5" />
    </>
  ),
  chick: (c) => (
    <>
      <path d="M46 20 Q44 8 52 6 M50 20 Q54 8 62 10" fill="none" {...S} strokeWidth={3.5} />
      <circle cx="50" cy="54" r="36" fill={c} {...S} />
      <Eyes y={48} dx={13} />
      <path d="M40 58 L60 58 L50 70 Z" fill="#FF7A1A" {...S} strokeWidth={3} />
      <path d="M40 58 L60 58" {...S} strokeWidth={3} />
      <circle cx="28" cy="62" r="5" fill={PINK} opacity="0.8" />
      <circle cx="72" cy="62" r="5" fill={PINK} opacity="0.8" />
    </>
  ),
  tiger: (c) => (
    <>
      <circle cx="22" cy="26" r="12" fill={c} {...S} />
      <circle cx="78" cy="26" r="12" fill={c} {...S} />
      <circle cx="22" cy="26" r="5" fill={INK} />
      <circle cx="78" cy="26" r="5" fill={INK} />
      <ellipse cx="50" cy="54" rx="37" ry="34" fill={c} {...S} />
      <path d="M50 20 L50 32 M40 22 L42 32 M60 22 L58 32" {...S} strokeWidth={4} />
      <path d="M13 46 L26 50 M14 58 L26 58 M87 46 L74 50 M86 58 L74 58" {...S} strokeWidth={4} />
      <ellipse cx="50" cy="68" rx="17" ry="12" fill={W} {...S} strokeWidth={3} />
      <Eyes y={48} dx={13} />
      <path d="M44 62 L56 62 L50 68 Z" fill={INK} />
      <path d="M50 68 L50 72 M44 74 Q50 78 56 74" fill="none" {...S} strokeWidth={3} />
    </>
  ),
};

export function avatarColour(avatar: number): string {
  if (isTeamAvatar(avatar)) return TEAM_COLOURS[(avatar - TEAM_AVATAR_BASE) % TEAM_COLOURS.length]!;
  return PLAYER_COLOURS[avatar % PLAYER_COLOURS.length]!;
}

const TEAM_LABELS = ['Red team', 'Blue team', 'Green team', 'Gold team'];

export function animalName(avatar: number): string {
  if (isTeamAvatar(avatar)) return TEAM_LABELS[(avatar - TEAM_AVATAR_BASE) % TEAM_LABELS.length]!;
  const a = ANIMALS[avatar % ANIMALS.length]!;
  return a[0]!.toUpperCase() + a.slice(1);
}

interface AvatarProps {
  avatar: number;
  size?: number;
  /** Greyed out when the player has dropped. */
  dim?: boolean;
  /** Draw the white sticker backing disc. */
  sticker?: boolean;
  className?: string;
  title?: string;
}

/** Team board mode: a pennant shield in the team colour, with a different emblem per team. */
function TeamBadge({ c, n }: { c: string; n: number }) {
  const emblems = [
    <circle key="0" cx="50" cy="48" r="13" fill={W} {...S} />,
    <path key="1" d="M50 32 L64 56 L36 56 Z" fill={W} {...S} />,
    <rect key="2" x="37" y="35" width="26" height="26" rx="3" fill={W} {...S} />,
    <path key="3" d="M50 31 L55 43 L68 44 L58 52 L61 65 L50 58 L39 65 L42 52 L32 44 L45 43 Z" fill={W} {...S} />,
  ];
  return (
    <>
      <path d="M16 14 L84 14 L84 52 Q84 78 50 92 Q16 78 16 52 Z" fill={c} {...S} strokeWidth={5} />
      <path d="M16 70 Q50 60 84 70" fill="none" stroke={W} strokeWidth={5} opacity={0.6} />
      {emblems[n % emblems.length]}
    </>
  );
}

/** Just the face (or team shield), drawn in a 100×100 box, for composing into other art such as board standees. */
export function AvatarFace({ avatar }: { avatar: number }) {
  const animal = ANIMALS[Math.abs(avatar) % ANIMALS.length]!;
  const colour = avatarColour(avatar);
  return <>{isTeamAvatar(avatar) ? <TeamBadge c={colour} n={avatar - TEAM_AVATAR_BASE} /> : faces[animal](colour)}</>;
}

export function Avatar({ avatar, size = 64, dim = false, sticker = true, className, title }: AvatarProps) {
  const animal = ANIMALS[Math.abs(avatar) % ANIMALS.length]!;
  const colour = avatarColour(avatar);
  return (
    <svg
      viewBox="-6 -6 112 112"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? animalName(avatar)}
      style={{ filter: dim ? 'grayscale(1) opacity(0.55)' : undefined, flex: 'none', overflow: 'visible' }}
    >
      {sticker && <circle cx="50" cy="50" r="53" fill={W} stroke={INK} strokeWidth="3" />}
      {isTeamAvatar(avatar) ? <TeamBadge c={colour} n={avatar - TEAM_AVATAR_BASE} /> : faces[animal](colour)}
    </svg>
  );
}
