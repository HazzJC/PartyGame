import type { HostView } from '@partygame/engine';
import type { ComponentType } from 'react';
import type { Connection } from '../net/connection.ts';

export interface HostScreenProps {
  conn: Connection<HostView>;
  view: HostView;
}

/** Phase kind → host screen component. Game modules register themselves here. */
export const hostScreens: Record<string, ComponentType<HostScreenProps>> = {};

export function registerHostScreen(kind: string, component: ComponentType<HostScreenProps>): void {
  hostScreens[kind] = component;
}
