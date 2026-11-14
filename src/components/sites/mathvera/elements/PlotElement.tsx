"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CanvasElement } from "@/types/whiteboard";
import {
  analyzeFunctionForPlot,
  compileMathExpr,
  computeDefiniteIntegral,
  computeRevolutionVolume,
  computeTangentLine,
  sampleConicPoints,
  sampleImplicitEquation,
  samplePlotCurve,
} from "@/lib/math-eval";
import { getAxesBounds, AxesBounds } from "./AxesElement";
import { KaTeXFormula } from "./MathElement";

export interface PlotParam {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

function resolveParentAxes(
  element: CanvasElement,
  allElements: CanvasElement[]
): AxesBounds {
  const axesId = typeof element.props?.axes === "string" ? element.props.axes : "";
  const axesEl = axesId
    ? allElements.find((e) => e.id === axesId && e.type === "Axes2D")
    : allElements.find((e) => e.type === "Axes2D");
  if (axesEl) {
    return getAxesBounds(axesEl);
  }
  return {
    originX: element.transform.x || 0,
    originY: element.transform.y || 0,
    unitScale: element.transform.scale || 1,
    xNeg: 5,
    xPos: 5,
    yNeg: 5,
    yPos: 5,
  };
}

function collectParamValues(
  element: CanvasElement,
  allElements: CanvasElement[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const el of allElements) {
    if (el.type === "Slider" && typeof el.props?.name === "string") {
      const val = Number(el.props.value);
      if (Number.isFinite(val)) map[el.props.name] = val;
    }
  }
  const ownParams = element.props?.params;
  if (Array.isArray(ownParams)) {
    for (const item of ownParams) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as PlotParam).name === "string" &&
        typeof (item as PlotParam).value === "number"
      ) {
        const p = item as PlotParam;
        if (!(p.name in map)) {
          map[p.name] = p.value;
        }
      }
    }
  }
  return map;
}

function segmentsToPathD(segments: Array<Array<{ x: number; y: number }>>): string {
  return segments
    .map((seg) =>
      seg
        .map((pt, idx) => `${idx === 0 ? "M" : "L"}${pt.x.toFixed(4)},${(-pt.y).toFixed(4)}`)
        .join(" ")
    )
    .join(" ");
}

// ---------------------------------------------------------------------------
// 1. PlotElement (y = f(x))
// ---------------------------------------------------------------------------

export interface PlotElementProps {
  element: CanvasElement;
  allElements?: CanvasElement[];
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onUpdateExpr?: (id: string, exprLatex: string) => void;
  onUpdateParam?: (id: string, name: string, value: number) => void;
}

export const PlotElement: React.FC<PlotElementProps> = ({
  element,
  allElements = [],
  scale = 45,
  isSelected = false,
  onPointerDown,
  onUpdateExpr,
  onUpdateParam,
}) => {
  const exprLatex =
    typeof element.props?.exprLatex === "string" ? element.props.exprLatex : "x";
  const color =
    (typeof element.props?.color === "string" && element.props.color) ||
    element.style?.stroke ||
    "#2563eb";
  const strokeWidth = element.style?.width ?? 2.2;
  const domain = Array.isArray(element.props?.domain)
    ? (element.props.domain as [number, number])
    : undefined;
  const shade = Array.isArray(element.props?.shade)
    ? (element.props.shade as [number, number])
    : undefined;
  const marks = (element.props?.marks as Record<string, boolean> | undefined) ?? {};
  const ownParams = useMemo(() => {
    const raw = element.props?.params;
    return Array.isArray(raw) ? (raw as PlotParam[]) : [];
  }, [element.props?.params]);

  const [editing, setEditing] = useState(false);
  const [draftExpr, setDraftExpr] = useState(exprLatex);
  const [localParams, setLocalParams] = useState<Record<string, number>>({});

  useEffect(() => {
    setDraftExpr(exprLatex);
  }, [exprLatex]);

  const axes = useMemo(
    () => resolveParentAxes(element, allElements),
    [element, allElements]
  );

  const paramValues = useMemo(
    () => ({
      ...collectParamValues(element, allElements),
      ...localParams,
    }),
    [element, allElements, localParams]
  );

  const xMin = domain ? Math.max(-axes.xNeg, domain[0]) : -axes.xNeg;
  const xMax = domain ? Math.min(axes.xPos, domain[1]) : axes.xPos;

  const curveD = useMemo(() => {
    const segs = samplePlotCurve(
      exprLatex,
      xMin,
      xMax,
      -axes.yNeg,
      axes.yPos,
      paramValues,
      360
    );
    return segmentsToPathD(segs);
  }, [exprLatex, xMin, xMax, axes.yNeg, axes.yPos, paramValues]);

  const shadePathD = useMemo(() => {
    if (!shade || shade.length < 2) return "";
    const fn = compileMathExpr(exprLatex);
    if (!fn) return "";
    const a = Math.min(shade[0], shade[1]);
    const b = Math.max(shade[0], shade[1]);
    const steps = 64;
    const pts: Array<{ x: number; y: number }> = [{ x: a, y: 0 }];
    for (let i = 0; i <= steps; i++) {
      const x = a + ((b - a) * i) / steps;
      const y = fn({ ...paramValues, x });
      pts.push({ x, y: Number.isFinite(y) ? y : 0 });
    }
    pts.push({ x: b, y: 0 });
    return (
      pts
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(4)},${(-p.y).toFixed(4)}`)
        .join(" ") + " Z"
    );
  }, [shade, exprLatex, paramValues]);

  const analysis = useMemo(() => {
    if (
      !marks.roots &&
      !marks.extrema &&
      !marks.yIntercept &&
      !marks.asymptotes
    ) {
      return null;
    }
    return analyzeFunctionForPlot(exprLatex, paramValues, [xMin, xMax]);
  }, [
    marks.roots,
    marks.extrema,
    marks.yIntercept,
    marks.asymptotes,
    exprLatex,
    paramValues,
    xMin,
    xMax,
  ]);

  const invScale = 1 / ((scale || 45) * (axes.unitScale || 1));
  const hasSeparateSliders = ownParams.every((p) =>
    allElements.some((el) => el.type === "Slider" && el.props?.name === p.name)
  );

  const clipId = `wb-plot-clip-${element.id}`;
  const clipWidth = axes.xNeg + axes.xPos;
  const clipHeight = axes.yNeg + axes.yPos;

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Plot"
      data-wb-type="Plot"
      className="wb-plot"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${axes.originX} ${-axes.originY}) scale(${axes.unitScale})`}
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={-axes.xNeg}
            y={-axes.yPos}
            width={clipWidth}
            height={clipHeight}
          />
        </clipPath>
      </defs>

      {/* Cliped Curves and Shading */}
      <g clipPath={`url(#${clipId})`}>
        {/* Optional integral shade */}
        {shadePathD && <path d={shadePathD} fill={color} fillOpacity={0.2} stroke="none" />}

        {/* Asymptotes */}
        {marks.asymptotes &&
          analysis?.verticalAsymptotes.map((ax) => (
            <line
              key={`va-${ax.toFixed(3)}`}
              x1={ax}
              y1={-axes.yPos}
              x2={ax}
              y2={axes.yNeg}
              stroke="#94a3b8"
              strokeWidth={1.2}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {marks.asymptotes && analysis?.horizontalAsymptote !== null && analysis && (
          <line
            x1={-axes.xNeg}
            y1={-analysis.horizontalAsymptote}
            x2={axes.xPos}
            y2={-analysis.horizontalAsymptote}
            stroke="#94a3b8"
            strokeWidth={1.2}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Wide transparent hit target */}
        {curveD && (
          <path
            d={curveD}
            fill="none"
            stroke="rgba(0,0,0,0.001)"
            strokeWidth={14}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Visible Function Curve */}
        {curveD && (
          <path
            data-wb-plot="curve"
            className="wb-plot-curve curve"
            d={curveD}
            fill="none"
            stroke={isSelected ? "#f59e0b" : color}
            strokeWidth={strokeWidth}
            strokeDasharray={element.style?.dash ? "6 4" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </g>

      {/* Critical Point Marks */}
      {marks.roots &&
        analysis?.roots.map((r, i) => (
          <circle
            key={`root-${i}`}
            cx={r.x}
            cy={0}
            r={0.09}
            fill="#16a34a"
            stroke="#fff"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      {marks.extrema &&
        analysis?.extrema.map((ex, i) => (
          <circle
            key={`ext-${i}`}
            cx={ex.x}
            cy={-ex.y}
            r={0.09}
            fill="#dc2626"
            stroke="#fff"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      {marks.yIntercept && analysis?.yIntercept && (
        <circle
          cx={0}
          cy={-analysis.yIntercept.y}
          r={0.09}
          fill="#9333ea"
          stroke="#fff"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Plot Legend & Inline Formula Edit / Embedded Parameter Sliders */}
      <g transform={`translate(${-axes.xNeg} ${axes.yNeg + 0.3}) scale(${invScale})`}>
        <foreignObject x={0} y={0} width={340} height={180} style={{ overflow: "visible" }}>
          <div
            data-wb-plot-legend="true"
            style={{
              display: "inline-flex",
              flexDirection: "column",
              gap: 6,
              pointerEvents: "auto",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {editing ? (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#fff",
                  border: "1.5px solid #2563eb",
                  borderRadius: 8,
                  padding: "4px 8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                }}
              >
                <span style={{ color, fontWeight: 600, fontSize: 13 }}>y =</span>
                <input
                  data-wb-plot="formula"
                  autoFocus
                  value={draftExpr}
                  onChange={(e) => setDraftExpr(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      setEditing(false);
                      onUpdateExpr?.(element.id, draftExpr);
                    } else if (e.key === "Escape") {
                      setEditing(false);
                      setDraftExpr(exprLatex);
                    }
                  }}
                  style={{
                    width: 170,
                    border: "1px solid #cbd5e1",
                    borderRadius: 5,
                    padding: "2px 6px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
            ) : (
              <div
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                title="Bấm đúp để sửa công thức"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: 13,
                  color,
                }}
              >
                <KaTeXFormula latex={`y = ${exprLatex}`} />
              </div>
            )}

            {/* Embedded parameter sliders fallback if no separate Slider element exists */}
            {!hasSeparateSliders &&
              ownParams.map((p) => {
                const val = paramValues[p.name] ?? p.value;
                return (
                  <div
                    key={p.name}
                    data-wb-slider-card={p.name}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: 12,
                    }}
                  >
                    <KaTeXFormula latex={`${p.name} = ${Number(val.toFixed(2))}`} />
                    <input
                      type="range"
                      name={p.name}
                      data-wb-slider={p.name}
                      className="wb-parameter-slider"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={val}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setLocalParams((prev) => ({ ...prev, [p.name]: next }));
                        onUpdateParam?.(element.id, p.name, next);
                      }}
                      style={{ width: 130 }}
                    />
                  </div>
                );
              })}
          </div>
        </foreignObject>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// 2. SliderElement (Interactive Parameter Slider with Play/Pause Animation)
// ---------------------------------------------------------------------------

export interface SliderElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onChangeValue?: (id: string, value: number) => void;
}

export const SliderElement: React.FC<SliderElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
  onChangeValue,
}) => {
  const name = typeof element.props?.name === "string" ? element.props.name : "m";
  const min = typeof element.props?.min === "number" ? element.props.min : -5;
  const max = typeof element.props?.max === "number" ? element.props.max : 5;
  const step = typeof element.props?.step === "number" && element.props.step > 0 ? element.props.step : 0.1;
  const storedVal = typeof element.props?.value === "number" ? element.props.value : 1;

  const [playing, setPlaying] = useState(false);
  const [liveVal, setLiveVal] = useState(storedVal);

  useEffect(() => {
    setLiveVal(storedVal);
  }, [storedVal]);

  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let cur = liveVal;
    let dir = 1;
    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;
      cur += (dir * (max - min) * dt) / 4000;
      if (cur >= max) {
        cur = max;
        dir = -1;
      } else if (cur <= min) {
        cur = min;
        dir = 1;
      }
      const snapped = Math.round((cur - min) / step) * step + min;
      const clamped = Number(Math.min(max, Math.max(min, snapped)).toFixed(4));
      setLiveVal(clamped);
      onChangeValue?.(element.id, clamped);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, min, max, step, element.id]);

  const invScale = (element.transform.scale || 1) / (scale || 45);

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Slider"
      data-wb-type="Slider"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
    >
      <foreignObject x={0} y={0} width={280} height={46} style={{ overflow: "visible" }}>
        <div
          data-wb-slider-card={name}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            background: "#ffffff",
            border: `1.5px solid ${isSelected ? "#f59e0b" : "#cbd5e1"}`,
            borderRadius: 10,
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
            whiteSpace: "nowrap",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            title={playing ? "Tạm dừng" : "Chạy tự động"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setPlaying((p) => !p)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: playing ? "#e8f0fe" : "#f8fafc",
              color: "#1e293b",
              fontSize: 11,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <span style={{ minWidth: 54, color: "#0f172a" }}>
            <KaTeXFormula latex={`${name} = ${Number(liveVal.toFixed(2))}`} />
          </span>
          <input
            type="range"
            name={name}
            data-wb-slider={name}
            className="wb-parameter-slider"
            min={min}
            max={max}
            step={step}
            value={liveVal}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const next = Number(e.target.value);
              setLiveVal(next);
              onChangeValue?.(element.id, next);
            }}
            style={{ width: 140, cursor: "pointer" }}
          />
        </div>
      </foreignObject>
    </g>
  );
};

// ---------------------------------------------------------------------------
// 3. ConicElement (Ellipse, Parabola, Hyperbola)
// ---------------------------------------------------------------------------

export interface ConicElementProps {
  element: CanvasElement;
  allElements?: CanvasElement[];
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const ConicElement: React.FC<ConicElementProps> = ({
  element,
  allElements = [],
  isSelected = false,
  onPointerDown,
}) => {
  const kind = (element.props?.kind as "ellipse" | "parabola" | "hyperbola") ?? "ellipse";
  const a = typeof element.props?.a === "number" ? element.props.a : 3;
  const b = typeof element.props?.b === "number" ? element.props.b : 2;
  const axes = useMemo(
    () => resolveParentAxes(element, allElements),
    [element, allElements]
  );

  const pathD = useMemo(() => {
    const branches = sampleConicPoints(kind, a, b);
    return segmentsToPathD(branches);
  }, [kind, a, b]);

  const strokeColor = isSelected ? "#f59e0b" : (element.style?.stroke ?? "#9333ea");

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Conic"
      data-wb-type="Conic"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${axes.originX} ${-axes.originY}) scale(${axes.unitScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <path
        d={pathD}
        fill="none"
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={14}
        vectorEffect="non-scaling-stroke"
      />
      <path
        data-wb-plot="curve"
        className="wb-plot-curve"
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={element.style?.width ?? 2.2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
};

// ---------------------------------------------------------------------------
// 4. Curve2DElement (Equation, Parametric, Sequence, Inequality)
// ---------------------------------------------------------------------------

interface IneqLayer {
  boundaryD: string;
  hatchD: string;
  dashed: boolean;
  angleDeg: number;
}

function clipRectHalfPlane(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  a: number,
  b: number,
  c: number
): Array<{ x: number; y: number }> {
  // Keeps region where a*x + b*y + c >= 0
  let poly: Array<{ x: number; y: number }> = [
    { x: xMin, y: yMin },
    { x: xMax, y: yMin },
    { x: xMax, y: yMax },
    { x: xMin, y: yMax },
  ];
  const inside = (p: { x: number; y: number }) => a * p.x + b * p.y + c >= -1e-9;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % poly.length];
    const dCur = a * cur.x + b * cur.y + c;
    const dNxt = a * nxt.x + b * nxt.y + c;
    const inCur = inside(cur);
    const inNxt = inside(nxt);
    if (inCur && inNxt) {
      out.push(nxt);
    } else if (inCur && !inNxt) {
      const denom = dCur - dNxt;
      const t = Math.abs(denom) > 1e-12 ? dCur / denom : 0;
      out.push({ x: cur.x + t * (nxt.x - cur.x), y: cur.y + t * (nxt.y - cur.y) });
    } else if (!inCur && inNxt) {
      const denom = dCur - dNxt;
      const t = Math.abs(denom) > 1e-12 ? dCur / denom : 0;
      out.push({ x: cur.x + t * (nxt.x - cur.x), y: cur.y + t * (nxt.y - cur.y) });
      out.push(nxt);
    }
  }
  poly = out;
  return poly;
}

export interface Curve2DElementProps {
  element: CanvasElement;
  allElements?: CanvasElement[];
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const Curve2DElement: React.FC<Curve2DElementProps> = ({
  element,
  allElements = [],
  isSelected = false,
  onPointerDown,
}) => {
  const axes = useMemo(
    () => resolveParentAxes(element, allElements),
    [element, allElements]
  );
  const paramValues = useMemo(
    () => collectParamValues(element, allElements),
    [element, allElements]
  );
  const def = useMemo(
    () => (element.props?.def as Record<string, unknown> | undefined) ?? {},
    [element.props?.def]
  );
  const kind = typeof def.kind === "string" ? def.kind : "equation";
  const color =
    (typeof element.props?.color === "string" && element.props.color) ||
    element.style?.stroke ||
    "#0f766e";
  const strokeColor = isSelected ? "#f59e0b" : color;

  const rendered = useMemo(() => {
    if (kind === "equation") {
      const expr = typeof def.expr === "string" ? def.expr : "x^2 + y^2 = 4";
      const segs = sampleImplicitEquation(
        expr,
        -axes.xNeg,
        axes.xPos,
        -axes.yNeg,
        axes.yPos,
        paramValues,
        64
      );
      const d = segs
        .map(
          ([p1, p2]) =>
            `M${p1.x.toFixed(4)},${(-p1.y).toFixed(4)}L${p2.x.toFixed(4)},${(-p2.y).toFixed(4)}`
        )
        .join(" ");
      return {
        kind: "path" as const,
        d,
        pts: [] as Array<{ x: number; y: number }>,
        ineqLayers: [] as IneqLayer[],
      };
    }

    if (kind === "parametric") {
      const fx = compileMathExpr(typeof def.x === "string" ? def.x : "2*cos(t)");
      const fy = compileMathExpr(typeof def.y === "string" ? def.y : "2*sin(t)");
      const t0 = typeof def.t0 === "number" ? def.t0 : 0;
      const t1 = typeof def.t1 === "number" ? def.t1 : Math.PI * 2;
      const seg: Array<{ x: number; y: number }> = [];
      if (fx && fy) {
        const steps = 160;
        for (let i = 0; i <= steps; i++) {
          const t = t0 + ((t1 - t0) * i) / steps;
          const x = fx({ ...paramValues, t });
          const y = fy({ ...paramValues, t });
          if (Number.isFinite(x) && Number.isFinite(y)) seg.push({ x, y });
        }
      }
      return {
        kind: "path" as const,
        d: segmentsToPathD([seg]),
        pts: [],
        ineqLayers: [] as IneqLayer[],
      };
    }

    if (kind === "sequence") {
      const fu = compileMathExpr(typeof def.expr === "string" ? def.expr : "1/n");
      const nMax = Math.min(200, typeof def.nMax === "number" ? def.nMax : 10);
      const pts: Array<{ x: number; y: number }> = [];
      if (fu) {
        for (let n = 1; n <= nMax; n++) {
          const y = fu({ ...paramValues, n });
          if (Number.isFinite(y)) pts.push({ x: n, y });
        }
      }
      return {
        kind: "points" as const,
        d: "",
        pts,
        ineqLayers: [] as IneqLayer[],
      };
    }

    // Inequality: render boundary lines + SGK cross-hatched excluded regions
    const ineqStr = typeof def.expr === "string" ? def.expr : "x + y <= 4";
    const lines = ineqStr
      .split(/\n|;/)
      .map((l) => l.trim())
      .filter(Boolean);
    const xMin = -axes.xNeg;
    const xMax = axes.xPos;
    const yMin = -axes.yNeg;
    const yMax = axes.yPos;
    const hatchAngles = [-45, 0, 45, 90, -25, 25];

    const ineqLayers: IneqLayer[] = lines.map((line, idx) => {
      const m = /^([\s\S]*?)(<=|>=|<|>|\\leq|\\geq)(.*)$/.exec(line);
      const op = m ? m[2] : "<=";
      const lhs = m ? m[1] : line;
      const rhs = m ? m[3] : "0";
      const dashed = op === "<" || op === ">";
      const isLe = op === "<=" || op === "<" || op === "\\leq";
      const fn = compileMathExpr(`(${lhs}) - (${rhs})`);
      const angleDeg = hatchAngles[idx % hatchAngles.length];

      const segs = sampleImplicitEquation(
        `${lhs} = ${rhs}`,
        xMin,
        xMax,
        yMin,
        yMax,
        paramValues,
        48
      );
      const boundaryD = segs
        .map(
          ([p1, p2]) =>
            `M${p1.x.toFixed(4)},${(-p1.y).toFixed(4)}L${p2.x.toFixed(4)},${(-p2.y).toFixed(4)}`
        )
        .join(" ");

      let hatchD = "";
      if (fn) {
        const f00 = fn({ ...paramValues, x: 0, y: 0 });
        const f10 = fn({ ...paramValues, x: 1, y: 0 });
        const f01 = fn({ ...paramValues, x: 0, y: 1 });
        const f23 = fn({ ...paramValues, x: 2, y: 3 });
        const fNeg = fn({ ...paramValues, x: -1.7, y: 2.3 });
        const c0 = f00;
        const a0 = f10 - f00;
        const b0 = f01 - f00;
        const isLinear =
          [f00, f10, f01, f23, fNeg].every(Number.isFinite) &&
          Math.abs(f23 - (2 * a0 + 3 * b0 + c0)) < 1e-4 &&
          Math.abs(fNeg - (-1.7 * a0 + 2.3 * b0 + c0)) < 1e-4;

        if (isLinear && (Math.abs(a0) > 1e-9 || Math.abs(b0) > 1e-9)) {
          // Excluded side: if isLe (f <= 0 kept), hatch f >= 0; else hatch f <= 0 (-f >= 0)
          const sign = isLe ? 1 : -1;
          const poly = clipRectHalfPlane(
            xMin,
            xMax,
            yMin,
            yMax,
            sign * a0,
            sign * b0,
            sign * c0
          );
          if (poly.length >= 3) {
            hatchD =
              poly
                .map(
                  (pt, pIdx) =>
                    `${pIdx === 0 ? "M" : "L"}${pt.x.toFixed(4)},${(-pt.y).toFixed(4)}`
                )
                .join(" ") + " Z";
          }
        } else {
          // Nonlinear fallback: coarse grid of excluded horizontal strips
          const N = 40;
          const dx = (xMax - xMin) / N;
          const dy = (yMax - yMin) / N;
          const parts: string[] = [];
          for (let iy = 0; iy < N; iy++) {
            const yc = yMin + (iy + 0.5) * dy;
            const yTop = -(yMin + (iy + 1) * dy);
            const yBot = -(yMin + iy * dy);
            let runStart: number | null = null;
            for (let ix = 0; ix <= N; ix++) {
              const xc = xMin + (ix + 0.5) * dx;
              const val = ix < N ? fn({ ...paramValues, x: xc, y: yc }) : NaN;
              const excluded =
                ix < N &&
                Number.isFinite(val) &&
                (isLe ? val > 0 : val < 0);
              if (excluded && runStart === null) {
                runStart = xMin + ix * dx;
              } else if (!excluded && runStart !== null) {
                const xEnd = xMin + ix * dx;
                parts.push(
                  `M${runStart.toFixed(3)},${yTop.toFixed(3)}H${xEnd.toFixed(3)}V${yBot.toFixed(3)}H${runStart.toFixed(3)}Z`
                );
                runStart = null;
              }
            }
          }
          hatchD = parts.join(" ");
        }
      }

      return { boundaryD, hatchD, dashed, angleDeg };
    });

    return {
      kind: "inequality" as const,
      d: "",
      pts: [],
      ineqLayers,
    };
  }, [kind, def, axes, paramValues]);

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Curve2D"
      data-wb-type="Curve2D"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${axes.originX} ${-axes.originY}) scale(${axes.unitScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      {rendered.kind === "inequality" && rendered.ineqLayers.length > 0 && (
        <>
          <defs>
            {rendered.ineqLayers.map((layer, idx) => (
              <pattern
                key={`pat-${idx}`}
                id={`wb-ineq-hatch-${element.id}-${idx}`}
                width={0.28}
                height={0.28}
                patternUnits="userSpaceOnUse"
                patternTransform={`rotate(${layer.angleDeg})`}
              >
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={0.28}
                  stroke={strokeColor}
                  strokeWidth={0.025}
                  strokeOpacity={0.55}
                />
              </pattern>
            ))}
          </defs>
          {rendered.ineqLayers.map((layer, idx) => (
            <React.Fragment key={`ineq-${idx}`}>
              {layer.hatchD && (
                <path
                  data-wb-ineq-hatch="true"
                  d={layer.hatchD}
                  fill={`url(#wb-ineq-hatch-${element.id}-${idx})`}
                  stroke="none"
                  pointerEvents="none"
                />
              )}
              {layer.boundaryD && (
                <>
                  <path
                    d={layer.boundaryD}
                    fill="none"
                    stroke="rgba(0,0,0,0.001)"
                    strokeWidth={12}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="stroke"
                  />
                  <path
                    data-wb-plot="curve"
                    className="wb-plot-curve"
                    d={layer.boundaryD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={element.style?.width ?? 2}
                    strokeDasharray={layer.dashed ? "6 4" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
            </React.Fragment>
          ))}
        </>
      )}

      {rendered.kind === "path" && rendered.d && (
        <path
          data-wb-plot="curve"
          className="wb-plot-curve"
          d={rendered.d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={element.style?.width ?? 2}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {rendered.kind === "points" &&
        rendered.pts.map((pt, i) => (
          <React.Fragment key={i}>
            <line
              x1={pt.x}
              y1={0}
              x2={pt.x}
              y2={-pt.y}
              stroke={strokeColor}
              strokeOpacity={0.35}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={pt.x}
              cy={-pt.y}
              r={0.09}
              fill={strokeColor}
              stroke="#fff"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          </React.Fragment>
        ))}
    </g>
  );
};

// ---------------------------------------------------------------------------
// 5. GraphTangentElement
// ---------------------------------------------------------------------------

export interface GraphTangentElementProps {
  element: CanvasElement;
  allElements?: CanvasElement[];
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const GraphTangentElement: React.FC<GraphTangentElementProps> = ({
  element,
  allElements = [],
  isSelected = false,
  onPointerDown,
}) => {
  const plotId = typeof element.props?.plot === "string" ? element.props.plot : "";
  const x0 = typeof element.props?.x0 === "number" ? element.props.x0 : 0;
  const plotEl = allElements.find((e) => e.id === plotId && e.type === "Plot");

  const axes = useMemo(
    () => resolveParentAxes(plotEl ?? element, allElements),
    [plotEl, element, allElements]
  );

  const info = useMemo(() => {
    if (!plotEl) return null;
    const expr =
      typeof plotEl.props?.exprLatex === "string" ? plotEl.props.exprLatex : "x^2";
    const params = collectParamValues(plotEl, allElements);
    return computeTangentLine(expr, x0, params);
  }, [plotEl, allElements, x0]);

  if (!info) return null;

  const xA = -axes.xNeg;
  const xB = axes.xPos;
  const yA = info.y0 + info.slope * (xA - info.x0);
  const yB = info.y0 + info.slope * (xB - info.x0);
  const strokeColor = isSelected ? "#f59e0b" : (element.style?.stroke ?? "#2563eb");

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="GraphTangent"
      data-wb-type="GraphTangent"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${axes.originX} ${-axes.originY}) scale(${axes.unitScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <line
        x1={xA}
        y1={-yA}
        x2={xB}
        y2={-yB}
        stroke={strokeColor}
        strokeWidth={1.8}
        strokeDasharray="6 3"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={info.x0}
        cy={-info.y0}
        r={0.11}
        fill={strokeColor}
        stroke="#ffffff"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={info.x0 + 0.2}
        y={-info.y0 - 0.2}
        fontSize={0.28}
        fill={strokeColor}
        fontFamily="KaTeX_Main, 'Times New Roman', serif"
      >
        {info.equationLatex}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------------------
// 6. GraphAreaElement (Definite Integral / Area / Revolution)
// ---------------------------------------------------------------------------

export interface GraphAreaElementProps {
  element: CanvasElement;
  allElements?: CanvasElement[];
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const GraphAreaElement: React.FC<GraphAreaElementProps> = ({
  element,
  allElements = [],
  isSelected = false,
  onPointerDown,
}) => {
  const fId = typeof element.props?.f === "string" ? element.props.f : "";
  const gId = typeof element.props?.g === "string" ? element.props.g : "";
  const a = typeof element.props?.a === "number" ? element.props.a : 0;
  const b = typeof element.props?.b === "number" ? element.props.b : 2;
  const trapezoids =
    typeof element.props?.trapezoids === "number"
      ? element.props.trapezoids
      : undefined;
  const revolve = Boolean(element.props?.revolve);

  const fEl = allElements.find((e) => e.id === fId && e.type === "Plot");
  const gEl = gId ? allElements.find((e) => e.id === gId && e.type === "Plot") : undefined;

  const axes = useMemo(
    () => resolveParentAxes(fEl ?? element, allElements),
    [fEl, element, allElements]
  );

  const computed = useMemo(() => {
    const fExpr =
      fEl && typeof fEl.props?.exprLatex === "string" ? fEl.props.exprLatex : "x^2";
    const gExpr =
      gEl && typeof gEl.props?.exprLatex === "string" ? gEl.props.exprLatex : undefined;
    const params = fEl ? collectParamValues(fEl, allElements) : {};
    const fFn = compileMathExpr(fExpr);
    const gFn = gExpr ? compileMathExpr(gExpr) : null;
    if (!fFn) return null;

    const integral = computeDefiniteIntegral(fExpr, gExpr, a, b, params, trapezoids);
    const volume = revolve ? computeRevolutionVolume(fExpr, a, b, params) : null;

    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const steps = 64;
    const topPts: Array<{ x: number; y: number }> = [];
    const botPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const x = lo + ((hi - lo) * i) / steps;
      const yf = fFn({ ...params, x });
      const yg = gFn ? gFn({ ...params, x }) : 0;
      topPts.push({ x, y: Number.isFinite(yf) ? yf : 0 });
      botPts.push({ x, y: Number.isFinite(yg) ? yg : 0 });
    }
    const polyPts = [...topPts, ...botPts.reverse()];
    const regionD =
      polyPts
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(4)},${(-p.y).toFixed(4)}`)
        .join(" ") + " Z";

    return { regionD, integral, volume, topPts };
  }, [fEl, gEl, allElements, a, b, trapezoids, revolve]);

  if (!computed) return null;

  const color = isSelected ? "#f59e0b" : (element.style?.stroke ?? "#2563eb");

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="GraphArea"
      data-wb-type="GraphArea"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${axes.originX} ${-axes.originY}) scale(${axes.unitScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <path d={computed.regionD} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />

      {computed.integral.trapezoidShapes.map((poly, idx) => (
        <polygon
          key={idx}
          points={poly.map((p) => `${p.x.toFixed(3)},${(-p.y).toFixed(3)}`).join(" ")}
          fill="rgba(37, 99, 235, 0.12)"
          stroke="#1d4ed8"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Revolution rings around Ox when revolve=true */}
      {revolve &&
        [0.2, 0.4, 0.6, 0.8, 1].map((frac, idx) => {
          const pt =
            computed.topPts[Math.min(computed.topPts.length - 1, Math.floor(frac * (computed.topPts.length - 1)))];
          const r = Math.abs(pt.y);
          if (r < 0.05) return null;
          return (
            <ellipse
              key={idx}
              cx={pt.x}
              cy={0}
              rx={r * 0.28}
              ry={r}
              fill="none"
              stroke="#0284c7"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

      <text
        x={(a + b) / 2}
        y={-0.35}
        fontSize={0.28}
        fill="#1e3a8a"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight={600}
      >
        {computed.volume !== null
          ? `V ≈ ${computed.volume.toFixed(2)}`
          : `S ≈ ${computed.integral.area.toFixed(2)}`}
      </text>
    </g>
  );
};
