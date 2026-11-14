"use client";

import React, { useState } from "react";
import * as Y from "yjs";
import { exportMultiPagePDF } from "@/lib/export";
import { downloadBlob } from "@/lib/export";

export interface ExportPdfModalProps {
  open: boolean;
  doc: Y.Doc | null;
  currentPage: number;
  totalPages: number;
  getBoardElement?: () => SVGSVGElement | HTMLElement | null;
  onClose: () => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  open,
  doc,
  currentPage,
  totalPages,
  getBoardElement,
  onClose,
}) => {
  const [fileName, setFileName] = useState("physboard-bang-ve");
  const [pageMode, setPageMode] = useState<"current" | "all" | "custom">("current");
  const [customPagesText, setCustomPagesText] = useState(`${currentPage}`);
  const [whitePaper, setWhitePaper] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const parseCustomPages = (): number[] => {
    const pagesSet = new Set<number>();
    const parts = customPagesText.split(/[,;\s]+/).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.min(start, end);
          const to = Math.max(start, end);
          for (let i = from; i <= to; i++) {
            if (i >= 1 && i <= totalPages) pagesSet.add(i);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          pagesSet.add(p);
        }
      }
    }
    return Array.from(pagesSet).sort((a, b) => a - b);
  };

  const getTargetPages = (): number[] => {
    if (pageMode === "current") return [currentPage];
    if (pageMode === "all") {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return parseCustomPages();
  };

  const handleExport = async () => {
    if (!doc) return;
    const targetPages = getTargetPages();
    if (targetPages.length === 0) {
      setErrorMsg("Vui lòng chọn hoặc nhập ít nhất một trang hợp lệ.");
      return;
    }

    setErrorMsg(null);
    setIsExporting(true);

    try {
      const el = getBoardElement?.() ?? document.querySelector<SVGSVGElement>('svg[data-wb-canvas="true"]');
      const blob = await exportMultiPagePDF(el, doc, targetPages, {
        whitePaper,
        title: fileName.trim() || "physboard-bang-ve",
      });

      const finalName = (fileName.trim() || "physboard-bang-ve").replace(/\.pdf$/i, "") + ".pdf";
      downloadBlob(blob, finalName);
      onClose();
    } catch (err) {
      console.error("Lỗi xuất PDF:", err);
      setErrorMsg("Có lỗi xảy ra trong quá trình xuất PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const targetPagesList = getTargetPages();

  return (
    <div
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
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <span style={{ fontWeight: 600, fontSize: 16, color: "#1e293b" }}>
              Xuất tài liệu PDF
            </span>
          </div>
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* File Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>
              Tên file xuất:
            </label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="physboard-bang-ve"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px 0 0 8px",
                  border: "1px solid #cbd5e1",
                  borderRight: "none",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />
              <span
                style={{
                  padding: "8px 12px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0 8px 8px 0",
                  fontSize: 13,
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                .pdf
              </span>
            </div>
          </div>

          {/* Page Range Selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>
              Chọn trang xuất:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="pageMode"
                  checked={pageMode === "current"}
                  onChange={() => setPageMode("current")}
                  style={{ accentColor: "#2563eb" }}
                />
                <span>Chỉ trang hiện tại (Trang {currentPage})</span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="pageMode"
                  checked={pageMode === "all"}
                  onChange={() => setPageMode("all")}
                  style={{ accentColor: "#2563eb" }}
                />
                <span>Tất cả các trang (1 đến {totalPages})</span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="pageMode"
                  checked={pageMode === "custom"}
                  onChange={() => setPageMode("custom")}
                  style={{ accentColor: "#2563eb" }}
                />
                <span>Tuỳ chọn trang (VD: 1, 3, 5-7):</span>
              </label>

              {pageMode === "custom" && (
                <div style={{ paddingLeft: 22 }}>
                  <input
                    type="text"
                    value={customPagesText}
                    onChange={(e) => setCustomPagesText(e.target.value)}
                    placeholder="VD: 1, 2, 4-6"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                    Các trang hợp lệ: {targetPagesList.length > 0 ? targetPagesList.join(", ") : "Chưa có trang nào"} (Tổng: {targetPagesList.length} trang)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Paper Style Option */}
          <div
            style={{
              paddingTop: 8,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={whitePaper}
                onChange={(e) => setWhitePaper(e.target.checked)}
                style={{ accentColor: "#2563eb" }}
              />
              <span>Xuất nền giấy trắng (tiết kiệm mực in)</span>
            </label>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: "6px 10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                color: "#dc2626",
                fontSize: 12,
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={isExporting || targetPagesList.length === 0}
            onClick={handleExport}
            style={{
              padding: "7px 18px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: isExporting ? "wait" : "pointer",
              opacity: isExporting || targetPagesList.length === 0 ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isExporting ? (
              <>
                <span>⏳</span>
                <span>Đang xuất ({targetPagesList.length} trang)...</span>
              </>
            ) : (
              <>
                <span>⬇</span>
                <span>Xuất PDF ({targetPagesList.length} trang)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
