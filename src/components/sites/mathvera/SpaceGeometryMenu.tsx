"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCube3D } from "./ToolbarIcons";

export interface SpaceGeometryVariant {
  tool: string;
  label: string;
  menuItem: string;
}

export interface SpaceGeometryMenuItem {
  tool?: string;
  label: string;
  title?: string;
  menuItem?: string;
  variants?: SpaceGeometryVariant[];
}

export interface SpaceGeometrySection {
  title: string;
  items: SpaceGeometryMenuItem[];
}

export const SPACE_GEOMETRY_SECTIONS: SpaceGeometrySection[] = [
  {
    title: "KHỐI ĐA DIỆN",
    items: [
      { tool: "p3:box", label: "▱ Hộp chữ nhật", menuItem: "Hộp chữ nhật" },
      { tool: "p3:cube", label: "◻ Lập phương", menuItem: "Lập phương" },
      {
        label: "◹ Lăng trụ",
        title: "Lăng trụ đứng — chọn đáy (đáy tứ giác: dùng Hộp chữ nhật)",
        variants: [
          { tool: "p3:prism:3", label: "tam giác", menuItem: "Lăng trụ tam giác" },
          { tool: "p3:prism:5", label: "ngũ giác", menuItem: "Lăng trụ ngũ giác" },
          { tool: "p3:prism:6", label: "lục giác", menuItem: "Lăng trụ lục giác" },
        ],
      },
      {
        label: "△ Chóp",
        title: "Hình chóp — chọn đáy",
        variants: [
          { tool: "p3:pyramid:3", label: "tam giác", menuItem: "Chóp tam giác" },
          { tool: "p3:pyramid:4", label: "tứ giác", menuItem: "Chóp tứ giác" },
          { tool: "p3:pyramid:5", label: "ngũ giác", menuItem: "Chóp ngũ giác" },
          { tool: "p3:pyramid:6", label: "lục giác", menuItem: "Chóp lục giác" },
        ],
      },
      {
        label: "⏢ Chóp cụt",
        title: "Hình chóp cụt đều — chọn đáy",
        variants: [
          { tool: "p3:frustum:3", label: "tam giác", menuItem: "Chóp cụt tam giác" },
          { tool: "p3:frustum:4", label: "tứ giác", menuItem: "Chóp cụt tứ giác" },
          { tool: "p3:frustum:6", label: "lục giác", menuItem: "Chóp cụt lục giác" },
        ],
      },
    ],
  },
  {
    title: "KHỐI TRÒN XOAY",
    items: [
      { tool: "p3:cylinder", label: "▭ Hình trụ", menuItem: "Hình trụ" },
      { tool: "p3:cone", label: "◭ Hình nón", menuItem: "Hình nón" },
      { tool: "p3:sphere", label: "● Hình cầu", menuItem: "Hình cầu" },
    ],
  },
  {
    title: "TOẠ ĐỘ",
    items: [{ tool: "p3:axes", label: "⟂ Hệ trục Oxyz", menuItem: "Hệ trục Oxyz" }],
  },
  {
    title: "DỰNG TRONG KHÔNG GIAN",
    items: [
      { tool: "c:onedge", label: "• Điểm trên cạnh / đường" },
      { tool: "c:midpoint", label: "• Trung điểm" },
      { tool: "c:centroid", label: "G Trọng tâm tam giác" },
      { tool: "c:intersect", label: "✕ Giao điểm hai đường thẳng (cùng mặt phẳng)" },
      { tool: "c:lineplane", label: "✕ Giao điểm đường thẳng – mặt phẳng" },
      {
        tool: "c:giaotuyen",
        label: "⟋ Giao tuyến của hai mặt phẳng",
        title: "Bấm 3 điểm của mặt thứ nhất (vd S, A, C) rồi 3 điểm của mặt thứ hai (vd S, B, D)",
      },
      { tool: "c:parallel", label: "∥ Đường song song" },
      { tool: "c:perp3d", label: "⊥ Đường vuông góc từ điểm đến đường thẳng" },
      { tool: "c:section", label: "▱ Thiết diện" },
      {
        tool: "c:boxrule",
        label: "⟶ Quy tắc hình hộp",
        title: "Bấm A, rồi ba đỉnh kề B, D, A′ → AB→ + AD→ + AA′→ = AC′→",
      },
      {
        tool: "c:circumsphere",
        label: "◯ Mặt cầu ngoại tiếp",
        title: "Bấm một đỉnh của khối → mặt cầu đi qua các đỉnh, tâm I",
      },
      {
        tool: "c:flatten",
        label: "⧉ Tách mặt phẳng (hình thật)",
        title: "Bấm 3 điểm của một mặt (vd S, A, B) → hình thật hiện ngay bên cạnh khối",
      },
      {
        tool: "c:unfold",
        label: "◫ Trải phẳng đa diện (Net 2D)",
        title: "Bấm vào khối 3D chóp/lăng trụ/hộp → trải phẳng toàn bộ các mặt thành bản vẽ 2D",
      },
      { tool: "c:footplane", label: "⊥ Hình chiếu của điểm lên mặt phẳng" },
      { tool: "c:distplane", label: "📏 Khoảng cách từ điểm đến mặt phẳng" },
      { tool: "c:commonperp", label: "⟂ Đoạn vuông góc chung" },
      { tool: "c:measure", label: "∠ Đo góc" },
      { tool: "c:anglelp", label: "∠ Góc giữa đường thẳng và mặt phẳng" },
      { tool: "c:angleplanes", label: "∠ Góc giữa hai mặt phẳng" },
      { tool: "plane", label: "▱ Mặt phẳng (P)" },
    ],
  },
];

const SPACE_TOOL_SET = new Set<string>(
  SPACE_GEOMETRY_SECTIONS.flatMap((sec) =>
    sec.items.flatMap((it) => [
      ...(it.tool ? [it.tool] : []),
      ...(it.variants ? it.variants.map((v) => v.tool) : []),
    ])
  )
);

export interface SpaceGeometryMenuProps {
  activeTool: string | null;
  onSelectTool: (tool: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerStyle?: React.CSSProperties;
  activeTriggerStyle?: React.CSSProperties;
}

export const SpaceGeometryMenu: React.FC<SpaceGeometryMenuProps> = ({
  activeTool,
  onSelectTool,
  isOpen: controlledOpen,
  onOpenChange,
  triggerStyle,
  activeTriggerStyle,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (next && rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        const menuHeight = 440;
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
              (typeof window !== "undefined" ? window.innerWidth : 1280) - 360
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

  const isToolActive = Boolean(activeTool && SPACE_TOOL_SET.has(activeTool));

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

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        data-dropdown="spaceGeometry"
        data-dropdown-alias="space"
        data-tool="spaceGeometry"
        data-active={isToolActive ? "true" : undefined}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-pressed={isToolActive}
        onClick={() => setOpen(!isOpen)}
        style={defaultTriggerStyle}
        title="Hình hộp, lập phương, lăng trụ, chóp, chóp cụt, trụ, nón, cầu, hệ trục Oxyz, thiết diện…"
      >
        <IconCube3D size={14} />
        <span>Không gian</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            data-wb-space-menu="true"
            style={{
              position: "fixed",
              top: pos?.top ?? 50,
              left: pos?.left ?? 100,
              width: 348,
              maxHeight: "calc(100vh - 64px)",
              overflowY: "auto",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
              padding: "6px 0",
              zIndex: 5200,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
          {SPACE_GEOMETRY_SECTIONS.map((section, sIdx) => (
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
                if (item.variants && item.variants.length > 0) {
                  return (
                    <div
                      key={item.label}
                      title={item.title}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 12px",
                        fontSize: 13,
                        color: "#1e293b",
                      }}
                    >
                      <span style={{ minWidth: 84, fontWeight: 500 }}>{item.label}</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {item.variants.map((variant) => {
                          const selected = activeTool === variant.tool;
                          return (
                            <button
                              key={variant.tool}
                              type="button"
                              role="menuitem"
                              data-menu-item={variant.menuItem}
                              data-tool-id={variant.tool}
                              data-active={selected ? "true" : undefined}
                              aria-label={variant.menuItem}
                              title={variant.menuItem}
                              onClick={() => {
                                onSelectTool(variant.tool);
                                setOpen(false);
                              }}
                              style={{
                                padding: "2px 8px",
                                borderRadius: 999,
                                border: selected
                                  ? "1px solid #2563eb"
                                  : "1px solid #cbd5e1",
                                background: selected ? "#e8f0fe" : "#f8fafc",
                                color: selected ? "#1a56db" : "#334155",
                                fontSize: 11.5,
                                fontWeight: selected ? 600 : 500,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {variant.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                const toolId = item.tool ?? "";
                const selected = activeTool === toolId;
                return (
                  <button
                    key={toolId || item.label}
                    type="button"
                    role="menuitem"
                    data-menu-item={item.menuItem ?? toolId}
                    data-tool-id={toolId}
                    data-active={selected ? "true" : undefined}
                    title={item.title}
                    onClick={() => {
                      if (toolId) {
                        onSelectTool(toolId);
                        setOpen(false);
                      }
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
        </div>,
        document.body
      )}
    </div>
  );
};
