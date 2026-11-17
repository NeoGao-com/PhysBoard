"use client";

import React, { useRef, useState } from "react";
import { PageBoardConfig, BOARD_SURFACE_PRESETS } from "@/lib/board-themes";
import { importPdfPages, ImportedPdfPage } from "@/lib/pdf-import";
import { IconPdf, IconHtmlSim } from "./ToolbarIcons";

export interface PageSidebarProps {
  currentPage: number;
  totalPages: number;
  onSelectPage: (page: number) => void;
  onAddPage: () => void;
  onDeletePage?: (page: number) => void;
  onOpenPageManager?: () => void;
  onInsertPdfPages?: (pages: ImportedPdfPage[]) => void;
  onOpenHtmlSimModal?: () => void;
  boardConfig?: PageBoardConfig;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const PageSidebar: React.FC<PageSidebarProps> = ({
  currentPage,
  totalPages,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onOpenPageManager,
  onInsertPdfPages,
  onOpenHtmlSimModal,
  boardConfig,
  isOpen,
  onToggleOpen,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfImporting, setPdfImporting] = useState(false);

  if (!isOpen) {
    return (
      <aside
        data-export-skip="true"
        data-wb-page-sidebar-collapsed="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 26,
          background: "#f8fafc",
          borderRight: "1px solid #cbd5e1",
          zIndex: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 8,
          gap: 12,
          boxShadow: "1px 0 6px rgba(15,23,42,0.06)",
          userSelect: "none",
        }}
      >
        <button
          type="button"
          onClick={onToggleOpen}
          title="Mở sổ tay trang"
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            width: 20,
            height: 24,
            fontSize: 10,
            color: "#475569",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          ▶
        </button>

        <div
          onClick={onToggleOpen}
          title="Mở sổ tay trang"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 11 }}>📑</span>
          <span>SỔ TAY ({currentPage}/{totalPages})</span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-export-skip="true"
      data-wb-page-sidebar="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 140,
        background: "#f1f5f9",
        borderRight: "1px solid #cbd5e1",
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        boxShadow: "2px 0 12px rgba(15,23,42,0.06)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Sidebar Header */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
          color: "#475569",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#0f172a" }}>
          SỔ TAY ({totalPages})
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {onOpenPageManager && (
            <button
              type="button"
              onClick={onOpenPageManager}
              title="Mở trình quản lý trang (chọn nhiều trang, xóa hàng loạt)"
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontSize: 14,
                cursor: "pointer",
                padding: 2,
              }}
            >
              📑
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            title="Thu gọn thanh trang"
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: 15,
              cursor: "pointer",
              padding: 2,
            }}
          >
            ◀
          </button>
        </div>
      </div>

      {/* Pages Vertical Thumbnails List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {pages.map((p) => {
          const isCur = p === currentPage;
          return (
            <div
              key={p}
              onClick={() => onSelectPage(p)}
              data-page-index={p}
              data-active={isCur ? "true" : "false"}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* Page Number Badge */}
              <div
                style={{
                  alignSelf: "flex-start",
                  fontSize: 11,
                  fontWeight: 700,
                  color: isCur ? "#0284c7" : "#64748b",
                  marginBottom: 3,
                  marginLeft: 4,
                }}
              >
                {p}
              </div>

              {/* Thumbnail Card (Scribble Ink styled sheet) */}
              <div
                style={{
                  width: 104,
                  height: 136,
                  borderRadius: 4,
                  background: "#ffffff",
                  border: isCur ? "2.5px solid #0284c7" : "1px solid #cbd5e1",
                  boxShadow: isCur
                    ? "0 0 0 2px rgba(14,165,233,0.25), 0 4px 12px rgba(15,23,42,0.12)"
                    : "0 1px 4px rgba(15,23,42,0.06)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 140ms ease",
                }}
              >
                {/* Header box simulating note title */}
                <div
                  style={{
                    height: 14,
                    borderBottom: "1px dashed #93c5fd",
                    margin: "4px 6px 0",
                  }}
                />
                {/* Ruled lines */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 1,
                      background: "#e0f2fe",
                      marginTop: 14,
                      marginLeft: 14,
                      marginRight: 6,
                    }}
                  />
                ))}
                {/* Red margin line on left */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 12,
                    width: 1,
                    background: "rgba(239,68,68,0.45)",
                  }}
                />

                {/* Center badge or mini indicator */}
                {isCur && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      background: "#0284c7",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      borderRadius: 3,
                      padding: "1px 4px",
                    }}
                  >
                    Hiện tại
                  </div>
                )}
              </div>

              {/* Delete button (if totalPages > 1) */}
              {totalPages > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Xoá trang ${p}?`)) {
                      onDeletePage?.(p);
                    }
                  }}
                  title={`Xoá trang ${p}`}
                  style={{
                    position: "absolute",
                    top: 18,
                    right: 4,
                    background: "rgba(15,23,42,0.65)",
                    color: "#f87171",
                    border: "none",
                    borderRadius: 999,
                    width: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: Add Page & Page Manager Buttons */}
      <div
        style={{
          padding: 8,
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Hidden PDF Input */}
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setPdfImporting(true);
            try {
              const result = await importPdfPages(file);
              onInsertPdfPages?.(result.pages);
            } catch (err) {
              console.error("Lỗi chèn file PDF:", err);
            } finally {
              setPdfImporting(false);
            }
          }}
        />

        {/* Chèn PDF */}
        <button
          type="button"
          disabled={pdfImporting}
          onClick={() => pdfInputRef.current?.click()}
          title="Chèn file PDF thành các trang sổ tay"
          style={{
            width: "100%",
            background: "#fff1f2",
            color: "#e11d48",
            border: "1px solid #fecdd3",
            borderRadius: 6,
            padding: "6px 0",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: pdfImporting ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            opacity: pdfImporting ? 0.6 : 1,
          }}
        >
          <IconPdf size={13} color="#e11d48" />
          <span>{pdfImporting ? "Đang nạp..." : "Chèn PDF"}</span>
        </button>

        {/* Nạp HTML Sim */}
        {onOpenHtmlSimModal && (
          <button
            type="button"
            onClick={onOpenHtmlSimModal}
            title="Nạp & nhúng file mô phỏng HTML thí nghiệm trực tiếp vào bảng"
            style={{
              width: "100%",
              background: "#f0fdf4",
              color: "#16a34a",
              border: "1px solid #bbf7d0",
              borderRadius: 6,
              padding: "6px 0",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <IconHtmlSim size={13} color="#16a34a" />
            <span>Nạp HTML</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAddPage}
          data-wb-add-page="true"
          style={{
            width: "100%",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            padding: "7px 0",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
          }}
        >
          <span>+</span>
          <span>Thêm trang</span>
        </button>

        {onOpenPageManager && (
          <button
            type="button"
            onClick={onOpenPageManager}
            data-wb-open-page-manager="true"
            style={{
              width: "100%",
              background: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "6px 0",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span>📑</span>
            <span>Quản lý trang</span>
          </button>
        )}
      </div>
    </aside>
  );
};
