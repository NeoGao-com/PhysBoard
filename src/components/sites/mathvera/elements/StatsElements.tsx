"use client";

import React, { useMemo, useState } from "react";
import { CanvasElement } from "@/types/whiteboard";
import {
  arrangementCount,
  combinationCount,
  computeDescriptiveStats,
  computeGroupedStats,
  enumerateCountingOutcomes,
  parseNumberLineSet,
  permutationCount,
} from "@/lib/math-eval";
import { KaTeXFormula } from "./MathElement";

const PIE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#65a30d",
  "#ea580c",
  "#64748b",
];

// ---------------------------------------------------------------------------
// 1. ChartElement (bar, line, pie, histogram, box + descriptive stats)
// ---------------------------------------------------------------------------

export interface ChartElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const ChartElement: React.FC<ChartElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
}) => {
  const kind = (element.props?.kind as string) ?? "bar";
  const title = typeof element.props?.title === "string" ? element.props.title : "";
  const showStats = Boolean(element.props?.showStats);
  const rawData = useMemo(
    () =>
      (element.props?.data as Record<string, unknown> | undefined) ?? {
        kind: "categories",
        labels: ["A", "B", "C", "D"],
        values: [5, 8, 3, 6],
      },
    [element.props?.data]
  );

  const { labels, values, stats } = useMemo(() => {
    const dataKind = rawData.kind;
    if (dataKind === "grouped") {
      const edges = Array.isArray(rawData.edges)
        ? rawData.edges.map(Number).filter(Number.isFinite)
        : [0, 10, 20, 30];
      const counts = Array.isArray(rawData.counts)
        ? rawData.counts.map(Number).filter(Number.isFinite)
        : [3, 7, 4];
      const lbls = counts.map((_, i) =>
        i + 1 < edges.length ? `[${edges[i]};${edges[i + 1]})` : String(i + 1)
      );
      return {
        labels: lbls,
        values: counts,
        stats: computeGroupedStats(edges, counts),
      };
    }
    if (dataKind === "sample") {
      const vals = Array.isArray(rawData.values)
        ? rawData.values.map(Number).filter(Number.isFinite)
        : [4, 6, 7, 7, 8, 10, 12];
      return {
        labels: vals.map((v, i) => `#${i + 1}(${v})`),
        values: vals,
        stats: computeDescriptiveStats(vals),
      };
    }
    const lbls = Array.isArray(rawData.labels)
      ? rawData.labels.map(String)
      : ["A", "B", "C", "D"];
    const vals = Array.isArray(rawData.values)
      ? rawData.values.map(Number).map((v) => (Number.isFinite(v) ? v : 0))
      : [5, 8, 3, 6];
    return {
      labels: lbls,
      values: vals,
      stats: computeDescriptiveStats(vals),
    };
  }, [rawData]);

  const widthPx = 340;
  const heightPx = showStats ? 280 : 210;
  const plotLeft = 40;
  const plotRight = 320;
  const plotTop = title ? 36 : 20;
  const plotBottom = 175;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;
  const invScale = (element.transform.scale || 1) / (scale || 45);
  const maxVal = Math.max(1, ...values.map((v) => Math.abs(v)));

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Chart"
      data-wb-type="Chart"
      className="wb-chart"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <foreignObject x={0} y={0} width={widthPx} height={heightPx} style={{ overflow: "visible" }}>
        <div
          style={{
            width: widthPx,
            background: "#ffffff",
            border: `1.5px solid ${isSelected ? "#f59e0b" : "#cbd5e1"}`,
            borderRadius: 10,
            boxShadow: "0 2px 10px rgba(15,23,42,0.08)",
            padding: 6,
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "auto",
          }}
        >
          <svg width={widthPx - 12} height={195} viewBox={`0 0 ${widthPx} 195`}>
            {title && (
              <text
                x={widthPx / 2}
                y={18}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill="#0f172a"
              >
                {title}
              </text>
            )}

            {kind === "pie" ? (
              (() => {
                const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 1;
                const cx = 110;
                const cy = 102;
                const r = 68;
                let angle = -Math.PI / 2;
                return (
                  <g>
                    {values.map((v, idx) => {
                      const slice = (Math.max(0, v) / total) * Math.PI * 2;
                      const a0 = angle;
                      const a1 = angle + slice;
                      angle = a1;
                      const x0 = cx + r * Math.cos(a0);
                      const y0 = cy + r * Math.sin(a0);
                      const x1 = cx + r * Math.cos(a1);
                      const y1 = cy + r * Math.sin(a1);
                      const large = slice > Math.PI ? 1 : 0;
                      const d =
                        slice >= Math.PI * 1.999
                          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
                          : `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
                      return (
                        <path
                          key={idx}
                          d={d}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      );
                    })}
                    {labels.map((lbl, idx) => (
                      <g key={idx} transform={`translate(200, ${38 + idx * 18})`}>
                        <rect
                          x={0}
                          y={-9}
                          width={10}
                          height={10}
                          rx={2}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                        <text x={15} y={0} fontSize={11} fill="#334155">
                          {lbl}: {values[idx]}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()
            ) : kind === "box" ? (
              (() => {
                const span = Math.max(1e-6, stats.max - stats.min);
                const mapX = (v: number) => plotLeft + ((v - stats.min) / span) * plotW;
                const yMid = (plotTop + plotBottom) / 2;
                const boxH = 38;
                const xMin = mapX(stats.min);
                const xQ1 = mapX(stats.q1);
                const xMed = mapX(stats.median);
                const xQ3 = mapX(stats.q3);
                const xMax = mapX(stats.max);
                return (
                  <g>
                    <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#64748b" />
                    <line x1={xMin} y1={yMid} x2={xQ1} y2={yMid} stroke="#1d4ed8" strokeWidth={2} />
                    <line x1={xQ3} y1={yMid} x2={xMax} y2={yMid} stroke="#1d4ed8" strokeWidth={2} />
                    <line x1={xMin} y1={yMid - 12} x2={xMin} y2={yMid + 12} stroke="#1d4ed8" strokeWidth={2} />
                    <line x1={xMax} y1={yMid - 12} x2={xMax} y2={yMid + 12} stroke="#1d4ed8" strokeWidth={2} />
                    <rect
                      x={xQ1}
                      y={yMid - boxH / 2}
                      width={Math.max(2, xQ3 - xQ1)}
                      height={boxH}
                      fill="#93c5fd"
                      fillOpacity={0.5}
                      stroke="#1d4ed8"
                      strokeWidth={2}
                    />
                    <line
                      x1={xMed}
                      y1={yMid - boxH / 2}
                      x2={xMed}
                      y2={yMid + boxH / 2}
                      stroke="#dc2626"
                      strokeWidth={2.5}
                    />
                    {[
                      { x: xMin, lbl: `Min ${stats.min.toFixed(1)}` },
                      { x: xQ1, lbl: `Q1 ${stats.q1.toFixed(1)}` },
                      { x: xMed, lbl: `Q2 ${stats.median.toFixed(1)}` },
                      { x: xQ3, lbl: `Q3 ${stats.q3.toFixed(1)}` },
                      { x: xMax, lbl: `Max ${stats.max.toFixed(1)}` },
                    ].map((t, i) => (
                      <text key={i} x={t.x} y={plotBottom + 14} fontSize={9.5} textAnchor="middle" fill="#475569">
                        {t.lbl}
                      </text>
                    ))}
                  </g>
                );
              })()
            ) : (
              <g>
                {/* Axes */}
                <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#475569" />
                <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#475569" />
                {[0.25, 0.5, 0.75, 1].map((f) => {
                  const y = plotBottom - f * plotH;
                  return (
                    <g key={f}>
                      <line
                        x1={plotLeft}
                        y1={y}
                        x2={plotRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />
                      <text x={plotLeft - 4} y={y + 3} fontSize={9.5} textAnchor="end" fill="#64748b">
                        {(maxVal * f).toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {kind === "line" ? (
                  <>
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={2.2}
                      points={values
                        .map((v, i) => {
                          const x =
                            plotLeft +
                            ((i + 0.5) * plotW) / Math.max(1, values.length);
                          const y = plotBottom - (Math.max(0, v) / maxVal) * plotH;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                    {values.map((v, i) => {
                      const x =
                        plotLeft +
                        ((i + 0.5) * plotW) / Math.max(1, values.length);
                      const y = plotBottom - (Math.max(0, v) / maxVal) * plotH;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r={4} fill="#1d4ed8" stroke="#fff" strokeWidth={1.5} />
                          <text x={x} y={plotBottom + 14} fontSize={10} textAnchor="middle" fill="#334155">
                            {labels[i] ?? ""}
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  values.map((v, i) => {
                    const count = Math.max(1, values.length);
                    const slotW = plotW / count;
                    const barW = kind === "histogram" ? slotW - 1 : Math.min(36, slotW * 0.65);
                    const x = plotLeft + i * slotW + (slotW - barW) / 2;
                    const h = (Math.max(0, v) / maxVal) * plotH;
                    const y = plotBottom - h;
                    return (
                      <g key={i}>
                        <rect
                          x={x}
                          y={y}
                          width={barW}
                          height={h}
                          rx={kind === "histogram" ? 0 : 3}
                          fill={i % 2 === 0 ? "#60a5fa" : "#2563eb"}
                          stroke="#1d4ed8"
                          strokeWidth={1}
                        />
                        <text
                          x={x + barW / 2}
                          y={y - 4}
                          fontSize={10}
                          textAnchor="middle"
                          fill="#1e3a8a"
                          fontWeight={600}
                        >
                          {v}
                        </text>
                        <text
                          x={x + barW / 2}
                          y={plotBottom + 14}
                          fontSize={10}
                          textAnchor="middle"
                          fill="#334155"
                        >
                          {labels[i] ?? ""}
                        </text>
                      </g>
                    );
                  })
                )}
              </g>
            )}
          </svg>

          {showStats && (
            <div
              style={{
                borderTop: "1px solid #e2e8f0",
                padding: "6px 8px",
                fontSize: 11.5,
                color: "#334155",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "3px 10px",
              }}
            >
              <span>TB (x̄): <strong>{stats.mean.toFixed(2)}</strong></span>
              <span>Trung vị (Me): <strong>{stats.median.toFixed(2)}</strong></span>
              <span>Q₁ / Q₃: <strong>{stats.q1.toFixed(2)} / {stats.q3.toFixed(2)}</strong></span>
              <span>Phương sai (s²): <strong>{stats.variance.toFixed(2)}</strong></span>
              <span>Độ lệch chuẩn (s): <strong>{stats.stdDev.toFixed(2)}</strong></span>
              <span>Min / Max: <strong>{stats.min} / {stats.max}</strong></span>
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

// ---------------------------------------------------------------------------
// 2. TreeDiagramElement (Bayes / Probability Tree)
// ---------------------------------------------------------------------------

export interface TreeNode {
  label: string;
  p?: string;
  children?: TreeNode[];
}

interface PositionedTreeNode {
  node: TreeNode;
  x: number;
  y: number;
  children: PositionedTreeNode[];
}

function layoutTree(node: TreeNode, depth = 0, leafCounter = { idx: 0 }): PositionedTreeNode {
  const x = depth * 125 + 32;
  const children = node.children ?? [];
  if (children.length === 0) {
    const y = leafCounter.idx * 52 + 32;
    leafCounter.idx += 1;
    return { node, x, y, children: [] };
  }
  const laidOut = children.map((c) => layoutTree(c, depth + 1, leafCounter));
  const y = (laidOut[0].y + laidOut[laidOut.length - 1].y) / 2;
  return { node, x, y, children: laidOut };
}

export interface TreeDiagramElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const TreeDiagramElement: React.FC<TreeDiagramElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
}) => {
  const root: TreeNode = useMemo(
    () =>
      (element.props?.root as TreeNode | undefined) ?? {
        label: "Ω",
        children: [
          { label: "A", p: "0,6", children: [{ label: "B", p: "0,7" }, { label: "B̄", p: "0,3" }] },
          { label: "Ā", p: "0,4", children: [{ label: "B", p: "0,2" }, { label: "B̄", p: "0,8" }] },
        ],
      },
    [element.props?.root]
  );

  const laid = useMemo(() => layoutTree(root), [root]);
  const invScale = (element.transform.scale || 1) / (scale || 45);

  const edges: Array<{ from: PositionedTreeNode; to: PositionedTreeNode }> = [];
  const nodes: PositionedTreeNode[] = [];
  const walk = (pt: PositionedTreeNode) => {
    nodes.push(pt);
    for (const c of pt.children) {
      edges.push({ from: pt, to: c });
      walk(c);
    }
  };
  walk(laid);

  const maxX = Math.max(260, ...nodes.map((n) => n.x + 80));
  const maxY = Math.max(160, ...nodes.map((n) => n.y + 40));

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="TreeDiagram"
      data-wb-type="TreeDiagram"
      className="wb-tree-diagram"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <foreignObject x={0} y={0} width={maxX} height={maxY} style={{ overflow: "visible" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.96)",
            border: `1.5px solid ${isSelected ? "#f59e0b" : "#cbd5e1"}`,
            borderRadius: 10,
            padding: 4,
            boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            pointerEvents: "auto",
          }}
        >
          <svg width={maxX - 8} height={maxY - 8} viewBox={`0 0 ${maxX} ${maxY}`}>
            {edges.map((ed, idx) => {
              const mx = (ed.from.x + ed.to.x) / 2;
              const my = (ed.from.y + ed.to.y) / 2 - 8;
              return (
                <g key={idx}>
                  <path
                    d={`M ${ed.from.x} ${ed.from.y} C ${mx} ${ed.from.y}, ${mx} ${ed.to.y}, ${ed.to.x} ${ed.to.y}`}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={1.6}
                  />
                  {ed.to.node.p && (
                    <text
                      x={mx}
                      y={my}
                      fontSize={12}
                      textAnchor="middle"
                      fill="#1565C0"
                      fontWeight={600}
                    >
                      {ed.to.node.p}
                    </text>
                  )}
                </g>
              );
            })}
            {nodes.map((n, idx) => (
              <g key={idx} transform={`translate(${n.x}, ${n.y})`}>
                <rect
                  x={-18}
                  y={-13}
                  width={36}
                  height={26}
                  rx={6}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth={1.4}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fontSize={12.5}
                  fontWeight={600}
                  fill="#0f172a"
                >
                  {n.node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </foreignObject>
    </g>
  );
};

// ---------------------------------------------------------------------------
// 3. VennElement (2 or 3 Sets + Interactive Region Shading + Split View)
// ---------------------------------------------------------------------------

export interface VennElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
}

export const VennElement: React.FC<VennElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
}) => {
  const labels: string[] = Array.isArray(element.props?.labels)
    ? element.props.labels.map(String)
    : ["A", "B"];
  const universe =
    typeof element.props?.universe === "string" ? element.props.universe : "U";
  const shade: string[] = Array.isArray(element.props?.shade)
    ? element.props.shade.map(String)
    : [];
  const texts = (element.props?.texts as Record<string, string> | undefined) ?? {};
  const split = Boolean(element.props?.split);

  const isThree = labels.length >= 3;
  const invScale = (element.transform.scale || 1) / (scale || 45);

  const toggleRegionShade = (key: string) => {
    const exists = shade.includes(key);
    const next = exists ? shade.filter((s) => s !== key) : [...shade, key];
    onUpdateProps?.(element.id, { shade: next });
  };

  const regionButtons = isThree
    ? ["A", "B", "C", "AB", "AC", "BC", "ABC"]
    : ["A", "B", "AB"];

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Venn"
      data-wb-type="Venn"
      className="wb-venn"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <foreignObject x={0} y={0} width={330} height={isSelected ? 265 : 225} style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: `1.5px solid ${isSelected ? "#f59e0b" : "#cbd5e1"}`,
            borderRadius: 10,
            padding: 8,
            boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "auto",
          }}
        >
          <svg width={310} height={205} viewBox="0 0 310 205">
            <rect
              x={6}
              y={6}
              width={298}
              height={193}
              rx={8}
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth={1.2}
            />
            <text x={16} y={24} fontSize={13} fontWeight={700} fill="#475569">
              {universe}
            </text>

            {isThree ? (
              <>
                <circle
                  cx={split ? 105 : 122}
                  cy={split ? 76 : 86}
                  r={56}
                  fill={shade.includes("A") ? "rgba(37,99,235,0.28)" : "rgba(37,99,235,0.08)"}
                  stroke="#2563eb"
                  strokeWidth={1.8}
                  onClick={() => toggleRegionShade("A")}
                />
                <circle
                  cx={split ? 205 : 188}
                  cy={split ? 76 : 86}
                  r={56}
                  fill={shade.includes("B") ? "rgba(220,38,38,0.28)" : "rgba(220,38,38,0.08)"}
                  stroke="#dc2626"
                  strokeWidth={1.8}
                  onClick={() => toggleRegionShade("B")}
                />
                <circle
                  cx={155}
                  cy={split ? 142 : 132}
                  r={56}
                  fill={shade.includes("C") ? "rgba(22,163,74,0.28)" : "rgba(22,163,74,0.08)"}
                  stroke="#16a34a"
                  strokeWidth={1.8}
                  onClick={() => toggleRegionShade("C")}
                />
                <text x={82} y={56} fontSize={14} fontWeight={700} fill="#1d4ed8">{labels[0]}</text>
                <text x={222} y={56} fontSize={14} fontWeight={700} fill="#dc2626">{labels[1]}</text>
                <text x={155} y={175} fontSize={14} fontWeight={700} textAnchor="middle" fill="#16a34a">{labels[2]}</text>
              </>
            ) : (
              <>
                <circle
                  cx={split ? 100 : 120}
                  cy={104}
                  r={64}
                  fill={shade.includes("A") ? "rgba(37,99,235,0.28)" : "rgba(37,99,235,0.08)"}
                  stroke="#2563eb"
                  strokeWidth={1.8}
                  onClick={() => toggleRegionShade("A")}
                />
                <circle
                  cx={split ? 210 : 190}
                  cy={104}
                  r={64}
                  fill={shade.includes("B") ? "rgba(220,38,38,0.28)" : "rgba(220,38,38,0.08)"}
                  stroke="#dc2626"
                  strokeWidth={1.8}
                  onClick={() => toggleRegionShade("B")}
                />
                <text x={78} y={56} fontSize={14} fontWeight={700} fill="#1d4ed8">{labels[0]}</text>
                <text x={225} y={56} fontSize={14} fontWeight={700} fill="#dc2626">{labels[1]}</text>
                {shade.includes("AB") && !split && (
                  <ellipse
                    cx={155}
                    cy={104}
                    rx={26}
                    ry={54}
                    fill="rgba(124, 58, 237, 0.35)"
                    pointerEvents="none"
                  />
                )}
              </>
            )}

            {/* Region texts */}
            {Object.entries(texts).map(([reg, txt]) => {
              const pos =
                reg === "A"
                  ? { x: 90, y: 108 }
                  : reg === "B"
                    ? { x: 220, y: 108 }
                    : reg === "AB"
                      ? { x: 155, y: 104 }
                      : { x: 155, y: 145 };
              return (
                <text key={reg} x={pos.x} y={pos.y} fontSize={12} textAnchor="middle" fill="#0f172a">
                  {txt}
                </text>
              );
            })}
          </svg>

          {isSelected && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
                flexWrap: "wrap",
                fontSize: 11.5,
              }}
            >
              <button
                type="button"
                onClick={() => onUpdateProps?.(element.id, { labels: ["A", "B"] })}
                style={{
                  padding: "2px 7px",
                  borderRadius: 5,
                  border: "1px solid #cbd5e1",
                  background: !isThree ? "#e8f0fe" : "#fff",
                  cursor: "pointer",
                }}
              >
                2 tập
              </button>
              <button
                type="button"
                onClick={() => onUpdateProps?.(element.id, { labels: ["A", "B", "C"] })}
                style={{
                  padding: "2px 7px",
                  borderRadius: 5,
                  border: "1px solid #cbd5e1",
                  background: isThree ? "#e8f0fe" : "#fff",
                  cursor: "pointer",
                }}
              >
                3 tập
              </button>
              <button
                type="button"
                data-venn-split="true"
                onClick={() => onUpdateProps?.(element.id, { split: !split })}
                style={{
                  padding: "2px 7px",
                  borderRadius: 5,
                  border: "1px solid #cbd5e1",
                  background: split ? "#e8f0fe" : "#fff",
                  cursor: "pointer",
                }}
              >
                {split ? "⤺ Ghép lại" : "✂ Tách vùng"}
              </button>
              {regionButtons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRegionShade(r)}
                  style={{
                    padding: "1px 5px",
                    borderRadius: 4,
                    border: "1px solid #cbd5e1",
                    background: shade.includes(r) ? "#dbeafe" : "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

// ---------------------------------------------------------------------------
// 4. CountingElement (Hoán vị / Chỉnh hợp / Tổ hợp)
// ---------------------------------------------------------------------------

export interface CountingElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
  onConvertToTree?: (root: TreeNode, at: { x: number; y: number }) => void;
}

export const CountingElement: React.FC<CountingElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
  onConvertToTree,
}) => {
  const kind = (element.props?.kind as "perm" | "arr" | "comb") ?? "comb";
  const rawItems = element.props?.items;
  const items = useMemo(
    () =>
      Array.isArray(rawItems)
        ? rawItems.map(String)
        : ["A", "B", "C", "D"],
    [rawItems]
  );
  const n = items.length;
  const k = kind === "perm" ? n : Math.min(n, Math.max(1, Number(element.props?.k ?? 2)));
  const showList = Boolean(element.props?.list);
  const pick = Array.isArray(element.props?.pick)
    ? (element.props.pick as number[])
    : [];

  const total =
    kind === "perm"
      ? permutationCount(n)
      : kind === "arr"
        ? arrangementCount(n, k)
        : combinationCount(n, k);

  const formulaLatex =
    kind === "perm"
      ? `P_{${n}} = ${n}! = ${total}`
      : kind === "arr"
        ? `A_{${n}}^{${k}} = \\frac{${n}!}{(${n}-${k})!} = ${total}`
        : `C_{${n}}^{${k}} = \\binom{${n}}{${k}} = ${total}`;

  const enumerated = useMemo(() => {
    if (!showList) return null;
    return enumerateCountingOutcomes(kind, items, k, 60);
  }, [showList, kind, items, k]);

  const invScale = (element.transform.scale || 1) / (scale || 45);
  const title =
    kind === "perm" ? "Hoán vị" : kind === "arr" ? "Chỉnh hợp" : "Tổ hợp";

  const handleTogglePick = (idx: number) => {
    if (pick.includes(idx)) {
      onUpdateProps?.(element.id, { pick: pick.filter((i) => i !== idx) });
    } else if (pick.length < k) {
      onUpdateProps?.(element.id, { pick: [...pick, idx] });
    }
  };

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Counting"
      data-wb-type="Counting"
      className="wb-counting"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <foreignObject
        x={0}
        y={0}
        width={340}
        height={showList ? 250 : 155}
        style={{ overflow: "visible" }}
      >
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            border: `1.5px solid ${isSelected ? "#f59e0b" : "#cbd5e1"}`,
            borderRadius: 10,
            padding: 10,
            boxShadow: "0 2px 10px rgba(15,23,42,0.08)",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <strong style={{ fontSize: 13, color: "#1e293b" }}>{title}</strong>
            <KaTeXFormula latex={formulaLatex} />
          </div>

          {/* Item cards */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {items.map((item, idx) => {
              const selectedCard = pick.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTogglePick(idx)}
                  style={{
                    minWidth: 32,
                    height: 30,
                    borderRadius: 6,
                    border: selectedCard ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                    background: selectedCard ? "#dbeafe" : "#f8fafc",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
            {kind !== "perm" && (
              <>
                <span>k = {k}</span>
                <button
                  type="button"
                  onClick={() => onUpdateProps?.(element.id, { k: Math.max(1, k - 1) })}
                  style={{ padding: "1px 6px", border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer" }}
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateProps?.(element.id, { k: Math.min(n, k + 1) })}
                  style={{ padding: "1px 6px", border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer" }}
                >
                  +
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onUpdateProps?.(element.id, { list: !showList })}
              style={{
                padding: "2px 8px",
                borderRadius: 5,
                border: "1px solid #cbd5e1",
                background: showList ? "#e8f0fe" : "#f8fafc",
                cursor: "pointer",
              }}
            >
              {showList ? "Ẩn danh sách" : "☰ Liệt kê hết"}
            </button>
            {onConvertToTree && total <= 24 && (
              <button
                type="button"
                onClick={() => {
                  const build = (pool: string[], depth: number): TreeNode[] => {
                    if (depth >= k) return [];
                    return pool.map((it, idx) => ({
                      label: it,
                      children: build(
                        kind === "comb" ? pool.slice(idx + 1) : pool.filter((_, j) => j !== idx),
                        depth + 1
                      ),
                    }));
                  };
                  onConvertToTree(
                    { label: "Bắt đầu", children: build(items, 0) },
                    { x: element.transform.x + 8, y: element.transform.y }
                  );
                }}
                style={{
                  padding: "2px 8px",
                  borderRadius: 5,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                }}
              >
                🌳 Sơ đồ cây
              </button>
            )}
          </div>

          {showList && enumerated && (
            <div
              style={{
                maxHeight: 85,
                overflowY: "auto",
                fontSize: 11.5,
                background: "#f8fafc",
                padding: 6,
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
            >
              {enumerated.outcomes.map((o) => `(${o.join(", ")})`).join(" · ")}
              {enumerated.truncated && ` … (${enumerated.total} kết quả)`}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

// ---------------------------------------------------------------------------
// 5. NumberLineElement (Trục số - biểu diễn tập hợp)
// ---------------------------------------------------------------------------

export interface NumberLineElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const NumberLineElement: React.FC<NumberLineElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
}) => {
  const setExpr =
    typeof element.props?.set === "string"
      ? element.props.set
      : "[-2; 3) \\cup (5; +\\infty)";

  const parsed = useMemo(() => parseNumberLineSet(setExpr), [setExpr]);
  const invScale = (element.transform.scale || 1) / (scale || 45);
  const W = 380;
  const H = 88;
  const xStart = 24;
  const xEnd = 356;
  const yAxis = 46;

  // Determine numeric display range
  const finiteNums =
    "error" in parsed
      ? [-5, 5]
      : [
          ...parsed.points,
          ...parsed.intervals.flatMap((iv) => [
            Number.isFinite(iv.lo) ? iv.lo : 0,
            Number.isFinite(iv.hi) ? iv.hi : 0,
          ]),
        ];
  const loBound = Math.min(-4, ...finiteNums) - 1.5;
  const hiBound = Math.max(4, ...finiteNums) + 1.5;
  const mapX = (v: number) => {
    if (v === -Infinity) return xStart;
    if (v === Infinity) return xEnd;
    return xStart + ((v - loBound) / (hiBound - loBound)) * (xEnd - xStart);
  };

  const hatchId = `nl-hatch-${element.id}`;

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="NumberLine"
      data-wb-type="NumberLine"
      className="wb-number-line"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <foreignObject x={0} y={0} width={W} height={H} style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: `1.5px solid ${isSelected ? "#f59e0b" : "#cbd5e1"}`,
            borderRadius: 10,
            padding: "4px 6px",
            boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: 12, textAlign: "center", color: "#334155" }}>
            <KaTeXFormula latex={setExpr} />
          </div>
          <svg width={W - 12} height={58} viewBox={`0 0 ${W} 58`}>
            <defs>
              <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="1.2" />
              </pattern>
            </defs>

            {/* Base hatched complement strip */}
            <rect x={xStart} y={24} width={xEnd - xStart} height={14} fill={`url(#${hatchId})`} opacity={0.5} />

            {/* Axis line */}
            <line x1={xStart - 6} y1={31} x2={xEnd + 6} y2={31} stroke="#0f172a" strokeWidth={1.6} />
            <polygon points={`${xEnd + 10},31 ${xEnd + 2},27 ${xEnd + 2},35`} fill="#0f172a" />

            {/* 0 tick */}
            <line x1={mapX(0)} y1={27} x2={mapX(0)} y2={35} stroke="#475569" strokeWidth={1.2} />
            <text x={mapX(0)} y={50} fontSize={11} textAnchor="middle" fill="#64748b">0</text>

            {!("error" in parsed) &&
              parsed.intervals.map((iv, idx) => {
                const pxLo = mapX(iv.lo);
                const pxHi = mapX(iv.hi);
                return (
                  <g key={idx}>
                    {/* Clear hatch inside included interval */}
                    <rect x={pxLo} y={24} width={Math.max(0, pxHi - pxLo)} height={14} fill="#ffffff" />
                    <line x1={pxLo} y1={31} x2={pxHi} y2={31} stroke="#2563eb" strokeWidth={3.5} />
                    {Number.isFinite(iv.lo) && (
                      <>
                        <text
                          x={pxLo}
                          y={35}
                          fontSize={16}
                          fontWeight={700}
                          textAnchor="middle"
                          fill="#2563eb"
                        >
                          {iv.loOpen ? "(" : "["}
                        </text>
                        <text x={pxLo} y={50} fontSize={11} textAnchor="middle" fill="#0f172a">
                          {iv.lo}
                        </text>
                      </>
                    )}
                    {Number.isFinite(iv.hi) && (
                      <>
                        <text
                          x={pxHi}
                          y={35}
                          fontSize={16}
                          fontWeight={700}
                          textAnchor="middle"
                          fill="#2563eb"
                        >
                          {iv.hiOpen ? ")" : "]"}
                        </text>
                        <text x={pxHi} y={50} fontSize={11} textAnchor="middle" fill="#0f172a">
                          {iv.hi}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

            {!("error" in parsed) &&
              parsed.points.map((pt, idx) => {
                const px = mapX(pt);
                return (
                  <g key={`pt-${idx}`}>
                    <circle cx={px} cy={31} r={4.5} fill="#2563eb" stroke="#fff" strokeWidth={1.2} />
                    <text x={px} y={50} fontSize={11} textAnchor="middle" fill="#0f172a">
                      {pt}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>
      </foreignObject>
      {/* Keep unused reference silent */}
      <title>{`Trục số: ${setExpr} (${yAxis})`}</title>
    </g>
  );
};

// ---------------------------------------------------------------------------
// 6. NetworkElement (Graph Theory Vertices & Edges)
// ---------------------------------------------------------------------------

export interface NetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface NetworkEdge {
  a: string;
  b: string;
  label?: string;
}

export interface NetworkElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
}

export const NetworkElement: React.FC<NetworkElementProps> = ({
  element,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
}) => {
  const nodes: NetworkNode[] = useMemo(() => {
    const raw = element.props?.nodes;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as NetworkNode[];
    }
    return [
      { id: "1", label: "A", x: -1.8, y: 1.2 },
      { id: "2", label: "B", x: 1.8, y: 1.2 },
      { id: "3", label: "C", x: 1.8, y: -1.2 },
      { id: "4", label: "D", x: -1.8, y: -1.2 },
    ];
  }, [element.props?.nodes]);

  const edges: NetworkEdge[] = useMemo(() => {
    const raw = element.props?.edges;
    if (Array.isArray(raw)) return raw as NetworkEdge[];
    return [
      { a: "1", b: "2", label: "3" },
      { a: "2", b: "3", label: "5" },
      { a: "3", b: "4", label: "2" },
      { a: "4", b: "1", label: "4" },
      { a: "1", b: "3", label: "6" },
    ];
  }, [element.props?.edges]);

  const directed = Boolean(element.props?.directed);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const arrowId = `net-arrow-${element.id}`;

  const handleNodeDown = (e: React.PointerEvent<SVGCircleElement>, node: NetworkNode) => {
    if (!isSelected) return;
    e.stopPropagation();
    setDraggingNodeId(node.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = node.x;
    const origY = node.y;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / 45;
      const dy = -(ev.clientY - startY) / 45;
      const nextNodes = nodes.map((n) =>
        n.id === node.id ? { ...n, x: origX + dx, y: origY + dy } : n
      );
      onUpdateProps?.(element.id, { nodes: nextNodes });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDraggingNodeId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Network"
      data-wb-type="Network"
      data-wb-network="true"
      className="wb-network"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${element.transform.scale || 1})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <defs>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="8"
          refX="14"
          refY="4"
          orient="auto"
        >
          <path d="M0,1 L7,4 L0,7 z" fill="#334155" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((ed, idx) => {
        const na = nodeMap.get(ed.a);
        const nb = nodeMap.get(ed.b);
        if (!na || !nb) return null;

        if (ed.a === ed.b) {
          return (
            <circle
              key={`e-${idx}`}
              cx={na.x + 0.4}
              cy={-na.y - 0.4}
              r={0.4}
              fill="none"
              stroke="#334155"
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        const mx = (na.x + nb.x) / 2;
        const my = -(na.y + nb.y) / 2;

        return (
          <g key={`e-${idx}`}>
            <line
              x1={na.x}
              y1={-na.y}
              x2={nb.x}
              y2={-nb.y}
              stroke="#334155"
              strokeWidth={1.7}
              markerEnd={directed ? `url(#${arrowId})` : undefined}
              vectorEffect="non-scaling-stroke"
            />
            {ed.label && (
              <g transform={`translate(${mx}, ${my})`}>
                <circle cx={0} cy={0} r={0.18} fill="#ffffff" />
                <text
                  x={0}
                  y={0.07}
                  fontSize={0.24}
                  fontWeight={600}
                  textAnchor="middle"
                  fill="#1565C0"
                >
                  {ed.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Vertices */}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={-n.y}
            r={0.28}
            fill={draggingNodeId === n.id ? "#dbeafe" : "#ffffff"}
            stroke={isSelected ? "#f59e0b" : "#2563eb"}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            onPointerDown={(e) => handleNodeDown(e, n)}
          />
          <text
            x={n.x}
            y={-n.y + 0.09}
            fontSize={0.26}
            fontWeight={700}
            textAnchor="middle"
            fill="#0f172a"
            pointerEvents="none"
          >
            {n.label}
          </text>
        </g>
      ))}
    </g>
  );
};
