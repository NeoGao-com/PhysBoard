"use client";

import React, { useState } from "react";
import * as Y from "yjs";
import {
  ToolbarVisibilityConfig,
  DEFAULT_TOOLBAR_VISIBILITY,
} from "@/lib/toolbar-config";
import { LaserConfig, DEFAULT_LASER_CONFIG } from "@/lib/laser-config";
import {
  BOARD_FORMAT_OPTIONS,
  BOARD_GRID_SIZE_OPTIONS,
  BOARD_PATTERN_OPTIONS,
  BOARD_SURFACE_PRESETS,
  DEFAULT_PAGE_BOARD_CONFIG,
  type PageBoardConfig,
} from "@/lib/board-themes";
import { exportPNG, downloadBlob } from "@/lib/export";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  // Toolbar Visibility Config
  toolbarConfig: ToolbarVisibilityConfig;
  onChangeToolbarConfig: (cfg: ToolbarVisibilityConfig) => void;
  // Auto return config
  autoSwitchTarget: "select" | "ink" | "off";
  onChangeAutoSwitchTarget: (target: "select" | "ink" | "off") => void;
  // Ink recognizer & Pen only
  inkToShape: boolean;
  onChangeInkToShape: (val: boolean) => void;
  penOnlyMode: boolean;
  onChangePenOnlyMode: (val: boolean) => void;
  // Laser Config
  laserConfig: LaserConfig;
  onChangeLaserConfig: (cfg: LaserConfig) => void;
  // Grid
  gridEnabled: boolean;
  onChangeGridEnabled: (val: boolean) => void;

  // Board settings (from MoreMenu)
  doc?: Y.Doc | null;
  page?: number;
  totalPages?: number;
  getBoardElement?: () => SVGSVGElement | HTMLElement | null;
  hasPaper?: boolean;
  boardConfig?: PageBoardConfig;
  onChangeBoardConfig?: (next: PageBoardConfig) => void;
  onApplyBoardAllPages?: (cfg: PageBoardConfig) => void;

  // Geometry & Point scaling
  onScaleGeometry?: (factor: number) => void;
  labelScale?: number;
  onChangeLabelScale?: (nextScale: number) => void;
  dotScale?: number;
  onChangeDotScale?: (nextScale: number) => void;

  // Utilities & Export
  onOpenExam?: () => void;
  onOpenCommandPalette?: () => void;
  onExportPdf?: () => void;
  onExportTikz?: () => void;
  onOpenJsonModal?: () => void;
}

const SECTION_BOX_STYLE: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 600,
  color: "#1e293b",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const CHECKBOX_LABEL_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
  cursor: "pointer",
  userSelect: "none",
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  toolbarConfig,
  onChangeToolbarConfig,
  autoSwitchTarget,
  onChangeAutoSwitchTarget,
  inkToShape,
  onChangeInkToShape,
  penOnlyMode,
  onChangePenOnlyMode,
  laserConfig,
  onChangeLaserConfig,
  gridEnabled,
  onChangeGridEnabled,
  doc,
  page = 1,
  getBoardElement,
  hasPaper = false,
  boardConfig = DEFAULT_PAGE_BOARD_CONFIG,
  onChangeBoardConfig,
  onApplyBoardAllPages,
  onScaleGeometry,
  labelScale = 1,
  onChangeLabelScale,
  dotScale = 1.5,
  onChangeDotScale,
  onOpenExam,
  onOpenCommandPalette,
  onExportPdf,
  onExportTikz,
  onOpenJsonModal,
}) => {
  const [activeTab, setActiveTab] = useState<
    "general" | "board" | "scale" | "toolbar" | "laser" | "export"
  >("general");
  const [busyPng, setBusyPng] = useState(false);

  // Accordion state for toolbar config groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    selection: false,
    drawing: false,
    plane: false,
    space: false,
    physics: false,
  });

  if (!open) return null;

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetDefaults = () => {
    if (window.confirm("Khôi phục toàn bộ cài đặt thanh công cụ và giao diện về mặc định?")) {
      onChangeToolbarConfig(DEFAULT_TOOLBAR_VISIBILITY);
      onChangeAutoSwitchTarget("select");
      onChangeInkToShape(true);
      onChangePenOnlyMode(false);
      onChangeLaserConfig(DEFAULT_LASER_CONFIG);
      onChangeLabelScale?.(1);
      onChangeDotScale?.(1.5);
    }
  };

  const updateToolbarItem = (key: keyof ToolbarVisibilityConfig, val: boolean) => {
    onChangeToolbarConfig({ ...toolbarConfig, [key]: val });
  };

  const handlePngExport = async () => {
    const el = getBoardElement ? getBoardElement() : null;
    if (!el || !doc) {
      alert("Không tìm thấy bảng vẽ hoặc tài liệu để xuất ảnh!");
      return;
    }
    setBusyPng(true);
    try {
      const blob = await exportPNG(el, doc, page);
      downloadBlob(blob, `physboard-trang-${page}.png`);
    } catch (err) {
      console.error(err);
      alert("Xuất ảnh PNG thất bại: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusyPng(false);
    }
  };

  const labelPercent = Math.round(labelScale * 100);
  const dotPercent = Math.round(dotScale * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-testid="settings-modal"
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
                Cài Đặt Hệ Thống & Thanh Công Cụ
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b" }}>
                Tuỳ chỉnh bảng vẽ, tỉ lệ hình học, thanh công cụ và tính năng PhysBoard
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cài đặt"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              color: "#94a3b8",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
            padding: "0 14px",
            gap: 4,
            overflowX: "auto",
          }}
        >
          {[
            { id: "general", label: "Chung & Thao tác" },
            { id: "board", label: "Khổ & Nền bảng" },
            { id: "scale", label: "Tỉ lệ & Cỡ chữ" },
            { id: "toolbar", label: "Ẩn/Hiện Công cụ" },
            { id: "laser", label: "Bút Laser" },
            { id: "export", label: "Xuất file & Đề thi" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: "10px 12px",
                border: "none",
                borderBottom:
                  activeTab === tab.id ? "2px solid #2563eb" : "2px solid transparent",
                background: "transparent",
                color: activeTab === tab.id ? "#2563eb" : "#64748b",
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: 12.5,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* TAB 1: CHUNG & THAO TÁC */}
          {activeTab === "general" && (
            <>
              {/* Tự động quay lại công cụ */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>🔄</span>
                  <span>Tự động quay lại công cụ sau khi tạo hình hoặc tẩy</span>
                </div>
                <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.4 }}>
                  Khi bạn vẽ xong một hình hoặc tẩy xong nét vẽ, hệ thống sẽ tự động chuyển về công cụ mong muốn:
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="radio"
                      name="autoSwitch"
                      checked={autoSwitchTarget === "select"}
                      onChange={() => onChangeAutoSwitchTarget("select")}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span>Quay lại Con trỏ chọn (Mặc định)</span>
                  </label>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="radio"
                      name="autoSwitch"
                      checked={autoSwitchTarget === "ink"}
                      onChange={() => onChangeAutoSwitchTarget("ink")}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span>Quay lại Bút vẽ</span>
                  </label>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="radio"
                      name="autoSwitch"
                      checked={autoSwitchTarget === "off"}
                      onChange={() => onChangeAutoSwitchTarget("off")}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span>Không tự chuyển (Giữ nguyên)</span>
                  </label>
                </div>
              </div>

              {/* Chế độ cảm ứng bút / tay */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>✍️</span>
                  <span>Chế độ bút Stylus & Vẽ tay</span>
                </div>
                <label style={CHECKBOX_LABEL_STYLE}>
                  <input
                    type="checkbox"
                    checked={penOnlyMode}
                    onChange={(e) => onChangePenOnlyMode(e.target.checked)}
                    style={{ accentColor: "#2563eb" }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>Chế độ chỉ viết bằng bút Stylus (Pen-Only Mode)</div>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>
                      Khi bật, ngón tay chỉ dùng để cuộn, di chuyển bảng và chọn hình; chỉ có bút cảm ứng mới để lại nét mực.
                    </div>
                  </div>
                </label>
              </div>

              {/* Nhận diện hình học tay */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>📐</span>
                  <span>Nhận diện hình vẽ tay (Ink-to-Shape)</span>
                </div>
                <label style={CHECKBOX_LABEL_STYLE}>
                  <input
                    type="checkbox"
                    checked={inkToShape}
                    onChange={(e) => onChangeInkToShape(e.target.checked)}
                    style={{ accentColor: "#2563eb" }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>Tự động nắn thẳng nét vẽ hình học</div>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>
                      Tự động chuyển nét vẽ tự do thành hình tròn, đoạn thẳng, tam giác hoặc hình chữ nhật chuẩn mực.
                    </div>
                  </div>
                </label>
              </div>

              {/* Phím tắt */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>⌘</span>
                  <span>Bảng lệnh & Phím tắt hệ thống</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 12.5, color: "#64748b" }}>
                    Mở nhanh danh sách mọi lệnh, thao tác vẽ và phím tắt phím cứng (Ctrl + K)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCommandPalette?.();
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1e293b",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Xem phím tắt (Ctrl+K)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: KHỔ & NỀN BẢNG VẼ */}
          {activeTab === "board" && (
            <>
              {/* Nền bảng & Màu sắc */}
              <div style={SECTION_BOX_STYLE}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={SECTION_TITLE_STYLE}>
                    <span>🎨</span>
                    <span>Màu nền bảng · Trang {page}</span>
                  </div>
                  {onApplyBoardAllPages && (
                    <button
                      type="button"
                      data-action="board-apply-all"
                      onClick={() => onApplyBoardAllPages(boardConfig)}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        background: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Áp dụng cho mọi trang
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {BOARD_SURFACE_PRESETS.map((preset) => {
                    const selected = boardConfig.surface === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        data-board-surface-option={preset.id}
                        title={preset.label}
                        onClick={() =>
                          onChangeBoardConfig?.({
                            ...boardConfig,
                            surface: preset.id,
                          })
                        }
                        style={{
                          width: 32,
                          height: 28,
                          borderRadius: 6,
                          background: preset.bg,
                          borderWidth: selected ? 2 : 1,
                          borderStyle: "solid",
                          borderColor: selected ? "#2563eb" : "#cbd5e1",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: preset.isDark ? "#f8fafc" : "#1e293b",
                          fontSize: 12,
                          fontWeight: 700,
                          boxShadow: selected ? "0 0 0 2px rgba(37, 99, 235, 0.25)" : "none",
                        }}
                      >
                        {selected ? "✓" : ""}
                      </button>
                    );
                  })}

                  <label
                    title="Chọn màu nền bảng tuỳ ý"
                    style={{
                      position: "relative",
                      width: 32,
                      height: 28,
                      borderRadius: 6,
                      background:
                        "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                      borderWidth: boardConfig.surface === "custom" ? 2 : 1,
                      borderStyle: "solid",
                      borderColor: boardConfig.surface === "custom" ? "#2563eb" : "#cbd5e1",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 700,
                      textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                    }}
                  >
                    +
                    <input
                      type="color"
                      data-testid="board-custom-bg"
                      aria-label="Màu nền bảng tuỳ ý"
                      value={boardConfig.customBg ?? "#f0fdf4"}
                      onChange={(e) =>
                        onChangeBoardConfig?.({
                          ...boardConfig,
                          surface: "custom",
                          customBg: e.target.value,
                        })
                      }
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        width: "100%",
                        height: "100%",
                        cursor: "pointer",
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Kiểu kẻ bảng & Lưới */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>📏</span>
                  <span>Kiểu lưới / Dòng kẻ bảng</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {BOARD_PATTERN_OPTIONS.map((pat) => {
                    const selected = boardConfig.pattern === pat.id;
                    return (
                      <button
                        key={pat.id}
                        type="button"
                        data-board-pattern-option={pat.id}
                        onClick={() => {
                          onChangeBoardConfig?.({
                            ...boardConfig,
                            pattern: pat.id,
                          });
                          if (pat.id !== "none") onChangeGridEnabled(true);
                        }}
                        style={{
                          height: 28,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: selected ? "#2563eb" : "#e2e8f0",
                          background: selected ? "#eff6ff" : "#ffffff",
                          color: selected ? "#1d4ed8" : "#334155",
                          fontSize: 12,
                          fontWeight: selected ? 600 : 500,
                          cursor: "pointer",
                        }}
                      >
                        {pat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Grid size */}
                {boardConfig.pattern !== "none" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Cỡ ô:</span>
                    {BOARD_GRID_SIZE_OPTIONS.map((sz) => {
                      const selected = boardConfig.gridSize === sz.id;
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          data-board-size-option={sz.id}
                          onClick={() =>
                            onChangeBoardConfig?.({
                              ...boardConfig,
                              gridSize: sz.id,
                            })
                          }
                          style={{
                            flex: 1,
                            height: 24,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: selected ? "#2563eb" : "#e2e8f0",
                            background: selected ? "#eff6ff" : "#ffffff",
                            color: selected ? "#1d4ed8" : "#475569",
                            fontSize: 11.5,
                            fontWeight: selected ? 600 : 500,
                            cursor: "pointer",
                          }}
                        >
                          {sz.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Khổ bảng */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>📄</span>
                  <span>Khổ bảng / Khổ giấy</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {BOARD_FORMAT_OPTIONS.map((fmt) => {
                    const currentFormat = boardConfig.format ?? "infinite";
                    const selected = currentFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        data-board-format-option={fmt.id}
                        title={fmt.desc}
                        onClick={() =>
                          onChangeBoardConfig?.({
                            ...boardConfig,
                            format: fmt.id,
                          })
                        }
                        style={{
                          height: 30,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: selected ? "#2563eb" : "#e2e8f0",
                          background: selected ? "#eff6ff" : "#ffffff",
                          color: selected ? "#1d4ed8" : "#475569",
                          fontSize: 12,
                          fontWeight: selected ? 600 : 500,
                          cursor: "pointer",
                        }}
                      >
                        {fmt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: TỈ LỆ & CỠ CHỮ */}
          {activeTab === "scale" && (
            <>
              {/* Giãn / Thu toàn bộ hình */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>⤢</span>
                  <span>Thu phóng toàn bộ hình vẽ trên trang</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    data-action="scale-up"
                    onClick={() => onScaleGeometry?.(1.2)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>⤢</span>
                    <span>Giãn hình to (+20%)</span>
                  </button>
                  <button
                    type="button"
                    data-action="scale-down"
                    onClick={() => onScaleGeometry?.(1 / 1.2)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>⤡</span>
                    <span>Thu hình nhỏ (-20%)</span>
                  </button>
                </div>
              </div>

              {/* Cỡ tên mọi điểm */}
              <div data-setting="label-size" style={SECTION_BOX_STYLE}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={SECTION_TITLE_STYLE}>
                    <span>🔤</span>
                    <span>Cỡ tên mọi điểm (Label Scale)</span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563eb" }}>
                    {labelPercent}%
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    data-action="label-size-down"
                    onClick={() =>
                      onChangeLabelScale?.(
                        Math.max(0.5, Number((labelScale - 0.15).toFixed(2)))
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    A− Nhỏ hơn
                  </button>
                  <button
                    type="button"
                    data-action="label-size-reset"
                    onClick={() => onChangeLabelScale?.(1)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ↺ 100%
                  </button>
                  <button
                    type="button"
                    data-action="label-size-up"
                    onClick={() =>
                      onChangeLabelScale?.(
                        Math.min(2.5, Number((labelScale + 0.15).toFixed(2)))
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    A+ To hơn
                  </button>
                </div>
              </div>

              {/* Cỡ chấm mọi điểm */}
              <div data-setting="dot-size" style={SECTION_BOX_STYLE}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={SECTION_TITLE_STYLE}>
                    <span>●</span>
                    <span>Cỡ chấm mọi điểm (Dot Scale)</span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563eb" }}>
                    {dotPercent}%
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    data-action="dot-size-down"
                    onClick={() =>
                      onChangeDotScale?.(
                        Math.max(0.5, Number((dotScale - 0.2).toFixed(2)))
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    · Chấm nhỏ
                  </button>
                  <button
                    type="button"
                    data-action="dot-size-reset"
                    onClick={() => onChangeDotScale?.(1.5)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ↺ 150% (Gốc)
                  </button>
                  <button
                    type="button"
                    data-action="dot-size-up"
                    onClick={() =>
                      onChangeDotScale?.(
                        Math.min(3.0, Number((dotScale + 0.2).toFixed(2)))
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ● Chấm to
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TAB 4: ẨN / HIỆN THANH CÔNG CỤ */}
          {activeTab === "toolbar" && (
            <>
              <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 2 }}>
                Đánh dấu các tính năng bạn muốn xuất hiện trên thanh công cụ chính:
              </div>

              {/* Nhóm 1: Chọn, Tẩy, Hoàn tác */}
              <div style={SECTION_BOX_STYLE}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="checkbox"
                      checked={toolbarConfig.groupSelection}
                      onChange={(e) => updateToolbarItem("groupSelection", e.target.checked)}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>Nhóm Chọn, Tẩy & Hoàn tác</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand("selection")}
                    style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                  >
                    {expandedGroups.selection ? "▲ Thu gọn" : "▼ Chi tiết"}
                  </button>
                </div>

                {expandedGroups.selection && (
                  <div style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolSelect}
                        onChange={(e) => updateToolbarItem("toolSelect", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Con trỏ chọn & Di chuyển (Select)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolMarquee}
                        onChange={(e) => updateToolbarItem("toolMarquee", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Quét vùng chọn (Marquee)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolEraser}
                        onChange={(e) => updateToolbarItem("toolEraser", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Tẩy xoá nét vẽ (Eraser)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolTrash}
                        onChange={(e) => updateToolbarItem("toolTrash", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Nút Xoá hình đã chọn (Delete)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolUndoRedo}
                        onChange={(e) => updateToolbarItem("toolUndoRedo", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Nút Hoàn tác & Làm lại (Undo / Redo)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Nhóm 2: Bút vẽ & Công thức & PDF */}
              <div style={SECTION_BOX_STYLE}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="checkbox"
                      checked={toolbarConfig.groupDrawing}
                      onChange={(e) => updateToolbarItem("groupDrawing", e.target.checked)}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>Nhóm Bút vẽ, Công thức & Chèn PDF</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand("drawing")}
                    style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                  >
                    {expandedGroups.drawing ? "▲ Thu gọn" : "▼ Chi tiết"}
                  </button>
                </div>

                {expandedGroups.drawing && (
                  <div style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolPen}
                        onChange={(e) => updateToolbarItem("toolPen", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Menu Bút vẽ (Bút kim, Bút chì, Bút dạ quang, Bút lông...)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolFormula}
                        onChange={(e) => updateToolbarItem("toolFormula", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Soạn Công thức Toán học (MathLive)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolInsertPdf}
                        onChange={(e) => updateToolbarItem("toolInsertPdf", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Nút Chèn file PDF</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Nhóm 3: Hình học phẳng & Tô màu */}
              <div style={SECTION_BOX_STYLE}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="checkbox"
                      checked={toolbarConfig.groupPlaneGeometry}
                      onChange={(e) => updateToolbarItem("groupPlaneGeometry", e.target.checked)}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>Nhóm Hình học phẳng (Điểm, Đoạn, Tam giác, Đa giác...)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand("plane")}
                    style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                  >
                    {expandedGroups.plane ? "▲ Thu gọn" : "▼ Chi tiết"}
                  </button>
                </div>

                {expandedGroups.plane && (
                  <div style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolPoint}
                        onChange={(e) => updateToolbarItem("toolPoint", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Điểm (Point)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolSegment}
                        onChange={(e) => updateToolbarItem("toolSegment", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Đoạn thẳng / Đường thẳng / Vectơ</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolCircle}
                        onChange={(e) => updateToolbarItem("toolCircle", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Đường tròn (Circle)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolPolygon}
                        onChange={(e) => updateToolbarItem("toolPolygon", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Đa giác (Polygon)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolPlaneMenu}
                        onChange={(e) => updateToolbarItem("toolPlaneMenu", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Menu dựng hình phẳng nâng cao (Trọng tâm, Trực tâm, Tiếp tuyến...)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolFill}
                        onChange={(e) => updateToolbarItem("toolFill", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Tô màu diện tích (Flood Fill)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Nhóm 4: Hình không gian & Đồ thị */}
              <div style={SECTION_BOX_STYLE}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="checkbox"
                      checked={toolbarConfig.groupSpaceGeometry}
                      onChange={(e) => updateToolbarItem("groupSpaceGeometry", e.target.checked)}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>Nhóm Hình không gian & Hàm số</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand("space")}
                    style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                  >
                    {expandedGroups.space ? "▲ Thu gọn" : "▼ Chi tiết"}
                  </button>
                </div>

                {expandedGroups.space && (
                  <div style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolSpaceMenu}
                        onChange={(e) => updateToolbarItem("toolSpaceMenu", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Hình không gian 3D (Chóp, Lăng trụ, Cầu, Nón, Trục Oxyz, Trải hình...)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolFunctionsMenu}
                        onChange={(e) => updateToolbarItem("toolFunctionsMenu", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Hàm số & Bảng biến thiên & Thanh trượt Slider</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolStatsMenu}
                        onChange={(e) => updateToolbarItem("toolStatsMenu", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Thống kê & Xác suất Bayes</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Nhóm 5: Vật lý & Dụng cụ */}
              <div style={SECTION_BOX_STYLE}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="checkbox"
                      checked={toolbarConfig.groupPhysics}
                      onChange={(e) => updateToolbarItem("groupPhysics", e.target.checked)}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>Nhóm Vật lý & Dụng cụ & Máy tính</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand("physics")}
                    style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                  >
                    {expandedGroups.physics ? "▲ Thu gọn" : "▼ Chi tiết"}
                  </button>
                </div>

                {expandedGroups.physics && (
                  <div style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolPhysics}
                        onChange={(e) => updateToolbarItem("toolPhysics", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Mô phỏng Thí nghiệm Vật lý & Mạch điện & Quang học</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolRealWorld}
                        onChange={(e) => updateToolbarItem("toolRealWorld", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Hình minh hoạ thực tế (Cây, Tàu xe, Tháp ngọn hải đăng...)</span>
                    </label>
                    <label style={CHECKBOX_LABEL_STYLE}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.toolCalculator}
                        onChange={(e) => updateToolbarItem("toolCalculator", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Máy tính cầm tay bỏ túi (fx-580VN X)</span>
                    </label>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 5: BÚT LASER */}
          {activeTab === "laser" && (
            <>
              {/* Chế độ vệt / chấm */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>🎯</span>
                  <span>Chế độ hiển thị Laser</span>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="radio"
                      name="laserMode"
                      checked={laserConfig.mode === "trail"}
                      onChange={() => onChangeLaserConfig({ ...laserConfig, mode: "trail" })}
                      style={{ accentColor: "#ef4444" }}
                    />
                    <span>Vệt sáng laser lướt qua (mờ dần sau 1.5s)</span>
                  </label>
                  <label style={CHECKBOX_LABEL_STYLE}>
                    <input
                      type="radio"
                      name="laserMode"
                      checked={laserConfig.mode === "dot"}
                      onChange={() => onChangeLaserConfig({ ...laserConfig, mode: "dot" })}
                      style={{ accentColor: "#ef4444" }}
                    />
                    <span>Chấm laser cố định theo đầu bút</span>
                  </label>
                </div>
              </div>

              {/* Kích thước */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>📏</span>
                  <span>Kích thước Laser</span>
                </div>
                {laserConfig.mode === "dot" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Kích thước dấu chấm:</span>
                      <span style={{ fontWeight: 600, color: "#2563eb" }}>{laserConfig.dotSize} px</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={48}
                      step={2}
                      value={laserConfig.dotSize}
                      onChange={(e) => onChangeLaserConfig({ ...laserConfig, dotSize: Number(e.target.value) })}
                      style={{ accentColor: "#2563eb" }}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Độ rộng vệt laser:</span>
                      <span style={{ fontWeight: 600, color: "#2563eb" }}>{laserConfig.trailWidth} px</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={16}
                      step={1}
                      value={laserConfig.trailWidth}
                      onChange={(e) => onChangeLaserConfig({ ...laserConfig, trailWidth: Number(e.target.value) })}
                      style={{ accentColor: "#2563eb" }}
                    />
                  </div>
                )}
              </div>

              {/* Màu sắc */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>🎨</span>
                  <span>Màu sắc Laser</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#a855f7"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onChangeLaserConfig({ ...laserConfig, color })}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: color,
                        border: laserConfig.color === color ? "3px solid #0f172a" : "2px solid #ffffff",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 6: XUẤT FILE & ĐỀ THI */}
          {activeTab === "export" && (
            <>
              {/* Soạn đề thi */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>📄</span>
                  <span>Chế độ soạn thảo Đề thi & Phiếu bài tập A4</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 12.5, color: "#64748b" }}>
                    Khổ giấy chuẩn in ấn A4, chia cột và chèn câu hỏi toán học/vật lý trắc nghiệm
                  </div>
                  <button
                    type="button"
                    data-action="open-exam"
                    onClick={() => {
                      onClose();
                      onOpenExam?.();
                    }}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#2563eb",
                      color: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {hasPaper ? "Mở đề thi" : "Soạn đề thi khổ A4"}
                  </button>
                </div>
              </div>

              {/* Xuất file */}
              <div style={SECTION_BOX_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  <span>💾</span>
                  <span>Tải về & Xuất dữ liệu</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  <button
                    type="button"
                    data-action="export-pdf"
                    onClick={() => {
                      onClose();
                      onExportPdf?.();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1e293b",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>📑</span>
                    <span>Xuất file PDF (Chọn trang)</span>
                  </button>

                  <button
                    type="button"
                    data-action="export-png"
                    disabled={busyPng}
                    onClick={handlePngExport}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1e293b",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>🖼️</span>
                    <span>{busyPng ? "Đang xuất PNG…" : "Xuất ảnh PNG trang này"}</span>
                  </button>

                  <button
                    type="button"
                    data-action="export-tikz"
                    onClick={() => {
                      onClose();
                      onExportTikz?.();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1e293b",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>📐</span>
                    <span>Xuất mã TikZ (LaTeX)</span>
                  </button>

                  <button
                    type="button"
                    data-action="export-json"
                    onClick={() => {
                      onClose();
                      onOpenJsonModal?.();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1e293b",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>💾</span>
                    <span>Lưu / Nạp file JSON</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 22px",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#dc2626",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ↺ Khôi phục mặc định
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 20px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};
