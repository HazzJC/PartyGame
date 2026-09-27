/**
 * Short text answers: normalisation and fuzzy grouping, so "The Dog", "dogs" and "dgo" count as
 * the same answer. The room can still vote to merge groups the matcher kept apart.
 */
const ARTICLES = new Set(['the', 'a', 'an', 'some', 'my']);

export function normaliseAnswer(raw: string): string {
  const words = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && ARTICLES.has(words[0]!)) words.shift();
  return words
    .map((w) => (w.length > 3 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 3 && w.endsWith('es') && /(s|x|ch|sh)es$/.test(w) ? w.slice(0, -2) : w.length > 2 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

/** Same answer after normalising, or a small typo relative to the word's length. */
export function sameAnswer(a: string, b: string): boolean {
  const na = normaliseAnswer(a);
  const nb = normaliseAnswer(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.replace(/ /g, '') === nb.replace(/ /g, '')) return true;
  const len = Math.min(na.length, nb.length);
  const allowed = len >= 8 ? 2 : len >= 4 ? 1 : 0;
  return editDistance(na, nb) <= allowed;
}

export interface AnswerGroup {
  /** The most common spelling in the group, shown to everyone. */
  label: string;
  ids: string[];
}

/** Groups answers by fuzzy match (greedy, largest-first so typos join the popular spelling). */
export function groupAnswers(answers: Record<string, string>): AnswerGroup[] {
  const entries = Object.entries(answers).filter(([, a]) => normaliseAnswer(a));
  // Count exact normalised spellings first so the most popular spelling anchors each group.
  const bySpelling = new Map<string, string[]>();
  for (const [id, a] of entries) bySpelling.set(normaliseAnswer(a), [...(bySpelling.get(normaliseAnswer(a)) ?? []), id]);
  const spellings = [...bySpelling.entries()].sort((x, y) => y[1].length - x[1].length);
  const groups: { key: string; ids: string[]; raw: Map<string, number> }[] = [];
  for (const [spelling, ids] of spellings) {
    const g = groups.find((x) => sameAnswer(x.key, spelling));
    const target = g ?? { key: spelling, ids: [], raw: new Map<string, number>() };
    if (!g) groups.push(target);
    target.ids.push(...ids);
    for (const id of ids) {
      const raw = answers[id]!.trim();
      target.raw.set(raw, (target.raw.get(raw) ?? 0) + 1);
    }
  }
  return groups
    .map((g) => ({ label: [...g.raw.entries()].sort((a, b) => b[1] - a[1])[0]![0], ids: g.ids }))
    .sort((a, b) => b.ids.length - a.ids.length);
}

/** Merges group `from` into group `to` (by index) — the room-vote override. */
export function mergeGroups(groups: AnswerGroup[], from: number, to: number): AnswerGroup[] {
  if (from === to || !groups[from] || !groups[to]) return groups;
  const merged = groups.map((g, i) => (i === to ? { label: g.label, ids: [...g.ids, ...groups[from]!.ids] } : g)).filter((_, i) => i !== from);
  return merged.sort((a, b) => b.ids.length - a.ids.length);
}

export const MAX_ANSWER = 30;

export function cleanAnswer(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER) : '';
}
