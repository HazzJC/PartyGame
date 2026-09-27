import type { HostView, PlayerView } from '@partygame/engine';
import type { ComponentType } from 'react';
import type { Connection } from '../net/connection.ts';

/** The minigame phase view (engine's minigamePhase.hostView / playerView). */
export interface MgHostPhase {
  gameId: string;
  name: string;
  format: string;
  participants: string[];
  teams: string[][] | null;
  stage: 'play' | 'reveal';
  result: any;
  payout: Record<string, number> | null;
  revealEndsAt: number | null;
  endsAt: number | null;
  game: any;
}

export interface MgPlayerPhase {
  gameId: string;
  name: string;
  format: string;
  playing: boolean;
  team: number | null;
  stage: 'play' | 'reveal';
  revealEndsAt: number | null;
  endsAt: number | null;
  mine: { coins: number; place: number | null; result: any } | null;
  game: any;
}

export interface MgHostProps {
  conn: Connection<HostView>;
  view: HostView;
  mg: MgHostPhase;
}

export interface MgPlayerProps {
  conn: Connection<PlayerView>;
  view: PlayerView;
  mg: MgPlayerPhase;
}

export interface MinigameUi {
  Host: ComponentType<MgHostProps>;
  Player: ComponentType<MgPlayerProps>;
}

const uis = new Map<string, MinigameUi>();

export function registerMinigameUi(id: string, ui: MinigameUi): void {
  uis.set(id, ui);
}

export function minigameUi(id: string): MinigameUi | undefined {
  return uis.get(id);
}
