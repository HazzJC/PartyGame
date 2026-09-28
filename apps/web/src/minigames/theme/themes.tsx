import type { ComponentType, CSSProperties, ReactNode } from 'react';
import './theme.css';

/**
 * Every mini game lives somewhere in the Sticker Party world: a paper-diorama scene behind the
 * host screen and the rules card, an accent colour, and a looping how-to-play demo. Scenes and
 * demos register themselves (see scenes*.tsx and demos*.tsx), so games without one still work.
 */

export interface GameTheme {
  /** Which scene sets the stage. */
  scene: string;
  /** The place's name, shown on the rules card. */
  place: string;
  accent: string;
  /** Scene art behind the phone header: the vertical slice of the scene to show (0 to 960). */
  stripY?: number;
}

export const THEMES: Record<string, GameTheme> = {
  'lowest-unique': { scene: 'studio', place: 'The Paper TV Studio', accent: '#9B5DE5', stripY: 40 },
  'stopwatch-chicken': { scene: 'workshop', place: "The Clockmaker's Workshop", accent: '#C9892B', stripY: 60 },
  'count-to': { scene: 'sheepfield', place: 'Sleepy Sheep Meadow', accent: '#6B6FD6', stripY: 120 },
  'tug-of-war': { scene: 'mudpit', place: 'The Mud Pit Fair', accent: '#8A5A3C', stripY: 40 },
  'hunter-vs-hiders': { scene: 'nightwoods', place: 'The Midnight Woods', accent: '#2E7A4F', stripY: 60 },
  'quick-draw': { scene: 'western', place: 'Tumbleweed Main Street', accent: '#E07A3F', stripY: 80 },
  'silent-trample': { scene: 'savanna', place: 'The Stampede Plains', accent: '#E0A93F', stripY: 60 },
  'pick-a-door': { scene: 'haunted', place: 'Creaky Manor', accent: '#6B4FA0', stripY: 60 },
  'pick-a-door-setter': { scene: 'haunted', place: "Creaky Manor's Cellar", accent: '#8A3F6B', stripY: 60 },
  'deep-sea-sonar': { scene: 'underwater', place: 'The Paper Deep', accent: '#1F6FB5', stripY: 40 },
  'raft-gamble': { scene: 'river', place: 'Rapids River', accent: '#2A9D8F', stripY: 60 },
  'crumble-tower': { scene: 'castle', place: 'Wobbly Castle', accent: '#B5541E', stripY: 60 },
  'herd-mentality': { scene: 'farm', place: 'Woolly Farm', accent: '#D0463D', stripY: 60 },
  'odd-one-out': { scene: 'detective', place: 'The Detective Agency', accent: '#4F5D75', stripY: 60 },
  'who-wrote-that': { scene: 'postoffice', place: 'The Paper Post Office', accent: '#D0463D', stripY: 60 },
  'predict-the-crowd': { scene: 'stadium', place: 'The Big Match', accent: '#2E86DE', stripY: 40 },
  'sumo-programming': { scene: 'dojo', place: 'The Sumo Dojo', accent: '#C0392B', stripY: 60 },
  artillery: { scene: 'hills', place: 'Windy Hills', accent: '#5E8C31', stripY: 60 },
  'artillery-fortress': { scene: 'hills', place: 'Fortress Ridge', accent: '#7A6A53', stripY: 60 },
  heist: { scene: 'museum', place: 'The Midnight Museum', accent: '#34495E', stripY: 60 },
  'heist-guard': { scene: 'museum', place: 'The Museum Security Office', accent: '#2C3E50', stripY: 60 },
  'land-grab': { scene: 'maptable', place: "The Explorers' Table", accent: '#A0522D', stripY: 60 },
  'synchronised-pulse': { scene: 'disco', place: 'The Glitter Disco', accent: '#E84393', stripY: 40 },
  'mirror-maze': { scene: 'crystalcave', place: 'Crystal Caverns', accent: '#6C5CE7', stripY: 60 },
  'radar-beacon': { scene: 'radar', place: 'Lighthouse Point', accent: '#0984E3', stripY: 60 },
  'blind-architect': { scene: 'building', place: 'Brick by Brick Site', accent: '#E1A100', stripY: 60 },
  'recipe-assembly': { scene: 'diner', place: 'The Sticker Diner', accent: '#E74C3C', stripY: 60 },
  'runaway-switchboard': { scene: 'railyard', place: 'Junction Yard', accent: '#C0392B', stripY: 60 },
  'pressure-valve': { scene: 'boiler', place: 'The Boiler Room', accent: '#B87333', stripY: 60 },
  'the-mind': { scene: 'zen', place: 'The Quiet Summit', accent: '#5F6CAF', stripY: 80 },
  'collaborative-quilt': { scene: 'sewing', place: 'The Sewing Circle', accent: '#E17055', stripY: 60 },
  'defuse-circuit': { scene: 'bunker', place: 'The Bomb Bunker', accent: '#E17000', stripY: 60 },
  'meteor-shield': { scene: 'space', place: 'Orbit Station', accent: '#6C5CE7', stripY: 40 },
};

export const themeOf = (gameId: string): GameTheme | undefined => THEMES[gameId];

// ------------------------------------------------------------------ scenes

const scenes = new Map<string, () => ReactNode>();

/** A scene draws into a 1460×960 box (the host's game area), keeping the middle calm for the game. */
export function registerScene(id: string, draw: () => ReactNode): void {
  scenes.set(id, draw);
}

/** The scene behind a mini game on the host (animated there; still on low or no animation). */
export function Scene({ gameId }: { gameId: string }) {
  const theme = themeOf(gameId);
  const draw = theme && scenes.get(theme.scene);
  if (!draw) return null;
  return (
    <svg className="mg-scene" data-scene={theme.scene} viewBox="0 0 1460 960" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {draw()}
    </svg>
  );
}

/** A slice of the scene behind the phone's header, so each game feels like its own place there too. */
export function SceneStrip({ gameId }: { gameId: string }) {
  const theme = themeOf(gameId);
  const draw = theme && scenes.get(theme.scene);
  if (!draw) return null;
  return (
    <svg className="mg-scene-strip" viewBox={`0 ${theme.stripY ?? 60} 1460 240`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {draw()}
    </svg>
  );
}

/** CSS variables for a game's accent colour. */
export function themeStyle(gameId: string): CSSProperties {
  const t = themeOf(gameId);
  return t ? ({ ['--mg-accent' as string]: t.accent } as CSSProperties) : {};
}

// ------------------------------------------------------------------ demos

const demos = new Map<string, ComponentType>();

export function registerDemo(gameId: string, demo: ComponentType): void {
  demos.set(gameId, demo);
}

/** The looping how-to-play animation for a game, if it has one. */
export function Demo({ gameId }: { gameId: string }) {
  const D = demos.get(gameId);
  return D ? <D /> : null;
}

export const hasDemo = (gameId: string) => demos.has(gameId);
