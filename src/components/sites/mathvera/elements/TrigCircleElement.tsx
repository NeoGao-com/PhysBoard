"use client";

import React, { useMemo, useRef, useState } from "react";
import { CanvasElement } from "@/types/whiteboard";
import {
  computeTrigValues,
  normalizeAngle,
  snapTrigAngle,
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

const PRESET_ANGLES: Array<{ label: string; latex: string; rad: number }> = [
  { label: "π/6", latex: "\\frac{\\pi}{6}", rad: Math.PI / 6 },
  { label: "π/4", latex: "\\frac{\\pi}{4}", rad: Math.PI / 4 },
  { label: "2π/3", latex: "\\frac{2\\pi}{3}", rad: (2 * Math.PI) / 3 },
  { label: "-3π/4", latex: "-\\frac{3\\pi}{4}", rad: (-3 * Math.PI) / 4 },
  { label: "120°", latex: "120^{\\circ}", rad: (2 * Math.PI) / 3 },
];

/**
 * Interactive Unit Trigonometric Circle (`[data-wb-type="TrigCircle"]`, `.wb-trig-circle`)
 * with draggable point `[data-wb-point="M"]` and live readout `[data-wb-trig-values="true"]`.
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

  const R = 2.6 * (element.transform.scale || 1);
  const invScale = 1 / (scale || 45);

  const readout = useMemo(
    () => computeTrigValues(liveAngle, unit),
    [liveAngle, unit]
  );

  const mx = R * Math.cos(liveAngle);
  const my = R * Math.sin(liveAngle);

  // Angle arc SVG path from 0 to liveAngle
  const arcPath = useMemo(() => {
    const rArc = R * 0.24;
    const norm = normalizeAngle(liveAngle);
    if (Math.abs(norm) < 1e-4) return "";
    const endX = rArc * Math.cos(norm);
    const endY = -rArc * Math.sin(norm);
    const largeArc = Math.abs(norm) > Math.PI ? 1 : 0;
    const sweep = norm > 0 ? 0 : 1; // SVG Y is down so positive math angle sweeps CCW (0)
    return `M ${rArc},0 A ${rArc},${rArc} 0 ${largeArc} ${sweep} ${endX.toFixed(4)},${endY.toFixed(4)}`;
  }, [liveAngle, R]);

  const handlePointMDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.preventDefault();
    latestAngleRef.current = storedAngle;
    setDragAngle(storedAngle);

    const updateFromClient = (clientX: number, clientY: number) => {
      const rect = circleRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rawAngle = Math.atan2(-(clientY - cy), clientX - cx);
      const snapped = snapTrigAngle(rawAngle, 0.06);
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

      {/* Angle arc */}
      {arcPath && (
        <path
          d={arcPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.8}
          vectorEffect="non-scaling-stroke"
        />
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
        <foreignObject x={0} y={0} width={235} height={220} style={{ overflow: "visible" }}>
          <div
            data-wb-trig-values="true"
            className="wb-trig-readout"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.96)",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "8px 10px",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              pointerEvents: "auto",
              minWidth: 195,
            }}
          >
            <div style={{ color: "#0f172a", fontWeight: 600 }}>
              <KaTeXFormula latex={`\\alpha = ${readout.angleLatex}`} />
              <span style={{ color: "#64748b", fontSize: 11, marginLeft: 6 }}>
                ({readout.angleDeg.toFixed(0)}°)
              </span>
            </div>
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
                  marginTop: 4,
                  paddingTop: 4,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                {PRESET_ANGLES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setDragAngle(null);
                      onUpdateProps?.(element.id, {
                        angle: preset.rad,
                        unit: preset.label.endsWith("°") ? "deg" : "rad",
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
