"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Y from "yjs";
import { downloadBlob, exportPDF, exportPNG } from "@/lib/export";
import {
  BOARD_FORMAT_OPTIONS,
  BOARD_GRID_SIZE_OPTIONS,
  BOARD_PATTERN_OPTIONS,
  BOARD_SURFACE_PRESETS,
  DEFAULT_PAGE_BOARD_CONFIG,
  type PageBoardConfig,
} from "@/lib/board-themes";

export interface MoreMenuProps {
  doc?: Y.Doc | null;
  page?: number;
  getBoardElement?: () => SVGSVGElement | HTMLElement | null;
  hasPaper?: boolean;
  labelScale?: number;
  dotScale?: number;
  boardConfig?: PageBoardConfig;
  onChangeBoardConfig?: (next: PageBoardConfig) => void;
  onApplyBoardAllPages?: (cfg: PageBoardConfig) => void;
  onScaleGeometry?: (factor: number) => void;
  onChangeLabelScale?: (nextScale: number) => void;
  onChangeDotScale?: (nextScale: number) => void;
  onOpenExam?: () => void;
  onOpenCommandPalette?: () => void;
  onExportPng?: () => void | Promise<void>;
  onExportPdf?: () => void | Promise<void>;
  onExportTikz?: () => void;
  onOpenJsonModal?: () => void;
  buttonStyle?: React.CSSProperties;
  penOnlyMode?: boolean;
  onTogglePenOnly?: (enabled: boolean) => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({
  doc,
  page = 1,
  getBoardElement,
  hasPaper = false,
  labelScale = 1,
  dotScale = 1.5,
  boardConfig = DEFAULT_PAGE_BOARD_CONFIG,
  onChangeBoardConfig,
  onApplyBoardAllPages,
  onScaleGeometry,
  onChangeLabelScale,
  onChangeDotScale,
  onOpenExam,
  onOpenCommandPalette,
  onExportPng,
  onExportPdf,
  onExportTikz,
  onOpenJsonModal,
  buttonStyle,
  penOnlyMode = false,
  onTogglePenOnly,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [busyExport, setBusyExport] = useState<"png" | "pdf" | null>(null);
  const [pdfWhitePaper, setPdfWhitePaper] = useState<boolean>(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !btnRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
      });
      setIsOpen(true);
    }
  };

  const handlePngClick = async () => {
    setBusyExport("png");
    try {
      if (onExportPng) {
        await onExportPng();
      } else if (doc) {
        const el = getBoardElement?.() ?? document.querySelector<SVGSVGElement>('svg[data-wb-canvas="true"]');
        const blob = await exportPNG(el, doc, page);
        downloadBlob(blob, "physboard-bang-ve.png");
      }
    } finally {
      setBusyExport(null);
      setIsOpen(false);
    }
  };

  const handlePdfClick = async () => {
    setBusyExport("pdf");
    try {
      if (onExportPdf) {
        await onExportPdf();
      } else if (doc) {
        const el = getBoardElement?.() ?? document.querySelector<SVGSVGElement>('svg[data-wb-canvas="true"]');
        const blob = await exportPDF(el, doc, page, { whitePaper: pdfWhitePaper });
        downloadBlob(blob, "physboard-bang-ve.pdf");
      }
    } finally {
      setBusyExport(null);
      setIsOpen(false);
    }
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.03em",
    color: "#94a3b8",
    padding: "6px 8px 3px",
    textTransform: "uppercase",
    userSelect: "none",
  };

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "5px 8px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#1e293b",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
  };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    background: "#f1f5f9",
    margin: "4px 0",
  };

  const labelPercent = Math.round(labelScale * 100);
  const dotPercent = Math.round(dotScale * 100);

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={btnRef}
        type="button"
        data-action="more"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Tuỳ chọn khác"
        title="Tuỳ chọn khác"
        onClick={toggleMenu}
        style={{
          height: 28,
          minWidth: 28,
          padding: "0 7px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: "none",
          background: isOpen ? "#e8f0fe" : "transparent",
          color: isOpen ? "#1a73e8" : "#334155",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          userSelect: "none",
          ...buttonStyle,
        }}
      >
        ⋯
      </button>

      {isOpen &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            data-wb-more-menu="true"
            className="wb-more-menu"
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              zIndex: 5100,
              width: 244,
              maxHeight: "calc(100vh - 68px)",
              overflowY: "auto",
              background: "#ffffff",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "#e2e8f0",
              borderRadius: 10,
              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.16)",
              padding: "6px 8px 8px",
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {/* Section: LOẠI BẢNG */}
            <div data-setting="board-type" style={{ paddingBottom: 4 }}>
              <div
                style={{
                  ...sectionHeaderStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>LOẠI BẢNG · TRANG {page}</span>
                {onApplyBoardAllPages && (
                  <button
                    type="button"
                    data-action="board-apply-all"
                    onClick={() => onApplyBoardAllPages(boardConfig)}
                    title="Áp dụng loại bảng này cho tất cả các trang"
                    style={{
                      borderWidth: 0,
                      background: "transparent",
                      color: "#2563eb",
                      fontSize: 10.5,
                      fontWeight: 600,
                      textTransform: "none",
                      letterSpacing: "normal",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Áp dụng tất cả
                  </button>
                )}
              </div>

              {/* Surface presets + custom bg */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 6px 6px",
                }}
              >
                {BOARD_SURFACE_PRESETS.map((preset) => {
                  const selected = boardConfig.surface === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-board-surface-option={preset.id}
                      aria-label={preset.label}
                      title={preset.label}
                      onClick={() =>
                        onChangeBoardConfig?.({
                          ...boardConfig,
                          surface: preset.id,
                        })
                      }
                      style={{
                        width: 28,
                        height: 24,
                        borderRadius: 6,
                        background: preset.bg,
                        borderWidth: selected ? 2 : 1,
                        borderStyle: "solid",
                        borderColor: selected ? "#2563eb" : preset.previewBorder,
                        cursor: "pointer",
                        boxShadow: selected
                          ? "0 0 0 2px rgba(37, 99, 235, 0.2)"
                          : "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: preset.isDark ? "#f8fafc" : "#1e293b",
                        fontSize: 11,
                        fontWeight: 700,
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
                    width: 28,
                    height: 24,
                    borderRadius: 6,
                    background:
                      "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                    borderWidth: boardConfig.surface === "custom" ? 2 : 1,
                    borderStyle: "solid",
                    borderColor:
                      boardConfig.surface === "custom" ? "#2563eb" : "#cbd5e1",
                    cursor: "pointer",
                    overflow: "hidden",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: 12,
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

              {/* Pattern options */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 4,
                  padding: "0 6px 6px",
                }}
              >
                {BOARD_PATTERN_OPTIONS.map((pat) => {
                  const selected = boardConfig.pattern === pat.id;
                  return (
                    <button
                      key={pat.id}
                      type="button"
                      data-board-pattern-option={pat.id}
                      onClick={() =>
                        onChangeBoardConfig?.({
                          ...boardConfig,
                          pattern: pat.id,
                        })
                      }
                      style={{
                        height: 24,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: selected ? "#2563eb" : "#e2e8f0",
                        background: selected ? "#eff6ff" : "#f8fafc",
                        color: selected ? "#1d4ed8" : "#334155",
                        fontSize: 11.5,
                        fontWeight: selected ? 600 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {pat.label}
                    </button>
                  );
                })}
              </div>

              {/* Grid size options */}
              {boardConfig.pattern !== "none" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "0 6px 4px",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#64748b", marginRight: 2 }}>
                    Cỡ ô:
                  </span>
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
                          height: 22,
                          borderRadius: 5,
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: selected ? "#2563eb" : "#e2e8f0",
                          background: selected ? "#eff6ff" : "#ffffff",
                          color: selected ? "#1d4ed8" : "#475569",
                          fontSize: 11,
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

              {/* Page Format (A4 Portrait, A4 Landscape, Infinite) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 6px 6px",
                  borderTop: "1px dashed #e2e8f0",
                  marginTop: 4,
                }}
              >
                <span style={{ fontSize: 11, color: "#64748b", marginRight: 2, flexShrink: 0 }}>
                  Khổ:
                </span>
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
                        flex: 1,
                        height: 24,
                        borderRadius: 5,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: selected ? "#2563eb" : "#e2e8f0",
                        background: selected ? "#eff6ff" : "#ffffff",
                        color: selected ? "#1d4ed8" : "#475569",
                        fontSize: 11,
                        fontWeight: selected ? 600 : 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={dividerStyle} />

            {/* Section: HÌNH */}
            <div style={sectionHeaderStyle}>HÌNH</div>
            <button
              type="button"
              role="menuitem"
              data-action="scale-up"
              onClick={() => onScaleGeometry?.(1.2)}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>⤢</span>
              <span>Giãn hình</span>
            </button>
            <button
              type="button"
              role="menuitem"
              data-action="scale-down"
              onClick={() => onScaleGeometry?.(1 / 1.2)}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>⤡</span>
              <span>Thu hình</span>
            </button>

            <div style={dividerStyle} />

            {/* Section: CỠ TÊN MỌI ĐIỂM */}
            <div data-setting="label-size">
              <div style={sectionHeaderStyle}>CỠ TÊN MỌI ĐIỂM · {labelPercent}%</div>
              <button
                type="button"
                role="menuitem"
                data-action="label-size-up"
                onClick={() =>
                  onChangeLabelScale?.(
                    Math.min(2.5, Number((labelScale + 0.15).toFixed(2)))
                  )
                }
                style={itemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>A+</span>
                <span>Tên điểm to hơn</span>
              </button>
              <button
                type="button"
                role="menuitem"
                data-action="label-size-down"
                onClick={() =>
                  onChangeLabelScale?.(
                    Math.max(0.5, Number((labelScale - 0.15).toFixed(2)))
                  )
                }
                style={itemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>A−</span>
                <span>Tên điểm nhỏ hơn</span>
              </button>
              <button
                type="button"
                role="menuitem"
                data-action="label-size-reset"
                onClick={() => onChangeLabelScale?.(1)}
                style={itemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>↺</span>
                <span>Cỡ gốc 100%</span>
              </button>
            </div>

            <div style={dividerStyle} />

            {/* Section: CỠ CHẤM MỌI ĐIỂM */}
            <div data-setting="dot-size">
              <div style={sectionHeaderStyle}>CỠ CHẤM MỌI ĐIỂM · {dotPercent}%</div>
              <button
                type="button"
                role="menuitem"
                data-action="dot-size-up"
                onClick={() =>
                  onChangeDotScale?.(
                    Math.min(3.0, Number((dotScale + 0.2).toFixed(2)))
                  )
                }
                style={itemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>●</span>
                <span>Chấm to hơn</span>
              </button>
              <button
                type="button"
                role="menuitem"
                data-action="dot-size-down"
                onClick={() =>
                  onChangeDotScale?.(
                    Math.max(0.5, Number((dotScale - 0.2).toFixed(2)))
                  )
                }
                style={itemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>·</span>
                <span>Chấm nhỏ hơn</span>
              </button>
              <button
                type="button"
                role="menuitem"
                data-action="dot-size-reset"
                onClick={() => onChangeDotScale?.(1.5)}
                style={itemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>↺</span>
                <span>Cỡ mặc định 150%</span>
              </button>
            </div>

            <div style={dividerStyle} />

            {/* Section: CHẾ ĐỘ BÚT VÀ CẢM ỨNG TAY */}
            <div style={sectionHeaderStyle}>CHẾ ĐỘ TƯƠNG TÁC</div>
            <button
              type="button"
              role="menuitem"
              data-action="toggle-pen-only"
              onClick={() => {
                onTogglePenOnly?.(!penOnlyMode);
              }}
              style={{
                ...itemStyle,
                justifyContent: "space-between",
                background: penOnlyMode ? "#eff6ff" : "transparent",
                color: penOnlyMode ? "#1d4ed8" : "#1e293b",
                fontWeight: penOnlyMode ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = penOnlyMode ? "#dbeafe" : "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = penOnlyMode ? "#eff6ff" : "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15 }}>{penOnlyMode ? "✍️" : "🖐️"}</span>
                <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                  <span>Chỉ viết bằng bút Stylus</span>
                  <span style={{ fontSize: 10.5, color: "#64748b", fontWeight: 400 }}>
                    {penOnlyMode
                      ? "Tay chỉ chọn, kéo di chuyển, thu phóng bảng"
                      : "Tay và bút đều có thể vẽ tự do"}
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 10,
                  background: penOnlyMode ? "#2563eb" : "#e2e8f0",
                  color: penOnlyMode ? "#ffffff" : "#475569",
                  fontWeight: 700,
                }}
              >
                {penOnlyMode ? "BẬT" : "TẮT"}
              </span>
            </button>

            <div style={dividerStyle} />

            {/* Section: LỆNH & PHÍM TẮT */}
            <div style={sectionHeaderStyle}>PHÍM TẮT</div>
            <button
              type="button"
              role="menuitem"
              data-action="open-command-palette"
              onClick={() => {
                setIsOpen(false);
                onOpenCommandPalette?.();
              }}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>⌘</span>
              <span>Cửa sổ lệnh & Phím tắt (Ctrl+K)</span>
            </button>

            <div style={dividerStyle} />

            {/* Section: ĐỀ THI */}
            <div style={sectionHeaderStyle}>ĐỀ THI</div>
            <button
              type="button"
              role="menuitem"
              data-action="open-exam"
              onClick={() => {
                setIsOpen(false);
                onOpenExam?.();
              }}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>📄</span>
              <span>{hasPaper ? "Mở đề thi" : "Soạn đề thi khổ A4"}</span>
            </button>

            <div style={dividerStyle} />

            {/* Section: TẢI VỀ */}
            <div style={sectionHeaderStyle}>TẢI VỀ</div>
            <button
              type="button"
              role="menuitem"
              data-action="export-png"
              disabled={busyExport !== null}
              onClick={handlePngClick}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>⬇</span>
              <span>{busyExport === "png" ? "Đang xuất PNG…" : "Ảnh PNG"}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              data-action="export-pdf"
              disabled={busyExport !== null}
              onClick={handlePdfClick}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>⬇</span>
              <span>{busyExport === "pdf" ? "Đang xuất PDF…" : "PDF"}</span>
            </button>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px 6px",
                fontSize: 11.5,
                color: "#475569",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                data-testid="pdf-white-paper"
                checked={pdfWhitePaper}
                onChange={(e) => setPdfWhitePaper(e.target.checked)}
              />
              <span>In PDF trên nền trắng</span>
            </label>
            <button
              type="button"
              role="menuitem"
              data-action="export-tikz"
              onClick={() => {
                setIsOpen(false);
                onExportTikz?.();
              }}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>⬇</span>
              <span>Code TikZ (LaTeX)</span>
            </button>
            <button
              type="button"
              role="menuitem"
              data-action="export-json"
              onClick={() => {
                setIsOpen(false);
                onOpenJsonModal?.();
              }}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>💾</span>
              <span>Lưu / Nạp JSON</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};
