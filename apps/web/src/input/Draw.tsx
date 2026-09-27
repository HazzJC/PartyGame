import { DRAW_PALETTE, DRAW_SIZE, MAX_STROKES, encodeStroke, type Point, type Stroke } from '@partygame/shared';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useVirtualKeys } from './keys.ts';

const WIDTHS = [10, 22, 44];

function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[], scale: number): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.strokeStyle = DRAW_PALETTE[s.c] ?? '#2B2233';
    ctx.lineWidth = s.w * scale;
    ctx.beginPath();
    ctx.moveTo(s.p[0]! * scale, s.p[1]! * scale);
    if (s.p.length === 2) ctx.lineTo(s.p[0]! * scale + 0.1, s.p[1]! * scale);
    for (let i = 2; i < s.p.length; i += 2) ctx.lineTo(s.p[i]! * scale, s.p[i + 1]! * scale);
    ctx.stroke();
  }
}

/**
 * Drawing pad. Finger, pen (with pressure) or mouse; strokes are vector-simplified and reported
 * after each stroke. Ctrl/⌘+Z or the Undo button removes the last stroke.
 */
export function Draw({
  strokes,
  onChange,
  locked = false,
  background,
  palette = DRAW_PALETTE.length,
}: {
  strokes: Stroke[];
  onChange: (s: Stroke[]) => void;
  locked?: boolean;
  /** Rendered behind the canvas, in a 0..1000 SVG space (e.g. neighbours' edges). */
  background?: ReactNode;
  /** How many palette colours to offer. */
  palette?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [colour, setColour] = useState(0);
  const [width, setWidth] = useState(1);
  const live = useRef<Point[] | null>(null);
  const [px, setPx] = useState(300);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPx(Math.floor(Math.min(el.clientWidth, el.clientHeight || el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    c.width = px * dpr;
    c.height = px * dpr;
    paint(ctx, strokes, (px * dpr) / DRAW_SIZE);
  }, [strokes, px, dpr]);

  const toPoint = (e: { clientX: number; clientY: number }): Point => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * DRAW_SIZE, ((e.clientY - r.top) / r.height) * DRAW_SIZE];
  };

  const drawLive = () => {
    const ctx = canvas.current?.getContext('2d');
    const pts = live.current;
    if (!ctx || !pts) return;
    const scale = (px * dpr) / DRAW_SIZE;
    const w = WIDTHS[width]!;
    paint(ctx, [...strokes, { c: colour, w, p: pts.flatMap((p) => p) }], scale);
  };

  const onPointer = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (locked) return;
    if (e.type === 'pointerdown') {
      if (strokes.length >= MAX_STROKES) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      live.current = [toPoint(e)];
      drawLive();
    } else if (e.type === 'pointermove' && live.current) {
      const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
      for (const ev of events) live.current.push(toPoint(ev));
      drawLive();
    } else if ((e.type === 'pointerup' || e.type === 'pointercancel') && live.current) {
      const pts = live.current;
      live.current = null;
      const pressure = e.pointerType === 'pen' && e.pressure > 0 ? 0.6 + e.pressure : 1;
      onChange([...strokes, encodeStroke(pts, colour, WIDTHS[width]! * pressure)]);
    }
  };

  useVirtualKeys((e) => {
    if (e.down && (e.raw === 'z' || e.raw === 'Z') && !locked) onChange(strokes.slice(0, -1));
  }, !locked);

  return (
    <div className="draw">
      <div ref={wrap} className="draw-canvas-wrap">
        <div className="draw-square" style={{ width: px, height: px }}>
          {background && (
            <svg className="draw-bg" viewBox={`0 0 ${DRAW_SIZE} ${DRAW_SIZE}`}>
              {background}
            </svg>
          )}
          <canvas
            ref={canvas}
            className="draw-canvas"
            style={{ width: px, height: px }}
            onPointerDown={onPointer}
            onPointerMove={onPointer}
            onPointerUp={onPointer}
            onPointerCancel={onPointer}
          />
        </div>
      </div>
      <div className="draw-tools">
        <div className="draw-colours" role="radiogroup" aria-label="Colour">
          {DRAW_PALETTE.slice(0, palette).map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={colour === i} className="draw-swatch" style={{ background: c }} onClick={() => setColour(i)} aria-label={`Colour ${i + 1}`} />
          ))}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {WIDTHS.map((w, i) => (
            <button key={w} type="button" className="draw-width" aria-pressed={width === i} onClick={() => setWidth(i)} aria-label={`Brush ${i + 1}`}>
              <span style={{ width: 6 + i * 7, height: 6 + i * 7 }} />
            </button>
          ))}
          <button type="button" className="btn white small" disabled={locked || strokes.length === 0} onClick={() => onChange(strokes.slice(0, -1))}>
            Undo
          </button>
          <button type="button" className="btn white small" disabled={locked || strokes.length === 0} onClick={() => onChange([])}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
