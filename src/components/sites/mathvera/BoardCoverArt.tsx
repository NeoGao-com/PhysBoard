"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import type { BoardCoverConfig } from "@/lib/board-manager";

export const FOLDER_COLORS = [
  "#64748b",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export const COVER_SOLID_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#fb7185",
  "#f97316",
  "#facc15",
  "#14b8a6",
  "#64748b",
];

export const COVER_SOLID_LAYOUTS: Array<{
  id: "full" | "split" | "header" | "band";
  label: string;
}> = [
  { id: "full", label: "Đầy màu" },
  { id: "split", label: "Hai nửa" },
  { id: "header", label: "Đầu trang" },
  { id: "band", label: "Dải ngang" },
];

export const COVER_STICKERS = [
  "🚫",
  "📝",
  "💼",
  "🏫",
  "📖",
  "🛒",
  "📅",
  "✈️",
  "🔬",
  "📐",
  "🧪",
  "🎯",
];

export interface CoverPreset {
  id: string;
  label: string;
  bg: string;
  accent: string;
}

export const COVER_PATTERNS: CoverPreset[] = [
  { id: "pat-wave", label: "Sóng xanh", bg: "#dbeafe", accent: "#2563eb" },
  { id: "pat-botanical", label: "Lá xanh", bg: "#d9f99d", accent: "#65a30d" },
  { id: "pat-pastel", label: "Hình học", bg: "#fef08a", accent: "#ec4899" },
  { id: "pat-terrazzo", label: "Terrazzo", bg: "#ffedd5", accent: "#ea580c" },
  { id: "pat-grid", label: "Ô caro", bg: "#ffe4e6", accent: "#f43f5e" },
  { id: "pat-chevron", label: "Ziczac", bg: "#1e3a8a", accent: "#f8fafc" },
  { id: "pat-leaf", label: "Lá thu", bg: "#ffedd5", accent: "#1e293b" },
  { id: "pat-confetti", label: "Hạt màu", bg: "#e0f2fe", accent: "#0284c7" },
  { id: "pat-dots", label: "Chấm bi", bg: "#fbcfe8", accent: "#be185d" },
  { id: "pat-stripe", label: "Sọc dọc", bg: "#fde68a", accent: "#d97706" },
  { id: "pat-drops", label: "Giọt mưa", bg: "#f3e8ff", accent: "#9333ea" },
  { id: "pat-loops", label: "Vòng xoắn", bg: "#2563eb", accent: "#93c5fd" },
];

export const COVER_ILLUSTRATIONS: CoverPreset[] = [
  { id: "ill-sakura", label: "Hoa anh đào", bg: "#fbcfe8", accent: "#db2777" },
  { id: "ill-beach", label: "Bờ biển", bg: "#bae6fd", accent: "#0284c7" },
  { id: "ill-hills", label: "Đồi nắng", bg: "#fef08a", accent: "#ca8a04" },
  { id: "ill-sky", label: "Bầu trời", bg: "#dbeafe", accent: "#3b82f6" },
  { id: "ill-blossom", label: "Hoa nhí", bg: "#fff1f2", accent: "#fb7185" },
  { id: "ill-meadow", label: "Đồng hoa", bg: "#ecfccb", accent: "#16a34a" },
  { id: "ill-autumn", label: "Lá vàng", bg: "#ffedd5", accent: "#ea580c" },
  { id: "ill-flight", label: "Chân trời", bg: "#e0f2fe", accent: "#0369a1" },
  { id: "ill-mountains", label: "Núi xanh", bg: "#ccfbf1", accent: "#0d9488" },
  { id: "ill-sunset", label: "Hoàng hôn", bg: "#fde68a", accent: "#b45309" },
  { id: "ill-mist", label: "Sương mù", bg: "#e2e8f0", accent: "#475569" },
  { id: "ill-night", label: "Đêm trăng", bg: "#312e81", accent: "#c4b5fd" },
];

export const BoardCoverPreview: React.FC<{
  cover?: BoardCoverConfig | null;
  isDarkTheme?: boolean;
  isCurrent?: boolean;
  compact?: boolean;
}> = ({ cover, isDarkTheme = false, isCurrent = false, compact = false }) => {
  if (!cover) {
    // Classic clean ruled notebook page thumbnail (matches Samsung Notes default white page card)
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: compact ? "10px 8px" : "12px 10px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to bottom, transparent 15px, #e2e8f0 16px)",
            backgroundSize: "100% 16px",
            opacity: 0.65,
          }}
        />
        <div
          style={{
            position: "relative",
            width: "55%",
            height: 4,
            borderRadius: 2,
            background: isCurrent ? "#3b82f6" : "#94a3b8",
            marginBottom: 8,
            opacity: 0.75,
          }}
        />
        <div
          style={{
            position: "relative",
            width: "82%",
            height: 3,
            borderRadius: 2,
            background: "#cbd5e1",
            marginBottom: 6,
          }}
        />
        <div
          style={{
            position: "relative",
            width: "68%",
            height: 3,
            borderRadius: 2,
            background: "#cbd5e1",
          }}
        />
      </div>
    );
  }

  if (cover.kind === "solid") {
    const c = cover.color || "#fb7185";
    const layout = cover.layout || "header";
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: layout === "full" ? c : "#ffffff",
          position: "relative",
          overflow: "hidden",
          borderLeft: `4px solid ${c}`,
          boxSizing: "border-box",
        }}
      >
        {layout === "split" && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "48%", background: c }} />
        )}
        {layout === "header" && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28%", background: c }} />
        )}
        {layout === "band" && (
          <div style={{ position: "absolute", top: "28%", left: 0, right: 0, height: "22%", background: c }} />
        )}
        {layout !== "full" && (
          <div
            style={{
              position: "absolute",
              left: 10,
              right: 10,
              bottom: 12,
              top: layout === "split" ? "56%" : layout === "band" ? "58%" : "36%",
              borderRadius: 6,
              background: isDarkTheme ? "rgba(241,245,249,0.9)" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          />
        )}
        {cover.sticker && cover.sticker !== "🚫" && (
          <div
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              fontSize: compact ? 15 : 20,
              lineHeight: 1,
            }}
          >
            {cover.sticker}
          </div>
        )}
      </div>
    );
  }

  if (cover.kind === "pattern") {
    const pat = COVER_PATTERNS.find((p) => p.id === cover.presetId) || COVER_PATTERNS[0];
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: pat.bg,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg viewBox="0 0 120 160" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="120" height="160" fill={pat.bg} />
          <circle cx="28" cy="36" r="22" fill={pat.accent} opacity="0.28" />
          <circle cx="96" cy="116" r="28" fill={pat.accent} opacity="0.24" />
          <path
            d="M0 78 Q 30 58 60 78 T 120 78"
            fill="none"
            stroke={pat.accent}
            strokeWidth="6"
            opacity="0.45"
          />
          <path
            d="M0 108 Q 30 88 60 108 T 120 108"
            fill="none"
            stroke={pat.accent}
            strokeWidth="4"
            opacity="0.35"
          />
        </svg>
      </div>
    );
  }

  // Illustration
  const ill = COVER_ILLUSTRATIONS.find((i) => i.id === cover.presetId) || COVER_ILLUSTRATIONS[0];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: ill.bg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg viewBox="0 0 120 160" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <rect width="120" height="160" fill={ill.bg} />
        <circle cx="88" cy="34" r="14" fill="#ffffff" opacity="0.65" />
        <path d="M0 124 Q 40 94 82 118 T 120 112 L 120 160 L 0 160 Z" fill={ill.accent} opacity="0.45" />
        <path d="M0 138 Q 55 112 120 134 L 120 160 L 0 160 Z" fill={ill.accent} opacity="0.75" />
      </svg>
    </div>
  );
};

export interface EditCoverDialogProps {
  open: boolean;
  initialCover?: BoardCoverConfig | null;
  isDarkTheme: boolean;
  onClose: () => void;
  onApply: (cover: BoardCoverConfig | null) => void;
}

export const EditCoverDialog: React.FC<EditCoverDialogProps> = ({
  open,
  initialCover,
  isDarkTheme,
  onClose,
  onApply,
}) => {
  const [tab, setTab] = useState<"pattern" | "illustration" | "solid">(
    initialCover?.kind || "solid"
  );
  const [draft, setDraft] = useState<BoardCoverConfig | null>(
    initialCover ?? { kind: "solid", presetId: "solid", color: "#fb7185", layout: "header" }
  );

  if (!open) return null;

  const surface = isDarkTheme ? "#1f242d" : "#ffffff";
  const borderCol = isDarkTheme ? "#2f3744" : "#e2e8f0";
  const textPrimary = isDarkTheme ? "#f1f5f9" : "#0f172a";
  const textSecondary = isDarkTheme ? "#94a3b8" : "#64748b";
  const pillBg = isDarkTheme ? "#2a313d" : "#f1f5f9";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sửa bìa"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10020,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(380px, 100%)",
          background: surface,
          color: textPrimary,
          borderRadius: 20,
          border: `1px solid ${borderCol}`,
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Sửa bìa</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: "none",
              background: pillBg,
              color: textSecondary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Cover Preview */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ position: "relative", width: 96, height: 124 }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${borderCol}`,
                boxShadow: "0 4px 12px rgba(15,23,42,0.12)",
              }}
            >
              <BoardCoverPreview cover={draft} isDarkTheme={isDarkTheme} />
            </div>
            {draft && (
              <button
                type="button"
                onClick={() => setDraft(null)}
                title="Xoá bìa (dùng trang giấy mặc định)"
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            )}
          </div>
          <span style={{ fontSize: 12, color: textSecondary }}>Bìa</span>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 4,
            background: pillBg,
            padding: 4,
            borderRadius: 12,
          }}
        >
          {[
            { id: "pattern" as const, label: "Mẫu hình" },
            { id: "illustration" as const, label: "Minh hoạ" },
            { id: "solid" as const, label: "Văn bản" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 8px",
                borderRadius: 9,
                border: "none",
                background: tab === t.id ? (isDarkTheme ? "#3b4351" : "#ffffff") : "transparent",
                color: tab === t.id ? textPrimary : textSecondary,
                fontSize: 12.5,
                fontWeight: tab === t.id ? 700 : 500,
                cursor: "pointer",
                boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        {tab === "pattern" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {COVER_PATTERNS.map((pat) => {
              const selected = draft?.kind === "pattern" && draft.presetId === pat.id;
              return (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => setDraft({ kind: "pattern", presetId: pat.id })}
                  title={pat.label}
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: 10,
                    padding: 0,
                    overflow: "hidden",
                    border: selected ? "2.5px solid #2563eb" : `1px solid ${borderCol}`,
                    cursor: "pointer",
                  }}
                >
                  <BoardCoverPreview cover={{ kind: "pattern", presetId: pat.id }} compact />
                </button>
              );
            })}
          </div>
        )}

        {tab === "illustration" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {COVER_ILLUSTRATIONS.map((ill) => {
              const selected = draft?.kind === "illustration" && draft.presetId === ill.id;
              return (
                <button
                  key={ill.id}
                  type="button"
                  onClick={() => setDraft({ kind: "illustration", presetId: ill.id })}
                  title={ill.label}
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: 10,
                    padding: 0,
                    overflow: "hidden",
                    border: selected ? "2.5px solid #2563eb" : `1px solid ${borderCol}`,
                    cursor: "pointer",
                  }}
                >
                  <BoardCoverPreview cover={{ kind: "illustration", presetId: ill.id }} compact />
                </button>
              );
            })}
          </div>
        )}

        {tab === "solid" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>Màu bìa</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
              {COVER_SOLID_COLORS.map((col) => {
                const active = (draft?.color || "#fb7185") === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() =>
                      setDraft({
                        kind: "solid",
                        presetId: "solid",
                        color: col,
                        layout: draft?.layout || "header",
                        sticker: draft?.sticker,
                      })
                    }
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      background: col,
                      border: active ? "2.5px solid #0f172a" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {COVER_SOLID_LAYOUTS.map((l) => {
                const active = draft?.kind === "solid" && (draft.layout || "header") === l.id;
                const col = draft?.color || "#fb7185";
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      setDraft({
                        kind: "solid",
                        presetId: "solid",
                        color: col,
                        layout: l.id,
                        sticker: draft?.sticker,
                      })
                    }
                    title={l.label}
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 10,
                      padding: 0,
                      overflow: "hidden",
                      border: active ? "2.5px solid #2563eb" : `1px solid ${borderCol}`,
                      cursor: "pointer",
                    }}
                  >
                    <BoardCoverPreview
                      cover={{ kind: "solid", presetId: "solid", color: col, layout: l.id }}
                      compact
                    />
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>Sticker</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {COVER_STICKERS.map((st) => {
                const active = draft?.sticker === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      setDraft({
                        kind: "solid",
                        presetId: "solid",
                        color: draft?.color || "#fb7185",
                        layout: draft?.layout || "header",
                        sticker: st === "🚫" ? undefined : st,
                      })
                    }
                    style={{
                      height: 32,
                      borderRadius: 8,
                      border: active ? "1.5px solid #2563eb" : `1px solid ${borderCol}`,
                      background: active ? pillBg : "transparent",
                      fontSize: 16,
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onApply(draft);
            onClose();
          }}
          style={{
            width: "100%",
            height: 40,
            borderRadius: 12,
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
};
