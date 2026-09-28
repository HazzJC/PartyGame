import { ANIMALS, PLAYER_COLOURS, TEAM_AVATAR_BASE, TEAM_COLOURS, isTeamAvatar } from '@partygame/shared';
import { useId } from 'react';
import { AnimalFace } from './animals.tsx';

const INK = '#2B2233';
const W = '#FFFFFF';
const S = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

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
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const animal = ANIMALS[Math.abs(avatar) % ANIMALS.length]!;
  const colour = avatarColour(avatar);
  return <>{isTeamAvatar(avatar) ? <TeamBadge c={colour} n={avatar - TEAM_AVATAR_BASE} /> : <AnimalFace animal={animal} colour={colour} uid={uid} />}</>;
}

export function Avatar({ avatar, size = 64, dim = false, sticker = true, className, title }: AvatarProps) {
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
      {sticker && (
        <>
          {/* The sticker: a white cut-out disc lifted off the page by a hard ink shadow. */}
          <circle cx="54" cy="56" r="53" fill={INK} />
          <circle cx="50" cy="50" r="53" fill={W} stroke={INK} strokeWidth="3" />
        </>
      )}
      <AvatarFace avatar={avatar} />
    </svg>
  );
}
