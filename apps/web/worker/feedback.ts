import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env.ts';

export interface FeedbackEntry {
  at: number;
  code: string;
  seat: string;
  text: string;
  context: unknown;
}

/** A single global Durable Object collecting "Report a problem" notes from playtests. */
export class Feedback extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, code TEXT, seat TEXT, text TEXT, context TEXT)',
    );
  }

  add(entry: FeedbackEntry): void {
    this.ctx.storage.sql.exec(
      'INSERT INTO feedback (at, code, seat, text, context) VALUES (?, ?, ?, ?, ?)',
      entry.at, entry.code, entry.seat, entry.text.slice(0, 2000), JSON.stringify(entry.context ?? null).slice(0, 20000),
    );
  }

  list(limit = 200): FeedbackEntry[] {
    return this.ctx.storage.sql
      .exec<{ at: number; code: string; seat: string; text: string; context: string }>('SELECT at, code, seat, text, context FROM feedback ORDER BY id DESC LIMIT ?', limit)
      .toArray()
      .map((r) => ({ ...r, context: JSON.parse(r.context) }));
  }
}
