"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CanvasElement } from "@/types/whiteboard";
import type { SolidSubSelection } from "@/lib/geometry3d";

export interface SelectionBarProps {
  selectedCount: number;
  hiddenCount?: number;
  selectedAxes2D?: CanvasElement | null;
  selectedPhysicsEl?: CanvasElement | null;
  selectedPoints?: CanvasElement[];
  selectedSolidSubPart?: SolidSubSelection | null;
  isSolidFaceFilled?: boolean;
  isSolidEdgeMeasured?: boolean;
  labelScale?: number;
  dotScale?: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onCut: () => void;
  onHide: () => void;
  onUnhideAll?: () => void;
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
  onUpdateInstrumentProps?: (id: string, patch: Record<string, unknown>) => void;
  onSolidFaceFlatten?: () => void;
  onSolidFaceFill?: () => void;
  onSolidFaceExtendPlane?: () => void;
  onSolidFaceCenter?: () => void;
  onSolidEdgeMeasure?: () => void;
  onSolidEdgeMidpoint?: () => void;
  onSolidEdgePoint?: () => void;
  onSolidEdgePerpBisector?: () => void;
  onSolidSelectWhole?: () => void;
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
  fontFamily: "system-ui, -apple-system, sans-serif",
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
  selectedAxes2D = null,
  selectedPhysicsEl = null,
  selectedPoints = [],
  selectedSolidSubPart = null,
  isSolidFaceFilled = false,
  isSolidEdgeMeasured = false,
  labelScale = 1,
  dotScale = 1.5,
  onDelete,
  onDuplicate,
  onCopy,
  onCut,
  onHide,
  onUnhideAll,
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
  onUpdateInstrumentProps,
  onSolidFaceFlatten,
  onSolidFaceFill,
  onSolidFaceExtendPlane,
  onSolidFaceCenter,
  onSolidEdgeMeasure,
  onSolidEdgeMidpoint,
  onSolidEdgePoint,
  onSolidEdgePerpBisector,
  onSolidSelectWhole,
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
              fontFamily: "system-ui, -apple-system, sans-serif",
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
            fontSize: 15,
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 4px 16px rgba(220,38,38,0.45)",
          }}
        >
          🗑 Xoá{selectedCount > 1 ? ` (${selectedCount})` : ""}
        </button>

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

              {/* SetSquare angle mode switch */}
              {selectedPhysicsEl.props.instrumentKind === "setsquare" && (
                <button
                  type="button"
                  data-action="switch-setsquare-kind"
                  onClick={() => {
                    const current = selectedPhysicsEl.props.setSquareKind;
                    const next = current === "30-60-90" ? "45-45-90" : "30-60-90";
                    onUpdateInstrumentProps?.(selectedPhysicsEl.id, { setSquareKind: next });
                  }}
                  style={{
                    ...actionBtnStyle,
                    background: "#fef3c7",
                    color: "#92400e",
                    fontWeight: 600,
                  }}
                >
                  📐 {selectedPhysicsEl.props.setSquareKind === "30-60-90" ? "Đổi sang 45°–45°" : "Đổi sang 30°–60°"}
                </button>
              )}

              {/* Protractor 180 / 360 mode switch */}
              {selectedPhysicsEl.props.instrumentKind === "protractor" && (
                <>
                  <button
                    type="button"
                    data-action="switch-protractor-type"
                    onClick={() => {
                      const is360 = selectedPhysicsEl.props.protractorType === "360";
                      onUpdateInstrumentProps?.(selectedPhysicsEl.id, {
                        protractorType: is360 ? "180" : "360",
                      });
                    }}
                    style={{
                      ...actionBtnStyle,
                      background: "#e0f2fe",
                      color: "#0369a1",
                      fontWeight: 600,
                    }}
                  >
                    🔄 {selectedPhysicsEl.props.protractorType === "360" ? "Đổi sang 180°" : "Đổi sang 360°"}
                  </button>
                  <button
                    type="button"
                    data-action="step-protractor-angle"
                    onClick={() => {
                      const cur = Number(selectedPhysicsEl.props.protractorAngle ?? 45);
                      onUpdateInstrumentProps?.(selectedPhysicsEl.id, {
                        protractorAngle: (cur + 15) % (selectedPhysicsEl.props.protractorType === "360" ? 360 : 180),
                      });
                    }}
                    style={actionBtnStyle}
                    title="Thay đổi góc đo trên thước"
                  >
                    Đo góc +15°
                  </button>
                </>
              )}

              {/* Compass radius adjustment */}
              {selectedPhysicsEl.props.instrumentKind === "compass" && (
                <>
                  <button
                    type="button"
                    data-action="compass-radius-dec"
                    onClick={() => {
                      const cur = Number(selectedPhysicsEl.props.compassRadius ?? 3.0);
                      onUpdateInstrumentProps?.(selectedPhysicsEl.id, {
                        compassRadius: Math.max(1.0, Number((cur - 0.5).toFixed(1))),
                      });
                    }}
                    style={actionBtnStyle}
                  >
                    R -0.5cm
                  </button>
                  <button
                    type="button"
                    data-action="compass-radius-inc"
                    onClick={() => {
                      const cur = Number(selectedPhysicsEl.props.compassRadius ?? 3.0);
                      onUpdateInstrumentProps?.(selectedPhysicsEl.id, {
                        compassRadius: Math.min(8.0, Number((cur + 0.5).toFixed(1))),
                      });
                    }}
                    style={actionBtnStyle}
                  >
                    R +0.5cm
                  </button>
                </>
              )}
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
