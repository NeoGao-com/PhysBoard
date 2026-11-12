"use client";

import React from "react";
import type { CanvasElement } from "@/types/whiteboard";
import type { PhysicsLabTableProps } from "@/types/physics";

export interface PhysicsLabTableElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
  onPlotRegression?: (id: string) => void;
}

const BOX_W = 360;
const BOX_H = 235;

export function computeLinearRegression(
  rows: Array<{ x: number; y: number }>
): { a: number; b: number; r2: number } | null {
  if (rows.length < 2) return null;
  const n = rows.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const r of rows) {
    sx += r.x;
    sy += r.y;
    sxx += r.x * r.x;
    sxy += r.x * r.y;
    syy += r.y * r.y;
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-12) return null;
  const a = (n * sxy - sx * sy) / denom;
  const b = (sy - a * sx) / n;
  const yMean = sy / n;
  const ssTot = syy - n * yMean * yMean;
  const ssRes = rows.reduce((acc, r) => acc + Math.pow(r.y - (a * r.x + b), 2), 0);
  const r2 = ssTot > 1e-12 ? Math.max(0, 1 - ssRes / ssTot) : 1;
  return { a, b, r2 };
}

let nextLabRowSeq = 1;
function createLabRowId(len: number): string {
  nextLabRowSeq += 1;
  return `r_${len + 1}_${nextLabRowSeq}`;
}

export const PhysicsLabTableElement: React.FC<PhysicsLabTableElementProps> = ({
  element,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
  onPlotRegression,
}) => {
  const props = element.props as unknown as PhysicsLabTableProps;
  const sc = element.transform.scale || 1;
  const worldW = (props.width || 7.2) * sc;
  const worldH = (props.height || 4.7) * sc;
  const tx = element.transform.x;
  const ty = element.transform.y;
  const rows = props.rows ?? [];
  const reg = computeLinearRegression(rows);

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="PhysicsLabTable"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${tx - worldW / 2}, ${-ty - worldH / 2}) scale(${worldW / BOX_W}, ${worldH / BOX_H})`}
      onPointerDown={(e) => onPointerDown?.(e, element.id)}
      style={{ cursor: "move" }}
    >
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
      <foreignObject x={10} y={8} width={BOX_W - 20} height={BOX_H - 16}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            height: "100%",
            fontFamily: "system-ui, sans-serif",
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "#0f766e" }}>
              📝 {props.title || "Bảng số liệu thực hành"}
            </span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                onUpdateProps?.(element.id, {
                  rows: [
                    ...rows,
                    { id: createLabRowId(rows.length), x: rows.length + 1, y: (rows.length + 1) * 2 },
                  ],
                })
              }
              style={{
                padding: "2px 7px",
                borderRadius: 5,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Dòng
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              border: "1px solid #e2e8f0",
              borderRadius: 7,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: "4px 6px" }}>#</th>
                  <th style={{ padding: "4px 6px" }}>{props.xLabel || "x"}</th>
                  <th style={{ padding: "4px 6px" }}>{props.yLabel || "y"}</th>
                  <th style={{ width: 24 }} />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, textAlign: "center", color: "#64748b" }}>
                      Nhấn &quot;📝 Ghi số đo&quot; trên thí nghiệm hoặc &quot;+ Dòng&quot; để thêm số liệu.
                    </td>
                  </tr>
                )}
                {rows.map((r, idx) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "3px 6px", color: "#64748b" }}>{idx + 1}</td>
                    <td style={{ padding: "2px 4px" }}>
                      <input
                        type="number"
                        value={r.x}
                        step="any"
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          onUpdateProps?.(element.id, {
                            rows: rows.map((it) => (it.id === r.id ? { ...it, x: v } : it)),
                          });
                        }}
                        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 4, padding: "1px 4px" }}
                      />
                    </td>
                    <td style={{ padding: "2px 4px" }}>
                      <input
                        type="number"
                        value={r.y}
                        step="any"
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          onUpdateProps?.(element.id, {
                            rows: rows.map((it) => (it.id === r.id ? { ...it, y: v } : it)),
                          });
                        }}
                        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 4, padding: "1px 4px" }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProps?.(element.id, {
                            rows: rows.filter((it) => it.id !== r.id),
                          })
                        }
                        style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: 11, color: "#334155", fontWeight: 600 }}>
              {reg
                ? `y = ${reg.a.toFixed(2)}x ${reg.b >= 0 ? "+" : "-"} ${Math.abs(reg.b).toFixed(2)} (R²=${reg.r2.toFixed(3)})`
                : "Cần ≥ 2 điểm để hồi quy"}
            </span>
            <button
              type="button"
              data-physics-regression-plot="true"
              disabled={rows.length < 1}
              onClick={() => onPlotRegression?.(element.id)}
              style={{
                padding: "4px 9px",
                borderRadius: 6,
                border: "none",
                background: rows.length >= 1 ? "#0f766e" : "#cbd5e1",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                cursor: rows.length >= 1 ? "pointer" : "default",
                whiteSpace: "nowrap",
              }}
            >
              📈 Vẽ hồi quy Oxy
            </button>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};
