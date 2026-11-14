"use client";

import React, { useEffect, useState } from "react";
import type { CanvasElement } from "@/types/whiteboard";
import type { PhysicsInstrumentProps } from "@/types/physics";

export interface PhysicsInstrumentElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
  onDrawArcStroke?: (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => void;
}

export const PhysicsInstrumentElement: React.FC<PhysicsInstrumentElementProps> = ({
  element,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
  onDrawArcStroke,
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

  // -------------------------------------------------------------
  // 1. RULER (Thước thẳng chia vạch cm/mm)
  // -------------------------------------------------------------
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
        {Array.from({ length: lengthCm * 10 + 1 }).map((_, idx) => {
          const isCm = idx % 10 === 0;
          const isHalfCm = idx % 5 === 0 && !isCm;
          const x = 12 + (idx / 10) * pxPerCm;
          const tickH = isCm ? 22 : isHalfCm ? 15 : 9;
          return (
            <g key={idx}>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={tickH}
                stroke="#78350f"
                strokeWidth={isCm ? 1.6 : isHalfCm ? 1.1 : 0.75}
              />
              {isCm && (
                <text
                  x={x}
                  y={34}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#78350f"
                  style={{ userSelect: "none" }}
                >
                  {idx / 10}
                </text>
              )}
            </g>
          );
        })}
        <text
          x={boxW - 44}
          y={58}
          fontSize={10.5}
          fontWeight={700}
          fill="#92400e"
          style={{ userSelect: "none" }}
        >
          cm / mm
        </text>
        <rect
          x={0}
          y={boxH - 3}
          width={boxW}
          height={3}
          fill="#d97706"
          opacity={0.6}
        />
      </g>
    );
  }

  // -------------------------------------------------------------
  // 2. SET SQUARE (Êke vuông: 30-60-90 or 45-45-90)
  // -------------------------------------------------------------
  if (props.instrumentKind === "setsquare") {
    const is3060 = props.setSquareKind === "30-60-90";
    const w = (props.width || (is3060 ? 7.2 : 6.0)) * sc;
    const h = (props.height || (is3060 ? 4.5 : 6.0)) * sc;
    const boxW = is3060 ? 360 : 300;
    const boxH = is3060 ? 225 : 300;

    // Triangle vertices in local viewBox [0..boxW, 0..boxH]
    // Right angle at (20, boxH - 20)
    // Top vertex at (20, 20)
    // Right vertex at (boxW - 20, boxH - 20)
    const pTop = { x: 20, y: 20 };
    const pRightAngle = { x: 20, y: boxH - 20 };
    const pRight = { x: boxW - 20, y: boxH - 20 };

    // Inner cutout
    const inTop = { x: 50, y: is3060 ? 75 : 80 };
    const inRA = { x: 50, y: boxH - 50 };
    const inRight = { x: boxW - (is3060 ? 75 : 80), y: boxH - 50 };

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="PhysicsInstrument"
        data-physics-instrument="setsquare"
        data-setsquare-kind={is3060 ? "30-60-90" : "45-45-90"}
        data-selected={isSelected ? "true" : undefined}
        transform={`translate(${tx}, ${-ty}) rotate(${rotDeg}) translate(${-w / 2}, ${-h / 2}) scale(${w / boxW}, ${h / boxH})`}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "move" }}
      >
        {/* Outer triangle filled, inner cutout */}
        <path
          d={`M ${pTop.x} ${pTop.y} L ${pRight.x} ${pRight.y} L ${pRightAngle.x} ${pRightAngle.y} Z M ${inTop.x} ${inTop.y} L ${inRight.x} ${inRight.y} L ${inRA.x} ${inRA.y} Z`}
          fillRule="evenodd"
          fill="rgba(254, 240, 138, 0.78)"
          stroke={isSelected ? "#f59e0b" : "#ca8a04"}
          strokeWidth={2}
        />

        {/* Right-angle square mark */}
        <path
          d={`M ${pRightAngle.x} ${pRightAngle.y - 18} L ${pRightAngle.x + 18} ${pRightAngle.y - 18} L ${pRightAngle.x + 18} ${pRightAngle.y}`}
          fill="none"
          stroke="#854d0e"
          strokeWidth={1.5}
        />

        {/* Graduations along vertical leg */}
        {Array.from({ length: 15 }).map((_, i) => {
          const y = pRightAngle.y - i * 16;
          if (y < pTop.y + 10) return null;
          return (
            <line
              key={`v-${i}`}
              x1={pRightAngle.x}
              y1={y}
              x2={pRightAngle.x + (i % 5 === 0 ? 14 : 8)}
              y2={y}
              stroke="#854d0e"
              strokeWidth={i % 5 === 0 ? 1.4 : 0.8}
            />
          );
        })}

        {/* Graduations along horizontal leg */}
        {Array.from({ length: 18 }).map((_, i) => {
          const x = pRightAngle.x + i * 16;
          if (x > pRight.x - 10) return null;
          return (
            <line
              key={`h-${i}`}
              x1={x}
              y1={pRightAngle.y}
              x2={x}
              y2={pRightAngle.y - (i % 5 === 0 ? 14 : 8)}
              stroke="#854d0e"
              strokeWidth={i % 5 === 0 ? 1.4 : 0.8}
            />
          );
        })}

        {/* Kind label */}
        <text
          x={(pRightAngle.x + pRight.x) / 2}
          y={pRightAngle.y - 8}
          fontSize={10.5}
          fontWeight={700}
          fill="#713f12"
          textAnchor="middle"
          style={{ userSelect: "none" }}
        >
          {is3060 ? "Êke 30°–60°–90°" : "Êke 45°–45°–90°"}
        </text>
      </g>
    );
  }

  // -------------------------------------------------------------
  // 3. PROTRACTOR (Thước đo góc 180° / 360°)
  // -------------------------------------------------------------
  if (props.instrumentKind === "protractor") {
    const is360 = props.protractorType === "360";
    const w = (props.width || (is360 ? 6.4 : 6.4)) * sc;
    const h = (props.height || (is360 ? 6.4 : 3.6)) * sc;
    const boxW = 320;
    const boxH = is360 ? 320 : 180;
    const cx = 160;
    const cy = is360 ? 160 : 162;
    const r = 142;

    const angleReadout = typeof props.protractorAngle === "number" ? props.protractorAngle : 45;

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="PhysicsInstrument"
        data-physics-instrument="protractor"
        data-protractor-type={is360 ? "360" : "180"}
        data-selected={isSelected ? "true" : undefined}
        transform={`translate(${tx}, ${-ty}) rotate(${rotDeg}) translate(${-w / 2}, ${-h / 2}) scale(${w / boxW}, ${h / boxH})`}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "move" }}
      >
        {is360 ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="rgba(224, 242, 254, 0.72)"
            stroke={isSelected ? "#f59e0b" : "#0284c7"}
            strokeWidth={2}
          />
        ) : (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`}
            fill="rgba(224, 242, 254, 0.72)"
            stroke={isSelected ? "#f59e0b" : "#0284c7"}
            strokeWidth={2}
          />
        )}
        <circle cx={cx} cy={cy} r={3.5} fill="#0369a1" />

        {/* Inner cutout / baseline */}
        <line
          x1={cx - r + 10}
          y1={cy}
          x2={cx + r - 10}
          y2={cy}
          stroke="#0369a1"
          strokeWidth={1.5}
        />
        {is360 && (
          <line
            x1={cx}
            y1={cy - r + 10}
            x2={cx}
            y2={cy + r - 10}
            stroke="#0369a1"
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
        )}

        {/* Graduations */}
        {Array.from({ length: is360 ? 37 : 19 }).map((_, idx) => {
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
              <line
                x1={xIn}
                y1={yIn}
                x2={xOut}
                y2={yOut}
                stroke="#0369a1"
                strokeWidth={deg % 30 === 0 ? 1.5 : 1}
              />
              {deg % 30 === 0 && deg <= (is360 ? 350 : 180) && (
                <text
                  x={txLbl}
                  y={tyLbl + 3}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={700}
                  fill="#0c4a6e"
                  style={{ userSelect: "none" }}
                >
                  {deg}°
                </text>
              )}
            </g>
          );
        })}

        {/* Movable readout indicator ray */}
        {(() => {
          const armRad = (angleReadout * Math.PI) / 180;
          const rx = cx + (r - 10) * Math.cos(armRad);
          const ry = cy - (r - 10) * Math.sin(armRad);
          return (
            <g data-protractor-readout="true">
              <line
                x1={cx}
                y1={cy}
                x2={rx}
                y2={ry}
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="3 2"
              />
              <circle cx={rx} cy={ry} r={5} fill="#dc2626" />
              <text
                x={cx}
                y={is360 ? cy - 35 : cy - 25}
                textAnchor="middle"
                fontSize={13}
                fontWeight={800}
                fill="#b91c1c"
                style={{ userSelect: "none" }}
              >
                {Math.round(angleReadout)}°
              </text>
            </g>
          );
        })()}
      </g>
    );
  }

  // -------------------------------------------------------------
  // 4. COMPASS (Compa vẽ đường tròn & cung tròn)
  // -------------------------------------------------------------
  if (props.instrumentKind === "compass") {
    const w = (props.width || 5.2) * sc;
    const h = (props.height || 5.2) * sc;
    const boxW = 260;
    const boxH = 260;

    const currentRadius = props.compassRadius || 3.0; // cm or units
    const radiusPx = Math.max(30, Math.min(100, currentRadius * 25));
    const cx = 130;
    const cy = 40; // Hinge top
    const needleX = cx - radiusPx / 2;
    const pencilX = cx + radiusPx / 2;
    const tipY = 220;

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="PhysicsInstrument"
        data-physics-instrument="compass"
        data-selected={isSelected ? "true" : undefined}
        transform={`translate(${tx}, ${-ty}) rotate(${rotDeg}) translate(${-w / 2}, ${-h / 2}) scale(${w / boxW}, ${h / boxH})`}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "move" }}
      >
        {/* Compass Hinge at Top */}
        <circle cx={cx} cy={cy} r={9} fill="#475569" stroke="#1e293b" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={3} fill="#f8fafc" />

        {/* Needle Leg (Left leg) */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={tipY}
          stroke="#64748b"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Steel needle tip */}
        <polygon
          points={`${needleX - 2.5},${tipY - 14} ${needleX + 2.5},${tipY - 14} ${needleX},${tipY}`}
          fill="#334155"
        />
        <circle cx={needleX} cy={tipY} r={3} fill="#0284c7" />

        {/* Pencil Leg (Right leg) */}
        <line
          x1={cx}
          y1={cy}
          x2={pencilX}
          y2={tipY}
          stroke="#64748b"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Pencil holder & lead nib */}
        <rect
          x={pencilX - 4}
          y={tipY - 26}
          width={8}
          height={20}
          fill="#f59e0b"
          rx={2}
          stroke="#b45309"
        />
        <polygon
          points={`${pencilX - 3.5},${tipY - 6} ${pencilX + 3.5},${tipY - 6} ${pencilX},${tipY}`}
          fill="#0f172a"
        />
        <circle cx={pencilX} cy={tipY} r={3} fill="#ef4444" />

        {/* Adjustable hinge arc */}
        <path
          d={`M ${needleX + 18} ${cy + 60} A 50 50 0 0 1 ${pencilX - 18} ${cy + 60}`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="2 2"
        />

        {/* Radius badge / quick button */}
        <g
          data-compass-action="draw-circle"
          onClick={(e) => {
            e.stopPropagation();
            onDrawArcStroke?.(tx, ty, currentRadius, 0, 360);
          }}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={cx - 44}
            y={cy + 85}
            width={88}
            height={24}
            rx={12}
            fill="#eff6ff"
            stroke="#3b82f6"
            strokeWidth={1.5}
          />
          <text
            x={cx}
            y={cy + 101}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="#1d4ed8"
            style={{ userSelect: "none" }}
          >
            Vẽ tròn R={currentRadius.toFixed(1)}cm
          </text>
        </g>
      </g>
    );
  }

  // -------------------------------------------------------------
  // 5. STOPWATCH (Đồng hồ bấm giây)
  // -------------------------------------------------------------
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
