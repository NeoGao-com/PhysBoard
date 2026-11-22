"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CanvasElement } from "@/types/whiteboard";
import type { SolidSubSelection } from "@/lib/geometry3d";

export interface SelectionBarProps {
  selectedCount: number;
  hiddenCount?: number;
  lockedCount?: number;
  selectedAxes2D?: CanvasElement | null;
  selectedAxes3D?: CanvasElement | null;
  selectedSolidEl?: CanvasElement | null;
  selectedPoints?: CanvasElement[];
  selectedMathText?: CanvasElement | null;
  selectedSolidSubPart?: SolidSubSelection | null;
  isSolidFaceFilled?: boolean;
  isSolidEdgeMeasured?: boolean;
  labelScale?: number;
  dotScale?: number;
  onEditMath?: () => void;
  onSolveEquation?: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onCut: () => void;
  onHide: () => void;
  onUnhideAll?: () => void;
  onUnlockAll?: () => void;
  onPointRename?: () => void;
  onPointToggleHideName?: () => void;
  onPointCycleDot?: () => void;
  onPointChangeDotSize?: (delta: number) => void;
  onPointResetDotSize?: () => void;
  onChangeLabelScale?: (nextScale: number) => void;
  onAxesPlot?: () => void;
  onAxesAddPoint?: () => void;
  onAxesToggleGrid?: () => void;
  onAxesToggleTicks?: () => void;
  onAxesAddVector?: () => void;
  onAxes3DAddPoint?: () => void;
  onAxes3DAddVector?: () => void;
  onAxes3DAddPlane?: () => void;
  onAxes3DAddLine?: () => void;
  onAxes3DAddSphere?: () => void;
  onAxesOpenConic?: () => void;
  onAxesOpenEquation?: () => void;
  onAxesOpenInequality?: () => void;
  onAxesOpenParametric?: () => void;
  onAxesOpenSequence?: () => void;
  onSolidUnfold?: () => void;
  onSolidFaceFlatten?: () => void;
  onSolidFaceFill?: () => void;
  onSolidFaceExtendPlane?: () => void;
  onSolidFaceCenter?: () => void;
  onSolidEdgeMeasure?: () => void;
  onSolidEdgeMidpoint?: () => void;
  onSolidEdgePoint?: () => void;
  onSolidEdgePerpBisector?: () => void;
  onSolidSelectWhole?: () => void;
  onRotateSelection?: (deltaDeg: number) => void;
  onLockSelection?: () => void;
  sidebarOpen?: boolean;
  isPortrait?: boolean;
}

const actionBtnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#1e293b",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
  fontFamily:
    'var(--font-anime, "Comfortaa", "Nunito", "Quicksand", system-ui, -apple-system, sans-serif)',
  boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  transition:
    "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease, box-shadow 0.18s ease",
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
  fontFamily:
    'var(--font-anime, "Comfortaa", "Nunito", "Quicksand", system-ui, -apple-system, sans-serif)',
  transition: "all 0.15s ease",
};

const pillGroupStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: "4px 8px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#1e293b",
  fontSize: 13.5,
  fontFamily: "system-ui, -apple-system, sans-serif",
  boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
};

const pillMiniBtnStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#1e293b",
  fontWeight: 600,
  cursor: "pointer",
  padding: "3px 6px",
  borderRadius: 6,
  fontSize: 13.5,
  fontFamily: "system-ui, -apple-system, sans-serif",
  lineHeight: 1.2,
};

export const SelectionBar: React.FC<SelectionBarProps> = ({
  selectedCount,
  hiddenCount = 0,
  lockedCount = 0,
  selectedAxes2D = null,
  selectedAxes3D = null,
  selectedSolidEl = null,
  selectedPoints = [],
  selectedMathText = null,
  selectedSolidSubPart = null,
  isSolidFaceFilled = false,
  isSolidEdgeMeasured = false,
  labelScale = 1,
  dotScale = 1.5,
  onEditMath,
  onSolveEquation,
  onDelete,
  onDuplicate,
  onCopy,
  onCut,
  onHide,
  onUnhideAll,
  onUnlockAll,
  onPointRename,
  onPointToggleHideName,
  onPointCycleDot,
  onPointChangeDotSize,
  onPointResetDotSize,
  onChangeLabelScale,
  onAxesPlot,
  onAxesAddPoint,
  onAxesToggleGrid,
  onAxesToggleTicks,
  onAxesAddVector,
  onAxes3DAddPoint,
  onAxes3DAddVector,
  onAxes3DAddPlane,
  onAxes3DAddLine,
  onAxes3DAddSphere,
  onAxesOpenConic,
  onAxesOpenEquation,
  onAxesOpenInequality,
  onAxesOpenParametric,
  onAxesOpenSequence,
  onSolidUnfold,
  onSolidFaceFlatten,
  onSolidFaceFill,
  onSolidFaceExtendPlane,
  onSolidFaceCenter,
  onSolidEdgeMeasure,
  onSolidEdgeMidpoint,
  onSolidEdgePoint,
  onSolidEdgePerpBisector,
  onSolidSelectWhole,
  onRotateSelection,
  onLockSelection,
  sidebarOpen = false,
  isPortrait = false,
}) => {
  const [moreAxesOpen, setMoreAxesOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const barLeft = sidebarOpen ? 152 : 38;

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
    if (selectedCount === 1 && selectedSolidSubPart) {
      const isFace = selectedSolidSubPart.kind === "face";
      const badgeLabel = isFace
        ? `Mặt ${selectedSolidSubPart.faceLabel}`
        : `Cạnh ${selectedSolidSubPart.edgeLabel}`;
      const subMenuItems = isFace
        ? [
            { action: "solid-select-whole", icon: "📦", label: "Chọn cả khối (Di chuyển / Đổi cỡ)", handler: onSolidSelectWhole },
            { action: "solid-face-center", icon: "🎯", label: "Lấy tâm mặt", handler: onSolidFaceCenter },
            { action: "duplicate", icon: "⧉", label: "Nhân bản khối", handler: onDuplicate },
            { action: "hide", icon: "🙈", label: "Ẩn khối", handler: onHide },
            { action: "delete", icon: "🗑", label: "Xoá khối", handler: onDelete },
          ]
        : [
            { action: "solid-select-whole", icon: "📦", label: "Chọn cả khối (Di chuyển / Đổi cỡ)", handler: onSolidSelectWhole },
            { action: "solid-edge-perpbis", icon: "⊥", label: "Đường trung trực cạnh", handler: onSolidEdgePerpBisector },
            { action: "duplicate", icon: "⧉", label: "Nhân bản khối", handler: onDuplicate },
            { action: "hide", icon: "🙈", label: "Ẩn khối", handler: onHide },
            { action: "delete", icon: "🗑", label: "Xoá khối", handler: onDelete },
          ];

      return (
        <div
          data-export-skip="true"
          data-wb-selection-bar="true"
          style={{
            position: "fixed",
            left: barLeft,
            bottom: 12,
            zIndex: 70,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            maxWidth: `calc(100vw - ${barLeft + 12}px)`,
            transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <span
            data-wb-solid-badge="true"
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #fcd34d",
              background: "#fef3c7",
              color: "#92400e",
              fontWeight: 700,
              fontSize: 14,
              fontFamily:
                'var(--font-anime, "Comfortaa", "Nunito", "Quicksand", system-ui, -apple-system, sans-serif)',
              boxShadow: "0 2px 8px rgba(15,23,42,0.1)",
            }}
          >
            {badgeLabel}
          </span>

          {isFace ? (
            <>
              <button
                type="button"
                data-action="solid-face-flatten"
                onClick={onSolidFaceFlatten}
                title="Tách mặt đang chọn thành hình phẳng 2D đúng kích thước thật"
                style={{
                  ...actionBtnStyle,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 700,
                  boxShadow: "0 3px 12px rgba(37, 99, 235, 0.35)",
                }}
              >
                ◫ Tách ra hình thật
              </button>
              <button
                type="button"
                data-action="solid-face-fill"
                onClick={onSolidFaceFill}
                title="Tô màu hoặc bỏ tô màu mặt đang chọn"
                style={{
                  ...actionBtnStyle,
                  border: isSolidFaceFilled ? "1px solid #2563eb" : "1px solid #cbd5e1",
                  background: isSolidFaceFilled ? "#eff6ff" : "#ffffff",
                  color: isSolidFaceFilled ? "#1d4ed8" : "#1e293b",
                }}
              >
                🪣 {isSolidFaceFilled ? "Bỏ tô mặt" : "Tô mặt"}
              </button>
              <button
                type="button"
                data-action="solid-face-plane"
                onClick={onSolidFaceExtendPlane}
                title="Mở rộng mặt đang chọn thành hình bình hành mặt phẳng"
                style={actionBtnStyle}
              >
                ▱ Mở rộng thành mặt phẳng
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                data-action="solid-edge-measure"
                onClick={onSolidEdgeMeasure}
                title="Hiện / ẩn độ dài cạnh đang chọn"
                style={{
                  ...actionBtnStyle,
                  border: isSolidEdgeMeasured ? "1px solid #2563eb" : "1px solid #cbd5e1",
                  background: isSolidEdgeMeasured ? "#eff6ff" : "#ffffff",
                  color: isSolidEdgeMeasured ? "#1d4ed8" : "#1e293b",
                }}
              >
                📏 Độ dài
              </button>
              <button
                type="button"
                data-action="solid-edge-midpoint"
                onClick={onSolidEdgeMidpoint}
                title="Đặt điểm trung điểm gắn chặt với cạnh"
                style={actionBtnStyle}
              >
                • Trung điểm
              </button>
              <button
                type="button"
                data-action="solid-edge-point"
                onClick={onSolidEdgePoint}
                title="Đặt một điểm trượt được trên cạnh đang chọn"
                style={actionBtnStyle}
              >
                • Điểm trên cạnh
              </button>
            </>
          )}

          <div ref={moreWrapRef} style={{ position: "relative", display: "inline-flex" }}>
            <button
              type="button"
              data-action="solid-sub-more"
              aria-haspopup="menu"
              aria-expanded={moreAxesOpen}
              onClick={() => setMoreAxesOpen((v) => !v)}
              title="Thêm tuỳ chọn cho mặt / cạnh / khối không gian"
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
                data-wb-solid-sub-menu="true"
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: "calc(100% + 10px)",
                  minWidth: 230,
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
                {subMenuItems.map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    role="menuitem"
                    data-action={item.action}
                    onClick={() => {
                      setMoreAxesOpen(false);
                      item.handler?.();
                    }}
                    style={{
                      ...menuItemStyle,
                      color: item.action === "delete" ? "#dc2626" : "#1e293b",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    const isAxesContext = selectedCount === 1 && Boolean(selectedAxes2D);
    const isPointsContext =
      selectedPoints.length > 0 && selectedPoints.length === selectedCount;
    const allPointNamesHidden =
      isPointsContext &&
      selectedPoints.every((pt) => pt.props?.hideName === true);
    const primaryPoint = isPointsContext ? selectedPoints[0] : null;
    const primaryDotMode =
      primaryPoint?.props?.dot === "cross" || primaryPoint?.props?.dot === "none"
        ? primaryPoint.props.dot
        : "dot";
    const primaryDotSymbol =
      primaryDotMode === "cross" ? "×" : primaryDotMode === "none" ? "○" : "•";
    const primaryDotSize =
      typeof primaryPoint?.props?.dotSize === "number" &&
      primaryPoint.props.dotSize > 0
        ? primaryPoint.props.dotSize
        : dotScale;
    const dotSizePercent = Math.round(primaryDotSize * 100);
    const labelScalePercent = Math.round(labelScale * 100);
    const gridEnabled = selectedAxes2D?.props?.grid !== false;
    const ticksMode = selectedAxes2D?.props?.ticks === "pi" ? "pi" : "int";

    return (
      <div
        data-export-skip="true"
        data-wb-selection-bar="true"
        className="wb-selection-scroll"
        style={{
          position: "fixed",
          left: isPortrait ? 12 : barLeft,
          bottom: 12,
          zIndex: 70,
          display: "flex",
          flexWrap: isPortrait ? "nowrap" : "wrap",
          overflowX: isPortrait ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
          paddingBottom: isPortrait ? 4 : 0,
          alignItems: "center",
          gap: 8,
          maxWidth: isPortrait ? "calc(100vw - 24px)" : `calc(100vw - ${barLeft + 170}px)`,
          transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          scrollbarWidth: "none",
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
            fontSize: 15,
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 4px 16px rgba(220,38,38,0.45)",
          }}
        >
          🗑 Xoá{selectedCount > 1 ? ` (${selectedCount})` : ""}
        </button>

        {/* MathText / Formula Context Actions */}
        {selectedCount === 1 && selectedMathText && (
          <>
            <button
              type="button"
              data-action="math-edit"
              onClick={onEditMath}
              title="Chỉnh sửa nội dung công thức toán"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                boxShadow: "0 3px 12px rgba(37, 99, 235, 0.35)",
              }}
            >
              ✏️ Sửa công thức
            </button>
            <button
              type="button"
              data-action="math-solve"
              onClick={onSolveEquation}
              title="Giải phương trình hoặc hệ phương trình của công thức này"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#7c3aed",
                color: "#ffffff",
                fontWeight: 700,
                boxShadow: "0 3px 12px rgba(124, 58, 237, 0.35)",
              }}
            >
              ⚡ Giải phương trình / Hệ PT
            </button>
          </>
        )}

        {/* Solid3D Unfold (Trải hình phẳng) Button */}
        {selectedCount === 1 && selectedSolidEl && (
          <button
            type="button"
            data-action="solid-unfold"
            onClick={onSolidUnfold}
            title="Trải phẳng tất cả các mặt của hình không gian này ra mặt phẳng 2D"
            style={{
              ...actionBtnStyle,
              border: "none",
              background: "#0891b2",
              color: "#ffffff",
              fontWeight: 700,
              boxShadow: "0 3px 12px rgba(8, 145, 178, 0.35)",
            }}
          >
            📐 Trải phẳng hình (Unfold Net)
          </button>
        )}

        {/* Contextual Point Selection Actions */}
        {isPointsContext && (
          <>
            <button
              type="button"
              data-action="point-rename"
              onClick={onPointRename}
              title="Đổi tên điểm đang chọn (hoặc nhấp đúp trực tiếp vào nhãn tên điểm)"
              style={actionBtnStyle}
            >
              ✎ Đổi tên
            </button>
            <button
              type="button"
              data-action="point-toggle-name"
              onClick={onPointToggleHideName}
              title={allPointNamesHidden ? "Hiện lại tên điểm" : "Ẩn tên điểm khỏi bảng"}
              style={{
                ...actionBtnStyle,
                border: allPointNamesHidden ? "1px solid #2563eb" : "1px solid #cbd5e1",
                background: allPointNamesHidden ? "#eff6ff" : "#ffffff",
                color: allPointNamesHidden ? "#1d4ed8" : "#1e293b",
              }}
            >
              {allPointNamesHidden ? "👁 Hiện tên" : "🙈 Ẩn tên"}
            </button>

            <div data-wb-point-dot-control="true" style={pillGroupStyle}>
              <button
                type="button"
                data-action="point-dot-cycle"
                onClick={onPointCycleDot}
                title="Đổi kiểu chấm điểm (Chấm tròn / Dấu × / Không chấm)"
                style={{ ...pillMiniBtnStyle, color: "#475569" }}
              >
                Chấm: <span style={{ color: "#1e293b", fontWeight: 700 }}>{primaryDotSymbol}</span>
              </button>
              <span style={{ width: 1, height: 16, background: "#e2e8f0", margin: "0 2px" }} />
              <button
                type="button"
                data-action="point-dot-down"
                onClick={() => onPointChangeDotSize?.(-0.25)}
                title="Thu nhỏ dấu chấm điểm"
                style={pillMiniBtnStyle}
              >
                −
              </button>
              <button
                type="button"
                data-action="point-dot-reset"
                onClick={onPointResetDotSize}
                title="Đặt lại cỡ chấm mặc định (150%)"
                style={{ ...pillMiniBtnStyle, minWidth: 44, textAlign: "center", fontWeight: 700 }}
              >
                {dotSizePercent}%
              </button>
              <button
                type="button"
                data-action="point-dot-up"
                onClick={() => onPointChangeDotSize?.(0.25)}
                title="Phóng to dấu chấm điểm"
                style={pillMiniBtnStyle}
              >
                +
              </button>
            </div>

            <div data-wb-point-label-control="true" style={pillGroupStyle}>
              <span style={{ color: "#64748b", fontSize: 13, marginRight: 2 }}>
                Cỡ tên mọi điểm:
              </span>
              <button
                type="button"
                data-action="point-label-down"
                onClick={() =>
                  onChangeLabelScale?.(Math.max(0.5, Number((labelScale - 0.15).toFixed(2))))
                }
                title="Thu nhỏ cỡ tên mọi điểm"
                style={pillMiniBtnStyle}
              >
                A-
              </button>
              <button
                type="button"
                data-action="point-label-reset"
                onClick={() => onChangeLabelScale?.(1)}
                title="Đặt lại cỡ tên mọi điểm 100%"
                style={{ ...pillMiniBtnStyle, minWidth: 44, textAlign: "center", fontWeight: 700 }}
              >
                {labelScalePercent}%
              </button>
              <button
                type="button"
                data-action="point-label-up"
                onClick={() =>
                  onChangeLabelScale?.(Math.min(2.5, Number((labelScale + 0.15).toFixed(2))))
                }
                title="Phóng to cỡ tên mọi điểm"
                style={pillMiniBtnStyle}
              >
                A+
              </button>
            </div>
          </>
        )}

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

        {/* Contextual Axes3D (Oxyz) Primary Actions */}
        {selectedCount === 1 && selectedAxes3D && (
          <>
            <button
              type="button"
              data-action="axes3d-add-point"
              onClick={onAxes3DAddPoint}
              title="Đặt điểm theo toạ độ không gian M(x; y; z)"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: "0 3px 12px rgba(37, 99, 235, 0.35)",
              }}
            >
              + Điểm M(x; y; z)
            </button>
            <button
              type="button"
              data-action="axes3d-add-vector"
              onClick={onAxes3DAddVector}
              title="Vẽ vectơ toạ độ u⃗ = (x; y; z) trong không gian Oxyz"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#0891b2",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: "0 3px 12px rgba(8, 145, 178, 0.35)",
              }}
            >
              + Vectơ u⃗(x; y; z)
            </button>
            <button
              type="button"
              data-action="axes3d-add-plane"
              onClick={onAxes3DAddPlane}
              title="Dựng mặt phẳng Ax + By + Cz + D = 0"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#7c3aed",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: "0 3px 12px rgba(124, 58, 237, 0.35)",
              }}
            >
              ◩ Mặt phẳng (P)
            </button>
            <button
              type="button"
              data-action="axes3d-add-line"
              onClick={onAxes3DAddLine}
              title="Dựng đường thẳng tham số trong không gian qua điểm M và VTCP u⃗"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#059669",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: "0 3px 12px rgba(5, 150, 105, 0.35)",
              }}
            >
              ⁄ Đường thẳng (d)
            </button>
            <button
              type="button"
              data-action="axes3d-add-sphere"
              onClick={onAxes3DAddSphere}
              title="Dựng mặt cầu tâm I(x; y; z) bán kính R"
              style={{
                ...actionBtnStyle,
                border: "none",
                background: "#ea580c",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: "0 3px 12px rgba(234, 88, 12, 0.35)",
              }}
            >
              ◯ Mặt cầu (S)
            </button>
          </>
        )}

        {/* Rotate buttons for 2D/Image elements */}
        {onRotateSelection && !isPointsContext && (
          <>
            <button
              type="button"
              data-action="rotate-ccw"
              onClick={() => onRotateSelection(-15)}
              title="Xoay ngược chiều kim đồng hồ 15°"
              style={actionBtnStyle}
            >
              ↺ Xoay -15°
            </button>
            <button
              type="button"
              data-action="rotate-cw"
              onClick={() => onRotateSelection(15)}
              title="Xoay theo chiều kim đồng hồ 15°"
              style={actionBtnStyle}
            >
              ↻ Xoay +15°
            </button>
            <button
              type="button"
              data-action="rotate-90"
              onClick={() => onRotateSelection(90)}
              title="Xoay góc vuông 90°"
              style={actionBtnStyle}
            >
              ⟳ 90°
            </button>
          </>
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

        {/* Lock Selection onto Paper */}
        {onLockSelection && (
          <button
            type="button"
            data-action="lock-selection"
            onClick={onLockSelection}
            title="Khóa cố định đối tượng vào trang giấy (không thể chọn hay di chuyển)"
            style={{
              ...actionBtnStyle,
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              fontWeight: 600,
            }}
          >
            🔒 Khóa vào trang
          </button>
        )}

        {!isPointsContext && (
          <>
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
          </>
        )}

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
        ) : isPointsContext ? (
          <div ref={moreWrapRef} style={{ position: "relative", display: "inline-flex" }}>
            <button
              type="button"
              data-action="point-more"
              aria-haspopup="menu"
              aria-expanded={moreAxesOpen}
              onClick={() => setMoreAxesOpen((v) => !v)}
              title="Thêm thao tác (Nhân bản, Sao chép, Cắt, Ẩn)"
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
                data-wb-point-menu="true"
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: "calc(100% + 10px)",
                  minWidth: 190,
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
                {[
                  { action: "duplicate", icon: "⧉", label: "Nhân bản", handler: onDuplicate },
                  { action: "copy", icon: "⎘", label: "Sao chép", handler: onCopy },
                  { action: "cut", icon: "✂", label: "Cắt", handler: onCut },
                  { action: "hide", icon: "🙈", label: "Ẩn", handler: onHide },
                ].map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    role="menuitem"
                    data-action={item.action}
                    onClick={() => {
                      setMoreAxesOpen(false);
                      item.handler();
                    }}
                    style={menuItemStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
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

  // Restore hidden or locked elements buttons
  if ((hiddenCount > 0 && onUnhideAll) || (lockedCount > 0 && onUnlockAll)) {
    return (
      <div
        data-export-skip="true"
        style={{
          position: "fixed",
          left: barLeft,
          bottom: 12,
          zIndex: 55,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {hiddenCount > 0 && onUnhideAll && (
          <button
            type="button"
            data-action="unhide-all"
            onClick={onUnhideAll}
            title="Hiện lại mọi hình đã ẩn"
            style={actionBtnStyle}
          >
            👁 Hiện {hiddenCount} hình đã ẩn
          </button>
        )}
        {lockedCount > 0 && onUnlockAll && (
          <button
            type="button"
            data-action="unlock-all"
            onClick={onUnlockAll}
            title="Mở khoá tất cả các khối đang bị khoá vào trang giấy"
            style={{
              ...actionBtnStyle,
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #93c5fd",
              fontWeight: 700,
            }}
          >
            🔓 Mở khoá {lockedCount} khối
          </button>
        )}
      </div>
    );
  }

  return null;
};
