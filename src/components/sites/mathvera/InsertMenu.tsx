"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  importPdfPages,
  ImportedImageResult,
  ImportedPdfPage,
  readImageFile,
} from "@/lib/pdf-import";

export interface InsertMenuProps {
  activeTool?: string | null;
  onInsertTable: (rows: number, cols: number) => void;
  onInsertImage: (img: ImportedImageResult) => void;
  onInsertPdfPages: (pages: ImportedPdfPage[]) => void;
  buttonStyle?: React.CSSProperties;
  activeButtonStyle?: React.CSSProperties;
}

const GRID_SIZE = 8;

export const InsertMenu: React.FC<InsertMenuProps> = ({
  activeTool,
  onInsertTable,
  onInsertImage,
  onInsertPdfPages,
  buttonStyle,
  activeButtonStyle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 260)),
      });
      setHoverCell(null);
      setErrorMsg(null);
      setIsOpen(true);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const img = await readImageFile(file);
      onInsertImage(img);
      setIsOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể đọc ảnh.");
    }
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorMsg(null);
    setPdfProgress({ current: 0, total: 1 });
    try {
      const result = await importPdfPages(file, {
        onProgress: (current, total) => setPdfProgress({ current, total }),
      });
      onInsertPdfPages(result.pages);
      setPdfProgress(null);
      setIsOpen(false);
    } catch (err) {
      setPdfProgress(null);
      setErrorMsg(err instanceof Error ? err.message : "Không thể đọc file PDF.");
    }
  };

  const isTableToolActive = typeof activeTool === "string" && activeTool.startsWith("table:");

  const defaultBtnStyle: React.CSSProperties = {
    height: 28,
    padding: "0 8px",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    border: "none",
    background: isTableToolActive ? "#e8f0fe" : "transparent",
    color: isTableToolActive ? "#1a73e8" : "#334155",
    fontSize: 13,
    fontWeight: isTableToolActive ? 600 : 500,
    cursor: "pointer",
    userSelect: "none",
    ...(isTableToolActive ? activeButtonStyle : buttonStyle),
  };

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "7px 8px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#1e293b",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
  };

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={btnRef}
        type="button"
        data-dropdown="insert"
        data-tool="insert"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
        title="Chèn bảng, ảnh hoặc PDF"
        style={defaultBtnStyle}
      >
        ＋ Chèn ▾
      </button>

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: "none" }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        data-wb-pdf-file="true"
        onChange={handlePdfChange}
        style={{ display: "none" }}
      />

      {isOpen &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            data-wb-insert-menu="true"
            className="wb-insert-menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 5100,
              width: 244,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.14)",
              padding: 10,
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              color: "#334155",
            }}
          >
            {/* Caption */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: hoverCell ? "#2563eb" : "#64748b",
                marginBottom: 8,
                textTransform: hoverCell ? "none" : "uppercase",
              }}
            >
              {hoverCell
                ? `▦ Bảng — ${hoverCell.r} hàng × ${hoverCell.c} cột`
                : "▦ BẢNG — CHỌN SỐ HÀNG × CỘT"}
            </div>

            {/* 8x8 Interactive Grid */}
            <div
              onMouseLeave={() => setHoverCell(null)}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_SIZE}, 22px)`,
                gap: 4,
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
                const r = Math.floor(idx / GRID_SIZE) + 1;
                const c = (idx % GRID_SIZE) + 1;
                const active =
                  hoverCell !== null && r <= hoverCell.r && c <= hoverCell.c;
                return (
                  <button
                    key={`${r}x${c}`}
                    type="button"
                    data-table-cell={`${r}x${c}`}
                    aria-label={`Chèn bảng ${r} hàng ${c} cột`}
                    onMouseEnter={() => setHoverCell({ r, c })}
                    onClick={() => {
                      onInsertTable(r, c);
                      setIsOpen(false);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      padding: 0,
                      borderRadius: 4,
                      border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
                      background: active ? "#dbeafe" : "#ffffff",
                      cursor: "pointer",
                      transition: "background-color 0.06s ease",
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                height: 1,
                background: "#e2e8f0",
                margin: "6px 0",
              }}
            />

            {/* Media Actions List */}
            <div data-wb-insert-list="true" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button
                type="button"
                role="menuitem"
                data-menu-item="image"
                onClick={() => imageInputRef.current?.click()}
                style={menuItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>🖼️</span>
                <span>Ảnh từ máy</span>
              </button>

              <button
                type="button"
                role="menuitem"
                data-menu-item="pdf"
                data-wb-insert-pdf="true"
                onClick={() => pdfInputRef.current?.click()}
                style={menuItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>📄</span>
                <span>PDF (tối đa 10 trang)</span>
              </button>
            </div>

            {pdfProgress && (
              <div
                data-wb-pdf-progress="true"
                style={{
                  marginTop: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 12,
                }}
              >
                Đang nhập trang {pdfProgress.current}/{pdfProgress.total}…
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  marginTop: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: 12,
                }}
              >
                {errorMsg}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
