import { describe, expect, it } from 'vitest';
import { encodeStroke, sanitiseStrokes, simplify, type Point } from './strokes.ts';

describe('strokes', () => {
  it('collapses a straight line to its endpoints', () => {
    const line: Point[] = Array.from({ length: 50 }, (_, i) => [i * 10, i * 5]);
    expect(simplify(line, 1)).toEqual([[0, 0], [490, 245]]);
  });

  it('keeps corners', () => {
    const l: Point[] = [[0, 0], [50, 0], [100, 0], [100, 50], [100, 100]];
    expect(simplify(l, 1)).toEqual([[0, 0], [100, 0], [100, 100]]);
  });

  it('encodes clamped integers', () => {
    expect(encodeStroke([[-5, 10.4], [1200, 20]], 1, 12).p).toEqual([0, 10, 1000, 20]);
  });

  it('sanitises hostile input', () => {
    expect(sanitiseStrokes('nope', 8)).toEqual([]);
    expect(sanitiseStrokes([{ c: 99, w: 1000, p: [1, 2, 3] }, { c: 99, w: 1000, p: [1, 2, 3, 4] }], 8)).toEqual([{ c: 7, w: 80, p: [1, 2, 3, 4] }]);
  });
});
