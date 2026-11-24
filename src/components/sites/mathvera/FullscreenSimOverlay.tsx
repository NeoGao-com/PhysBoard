"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ActiveSimSession } from "@/lib/sim-library";

export interface FullscreenSimOverlayProps {
  session: ActiveSimSession | null;
  minimized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  onOpenLauncher: () => void;
}

interface OverlayStroke {
  id: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

const ANNOTATE_COLORS = [
  { color: "#ef4444", label: "Đỏ" },
  { color: "#facc15", label: "Vàng" },
  { color: "#38bdf8", label: "Xanh dương" },
  { color: "#22c55e", label: "Xanh lá" },
  { color: "#ffffff", label: "Trắng" },
];

function strokeToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
  }
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
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

  // Transparent ink annotation overlay state
  const [annotateMode, setAnnotateMode] = useState(false);
  const [penColor, setPenColor] = useState("#ef4444");
  const [penWidth, setPenWidth] = useState(3.5);
  const [strokes, setStrokes] = useState<OverlayStroke[]>([]);
  const [liveStroke, setLiveStroke] = useState<OverlayStroke | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!session || minimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (annotateMode) {
          setAnnotateMode(false);
        } else {
          onMinimize();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, minimized, annotateMode, onMinimize]);

  if (!session) return null;

  const currentKey = `${session.id}_${reloadNonce}`;
  const iframeLoaded = loadedKey === currentKey;

  const handleOverlayPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!annotateMode) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    drawingPointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setLiveStroke({
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      color: penColor,
      width: penWidth,
      points: [pt],
    });
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!annotateMode || drawingPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setLiveStroke((prev) => {
      if (!prev) return null;
      const last = prev.points[prev.points.length - 1];
      if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 1.5) return prev;
      return { ...prev, points: [...prev.points, pt] };
    });
  };

  const finishStroke = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drawingPointerIdRef.current !== e.pointerId) return;
    drawingPointerIdRef.current = null;
    setLiveStroke((prev) => {
      if (prev && prev.points.length > 0) {
        setStrokes((list) => [...list, prev]);
      }
      return null;
    });
  };

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
            gap: 8,
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
              data-action="sim-toggle-annotate"
              onClick={() => setAnnotateMode((v) => !v)}
              title={
                annotateMode
                  ? "Tắt bút vẽ để quay lại bấm tương tác thí nghiệm"
                  : "Bật lớp kính trong suốt để vẽ/khoanh chú thích đè lên thí nghiệm"
              }
              style={{
                height: 30,
                padding: "0 11px",
                borderRadius: 7,
                border: annotateMode
                  ? "1px solid #f472b6"
                  : "1px solid rgba(148, 163, 184, 0.3)",
                background: annotateMode
                  ? "linear-gradient(135deg, #ec4899, #8b5cf6)"
                  : "rgba(30, 41, 59, 0.9)",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {annotateMode ? "✏ Đang vẽ chú thích" : "✏ Vẽ chú thích"}
            </button>

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
              onClick={() => {
                setAnnotateMode(false);
                setStrokes([]);
                setLiveStroke(null);
                onClose();
              }}
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

        {/* Simulation Viewport + Transparent Ink Overlay */}
        <div
          style={{
            position: "relative",
            flex: 1,
            width: "100%",
            height: "100%",
            background: "#000000",
            overflow: "hidden",
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

          {/* Transparent SVG Ink Annotation Layer */}
          {(annotateMode || strokes.length > 0 || liveStroke) && (
            <svg
              data-testid="sim-annotate-canvas"
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                zIndex: 5,
                pointerEvents: annotateMode ? "auto" : "none",
                touchAction: annotateMode ? "none" : "auto",
                cursor: annotateMode ? "crosshair" : "default",
                background: annotateMode ? "rgba(15, 23, 42, 0.04)" : "transparent",
              }}
            >
              {strokes.map((st) => (
                <path
                  key={st.id}
                  d={strokeToPath(st.points)}
                  fill="none"
                  stroke={st.color}
                  strokeWidth={st.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {liveStroke && (
                <path
                  d={strokeToPath(liveStroke.points)}
                  fill="none"
                  stroke={liveStroke.color}
                  strokeWidth={liveStroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          )}

          {/* Floating Annotation Mini-Toolbar */}
          {annotateMode && (
            <div
              data-testid="sim-annotate-toolbar"
              style={{
                position: "absolute",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 999,
                background: "rgba(15, 23, 42, 0.92)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
                color: "#f8fafc",
              }}
            >
              {ANNOTATE_COLORS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  title={`Màu ${c.label}`}
                  onClick={() => setPenColor(c.color)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: c.color,
                    border: penColor === c.color ? "2.5px solid #ffffff" : "1.5px solid rgba(255,255,255,0.3)",
                    boxShadow: penColor === c.color ? "0 0 0 2px #6366f1" : "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}

              <div style={{ width: 1, height: 18, background: "rgba(148,163,184,0.35)" }} />

              <button
                type="button"
                onClick={() => setPenWidth((w) => (w <= 3.5 ? 6.5 : 3.5))}
                title="Đổi độ dày nét"
                style={{
                  padding: "4px 9px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.3)",
                  background: "rgba(30,41,59,0.9)",
                  color: "#f8fafc",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {penWidth <= 3.5 ? "Nét vừa" : "Nét đậm"}
              </button>

              <button
                type="button"
                disabled={strokes.length === 0}
                onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                title="Hoàn tác nét vừa vẽ"
                style={{
                  padding: "4px 9px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.3)",
                  background: "rgba(30,41,59,0.9)",
                  color: strokes.length === 0 ? "#64748b" : "#f8fafc",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: strokes.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                ↶ Hoàn tác
              </button>

              <button
                type="button"
                disabled={strokes.length === 0}
                onClick={() => setStrokes([])}
                title="Xoá toàn bộ nét chú thích"
                style={{
                  padding: "4px 9px",
                  borderRadius: 999,
                  border: "1px solid rgba(248,113,113,0.4)",
                  background: "rgba(185,28,28,0.45)",
                  color: strokes.length === 0 ? "#94a3b8" : "#fecaca",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: strokes.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                🗑 Xoá nét
              </button>

              <button
                type="button"
                onClick={() => setAnnotateMode(false)}
                title="Quay lại bấm tương tác thí nghiệm"
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✓ Xong
              </button>
            </div>
          )}
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
            onClick={() => {
              setAnnotateMode(false);
              setStrokes([]);
              setLiveStroke(null);
              onClose();
            }}
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
