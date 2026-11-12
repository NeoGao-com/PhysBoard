"use client";

import React, { useEffect, useState } from "react";
import type { CanvasElement } from "@/types/whiteboard";
import type { PhysicsInstrumentProps } from "@/types/physics";

export interface PhysicsInstrumentElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
}

export const PhysicsInstrumentElement: React.FC<PhysicsInstrumentElementProps> = ({
  element,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
}) => {
  const props = element.props as unknown as PhysicsInstrumentProps;
  const sc = element.transform.scale || 1;
  const tx = element.transform.x;
  const ty = element.transform.y;
  const rotDeg = element.transform.rotation || 0;
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (props.instrumentKind !== "stopwatch" || !props.running) return;
    let raf = 0;
    const tick = () => {
      setNowMs(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [props.instrumentKind, props.running]);

  if (props.instrumentKind === "ruler") {
    const w = (props.width || 8.0) * sc;
    const h = (props.height || 1.4) * sc;
    const boxW = 400;
    const boxH = 70;
    const lengthCm = props.lengthCm || 20;
    const pxPerCm = (boxW - 24) / lengthCm;

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="PhysicsInstrument"
        data-physics-instrument="ruler"
        data-selected={isSelected ? "true" : undefined}
        transform={`translate(${tx}, ${-ty}) rotate(${rotDeg}) translate(${-w / 2}, ${-h / 2}) scale(${w / boxW}, ${h / boxH})`}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "move" }}
      >
        <rect
          x={0}
          y={0}
          width={boxW}
          height={boxH}
          rx={6}
          fill="rgba(254, 243, 199, 0.88)"
          stroke={isSelected ? "#f59e0b" : "#b45309"}
          strokeWidth={2}
        />
        {Array.from({ length: lengthCm * 5 + 1 }).map((_, idx) => {
          const isCm = idx % 5 === 0;
          const x = 12 + (idx / 5) * pxPerCm;
          const tickH = isCm ? 22 : 11;
          return (
            <g key={idx}>
              <line x1={x} y1={0} x2={x} y2={tickH} stroke="#78350f" strokeWidth={isCm ? 1.6 : 1} />
              {isCm && (
                <text x={x} y={36} textAnchor="middle" fontSize={10} fontWeight={700} fill="#78350f">
                  {idx / 5}
                </text>
              )}
            </g>
          );
        })}
        <text x={boxW - 44} y={58} fontSize={10.5} fontWeight={700} fill="#92400e">cm</text>
      </g>
    );
  }

  if (props.instrumentKind === "protractor") {
    const w = (props.width || 6.4) * sc;
    const h = (props.height || 3.6) * sc;
    const boxW = 320;
    const boxH = 180;
    const cx = 160;
    const cy = 162;
    const r = 142;

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="PhysicsInstrument"
        data-physics-instrument="protractor"
        data-selected={isSelected ? "true" : undefined}
        transform={`translate(${tx}, ${-ty}) rotate(${rotDeg}) translate(${-w / 2}, ${-h / 2}) scale(${w / boxW}, ${h / boxH})`}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "move" }}
      >
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`}
          fill="rgba(224, 242, 254, 0.72)"
          stroke={isSelected ? "#f59e0b" : "#0284c7"}
          strokeWidth={2}
        />
        <circle cx={cx} cy={cy} r={3.5} fill="#0369a1" />
        {Array.from({ length: 19 }).map((_, idx) => {
          const deg = idx * 10;
          const rad = (deg * Math.PI) / 180;
          const xOut = cx + r * Math.cos(rad);
          const yOut = cy - r * Math.sin(rad);
          const xIn = cx + (r - (deg % 30 === 0 ? 16 : 9)) * Math.cos(rad);
          const yIn = cy - (r - (deg % 30 === 0 ? 16 : 9)) * Math.sin(rad);
          const txLbl = cx + (r - 26) * Math.cos(rad);
          const tyLbl = cy - (r - 26) * Math.sin(rad);
          return (
            <g key={deg}>
              <line x1={xIn} y1={yIn} x2={xOut} y2={yOut} stroke="#0369a1" strokeWidth={deg % 30 === 0 ? 1.5 : 1} />
              {deg % 30 === 0 && (
                <text x={txLbl} y={tyLbl + 3} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#0c4a6e">
                  {deg}°
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  // Stopwatch
  const w = (props.width || 4.8) * sc;
  const h = (props.height || 2.8) * sc;
  const boxW = 240;
  const boxH = 140;
  const elapsed =
    (props.elapsedSec ?? 0) +
    (props.running && props.anchorEpoch ? Math.max(0, (nowMs - props.anchorEpoch) / 1000) : 0);

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="PhysicsInstrument"
      data-physics-instrument="stopwatch"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${tx - w / 2}, ${-ty - h / 2}) scale(${w / boxW}, ${h / boxH})`}
      onPointerDown={(e) => onPointerDown?.(e, element.id)}
      style={{ cursor: "move" }}
    >
      <rect
        x={0}
        y={0}
        width={boxW}
        height={boxH}
        rx={12}
        fill="#ffffff"
        stroke={isSelected ? "#f59e0b" : "#334155"}
        strokeWidth={2}
      />
      <foreignObject x={8} y={8} width={boxW - 16} height={boxH - 16}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontFamily: "system-ui, sans-serif",
            height: "100%",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>⏱ Đồng hồ bấm giây</div>
          <div
            data-physics-stopwatch-readout="true"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 24,
              fontWeight: 800,
              color: "#0f172a",
              textAlign: "center",
              background: "#f1f5f9",
              borderRadius: 8,
              padding: "4px 0",
            }}
          >
            {elapsed.toFixed(2)} s
          </div>
          <div
            style={{ display: "flex", gap: 6, justifyContent: "center" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (props.running) {
                  onUpdateProps?.(element.id, {
                    running: false,
                    elapsedSec: elapsed,
                    anchorEpoch: undefined,
                  });
                } else {
                  onUpdateProps?.(element.id, {
                    running: true,
                    elapsedSec: props.elapsedSec ?? 0,
                    anchorEpoch: Date.now(),
                  });
                }
              }}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                background: props.running ? "#ea580c" : "#16a34a",
                color: "#fff",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {props.running ? "Dừng" : "Bắt đầu"}
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateProps?.(element.id, {
                  laps: [...(props.laps ?? []), Number(elapsed.toFixed(2))].slice(-3),
                })
              }
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Lap
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateProps?.(element.id, {
                  running: false,
                  elapsedSec: 0,
                  anchorEpoch: undefined,
                  laps: [],
                })
              }
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              ↺
            </button>
          </div>
          {props.laps && props.laps.length > 0 && (
            <div style={{ fontSize: 10, color: "#475569", textAlign: "center" }}>
              Lap: {props.laps.join("s | ")}s
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};
