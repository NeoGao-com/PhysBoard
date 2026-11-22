"use client";

import React, { useMemo, useState } from "react";
import {
  filterMathFormulas,
  MATH_TOPIC_GROUPS,
  type MathTopicCategory,
} from "@/lib/math-formulas";
import { KaTeXFormula } from "./elements/MathElement";

export interface MathFormulasDrawerProps {
  open: boolean;
  onClose: () => void;
  onInsertFormulaLatex: (latex: string) => void;
}

export const MathFormulasDrawer: React.FC<MathFormulasDrawerProps> = (props) => {
  if (!props.open) return null;
  return <MathFormulasDrawerContent {...props} />;
};

const MathFormulasDrawerContent: React.FC<MathFormulasDrawerProps> = ({
  onClose,
  onInsertFormulaLatex,
}) => {
  const [topicFilter, setTopicFilter] = useState<MathTopicCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filteredAll = useMemo(() => filterMathFormulas(query, "all"), [query]);

  return (
    <aside
      data-wb-drawer="math-formulas"
      data-testid="math-formulas-drawer"
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
        width: 410,
        maxWidth: "calc(100vw - 24px)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 14,
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
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
            ∑ Bảng Công thức Toán 10–11–12
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b" }}>
            Đại số • Lượng giác • Giải tích • Hình học &amp; Xác suất theo từng chủ đề
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng công thức Toán"
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

      {/* Search */}
      <div style={{ padding: "8px 12px 4px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm công thức Toán (vd: dao ham, luong giac, viet, bayes...)"
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
          data-math-topic="all"
          onClick={() => setTopicFilter("all")}
          style={{
            padding: "4px 9px",
            borderRadius: 999,
            border: topicFilter === "all" ? "1px solid #2563eb" : "1px solid #e2e8f0",
            background: topicFilter === "all" ? "#dbeafe" : "#f8fafc",
            color: topicFilter === "all" ? "#1d4ed8" : "#334155",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tất cả ({filteredAll.length})
        </button>
        {MATH_TOPIC_GROUPS.map((grp) => {
          const count = filteredAll.filter((f) => f.category === grp.id).length;
          if (count === 0) return null;
          const active = topicFilter === grp.id;
          return (
            <button
              key={grp.id}
              type="button"
              data-math-topic={grp.id}
              onClick={() => setTopicFilter(grp.id)}
              style={{
                padding: "4px 9px",
                borderRadius: 999,
                border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
                background: active ? "#dbeafe" : "#f8fafc",
                color: active ? "#1d4ed8" : "#334155",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {grp.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Scrollable Body Grouped by Topic */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {filteredAll.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13 }}>
            Không tìm thấy công thức nào khớp với “{query}”.
          </div>
        ) : (
          MATH_TOPIC_GROUPS.filter(
            (grp) => topicFilter === "all" || topicFilter === grp.id
          ).map((grp) => {
            const items = filteredAll.filter((f) => f.category === grp.id);
            if (items.length === 0) return null;
            return (
              <div
                key={grp.id}
                data-math-topic-section={grp.id}
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#334155",
                    background: "#f1f5f9",
                    padding: "4px 8px",
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{grp.label}</span>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>{items.length}</span>
                </div>
                {items.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 9,
                      padding: 9,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                      <span>{f.name}</span>
                    </div>
                    <div style={{ overflowX: "auto", padding: "3px 0", fontSize: 13 }}>
                      <KaTeXFormula latex={f.latex} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{f.note}</span>
                      <button
                        type="button"
                        data-math-insert-formula={f.id}
                        onClick={() => {
                          onInsertFormulaLatex(f.latex);
                          onClose();
                        }}
                        style={{
                          padding: "3px 9px",
                          borderRadius: 6,
                          border: "none",
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Chèn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
