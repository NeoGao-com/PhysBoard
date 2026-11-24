"use client";

import React, { useEffect, useRef, useState } from "react";

export interface ClassroomToolsWidgetProps {
  open: boolean;
  onClose: () => void;
}

const STUDENTS_STORAGE_KEY = "physboard_classroom_students_v1";

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.48);
    });
  } catch {
    // Ignore audio restrictions
  }
}

function loadSavedStudents(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.localStorage.getItem(STUDENTS_STORAGE_KEY) ||
      "Nguyễn Minh An\nTrần Gia Bảo\nLê Thảo Chi\nPhạm Đức Duy\nHoàng Khánh Linh"
    );
  } catch {
    return "";
  }
}

export const ClassroomToolsWidget: React.FC<ClassroomToolsWidgetProps> = ({
  open,
  onClose,
}) => {
  const [tab, setTab] = useState<"timer" | "picker">("timer");

  // Countdown state
  const [durationSec, setDurationSec] = useState(300); // 5 min default
  const [remainingSec, setRemainingSec] = useState(300);
  const [running, setRunning] = useState(false);
  const [customMinInput, setCustomMinInput] = useState("5");
  const [customSecInput, setCustomSecInput] = useState("00");

  const applyCustomDuration = (rawMin: string, rawSec: string) => {
    const m = Math.max(0, Math.min(180, parseInt(rawMin || "0", 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(rawSec || "0", 10) || 0));
    const total = Math.max(1, Math.min(180 * 60, m * 60 + s));
    const normM = Math.floor(total / 60);
    const normS = total % 60;
    setRunning(false);
    setDurationSec(total);
    setRemainingSec(total);
    setCustomMinInput(String(normM));
    setCustomSecInput(String(normS).padStart(2, "0"));
  };

  // Random student picker state
  const [studentsRaw, setStudentsRaw] = useState<string>(() => loadSavedStudents());
  const [noRepeat, setNoRepeat] = useState(true);
  const [calledNames, setCalledNames] = useState<string[]>([]);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  // Dragging state
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 24, y: 74 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          setRunning(false);
          playChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const studentsList = studentsRaw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSaveStudents = (val: string) => {
    setStudentsRaw(val);
    try {
      window.localStorage.setItem(STUDENTS_STORAGE_KEY, val);
    } catch {
      // Ignore
    }
  };

  const handlePickRandom = () => {
    if (studentsList.length === 0 || picking) return;
    let pool = noRepeat
      ? studentsList.filter((name) => !calledNames.includes(name))
      : studentsList;
    if (pool.length === 0) {
      setCalledNames([]);
      pool = studentsList;
    }

    setPicking(true);
    let ticks = 0;
    const maxTicks = 12;
    const roll = window.setInterval(() => {
      ticks++;
      const preview = pool[Math.floor(Math.random() * pool.length)];
      setPickedName(preview);
      if (ticks >= maxTicks) {
        window.clearInterval(roll);
        const finalPick = pool[Math.floor(Math.random() * pool.length)];
        setPickedName(finalPick);
        if (noRepeat) {
          setCalledNames((prev) => [...prev, finalPick]);
        }
        setPicking(false);
        playChime();
      }
    }, 65);
  };

  if (!open) return null;

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const pct = durationSec > 0 ? Math.round((remainingSec / durationSec) * 100) : 0;

  return (
    <div
      data-testid="classroom-tools-widget"
      data-export-skip="true"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        right: pos.x,
        top: pos.y,
        width: 300,
        maxWidth: "calc(100vw - 24px)",
        zIndex: 95,
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1.5px solid #e0e7ff",
        boxShadow: "0 16px 38px rgba(99, 102, 241, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)",
        fontFamily: 'var(--font-anime, "Comfortaa", "Nunito", system-ui, sans-serif)',
        overflow: "hidden",
      }}
    >
      {/* Draggable Header */}
      <div
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: pos.x,
            origY: pos.y,
          };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          setPos({
            x: Math.max(8, Math.min(window.innerWidth - 310, dragRef.current.origX - dx)),
            y: Math.max(48, Math.min(window.innerHeight - 160, dragRef.current.origY + dy)),
          });
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        style={{
          padding: "10px 12px",
          background: "linear-gradient(135deg, #eef2ff 0%, #fdf2f8 100%)",
          borderBottom: "1px solid #e0e7ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#312e81" }}>
          ⏱ Công cụ Lớp học
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng công cụ lớp học"
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#475569",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px 4px" }}>
        <button
          type="button"
          onClick={() => setTab("timer")}
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: 9,
            border: tab === "timer" ? "1px solid #6366f1" : "1px solid #e2e8f0",
            background: tab === "timer" ? "#eef2ff" : "#f8fafc",
            color: tab === "timer" ? "#4338ca" : "#475569",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⏱ Đếm ngược
        </button>
        <button
          type="button"
          onClick={() => setTab("picker")}
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: 9,
            border: tab === "picker" ? "1px solid #ec4899" : "1px solid #e2e8f0",
            background: tab === "picker" ? "#fdf2f8" : "#f8fafc",
            color: tab === "picker" ? "#be185d" : "#475569",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🎲 Gọi tên ({studentsList.length})
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 14px" }}>
        {tab === "timer" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                textAlign: "center",
                padding: "12px 8px",
                borderRadius: 12,
                background: remainingSec === 0 ? "#fef2f2" : "#f8fafc",
                border: `1.5px solid ${remainingSec === 0 ? "#fca5a5" : "#e2e8f0"}`,
              }}
            >
              <div
                data-testid="timer-display"
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  color: remainingSec === 0 ? "#dc2626" : running ? "#2563eb" : "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {timeStr}
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 6,
                  borderRadius: 999,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background:
                      remainingSec <= 15
                        ? "#ef4444"
                        : "linear-gradient(90deg, #38bdf8, #6366f1)",
                    transition: "width 0.4s linear",
                  }}
                />
              </div>
            </div>

            {/* Quick presets */}
            <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
              {[1, 3, 5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setDurationSec(m * 60);
                    setRemainingSec(m * 60);
                    setCustomMinInput(String(m));
                    setCustomSecInput("00");
                  }}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 999,
                    border: durationSec === m * 60 ? "1px solid #6366f1" : "1px solid #cbd5e1",
                    background: durationSec === m * 60 ? "#eef2ff" : "#ffffff",
                    color: durationSec === m * 60 ? "#4338ca" : "#475569",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {m}p
                </button>
              ))}
            </div>

            {/* Custom time input (minutes : seconds) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "5px 8px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Tuỳ chỉnh:</span>
              <input
                type="number"
                data-testid="timer-custom-min"
                min={0}
                max={180}
                aria-label="Số phút"
                value={customMinInput}
                onChange={(e) => setCustomMinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyCustomDuration(customMinInput, customSecInput);
                }}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  textAlign: "center",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>p :</span>
              <input
                type="number"
                data-testid="timer-custom-sec"
                min={0}
                max={59}
                aria-label="Số giây"
                value={customSecInput}
                onChange={(e) => setCustomSecInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyCustomDuration(customMinInput, customSecInput);
                }}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  textAlign: "center",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>s</span>
              <button
                type="button"
                data-testid="timer-custom-apply"
                onClick={() => applyCustomDuration(customMinInput, customSecInput)}
                style={{
                  height: 26,
                  padding: "0 9px",
                  borderRadius: 6,
                  border: "1px solid #c7d2fe",
                  background: "#eef2ff",
                  color: "#4338ca",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Đặt
              </button>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  if (remainingSec === 0) {
                    setRemainingSec(durationSec);
                    setRunning(true);
                  } else {
                    setRunning((r) => !r);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: running
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : "linear-gradient(135deg, #2563eb, #4f46e5)",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {running ? "⏸ Tạm dừng" : remainingSec === 0 ? "▶ Chạy lại" : "▶ Bắt đầu"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setRemainingSec(durationSec);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#334155",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ↺
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pickedName && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #fdf2f8, #eef2ff)",
                  border: "1.5px solid #f472b6",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9d174d" }}>
                  {picking ? "Đang chọn ngẫu nhiên..." : "🎉 Mời bạn:"}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#1e1b4b", marginTop: 2 }}>
                  {pickedName}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={studentsList.length === 0 || picking}
              onClick={handlePickRandom}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 10,
                border: "none",
                background:
                  studentsList.length === 0
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #ec4899, #8b5cf6)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                cursor: studentsList.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {picking ? "🎲 Đang quay..." : "🎲 Gọi tên ngẫu nhiên"}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "#475569" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={noRepeat}
                  onChange={(e) => setNoRepeat(e.target.checked)}
                  style={{ accentColor: "#ec4899" }}
                />
                <span>Không gọi trùng ({calledNames.length}/{studentsList.length})</span>
              </label>
              {calledNames.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCalledNames([])}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#2563eb",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Đặt lại
                </button>
              )}
            </div>

            <textarea
              value={studentsRaw}
              onChange={(e) => handleSaveStudents(e.target.value)}
              rows={5}
              placeholder="Nhập danh sách học sinh (mỗi dòng 1 tên)..."
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 12,
                color: "#0f172a",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
