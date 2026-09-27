/**
 * NTP-style clock offset estimation. Each controller estimates its offset from the
 * server clock over several round trips, keeping the sample with the lowest RTT.
 */
export interface ClockSample {
  /** Local time the ping was sent. */
  t0: number;
  /** Local time the pong arrived. */
  t1: number;
  /** Server time stamped on the pong. */
  ts: number;
}

export function sampleOffset(s: ClockSample): { offset: number; rtt: number } {
  const rtt = s.t1 - s.t0;
  return { offset: s.ts - (s.t0 + rtt / 2), rtt };
}

export class ClockEstimator {
  private samples: { offset: number; rtt: number; at: number }[] = [];
  constructor(private readonly keep = 24) {}

  add(sample: ClockSample): void {
    const { offset, rtt } = sampleOffset(sample);
    if (rtt < 0 || !Number.isFinite(offset)) return;
    this.samples.push({ offset, rtt, at: sample.t1 });
    if (this.samples.length > this.keep) this.samples.shift();
  }

  get ready(): boolean {
    return this.samples.length > 0;
  }

  private best() {
    let best = this.samples[0];
    for (const s of this.samples) if (best && s.rtt < best.rtt) best = s;
    return best;
  }

  /** server time ≈ local time + offset */
  get offset(): number {
    return this.best()?.offset ?? 0;
  }

  get rtt(): number {
    return this.best()?.rtt ?? 0;
  }

  get sampleCount(): number {
    return this.samples.length;
  }
}
