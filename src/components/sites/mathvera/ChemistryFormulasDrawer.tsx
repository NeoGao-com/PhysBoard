"use client";

import React, { useMemo, useState } from "react";
import {
  CHEMISTRY_TOPIC_GROUPS,
  filterChemistryFormulas,
  type ChemistryTopicCategory,
} from "@/lib/chemistry-formulas";
import { KaTeXFormula } from "./elements/MathElement";
import { PeriodicTablePanel } from "./PeriodicTablePanel";

export interface ChemistryFormulasDrawerProps {
  open: boolean;
  onClose: () => void;
  onInsertFormulaLatex: (latex: string) => void;
}

export const ChemistryFormulasDrawer: React.FC<ChemistryFormulasDrawerProps> = (props) => {
  if (!props.open) return null;
  return <ChemistryFormulasDrawerContent {...props} />;
};

const ChemistryFormulasDrawerContent: React.FC<ChemistryFormulasDrawerProps> = ({
  onClose,
  onInsertFormulaLatex,
}) => {
  const [tab, setTab] = useState<"formulas" | "periodic">("formulas");
  const [topicFilter, setTopicFilter] = useState<ChemistryTopicCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filteredAll = useMemo(() => filterChemistryFormulas(query, "all"), [query]);

  return (
    <aside
      data-wb-drawer="chemistry-formulas"
      data-testid="chemistry-formulas-drawer"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        top: 52,
        right: 12,
        bottom: 16,
        width: tab === "periodic" ? 860 : 410,
        maxWidth: "calc(100vw - 24px)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 14,
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
        transition: "width 0.18s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            🧪 Hoá học 10–11–12 &amp; Bảng Tuần Hoàn
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b" }}>
            Công thức theo chủ đề &amp; Bảng tuần hoàn 118 nguyên tố tương tác
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng công thức Hoá học"
          style={{
            border: "none",
            background: "#f1f5f9",
            color: "#334155",
            borderRadius: 8,
            width: 28,
            height: 28,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ✕
        </button>
      </div>

      {/* Mode Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "8px 12px 6px",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}
      >
        <button
          type="button"
          data-chem-tab="formulas"
          onClick={() => setTab("formulas")}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 8,
            border: tab === "formulas" ? "1px solid #059669" : "1px solid #e2e8f0",
            background: tab === "formulas" ? "#ecfdf5" : "#ffffff",
            color: tab === "formulas" ? "#047857" : "#475569",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📐 Công thức Hoá
        </button>
        <button
          type="button"
          data-chem-tab="periodic"
          onClick={() => setTab("periodic")}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 8,
            border: tab === "periodic" ? "1px solid #059669" : "1px solid #e2e8f0",
            background: tab === "periodic" ? "#ecfdf5" : "#ffffff",
            color: tab === "periodic" ? "#047857" : "#475569",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⚛ Bảng Tuần Hoàn (118 NT)
        </button>
      </div>

      {tab === "periodic" ? (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <PeriodicTablePanel
            onInsertFormulaLatex={(latex) => {
              onInsertFormulaLatex(latex);
              onClose();
            }}
          />
        </div>
      ) : (
        <>

      {/* Search */}
      <div style={{ padding: "8px 12px 4px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm công thức Hoá (vd: mol, nong do, ph, enthalpy, faraday...)"
          style={{
            width: "100%",
            padding: "7px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 12.5,
            outline: "none",
          }}
        />
      </div>

      {/* Topic Filter Pills */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "6px 12px",
          borderBottom: "1px solid #e2e8f0",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setTopicFilter("all")}
          style={{
            padding: "4px 9px",
            borderRadius: 999,
            border: topicFilter === "all" ? "1px solid #059669" : "1px solid #e2e8f0",
            background: topicFilter === "all" ? "#ecfdf5" : "#ffffff",
            color: topicFilter === "all" ? "#047857" : "#475569",
            fontSize: 11.5,
            fontWeight: topicFilter === "all" ? 700 : 500,
            cursor: "pointer",
          }}
        >
          Tất cả ({filteredAll.length})
        </button>
        {CHEMISTRY_TOPIC_GROUPS.map((g) => {
          const count = filteredAll.filter((f) => f.category === g.id).length;
          if (query.trim() && count === 0) return null;
          const active = topicFilter === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setTopicFilter(g.id)}
              style={{
                padding: "4px 9px",
                borderRadius: 999,
                border: active ? "1px solid #059669" : "1px solid #e2e8f0",
                background: active ? "#ecfdf5" : "#ffffff",
                color: active ? "#047857" : "#475569",
                fontSize: 11.5,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {g.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Formula List grouped by topic */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {CHEMISTRY_TOPIC_GROUPS.filter(
          (g) => topicFilter === "all" || topicFilter === g.id
        ).map((group) => {
          const items = filteredAll.filter((f) => f.category === group.id);
          if (items.length === 0) return null;
          return (
            <section
              key={group.id}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#047857",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  padding: "2px 4px",
                  borderBottom: "1px dashed #a7f3d0",
                }}
              >
                {group.label} ({items.length})
              </div>
              {items.map((f) => (
                <div
                  key={f.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "8px 10px",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
                      {f.name}
                    </div>
                    <button
                      type="button"
                      data-chem-insert-formula={f.id}
                      onClick={() => {
                        onInsertFormulaLatex(f.latex);
                        onClose();
                      }}
                      style={{
                        flexShrink: 0,
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid #a7f3d0",
                        background: "#ecfdf5",
                        color: "#047857",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Chèn bảng
                    </button>
                  </div>
                  <div
                    style={{
                      overflowX: "auto",
                      padding: "4px 6px",
                      background: "#f8fafc",
                      borderRadius: 6,
                      fontSize: 13,
                      color: "#0f172a",
                    }}
                  >
                    <KaTeXFormula latex={f.latex} />
                  </div>
                  {f.note && (
                    <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.35 }}>
                      {f.note}
                    </div>
                  )}
                </div>
              ))}
            </section>
          );
        })}

        {filteredAll.length === 0 && (
          <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 12.5 }}>
            Không tìm thấy công thức Hoá học phù hợp với &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
        </>
      )}
    </aside>
  );
};
