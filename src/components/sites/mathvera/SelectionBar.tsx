"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CanvasElement } from "@/types/whiteboard";

export interface SelectionBarProps {
  selectedCount: number;
  hiddenCount?: number;
  selectedAxes2D?: CanvasElement | null;
  selectedPhysicsEl?: CanvasElement | null;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onCut: () => void;
  onHide: () => void;
  onUnhideAll?: () => void;
  onAxesPlot?: () => void;
  onAxesAddPoint?: () => void;
  onAxesToggleGrid?: () => void;
  onAxesToggleTicks?: () => void;
  onAxesAddVector?: () => void;
  onAxesOpenConic?: () => void;
  onAxesOpenEquation?: () => void;
  onAxesOpenInequality?: () => void;
  onAxesOpenParametric?: () => void;
  onAxesOpenSequence?: () => void;
  onPhysicsTogglePlay?: () => void;
  onPhysicsReset?: () => void;
  onPhysicsExportGraph?: () => void;
  onPhysicsRecordData?: () => void;
  onPhysicsRotateInstrument?: (deltaDeg: number) => void;
  onPhysicsPlotRegression?: () => void;
}

const actionBtnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#1e293b",
  fontWeight: 600,
  cursor: "pointer",
  font: "14px system-ui, -apple-system, sans-serif",
  boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "7px 12px",
  borderRadius: 7,
  border: "none",
  background: "transparent",
  color: "#1e293b",
  fontSize: 13.5,
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left",
  whiteSpace: "nowrap",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

export const SelectionBar: React.FC<SelectionBarProps> = ({
  selectedCount,
  hiddenCount = 0,
  selectedAxes2D = null,
  selectedPhysicsEl = null,
  onDelete,
  onDuplicate,
  onCopy,
  onCut,
  onHide,
  onUnhideAll,
  onAxesPlot,
  onAxesAddPoint,
  onAxesToggleGrid,
  onAxesToggleTicks,
  onAxesAddVector,
  onAxesOpenConic,
  onAxesOpenEquation,
  onAxesOpenInequality,
  onAxesOpenParametric,
  onAxesOpenSequence,
  onPhysicsTogglePlay,
  onPhysicsReset,
  onPhysicsExportGraph,
  onPhysicsRecordData,
  onPhysicsRotateInstrument,
  onPhysicsPlotRegression,
}) => {
  const [moreAxesOpen, setMoreAxesOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreAxesOpen) return;
    const onDown = (e: PointerEvent) => {
      if (moreWrapRef.current && !moreWrapRef.current.contains(e.target as Node)) {
        setMoreAxesOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreAxesOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreAxesOpen]);

  if (selectedCount > 0) {
    const isAxesContext = selectedCount === 1 && Boolean(selectedAxes2D);
    const gridEnabled = selectedAxes2D?.props?.grid !== false;
    const ticksMode = selectedAxes2D?.props?.ticks === "pi" ? "pi" : "int";

    return (
      <div
        data-export-skip="true"
        data-wb-selection-bar="true"
        style={{
          position: "fixed",
          left: 12,
          bottom: 12,
          zIndex: 10000,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        {/* Delete button (Red) */}
        <button
          type="button"
          data-action="delete"
          onClick={onDelete}
          title="Xóa phần đang chọn"
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: "none",
            background: "#dc2626",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
            font: "15px system-ui, -apple-system, sans-serif",
            boxShadow: "0 4px 16px rgba(220,38,38,0.45)",
          }}
        >
          🗑 Xoá{selectedCount > 1 ? ` (${selectedCount})` : ""}
        </button>

        {/* Contextual Axes2D Primary Actions */}
        {isAxesContext && (
          <>
            <button
              type="button"
              data-action="axes-plot"
              onClick={onAxesPlot}
              title="Vẽ đồ thị hàm số y = f(x) lên hệ trục này"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: "0 3px 12px rgba(37, 99, 235, 0.35)",
              }}
            >
              ∿ Vẽ đồ thị
            </button>
            <button
              type="button"
              data-action="axes-add-point"
              onClick={onAxesAddPoint}
              title="Đặt điểm theo toạ độ (x; y)"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: "0 3px 12px rgba(37, 99, 235, 0.35)",
              }}
            >
              + Điểm (x; y)
            </button>
          </>
        )}

        {/* Contextual Physics Element Actions */}
        {selectedPhysicsEl?.type === "PhysicsSim" && (
          <>
            <button
              type="button"
              data-action="phys-toggle-play"
              onClick={onPhysicsTogglePlay}
              style={{
                ...actionBtnStyle,
                border: "none",
                background: selectedPhysicsEl.props.playing ? "#ea580c" : "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              {selectedPhysicsEl.props.playing ? "❚❚ Dừng TN" : "▶ Chạy TN"}
            </button>
            <button
              type="button"
              data-action="phys-reset"
              onClick={onPhysicsReset}
              style={actionBtnStyle}
            >
              ↺ Đặt lại
            </button>
            <button
              type="button"
              data-action="phys-export-graph"
              onClick={onPhysicsExportGraph}
              style={actionBtnStyle}
            >
              📊 Xuất đồ thị Oxy
            </button>
            <button
              type="button"
              data-action="phys-record"
              onClick={onPhysicsRecordData}
              style={actionBtnStyle}
            >
              📝 Ghi số đo
            </button>
          </>
        )}

        {selectedPhysicsEl?.type === "PhysicsInstrument" &&
          selectedPhysicsEl.props.instrumentKind !== "stopwatch" && (
            <>
              <button
                type="button"
                data-action="phys-rotate-ccw"
                onClick={() => onPhysicsRotateInstrument?.(-15)}
                style={actionBtnStyle}
              >
                ↺ Xoay -15°
              </button>
              <button
                type="button"
                data-action="phys-rotate-cw"
                onClick={() => onPhysicsRotateInstrument?.(15)}
                style={actionBtnStyle}
              >
                ↻ Xoay +15°
              </button>
            </>
          )}

        {selectedPhysicsEl?.type === "PhysicsLabTable" && (
          <button
            type="button"
            data-action="phys-plot-regression"
            onClick={onPhysicsPlotRegression}
            style={{
              ...actionBtnStyle,
              border: "none",
              background: "#0f766e",
              color: "#ffffff",
              fontWeight: 700,
            }}
          >
            📈 Vẽ hồi quy Oxy
          </button>
        )}

        {/* Duplicate */}
        <button
          type="button"
          data-action="duplicate"
          onClick={onDuplicate}
          title="Tạo một bản sao ngay bên cạnh (giữ nguyên cách dựng)"
          style={actionBtnStyle}
        >
          ⧉ Nhân bản
        </button>

        {/* Copy */}
        <button
          type="button"
          data-action="copy"
          onClick={onCopy}
          title="Chép vào bộ nhớ — Ctrl+V để dán chỗ con trỏ"
          style={actionBtnStyle}
        >
          ⎘ Sao chép
        </button>

        {isAxesContext ? (
          <div ref={moreWrapRef} style={{ position: "relative", display: "inline-flex" }}>
            <button
              type="button"
              data-action="axes-more"
              aria-haspopup="menu"
              aria-expanded={moreAxesOpen}
              onClick={() => setMoreAxesOpen((v) => !v)}
              title="Thêm tuỳ chọn hệ trục & vẽ đường, cônic, bất phương trình, tham số, dãy số"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#16a34a",
                color: "#ffffff",
                fontWeight: 700,
                boxShadow: "0 3px 12px rgba(22, 163, 74, 0.35)",
              }}
            >
              + Thêm ▾
            </button>

            {moreAxesOpen && (
              <div
                role="menu"
                data-wb-axes-menu="true"
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: "calc(100% + 10px)",
                  minWidth: 336,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.22)",
                  padding: "6px",
                  zIndex: 10020,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  data-action="cut"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onCut();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>✂</span>
                  <span>Cắt</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-action="hide"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onHide();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>🙈</span>
                  <span>Ẩn</span>
                </button>

                <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />

                <button
                  type="button"
                  role="menuitem"
                  data-action="axes-toggle-grid"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onAxesToggleGrid?.();
                  }}
                  style={{
                    ...menuItemStyle,
                    color: gridEnabled ? "#1d4ed8" : "#1e293b",
                    fontWeight: gridEnabled ? 600 : 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>⊞</span>
                  <span>{gridEnabled ? "✓ Hiện lưới ô vuông" : "Hiện lưới ô vuông"}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-action="axes-toggle-ticks"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onAxesToggleTicks?.();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>⋮</span>
                  <span>
                    {ticksMode === "pi" ? "Vạch chia số nguyên" : "Vạch chia π (lượng giác)"}
                  </span>
                </button>

                <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />

                <button
                  type="button"
                  role="menuitem"
                  data-action="axes-vector"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onAxesAddVector?.();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>⟶</span>
                  <span>Vectơ (x; y)</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-action="axes-conic"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onAxesOpenConic?.();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>◐</span>
                  <span>Elip · Hypebol · Parabol</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-action="axes-equation"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onAxesOpenEquation?.();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>═</span>
                  <span>Phương trình (đường thẳng, đường tròn, cônic...)</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-action="axes-inequality"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onAxesOpenInequality?.();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>◩</span>
                  <span>Bất phương trình / hệ bất phương trình</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-action="axes-parametric"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onAxesOpenParametric?.();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>➰</span>
                  <span>Đường cong tham số</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-action="axes-sequence"
                  onClick={() => {
                    setMoreAxesOpen(false);
                    onAxesOpenSequence?.();
                  }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>⋯</span>
                  <span>Dãy số (uₙ)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Cut */}
            <button
              type="button"
              data-action="cut"
              onClick={onCut}
              title="Chép rồi xoá — Ctrl+V để dán lại chỗ khác"
              style={actionBtnStyle}
            >
              ✂ Cắt
            </button>

            {/* Hide */}
            <button
              type="button"
              data-action="hide"
              onClick={onHide}
              title='Ẩn khỏi bảng (không xoá) — hiện lại bằng nút "Hiện hình đã ẩn"'
              style={actionBtnStyle}
            >
              🙈 Ẩn
            </button>
          </>
        )}
      </div>
    );
  }

  // Restore hidden elements button
  if (hiddenCount > 0 && onUnhideAll) {
    return (
      <div
        data-export-skip="true"
        style={{ position: "fixed", left: 12, bottom: 12, zIndex: 55 }}
      >
        <button
          type="button"
          onClick={onUnhideAll}
          title="Hiện lại mọi hình đã ẩn"
          style={actionBtnStyle}
        >
          👁 Hiện {hiddenCount} hình đã ẩn
        </button>
      </div>
    );
  }

  return null;
};
