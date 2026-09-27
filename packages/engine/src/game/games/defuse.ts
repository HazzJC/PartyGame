import type { CoopGrade } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Defuse the Circuit (co-op, needs voice): one operator sees the bomb and can cut, press and hold.
 * Everyone else holds part of the manual on their phone and nobody else can see the bomb, so the
 * room has to talk. Above 10 players there are two bombs, two operators and two halves of the room.
 */
export const WIRE_COLOURS = ['red', 'blue', 'yellow', 'white', 'black'] as const;
export type WireColour = (typeof WIRE_COLOURS)[number];
export const SYMBOLS = ['Ω', '★', '♣', '☂', '◆', '☀', '♞', '✿', '⚓', '♜', '☯', '✈'] as const;
/** The keypad manual: press the four symbols in the order they appear in whichever column holds all four. */
export const COLUMNS: string[][] = [
  ['Ω', '♣', '☀', '✿', '♜', '☯'],
  ['★', '☂', '◆', '⚓', '✈', 'Ω'],
  ['♞', '✿', '☂', '★', '♣', '⚓'],
];

export interface Bomb {
  wires: WireColour[];
  cut: number[];
  wiresDone: boolean;
  buttonColour: 'red' | 'blue' | 'yellow';
  buttonLabel: 'HOLD' | 'ABORT' | 'PRESS';
  buttonDone: boolean;
  keys: string[];
  pressed: string[];
  keypadDone: boolean;
  strikes: number;
  exploded: boolean;
}

export interface DefuseData {
  bombs: Bomb[];
  operators: string[];
  /** Readers per bomb, and which manual page each holds. */
  readers: string[][];
  pages: Record<string, ('wires' | 'button' | 'keypad')[]>;
  closesAt: number;
  serial: number;
}

const TIME_MS = 150_000;

/** The wire manual: which wire (0-based) to cut. */
export function wireToCut(wires: WireColour[], serialOdd: boolean): number {
  const count = (c: WireColour) => wires.filter((w) => w === c).length;
  const last = (c: WireColour) => wires.lastIndexOf(c);
  if (wires.length === 3) {
    if (count('red') === 0) return 1;
    if (wires[2] === 'white') return 2;
    if (count('blue') > 1) return last('blue');
    return 2;
  }
  if (wires.length === 4) {
    if (count('red') > 1 && serialOdd) return last('red');
    if (wires[3] === 'yellow' && count('red') === 0) return 0;
    if (count('blue') === 1) return 0;
    return 1;
  }
  if (wires[4] === 'black' && serialOdd) return 3;
  if (count('red') === 1 && count('yellow') > 1) return 0;
  if (count('black') === 0) return 1;
  return 0;
}

/** The button manual: tap it, or hold it (and release when told). */
export function buttonAction(colour: Bomb['buttonColour'], label: Bomb['buttonLabel']): 'tap' | 'hold' {
  if (colour === 'blue' && label === 'ABORT') return 'hold';
  if (label === 'PRESS') return 'tap';
  if (colour === 'red' && label === 'HOLD') return 'tap';
  return 'hold';
}

export function keypadOrder(keys: string[]): string[] {
  const col = COLUMNS.find((c) => keys.every((k) => c.includes(k)))!;
  return [...keys].sort((a, b) => col.indexOf(a) - col.indexOf(b));
}

export function defuseGrade(bombs: Bomb[]): CoopGrade {
  if (bombs.some((b) => b.exploded || !(b.wiresDone && b.buttonDone && b.keypadDone))) return 'fail';
  const strikes = Math.max(...bombs.map((b) => b.strikes));
  return strikes === 0 ? 'gold' : strikes === 1 ? 'silver' : 'bronze';
}

function makeBomb(ctx: MgContext): Bomb {
  const n = ctx.rng.int(3, 5);
  const col = ctx.rng.pick(COLUMNS);
  return {
    wires: Array.from({ length: n }, () => ctx.rng.pick(WIRE_COLOURS)),
    cut: [],
    wiresDone: false,
    buttonColour: ctx.rng.pick(['red', 'blue', 'yellow'] as const),
    buttonLabel: ctx.rng.pick(['HOLD', 'ABORT', 'PRESS'] as const),
    buttonDone: false,
    keys: ctx.rng.shuffle(col).slice(0, 4),
    pressed: [],
    keypadDone: false,
    strikes: 0,
    exploded: false,
  };
}

function strike(b: Bomb): void {
  b.strikes++;
  if (b.strikes >= 3) b.exploded = true;
}

function done(d: DefuseData): boolean {
  return d.bombs.every((b) => b.exploded || (b.wiresDone && b.buttonDone && b.keypadDone));
}

export const defuseCircuit = defineMinigame<DefuseData>({
  id: 'defuse-circuit',
  name: 'Defuse the Circuit',
  formats: ['coop'],
  minPlayers: 3,
  inputs: [{ kind: 'pick', what: 'Operator: cut, press, hold' }],
  blurb: 'Talk it out! One operator sees the bomb. Everyone else has part of the manual. Describe, read, and defuse all three modules before time runs out. Three strikes and it blows.',
  setup(ctx) {
    const ids = ctx.rng.shuffle(ctx.phase.participants);
    const bombsN = ctx.n > 10 ? 2 : 1;
    const operators = ids.slice(0, bombsN);
    const rest = ids.slice(bombsN);
    const readers = operators.map((_, b) => rest.filter((_, i) => i % bombsN === b));
    const pages: DefuseData['pages'] = {};
    const kinds = ['wires', 'button', 'keypad'] as const;
    // Share out the three manual pages: everyone holds at least one, small groups hold more.
    for (const group of readers)
      group.forEach((id, i) => {
        if (group.length === 1) pages[id] = [...kinds];
        else if (group.length === 2) pages[id] = i === 0 ? ['wires', 'keypad'] : ['button'];
        else pages[id] = [kinds[i % 3]!];
      });
    const closesAt = ctx.now() + TIME_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt);
    return { bombs: operators.map(() => makeBomb(ctx)), operators, readers, pages, closesAt, serial: ctx.rng.int(100, 999) };
  },
  intent(ctx, d, seatId, intent) {
    const bi = d.operators.indexOf(seatId);
    const b = d.bombs[bi];
    if (!b || b.exploded) return;
    if (intent.type === 'cut' && !b.wiresDone) {
      const w = Number(intent.wire);
      if (!Number.isInteger(w) || w < 0 || w >= b.wires.length || b.cut.includes(w)) return;
      b.cut.push(w);
      if (w === wireToCut(b.wires, d.serial % 2 === 1)) b.wiresDone = true;
      else strike(b);
    } else if (intent.type === 'button' && !b.buttonDone) {
      const how = intent.how === 'hold' ? 'hold' : 'tap';
      // A held button is released on the countdown's last digit: 4 for blue, 1 otherwise.
      const want = buttonAction(b.buttonColour, b.buttonLabel);
      const releaseOk = how === 'tap' || Number(intent.releaseDigit) === (b.buttonColour === 'blue' ? 4 : 1);
      if (how === want && releaseOk) b.buttonDone = true;
      else strike(b);
    } else if (intent.type === 'key' && !b.keypadDone) {
      const k = String(intent.key);
      if (!b.keys.includes(k) || b.pressed.includes(k)) return;
      const order = keypadOrder(b.keys);
      if (order[b.pressed.length] === k) {
        b.pressed.push(k);
        if (b.pressed.length === 4) b.keypadDone = true;
      } else {
        strike(b);
        b.pressed = [];
      }
    }
    if (done(d)) ctx.hurry('deadline', 1000);
  },
  timer(ctx, d, key) {
    if (key === 'deadline') ctx.finish({ kind: 'coop', grade: defuseGrade(d.bombs) }, 5000);
  },
  awaiting: (_ctx, d, seatId) => d.operators.includes(seatId),
  botDelay: [3000, 8000],
  bot(ctx, d, seatId) {
    // Bot operators "hear" the manual perfectly most of the time.
    const b = d.bombs[d.operators.indexOf(seatId)]!;
    const good = ctx.rng.chance(0.85);
    if (!b.wiresDone) return { type: 'cut', wire: good ? wireToCut(b.wires, d.serial % 2 === 1) : ctx.rng.int(0, b.wires.length - 1) };
    if (!b.buttonDone) return { type: 'button', how: good ? buttonAction(b.buttonColour, b.buttonLabel) : 'tap', releaseDigit: b.buttonColour === 'blue' ? 4 : 1 };
    if (!b.keypadDone) return { type: 'key', key: good ? keypadOrder(b.keys)[b.pressed.length]! : ctx.rng.pick(b.keys) };
    return null;
  },
  hostView: (_ctx, d) => ({
    operators: d.operators,
    closesAt: d.closesAt,
    bombs: d.bombs.map((b) => ({ modules: [b.wiresDone, b.buttonDone, b.keypadDone], strikes: b.strikes, exploded: b.exploded })),
  }),
  playerView: (_ctx, d, seatId) => {
    const bi = d.operators.indexOf(seatId);
    const b = d.bombs[bi];
    return {
      role: b ? 'operator' : 'reader',
      closesAt: d.closesAt,
      serial: d.serial,
      bomb: b ? { wires: b.wires, cut: b.cut, wiresDone: b.wiresDone, buttonColour: b.buttonColour, buttonLabel: b.buttonLabel, buttonDone: b.buttonDone, keys: b.keys, pressed: b.pressed, keypadDone: b.keypadDone, strikes: b.strikes, exploded: b.exploded } : null,
      pages: d.pages[seatId] ?? [],
      bombIndex: b ? bi : d.readers.findIndex((g) => g.includes(seatId)),
      bombsN: d.bombs.length,
    };
  },
});
