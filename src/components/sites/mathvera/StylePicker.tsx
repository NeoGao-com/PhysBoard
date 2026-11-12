"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  COLOR_PRESETS,
  STROKE_WIDTH_PRESETS,
  STROKE_STYLE_PRESETS,
} from "@/lib/selection";
import type { StylePatch, SelectionStyleState } from "@/types/whiteboard";
export type { StylePatch, SelectionStyleState };

export interface StylePickerProps {
  current: {
    stroke: string | null;
    width: number | null;
    dash: boolean | null;
  };
  selection: SelectionStyleState;
  onPick: (patch: StylePatch, isCtrlPressed: boolean) => void;
  buttonStyle?: React.CSSProperties;
  iconOnly?: boolean;
}

export const StylePicker: React.FC<StylePickerProps> = ({
  current,
  selection,
  onPick,
  buttonStyle,
  iconOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasSelection = selection.count > 0;
  const activeStroke = hasSelection ? selection.stroke : current.stroke;
  const activeWidth = hasSelection ? selection.width : current.width;
  const activeDash = hasSelection ? selection.dash : current.dash;

  // Click outside and Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !btnRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
      });
      setIsOpen(true);
    }
  };

  const handlePick = (patch: StylePatch) => (e: React.MouseEvent) => {
    onPick(patch, e.ctrlKey || e.metaKey);
  };

  const strokeDisplayColor =
    activeStroke === "mixed"
      ? "conic-gradient(#e03131 0 25%, #1971c2 0 50%, #2f9e44 0 75%, #f08c00 0)"
      : (activeStroke ??
        "linear-gradient(135deg, #fff 45%, #94a3b8 45% 55%, #fff 55%)");

  const lineWidth =
    typeof activeWidth === "number" ? Math.min(activeWidth, 6) : 2;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger Button */}
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Màu và nét"
        title="Màu và nét"
        data-popover="style"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        data-testid="style-picker"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: iconOnly ? 4 : 6,
          height: 28,
          padding: iconOnly ? "0 6px" : "0 10px",
          borderRadius: 6,
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          color: "#334155",
          fontSize: 13,
          cursor: "pointer",
          userSelect: "none",
          ...buttonStyle,
        }}
      >
        <span
          style={{
            width: iconOnly ? 10 : 14,
            height: iconOnly ? 10 : 14,
            borderRadius: "50%",
            border: "1px solid #94a3b8",
            background: strokeDisplayColor,
            flex: "0 0 auto",
          }}
        />
        <svg width={iconOnly ? 11 : 18} height="12" aria-hidden="true">
          <line
            x1="1"
            y1="6"
            x2={iconOnly ? 10 : 17}
            y2="6"
            stroke="#334155"
            strokeWidth={lineWidth}
            strokeDasharray={activeDash === true ? "4 3" : undefined}
            strokeLinecap="round"
          />
        </svg>
        {iconOnly ? (
          <span className="sr-only">Màu và nét</span>
        ) : (
          <span>Màu và nét</span>
        )}
        {hasSelection && !iconOnly && (
          <span style={{ color: "#1971c2", fontWeight: 600 }}>
            ({selection.count})
          </span>
        )}
        {hasSelection && iconOnly && (
          <span
            aria-label={`${selection.count} đang chọn`}
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 14,
              height: 14,
              padding: "0 3px",
              borderRadius: 9999,
              background: "#1a73e8",
              color: "#ffffff",
              fontSize: 9.5,
              fontWeight: 700,
              lineHeight: "14px",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            {selection.count}
          </span>
        )}
        <span style={{ fontSize: 10 }}>▾</span>
      </button>

      {/* Popover Portal */}
      {isOpen &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Màu và nét"
            data-wb-style-picker="true"
            className="wb-style-picker"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 5000,
              width: 250,
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              boxShadow: "0 6px 18px rgba(0,0,0,0.14)",
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 12.5,
              color: "#334155",
              fontFamily:
                'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {/* Popover Header */}
            <div style={{ fontWeight: 600 }}>
              {hasSelection
                ? `Đang chọn ${selection.count} đối tượng`
                : "Hình vẽ tiếp theo"}
              {(activeStroke === "mixed" || activeWidth === "mixed") && (
                <span style={{ fontWeight: 400, color: "#64748b" }}>
                  {" "}
                  · nhiều màu/nét khác nhau
                </span>
              )}
            </div>

            {/* Swatches Radiogroup */}
            <div
              role="radiogroup"
              aria-label="Màu"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 28px)",
                gap: 6,
              }}
            >
              {/* Auto swatch */}
              <button
                type="button"
                role="radio"
                aria-checked={activeStroke === null}
                title="Tự động — mỗi loại hình giữ màu riêng (chỉ áp cho hình vẽ sau)"
                onClick={handlePick({ stroke: null })}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  background:
                    "linear-gradient(135deg, #fff 45%, #94a3b8 45% 55%, #fff 55%)",
                  outline:
                    activeStroke === null ? "2px solid #1a56db" : "none",
                  outlineOffset: 2,
                }}
              />
              {/* 10 Presets */}
              {COLOR_PRESETS.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  role="radio"
                  data-color={swatch.hex}
                  data-testid={`color-${swatch.hex}`}
                  aria-checked={activeStroke === swatch.hex}
                  aria-label={swatch.name}
                  title={swatch.name}
                  onClick={handlePick({ stroke: swatch.hex })}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid rgba(0,0,0,0.15)",
                    background: swatch.hex,
                    cursor: "pointer",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 700,
                    outline:
                      activeStroke === swatch.hex
                        ? "2px solid #1a56db"
                        : "none",
                    outlineOffset: 2,
                  }}
                >
                  {activeStroke === swatch.hex ? "✓" : ""}
                </button>
              ))}
              {/* Custom + Color input */}
              <label
                title="Màu khác…"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px dashed #94a3b8",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  position: "relative",
                  fontSize: 16,
                }}
              >
                +
                <input
                  type="color"
                  aria-label="Màu khác"
                  onChange={(e) => onPick({ stroke: e.target.value }, false)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />
              </label>
            </div>

            {/* Stroke Width Radiogroup */}
            <div
              role="radiogroup"
              aria-label="Độ dày nét"
              style={{ display: "flex", gap: 6 }}
            >
              {STROKE_WIDTH_PRESETS.map((w) => {
                const presetName =
                  w.px === 1
                    ? "thin"
                    : w.px === 2
                    ? "medium"
                    : w.px === 3.5
                    ? "bold"
                    : "extrabold";
                return (
                  <button
                    key={w.px}
                    type="button"
                    role="radio"
                    data-stroke-width={presetName}
                    aria-checked={activeWidth === w.px}
                    aria-label={`Nét ${w.name}`}
                    title={`Nét ${w.name}`}
                    onClick={handlePick({ width: w.px })}
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: activeWidth === w.px ? "#e8f0fe" : "#ffffff",
                      cursor: "pointer",
                      outline:
                        activeWidth === w.px ? "2px solid #1a56db" : "none",
                      outlineOffset: 2,
                      position: "relative",
                    }}
                  >
                    <span data-stroke-width={w.px} style={{ display: "none" }}>
                      {w.px}
                    </span>
                    <svg width="100%" height="12" aria-hidden="true">
                      <line
                        x1="15%"
                        y1="6"
                        x2="85%"
                        y2="6"
                        stroke="#1e293b"
                        strokeWidth={w.px}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      style={{
                        position: "absolute",
                        width: 1,
                        height: 1,
                        overflow: "hidden",
                        clip: "rect(0,0,0,0)",
                      }}
                    >
                      {w.name} {w.px} {presetName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stroke Style Radiogroup */}
            <div
              role="radiogroup"
              aria-label="Kiểu nét"
              style={{ display: "flex", gap: 6 }}
            >
              {STROKE_STYLE_PRESETS.map((style) => (
                <button
                  key={style.name}
                  type="button"
                  role="radio"
                  data-stroke-style={style.v ? "dashed" : "solid"}
                  aria-checked={activeDash === style.v}
                  onClick={handlePick({ dash: style.v })}
                  style={{
                    flex: 1,
                    height: 30,
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: activeDash === style.v ? "#e8f0fe" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    outline:
                      activeDash === style.v ? "2px solid #1a56db" : "none",
                    outlineOffset: 2,
                  }}
                >
                  <svg width="28" height="10" aria-hidden="true">
                    <line
                      x1="2"
                      y1="5"
                      x2="26"
                      y2="5"
                      stroke="#1e293b"
                      strokeWidth="2"
                      strokeDasharray={style.d}
                    />
                  </svg>
                  <span>{style.name}</span>
                  <span style={{ display: "none" }}>
                    {style.v ? "dashed" : "solid"}
                  </span>
                </button>
              ))}
            </div>

            {/* Footer helper note */}
            <div
              style={{
                color: "#64748b",
                fontSize: 11.5,
                lineHeight: 1.4,
              }}
            >
              {hasSelection
                ? "Áp cho đối tượng đang chọn và các hình vẽ sau. Giữ Ctrl (⌘) khi bấm: chỉ đổi đối tượng đang chọn."
                : "Từ giờ mọi hình vẽ mới sẽ dùng màu & nét này."}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
