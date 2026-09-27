/** Seeded PRNG (xoshiro128**). Deterministic so server-simulated games can be replayed from a seed. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(p: number): boolean;
  /** Serialisable state so the RNG survives Durable Object eviction. */
  state(): [number, number, number, number];
}

function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

export function seedState(seed: number): [number, number, number, number] {
  const sm = splitmix32(seed);
  return [sm(), sm(), sm(), sm()];
}

export function createRng(seedOrState: number | readonly [number, number, number, number]): Rng {
  const s = typeof seedOrState === 'number' ? seedState(seedOrState) : ([...seedOrState] as [number, number, number, number]);
  const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;

  function nextU32(): number {
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    s[0] >>>= 0;
    s[1] >>>= 0;
    s[2] >>>= 0;
    return result;
  }

  const rng: Rng = {
    next: () => nextU32() / 4294967296,
    int: (min, max) => min + Math.floor(rng.next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from empty list');
      return items[Math.floor(rng.next() * items.length)]!;
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    chance: (p) => rng.next() < p,
    state: () => [s[0], s[1], s[2], s[3]],
  };
  return rng;
}
