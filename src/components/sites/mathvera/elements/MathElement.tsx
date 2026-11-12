"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { CanvasElement } from "@/types/whiteboard";
import { KATEX_MACROS, normalizeLatexForKaTeX } from "../MathEditor";

export interface KaTeXFormulaProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable KaTeX HTML+MathML formula renderer (includes `.katex` + `<annotation encoding="application/x-tex">`).
 */
export const KaTeXFormula: React.FC<KaTeXFormulaProps> = ({
  latex,
  displayMode = false,
  className = "",
  style,
}) => {
  const html = useMemo(() => {
    const normalized = normalizeLatexForKaTeX(latex);
    if (!normalized) return "";
    try {
      return katex.renderToString(normalized, {
        displayMode,
        throwOnError: false,
        strict: false,
        output: "htmlAndMathml",
        macros: KATEX_MACROS,
      });
    } catch {
      return normalized;
    }
  }, [latex, displayMode]);

  return (
    <span
      data-wb-katex="true"
      data-latex={latex}
      className={`wb-katex ${className}`.trim()}
      style={{
        display: "inline-block",
        fontSize: "1em",
        lineHeight: 1.25,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export interface MathElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDoubleClick?: (element: CanvasElement) => void;
}

/**
 * SVG CanvasElement renderer for `MathText` using KaTeX inside a world-anchored `<foreignObject>`.
 * Double-click re-opens MathEditor at the element's position.
 */
export const MathElement: React.FC<MathElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
  onDoubleClick,
}) => {
  const latex = typeof element.props?.latex === "string" ? element.props.latex : "";
  const strokeColor = element.style?.stroke ?? "#0f172a";
  const elScale = element.transform.scale || 1;
  const invScale = elScale / (scale || 45);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({
    w: Math.max(140, latex.length * 12 + 32),
    h: 48,
  });

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const measure = () => {
      const w = Math.max(60, Math.ceil(node.scrollWidth) + 16);
      const h = Math.max(32, Math.ceil(node.scrollHeight) + 12);
      setBoxSize((prev) =>
        Math.abs(prev.w - w) > 2 || Math.abs(prev.h - h) > 2 ? { w, h } : prev
      );
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(node);
      return () => ro.disconnect();
    }
  }, [latex]);

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="MathText"
      data-mathtext="true"
      data-latex={latex}
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) rotate(${element.transform.rotation || 0}) scale(${invScale})`}
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(element);
      }}
      style={{ cursor: "pointer" }}
    >
      <foreignObject
        x={-4}
        y={-boxSize.h / 2}
        width={boxSize.w}
        height={boxSize.h}
        style={{ overflow: "visible" }}
      >
        <div
          ref={contentRef}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 8px",
            borderRadius: 6,
            border: isSelected ? "1.5px solid #f59e0b" : "1px solid transparent",
            background: isSelected ? "rgba(254, 243, 199, 0.35)" : "transparent",
            color: strokeColor,
            fontSize: 20,
            whiteSpace: "nowrap",
            userSelect: "none",
            pointerEvents: "auto",
          }}
        >
          <KaTeXFormula latex={latex || "\\square"} />
        </div>
      </foreignObject>
    </g>
  );
};

// ---------------------------------------------------------------------------
// TableElement (1x1 .. 8x8 structured cell grid)
// ---------------------------------------------------------------------------

export interface TableElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onUpdateCells?: (id: string, cells: string[][]) => void;
}

/**
 * Renders a `Table` element (`props.cells: string[][]`) with inline cell editing on double-click.
 */
export const TableElement: React.FC<TableElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
  onUpdateCells,
}) => {
  const rawCells = element.props?.cells;
  const cells: string[][] = useMemo(() => {
    if (!Array.isArray(rawCells) || rawCells.length === 0) {
      return [
        ["", ""],
        ["", ""],
      ];
    }
    return rawCells.map((row) =>
      Array.isArray(row) ? row.map((c) => String(c ?? "")) : [""]
    );
  }, [rawCells]);

  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState<string>("");

  const rows = cells.length;
  const cols = Math.max(1, ...cells.map((r) => r.length));
  const cellW = 84;
  const cellH = 34;
  const totalW = cols * cellW;
  const totalH = rows * cellH;
  const invScale = (element.transform.scale || 1) / (scale || 45);
  const strokeColor = element.style?.stroke ?? "#334155";

  const commitCell = (r: number, c: number) => {
    const next = cells.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? draft : val))
    );
    setEditingCell(null);
    onUpdateCells?.(element.id, next);
  };

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Table"
      data-wb-type="Table"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <foreignObject
        x={0}
        y={0}
        width={totalW + 8}
        height={totalH + 8}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            display: "inline-block",
            background: "#ffffff",
            border: isSelected ? "2px solid #f59e0b" : `1.5px solid ${strokeColor}`,
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
          }}
        >
          <table
            style={{
              borderCollapse: "collapse",
              tableLayout: "fixed",
              width: totalW,
            }}
          >
            <tbody>
              {cells.map((row, ri) => (
                <tr key={ri}>
                  {Array.from({ length: cols }, (_, ci) => {
                    const val = row[ci] ?? "";
                    const isEditing =
                      editingCell?.r === ri && editingCell?.c === ci;
                    const looksLikeMath =
                      val.includes("\\") || val.includes("^") || val.includes("_");
                    return (
                      <td
                        key={ci}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingCell({ r: ri, c: ci });
                          setDraft(val);
                        }}
                        style={{
                          width: cellW,
                          height: cellH,
                          border: "1px solid #cbd5e1",
                          padding: "2px 6px",
                          fontSize: 13,
                          color: "#0f172a",
                          textAlign: "center",
                          verticalAlign: "middle",
                          background: ri === 0 ? "#f8fafc" : "#ffffff",
                        }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => commitCell(ri, ci)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") commitCell(ri, ci);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            style={{
                              width: "100%",
                              border: "1px solid #2563eb",
                              borderRadius: 3,
                              padding: "1px 4px",
                              fontSize: 12,
                              outline: "none",
                            }}
                          />
                        ) : looksLikeMath ? (
                          <KaTeXFormula latex={val} />
                        ) : (
                          <span>{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </foreignObject>
    </g>
  );
};

// ---------------------------------------------------------------------------
// ImageElement
// ---------------------------------------------------------------------------

export interface ImageElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

/**
 * Renders an embedded raster/SVG `Image` element in world coordinates.
 */
export const ImageElement: React.FC<ImageElementProps> = ({
  element,
  isSelected = false,
  onPointerDown,
}) => {
  const src = typeof element.props?.src === "string" ? element.props.src : "";
  const w =
    (typeof element.props?.w === "number" && element.props.w > 0
      ? element.props.w
      : 6) * (element.transform.scale || 1);
  const h =
    (typeof element.props?.h === "number" && element.props.h > 0
      ? element.props.h
      : 4) * (element.transform.scale || 1);

  if (!src) return null;

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Image"
      data-wb-type="Image"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) rotate(${element.transform.rotation || 0})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <image
        href={src}
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
      />
      {isSelected && (
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
    </g>
  );
};
