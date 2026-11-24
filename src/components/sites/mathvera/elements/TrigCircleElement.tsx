"use client";

import React, { useMemo, useRef, useState } from "react";
import { CanvasElement } from "@/types/whiteboard";
import {
  computeTrigValues,
  normalizeAngle,
  snapTrigAngleContinuous,
} from "@/lib/math-eval";
import { KaTeXFormula } from "./MathElement";

export interface TrigCircleElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
}

const SPECIAL_ANGLES_RAD = [
  0,
  Math.PI / 6,
  Math.PI / 4,
  Math.PI / 3,
  Math.PI / 2,
  (2 * Math.PI) / 3,
  (3 * Math.PI) / 4,
  (5 * Math.PI) / 6,
  Math.PI,
  (-5 * Math.PI) / 6,
  (-3 * Math.PI) / 4,
  (-2 * Math.PI) / 3,
  -Math.PI / 2,
  -Math.PI / 3,
  -Math.PI / 4,
  -Math.PI / 6,
];

const PRESET_ANGLES_RAD: Array<{ label: string; rad: number }> = [
  { label: "0", rad: 0 },
  { label: "π/6", rad: Math.PI / 6 },
  { label: "π/4", rad: Math.PI / 4 },
  { label: "π/3", rad: Math.PI / 3 },
  { label: "π/2", rad: Math.PI / 2 },
  { label: "2π/3", rad: (2 * Math.PI) / 3 },
  { label: "π", rad: Math.PI },
  { label: "2π", rad: 2 * Math.PI },
];

const PRESET_ANGLES_DEG: Array<{ label: string; rad: number }> = [
  { label: "0°", rad: 0 },
  { label: "30°", rad: Math.PI / 6 },
  { label: "45°", rad: Math.PI / 4 },
  { label: "60°", rad: Math.PI / 3 },
  { label: "90°", rad: Math.PI / 2 },
  { label: "120°", rad: (2 * Math.PI) / 3 },
  { label: "180°", rad: Math.PI },
  { label: "360°", rad: 2 * Math.PI },
];

/**
 * Interactive Unit Trigonometric Circle (`[data-wb-type="TrigCircle"]`, `.wb-trig-circle`)
 * with draggable point `[data-wb-point="M"]`, continuous multi-turn revolution tracking,
 * unit switching (`rad` / `deg`), and live readout `[data-wb-trig-values="true"]`.
 */
export const TrigCircleElement: React.FC<TrigCircleElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
}) => {
  const storedAngle =
    typeof element.props?.angle === "number" ? element.props.angle : Math.PI / 6;
  const unit: "rad" | "deg" = element.props?.unit === "deg" ? "deg" : "rad";
  const showOxSweep = Boolean(element.props?.showOxSweep);
  const sweepStartAngle =
    typeof element.props?.sweepStartAngle === "number" ? element.props.sweepStartAngle : 0;
  const show = (element.props?.show as Record<string, boolean> | undefined) ?? {
    sin: true,
    cos: true,
    tan: true,
    cot: true,
    special: true,
  };

  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const isDraggingM = dragAngle !== null;
  const liveAngle = dragAngle ?? storedAngle;
  const circleRef = useRef<SVGCircleElement | null>(null);
  const latestAngleRef = useRef<number>(storedAngle);
  const unwrappedAngleRef = useRef<number>(storedAngle);

  const R = 2.6 * (element.transform.scale || 1);
  const invScale = 1 / (scale || 45);

  const readout = useMemo(
    () => computeTrigValues(liveAngle, unit),
    [liveAngle, unit]
  );

  const mx = R * Math.cos(liveAngle);
  const my = R * Math.sin(liveAngle);

  // Archimedean spiral arc showing exact direction and number of revolutions from 0 to liveAngle
  const { arcPath, arcArrowPoints } = useMemo(() => {
    const absA = Math.abs(liveAngle);
    if (absA < 1e-4) return { arcPath: "", arcArrowPoints: "" };
    const steps = Math.max(16, Math.ceil((absA / (Math.PI * 2)) * 48));
    const r0 = R * 0.16;
    const rGrowth = R * 0.045;
    const rMax = R * 0.52;
    const radiusAt = (a: number) =>
      Math.min(rMax, r0 + (Math.abs(a) / (Math.PI * 2)) * rGrowth);
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = (liveAngle * i) / steps;
      const r = radiusAt(a);
      const px = r * Math.cos(a);
      const py = -r * Math.sin(a);
      pts.push(`${i === 0 ? "M" : "L"}${px.toFixed(4)},${py.toFixed(4)}`);
    }
    const rEnd = radiusAt(liveAngle);
    const endX = rEnd * Math.cos(liveAngle);
    const endY = -rEnd * Math.sin(liveAngle);
    const sign = liveAngle >= 0 ? 1 : -1;
    const tx = -sign * Math.sin(liveAngle);
    const ty = -sign * Math.cos(liveAngle);
    const nx = -ty;
    const ny = tx;
    const ah = 0.11;
    const aw = 0.055;
    const p1x = endX - tx * ah + nx * aw;
    const p1y = endY - ty * ah + ny * aw;
    const p2x = endX - tx * ah - nx * aw;
    const p2y = endY - ty * ah - ny * aw;
    return {
      arcPath: pts.join(" "),
      arcArrowPoints: `${endX.toFixed(4)},${endY.toFixed(4)} ${p1x.toFixed(4)},${p1y.toFixed(4)} ${p2x.toFixed(4)},${p2y.toFixed(4)}`,
    };
  }, [liveAngle, R]);

  // Piecewise swept trajectory along horizontal Ox axis from sweepStartAngle -> liveAngle
  const oxSweepData = useMemo(() => {
    if (!showOxSweep) return null;

    const a0 = sweepStartAngle;
    const a1 = liveAngle;
    const delta = a1 - a0;
    const breakpoints: number[] = [a0];

    if (delta > 1e-6) {
      const kFirst = Math.floor(a0 / Math.PI) + 1;
      const kLast = Math.ceil(a1 / Math.PI) - 1;
      const count = Math.min(24, Math.max(0, kLast - kFirst + 1));
      for (let i = 0; i < count; i++) {
        breakpoints.push((kFirst + i) * Math.PI);
      }
    } else if (delta < -1e-6) {
      const kFirst = Math.ceil(a0 / Math.PI) - 1;
      const kLast = Math.floor(a1 / Math.PI) + 1;
      const count = Math.min(24, Math.max(0, kFirst - kLast + 1));
      for (let i = 0; i < count; i++) {
        breakpoints.push((kFirst - i) * Math.PI);
      }
    }
    breakpoints.push(a1);

    const xs = breakpoints.map((t) => R * Math.cos(t));
    const coss = breakpoints.map((t) => Math.cos(t));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minCos = Math.min(...coss);
    const maxCos = Math.max(...coss);

    let totalDistanceR = 0;
    const segments: Array<{
      x1: number;
      x2: number;
      dir: number;
      y: number;
      layer: number;
    }> = [];

    for (let i = 0; i < breakpoints.length - 1; i++) {
      const c1 = Math.cos(breakpoints[i]);
      const c2 = Math.cos(breakpoints[i + 1]);
      const d = Math.abs(c2 - c1);
      if (d < 1e-5) continue;
      const layer = segments.length;
      const yOff = 0.16 + Math.min(layer, 7) * 0.14;
      totalDistanceR += d;
      segments.push({
        x1: R * c1,
        x2: R * c2,
        dir: c2 >= c1 ? 1 : -1,
        y: yOff,
        layer,
      });
    }

    const startX = R * Math.cos(a0);
    const startYCircle = -R * Math.sin(a0);
    let foldedPath = "";
    const arrowPoints: string[] = [];

    const pushArrow = (tipX: number, y: number, dir: number, sz = 0.085) => {
      const backX = tipX - dir * sz;
      const halfH = sz * 0.56;
      arrowPoints.push(
        `${tipX.toFixed(4)},${y.toFixed(4)} ${backX.toFixed(4)},${(y - halfH).toFixed(4)} ${backX.toFixed(4)},${(y + halfH).toFixed(4)}`
      );
    };

    if (segments.length > 0) {
      const cmds: string[] = [`M${segments[0].x1.toFixed(4)},${segments[0].y.toFixed(4)}`];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (i > 0) {
          const prev = segments[i - 1];
          const dy = seg.y - prev.y;
          if (dy > 1e-4) {
            const ry = dy / 2;
            const rx = 0.095;
            const sweepFlag = seg.x1 >= 0 ? 1 : 0;
            cmds.push(
              `A${rx.toFixed(4)},${ry.toFixed(4)} 0 0,${sweepFlag} ${seg.x1.toFixed(4)},${seg.y.toFixed(4)}`
            );
          } else {
            cmds.push(`L${seg.x1.toFixed(4)},${seg.y.toFixed(4)}`);
          }
        }
        cmds.push(`L${seg.x2.toFixed(4)},${seg.y.toFixed(4)}`);

        if (Math.abs(seg.x2 - seg.x1) >= 0.42) {
          pushArrow((seg.x1 + seg.x2) * 0.5, seg.y, seg.dir, 0.082);
        }
      }
      const lastSeg = segments[segments.length - 1];
      if (Math.abs(lastSeg.x2 - lastSeg.x1) >= 0.14) {
        pushArrow(lastSeg.x2, lastSeg.y, lastSeg.dir, 0.095);
      }
      foldedPath = cmds.join(" ");
    }

    // Highlighted arc on the circle circumference
    let sweptCircleArcPath = "";
    const absDelta = Math.abs(delta);
    if (absDelta >= 2 * Math.PI - 1e-4) {
      sweptCircleArcPath = `M${R.toFixed(4)},0 A${R.toFixed(4)},${R.toFixed(4)} 0 1,0 ${(-R).toFixed(4)},0 A${R.toFixed(4)},${R.toFixed(4)} 0 1,0 ${R.toFixed(4)},0`;
    } else if (absDelta > 1e-4) {
      const ex = R * Math.cos(a1);
      const ey = -R * Math.sin(a1);
      const largeArc = absDelta > Math.PI ? 1 : 0;
      const sweep = delta >= 0 ? 0 : 1;
      sweptCircleArcPath = `M${startX.toFixed(4)},${startYCircle.toFixed(4)} A${R.toFixed(4)},${R.toFixed(4)} 0 ${largeArc},${sweep} ${ex.toFixed(4)},${ey.toFixed(4)}`;
    }

    const fmtUnitVal = (v: number) => {
      const clean = Math.abs(v) < 0.005 ? 0 : v;
      return clean.toFixed(2).replace(/\.?0+$/, "");
    };

    const distanceText =
      totalDistanceR < 0.005
        ? "0"
        : Math.abs(totalDistanceR - Math.round(totalDistanceR)) < 0.005
          ? `${Math.round(totalDistanceR)}R`
          : `${totalDistanceR.toFixed(2)}R`;

    return {
      minX,
      maxX,
      spanLabel: `[${fmtUnitVal(minCos)} ; ${fmtUnitVal(maxCos)}]`,
      totalDistanceR,
      distanceText,
      startX,
      startYCircle,
      startRibbonY: segments[0]?.y ?? 0.16,
      endX: segments[segments.length - 1]?.x2 ?? startX,
      endRibbonY: segments[segments.length - 1]?.y ?? 0.16,
      foldedPath,
      arrowPoints,
      sweptCircleArcPath,
      hasTravel: segments.length > 0,
    };
  }, [showOxSweep, sweepStartAngle, liveAngle, R]);

  const handlePointMDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.preventDefault();
    latestAngleRef.current = storedAngle;
    unwrappedAngleRef.current = storedAngle;
    setDragAngle(storedAngle);

    const updateFromClient = (clientX: number, clientY: number) => {
      const rect = circleRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rawAtan = Math.atan2(-(clientY - cy), clientX - cx);
      const prevWrapped = Math.atan2(
        Math.sin(unwrappedAngleRef.current),
        Math.cos(unwrappedAngleRef.current)
      );
      let delta = rawAtan - prevWrapped;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      unwrappedAngleRef.current += delta;
      const snapped = snapTrigAngleContinuous(unwrappedAngleRef.current, 0.06);
      latestAngleRef.current = snapped;
      setDragAngle(snapped);
    };

    const onMove = (ev: PointerEvent) => {
      ev.stopPropagation();
      updateFromClient(ev.clientX, ev.clientY);
    };

    const onUp = (ev: PointerEvent) => {
      ev.stopPropagation();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDragAngle(null);
      const committed = Number(latestAngleRef.current.toFixed(8));
      onUpdateProps?.(element.id, { angle: committed });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const axisExtent = R * 1.32;
  const tanY =
    readout.tan !== null && Math.abs(readout.tan) <= 3.5 ? readout.tan * R : null;
  const cotX =
    readout.cot !== null && Math.abs(readout.cot) <= 3.5 ? readout.cot * R : null;

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="TrigCircle"
      data-wb-type="TrigCircle"
      className="wb-trig-circle"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      {/* Hit background */}
      <circle
        cx={0}
        cy={0}
        r={axisExtent}
        fill="rgba(255,255,255,0.001)"
        stroke={isSelected ? "#f59e0b" : "none"}
        strokeDasharray={isSelected ? "4 3" : undefined}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {/* Axes Ox (cos) and Oy (sin) */}
      <line
        x1={-axisExtent}
        y1={0}
        x2={axisExtent}
        y2={0}
        stroke="#475569"
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`${axisExtent},0 ${axisExtent - 0.18},-0.08 ${axisExtent - 0.18},0.08`}
        fill="#475569"
      />
      <line
        x1={0}
        y1={axisExtent}
        x2={0}
        y2={-axisExtent}
        stroke="#475569"
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`0,${-axisExtent} -0.08,${-axisExtent + 0.18} 0.08,${-axisExtent + 0.18}`}
        fill="#475569"
      />

      {/* Tan axis (x = R) and Cot axis (y = R) */}
      {show.tan !== false && (
        <line
          x1={R}
          y1={axisExtent}
          x2={R}
          y2={-axisExtent}
          stroke="#bbf7d0"
          strokeWidth={1.2}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {show.cot !== false && (
        <line
          x1={-axisExtent}
          y1={-R}
          x2={axisExtent}
          y2={-R}
          stroke="#e9d5ff"
          strokeWidth={1.2}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Unit Circle */}
      <circle
        ref={circleRef}
        cx={0}
        cy={0}
        r={R}
        fill="none"
        stroke="#1e293b"
        strokeWidth={1.8}
        vectorEffect="non-scaling-stroke"
      />

      {/* Special angle ticks */}
      {show.special !== false &&
        SPECIAL_ANGLES_RAD.map((a, idx) => (
          <circle
            key={idx}
            cx={R * Math.cos(a)}
            cy={-R * Math.sin(a)}
            r={0.045}
            fill="#94a3b8"
            pointerEvents="none"
          />
        ))}

      {/* Multi-turn spiral angle arc */}
      {arcPath && (
        <g pointerEvents="none">
          <path
            d={arcPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.8}
            vectorEffect="non-scaling-stroke"
          />
          {arcArrowPoints && <polygon points={arcArrowPoints} fill="#f59e0b" />}
        </g>
      )}

      {/* Projections for cos (blue) and sin (red) */}
      {show.cos !== false && (
        <>
          <line
            x1={mx}
            y1={-my}
            x2={mx}
            y2={0}
            stroke="#1565C0"
            strokeWidth={1.4}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={0}
            x2={mx}
            y2={0}
            stroke="#1565C0"
            strokeWidth={2.6}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      {show.sin !== false && (
        <>
          <line
            x1={mx}
            y1={-my}
            x2={0}
            y2={-my}
            stroke="#dc2626"
            strokeWidth={1.4}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={-my}
            stroke="#dc2626"
            strokeWidth={2.6}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {/* Swept path of point M projected on Ox axis */}
      {showOxSweep && oxSweepData && (
        <g data-wb-ox-sweep="true" pointerEvents="none">
          {/* Highlighted circular arc traversed from sweepStartAngle to liveAngle */}
          {oxSweepData.sweptCircleArcPath && (
            <path
              d={oxSweepData.sweptCircleArcPath}
              fill="none"
              stroke="#0d9488"
              strokeWidth={3.4}
              strokeOpacity={0.62}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Direct covered band directly along Ox axis (y = 0) */}
          {oxSweepData.maxX - oxSweepData.minX > 1e-4 && (
            <line
              x1={oxSweepData.minX}
              y1={0}
              x2={oxSweepData.maxX}
              y2={0}
              stroke="#0d9488"
              strokeWidth={7}
              strokeOpacity={0.32}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Drop line from start point M0 on circle down to start on Ox */}
          {oxSweepData.hasTravel && (
            <>
              <line
                x1={oxSweepData.startX}
                y1={oxSweepData.startYCircle}
                x2={oxSweepData.startX}
                y2={oxSweepData.startRibbonY}
                stroke="#0d9488"
                strokeWidth={1.1}
                strokeDasharray="3 2"
                strokeOpacity={0.65}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={oxSweepData.startX}
                cy={oxSweepData.startYCircle}
                r={0.085}
                fill="#ffffff"
                stroke="#0d9488"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={oxSweepData.startX} cy={oxSweepData.startRibbonY} r={0.065} fill="#0d9488" />
            </>
          )}

          {/* Folded/stepped Ox trajectory ribbon below Ox with turnaround U-bends & directional arrows */}
          {oxSweepData.foldedPath && (
            <path
              data-wb-ox-sweep-path="true"
              d={oxSweepData.foldedPath}
              fill="none"
              stroke="#0d9488"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {oxSweepData.arrowPoints.map((pts, idx) => (
            <polygon key={idx} points={pts} fill="#0d9488" />
          ))}

          {/* Current Ox projection marker */}
          <line
            x1={mx}
            y1={0}
            x2={oxSweepData.endX}
            y2={oxSweepData.endRibbonY}
            stroke="#0d9488"
            strokeWidth={1.1}
            strokeDasharray="2 2"
            strokeOpacity={0.65}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={mx} cy={0} r={0.085} fill="#0d9488" stroke="#ffffff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </g>
      )}

      {/* Radius OM */}
      <line
        x1={0}
        y1={0}
        x2={mx}
        y2={-my}
        stroke="#0f172a"
        strokeWidth={1.8}
        vectorEffect="non-scaling-stroke"
      />

      {/* Tan / Cot ray extensions */}
      {show.tan !== false && tanY !== null && (
        <>
          <line
            x1={0}
            y1={0}
            x2={R}
            y2={-tanY}
            stroke="#16a34a"
            strokeWidth={1.1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={R} cy={-tanY} r={0.07} fill="#16a34a" />
        </>
      )}
      {show.cot !== false && cotX !== null && (
        <>
          <line
            x1={0}
            y1={0}
            x2={cotX}
            y2={-R}
            stroke="#9333ea"
            strokeWidth={1.1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={cotX} cy={-R} r={0.07} fill="#9333ea" />
        </>
      )}

      {/* Axis labels */}
      <text
        x={axisExtent - 0.1}
        y={0.28}
        fontSize={0.24}
        fill="#1565C0"
        textAnchor="end"
        fontFamily="KaTeX_Main, serif"
      >
        cos
      </text>
      <text
        x={-0.16}
        y={-axisExtent + 0.24}
        fontSize={0.24}
        fill="#dc2626"
        textAnchor="end"
        fontFamily="KaTeX_Main, serif"
      >
        sin
      </text>
      <text
        x={-0.18}
        y={0.26}
        fontSize={0.24}
        fill="#334155"
        textAnchor="end"
        fontFamily="KaTeX_Math, serif"
      >
        O
      </text>

      {/* Draggable Point M */}
      <circle
        data-wb-point="M"
        data-draggable="true"
        className="wb-trig-point-m"
        cx={mx}
        cy={-my}
        r={0.22}
        fill="#dc2626"
        stroke="#ffffff"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        onPointerDown={handlePointMDown}
        style={{ cursor: isDraggingM ? "grabbing" : "grab" }}
      />
      <text
        x={mx + (mx >= 0 ? 0.22 : -0.32)}
        y={-my + (my >= 0 ? -0.22 : 0.34)}
        fontSize={0.28}
        fontWeight={700}
        fill="#dc2626"
        fontFamily="KaTeX_Math, serif"
        pointerEvents="none"
      >
        M
      </text>

      {/* Live Trig Readout Panel */}
      <g transform={`translate(${axisExtent + 0.35} ${-R}) scale(${invScale})`}>
        <foreignObject x={0} y={0} width={380} height={420} style={{ overflow: "visible" }}>
          <div
            data-wb-trig-values="true"
            className="wb-trig-readout"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.97)",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "8px 10px",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 5,
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              pointerEvents: "auto",
              width: "max-content",
              minWidth: 268,
            }}
          >
            {/* Header with Ox Sweep Toggle & Unit Toggle (Rad / Độ) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                paddingBottom: 4,
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Góc lượng giác
              </span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <button
                  type="button"
                  data-trig-action="toggle-ox-sweep"
                  aria-pressed={showOxSweep}
                  title="Vẽ đường đã quét qua trên trục Ox (cos)"
                  onClick={() =>
                    onUpdateProps?.(element.id, {
                      showOxSweep: !showOxSweep,
                    })
                  }
                  style={{
                    padding: "2px 7px",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: showOxSweep ? "1px solid #0d9488" : "1px solid #cbd5e1",
                    background: showOxSweep ? "#ccfbf1" : "#f8fafc",
                    color: showOxSweep ? "#0f766e" : "#475569",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  〰 Quét Ox
                </button>
                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    overflow: "hidden",
                    background: "#f8fafc",
                  }}
                >
                <button
                  type="button"
                  data-trig-unit="rad"
                  aria-pressed={unit === "rad"}
                  onClick={() => onUpdateProps?.(element.id, { unit: "rad" })}
                  style={{
                    padding: "2px 7px",
                    fontSize: 11,
                    fontWeight: unit === "rad" ? 700 : 500,
                    border: "none",
                    background: unit === "rad" ? "#2563eb" : "transparent",
                    color: unit === "rad" ? "#ffffff" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  Rad
                </button>
                <button
                  type="button"
                  data-trig-unit="deg"
                  aria-pressed={unit === "deg"}
                  onClick={() => onUpdateProps?.(element.id, { unit: "deg" })}
                  style={{
                    padding: "2px 7px",
                    fontSize: 11,
                    fontWeight: unit === "deg" ? 700 : 500,
                    border: "none",
                    background: unit === "deg" ? "#2563eb" : "transparent",
                    color: unit === "deg" ? "#ffffff" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  Độ (°)
                </button>
                </div>
              </div>
            </div>

            {/* Total Angle, Decomposition & Unit Equivalence (Single Row) */}
            <div
              data-wb-trig-total="true"
              style={{
                color: "#0f172a",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                flexWrap: "nowrap",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <KaTeXFormula latex={`\\alpha = ${readout.angleLatex}`} />
              {readout.decompositionLatex && (
                <span style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>
                  <span>= </span>
                  <KaTeXFormula latex={readout.decompositionLatex} />
                </span>
              )}
              <span style={{ color: "#64748b", fontSize: 11.5, fontWeight: 500 }}>
                {unit === "deg" ? (
                  <>
                    (<KaTeXFormula latex={readout.totalRadLatex} />)
                  </>
                ) : (
                  `(${readout.angleDeg.toFixed(1).replace(/\.0$/, "")}°)`
                )}
              </span>
            </div>

            {/* Revolution / Turn Counter & Quick Buttons */}
            <div
              data-wb-trig-turns="true"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "5px 7px",
                borderRadius: 7,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                fontSize: 11.5,
                color: "#92400e",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontWeight: 700 }}>
                  Số vòng: {readout.turns > 0 ? "+" : readout.turns < 0 ? "−" : ""}
                  {Math.abs(readout.turns)} vòng
                </span>
                <span style={{ color: "#b45309", fontSize: 11 }}>
                  ({readout.revolutions >= 0 ? "+" : "−"}
                  {Math.abs(readout.revolutions).toFixed(2)} vòng
                  {Math.abs(readout.revolutions) >= 0.01
                    ? readout.revolutions > 0
                      ? " · ngược KĐH"
                      : " · cùng KĐH"
                    : ""}
                  )
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  data-trig-action="sub-turn"
                  title="Quay cùng chiều KĐH thêm 1 vòng (−360° / −2π)"
                  onClick={() => {
                    setDragAngle(null);
                    onUpdateProps?.(element.id, {
                      angle: Number((storedAngle - 2 * Math.PI).toFixed(8)),
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: "2px 5px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 5,
                    border: "1px solid #fcd34d",
                    background: "#ffffff",
                    color: "#92400e",
                    cursor: "pointer",
                  }}
                >
                  −1 vòng
                </button>
                <button
                  type="button"
                  data-trig-action="reset-turns"
                  title="Đặt lại về vòng gốc (−180°..180°)"
                  onClick={() => {
                    setDragAngle(null);
                    onUpdateProps?.(element.id, {
                      angle: Number(normalizeAngle(storedAngle).toFixed(8)),
                    });
                  }}
                  style={{
                    padding: "2px 7px",
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 5,
                    border: "1px solid #fcd34d",
                    background: "#ffffff",
                    color: "#78350f",
                    cursor: "pointer",
                  }}
                >
                  0 vòng
                </button>
                <button
                  type="button"
                  data-trig-action="add-turn"
                  title="Quay ngược chiều KĐH thêm 1 vòng (+360° / +2π)"
                  onClick={() => {
                    setDragAngle(null);
                    onUpdateProps?.(element.id, {
                      angle: Number((storedAngle + 2 * Math.PI).toFixed(8)),
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: "2px 5px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 5,
                    border: "1px solid #fcd34d",
                    background: "#ffffff",
                    color: "#92400e",
                    cursor: "pointer",
                  }}
                >
                  +1 vòng
                </button>
              </div>
            </div>

            {/* Swept Path on Ox Readout & Origin Controls */}
            {showOxSweep && oxSweepData && (
              <div
                data-wb-trig-ox-sweep="true"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "5px 7px",
                  borderRadius: 7,
                  background: "#f0fdfa",
                  border: "1px solid #99f6e4",
                  fontSize: 11.5,
                  color: "#115e59",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>
                    Quãng đường Ox: S = {oxSweepData.distanceText}
                  </span>
                  <span style={{ fontSize: 11, color: "#0f766e" }}>
                    {oxSweepData.spanLabel}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    data-trig-action="set-ox-origin"
                    title="Đặt mốc bắt đầu quét tại vị trí M hiện tại"
                    onClick={() =>
                      onUpdateProps?.(element.id, {
                        sweepStartAngle: Number(liveAngle.toFixed(8)),
                      })
                    }
                    style={{
                      flex: 1,
                      padding: "2px 6px",
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 5,
                      border: "1px solid #5eead4",
                      background: "#ffffff",
                      color: "#0f766e",
                      cursor: "pointer",
                    }}
                  >
                    Đặt mốc tại M
                  </button>
                  <button
                    type="button"
                    data-trig-action="reset-ox-origin"
                    title="Đặt lại mốc quét về góc 0"
                    onClick={() =>
                      onUpdateProps?.(element.id, {
                        sweepStartAngle: 0,
                      })
                    }
                    style={{
                      padding: "2px 7px",
                      fontSize: 11,
                      fontWeight: 500,
                      borderRadius: 5,
                      border: "1px solid #5eead4",
                      background: "#ffffff",
                      color: "#115e59",
                      cursor: "pointer",
                    }}
                  >
                    Về mốc 0
                  </button>
                </div>
              </div>
            )}

            <div style={{ color: "#1565C0" }}>
              <KaTeXFormula latex={`\\cos\\alpha = ${readout.cosLatex}`} />
            </div>
            <div style={{ color: "#dc2626" }}>
              <KaTeXFormula latex={`\\sin\\alpha = ${readout.sinLatex}`} />
            </div>
            <div style={{ color: "#16a34a" }}>
              {readout.tanLatex !== null ? (
                <KaTeXFormula latex={`\\tan\\alpha = ${readout.tanLatex}`} />
              ) : (
                <span>tan α: không xác định</span>
              )}
            </div>
            <div style={{ color: "#9333ea" }}>
              {readout.cotLatex !== null ? (
                <KaTeXFormula latex={`\\cot\\alpha = ${readout.cotLatex}`} />
              ) : (
                <span>cot α: không xác định</span>
              )}
            </div>

            {isSelected && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  marginTop: 2,
                  paddingTop: 5,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                {(unit === "deg" ? PRESET_ANGLES_DEG : PRESET_ANGLES_RAD).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setDragAngle(null);
                      onUpdateProps?.(element.id, {
                        angle: preset.rad,
                      });
                    }}
                    style={{
                      padding: "2px 6px",
                      fontSize: 11,
                      borderRadius: 5,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      cursor: "pointer",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </foreignObject>
      </g>
    </g>
  );
};
