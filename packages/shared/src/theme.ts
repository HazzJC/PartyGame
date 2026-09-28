/** Sticker-tabletop design tokens, shared by DOM (CSS variables) and Pixi. */
export const palette = {
  felt: '#F4E9D3',
  feltDark: '#E8D9BC',
  tableEdge: '#7A5236',
  ink: '#2B2233',
  inkSoft: '#5A4D63',
  paper: '#FFFFFF',
  blue: '#3D7BFF',
  red: '#FF4D5E',
  event: '#9B5DE5',
  shop: '#FFB703',
  duel: '#1B998B',
  star: '#FFD23F',
  good: '#2EC27E',
  bad: '#E5484D',
} as const;

/** 16 player identities: colour + animal + letter badge. The animal carries identity for colour-blind players. */
export const ANIMALS = [
  'fox', 'panda', 'frog', 'octopus', 'cat', 'dog', 'bear', 'rabbit',
  'pig', 'owl', 'penguin', 'lion', 'mouse', 'koala', 'chick', 'tiger',
] as const;
export type Animal = (typeof ANIMALS)[number];

export const PLAYER_COLOURS = [
  '#FF7A1A', '#4A4A4A', '#3DBE4B', '#C3408F', '#8E6CF0', '#B5793D', '#6B3E26', '#F28DB2',
  '#FF9EAA', '#7C8CFF', '#1E6FD9', '#E8B210', '#9AA5B1', '#5FB8B0', '#FFD84D', '#E4572E',
] as const;

export const MAX_PLAYERS = 16;

/** Team board mode: team colours (red, blue, green, gold) and their badge "avatar" ids. */
export const TEAM_COLOURS = ['#FF4D5E', '#3D7BFF', '#3DBE4B', '#FFB703'] as const;
export const TEAM_AVATAR_BASE = 100;
export const isTeamAvatar = (avatar: number): boolean => avatar >= TEAM_AVATAR_BASE;
