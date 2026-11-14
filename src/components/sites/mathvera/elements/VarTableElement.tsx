"use client";

import React, { useMemo, useState } from "react";
import { CanvasElement } from "@/types/whiteboard";
import { VarTableCellValue, VarTableData, VarTableRow } from "@/lib/math-eval";
import { KaTeXFormula } from "./MathElement";

export interface VarTableElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onUpdate?: (id: string, nextProps: Record<string, unknown>) => void;
}

function normalizeVarTableData(props: Record<string, unknown>): VarTableData {
  const xs = Array.isArray(props.xs)
    ? props.xs.map((x) => String(x ?? ""))
    : ["-\\infty", "-1", "1", "+\\infty"];
  const rows: VarTableRow[] = Array.isArray(props.rows)
    ? (props.rows as VarTableRow[])
    : [
        { kind: "sign", label: "y'", cells: ["", "+", "0", "-", "0", "+", ""] },
        {
          kind: "variation",
          label: "y",
          cells: [
            { v: [{ latex: "-\\infty", level: "bottom" }] },
            { v: [{ latex: "3", level: "top" }] },
            { v: [{ latex: "-1", level: "bottom" }] },
            { v: [{ latex: "+\\infty", level: "top" }] },
          ],
        },
      ];
  return {
    xs,
    rows,
    source: typeof props.source === "string" ? props.source : undefined,
  };
}

function levelToY(level: "top" | "mid" | "bottom"): number {
  if (level === "top") return 16;
  if (level === "bottom") return 82;
  return 49;
}

const CYCLE_SIGN_INTERVAL = ["+", "-", ""];
const CYCLE_SIGN_NODE = ["0", "||", ""];

/**
 * Renders Vietnamese SGK Bảng biến thiên / Bảng xét dấu (`[data-wb-type="VarTable"]`, `.wb-var-table`).
 */
export const VarTableElement: React.FC<VarTableElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
  onUpdate,
}) => {
  const data = useMemo(
    () => normalizeVarTableData(element.props ?? {}),
    [element.props]
  );

  const [editingSlot, setEditingSlot] = useState<{
    kind: "x" | "v";
    idx: number;
    rowIdx?: number;
    subIdx?: number;
  } | null>(null);
  const [draft, setDraft] = useState("");

  const n = Math.max(2, data.xs.length);
  const nodeColW = 54;
  const intervalColW = 68;
  const headerColW = 48;
  const tableW = headerColW + n * nodeColW + (n - 1) * intervalColW;
  const variationHeight = 98;
  const totalH =
    36 +
    data.rows.reduce(
      (sum, r) => sum + (r.kind === "variation" ? variationHeight : 34),
      0
    );

  const invScale = (element.transform.scale || 1) / (scale || 45);
  const strokeColor = isSelected ? "#f59e0b" : (element.style?.stroke ?? "#1e293b");

  const commitSlot = () => {
    if (!editingSlot) return;
    if (editingSlot.kind === "x") {
      const nextXs = data.xs.map((val, i) =>
        i === editingSlot.idx ? draft : val
      );
      onUpdate?.(element.id, { xs: nextXs });
    } else if (
      editingSlot.kind === "v" &&
      editingSlot.rowIdx !== undefined &&
      editingSlot.subIdx !== undefined
    ) {
      const nextRows = data.rows.map((row, ri) => {
        if (ri !== editingSlot.rowIdx || row.kind !== "variation") return row;
        return {
          ...row,
          cells: row.cells.map((cell, ci) => {
            if (ci !== editingSlot.idx) return cell;
            return {
              ...cell,
              v: cell.v.map((val, si) =>
                si === editingSlot.subIdx ? { ...val, latex: draft } : val
              ),
            };
          }),
        };
      });
      onUpdate?.(element.id, { rows: nextRows });
    }
    setEditingSlot(null);
  };

  const cycleSignCell = (rowIdx: number, cellIdx: number) => {
    const row = data.rows[rowIdx];
    if (!row || row.kind !== "sign") return;
    const isNode = cellIdx % 2 === 0;
    const pool = isNode ? CYCLE_SIGN_NODE : CYCLE_SIGN_INTERVAL;
    const cur = row.cells[cellIdx] ?? "";
    const next = pool[(pool.indexOf(cur) + 1) % pool.length];
    const nextCells = [...row.cells];
    nextCells[cellIdx] = next;
    const nextRows = data.rows.map((r, ri) =>
      ri === rowIdx ? { ...r, cells: nextCells } : r
    );
    onUpdate?.(element.id, { rows: nextRows });
  };

  const toggleNodeLevel = (rowIdx: number, cellIdx: number, subIdx: number) => {
    const order: Array<"top" | "mid" | "bottom"> = ["top", "mid", "bottom"];
    const nextRows = data.rows.map((row, ri) => {
      if (ri !== rowIdx || row.kind !== "variation") return row;
      return {
        ...row,
        cells: row.cells.map((cell, ci) => {
          if (ci !== cellIdx) return cell;
          return {
            ...cell,
            v: cell.v.map((item, si) =>
              si === subIdx
                ? {
                    ...item,
                    level: order[(order.indexOf(item.level) + 1) % order.length],
                  }
                : item
            ),
          };
        }),
      };
    });
    onUpdate?.(element.id, { rows: nextRows });
  };

  const addSignRow = () => {
    const newSignRow: VarTableRow = {
      kind: "sign",
      label: "y''",
      cells: Array.from({ length: 2 * n - 1 }, (_, i) => (i % 2 === 0 ? "0" : "+")),
    };
    onUpdate?.(element.id, { rows: [...data.rows, newSignRow] });
  };

  const addVariationRow = () => {
    const newVarRow: VarTableRow = {
      kind: "variation",
      label: "y",
      cells: Array.from({ length: n }, () => ({
        v: [{ latex: "0", level: "mid" }],
      })),
    };
    onUpdate?.(element.id, { rows: [...data.rows, newVarRow] });
  };

  const addColumnX = () => {
    const nextXs = [...data.xs, "x_0"];
    const nextRows = data.rows.map((row) => {
      if (row.kind === "sign") {
        return {
          ...row,
          cells: [...row.cells, "+", "0"],
        };
      } else {
        return {
          ...row,
          cells: [...row.cells, { v: [{ latex: "0", level: "mid" as const }] }],
        };
      }
    });
    onUpdate?.(element.id, { xs: nextXs, rows: nextRows });
  };

  const deleteRow = (rowIdx: number) => {
    if (data.rows.length <= 1) return;
    const nextRows = data.rows.filter((_, i) => i !== rowIdx);
    onUpdate?.(element.id, { rows: nextRows });
  };

  const editRowLabel = (rowIdx: number, newLabel: string) => {
    const nextRows = data.rows.map((r, i) => (i === rowIdx ? { ...r, label: newLabel } : r));
    onUpdate?.(element.id, { rows: nextRows });
  };

  const totalCols = 2 * n - 1;

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="VarTable"
      data-wb-type="VarTable"
      className="wb-var-table"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <foreignObject
        x={0}
        y={0}
        width={tableW + 120}
        height={totalH + 60}
        style={{ overflow: "visible" }}
      >
        <div style={{ display: "inline-block", position: "relative" }}>
          {isSelected && (
            <div
              data-export-skip="true"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
                background: "#0f172a",
                padding: "4px 8px",
                borderRadius: 6,
                boxShadow: "0 4px 12px rgba(15,23,42,0.25)",
              }}
            >
              <button
                type="button"
                onClick={addSignRow}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 7px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Thêm hàng dấu (y&apos;&apos;)
              </button>
              <button
                type="button"
                onClick={addVariationRow}
                style={{
                  background: "#0891b2",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 7px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Thêm hàng f(x)
              </button>
              <button
                type="button"
                onClick={addColumnX}
                style={{
                  background: "#475569",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 7px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Thêm mốc x
              </button>
            </div>
          )}

          <div
            style={{
              display: "inline-block",
              background: "#ffffff",
              border: `1.5px solid ${strokeColor}`,
              borderRadius: 6,
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.08)",
              overflow: "hidden",
              fontFamily: "system-ui, sans-serif",
              pointerEvents: "auto",
            }}
          >
            <table
              className="var-table"
              style={{
                borderCollapse: "collapse",
                tableLayout: "fixed",
                width: tableW,
                color: "#0f172a",
                fontSize: 15,
              }}
            >
              <colgroup>
                <col style={{ width: headerColW }} />
                {Array.from({ length: totalCols }, (_, ci) => (
                  <col
                    key={ci}
                    style={{ width: ci % 2 === 0 ? nodeColW : intervalColW }}
                  />
                ))}
              </colgroup>
              <tbody>
                {/* Row 1: x values */}
                <tr style={{ height: 36, borderBottom: "1px solid #475569" }}>
                  <td
                    style={{
                      borderRight: "1px solid #475569",
                      textAlign: "center",
                      fontWeight: 600,
                      background: "#f8fafc",
                    }}
                  >
                    <KaTeXFormula latex="x" />
                  </td>
                  {Array.from({ length: totalCols }, (_, ci) => {
                    if (ci % 2 === 1) {
                      return <td key={ci} />;
                    }
                    const idx = ci / 2;
                    const xVal = data.xs[idx] ?? "";
                    const isEd = editingSlot?.kind === "x" && editingSlot.idx === idx;
                    return (
                      <td
                        key={ci}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingSlot({ kind: "x", idx });
                          setDraft(xVal);
                        }}
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          padding: "2px 4px",
                        }}
                      >
                        {isEd ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitSlot}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") commitSlot();
                              if (e.key === "Escape") setEditingSlot(null);
                            }}
                            style={{
                              width: "100%",
                              fontSize: 12,
                              border: "1px solid #2563eb",
                              borderRadius: 3,
                              textAlign: "center",
                            }}
                          />
                        ) : (
                          <KaTeXFormula latex={xVal || "\\square"} />
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Subsequent rows: Sign and Variation */}
                {data.rows.map((row, rowIdx) => {
                  const labelSlot = (
                    <td
                      key="header-cell"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        const next = window.prompt("Tên hàng (LaTeX):", row.label);
                        if (next !== null && next.trim()) editRowLabel(rowIdx, next.trim());
                      }}
                      title="Nháy đúp để đổi tên hàng"
                      style={{
                        borderRight: "1px solid #475569",
                        textAlign: "center",
                        fontWeight: 600,
                        background: "#f8fafc",
                        position: "relative",
                      }}
                    >
                      <KaTeXFormula latex={row.label} />
                      {isSelected && data.rows.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRow(rowIdx);
                          }}
                          title="Xóa hàng này"
                          style={{
                            position: "absolute",
                            top: 2,
                            left: 2,
                            border: "none",
                            background: "rgba(239,68,68,0.15)",
                            color: "#dc2626",
                            fontSize: 10,
                            borderRadius: 3,
                            width: 14,
                            height: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  );

                  if (row.kind === "sign") {
                    return (
                      <tr
                        key={rowIdx}
                        style={{ height: 34, borderBottom: "1px solid #475569" }}
                      >
                        {labelSlot}
                      {Array.from({ length: totalCols }, (_, ci) => {
                        const cellVal = row.cells[ci] ?? "";
                        return (
                          <td
                            key={ci}
                            onClick={(e) => {
                              if (isSelected) {
                                e.stopPropagation();
                                cycleSignCell(rowIdx, ci);
                              }
                            }}
                            title={isSelected ? "Bấm để đổi dấu / 0 / ||" : undefined}
                            style={{
                              textAlign: "center",
                              verticalAlign: "middle",
                              fontWeight: 500,
                              cursor: isSelected ? "pointer" : "inherit",
                            }}
                          >
                            {cellVal === "||" ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  gap: 3,
                                  height: 34,
                                  alignItems: "stretch",
                                }}
                              >
                                <span style={{ width: 1.5, background: "#0f172a" }} />
                                <span style={{ width: 1.5, background: "#0f172a" }} />
                              </span>
                            ) : cellVal ? (
                              <KaTeXFormula latex={cellVal} />
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }

                // Variation row with nodes and monotonic arrows
                return (
                  <tr key={rowIdx} style={{ height: variationHeight }}>
                    <td
                      style={{
                        borderRight: "1px solid #475569",
                        textAlign: "center",
                        fontWeight: 600,
                        background: "#f8fafc",
                      }}
                    >
                      <KaTeXFormula latex={row.label} />
                    </td>
                    {Array.from({ length: totalCols }, (_, ci) => {
                      if (ci % 2 === 0) {
                        const idx = ci / 2;
                        const cell = row.cells[idx] ?? {
                          v: [{ latex: "", level: "mid" }],
                        };
                        return (
                          <td
                            key={ci}
                            style={{
                              position: "relative",
                              padding: 0,
                              verticalAlign: "middle",
                              height: variationHeight,
                            }}
                          >
                            {cell.bar && (
                              <div
                                style={{
                                  position: "absolute",
                                  left: "50%",
                                  top: 0,
                                  bottom: 0,
                                  transform: "translateX(-50%)",
                                  display: "flex",
                                  gap: 3,
                                }}
                              >
                                <div style={{ width: 1.5, background: "#0f172a" }} />
                                <div style={{ width: 1.5, background: "#0f172a" }} />
                              </div>
                            )}
                            <div
                              style={{
                                position: "relative",
                                width: "100%",
                                height: variationHeight,
                              }}
                            >
                              {cell.v.map((item: VarTableCellValue, si: number) => {
                                const topPct =
                                  item.level === "top"
                                    ? 14
                                    : item.level === "bottom"
                                      ? 84
                                      : 50;
                                const isDual = cell.v.length > 1;
                                const leftPct = isDual ? (si === 0 ? 26 : 74) : 50;
                                const isEd =
                                  editingSlot?.kind === "v" &&
                                  editingSlot.rowIdx === rowIdx &&
                                  editingSlot.idx === idx &&
                                  editingSlot.subIdx === si;
                                return (
                                  <div
                                    key={si}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSlot({
                                        kind: "v",
                                        rowIdx,
                                        idx,
                                        subIdx: si,
                                      });
                                      setDraft(item.latex);
                                    }}
                                    onClick={(e) => {
                                      if (isSelected && e.altKey) {
                                        e.stopPropagation();
                                        toggleNodeLevel(rowIdx, idx, si);
                                      }
                                    }}
                                    style={{
                                      position: "absolute",
                                      left: `${leftPct}%`,
                                      top: `${topPct}%`,
                                      transform: "translate(-50%, -50%)",
                                      background: "rgba(255,255,255,0.85)",
                                      padding: "0 2px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {isEd ? (
                                      <input
                                        autoFocus
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        onBlur={commitSlot}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                          e.stopPropagation();
                                          if (e.key === "Enter") commitSlot();
                                          if (e.key === "Escape") setEditingSlot(null);
                                        }}
                                        style={{
                                          width: 44,
                                          fontSize: 12,
                                          border: "1px solid #2563eb",
                                          borderRadius: 3,
                                          textAlign: "center",
                                        }}
                                      />
                                    ) : (
                                      <KaTeXFormula latex={item.latex || "\\cdot"} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      }

                      // Interval column -> SVG monotonic arrow between left cell and right cell
                      const leftIdx = (ci - 1) / 2;
                      const rightIdx = leftIdx + 1;
                      const leftCell = row.cells[leftIdx];
                      const rightCell = row.cells[rightIdx];
                      const leftVal = leftCell?.v[leftCell.v.length - 1];
                      const rightVal = rightCell?.v[0];
                      const y1 = levelToY(leftVal?.level ?? "mid");
                      const y2 = levelToY(rightVal?.level ?? "mid");
                      const arrowId = `vt-arrow-${element.id}-${rowIdx}-${ci}`;

                      return (
                        <td key={ci} style={{ padding: 0, height: variationHeight }}>
                          <svg
                            width={intervalColW}
                            height={variationHeight}
                            viewBox={`0 0 ${intervalColW} ${variationHeight}`}
                            style={{ display: "block" }}
                          >
                            <defs>
                              <marker
                                id={arrowId}
                                markerWidth="7"
                                markerHeight="7"
                                refX="5"
                                refY="3.5"
                                orient="auto"
                              >
                                <path d="M0,1 L6,3.5 L0,6 z" fill="#1e293b" />
                              </marker>
                            </defs>
                            <path
                              d={`M 6 ${y1} L ${intervalColW - 8} ${y2}`}
                              stroke="#1e293b"
                              strokeWidth={1.5}
                              fill="none"
                              markerEnd={`url(#${arrowId})`}
                            />
                          </svg>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};
