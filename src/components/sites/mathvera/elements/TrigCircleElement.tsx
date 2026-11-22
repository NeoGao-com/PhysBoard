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
        <foreignObject x={0} y={0} width={285} height={330} style={{ overflow: "visible" }}>
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
              minWidth: 248,
            }}
          >
            {/* Header with Unit Toggle (Rad / Độ) */}
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

            {/* Total Angle & Unit Equivalence */}
            <div data-wb-trig-total="true" style={{ color: "#0f172a", fontWeight: 600 }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <KaTeXFormula latex={`\\alpha = ${readout.angleLatex}`} />
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
              {readout.decompositionLatex && (
                <div style={{ color: "#64748b", fontSize: 11.5, fontWeight: 500, marginTop: 1 }}>
                  <span>= </span>
                  <KaTeXFormula latex={readout.decompositionLatex} />
                </div>
              )}
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
