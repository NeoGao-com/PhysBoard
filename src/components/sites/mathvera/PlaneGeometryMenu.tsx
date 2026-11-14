"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconTriangle2D } from "./ToolbarIcons";
import {
  getConstructMarksEnabled,
  setConstructMarksEnabled,
} from "@/lib/geometry";

export interface PlaneGeometryMenuItem {
  tool: string;
  label: string;
  title?: string;
}

export interface PlaneGeometrySection {
  title: string;
  items: PlaneGeometryMenuItem[];
}

export const PLANE_GEOMETRY_SECTIONS: PlaneGeometrySection[] = [
  {
    title: "VẼ TAM GIÁC",
    items: [
      { tool: "c:triRight", label: "◺ Tam giác vuông" },
      { tool: "c:triRightIso", label: "◺ Tam giác vuông cân" },
      { tool: "c:triIso", label: "△ Tam giác cân" },
      { tool: "c:triEqui", label: "▲ Tam giác đều" },
    ],
  },
  {
    title: "TAM GIÁC",
    items: [
      { tool: "c:altitude", label: "⊥ Đường cao" },
      { tool: "c:median", label: "╱ Trung tuyến" },
      { tool: "c:bisector", label: "∠ Phân giác" },
    ],
  },
  {
    title: "TÂM CỦA TAM GIÁC",
    items: [
      { tool: "c:centroid", label: "G Trọng tâm" },
      { tool: "c:ortho", label: "H Trực tâm" },
      { tool: "c:circum", label: "◯ Đường tròn ngoại tiếp" },
      { tool: "c:incircle", label: "◎ Đường tròn nội tiếp" },
    ],
  },
  {
    title: "ĐIỂM · ĐƯỜNG THẲNG",
    items: [
      { tool: "c:onedge", label: "• Điểm trên đường / đường tròn" },
      { tool: "c:midpoint", label: "• Trung điểm" },
      { tool: "c:perpbis", label: "┼ Trung trực" },
      {
        tool: "c:diameter",
        label: "⌀ Đường kính",
        title: "Bấm tâm, rồi bấm một điểm trên đường tròn — đầu kia tự vẽ",
      },
      { tool: "c:perp", label: "⊥ Vuông góc" },
      { tool: "c:parallel", label: "∥ Song song" },
      { tool: "c:intersect", label: "✕ Giao điểm (cả với đường tròn)" },
      { tool: "c:reflect", label: "⇋ Điểm đối xứng" },
      { tool: "c:angleval", label: "∠ Góc theo số đo" },
    ],
  },
  {
    title: "TỨ GIÁC",
    items: [
      { tool: "c:pgram", label: "▱ Hình bình hành" },
      { tool: "c:rhombus", label: "◇ Hình thoi" },
      { tool: "c:rect", label: "▭ Hình chữ nhật" },
      { tool: "c:square", label: "□ Hình vuông" },
    ],
  },
  {
    title: "ĐƯỜNG TRÒN",
    items: [{ tool: "c:tangent", label: "⟋ Tiếp tuyến" }],
  },
];

const PLANE_TOOL_SET = new Set(
  PLANE_GEOMETRY_SECTIONS.flatMap((sec) => sec.items.map((it) => it.tool))
);

export interface PlaneGeometryMenuProps {
  activeTool: string | null;
  onSelectTool: (tool: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConstructMarksChange?: (enabled: boolean) => void;
  triggerStyle?: React.CSSProperties;
  activeTriggerStyle?: React.CSSProperties;
}

export const PlaneGeometryMenu: React.FC<PlaneGeometryMenuProps> = ({
  activeTool,
  onSelectTool,
  isOpen: controlledOpen,
  onOpenChange,
  onConstructMarksChange,
  triggerStyle,
  activeTriggerStyle,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [marksEnabled, setMarksEnabled] = useState<boolean>(() =>
    getConstructMarksEnabled()
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (next && rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        const menuHeight = 420;
        const opensUpward =
          typeof window !== "undefined" &&
          rect.bottom + menuHeight > window.innerHeight &&
          rect.top > menuHeight;
        setPos({
          top: opensUpward
            ? Math.max(8, rect.top - menuHeight - 6)
            : rect.bottom + 6,
          left: Math.max(
            8,
            Math.min(
              rect.left,
              (typeof window !== "undefined" ? window.innerWidth : 1280) - 280
            )
          ),
        });
      }
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setOpen]);

  const isToolActive = Boolean(activeTool && PLANE_TOOL_SET.has(activeTool));

  const defaultTriggerStyle: React.CSSProperties = {
    height: 28,
    padding: "0 8px",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    border: "none",
    background: isToolActive ? "#e8f0fe" : "transparent",
    color: isToolActive ? "#1a56db" : "#334155",
    fontSize: 13,
    fontWeight: isToolActive ? 600 : 500,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    ...(isToolActive ? activeTriggerStyle : triggerStyle),
  };

  const handleToggleMarks = () => {
    const next = !marksEnabled;
    setMarksEnabled(next);
    setConstructMarksEnabled(next);
    onConstructMarksChange?.(next);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        data-dropdown="planeGeometry"
        data-tool="planeGeometry"
        data-active={isToolActive ? "true" : undefined}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-pressed={isToolActive}
        onClick={() => setOpen(!isOpen)}
        style={defaultTriggerStyle}
        title="Dựng đường cao, trung tuyến, phân giác, trung trực…"
      >
        <IconTriangle2D size={14} />
        <span>Hình phẳng</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            data-wb-plane-menu="true"
            style={{
              position: "fixed",
              top: pos?.top ?? 50,
              left: pos?.left ?? 100,
              width: 272,
              maxHeight: "calc(100vh - 64px)",
              overflowY: "auto",
              background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
            padding: "6px 0",
            zIndex: 100,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {PLANE_GEOMETRY_SECTIONS.map((section, sIdx) => (
            <div key={section.title} style={{ paddingTop: sIdx > 0 ? 4 : 0 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#64748b",
                  letterSpacing: "0.04em",
                  padding: "4px 12px 2px",
                  userSelect: "none",
                }}
              >
                {section.title}
              </div>
              {section.items.map((item) => {
                const selected = activeTool === item.tool;
                return (
                  <button
                    key={item.tool}
                    type="button"
                    role="menuitem"
                    data-menu-item={item.tool}
                    data-active={selected ? "true" : undefined}
                    title={item.title}
                    onClick={() => {
                      onSelectTool(item.tool);
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      padding: "5px 12px",
                      border: "none",
                      background: selected ? "#e8f0fe" : "transparent",
                      color: selected ? "#1a56db" : "#1e293b",
                      fontSize: 13,
                      fontWeight: selected ? 600 : 400,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 4,
              padding: "8px 12px 4px",
              borderTop: "1px solid #e8eaed",
              fontSize: 12.5,
              color: "#334155",
              cursor: "pointer",
              userSelect: "none",
            }}
            title="Tự thêm ô vuông góc, gạch bằng nhau, cung góc bằng nhau như hình trong sách giáo khoa. Tắt khi cần hình trơn."
          >
            <input
              type="checkbox"
              data-wb-construct-marks="true"
              checked={marksEnabled}
              onChange={handleToggleMarks}
              style={{ accentColor: "#2563eb", cursor: "pointer" }}
            />
            <span>Tự vẽ ký hiệu (ô vuông, gạch bằng nhau)</span>
          </label>
        </div>,
        document.body
      )}
    </div>
  );
};
