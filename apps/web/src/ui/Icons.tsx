import type { ItemId } from '@partygame/shared';
import type { ReactNode } from 'react';

/**
 * Drawn sticker icons (bold ink outlines, flat colour) used instead of emoji, which look different
 * on every phone and clash with the paper art. All are drawn in a 32×32 box.
 */

const INK = '#2B2233';
const S = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Svg({ size, label, children }: { size: number; label?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ flex: 'none', display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}>
      {children}
    </svg>
  );
}

export type IconName = 'tv' | 'phone' | 'laptop' | 'gamepad' | 'bot' | 'trophy' | 'secret' | 'clash' | 'heart' | 'scissors';

const ICONS: Record<IconName, ReactNode> = {
  // "Watch the screen": a little TV with a star on it.
  tv: (
    <>
      <path d="M11 5 L16 9 L21 5" fill="none" {...S} />
      <rect x="3" y="9" width="26" height="18" rx="4" fill="#FFFFFF" {...S} />
      <rect x="6.5" y="12.5" width="15" height="11" rx="2" fill="#3D7BFF" {...S} strokeWidth={2} />
      <path d="M14 14.5 l1.3 2.6 2.8 0.4 -2 2 0.5 2.8 -2.6 -1.4 -2.6 1.4 0.5 -2.8 -2 -2 2.8 -0.4 Z" fill="#FFD23F" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <circle cx="25" cy="15" r="1.6" fill={INK} />
      <circle cx="25" cy="20.5" r="1.6" fill="#FF4D5E" />
    </>
  ),
  phone: (
    <>
      <rect x="9" y="3" width="14" height="26" rx="3.5" fill="#FFFFFF" {...S} />
      <rect x="11.5" y="7" width="9" height="15" rx="1.5" fill="#3D7BFF" />
      <circle cx="16" cy="25.2" r="1.4" fill={INK} />
    </>
  ),
  laptop: (
    <>
      <rect x="6" y="6" width="20" height="14" rx="2.5" fill="#FFFFFF" {...S} />
      <rect x="8.5" y="8.5" width="15" height="9" rx="1" fill="#3D7BFF" />
      <path d="M2.5 23 H29.5 L27 27 H5 Z" fill="#FFFFFF" {...S} />
    </>
  ),
  gamepad: (
    <>
      <path d="M8 10 H24 Q30 10 30 18 Q30 26 25 26 Q22 26 20 22 H12 Q10 26 7 26 Q2 26 2 18 Q2 10 8 10 Z" fill="#FFFFFF" {...S} />
      <path d="M9 15 V21 M6 18 H12" {...S} />
      <circle cx="21" cy="16" r="1.8" fill="#FF4D5E" />
      <circle cx="24.5" cy="19.5" r="1.8" fill="#3DBE4B" />
    </>
  ),
  bot: (
    <>
      <path d="M16 3 V7" {...S} />
      <circle cx="16" cy="3" r="1.8" fill="#FF4D5E" stroke={INK} strokeWidth={1.6} />
      <rect x="5" y="7" width="22" height="18" rx="5" fill="#FFFFFF" {...S} />
      <circle cx="11.5" cy="15" r="2.4" fill={INK} />
      <circle cx="20.5" cy="15" r="2.4" fill={INK} />
      <path d="M11 20.5 H21" {...S} strokeWidth={2.2} />
      <path d="M5 14 H2.5 M27 14 H29.5" {...S} />
    </>
  ),
  trophy: (
    <>
      <path d="M8 5 H24 V11 Q24 19 16 19 Q8 19 8 11 Z" fill="#FFD23F" {...S} />
      <path d="M8 8 H4 Q4 14 9 14 M24 8 H28 Q28 14 23 14" fill="none" {...S} />
      <path d="M16 19 V24 M10 27 H22 L20.5 24 H11.5 Z" fill="#FFB703" {...S} />
      <path d="M12 8 Q12 13 14 15" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
    </>
  ),
  // Secrets stay on your phone: a padlock.
  secret: (
    <>
      <path d="M10 14 V10 Q10 4 16 4 Q22 4 22 10 V14" fill="none" {...S} strokeWidth={3} />
      <rect x="6" y="14" width="20" height="14" rx="3.5" fill="#FFD23F" {...S} />
      <circle cx="16" cy="20" r="2" fill={INK} />
      <path d="M16 21 V24" {...S} strokeWidth={2.2} />
    </>
  ),
  clash: (
    <path d="M16 2 L19 10 L27 7 L23 14 L30 18 L22 20 L24 28 L16 23 L8 28 L10 20 L2 18 L9 14 L5 7 L13 10 Z" fill="#FF7A1A" {...S} />
  ),
  heart: <path d="M16 27 Q4 19 4 11 Q4 5 10 5 Q14 5 16 9 Q18 5 22 5 Q28 5 28 11 Q28 19 16 27 Z" fill="#FF4D5E" {...S} />,
  scissors: (
    <>
      <circle cx="8" cy="24" r="4" fill="#FFFFFF" {...S} />
      <circle cx="24" cy="24" r="4" fill="#FFFFFF" {...S} />
      <path d="M11 21 L24 4 M21 21 L8 4" {...S} strokeWidth={3} />
    </>
  ),
};

export function Icon({ name, size = 24, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <Svg size={size} label={label}>
      {ICONS[name]}
    </Svg>
  );
}

/** Item art for the shop, the item hand and the host's item reveal. */
const ITEM_ART: Record<ItemId, ReactNode> = {
  doubleRoll: (
    <>
      <rect x="3" y="9" width="15" height="15" rx="3.5" fill="#FFFFFF" {...S} transform="rotate(-10 10 16)" />
      <circle cx="7.5" cy="13.5" r="1.4" fill={INK} />
      <circle cx="13" cy="19" r="1.4" fill={INK} />
      <rect x="14" y="6" width="15" height="15" rx="3.5" fill="#FFD23F" {...S} transform="rotate(12 21 13)" />
      <circle cx="21.5" cy="13.5" r="1.4" fill={INK} />
      <circle cx="18" cy="10" r="1.4" fill={INK} />
      <circle cx="25" cy="17" r="1.4" fill={INK} />
    </>
  ),
  warp: (
    <>
      <circle cx="16" cy="16" r="13" fill="#9B5DE5" {...S} />
      <path d="M16 16 m0 -8 a8 8 0 1 1 -7.5 5 M16 16 m0 -4 a4 4 0 1 1 -3.8 2.8" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  swap: (
    <>
      <path d="M6 11 H24 L20 6.5 M26 21 H8 L12 25.5" fill="none" {...S} strokeWidth={3.2} />
      <path d="M6 11 H24 L20 6.5 M26 21 H8 L12 25.5" fill="none" stroke="#3D7BFF" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  steal: (
    <>
      <path d="M9 28 V15 Q9 12 11 12 Q13 12 13 15 V8 Q13 5.5 15 5.5 Q17 5.5 17 8 V14 V7 Q17 4.5 19 4.5 Q21 4.5 21 7 V15 Q23 11 25 12.5 Q26.5 14 25 17 L21 28 Z" fill="#FFD7B5" {...S} />
      <circle cx="26" cy="7" r="4" fill="#FFD23F" {...S} strokeWidth={2} />
    </>
  ),
  starDiscount: (
    <>
      <path d="M4 9 H28 V13 Q25 16 28 19 V23 H4 V19 Q7 16 4 13 Z" fill="#FFD23F" {...S} />
      <path d="M12 12 L20 20 M12.5 19.5 L19.5 12.5" stroke="none" />
      <circle cx="12" cy="13.5" r="1.8" fill={INK} />
      <circle cx="20" cy="18.5" r="1.8" fill={INK} />
      <path d="M20.5 12.5 L11.5 19.5" {...S} strokeWidth={2.2} />
    </>
  ),
  trap: (
    <>
      <path d="M4 22 Q16 30 28 22" fill="none" {...S} strokeWidth={3} />
      <path d="M5 22 L8 14 L11 21 L14 13 L16 20 L18 13 L21 21 L24 14 L27 22" fill="#C8CCD4" {...S} />
      <ellipse cx="16" cy="24.5" rx="4" ry="2" fill="#FF4D5E" {...S} strokeWidth={2} />
    </>
  ),
  duelTicket: (
    <>
      <path d="M3 8 H29 V13 Q26 16 29 19 V24 H3 V19 Q6 16 3 13 Z" fill="#1B998B" {...S} />
      <path d="M11 11 L21 21 M21 11 L11 21" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
};

export function ItemIcon({ item, size = 28 }: { item: ItemId; size?: number }) {
  return <Svg size={size}>{ITEM_ART[item]}</Svg>;
}

/** The icon for how a player is connected: phone, laptop, or a bot. */
export function DeviceIcon({ device, bot = false, size = 22 }: { device: string | null | undefined; bot?: boolean; size?: number }) {
  if (bot) return <Icon name="bot" size={size} label="Bot" />;
  if (device === 'touch') return <Icon name="phone" size={size} label="Phone" />;
  if (device) return <Icon name="laptop" size={size} label="Computer" />;
  return null;
}
