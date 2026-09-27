import { describe, expect, it } from 'vitest';
import { groupAnswers, mergeGroups, normaliseAnswer, sameAnswer } from './text.ts';

describe('fuzzy answers', () => {
  it('normalises case, articles, punctuation and simple plurals', () => {
    expect(normaliseAnswer('  The Dogs! ')).toBe('dog');
    expect(normaliseAnswer('Cherries')).toBe('cherry');
    expect(normaliseAnswer('boxes')).toBe('box');
    expect(normaliseAnswer('glass')).toBe('glass');
    expect(normaliseAnswer('Fish & Chips')).toBe('fish and chip');
  });

  it('forgives small typos on longer words only', () => {
    expect(sameAnswer('banana', 'bannana')).toBe(true);
    expect(sameAnswer('pizza', 'piza')).toBe(true);
    expect(sameAnswer('cat', 'car')).toBe(false);
    expect(sameAnswer('ice cream', 'icecream')).toBe(true);
    expect(sameAnswer('chocolate', 'choclate')).toBe(true);
  });

  it('groups around the most popular spelling', () => {
    const groups = groupAnswers({ a: 'Pizza', b: 'pizza', c: 'Piza', d: 'Tacos', e: 'taco', f: 'Sushi', g: '' });
    expect(groups.map((g) => [g.label, g.ids.length])).toEqual([
      ['Pizza', 3],
      ['Tacos', 2],
      ['Sushi', 1],
    ]);
  });

  it('the room can merge two groups', () => {
    const groups = groupAnswers({ a: 'soda', b: 'soda', c: 'pop' });
    const merged = mergeGroups(groups, 1, 0);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.ids.sort()).toEqual(['a', 'b', 'c']);
  });
});
