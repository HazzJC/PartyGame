import { useRef, useState, type PointerEvent as RPointerEvent, type ReactNode, type WheelEvent as RWheelEvent } from 'react';
import { useDevice, wantsOnScreenControls } from './device.ts';
import { useVirtualKeys } from './keys.ts';

export interface CellLook {
  fill: string;
  /** Optional glyph drawn in the cell. */
  glyph?: string;
  glyphColour?: string;
  stroke?: string;
}

export interface GridView {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Grid placement: tap/click a cell, arrows + Enter, gamepad d-pad + A, R/⟳ to rotate. Pinch or
 * wheel to zoom, drag to pan. `focus` sets the initial zoomed view of the player's own area.
 */
export function Grid({
  w,
  h,
  cell,
  onCell,
  shape,
  onRotate,
  focus,
  locked = false,
  overlay,
}: {
  w: number;
  h: number;
  cell: (x: number, y: number) => CellLook;
  onCell: (x: number, y: number) => void;
  /** Offsets previewed at the cursor (e.g. a polyomino). Defaults to a single cell. */
  shape?: [number, number][];
  onRotate?: () => void;
  focus?: GridView;
  locked?: boolean;
  /** Extra SVG drawn in cell coordinates (paths, lasers…). */
  overlay?: ReactNode;
}) {
  const device = useDevice();
  const touch = wantsOnScreenControls(device);
  const [view, setView] = useState<GridView>(() => focus ?? { x: 0, y: 0, w, h });
  const [cursor, setCursor] = useState<[number, number]>(() => [Math.floor((focus?.x ?? 0) + (focus?.w ?? w) / 2), Math.floor((focus?.y ?? 0) + (focus?.h ?? h) / 2)]);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; startDist: number; startView: GridView; startMid: { x: number; y: number } } | null>(null);

  const clampView = (v: GridView): GridView => {
    const vw = Math.min(w, Math.max(3, v.w));
    const vh = Math.min(h, Math.max(3, v.h));
    return { w: vw, h: vh, x: Math.min(w - vw, Math.max(0, v.x)), y: Math.min(h - vh, Math.max(0, v.y)) };
  };

  const toCell = (clientX: number, clientY: number): [number, number] | null => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return null;
    const scale = Math.min(r.width / view.w, r.height / view.h);
    const ox = (r.width - view.w * scale) / 2;
    const oy = (r.height - view.h * scale) / 2;
    const cx = Math.floor(view.x + (clientX - r.left - ox) / scale);
    const cy = Math.floor(view.y + (clientY - r.top - oy) / scale);
    return cx >= 0 && cy >= 0 && cx < w && cy < h ? [cx, cy] : null;
  };

  useVirtualKeys((e) => {
    if (!e.down || locked) return;
    const [x, y] = cursor;
    const move = (nx: number, ny: number) => {
      const c: [number, number] = [Math.min(w - 1, Math.max(0, nx)), Math.min(h - 1, Math.max(0, ny))];
      setCursor(c);
      // Keep the cursor in view when zoomed.
      setView((v) => clampView({ ...v, x: c[0] < v.x ? c[0] : c[0] >= v.x + v.w ? c[0] - v.w + 1 : v.x, y: c[1] < v.y ? c[1] : c[1] >= v.y + v.h ? c[1] - v.h + 1 : v.y }));
    };
    if (e.key === 'left') move(x - 1, y);
    if (e.key === 'right') move(x + 1, y);
    if (e.key === 'up') move(x, y - 1);
    if (e.key === 'down') move(x, y + 1);
    if (e.key === 'confirm') onCell(x, y);
    if (e.key === 'alt' || e.key === 'back') onRotate?.();
  });

  const onPointer = (e: RPointerEvent<SVGSVGElement>) => {
    const p = pointers.current;
    if (e.type === 'pointerdown') {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      p.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...p.values()];
      const mid = pts.reduce((a, b) => ({ x: a.x + b.x / pts.length, y: a.y + b.y / pts.length }), { x: 0, y: 0 });
      const dist = pts.length > 1 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
      gesture.current = { moved: pts.length > 1, startDist: dist, startView: view, startMid: mid };
      return;
    }
    if (e.type === 'pointermove') {
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        setHover(toCell(e.clientX, e.clientY));
        return;
      }
      if (!p.has(e.pointerId) || !gesture.current) return;
      p.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture.current;
      const r = svg.current!.getBoundingClientRect();
      const scale = Math.min(r.width / g.startView.w, r.height / g.startView.h);
      const pts = [...p.values()];
      const mid = pts.reduce((a, b) => ({ x: a.x + b.x / pts.length, y: a.y + b.y / pts.length }), { x: 0, y: 0 });
      const dx = (mid.x - g.startMid.x) / scale;
      const dy = (mid.y - g.startMid.y) / scale;
      if (Math.abs(dx) + Math.abs(dy) > 0.4) g.moved = true;
      if (!g.moved) return;
      let nv = { ...g.startView, x: g.startView.x - dx, y: g.startView.y - dy };
      if (pts.length > 1 && g.startDist > 0) {
        const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
        const k = g.startDist / dist;
        const cw = g.startView.w * k;
        const ch = g.startView.h * k;
        nv = { x: g.startView.x + (g.startView.w - cw) / 2 - dx, y: g.startView.y + (g.startView.h - ch) / 2 - dy, w: cw, h: ch };
      }
      setView(clampView(nv));
      return;
    }
    // up / cancel
    const g = gesture.current;
    p.delete(e.pointerId);
    if (e.type === 'pointerup' && g && !g.moved && p.size === 0 && !locked) {
      const c = toCell(e.clientX, e.clientY);
      if (c) {
        setCursor(c);
        onCell(c[0], c[1]);
      }
    }
    if (p.size === 0) gesture.current = null;
  };

  const onWheel = (e: RWheelEvent<SVGSVGElement>) => {
    const k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const c = toCell(e.clientX, e.clientY) ?? [view.x + view.w / 2, view.y + view.h / 2];
    setView((v) => clampView({ w: v.w * k, h: v.h * k, x: c[0] - (c[0] - v.x) * k, y: c[1] - (c[1] - v.y) * k }));
  };

  const at = touch ? null : hover ?? cursor;
  const preview = (shape ?? [[0, 0]]).map(([dx, dy]) => [(at?.[0] ?? -99) + dx, (at?.[1] ?? -99) + dy] as const);
  const zoomed = view.w < w || view.h < h;

  const cells: ReactNode[] = [];
  const x0 = Math.max(0, Math.floor(view.x));
  const y0 = Math.max(0, Math.floor(view.y));
  for (let y = y0; y < Math.min(h, Math.ceil(view.y + view.h)); y++)
    for (let x = x0; x < Math.min(w, Math.ceil(view.x + view.w)); x++) {
      const look = cell(x, y);
      cells.push(
        <g key={`${x},${y}`}>
          <rect x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} rx={0.18} fill={look.fill} stroke={look.stroke ?? 'rgba(43,34,51,0.35)'} strokeWidth={0.06} />
          {look.glyph && (
            <text x={x + 0.5} y={y + 0.68} textAnchor="middle" fontSize={0.55} fontFamily="var(--font-display)" fill={look.glyphColour ?? '#2B2233'}>
              {look.glyph}
            </text>
          )}
        </g>,
      );
    }

  return (
    <div className="grid-wrap">
      <svg
        ref={svg}
        className="grid-svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerUp={onPointer}
        onPointerCancel={onPointer}
        onPointerLeave={() => setHover(null)}
        onWheel={onWheel}
      >
        {cells}
        {overlay}
        {!locked &&
          preview.map(([x, y], i) =>
            x >= 0 && y >= 0 && x < w && y < h ? (
              <rect key={i} x={x + 0.06} y={y + 0.06} width={0.88} height={0.88} rx={0.18} fill="rgba(255,210,63,0.55)" stroke="#2B2233" strokeWidth={0.1} pointerEvents="none" />
            ) : null,
          )}
      </svg>
      <div className="grid-tools">
        {onRotate && (
          <button type="button" className="btn white small" onClick={onRotate} disabled={locked} aria-label="Rotate">
            ⟳
          </button>
        )}
        {zoomed ? (
          <button type="button" className="btn white small" onClick={() => setView({ x: 0, y: 0, w, h })}>
            Whole map
          </button>
        ) : (
          focus && (
            <button type="button" className="btn white small" onClick={() => setView(focus)}>
              My area
            </button>
          )
        )}
      </div>
    </div>
  );
}
