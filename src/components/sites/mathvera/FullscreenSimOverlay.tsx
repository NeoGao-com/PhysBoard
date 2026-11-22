"use client";

import React, { useState } from "react";
import type { ActiveSimSession } from "@/lib/sim-library";

export interface FullscreenSimOverlayProps {
  session: ActiveSimSession | null;
  minimized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  onOpenLauncher: () => void;
}

export const FullscreenSimOverlay: React.FC<FullscreenSimOverlayProps> = ({
  session,
  minimized,
  onMinimize,
  onRestore,
  onClose,
  onOpenLauncher,
}) => {
  const [reloadNonce, setReloadNonce] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string>("");

  if (!session) return null;

  const currentKey = `${session.id}_${reloadNonce}`;
  const iframeLoaded = loadedKey === currentKey;

  return (
    <>
      {/* Fullscreen Simulation App Window (keep-alive with visibility/pointer-events/z-index, never display:none) */}
      <div
        data-testid="fullscreen-sim-overlay"
        data-minimized={minimized ? "true" : "false"}
        aria-hidden={minimized}
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          visibility: minimized ? "hidden" : "visible",
          pointerEvents: minimized ? "none" : "auto",
          opacity: minimized ? 0 : 1,
          zIndex: minimized ? -1 : 9990,
        }}
      >
        {/* Compact Top Bar */}
        <div
          style={{
            height: 44,
            flexShrink: 0,
            padding: "0 12px",
            background: "#0f172a",
            borderBottom: "1px solid rgba(148, 163, 184, 0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            color: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              flex: 1,
            }}
          >
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background:
                  session.sourceKind === "offline-html"
                    ? "rgba(13, 148, 136, 0.25)"
                    : "rgba(37, 99, 235, 0.28)",
                color:
                  session.sourceKind === "offline-html" ? "#5eead4" : "#93c5fd",
                border:
                  session.sourceKind === "offline-html"
                    ? "1px solid rgba(94, 234, 212, 0.35)"
                    : "1px solid rgba(147, 197, 253, 0.35)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {session.sourceKind === "offline-html" ? "Offline HTML" : "PhET Online"}
            </span>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "#f8fafc",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={session.title}
            >
              {session.title}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onOpenLauncher}
              title="Đổi sang thí nghiệm khác"
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: 7,
                border: "1px solid rgba(148, 163, 184, 0.3)",
                background: "rgba(30, 41, 59, 0.9)",
                color: "#e2e8f0",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Đổi bài
            </button>

            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              title="Tải lại thí nghiệm"
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: 7,
                border: "1px solid rgba(148, 163, 184, 0.3)",
                background: "rgba(30, 41, 59, 0.9)",
                color: "#e2e8f0",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ↻ Tải lại
            </button>

            <button
              type="button"
              data-action="sim-minimize"
              onClick={onMinimize}
              title="Thu nhỏ về bảng trắng (giữ nguyên trạng thái thí nghiệm)"
              style={{
                height: 30,
                padding: "0 12px",
                borderRadius: 7,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ─ Về bảng trắng
            </button>

            <button
              type="button"
              data-action="sim-close"
              onClick={onClose}
              title="Đóng hẳn thí nghiệm và giải phóng bộ nhớ"
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: 7,
                border: "1px solid rgba(248, 113, 113, 0.45)",
                background: "rgba(185, 28, 28, 0.85)",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* Simulation Viewport */}
        <div
          style={{
            position: "relative",
            flex: 1,
            width: "100%",
            height: "100%",
            background: "#000000",
          }}
        >
          {!iframeLoaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: "#cbd5e1",
                fontSize: 13.5,
                background: "#0f172a",
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              <div style={{ fontWeight: 700, color: "#f8fafc" }}>
                Đang nạp mô phỏng: {session.title}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {session.sourceKind === "offline-html"
                  ? "Đang khởi chạy từ Blob URL (Offline)..."
                  : "Đang kết nối PhET HTML5..."}
              </div>
            </div>
          )}

          <iframe
            key={currentKey}
            src={session.iframeSrc}
            title={session.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
            allow="fullscreen; accelerometer; gyroscope"
            allowFullScreen
            onLoad={() => setLoadedKey(currentKey)}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
              background: "#000000",
            }}
          />
        </div>
      </div>

      {/* Floating Restore Pill when minimized onto Whiteboard */}
      {minimized && (
        <div
          data-testid="sim-minimized-pill"
          style={{
            position: "fixed",
            right: 16,
            bottom: 18,
            zIndex: 9950,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px 6px 12px",
            borderRadius: 999,
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(8px)",
            color: "#f8fafc",
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.32)",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            maxWidth: "min(340px, calc(100vw - 32px))",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px #22c55e",
              flexShrink: 0,
            }}
          />
          <button
            type="button"
            data-action="sim-restore"
            onClick={onRestore}
            title="Mở lại toàn màn hình thí nghiệm đang chạy"
            style={{
              border: "none",
              background: "transparent",
              color: "#f8fafc",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: "2px 4px",
            }}
          >
            ⚗ {session.title}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Đóng hẳn thí nghiệm"
            aria-label="Đóng hẳn thí nghiệm"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "none",
              background: "rgba(239, 68, 68, 0.22)",
              color: "#fca5a5",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
