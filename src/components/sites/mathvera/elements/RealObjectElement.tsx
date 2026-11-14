"use client";

import React, { useMemo } from "react";
import { CanvasElement } from "@/types/whiteboard";
import { getRealWorldItem } from "@/lib/realworld-art";

interface Point2D {
  x: number;
  y: number;
}

function resolvePointCoords(
  allElements: CanvasElement[]
): Map<string, Point2D> {
  const map = new Map<string, Point2D>();
  for (const el of allElements) {
    if (el.type === "Point" || el.type === "GeomPoint") {
      const x =
        typeof el.props?.x === "number" ? el.props.x : el.transform.x;
      const y =
        typeof el.props?.y === "number" ? el.props.y : el.transform.y;
      map.set(el.id, { x, y });
    }
  }
  return map;
}

/**
 * Computes the 2D SVG affine matrix `[a, b, c, d, e, f]` aligning the icon's
 * normalized box `[x0, y0, x1, y1]` so its bottom-center rests at `from`
 * and its top-center reaches `to`, preserving aspect ratio * `widthScale`.
 */
export function computeArtTransformMatrix(
  from: Point2D,
  to: Point2D,
  box: [number, number, number, number],
  widthScale = 1,
  flip = false
): [number, number, number, number, number, number] | null {
  const s = { x: from.x, y: -from.y };
  const o = { x: to.x, y: -to.y };
  const dx = o.x - s.x;
  const dy = o.y - s.y;
  const dist = Math.hypot(dx, dy);
  const boxH = box[3] - box[1];
  if (dist < 1e-9 || boxH < 1e-9) return null;

  const scaleY = dist / boxH;
  const ux = dx / dist;
  const uy = -dy / dist;
  const scaleX = scaleY * widthScale * (flip ? -1 : 1);

  const a = uy * scaleX;
  const b = ux * scaleX;
  const c = -ux * scaleY;
  const d = uy * scaleY;

  const anchorX = (box[0] + box[2]) / 2;
  const anchorY = box[3];

  return [
    a,
    b,
    c,
    d,
    s.x - (a * anchorX + c * anchorY),
    s.y - (b * anchorX + d * anchorY),
  ];
}

function getBoxCorners(
  m: [number, number, number, number, number, number],
  box: [number, number, number, number]
): string {
  const mapPt = (x: number, y: number) => ({
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
  });
  const [x0, y0, x1, y1] = box;
  return [mapPt(x0, y1), mapPt(x1, y1), mapPt(x1, y0), mapPt(x0, y0)]
    .map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`)
    .join(" ");
}

export interface RealObjectElementProps {
  element: CanvasElement;
  allElements?: CanvasElement[];
  points?: Map<string, Point2D>;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

/**
 * Renders a `RealObject` SVG icon or uploaded image pinned between `from` (base) and `to` (top).
 */
export const RealObjectElement: React.FC<RealObjectElementProps> = ({
  element,
  allElements = [],
  points,
  isSelected = false,
  onPointerDown,
}) => {
  const iconId = typeof element.props?.icon === "string" ? element.props.icon : "tree";
  const src = typeof element.props?.src === "string" ? element.props.src : undefined;
  const ratio = typeof element.props?.ratio === "number" ? element.props.ratio : 1;
  const widthScale =
    typeof element.props?.width === "number" && element.props.width > 0
      ? element.props.width
      : 1;
  const flip = Boolean(element.props?.flip);
  const fromId = typeof element.props?.from === "string" ? element.props.from : "";
  const toId = typeof element.props?.to === "string" ? element.props.to : "";

  const item = useMemo(() => getRealWorldItem(iconId), [iconId]);
  const box = useMemo<[number, number, number, number]>(
    () => (src ? [0, 0, ratio, 1] : item.box),
    [src, ratio, item.box]
  );

  const fallbackPoints = useMemo(
    () => resolvePointCoords(allElements),
    [allElements]
  );

  const matrix = useMemo(() => {
    const fromPt = points?.get(fromId) ?? fallbackPoints.get(fromId) ?? {
      x: element.transform.x,
      y: element.transform.y,
    };
    const toPt = points?.get(toId) ?? fallbackPoints.get(toId) ?? {
      x: element.transform.x,
      y: element.transform.y + 3 * (element.transform.scale || 1),
    };
    return computeArtTransformMatrix(fromPt, toPt, box, widthScale, flip);
  }, [points, fallbackPoints, fromId, toId, element.transform, box, widthScale, flip]);

  if (!matrix) return null;

  const hitPolyPoints = getBoxCorners(matrix, box);

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="RealObject"
      data-wb-type="RealObject"
      data-wb-thing={src ? "image" : item.id}
      className="wb-real-object"
      data-selected={isSelected ? "true" : undefined}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <polygon
        points={hitPolyPoints}
        fill="#ffffff"
        fillOpacity={0.001}
        stroke="none"
      />
      <g
        transform={`matrix(${matrix.join(" ")})`}
        style={{ pointerEvents: "none" }}
      >
        {src ? (
          <image
            href={src}
            width={ratio}
            height={1}
            preserveAspectRatio="none"
          />
        ) : (
          <g dangerouslySetInnerHTML={{ __html: item.svg }} />
        )}
      </g>
      {isSelected && (
        <polygon
          points={hitPolyPoints}
          fill="none"
          stroke="#f59e0b"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------
// LineDecorElement (ground hatch, water ripples, dimension arrows, label)
// ---------------------------------------------------------------------------

export interface LineDecorElementProps {
  element: CanvasElement;
  allElements?: CanvasElement[];
  points?: Map<string, Point2D>;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

function unitBasis(a: Point2D, b: Point2D, side: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * side;
  const ny = ux * side;
  return { u: { x: ux, y: uy }, n: { x: nx, y: ny }, len };
}

/**
 * Renders `LineDecor` decorations (`ground`, `water`, `dim`, `label`) attached to a segment.
 */
export const LineDecorElement: React.FC<LineDecorElementProps> = ({
  element,
  allElements = [],
  points,
  isSelected = false,
  onPointerDown,
}) => {
  const targetId =
    typeof element.props?.target === "string" ? element.props.target : "";
  const kind =
    (element.props?.kind as "ground" | "water" | "dim" | "label") ?? "ground";
  const side: 1 | -1 = element.props?.side === -1 ? -1 : 1;
  const text = typeof element.props?.text === "string" ? element.props.text : "";
  const offset =
    typeof element.props?.offset === "number"
      ? element.props.offset
      : kind === "dim"
        ? 0.6
        : 0.28;

  const { a, b } = useMemo(() => {
    const seg = allElements.find(
      (el) => el.id === targetId && (el.type === "GeomSegment" || el.type === "GeomLine" || el.type === "GeomVector")
    );
    if (seg) {
      const pts = resolvePointCoords(allElements);
      const fromId = String(seg.props?.from ?? "");
      const toId = String(seg.props?.to ?? "");
      const pa = points?.get(fromId) ?? pts.get(fromId);
      const pb = points?.get(toId) ?? pts.get(toId);
      if (pa && pb) return { a: pa, b: pb };
    }
    return {
      a: { x: element.transform.x - 2, y: element.transform.y },
      b: { x: element.transform.x + 2, y: element.transform.y },
    };
  }, [allElements, targetId, element.transform, points]);

  const basis = useMemo(() => unitBasis(a, b, side), [a, b, side]);
  if (!basis) return null;

  const strokeColor = isSelected ? "#f59e0b" : (element.style?.stroke ?? "#334155");

  if (kind === "ground") {
    const step = 0.25;
    const count = Math.max(1, Math.floor(basis.len / step));
    const spacing = basis.len / count;
    const hatchLen = 0.22;
    const dParts: string[] = [];
    for (let i = 1; i <= count; i++) {
      const px = a.x + basis.u.x * i * spacing;
      const py = a.y + basis.u.y * i * spacing;
      const qx = px + (basis.n.x - basis.u.x) * hatchLen;
      const qy = py + (basis.n.y - basis.u.y) * hatchLen;
      dParts.push(`M${px.toFixed(4)},${(-py).toFixed(4)}L${qx.toFixed(4)},${(-qy).toFixed(4)}`);
    }
    const d = dParts.join(" ");
    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="LineDecor"
        data-wb-type="LineDecor"
        data-wb-decor="ground"
        className="wb-line-decor"
        onPointerDown={onPointerDown}
        style={{ cursor: "pointer" }}
      >
        <path
          d={d}
          fill="none"
          stroke="rgba(0,0,0,0.001)"
          strokeWidth={12}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (kind === "water") {
    const waveLen = 0.35;
    const amp = 0.05;
    const rowOffset = 0.16;
    const paths: string[] = [];
    for (let row = 0; row < 2; row++) {
      const startDist = row * waveLen * 0.5;
      const endDist = basis.len - (1 - row) * waveLen * 0.25;
      if (endDist - startDist < waveLen) continue;
      const segs = Math.max(8, Math.round(((endDist - startDist) / waveLen) * 8));
      const pts: string[] = [];
      for (let i = 0; i <= segs; i++) {
        const dist = startDist + ((endDist - startDist) * i) / segs;
        const off =
          (row + 1) * rowOffset +
          amp * Math.sin(((dist - startDist) / waveLen) * Math.PI * 2);
        const wx = a.x + basis.u.x * dist + basis.n.x * off;
        const wy = a.y + basis.u.y * dist + basis.n.y * off;
        pts.push(`${i === 0 ? "M" : "L"}${wx.toFixed(4)},${(-wy).toFixed(4)}`);
      }
      paths.push(pts.join(" "));
    }
    const d = paths.join(" ");
    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="LineDecor"
        data-wb-type="LineDecor"
        data-wb-decor="water"
        className="wb-line-decor"
        onPointerDown={onPointerDown}
        style={{ cursor: "pointer" }}
      >
        <path
          d={d}
          fill="none"
          stroke="rgba(0,0,0,0.001)"
          strokeWidth={12}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={d}
          fill="none"
          stroke={isSelected ? "#f59e0b" : (element.style?.stroke ?? "#0284c7")}
          strokeWidth={1.3}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (kind === "dim") {
    const p1 = { x: a.x + basis.n.x * offset, y: a.y + basis.n.y * offset };
    const p2 = { x: b.x + basis.n.x * offset, y: b.y + basis.n.y * offset };
    const ext1 = {
      x: p1.x + basis.n.x * 0.08,
      y: p1.y + basis.n.y * 0.08,
    };
    const ext2 = {
      x: p2.x + basis.n.x * 0.08,
      y: p2.y + basis.n.y * 0.08,
    };
    const ah = 0.14;
    const aw = 0.06;
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    let angleDeg = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
    if (angleDeg >= 90) angleDeg -= 180;
    if (angleDeg < -90) angleDeg += 180;

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="LineDecor"
        data-wb-type="LineDecor"
        data-wb-decor="dim"
        className="wb-line-decor"
        onPointerDown={onPointerDown}
        style={{ cursor: "pointer" }}
      >
        {/* Extension lines */}
        <path
          d={`M${a.x},${-a.y}L${ext1.x},${-ext1.y} M${b.x},${-b.y}L${ext2.x},${-ext2.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={0.9}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        {/* Dimension line + arrows */}
        <line
          x1={p1.x}
          y1={-p1.y}
          x2={p2.x}
          y2={-p2.y}
          stroke={strokeColor}
          strokeWidth={1.3}
          vectorEffect="non-scaling-stroke"
        />
        <polygon
          points={`${p1.x},${-p1.y} ${p1.x + basis.u.x * ah + basis.n.x * aw},${-(p1.y + basis.u.y * ah + basis.n.y * aw)} ${p1.x + basis.u.x * ah - basis.n.x * aw},${-(p1.y + basis.u.y * ah - basis.n.y * aw)}`}
          fill={strokeColor}
        />
        <polygon
          points={`${p2.x},${-p2.y} ${p2.x - basis.u.x * ah + basis.n.x * aw},${-(p2.y - basis.u.y * ah + basis.n.y * aw)} ${p2.x - basis.u.x * ah - basis.n.x * aw},${-(p2.y - basis.u.y * ah - basis.n.y * aw)}`}
          fill={strokeColor}
        />
        {text && (
          <text
            x={mid.x}
            y={-mid.y}
            fontSize={0.3}
            fill={strokeColor}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={angleDeg ? `rotate(${angleDeg} ${mid.x} ${-mid.y})` : undefined}
            stroke="#ffffff"
            strokeWidth={0.08}
            paintOrder="stroke"
            fontFamily="system-ui, sans-serif"
          >
            {text}
          </text>
        )}
      </g>
    );
  }

  // kind === "label"
  const labelPos = {
    x: (a.x + b.x) / 2 + basis.n.x * offset,
    y: (a.y + b.y) / 2 + basis.n.y * offset,
  };
  let angleDeg = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
  if (angleDeg >= 90) angleDeg -= 180;
  if (angleDeg < -90) angleDeg += 180;

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="LineDecor"
      data-wb-type="LineDecor"
      data-wb-decor="label"
      className="wb-line-decor"
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <circle
        cx={labelPos.x}
        cy={-labelPos.y}
        r={0.3}
        fill="#ffffff"
        fillOpacity={0.001}
      />
      {text && (
        <text
          x={labelPos.x}
          y={-labelPos.y}
          fontSize={0.32}
          fill={strokeColor}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={angleDeg ? `rotate(${angleDeg} ${labelPos.x} ${-labelPos.y})` : undefined}
          stroke="#ffffff"
          strokeWidth={0.09}
          paintOrder="stroke"
          fontFamily="system-ui, sans-serif"
        >
          {text}
        </text>
      )}
    </g>
  );
};
