"use client";

import React, { useMemo, useState } from "react";
import type { PhysicsLessonPreset, PhysicsSimKind } from "@/types/physics";
import { PHYSICS_SIM_CATALOG } from "@/lib/physics-sim";
import {
  filterPhysicsFormulas,
  normalizeVietnameseQuery,
  PHYSICS_CONSTANTS,
  PHYSICS_UNIT_CONVERSIONS,
} from "@/lib/physics-formulas";
import { PHYSICS_LESSON_PRESETS } from "@/lib/physics-lessons";
import { KaTeXFormula } from "./elements/MathElement";

export type PhysicsDrawerTab =
  | "sim10"
  | "sim11"
  | "sim12"
  | "diagrams"
  | "formulas"
  | "units"
  | "lessons";

export interface PhysicsDrawerProps {
  open: boolean;
  onClose: () => void;
  onInsertSim: (kind: PhysicsSimKind) => void;
  onInsertAction: (action: string) => void;
  onInsertFormulaLatex: (latex: string) => void;
  onInsertLessonPreset: (preset: PhysicsLessonPreset) => void;
}

const TABS: Array<{ id: PhysicsDrawerTab; label: string }> = [
  { id: "sim10", label: "Lớp 10" },
  { id: "sim11", label: "Lớp 11" },
  { id: "sim12", label: "Lớp 12" },
  { id: "diagrams", label: "Sơ đồ & Đo" },
  { id: "formulas", label: "Công thức" },
  { id: "units", label: "Đổi đơn vị" },
  { id: "lessons", label: "Bài giảng" },
];

export const PhysicsDrawer: React.FC<PhysicsDrawerProps> = (props) => {
  if (!props.open) return null;
  return <PhysicsDrawerContent {...props} />;
};

const PhysicsDrawerContent: React.FC<PhysicsDrawerProps> = ({
  onClose,
  onInsertSim,
  onInsertAction,
  onInsertFormulaLatex,
  onInsertLessonPreset,
}) => {
  const [tab, setTab] = useState<PhysicsDrawerTab>("sim11");
  const [query, setQuery] = useState("");
  const [convId, setConvId] = useState(PHYSICS_UNIT_CONVERSIONS[0].id);
  const [convInput, setConvInput] = useState("72");
  const [convReverse, setConvReverse] = useState(false);

  const nq = normalizeVietnameseQuery(query);

  const filteredSims = useMemo(() => {
    const gradeNum = tab === "sim10" ? 10 : tab === "sim11" ? 11 : tab === "sim12" ? 12 : null;
    return PHYSICS_SIM_CATALOG.filter((s) => {
      if (!nq && gradeNum !== null && s.grade !== gradeNum) return false;
      if (!nq) return true;
      const hay = normalizeVietnameseQuery(`${s.title} ${s.description} ${s.keywords.join(" ")}`);
      return hay.includes(nq);
    });
  }, [tab, nq]);

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

  const filteredLessons = useMemo(() => {
    if (!nq) return PHYSICS_LESSON_PRESETS;
    return PHYSICS_LESSON_PRESETS.filter((l) =>
      normalizeVietnameseQuery(`${l.title} ${l.subtitle} ${l.keywords.join(" ")}`).includes(nq)
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
            ⚛ Thư viện Vật lý THPT (GDPT 2018)
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b" }}>
            15 mô phỏng tương tác • Sơ đồ mạch/lực/quang • Công thức &amp; Bài giảng
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

      {/* Search */}
      <div style={{ padding: "8px 12px 4px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm nhanh (vd: con lac, nem xien, mach dien, thau kinh...)"
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
        {(tab === "sim10" || tab === "sim11" || tab === "sim12" || (nq && tab !== "formulas" && tab !== "lessons")) &&
          filteredSims.map((sim) => (
            <div
              key={sim.kind}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 10,
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                  {sim.icon} {sim.title}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: 999 }}>
                  Lớp {sim.grade}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "#475569" }}>{sim.description}</div>
              <button
                type="button"
                data-physics-insert-sim={sim.kind}
                onClick={() => {
                  onInsertSim(sim.kind);
                  onClose();
                }}
                style={{
                  alignSelf: "flex-start",
                  padding: "4px 10px",
                  borderRadius: 7,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Chèn thí nghiệm
              </button>
            </div>
          ))}

        {tab === "diagrams" && (
          <>
            {[
              { id: "phys:diag:circuit", title: "⚡ Mạch điện DC (Định luật Ôm toàn mạch)", desc: "Nguồn E/r, điện trở, biến trở, khóa K bấm đóng/ngắt, Ampe kế & Vôn kế giải tự động." },
              { id: "phys:diag:circuit_parallel", title: "⚡ Mạch phân nhánh R₁ // R₂", desc: "Đo cường độ mạch chính & hiệu điện thế đoạn mạch song song tức thời." },
              { id: "phys:diag:fbd", title: "↗ Sơ đồ Phân tích lực & Chiếu Ox/Oy", desc: "Mặt phẳng nghiêng α chỉnh được, các vectơ lực P, N, Fms, F và hợp lực Fhl." },
              { id: "phys:diag:optics", title: "🔍 Quang hình học (3 Tia sáng & Dựng ảnh)", desc: "Thấu kính hội tụ/phân kỳ & gương cầu; kéo d, |f| xem ảnh thật/ảo A'B' và độ phóng đại k." },
              { id: "phys:inst:ruler", title: "📏 Thước đo tỉ lệ (cm / mm)", desc: "Đặt lên hình để đo trực tiếp hoặc xoay góc theo mặt nghiêng." },
              { id: "phys:inst:protractor", title: "📐 Thước đo góc 0°–180°", desc: "Đo góc tới/khúc xạ hoặc góc nghiêng α ngay trên canvas." },
              { id: "phys:inst:stopwatch", title: "⏱ Đồng hồ bấm giây", desc: "Đo thời gian thực hoặc bấm Lap khi chạy thí nghiệm." },
              { id: "phys:labtable", title: "📝 Bảng số liệu thực hành & Hồi quy Oxy", desc: "Ghi cặp (x, y) từ thí nghiệm và vẽ đường hồi quy y = ax + b lên Oxy." },
            ].map((it) => (
              <div
                key={it.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13 }}>{it.title}</div>
                <div style={{ fontSize: 11.5, color: "#475569" }}>{it.desc}</div>
                <button
                  type="button"
                  onClick={() => {
                    onInsertAction(it.id);
                    onClose();
                  }}
                  style={{
                    alignSelf: "flex-start",
                    padding: "4px 10px",
                    borderRadius: 7,
                    border: "none",
                    background: "#0284c7",
                    color: "#ffffff",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Chèn lên bảng
                </button>
              </div>
            ))}
          </>
        )}

        {tab === "formulas" && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e" }}>
              BẢNG HẰNG SỐ VẬT LÝ (1 CHẠM CHÈN LATEX)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {filteredConstants.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={`${c.name}: ${c.valueText}`}
                  onClick={() => {
                    onInsertFormulaLatex(c.latex);
                    onClose();
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 7,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {c.symbol} = {c.valueText}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a", marginTop: 6 }}>
              CÔNG THỨC SGK 10–11–12
            </div>
            {filteredFormulas.map((f) => (
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
                  <span style={{ color: "#64748b" }}>{f.topic}</span>
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

        {tab === "lessons" &&
          filteredLessons.map((lesson) => (
            <div
              key={lesson.id}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                padding: 10,
                background: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                  {lesson.title}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0f766e" }}>
                  Lớp {lesson.grade}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "#475569" }}>{lesson.subtitle}</div>
              <button
                type="button"
                data-physics-lesson={lesson.id}
                onClick={() => {
                  onInsertLessonPreset(lesson);
                  onClose();
                }}
                style={{
                  alignSelf: "flex-start",
                  padding: "5px 11px",
                  borderRadius: 7,
                  border: "none",
                  background: "#0f766e",
                  color: "#ffffff",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✨ Dựng trọn trang bài giảng
              </button>
            </div>
          ))}
      </div>
    </aside>
  );
};
