import type { Feedback } from './feedback.ts';
import type { Room } from './room.ts';

export interface Env {
  ROOMS: DurableObjectNamespace<Room>;
  FEEDBACK: DurableObjectNamespace<Feedback>;
  ASSETS: Fetcher;
  /** Secret for reading feedback at /api/admin/feedback?key=… (set with `wrangler secret put ADMIN_KEY`). */
  ADMIN_KEY?: string;
}
