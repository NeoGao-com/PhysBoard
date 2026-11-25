"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadBlob } from "@/lib/export";
import { MANUAL_BOOK_CHAPTERS } from "@/lib/manual-catalog";
import { openPdfDocument, type LazyPdfHandle } from "@/lib/pdf-import";

export const PDF_MANUAL_RELATIVE_URL = "./docs/PhysBoard-Cam-Nang-Toan-Tap.pdf";
export const PDF_MANUAL_DOWNLOAD_NAME = "PhysBoard-Cam-Nang-Toan-Tap.pdf";

export interface PdfManualViewerModalProps {
  open: boolean;
  onClose: () => void;
}

export const PdfManualViewerModal: React.FC<PdfManualViewerModalProps> = ({
  open,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoomPct, setZoomPct] = useState(100);
  const [pageSrc, setPageSrc] = useState<string | null>(null);
  const [renderingPage, setRenderingPage] = useState(false);

  const pdfHandleRef = useRef<LazyPdfHandle | null>(null);
  const pdfBlobRef = useRef<Blob | null>(null);
  const cacheRef = useRef<Map<number, string>>(new Map());

  const loadManualPdf = useCallback(async () => {
    setLoading(true);
    setError(null);
    cacheRef.current.clear();
    if (pdfHandleRef.current) {
      await pdfHandleRef.current.destroy().catch(() => {});
      pdfHandleRef.current = null;
    }

    try {
      const resp = await fetch(PDF_MANUAL_RELATIVE_URL);
      if (!resp.ok) {
        throw new Error(`Không tìm thấy file PDF (${resp.status}).`);
      }
      const blob = await resp.blob();
      pdfBlobRef.current = blob;
      const file = new File([blob], PDF_MANUAL_DOWNLOAD_NAME, {
        type: "application/pdf",
      });
      const handle = await openPdfDocument(file);
      pdfHandleRef.current = handle;
      setTotalPages(handle.totalPages);
      setCurrentPage(1);
      setPageInput("1");
    } catch (err) {
      console.error("Failed to open PDF manual:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải Cẩm nang PDF. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const pageCache = cacheRef.current;
    void loadManualPdf();
    return () => {
      if (pdfHandleRef.current) {
        void pdfHandleRef.current.destroy().catch(() => {});
        pdfHandleRef.current = null;
      }
      pageCache.clear();
    };
  }, [open, loadManualPdf]);

  useEffect(() => {
    if (!open || !pdfHandleRef.current || totalPages === 0) return;
    const clamped = Math.max(1, Math.min(totalPages, currentPage));
    const cached = cacheRef.current.get(clamped);
    if (cached) {
      setPageSrc(cached);
      return;
    }

    let cancelled = false;
    setRenderingPage(true);
    void pdfHandleRef.current
      .renderPage(clamped, { targetMaxSidePx: 1850 })
      .then((rendered) => {
        if (cancelled) return;
        cacheRef.current.set(clamped, rendered.src);
        setPageSrc(rendered.src);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error rendering manual PDF page:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setRenderingPage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, currentPage, totalPages]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.stopPropagation();
        setCurrentPage((p) => {
          const next = Math.min(Math.max(1, totalPages), p + 1);
          setPageInput(String(next));
          return next;
        });
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.stopPropagation();
        setCurrentPage((p) => {
          const next = Math.max(1, p - 1);
          setPageInput(String(next));
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, totalPages, onClose]);

  const jumpToPage = useCallback(
    (p: number) => {
      if (totalPages <= 0) return;
      const clamped = Math.max(1, Math.min(totalPages, Math.floor(p)));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
    },
    [totalPages]
  );

  const handleDownloadPdf = useCallback(async () => {
    try {
      let blob = pdfBlobRef.current;
      if (!blob) {
        const resp = await fetch(PDF_MANUAL_RELATIVE_URL);
        if (!resp.ok) return;
        blob = await resp.blob();
        pdfBlobRef.current = blob;
      }
      downloadBlob(blob, PDF_MANUAL_DOWNLOAD_NAME);
    } catch (err) {
      console.error("Download PDF manual failed:", err);
    }
  }, []);

  const chapterEstimatePages = useMemo(() => {
    if (totalPages <= 2) return MANUAL_BOOK_CHAPTERS.map((c) => ({ ...c, page: 1 }));
    // Cover (1), TOC (2), then 14 chapters distributed cleanly until user jumps
    const bodyPages = Math.max(14, totalPages - 3);
    return MANUAL_BOOK_CHAPTERS.map((c, idx) => ({
      ...c,
      page: Math.min(
        totalPages,
        3 + Math.floor((idx * bodyPages) / MANUAL_BOOK_CHAPTERS.length)
      ),
    }));
  }, [totalPages]);

  if (!open) return null;

  return (
    <div
      data-testid="pdf-manual-viewer-modal"
      data-export-skip="true"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9996,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sách PDF Cẩm nang Toàn tập PhysBoard"
        style={{
          width: "min(1160px, 100%)",
          height: "min(93vh, 880px)",
          background: "#f8fafc",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.42)",
          border: "1px solid #cbd5e1",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top Toolbar */}
        <div
          style={{
            padding: "10px 14px",
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a" }}>
                Sách PDF Cẩm nang Toàn tập PhysBoard (100% Tính năng)
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b" }}>
                Đọc Offline trực tiếp trên Windows &amp; Android • Đầy đủ 14 Chương + Hình minh hoạ ①②③
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => jumpToPage(currentPage - 1)}
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: currentPage <= 1 ? "#f1f5f9" : "#ffffff",
                color: currentPage <= 1 ? "#94a3b8" : "#1e293b",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              }}
            >
              ◀ Trang trước
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = parseInt(pageInput, 10);
                if (!Number.isNaN(parsed)) jumpToPage(parsed);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#334155" }}
            >
              <span>Trang</span>
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => {
                  const parsed = parseInt(pageInput, 10);
                  if (!Number.isNaN(parsed)) jumpToPage(parsed);
                }}
                aria-label="Số trang hiện tại"
                style={{
                  width: 44,
                  textAlign: "center",
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
              />
              <span data-testid="pdf-manual-total-pages">/ {totalPages || "—"}</span>
            </form>

            <button
              type="button"
              disabled={totalPages === 0 || currentPage >= totalPages}
              onClick={() => jumpToPage(currentPage + 1)}
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: totalPages === 0 || currentPage >= totalPages ? "#f1f5f9" : "#ffffff",
                color: totalPages === 0 || currentPage >= totalPages ? "#94a3b8" : "#1e293b",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: totalPages === 0 || currentPage >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              Trang sau ▶
            </button>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 4 }}>
              <button
                type="button"
                onClick={() => setZoomPct((z) => Math.max(60, z - 15))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                title="Thu nhỏ trang"
              >
                −
              </button>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 42, textAlign: "center" }}>
                {zoomPct}%
              </span>
              <button
                type="button"
                onClick={() => setZoomPct((z) => Math.min(180, z + 15))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                title="Phóng to trang"
              >
                +
              </button>
            </div>

            <button
              type="button"
              data-testid="pdf-manual-download-btn"
              onClick={handleDownloadPdf}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.28)",
              }}
            >
              ⬇ Tải file PDF về máy
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng trình đọc PDF"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body: Quick TOC + Page View */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <aside
            style={{
              width: 255,
              flexShrink: 0,
              background: "#ffffff",
              borderRight: "1px solid #e2e8f0",
              overflowY: "auto",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
            className="hidden md:flex"
          >
            <button
              type="button"
              onClick={() => jumpToPage(1)}
              style={{
                textAlign: "left",
                padding: "6px 9px",
                borderRadius: 8,
                border: "none",
                background: currentPage === 1 ? "#eff6ff" : "transparent",
                color: currentPage === 1 ? "#1d4ed8" : "#334155",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              📕 Trang Bìa &amp; Mục lục (1–2)
            </button>
            {chapterEstimatePages.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => jumpToPage(ch.page)}
                style={{
                  textAlign: "left",
                  padding: "6px 9px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: 11.5,
                  lineHeight: 1.35,
                  cursor: "pointer",
                }}
              >
                {ch.icon} {ch.title}
              </button>
            ))}
          </aside>

          {/* Rendered Page Area */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: loading || error ? "center" : "flex-start",
              background: "#e2e8f0",
            }}
          >
            {loading && (
              <div style={{ padding: 24, background: "#ffffff", borderRadius: 12, fontWeight: 600, color: "#334155" }}>
                ⏳ Đang mở Sách Cẩm nang PDF...
              </div>
            )}

            {!loading && error && (
              <div style={{ padding: 24, background: "#ffffff", borderRadius: 12, maxWidth: 460, textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>Không thể tải file PDF</div>
                <div style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>{error}</div>
                <button
                  type="button"
                  onClick={() => void loadManualPdf()}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Thử lại
                </button>
              </div>
            )}

            {!loading && !error && pageSrc && (
              <div
                style={{
                  position: "relative",
                  width: `${Math.round((720 * zoomPct) / 100)}px`,
                  maxWidth: "100%",
                  background: "#ffffff",
                  borderRadius: 6,
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.25)",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pageSrc}
                  alt={`Trang ${currentPage} - Cẩm nang PhysBoard`}
                  data-testid="pdf-manual-page-img"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
                {renderingPage && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(15, 23, 42, 0.78)",
                      color: "#ffffff",
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    Đang hiển thị trang {currentPage}...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
