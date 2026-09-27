import { describe, expect, it } from 'vitest';
import { ClockEstimator, sampleOffset } from './clock.ts';

describe('clock sync', () => {
  it('computes offset from a symmetric round trip', () => {
    // Server is 5000 ms ahead, 100 ms each way.
    expect(sampleOffset({ t0: 1000, t1: 1200, ts: 6100 })).toEqual({ offset: 5000, rtt: 200 });
  });

  it('prefers the lowest-RTT sample', () => {
    const c = new ClockEstimator();
    c.add({ t0: 0, t1: 400, ts: 5350 }); // asymmetric, slow: offset 5150
    c.add({ t0: 1000, t1: 1040, ts: 6020 }); // fast: offset 5000
    c.add({ t0: 2000, t1: 2300, ts: 7100 });
    expect(c.offset).toBe(5000);
    expect(c.rtt).toBe(40);
  });
});
