"use client";

import React, { useMemo, useState } from "react";
import {
  ELEMENT_CATEGORY_META,
  ElementCategory,
  PERIODIC_ELEMENTS,
  PeriodicElement,
} from "@/lib/periodic-table";
import { normalizeVietnameseQuery } from "@/lib/physics-formulas";
import { KaTeXFormula } from "./elements/MathElement";

export interface PeriodicTablePanelProps {
  onInsertFormulaLatex: (latex: string) => void;
}

export const PeriodicTablePanel: React.FC<PeriodicTablePanelProps> = ({
  onInsertFormulaLatex,
}) => {
  const [selectedZ, setSelectedZ] = useState<number>(26); // Default: Fe (Sắt)
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<ElementCategory | "all">("all");

  const selectedElement = useMemo(
    () => PERIODIC_ELEMENTS.find((el) => el.z === selectedZ) ?? PERIODIC_ELEMENTS[0],
    [selectedZ]
  );

  const matchedZSet = useMemo(() => {
    const q = normalizeVietnameseQuery(query);
    const set = new Set<number>();
    for (const el of PERIODIC_ELEMENTS) {
      if (catFilter !== "all" && el.category !== catFilter) continue;
      if (q) {
        const hay = normalizeVietnameseQuery(
          `${el.z} ${el.symbol} ${el.name} ${el.viName ?? ""}`
        );
        if (!hay.includes(q)) continue;
      }
      set.add(el.z);
    }
    return set;
  }, [query, catFilter]);

  const hasFilter = Boolean(query.trim()) || catFilter !== "all";
  const meta = ELEMENT_CATEGORY_META[selectedElement.category];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 12px 14px" }}>
      {/* Search + Category Filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm nguyên tố (vd: Fe, Sắt, 26, Oxi, Na...)"
          style={{
            flex: "1 1 200px",
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 12.5,
            outline: "none",
          }}
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as ElementCategory | "all")}
          style={{
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontSize: 12,
            color: "#334155",
            fontWeight: 600,
          }}
        >
          <option value="all">Tất cả nhóm (118)</option>
          {(Object.keys(ELEMENT_CATEGORY_META) as ElementCategory[]).map((k) => (
            <option key={k} value={k}>
              {ELEMENT_CATEGORY_META[k].label}
            </option>
          ))}
        </select>
      </div>

      {/* Interactive 18-Column Grid */}
      <div
        style={{
          overflowX: "auto",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: 8,
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(18, minmax(38px, 1fr))",
            gridTemplateRows: "repeat(10, auto)",
            gap: 3,
            minWidth: 720,
          }}
        >
          {PERIODIC_ELEMENTS.map((el: PeriodicElement) => {
            const c = ELEMENT_CATEGORY_META[el.category];
            const isSel = el.z === selectedZ;
            const isMatch = !hasFilter || matchedZSet.has(el.z);
            return (
              <button
                key={el.z}
                type="button"
                data-element-z={el.z}
                onClick={() => setSelectedZ(el.z)}
                title={`${el.z}. ${el.name}${el.viName ? ` (${el.viName})` : ""} — M = ${el.mass}`}
                style={{
                  gridColumn: el.col,
                  gridRow: el.row,
                  padding: "3px 2px",
                  borderRadius: 5,
                  border: isSel ? "2px solid #0f172a" : `1px solid ${c.border}`,
                  background: c.bg,
                  color: c.text,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1.05,
                  opacity: isMatch ? 1 : 0.22,
                  transform: isSel ? "scale(1.06)" : "none",
                  boxShadow: isSel ? "0 3px 10px rgba(15,23,42,0.22)" : "none",
                  zIndex: isSel ? 2 : 1,
                }}
              >
                <span style={{ fontSize: 8.5, fontWeight: 700, opacity: 0.85 }}>{el.z}</span>
                <span style={{ fontSize: 12, fontWeight: 800 }}>{el.symbol}</span>
                <span style={{ fontSize: 7.5, opacity: 0.8 }}>
                  {el.mass.replace(/[()]/g, "").slice(0, 5)}
                </span>
              </button>
            );
          })}

          {/* Lanthanide / Actinide markers in main table col 3 */}
          <div
            style={{
              gridColumn: 3,
              gridRow: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9.5,
              fontWeight: 700,
              color: "#9d174d",
              background: "#fce7f3",
              border: "1px dashed #f9a8d4",
              borderRadius: 5,
            }}
          >
            57–71
          </div>
          <div
            style={{
              gridColumn: 3,
              gridRow: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9.5,
              fontWeight: 700,
              color: "#9f1239",
              background: "#ffe4e6",
              border: "1px dashed #fda4af",
              borderRadius: 5,
            }}
          >
            89–103
          </div>
        </div>
      </div>

      {/* Selected Element Detail Card */}
      <div
        data-testid="periodic-detail-card"
        style={{
          border: `1px solid ${meta.border}`,
          background: "#ffffff",
          borderRadius: 12,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              background: meta.bg,
              border: `2px solid ${meta.border}`,
              color: meta.text,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700 }}>Z = {selectedElement.z}</span>
            <span style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.05 }}>
              {selectedElement.symbol}
            </span>
          </div>

          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                {selectedElement.name}
                {selectedElement.viName ? ` (${selectedElement.viName})` : ""}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: meta.bg,
                  color: meta.text,
                }}
              >
                {meta.label}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                fontSize: 12,
                color: "#475569",
                marginTop: 4,
              }}
            >
              <span>
                <strong>M:</strong> {selectedElement.mass}
              </span>
              <span>
                <strong>Chu kỳ:</strong> {selectedElement.period}
              </span>
              <span>
                <strong>Độ âm điện:</strong> {selectedElement.en || "—"}
              </span>
              {selectedElement.ox && (
                <span>
                  <strong>Số OXH:</strong> {selectedElement.ox}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Electron Config + 1-click Insert Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
            background: "#f8fafc",
            borderRadius: 8,
            padding: "6px 10px",
          }}
        >
          <div style={{ fontSize: 12.5, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b" }}>Cấu hình e:</span>
            <KaTeXFormula latex={selectedElement.config} />
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() =>
                onInsertFormulaLatex(
                  `^{${Math.round(Number(selectedElement.mass.replace(/[()]/g, "")) || selectedElement.z * 2)}}_{${selectedElement.z}}\\text{${selectedElement.symbol}}\\;\\left(M=${selectedElement.mass}\\right)`
                )
              }
              style={{
                padding: "4px 9px",
                borderRadius: 6,
                border: "1px solid #a7f3d0",
                background: "#ecfdf5",
                color: "#047857",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Chèn ký hiệu &amp; M
            </button>
            <button
              type="button"
              onClick={() =>
                onInsertFormulaLatex(
                  `\\text{${selectedElement.symbol}}\\;(Z=${selectedElement.z}):\\;${selectedElement.config}`
                )
              }
              style={{
                padding: "4px 9px",
                borderRadius: 6,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Chèn cấu hình e
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
