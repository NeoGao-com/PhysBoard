"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Y from "yjs";
import { downloadBlob, exportPDF, exportPNG } from "@/lib/export";

export interface MoreMenuProps {
  doc?: Y.Doc | null;
  page?: number;
  getBoardElement?: () => SVGSVGElement | HTMLElement | null;
  hasPaper?: boolean;
  labelScale?: number;
  dotScale?: number;
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
}

export const MoreMenu: React.FC<MoreMenuProps> = ({
  doc,
  page = 1,
  getBoardElement,
  hasPaper = false,
  labelScale = 1,
  dotScale = 1.5,
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [busyExport, setBusyExport] = useState<"png" | "pdf" | null>(null);

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
        const blob = await exportPDF(el, doc, page);
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
              width: 214,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.16)",
              padding: "6px 6px 8px",
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            }}
          >
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
