"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CanvasElement } from "@/types/whiteboard";
import type { PhysicsSimProps } from "@/types/physics";
import {
  evaluatePhysicsSim,
  getEffectiveSimTime,
  getPhysicsSimMeta,
  type SimGraphPoint,
} from "@/lib/physics-sim";
import { renderPhysicsSceneSvg } from "./PhysicsSimScenes";

export interface PhysicsSimElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
  onExportGraph?: (id: string) => void;
  onRecordData?: (id: string, sample: { x: number; y: number }) => void;
}

const BOX_W = 640;
const BOX_H = 410;

function renderMiniScope(
  series: SimGraphPoint[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  title: string
): React.ReactNode {
  if (series.length < 2) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of series) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (typeof p.y2 === "number") {
      if (p.y2 < minY) minY = p.y2;
      if (p.y2 > maxY) maxY = p.y2;
    }
  }
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-3, maxY - minY);
  const pad = 16;
  const gw = w - pad * 2;
  const gh = h - pad * 2 - 12;

  const toPt = (x: number, y: number) => ({
    px: x0 + pad + ((x - minX) / spanX) * gw,
    py: y0 + 20 + gh - ((y - minY) / spanY) * gh,
  });

  const d1 = series
    .map((p, idx) => {
      const pt = toPt(p.x, p.y);
      return `${idx === 0 ? "M" : "L"} ${pt.px.toFixed(1)} ${pt.py.toFixed(1)}`;
    })
    .join(" ");

  const hasSecond = series.some((p) => typeof p.y2 === "number");
  const d2 = hasSecond
    ? series
        .map((p, idx) => {
          const pt = toPt(p.x, p.y2 ?? p.y);
          return `${idx === 0 ? "M" : "L"} ${pt.px.toFixed(1)} ${pt.py.toFixed(1)}`;
        })
        .join(" ")
    : "";

  const zeroInY = minY <= 0 && maxY >= 0;
  const zeroY = zeroInY ? toPt(minX, 0).py : y0 + 20 + gh;

  return (
    <g>
      <rect
        x={x0}
        y={y0}
        width={w}
        height={h}
        rx={8}
        fill="#f8fafc"
        stroke="#cbd5e1"
      />
      <text x={x0 + 10} y={y0 + 14} fontSize={10.5} fontWeight={700} fill="#334155">
        {title}
      </text>
      <line
        x1={x0 + pad}
        y1={zeroY}
        x2={x0 + w - pad}
        y2={zeroY}
        stroke="#cbd5e1"
        strokeDasharray="3 3"
      />
      <path d={d1} fill="none" stroke="#2563eb" strokeWidth={2} />
      {hasSecond && <path d={d2} fill="none" stroke="#ea580c" strokeWidth={1.6} />}
    </g>
  );
}

export const PhysicsSimElement: React.FC<PhysicsSimElementProps> = ({
  element,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
  onExportGraph,
  onRecordData,
}) => {
  const props = element.props as unknown as PhysicsSimProps;
  const meta = useMemo(() => getPhysicsSimMeta(props.kind), [props.kind]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!props.playing) return;
    let rafId = 0;
    const tick = () => {
      setNowMs(Date.now());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [props.playing]);

  const effectiveTime = getEffectiveSimTime(props, nowMs);
  const evaluated = useMemo(
    () => evaluatePhysicsSim(props.kind, effectiveTime, props.params ?? {}, props.mode),
    [props.kind, effectiveTime, props.params, props.mode]
  );

  const sc = element.transform.scale || 1;
  const worldW = (typeof props.width === "number" && props.width > 0 ? props.width : 11.2) * sc;
  const worldH = (typeof props.height === "number" && props.height > 0 ? props.height : 7.2) * sc;
  const tx = element.transform.x;
  const ty = element.transform.y;
  const showGraph = props.showGraph !== false;
  const stageW = showGraph ? 404 : 616;
  const stageH = 220;

  const togglePlay = () => {
    if (!onUpdateProps) return;
    if (props.playing) {
      onUpdateProps(element.id, {
        playing: false,
        simTime: effectiveTime,
        anchorEpoch: undefined,
      });
    } else {
      onUpdateProps(element.id, {
        playing: true,
        simTime: props.simTime || 0,
        anchorEpoch: Date.now(),
      });
    }
  };

  const resetSim = () => {
    onUpdateProps?.(element.id, {
      playing: false,
      simTime: 0,
      anchorEpoch: undefined,
    });
  };

  const cycleSpeed = () => {
    const order: Array<0.25 | 0.5 | 1 | 2> = [0.25, 0.5, 1, 2];
    const idx = order.indexOf(props.speed ?? 1);
    const next = order[(idx + 1) % order.length];
    onUpdateProps?.(element.id, {
      speed: next,
      simTime: effectiveTime,
      anchorEpoch: props.playing ? Date.now() : undefined,
    });
  };

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="PhysicsSim"
      data-physics-kind={props.kind}
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${tx - worldW / 2}, ${-ty - worldH / 2}) scale(${worldW / BOX_W}, ${worldH / BOX_H})`}
      onPointerDown={(e) => onPointerDown?.(e, element.id)}
      style={{ cursor: "move" }}
    >
      {/* Card Background */}
      <rect
        x={0}
        y={0}
        width={BOX_W}
        height={BOX_H}
        rx={12}
        fill="#ffffff"
        stroke={isSelected ? "#f59e0b" : "#cbd5e1"}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />

      {/* Header */}
      <rect x={0} y={0} width={BOX_W} height={38} rx={12} fill="#eff6ff" />
      <rect x={0} y={24} width={BOX_W} height={14} fill="#eff6ff" />
      <text x={14} y={24} fontSize={13.5} fontWeight={700} fill="#1e3a8a">
        {meta.icon} {meta.title}
      </text>

      {/* Visual Simulation Stage */}
      <g transform="translate(12, 46)">
        <rect
          x={0}
          y={0}
          width={stageW}
          height={stageH}
          rx={8}
          fill="#ffffff"
          stroke="#e2e8f0"
        />
        {renderPhysicsSceneSvg(
          props.kind,
          evaluated,
          stageW,
          stageH,
          props.showVectors !== false
        )}
      </g>

      {/* Right Mini Scope */}
      {showGraph &&
        renderMiniScope(
          evaluated.series,
          426,
          46,
          202,
          stageH,
          meta.graphAxesLabel.title
        )}

      {/* Readout Chips */}
      <foreignObject x={10} y={272} width={BOX_W - 20} height={132}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 12,
            color: "#0f172a",
          }}
        >
          {/* Metrics + Action row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {evaluated.metrics.map((m) => (
                <span
                  key={m.label}
                  data-physics-metric={m.label}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: "2px 7px",
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                >
                  <span style={{ color: "#475569" }}>{m.label}: </span>
                  <span style={{ color: "#1d4ed8" }}>{m.value}</span>
                </span>
              ))}
            </div>

            <div
              style={{ display: "flex", gap: 4, alignItems: "center" }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {meta.defaultModeOptions?.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateProps?.(element.id, { mode: opt.value })}
                  style={{
                    padding: "2px 7px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: props.mode === opt.value ? "#dbeafe" : "#ffffff",
                    color: props.mode === opt.value ? "#1d4ed8" : "#334155",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                data-physics-play="true"
                onClick={togglePlay}
                style={{
                  padding: "3px 10px",
                  borderRadius: 7,
                  border: "none",
                  background: props.playing ? "#ea580c" : "#2563eb",
                  color: "#ffffff",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {props.playing ? "❚❚ Dừng" : "▶ Chạy"}
              </button>
              <button
                type="button"
                data-physics-reset="true"
                onClick={resetSim}
                title="Đặt lại t = 0"
                style={{
                  padding: "3px 7px",
                  borderRadius: 7,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontSize: 11.5,
                }}
              >
                ↺
              </button>
              <button
                type="button"
                onClick={cycleSpeed}
                title="Đổi tốc độ mô phỏng"
                style={{
                  padding: "3px 7px",
                  borderRadius: 7,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {props.speed ?? 1}x
              </button>
            </div>
          </div>

          {/* Parameter Sliders + Quick Classroom Actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 6,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "6px 8px",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {meta.params.slice(0, 4).map((p) => {
              const val = props.params?.[p.key] ?? p.defaultValue;
              return (
                <label
                  key={p.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    fontSize: 11,
                  }}
                >
                  <span style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                    <span>{p.symbol} ({p.label})</span>
                    <span style={{ color: "#2563eb" }}>
                      {val} {p.unit}
                    </span>
                  </span>
                  <input
                    type="range"
                    data-physics-param={p.key}
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={val}
                    onChange={(e) => {
                      const nextVal = Number(e.target.value);
                      onUpdateProps?.(element.id, {
                        params: { ...(props.params ?? {}), [p.key]: nextVal },
                      });
                    }}
                    style={{ width: "100%", height: 14, accentColor: "#2563eb" }}
                  />
                </label>
              );
            })}
            <div style={{ display: "flex", gap: 5, alignItems: "center", justifyContent: "flex-end" }}>
              <button
                type="button"
                data-physics-export-graph="true"
                onClick={() => onExportGraph?.(element.id)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                📊 Đồ thị Oxy
              </button>
              <button
                type="button"
                data-physics-record="true"
                onClick={() => onRecordData?.(element.id, evaluated.recordPoint)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#15803d",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                📝 Ghi số đo
              </button>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};
