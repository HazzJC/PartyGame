import type { PlayerView } from '@partygame/engine';
import type { ComponentType } from 'react';
import type { Connection } from '../net/connection.ts';

export interface PlayerScreenProps {
  conn: Connection<PlayerView>;
  view: PlayerView;
}

/** Phase kind → player screen component. Game modules register themselves here. */
export const playerScreens: Record<string, ComponentType<PlayerScreenProps>> = {};

export function registerPlayerScreen(kind: string, component: ComponentType<PlayerScreenProps>): void {
  playerScreens[kind] = component;
}
