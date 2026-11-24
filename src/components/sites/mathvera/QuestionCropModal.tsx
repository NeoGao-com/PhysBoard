"use client";

import React, { useEffect, useRef, useState } from "react";
import { importPdfPages, readImageFile, type ImportedPdfPage } from "@/lib/pdf-import";

export interface CroppedQuestionResult {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
  lockOnInsert: boolean;
}

export interface QuestionCropModalProps {
  open: boolean;
  onClose: () => void;
  onInsertCropped: (result: CroppedQuestionResult) => void;
}

interface CropRectNorm {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const QuestionCropModal: React.FC<QuestionCropModalProps> = ({
  open,
  onClose,
  onInsertCropped,
}) => {
  const [pages, setPages] = useState<ImportedPdfPage[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockOnInsert, setLockOnInsert] = useState(true);
  const [cropRect, setCropRect] = useState<CropRectNorm | null>(null);
  const [sourceName, setSourceName] = useState<string>("");

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const currentPage = pages[pageIdx] ?? null;

  const handleLoadFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setCropRect(null);
    try {
      const isPdf =
        file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      if (isPdf) {
        const res = await importPdfPages(file);
        if (res.pages.length === 0) {
          setError("File PDF không có trang nào hợp lệ.");
          return;
        }
        setPages(res.pages);
        setPageIdx(0);
        setSourceName(file.name);
      } else if (file.type.startsWith("image/")) {
        const img = await readImageFile(file);
        setPages([
          {
            pageNumber: 1,
            src: img.src,
            w: img.w,
            h: img.h,
            pixelWidth: img.pixelWidth,
            pixelHeight: img.pixelHeight,
          },
        ]);
        setPageIdx(0);
        setSourceName(file.name);
      } else {
        setError("Vui lòng chọn file ảnh (PNG/JPG/WebP) hoặc file PDF.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đọc tệp đã chọn.");
    } finally {
      setLoading(false);
    }
  };

  // Support Ctrl+V pasting a screenshot directly into the cropper modal
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleLoadFile(file);
            return;
          }
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const getNormPos = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentPage) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getNormPos(e);
    dragStartRef.current = pt;
    setCropRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    e.preventDefault();
    const pt = getNormPos(e);
    const start = dragStartRef.current;
    setCropRect({
      x: Math.min(start.x, pt.x),
      y: Math.min(start.y, pt.y),
      w: Math.abs(pt.x - start.x),
      h: Math.abs(pt.y - start.y),
    });
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const handleCommitCrop = (closeAfter: boolean) => {
    const imgEl = imgRef.current;
    if (!currentPage || !imgEl || !cropRect || cropRect.w < 0.02 || cropRect.h < 0.02) {
      setError("Hãy kéo chọn một vùng câu hỏi đủ rộng trên trang trước khi cắt.");
      return;
    }

    const natW = imgEl.naturalWidth || currentPage.pixelWidth;
    const natH = imgEl.naturalHeight || currentPage.pixelHeight;
    const sx = Math.round(cropRect.x * natW);
    const sy = Math.round(cropRect.y * natH);
    const sw = Math.max(10, Math.round(cropRect.w * natW));
    const sh = Math.max(10, Math.round(cropRect.h * natH));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, sw, sh);
    const dataUrl = canvas.toDataURL("image/png");

    onInsertCropped({
      dataUrl,
      widthPx: sw,
      heightPx: sh,
      lockOnInsert,
    });
    setCropRect(null);
    if (closeAfter) onClose();
  };

  const hasValidCrop = Boolean(cropRect && cropRect.w >= 0.02 && cropRect.h >= 0.02);

  return (
    <div
      data-testid="question-crop-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        background: "rgba(15, 23, 42, 0.58)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(960px, 100%)",
          maxHeight: "90vh",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              ✂ Cắt câu hỏi từ PDF / Ảnh chụp đề bài
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Mở file PDF/Ảnh hoặc bấm <code>Ctrl+V</code> dán ảnh chụp → kéo khung cắt 1 câu hỏi ghim lên bảng
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
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

        {/* Controls Bar */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLoadFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Đang nạp trang..." : "📂 Chọn file PDF / Ảnh"}
            </button>

            {pages.length > 1 && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  disabled={pageIdx <= 0}
                  onClick={() => {
                    setPageIdx((i) => Math.max(0, i - 1));
                    setCropRect(null);
                  }}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    cursor: pageIdx <= 0 ? "not-allowed" : "pointer",
                    fontSize: 12,
                  }}
                >
                  ◀
                </button>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                  Trang {pageIdx + 1} / {pages.length}
                </span>
                <button
                  type="button"
                  disabled={pageIdx >= pages.length - 1}
                  onClick={() => {
                    setPageIdx((i) => Math.min(pages.length - 1, i + 1));
                    setCropRect(null);
                  }}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    cursor: pageIdx >= pages.length - 1 ? "not-allowed" : "pointer",
                    fontSize: 12,
                  }}
                >
                  ▶
                </button>
              </div>
            )}

            {sourceName && (
              <span style={{ fontSize: 12, color: "#64748b" }}>{sourceName}</span>
            )}
          </div>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#334155", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={lockOnInsert}
              onChange={(e) => setLockOnInsert(e.target.checked)}
              style={{ accentColor: "#2563eb" }}
            />
            <span>🔒 Tự khoá đề bài vào trang</span>
          </label>
        </div>

        {/* Workspace */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 16,
            background: "#f1f5f9",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: currentPage ? "flex-start" : "center",
            minHeight: 320,
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 12px",
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              ⚠ {error}
            </div>
          )}

          {!currentPage ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleLoadFile(f);
              }}
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: 14,
                background: "#ffffff",
                padding: "36px 28px",
                textAlign: "center",
                maxWidth: 480,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 34 }}>✂</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                Kéo thả file PDF / Ảnh đề thi vào đây
              </div>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>
                Hoặc bấm <strong>Chọn file PDF / Ảnh</strong> ở trên, hoặc chụp màn hình rồi nhấn <strong>Ctrl+V</strong> để dán trực tiếp.
              </div>
            </div>
          ) : (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: "relative",
                display: "inline-block",
                maxWidth: "100%",
                cursor: "crosshair",
                touchAction: "none",
                userSelect: "none",
                boxShadow: "0 8px 24px rgba(15,23,42,0.16)",
                borderRadius: 6,
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={currentPage.src}
                alt={`Trang ${pageIdx + 1}`}
                draggable={false}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "62vh",
                  width: "auto",
                  height: "auto",
                  pointerEvents: "none",
                }}
              />

              {cropRect && (
                <div
                  style={{
                    position: "absolute",
                    left: `${cropRect.x * 100}%`,
                    top: `${cropRect.y * 100}%`,
                    width: `${cropRect.w * 100}%`,
                    height: `${cropRect.h * 100}%`,
                    border: "2px solid #2563eb",
                    background: "rgba(37, 99, 235, 0.14)",
                    boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.38)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {hasValidCrop
              ? "✓ Đã chọn vùng câu hỏi. Bấm nút bên phải để ghim lên bảng trắng."
              : "Kéo chuột / ngón tay trên trang để khoanh vùng câu hỏi cần cắt."}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={!hasValidCrop}
              onClick={() => handleCommitCrop(false)}
              style={{
                padding: "7px 13px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: hasValidCrop ? "#1e293b" : "#94a3b8",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: hasValidCrop ? "pointer" : "not-allowed",
              }}
            >
              ✂ Cắt &amp; Cắt tiếp câu khác
            </button>
            <button
              type="button"
              disabled={!hasValidCrop}
              onClick={() => handleCommitCrop(true)}
              style={{
                padding: "7px 15px",
                borderRadius: 8,
                border: "none",
                background: hasValidCrop ? "linear-gradient(135deg, #2563eb, #4f46e5)" : "#cbd5e1",
                color: "#ffffff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: hasValidCrop ? "pointer" : "not-allowed",
              }}
            >
              ✂ Cắt &amp; Ghim lên bảng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
