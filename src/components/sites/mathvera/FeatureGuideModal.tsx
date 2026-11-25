"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { stripVietnameseDiacritics } from "@/lib/commands";
import {
  COMPLETE_FEATURE_CATALOG,
  IN_APP_GUIDE_CHAPTERS,
  INDIVIDUAL_TOOL_REFERENCE,
  MANUAL_BOOK_CHAPTERS,
  SUPPORT_INFO,
  type InAppGuideChapter,
} from "@/lib/manual-catalog";

export const FEATURE_GUIDE_SEEN_KEY = "physboard_feature_guide_seen_v1";

export function hasSeenFeatureGuide(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(FEATURE_GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFeatureGuideSeen(seen = true): void {
  if (typeof window === "undefined") return;
  try {
    if (seen) {
      window.localStorage.setItem(FEATURE_GUIDE_SEEN_KEY, "1");
    } else {
      window.localStorage.removeItem(FEATURE_GUIDE_SEEN_KEY);
    }
  } catch {
    // Ignore storage restriction errors in private contexts
  }
}

export type GuideChapter = InAppGuideChapter;
export const FEATURE_GUIDE_CHAPTERS: GuideChapter[] = IN_APP_GUIDE_CHAPTERS;

export interface FeatureGuideModalProps {
  open: boolean;
  onClose: () => void;
  onOpenPdfManual?: () => void;
  onOpenTutorialBoard?: (boardId: string) => void | Promise<void>;
  onRestoreTutorials?: () => Promise<void>;
}

export const FeatureGuideModal: React.FC<FeatureGuideModalProps> = ({
  open,
  onClose,
  onOpenPdfManual,
  onOpenTutorialBoard,
  onRestoreTutorials,
}) => {
  const [mode, setMode] = useState<"chapters" | "catalog">("chapters");
  const [activeIdx, setActiveIdx] = useState(0);
  const [chapterQuery, setChapterQuery] = useState("");
  const [mediaView, setMediaView] = useState<"image" | "video">("image");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogChapterFilter, setCatalogChapterFilter] = useState<number | "all">("all");
  const [dontShowOnStartup, setDontShowOnStartup] = useState(true);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);

  const chapter = FEATURE_GUIDE_CHAPTERS[activeIdx] ?? FEATURE_GUIDE_CHAPTERS[0];
  const total = FEATURE_GUIDE_CHAPTERS.length;

  const filteredChapters = useMemo(() => {
    const q = stripVietnameseDiacritics(chapterQuery.trim());
    if (!q) return FEATURE_GUIDE_CHAPTERS.map((c, idx) => ({ c, idx }));
    return FEATURE_GUIDE_CHAPTERS.map((c, idx) => ({ c, idx })).filter(({ c }) =>
      stripVietnameseDiacritics(
        `${c.stepLabel} ${c.shortTitle} ${c.title} ${c.summary} ${c.highlights.map((h) => `${h.label} ${h.detail}`).join(" ")}`
      ).includes(q)
    );
  }, [chapterQuery]);

  const filteredCatalog = useMemo(() => {
    const q = stripVietnameseDiacritics(catalogQuery.trim());
    return COMPLETE_FEATURE_CATALOG.filter((item) => {
      if (catalogChapterFilter !== "all" && item.chapterNum !== catalogChapterFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = stripVietnameseDiacritics(
        `${item.name} ${item.categoryLabel} ${item.whereToFind} ${item.shortcut} ${item.pcHowTo} ${item.tabletHowTo} ${item.resultDesc}`
      );
      return haystack.includes(q);
    });
  }, [catalogQuery, catalogChapterFilter]);

  const filteredSubTools = useMemo(() => {
    const q = stripVietnameseDiacritics(catalogQuery.trim());
    return INDIVIDUAL_TOOL_REFERENCE.filter((item) => {
      if (catalogChapterFilter !== "all" && item.chapterNum !== catalogChapterFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = stripVietnameseDiacritics(
        `${item.title} ${item.key} ${item.shortcut} ${item.desc} ${item.tips ?? ""}`
      );
      return haystack.includes(q);
    });
  }, [catalogQuery, catalogChapterFilter]);

  const handleClose = useCallback(() => {
    setLightboxOpen(false);
    markFeatureGuideSeen(dontShowOnStartup);
    onClose();
  }, [dontShowOnStartup, onClose]);

  const selectChapter = useCallback((idx: number) => {
    setActiveIdx(idx);
    setMediaView("image");
    setLightboxOpen(false);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIdx((i) => Math.max(0, i - 1));
    setMediaView("image");
  }, []);

  const handleNext = useCallback(() => {
    if (activeIdx >= total - 1) {
      handleClose();
    } else {
      setActiveIdx((i) => Math.min(total - 1, i + 1));
      setMediaView("image");
    }
  }, [activeIdx, total, handleClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else {
          handleClose();
        }
      } else if (mode === "chapters" && !lightboxOpen && e.key === "ArrowRight") {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
        e.stopPropagation();
        setActiveIdx((i) => Math.min(total - 1, i + 1));
        setMediaView("image");
      } else if (mode === "chapters" && !lightboxOpen && e.key === "ArrowLeft") {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
        e.stopPropagation();
        setActiveIdx((i) => Math.max(0, i - 1));
        setMediaView("image");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, total, mode, lightboxOpen, handleClose]);

  if (!open) return null;

  return (
    <div
      data-testid="feature-guide-modal"
      data-export-skip="true"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9992,
        background: "rgba(15, 23, 42, 0.62)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        .fg-modal-card {
          width: min(1140px, 100%);
          max-height: min(94vh, 840px);
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.34);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .fg-body-split {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: row;
          overflow: hidden;
        }
        .fg-nav-rail {
          width: 280px;
          flex-shrink: 0;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          padding: 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .fg-nav-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 9px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
        }
        .fg-nav-btn:hover {
          background: #eef2ff;
        }
        .fg-nav-btn[data-active="true"] {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
        }
        .fg-content-pane {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 13px;
          background: #ffffff;
        }
        .fg-content-pane > * {
          flex-shrink: 0;
        }
        .fg-media-shell {
          width: min(100%, 720px);
          margin: 0 auto;
          flex-shrink: 0;
          aspect-ratio: 16 / 10;
          border-radius: 12px;
          overflow: hidden;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
          position: relative;
        }
        .fg-media-shell img,
        .fg-media-shell video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          background: #f8fafc;
        }
        .fg-two-col {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .fg-highlights-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        @media (max-width: 820px) {
          .fg-modal-card {
            max-height: 95vh;
            border-radius: 14px;
          }
          .fg-body-split {
            flex-direction: column;
          }
          .fg-nav-rail {
            width: 100%;
            max-height: 112px;
            flex-shrink: 0;
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 10px;
            gap: 6px;
          }
          .fg-nav-btn {
            width: auto;
            white-space: nowrap;
            flex-shrink: 0;
            padding: 6px 10px;
            font-size: 12px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .fg-content-pane {
            padding: 12px 14px;
            gap: 10px;
          }
          .fg-two-col,
          .fg-highlights-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="fg-modal-card" role="dialog" aria-modal="true" aria-label="Cẩm nang Hướng dẫn PhysBoard">
        {/* Header */}
        <div
          style={{
            padding: "11px 16px",
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #eef2ff 0%, #f0fdfa 55%, #fdf2f8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "#ffffff",
                border: "1px solid #c7d2fe",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              🎓
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", lineHeight: 1.2 }}>
                Cẩm nang PhysBoard — Toàn bộ Tính năng Dạy học
              </div>
              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 1 }}>
                {total} chuyên đề minh hoạ ①②③ &bull; {COMPLETE_FEATURE_CATALOG.length} nhóm chức năng tra cứu chi tiết &bull; Zalo hỗ trợ {SUPPORT_INFO.zaloDisplay}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <button
              type="button"
              data-testid="guide-tab-chapters"
              onClick={() => setMode("chapters")}
              style={{
                padding: "6px 11px",
                borderRadius: 9,
                border: mode === "chapters" ? "1px solid #2563eb" : "1px solid #cbd5e1",
                background: mode === "chapters" ? "#2563eb" : "#ffffff",
                color: mode === "chapters" ? "#ffffff" : "#1e293b",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📚 {total} Chuyên đề
            </button>

            <button
              type="button"
              data-testid="guide-tab-catalog"
              onClick={() => setMode("catalog")}
              style={{
                padding: "6px 11px",
                borderRadius: 9,
                border: mode === "catalog" ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                background: mode === "catalog" ? "#4f46e5" : "#ffffff",
                color: mode === "catalog" ? "#ffffff" : "#1e293b",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔎 Tra cứu 100% Công cụ
            </button>

            {onOpenPdfManual && (
              <button
                type="button"
                data-testid="guide-open-pdf-btn"
                onClick={() => onOpenPdfManual()}
                style={{
                  padding: "6px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(220, 38, 38, 0.24)",
                }}
              >
                📄 Đọc / Tải Sách PDF Cẩm nang
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng hướng dẫn"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mode 1: 20 Detailed Illustrated Chapters */}
        {mode === "chapters" && (
          <div className="fg-body-split">
            <nav className="fg-nav-rail" aria-label="Danh sách 20 chuyên đề hướng dẫn">
              <input
                type="text"
                value={chapterQuery}
                onChange={(e) => setChapterQuery(e.target.value)}
                placeholder="Lọc nhanh bài học..."
                style={{
                  width: "100%",
                  padding: "6px 9px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  marginBottom: 4,
                  outline: "none",
                  background: "#ffffff",
                }}
              />
              {filteredChapters.map(({ c: item, idx }) => {
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="fg-nav-btn"
                    data-guide-chapter={item.id}
                    data-active={isActive ? "true" : "false"}
                    onClick={() => selectChapter(idx)}
                  >
                    <span
                      style={{
                        width: 23,
                        height: 23,
                        borderRadius: 7,
                        background: isActive ? "rgba(255,255,255,0.22)" : "#e2e8f0",
                        color: isActive ? "#ffffff" : "#334155",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12.5,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ opacity: isActive ? 0.85 : 0.6, marginRight: 4, fontSize: 11 }}>
                        {item.stepLabel}.
                      </span>
                      {item.shortTitle}
                    </span>
                  </button>
                );
              })}

              {onRestoreTutorials && (
                <button
                  type="button"
                  onClick={async () => {
                    setBusyMessage("Đang khôi phục 9 Sổ tay mẫu...");
                    await onRestoreTutorials();
                    setBusyMessage("✓ Đã khôi phục xong 9 Sổ tay mẫu trong Trang chủ!");
                    setTimeout(() => setBusyMessage(null), 3200);
                  }}
                  style={{
                    marginTop: 8,
                    padding: "7px 10px",
                    borderRadius: 9,
                    border: "1px dashed #93c5fd",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ↺ Khôi phục 9 Sổ tay mẫu
                </button>
              )}
            </nav>

            {/* Main Chapter View */}
            <div className="fg-content-pane">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      {chapter.badge}
                    </span>
                    <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>
                      Bài {chapter.stepLabel} / {total} &bull; Chương {chapter.pdfChapterNum} Sách PDF
                    </span>
                  </div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                    {chapter.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                    {chapter.summary}
                  </p>
                </div>

                {chapter.tutorialBoardId && onOpenTutorialBoard && (
                  <button
                    type="button"
                    data-testid="guide-open-tutorial-board-btn"
                    onClick={() => void onOpenTutorialBoard(chapter.tutorialBoardId!)}
                    style={{
                      padding: "8px 13px",
                      borderRadius: 10,
                      border: "none",
                      background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                      color: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 3px 10px rgba(5, 150, 105, 0.25)",
                      flexShrink: 0,
                    }}
                  >
                    🧪 Mở bảng thực hành mẫu
                  </button>
                )}
              </div>

              {busyMessage && (
                <div
                  style={{
                    padding: "7px 12px",
                    borderRadius: 9,
                    background: "#ecfdf5",
                    border: "1px solid #6ee7b7",
                    color: "#065f46",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  {busyMessage}
                </div>
              )}

              {/* Media Switcher (Annotated Screenshot ①②③ OR Video Demo if available) */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "inline-flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setMediaView("image")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: mediaView === "image" ? "1px solid #2563eb" : "1px solid #cbd5e1",
                      background: mediaView === "image" ? "#eff6ff" : "#ffffff",
                      color: mediaView === "image" ? "#1d4ed8" : "#475569",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🖼 Ảnh minh hoạ đánh số ①②③
                  </button>
                  {chapter.videoSrc && (
                    <button
                      type="button"
                      onClick={() => setMediaView("video")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: mediaView === "video" ? "1px solid #2563eb" : "1px solid #cbd5e1",
                        background: mediaView === "video" ? "#eff6ff" : "#ffffff",
                        color: mediaView === "video" ? "#1d4ed8" : "#475569",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🎬 Xem Video thao tác
                    </button>
                  )}
                </div>

                {mediaView === "image" && (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#334155",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🔍 Bấm ảnh để phóng to
                  </button>
                )}
              </div>

              <div className="fg-media-shell">
                {mediaView === "video" && chapter.videoSrc ? (
                  <video
                    key={chapter.id}
                    src={chapter.videoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    preload="auto"
                    data-testid="feature-guide-video"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={chapter.screenshotSrc}
                    src={chapter.screenshotSrc}
                    alt={chapter.title}
                    data-testid="feature-guide-screenshot"
                    onClick={() => setLightboxOpen(true)}
                    style={{ cursor: "zoom-in" }}
                  />
                )}
              </div>

              {/* Callouts Legend ① ② ③ */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 6,
                  padding: "9px 11px",
                  borderRadius: 10,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                {chapter.callouts.map((c) => (
                  <div key={c.num} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        background: "#dc2626",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {c.num}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{c.label}</div>
                      <div style={{ color: "#475569", lineHeight: 1.4 }}>{c.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PC vs Tablet Steps */}
              <div className="fg-two-col">
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1e3a8a", marginBottom: 6 }}>
                    💻 Trên Máy tính (Chuột &amp; Phím tắt)
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12, color: "#1e293b", lineHeight: 1.5 }}>
                    {chapter.pcSteps.map((s, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#14532d", marginBottom: 6 }}>
                    📱 Trên Máy tính bảng (Chạm &amp; Bút Stylus)
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12, color: "#1e293b", lineHeight: 1.5 }}>
                    {chapter.tabletSteps.map((s, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Highlights */}
              <div className="fg-highlights-grid">
                {chapter.highlights.map((hl) => (
                  <div
                    key={hl.label}
                    style={{
                      padding: "8px 11px",
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>• {hl.label}</div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.45 }}>{hl.detail}</div>
                  </div>
                ))}
              </div>

              {/* Teaching Tip */}
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  fontSize: 12.5,
                  color: "#78350f",
                  lineHeight: 1.45,
                }}
              >
                <strong>💡 Mẹo sư phạm:</strong> {chapter.tip}
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Complete 100% Tool & Feature Encyclopedia */}
        {mode === "catalog" && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <input
                  type="text"
                  data-testid="guide-catalog-search"
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  placeholder="Tìm mọi công cụ không dấu (vd: thiet dien, bayes, casio, zalo, net dut, oxyz...)"
                  style={{
                    flex: "1 1 280px",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    outline: "none",
                    background: "#ffffff",
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                  Hiển thị {filteredCatalog.length} nhóm chức năng + {filteredSubTools.length} lệnh/công cụ chi tiết
                </span>
              </div>

              <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
                <button
                  type="button"
                  onClick={() => setCatalogChapterFilter("all")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: catalogChapterFilter === "all" ? "1px solid #2563eb" : "1px solid #cbd5e1",
                    background: catalogChapterFilter === "all" ? "#2563eb" : "#ffffff",
                    color: catalogChapterFilter === "all" ? "#ffffff" : "#334155",
                    fontSize: 11.5,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  Tất cả (14 Chương)
                </button>
                {MANUAL_BOOK_CHAPTERS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setCatalogChapterFilter(ch.num)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: catalogChapterFilter === ch.num ? "1px solid #2563eb" : "1px solid #cbd5e1",
                      background: catalogChapterFilter === ch.num ? "#2563eb" : "#ffffff",
                      color: catalogChapterFilter === ch.num ? "#ffffff" : "#334155",
                      fontSize: 11.5,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    {ch.icon} Ch.{ch.num}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 10,
                alignContent: "start",
              }}
            >
              {filteredCatalog.map((item) => {
                const targetIdx = FEATURE_GUIDE_CHAPTERS.findIndex((c) => c.id === item.guideChapterId);
                return (
                  <div
                    key={item.id}
                    data-testid={`catalog-item-${item.id}`}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "11px 13px",
                      background: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 15,
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                            Chương {item.chapterNum} &bull; {item.categoryLabel}
                          </div>
                        </div>
                      </div>
                      {item.shortcut !== "—" && (
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            fontFamily: "monospace",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#334155",
                            flexShrink: 0,
                          }}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 11.5, color: "#1d4ed8", fontWeight: 600 }}>
                      📍 Vị trí: {item.whereToFind}
                    </div>
                    <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
                      <strong>💻 Máy tính:</strong> {item.pcHowTo}
                    </div>
                    <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
                      <strong>📱 Máy tính bảng:</strong> {item.tabletHowTo}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginTop: 2,
                        paddingTop: 6,
                        borderTop: "1px dashed #e2e8f0",
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: "#047857", fontWeight: 600 }}>✓ {item.resultDesc}</span>
                      {targetIdx >= 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            selectChapter(targetIdx);
                            setMode("chapters");
                          }}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 7,
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                          }}
                        >
                          Xem ảnh ①②③
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredSubTools.map((tool) => (
                <div
                  key={tool.key}
                  data-testid={`catalog-subtool-${tool.key}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {tool.icon}
                      </span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>{tool.title}</div>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                          Chương {tool.chapterNum} &bull; Công cụ / Lệnh chi tiết
                        </div>
                      </div>
                    </div>
                    {tool.shortcut !== "—" && (
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          fontFamily: "monospace",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#334155",
                          flexShrink: 0,
                        }}
                      >
                        {tool.shortcut}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>{tool.desc}</div>
                  {tool.tips && (
                    <div style={{ fontSize: 11.5, color: "#92400e", background: "#fffbeb", padding: "4px 8px", borderRadius: 6, border: "1px solid #fde68a" }}>
                      💡 {tool.tips}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              color: "#334155",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              data-testid="feature-guide-dont-show"
              checked={dontShowOnStartup}
              onChange={(e) => setDontShowOnStartup(e.target.checked)}
              style={{ accentColor: "#2563eb", cursor: "pointer" }}
            />
            <span>Không tự động hiện lại khi mở ứng dụng (luôn mở lại ở nút 🎓 Hướng dẫn)</span>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {mode === "chapters" && (
              <>
                <button
                  type="button"
                  disabled={activeIdx === 0}
                  onClick={handlePrev}
                  style={{
                    padding: "7px 13px",
                    borderRadius: 9,
                    border: "1px solid #cbd5e1",
                    background: activeIdx === 0 ? "#f1f5f9" : "#ffffff",
                    color: activeIdx === 0 ? "#94a3b8" : "#1e293b",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: activeIdx === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  ← Trước
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  data-testid="feature-guide-next"
                  style={{
                    padding: "7px 16px",
                    borderRadius: 9,
                    border: "none",
                    background:
                      activeIdx >= total - 1
                        ? "linear-gradient(135deg, #16a34a 0%, #059669 100%)"
                        : "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 3px 10px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  {activeIdx >= total - 1 ? "✓ Bắt đầu dạy học" : "Tiếp theo →"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Click-to-zoom Image Lightbox */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(15, 23, 42, 0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            gap: 10,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={chapter.screenshotSrc}
            alt={chapter.title}
            style={{
              maxWidth: "96vw",
              maxHeight: "84vh",
              borderRadius: 12,
              background: "#ffffff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            }}
          />
          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>
            {chapter.title} &bull; Bấm bất kỳ đâu hoặc nhấn Esc để thu nhỏ
          </div>
        </div>
      )}
    </div>
  );
};
