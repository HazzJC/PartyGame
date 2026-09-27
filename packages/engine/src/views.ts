import type { PublicSeat, Settings } from './types.ts';

/** What every client receives about the current phase; phase modules add their own fields. */
export interface PhaseView {
  kind: string;
  startedAt: number;
  endsAt: number | null;
  [k: string]: any;
}

export interface BaseView {
  code: string;
  seats: PublicSeat[];
  settings: Settings;
  paused: boolean;
  phase: PhaseView;
  game: any;
}

export type HostView = BaseView;

export interface PlayerView extends BaseView {
  me: PublicSeat;
}
