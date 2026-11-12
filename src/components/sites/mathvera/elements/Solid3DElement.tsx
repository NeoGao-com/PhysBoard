"use client";

import React from "react";
import type { CanvasElement } from "@/types/whiteboard";
import {
  DEFAULT_DOT_SCALE,
  DEFAULT_LABEL_SCALE,
  type Point2D,
  type Point3D,
  unitDir2D,
} from "@/lib/geometry";
import {
  type Axes3DProps,
  type CameraMatrix3,
  type OrthoViewsProps,
  type RevolutionProps,
  type RoundSectionProps,
  type Solid3DKind,
  type Solid3DProps,
  type SolidLift,
  type SpaceFigureProps,
  applyOrbitToPoints,
  azimuthElevationToCamera,
  buildOxyzAxes,
  computeCircumsphereWireframe,
  computeOrthoViews,
  computeRevolutionGeometry,
  computeRoundCrossSection,
  computeSolidWireframe,
  computeSpaceFigureGeometry,
  getRoundRims,
  isRoundPointOccluded,
  liftRoundSolidTo3D,
  liftSolidTo3D,
  project3DTo2D,
} from "@/lib/geometry3d";
import { renderArrowhead } from "./SegmentElement";

export interface Solid3DElementProps {
  element: CanvasElement;
  points: Map<string, Point2D>;
  byId: Map<string, CanvasElement>;
  points3D?: Map<string, Point3D>;
  lifts?: Map<string, SolidLift>;
  scale?: number;
  labelScale?: number;
  dotScale?: number;
  orbitCam?: CameraMatrix3;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onVertexPointerDown?: (e: React.PointerEvent, solidId: string, vertexIndex: number) => void;
}

function toSvgPath(pts: Point2D[], close = false): string {
  if (pts.length === 0) return "";
  const cmds = pts.map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x} ${-p.y}`);
  return close ? `${cmds.join("")}Z` : cmds.join("");
}

function toPolygonPoints(pts: Point2D[]): string {
  return pts.map((p) => `${p.x},${-p.y}`).join(" ");
}

export const Solid3DElement: React.FC<Solid3DElementProps> = ({
  element,
  points,
  byId,
  points3D,
  lifts,
  scale = 45,
  labelScale = DEFAULT_LABEL_SCALE,
  dotScale = DEFAULT_DOT_SCALE,
  orbitCam,
  isSelected = false,
  isHighlighted = false,
  onPointerDown,
  onVertexPointerDown,
}) => {
  const style = element.style ?? {};
  const activeColor = isSelected || isHighlighted ? "#f59e0b" : undefined;
  const strokeWidth = (style.width ?? 1.8) + (isSelected || isHighlighted ? 2 : 0);

  // --- 1. Solid3D ---
  if (element.type === "Solid3D") {
    const props = element.props as Partial<Solid3DProps>;
    const kind = (props.kind ?? "pyramid") as Solid3DKind;
    const ptIds = Array.isArray(props.points) ? props.points : [];
    const inlineCoords = Array.isArray(props.pointCoords) ? props.pointCoords : null;
    const inlineNames = Array.isArray(props.vertexNames) ? props.vertexNames : null;

    const resolved2D: Point2D[] = [];
    const resolvedNames: string[] = [];

    for (let i = 0; i < ptIds.length; i++) {
      const id = ptIds[i];
      const fromMap = points.get(id);
      const ptEl = byId.get(id);
      if (fromMap) {
        resolved2D.push(fromMap);
        resolvedNames.push(
          typeof ptEl?.props.name === "string"
            ? ptEl.props.name
            : inlineNames?.[i] ?? ""
        );
      } else if (inlineCoords && inlineCoords[i]) {
        resolved2D.push({
          x: inlineCoords[i].x + element.transform.x,
          y: inlineCoords[i].y + element.transform.y,
        });
        resolvedNames.push(inlineNames?.[i] ?? "");
      }
    }

    if (resolved2D.length === 0) return null;

    const rawR = typeof props.r === "number" ? props.r : 1.3;
    const effectiveCam =
      orbitCam ??
      (typeof props.azimuth === "number" || typeof props.elevation === "number"
        ? azimuthElevationToCamera(props.azimuth ?? 26, props.elevation ?? 17)
        : undefined);

    const isCircumSphere = kind === "sphere" && Boolean(props.through);
    const c3 = isCircumSphere && points3D ? points3D.get(ptIds[0]) : undefined;
    const t3 =
      isCircumSphere && typeof props.through === "string" && points3D
        ? points3D.get(props.through)
        : undefined;
    const r =
      c3 && t3
        ? Math.hypot(c3.x - t3.x, c3.y - t3.y, c3.z - t3.z) || rawR
        : rawR;

    // Pass un-orbited base coords into lift/wireframe so stored azimuth/elevation isn't applied twice
    const base2D: Point2D[] =
      !isCircumSphere && inlineCoords && inlineCoords.length === ptIds.length
        ? inlineCoords.map((c) => ({
            x: c.x + element.transform.x,
            y: c.y + element.transform.y,
          }))
        : resolved2D;

    const wireframe = isCircumSphere
      ? computeCircumsphereWireframe(resolved2D[0], r)
      : computeSolidWireframe(kind, base2D, r, effectiveCam);

    if (wireframe.solid.length === 0 && wireframe.dashed.length === 0) return null;

    // Compute orbited vertex display positions if orbited
    let vertexPositions = base2D;
    const polyLift = liftSolidTo3D(kind, base2D) ?? liftRoundSolidTo3D(kind, base2D, r);
    if (effectiveCam && polyLift && !isCircumSphere) {
      vertexPositions = applyOrbitToPoints(polyLift.p3, effectiveCam, 1, polyLift).pts2d;
    }

    const strokeColor = activeColor ?? style.stroke ?? "#0f766e";
    const xs = vertexPositions.map((p) => p.x);
    const ys = vertexPositions.map((p) => p.y);
    const rxPad = kind === "cone" || kind === "cylinder" || kind === "sphere" ? r : 0.2;
    const ryPad = kind === "sphere" ? r : kind === "cone" || kind === "cylinder" ? r * 0.3 : 0.2;
    const minX = Math.min(...xs) - rxPad;
    const maxX = Math.max(...xs) + rxPad;
    const minY = Math.min(...ys) - ryPad;
    const maxY = Math.max(...ys) + ryPad;

    const dotRadius = (scale > 0 ? 1.8 / scale : 0.04) * dotScale;
    const cxAll = vertexPositions.reduce((s, p) => s + p.x, 0) / vertexPositions.length;
    const cyAll = vertexPositions.reduce((s, p) => s + p.y, 0) / vertexPositions.length;

    const roundRims = !effectiveCam ? getRoundRims(kind, vertexPositions, r) : [];
    const faceFill = props.faceFill ?? {};

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="Solid3D"
        data-wb-type="Solid3D"
        data-solid-kind={kind}
        className="wb-solid3d"
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        {/* Circumsphere gradient fill */}
        {isCircumSphere && wireframe.solid[0] && (
          <>
            <defs>
              <radialGradient id={`sph-${element.id}`} cx="38%" cy="32%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
                <stop offset="75%" stopColor={strokeColor} stopOpacity={0.1} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.24} />
              </radialGradient>
            </defs>
            <polygon
              points={toPolygonPoints(wireframe.solid[0])}
              fill={`url(#sph-${element.id})`}
              stroke="none"
              style={{ pointerEvents: "none" }}
            />
          </>
        )}

        {/* Transparent bounding hit box */}
        <rect
          x={minX}
          y={-maxY}
          width={Math.max(0.2, maxX - minX)}
          height={Math.max(0.2, maxY - minY)}
          fill="rgba(0,0,0,0.001)"
          stroke="none"
        />

        {/* Polyhedron filled faces */}
        {polyLift &&
          polyLift.faces.map((face, fIdx) => {
            const key = face.map((idx) => ptIds[idx] ?? String(idx)).join("|");
            const fillCol = faceFill[key] ?? faceFill[String(fIdx)];
            if (!fillCol) return null;
            const facePts = face.map((idx) => vertexPositions[idx]).filter(Boolean);
            if (facePts.length < 3) return null;
            return (
              <polygon
                key={`ff_${fIdx}`}
                points={toPolygonPoints(facePts)}
                fill={fillCol}
                stroke="none"
                style={{ pointerEvents: "none" }}
              />
            );
          })}

        {/* Round solid rim fills */}
        {roundRims
          .filter((rm) => Boolean(faceFill[rm.key]))
          .map((rm) => (
            <ellipse
              key={`rf_${rm.key}`}
              cx={rm.cx}
              cy={-rm.cy}
              rx={rm.rx}
              ry={rm.ry}
              fill={faceFill[rm.key]}
              stroke="none"
              style={{ pointerEvents: "none" }}
            />
          ))}

        {/* Hidden dashed edges */}
        {wireframe.dashed.map((poly, idx) =>
          poly.length === 2 ? (
            <line
              key={`hid_${idx}`}
              data-wb-edge="hidden"
              className="wb-hidden-edge"
              x1={poly[0].x}
              y1={-poly[0].y}
              x2={poly[1].x}
              y2={-poly[1].y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray="5 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.85}
            />
          ) : (
            <path
              key={`hid_${idx}`}
              data-wb-edge="hidden"
              className="wb-hidden-edge"
              d={toSvgPath(poly)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray="5 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.85}
            />
          )
        )}

        {/* Solid front edges */}
        {wireframe.solid.map((poly, idx) =>
          poly.length === 2 ? (
            <line
              key={`vis_${idx}`}
              data-wb-edge="solid"
              x1={poly[0].x}
              y1={-poly[0].y}
              x2={poly[1].x}
              y2={-poly[1].y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={style.opacity ?? 1}
            />
          ) : (
            <path
              key={`vis_${idx}`}
              data-wb-edge="solid"
              d={toSvgPath(poly)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={style.opacity ?? 1}
            />
          )
        )}

        {/* Vertices and labels inside [data-wb-type="Solid3D"] */}
        {vertexPositions.map((pt, idx) => {
          const vName = resolvedNames[idx] ?? "";
          const dir = unitDir2D({ x: cxAll, y: cyAll }, pt);
          const lx = pt.x + (dir.x !== 0 || dir.y !== 0 ? dir.x * 0.3 : 0.22) * labelScale;
          const ly = pt.y + (dir.x !== 0 || dir.y !== 0 ? dir.y * 0.3 : 0.22) * labelScale;
          return (
            <React.Fragment key={ptIds[idx] ?? idx}>
              <circle
                data-wb-vertex="true"
                cx={pt.x}
                cy={-pt.y}
                r={dotRadius}
                fill="#0f766e"
                stroke="#ffffff"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                onPointerDown={
                  onVertexPointerDown
                    ? (e) => {
                        e.stopPropagation();
                        onVertexPointerDown(e, element.id, idx);
                      }
                    : undefined
                }
              />
              {vName && (
                <text
                  data-label={vName}
                  data-wb-label="true"
                  x={lx}
                  y={-ly}
                  fontSize={0.34 * labelScale}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight={600}
                  fill={isSelected ? "#b45309" : "#1e3a5f"}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {vName}
                </text>
              )}
            </React.Fragment>
          );
        })}
      </g>
    );
  }

  // --- 2. Axes3D (Oxyz) ---
  if (element.type === "Axes3D") {
    const props = element.props as Axes3DProps;
    const sc = element.transform.scale || 1;
    const color = activeColor ?? style.stroke ?? "#64748b";
    const built = buildOxyzAxes(props, element.transform, orbitCam);

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="Axes3D"
        data-wb-type="Oxyz"
        className="wb-oxyz"
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        {/* Origin dot and label */}
        <circle cx={built.origin.x} cy={-built.origin.y} r={0.09 * sc} fill="#2563eb" />
        <text
          x={built.origin.x - 0.28 * sc}
          y={-built.origin.y + 0.32 * sc}
          fontSize={0.3 * sc}
          fill={color}
          textAnchor="end"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          O
        </text>

        {built.axes.map((ax) => (
          <g key={ax.label}>
            <line
              x1={ax.line[0].x}
              y1={-ax.line[0].y}
              x2={ax.tip.x}
              y2={-ax.tip.y}
              stroke={color}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
            {renderArrowhead(ax.line[0], ax.tip, color, 0.26 * sc, `arr-${ax.label}`)}
            {ax.units.map((u) => (
              <g key={u.n}>
                <line
                  x1={u.tick[0].x}
                  y1={-u.tick[0].y}
                  x2={u.tick[1].x}
                  y2={-u.tick[1].y}
                  stroke={color}
                  strokeWidth={1.2}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={u.labelPos.x}
                  y={-u.labelPos.y}
                  fontSize={0.26 * sc}
                  fill={color}
                  textAnchor="middle"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {u.n}
                </text>
              </g>
            ))}
            <text
              x={ax.label === "x" ? ax.tip.x - 0.2 * sc : ax.tip.x + 0.15 * sc}
              y={ax.label === "x" ? -ax.tip.y + 0.45 * sc : -ax.tip.y - 0.1 * sc}
              textAnchor={ax.label === "x" ? "end" : "start"}
              fontSize={0.4 * sc}
              fontStyle="italic"
              fontWeight={600}
              fill={color}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {ax.label}
            </text>
          </g>
        ))}
      </g>
    );
  }

  // --- 3. RoundSection ---
  if (element.type === "RoundSection") {
    const props = element.props as Partial<RoundSectionProps>;
    const solidEl = props.solid ? byId.get(props.solid) : undefined;
    const secPts = Array.isArray(props.points) ? props.points : [];
    if (!solidEl || solidEl.type !== "Solid3D" || secPts.length < 3 || !points3D) return null;

    const kind = solidEl.props.kind as Solid3DKind;
    const r = typeof solidEl.props.r === "number" ? solidEl.props.r : 1.3;
    const solidPts2 = (solidEl.props.points as string[])
      .map((id) => points.get(id))
      .filter((p): p is Point2D => p !== undefined);
    const lift = lifts?.get(solidEl.id) ?? liftRoundSolidTo3D(kind, solidPts2, r);
    const p3A = points3D.get(secPts[0]);
    const p3B = points3D.get(secPts[1]);
    const p3C = points3D.get(secPts[2]);
    if (!lift || !p3A || !p3B || !p3C) return null;

    const boundary3 = computeRoundCrossSection(kind, lift, r, p3A, p3B, p3C);
    if (!boundary3) return null;

    const fillPts2 = boundary3.map((p) => project3DTo2D(lift, p));
    const solidRuns: Point2D[][] = [];
    const dashedRuns: Point2D[][] = [];
    let curRun: Point2D[] = [fillPts2[0]];
    let curHidden = isRoundPointOccluded(kind, lift, r, lift.view, boundary3[0]);

    for (let i = 1; i <= boundary3.length; i++) {
      const idx = i % boundary3.length;
      const mid3 = {
        x: (boundary3[i - 1].x + boundary3[idx].x) / 2,
        y: (boundary3[i - 1].y + boundary3[idx].y) / 2,
        z: (boundary3[i - 1].z + boundary3[idx].z) / 2,
      };
      const hid = isRoundPointOccluded(kind, lift, r, lift.view, mid3);
      if (hid === curHidden) {
        curRun.push(fillPts2[idx]);
      } else {
        (curHidden ? dashedRuns : solidRuns).push(curRun);
        curHidden = hid;
        curRun = [fillPts2[(i - 1) % boundary3.length], fillPts2[idx]];
      }
    }
    (curHidden ? dashedRuns : solidRuns).push(curRun);
    const color = activeColor ?? style.stroke ?? "#334155";

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="RoundSection"
        data-wb-type="RoundSection"
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        <polygon
          points={toPolygonPoints(fillPts2)}
          fill={style.fill ?? "#f08c0066"}
          stroke="none"
          style={{ pointerEvents: "none" }}
        />
        <path
          d={toSvgPath(fillPts2, true)}
          fill="none"
          stroke="rgba(0,0,0,0.001)"
          strokeWidth={18}
          pointerEvents="stroke"
          vectorEffect="non-scaling-stroke"
        />
        {dashedRuns.map((seg, idx) => (
          <path
            key={`rd_${idx}`}
            d={toSvgPath(seg)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {solidRuns.map((seg, idx) => (
          <path
            key={`rs_${idx}`}
            d={toSvgPath(seg)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    );
  }

  // --- 4. SpaceFigure ---
  if (element.type === "SpaceFigure") {
    const props = element.props as Partial<SpaceFigureProps>;
    const axesEl = props.axes ? byId.get(props.axes) : undefined;
    if (!axesEl || axesEl.type !== "Axes3D" || !props.def) return null;

    const geom = computeSpaceFigureGeometry(
      axesEl.transform,
      axesEl.props as Axes3DProps,
      props.def
    );
    if (!geom) return null;

    const color = activeColor ?? style.stroke ?? props.color ?? "#b45309";

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="SpaceFigure"
        data-wb-type="SpaceFigure"
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        {geom.kind === "plane" && geom.polygon && (
          <polygon
            points={toPolygonPoints(geom.polygon)}
            fill={color}
            fillOpacity={0.08}
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {geom.kind === "line" && geom.line && (
          <line
            x1={geom.line[0].x}
            y1={-geom.line[0].y}
            x2={geom.line[1].x}
            y2={-geom.line[1].y}
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {geom.kind === "sphere" && geom.outline && (
          <>
            <path
              d={toSvgPath(geom.outline)}
              fill={color}
              fillOpacity={0.06}
              stroke={color}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
            {geom.equatorBack && (
              <path
                d={toSvgPath(geom.equatorBack)}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {geom.equatorFront && (
              <path
                d={toSvgPath(geom.equatorFront)}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </>
        )}
        {props.name && geom.labelPos && (
          <text
            x={geom.labelPos.x + 0.15}
            y={-geom.labelPos.y - 0.15}
            fontSize={0.34}
            fontStyle="italic"
            fill={color}
            style={{ pointerEvents: "none" }}
          >
            {props.name}
          </text>
        )}
      </g>
    );
  }

  // --- 5. OrthoViews ---
  if (element.type === "OrthoViews") {
    const props = element.props as Partial<OrthoViewsProps>;
    const solidEl = props.solid ? byId.get(props.solid) : undefined;
    if (!solidEl || solidEl.type !== "Solid3D") return null;

    const sProps = solidEl.props as Partial<Solid3DProps>;
    const kind = (sProps.kind ?? "pyramid") as Solid3DKind;
    const r = typeof sProps.r === "number" ? sProps.r : 1.3;
    const ptIds = Array.isArray(sProps.points) ? sProps.points : [];
    const inlineCoords = Array.isArray(sProps.pointCoords) ? sProps.pointCoords : null;
    const pts2: Point2D[] = ptIds
      .map((id, i) => points.get(id) ?? inlineCoords?.[i])
      .filter((p): p is Point2D => p !== undefined);
    const lift =
      lifts?.get(solidEl.id) ??
      liftSolidTo3D(kind, pts2) ??
      liftRoundSolidTo3D(kind, pts2, r);
    if (!lift) return null;

    const ortho = computeOrthoViews(kind, lift, r);
    if (!ortho) return null;

    const color = activeColor ?? style.stroke ?? "#334155";
    const ox = element.transform.x;
    const oy = element.transform.y;

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="OrthoViews"
        data-wb-type="OrthoViews"
        transform={`translate(${ox} ${-oy})`}
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        {ortho.views.map((view) => (
          <g key={view.key}>
            {view.lines.dashed.map((seg, i) => (
              <line
                key={`od_${i}`}
                x1={seg[0].x}
                y1={-seg[0].y}
                x2={seg[1].x}
                y2={-seg[1].y}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {view.lines.solid.map((seg, i) => (
              <line
                key={`os_${i}`}
                x1={seg[0].x}
                y1={-seg[0].y}
                x2={seg[1].x}
                y2={-seg[1].y}
                stroke={color}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {view.circles.map((c, i) => (
              <circle
                key={`oc_${i}`}
                cx={c.c.x}
                cy={-c.c.y}
                r={c.r}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <text
              x={(view.box.minX + view.box.maxX) / 2}
              y={-(view.box.minY - 0.45)}
              fontSize={0.28}
              fill="#64748b"
              textAnchor="middle"
              style={{ pointerEvents: "none" }}
            >
              {view.title}
            </text>
          </g>
        ))}
      </g>
    );
  }

  // --- 6. Revolution ---
  if (element.type === "Revolution") {
    const props = element.props as Partial<RevolutionProps>;
    const sourceEl = props.source ? byId.get(props.source) : undefined;
    const axisA = props.a ? points.get(props.a) : undefined;
    const axisB = props.b ? points.get(props.b) : undefined;
    if (!sourceEl || !axisA || !axisB) return null;

    const rev = computeRevolutionGeometry(sourceEl, axisA, axisB, points, props.angle ?? 360);
    if (!rev) return null;

    const color = activeColor ?? style.stroke ?? "#0f766e";

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="Revolution"
        data-wb-type="Revolution"
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        <polygon
          points={toPolygonPoints(rev.profile)}
          fill="rgba(15, 118, 110, 0.08)"
          stroke={color}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        {rev.ellipses.map((el, i) => (
          <ellipse
            key={`re_${i}`}
            cx={el.cx}
            cy={-el.cy}
            rx={el.rx}
            ry={el.ry}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {rev.generatrices.map(([p0, p1], i) => (
          <line
            key={`rg_${i}`}
            x1={p0.x}
            y1={-p0.y}
            x2={p1.x}
            y2={-p1.y}
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {props.info && rev.infoText && (
          <text
            x={axisB.x + 0.3}
            y={-axisB.y}
            fontSize={0.32}
            fill={color}
            style={{ pointerEvents: "none" }}
          >
            {rev.infoText}
          </text>
        )}
      </g>
    );
  }

  return null;
};
