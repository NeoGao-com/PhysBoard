"use client";

import React, { useMemo, useState } from "react";
import {
  filterPhysicsFormulas,
  getPhysicsTopicCategory,
  normalizeVietnameseQuery,
  PHYSICS_CONSTANTS,
  PHYSICS_TOPIC_GROUPS,
  PHYSICS_UNIT_CONVERSIONS,
  type PhysicsTopicCategory,
} from "@/lib/physics-formulas";
import { KaTeXFormula } from "./elements/MathElement";

export type PhysicsDrawerTab = "formulas" | "constants" | "units";

export interface PhysicsDrawerProps {
  open: boolean;
  onClose: () => void;
  onInsertAction?: (action: string) => void;
  onInsertFormulaLatex: (latex: string) => void;
  onOpenHtmlSimModal?: () => void;
}

const TABS: Array<{ id: PhysicsDrawerTab; label: string }> = [
  { id: "formulas", label: "Bảng Công thức" },
  { id: "constants", label: "Hằng số Vật lý" },
  { id: "units", label: "Đổi đơn vị" },
];

export const PhysicsDrawer: React.FC<PhysicsDrawerProps> = (props) => {
  if (!props.open) return null;
  return <PhysicsDrawerContent {...props} />;
};

const PhysicsDrawerContent: React.FC<PhysicsDrawerProps> = ({
  onClose,
  onInsertFormulaLatex,
  onOpenHtmlSimModal,
}) => {
  const [tab, setTab] = useState<PhysicsDrawerTab>("formulas");
  const [topicFilter, setTopicFilter] = useState<PhysicsTopicCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [convId, setConvId] = useState(PHYSICS_UNIT_CONVERSIONS[0].id);
  const [convInput, setConvInput] = useState("72");
  const [convReverse, setConvReverse] = useState(false);

  const nq = normalizeVietnameseQuery(query);

  const filteredFormulas = useMemo(
    () => filterPhysicsFormulas(query, "all"),
    [query]
  );

  const filteredConstants = useMemo(() => {
    if (!nq) return PHYSICS_CONSTANTS;
    return PHYSICS_CONSTANTS.filter((c) =>
      normalizeVietnameseQuery(`${c.name} ${c.symbol} ${c.keywords.join(" ")}`).includes(nq)
    );
  }, [nq]);

  const activeConv =
    PHYSICS_UNIT_CONVERSIONS.find((c) => c.id === convId) ??
    PHYSICS_UNIT_CONVERSIONS[0];
  const rawNum = Number(convInput);
  const outNum = Number.isFinite(rawNum)
    ? convReverse
      ? activeConv.reverse(rawNum)
      : activeConv.convert(rawNum)
    : NaN;
  const formattedOut = Number.isFinite(outNum)
    ? Math.abs(outNum) < 1e-3 || Math.abs(outNum) >= 1e5
      ? outNum.toExponential(3)
      : Number(outNum.toFixed(4)).toString()
    : "—";

  return (
    <aside
      data-wb-drawer="physics"
      data-testid="physics-drawer"
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
            ⚛ Công cụ Vật lý &amp; Sơ đồ
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b" }}>
            Bảng công thức, hằng số Vật lý &amp; Đổi đơn vị
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thư viện Vật lý"
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

      {/* HTML Simulation Callout */}
      {onOpenHtmlSimModal && (
        <div
          style={{
            margin: "8px 12px 2px",
            padding: "8px 10px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11.5, color: "#166534" }}>
            💡 Cần mô phỏng? Nạp file <strong>HTML</strong> thí nghiệm riêng của bạn.
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenHtmlSimModal();
            }}
            style={{
              padding: "4px 8px",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Nạp HTML...
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: "8px 12px 4px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm công thức, hằng số (vd: newton, om, song...)"
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

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "6px 12px",
          borderBottom: "1px solid #e2e8f0",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-physics-tab={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "4px 9px",
              borderRadius: 999,
              border: tab === t.id ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: tab === t.id ? "#dbeafe" : "#f8fafc",
              color: tab === t.id ? "#1d4ed8" : "#334155",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {tab === "formulas" && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>
              CÔNG THỨC SGK 10–11–12 THEO CHỦ ĐỀ
            </div>
            {/* Topic Filter Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              <button
                type="button"
                data-physics-topic="all"
                onClick={() => setTopicFilter("all")}
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: topicFilter === "all" ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                  background: topicFilter === "all" ? "#eff6ff" : "#f8fafc",
                  color: topicFilter === "all" ? "#1d4ed8" : "#475569",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tất cả ({filteredFormulas.length})
              </button>
              {PHYSICS_TOPIC_GROUPS.map((grp) => {
                const count = filteredFormulas.filter(
                  (f) => getPhysicsTopicCategory(f) === grp.id
                ).length;
                if (count === 0) return null;
                const active = topicFilter === grp.id;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    data-physics-topic={grp.id}
                    onClick={() => setTopicFilter(grp.id)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: active ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                      background: active ? "#eff6ff" : "#f8fafc",
                      color: active ? "#1d4ed8" : "#475569",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {grp.label} ({count})
                  </button>
                );
              })}
            </div>

            {PHYSICS_TOPIC_GROUPS.filter(
              (grp) => topicFilter === "all" || topicFilter === grp.id
            ).map((grp) => {
              const items = filteredFormulas.filter(
                (f) => getPhysicsTopicCategory(f) === grp.id
              );
              if (items.length === 0) return null;
              return (
                <div
                  key={grp.id}
                  data-physics-topic-section={grp.id}
                  style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}
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
                        <span style={{ color: "#64748b", fontSize: 11 }}>{f.topic}</span>
                      </div>
                      <div style={{ overflowX: "auto", padding: "3px 0", fontSize: 13 }}>
                        <KaTeXFormula latex={f.latex} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{f.note}</span>
                        <button
                          type="button"
                          data-physics-insert-formula={f.id}
                          onClick={() => {
                            onInsertFormulaLatex(f.latex);
                            onClose();
                          }}
                          style={{
                            padding: "3px 9px",
                            borderRadius: 6,
                            border: "none",
                            background: "#16a34a",
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
            })}
          </>
        )}

        {tab === "constants" && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e" }}>
              BẢNG HẰNG SỐ VẬT LÝ (1 CHẠM CHÈN LATEX)
            </div>
            {filteredConstants.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                Không tìm thấy hằng số nào khớp với “{query}”.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredConstants.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 9,
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                        {c.name}
                      </span>
                      <span style={{ fontSize: 12, color: "#0f766e", fontWeight: 600 }}>
                        {c.symbol} = {c.valueText}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-physics-insert-constant={c.id}
                      onClick={() => {
                        onInsertFormulaLatex(c.latex);
                        onClose();
                      }}
                      style={{
                        padding: "4px 9px",
                        borderRadius: 6,
                        border: "none",
                        background: "#0f766e",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Chèn
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "units" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
              Đổi đơn vị Vật lý nhanh
            </div>
            <select
              value={convId}
              onChange={(e) => setConvId(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12.5 }}
            >
              {PHYSICS_UNIT_CONVERSIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}: {c.fromUnit} ↔ {c.toUnit}
                </option>
              ))}
            </select>
            <div
              data-physics-unit-formula="true"
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowX: "auto" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                  Công thức đổi:
                </span>
                <div style={{ fontSize: 13, color: "#0f172a" }}>
                  <KaTeXFormula
                    latex={
                      convReverse
                        ? activeConv.reverseFormulaLatex
                        : activeConv.formulaLatex
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onInsertFormulaLatex(
                    convReverse
                      ? activeConv.reverseFormulaLatex
                      : activeConv.formulaLatex
                  );
                  onClose();
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                + Chèn CT
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                value={convInput}
                onChange={(e) => setConvInput(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
              <span style={{ fontWeight: 700, fontSize: 12.5 }}>
                {convReverse ? activeConv.toUnit : activeConv.fromUnit}
              </span>
              <button
                type="button"
                onClick={() => setConvReverse((r) => !r)}
                title="Đảo chiều đổi"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                }}
              >
                ⇄
              </button>
            </div>
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                fontSize: 15,
                fontWeight: 800,
                color: "#1d4ed8",
                textAlign: "center",
              }}
            >
              = {formattedOut} {convReverse ? activeConv.fromUnit : activeConv.toUnit}
            </div>
            <button
              type="button"
              onClick={() => {
                const u1 = convReverse ? activeConv.toUnit : activeConv.fromUnit;
                const u2 = convReverse ? activeConv.fromUnit : activeConv.toUnit;
                onInsertFormulaLatex(`${convInput}\\text{ ${u1}} = ${formattedOut}\\text{ ${u2}}`);
                onClose();
              }}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              + Chèn kết quả lên bảng
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
