"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { StylePicker, StylePatch } from "./StylePicker";
import { PlaneGeometryMenu } from "./PlaneGeometryMenu";
import { SpaceGeometryMenu } from "./SpaceGeometryMenu";
import {
  FunctionsMenu,
  StatsMenu,
  RealWorldMenu,
  M3MenuAction,
} from "./FunctionsAndStatsMenus";
import { FILL_PALETTE } from "@/lib/geometry";
import type { ShortcutMap } from "@/lib/commands";
import { RealWorldArtItem } from "@/lib/realworld-art";
import { WhiteboardTool, SelectionStyleState } from "@/types/whiteboard";
import { LaserConfig } from "@/lib/laser-config";
import { ToolbarVisibilityConfig } from "@/lib/toolbar-config";
import {
  IconBrush,
  IconBucket,
  IconCalculator,
  IconChart,
  IconChemistry,
  IconCircle,
  IconCursor,
  IconDashedPen,
  IconEraser,
  IconFormula,
  IconFountain,
  IconFullscreen,
  IconFunction,
  IconHandTouch,
  IconHighlighter,
  IconLaser,
  IconMarquee,
  IconMath,
  IconPen,
  IconPencil,
  IconPhysics,
  IconPoint,
  IconPolygon,
  IconRealWorld,
  IconRedo,
  IconSegment,
  IconShapeSnap,
  IconSimLab,
  IconStylusOnly,
  IconUndo,
} from "./ToolbarIcons";

const PEN_VARIANTS = [
  { tool: "ink", label: "Bút bi (Nét đều)", short: "Bút", desc: "Nét trơn đều" },
  { tool: "ink:fountain", label: "Bút máy (Thư pháp)", short: "Bút máy", desc: "Thanh đậm theo nét" },
  { tool: "ink:pencil", label: "Bút chì", short: "Bút chì", desc: "Nét mảnh phác thảo" },
  { tool: "ink:highlighter", label: "Bút dạ quang", short: "Dạ quang", desc: "Tô sáng nổi bật" },
  { tool: "ink:brush", label: "Bút lông (Cọ vẽ)", short: "Bút lông", desc: "Nét mềm bản rộng" },
  { tool: "ink:dashed", label: "Bút nét đứt", short: "Nét đứt", desc: "Vẽ tay nét đứt" },
  { tool: "ink:laser", label: "Bút chỉ Laser (Dấu chấm / Vệt sáng)", short: "Laser", desc: "Dấu chấm hoặc Vệt sáng tự mờ" },
] as const;

const PEN_TOOL_SET = new Set<string>(PEN_VARIANTS.map((v) => v.tool));

const TOOLBAR_LAYOUT_KEY = "physboard_toolbar_layout";

function renderPenIcon(tool: string, size = 14) {
  switch (tool) {
    case "ink:fountain":
      return <IconFountain size={size} />;
    case "ink:pencil":
      return <IconPencil size={size} />;
    case "ink:highlighter":
      return <IconHighlighter size={size} color="#ca8a04" />;
    case "ink:brush":
      return <IconBrush size={size} />;
    case "ink:dashed":
      return <IconDashedPen size={size} />;
    case "ink:laser":
      return <IconLaser size={size} color="#ef4444" />;
    default:
      return <IconPen size={size} />;
  }
}

const SEGMENT_VARIANTS = [
  { tool: "c:segment", label: "╱ Đoạn", short: "╱ Đoạn" },
  { tool: "c:dseg", label: "┄ Đoạn đứt", short: "┄ Đứt" },
  { tool: "c:line", label: "│ Đường", short: "│ Đường" },
  { tool: "c:ray", label: "→ Tia", short: "→ Tia" },
  { tool: "c:vector", label: "⟶ Vectơ", short: "⟶ Vectơ" },
] as const;

const SEGMENT_TOOL_SET = new Set<string>([
  "segment",
  "c:segment",
  "c:dseg",
  "c:line",
  "c:ray",
  "c:vector",
]);

export interface ToolbarProps {
  activeTool: WhiteboardTool;
  onSelectTool: (tool: WhiteboardTool) => void;
  styleState: {
    current: {
      stroke: string | null;
      width: number | null;
      dash: boolean | null;
    };
    selection: SelectionStyleState;
  };
  onPickStyle: (patch: StylePatch, isCtrlPressed: boolean) => void;
  fillColor?: string;
  onChangeFillColor?: (color: string) => void;
  onConstructMarksChange?: (enabled: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onM3Action?: (action: M3MenuAction) => void;
  onSelectQuickRealWorld?: (item: RealWorldArtItem) => void;
  onOpenRealWorldDrawer?: () => void;
  onOpenDecorHelp?: () => void;
  onOpenPhysicsDrawer?: () => void;
  onOpenMathDrawer?: () => void;
  onOpenChemistryDrawer?: () => void;
  onOpenSimLauncher?: () => void;
  hasActiveSim?: boolean;
  onGoHome?: () => void;
  onShare?: () => void;
  onOpenCalculator?: () => void;
  isCalculatorOpen?: boolean;
  shortcutMap?: ShortcutMap;
  embedded?: boolean;
  penOnlyMode?: boolean;
  onTogglePenOnly?: (enabled: boolean) => void;
  inkToShape?: boolean;
  onToggleInkToShape?: (enabled: boolean) => void;
  laserConfig?: LaserConfig;
  onChangeLaserConfig?: (cfg: LaserConfig) => void;
  onOpenLaserSettings?: () => void;
  toolbarVisibility?: ToolbarVisibilityConfig;
  isSidebarOpen?: boolean;
  isPortrait?: boolean;
}

type OpenDropdown =
  | "select"
  | "pen"
  | "segment"
  | "fill"
  | "functions"
  | "statistics"
  | "realworld"
  | null;

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  styleState,
  onPickStyle,
  fillColor = "#1565C0",
  onChangeFillColor,
  onConstructMarksChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isFullscreen,
  onToggleFullscreen,
  onM3Action,
  onSelectQuickRealWorld,
  onOpenRealWorldDrawer,
  onOpenDecorHelp,
  onOpenPhysicsDrawer,
  onOpenMathDrawer,
  onOpenChemistryDrawer,
  onOpenSimLauncher,
  hasActiveSim = false,
  onGoHome,
  onShare,
  onOpenCalculator,
  isCalculatorOpen,
  shortcutMap,
  embedded = false,
  penOnlyMode = false,
  onTogglePenOnly,
  inkToShape = true,
  onToggleInkToShape,
  laserConfig,
  onChangeLaserConfig,
  onOpenLaserSettings,
  toolbarVisibility,
  isPortrait = false,
}) => {
  const withShortcut = (label: string, cmdId: string): string => {
    const combo = shortcutMap?.[cmdId];
    return combo ? `${label} (${combo})` : label;
  };
  const [openMenu, setOpenMenu] = useState<OpenDropdown>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const [lastSegmentTool, setLastSegmentTool] = useState<string>("c:segment");
  const [lastPenTool, setLastPenTool] = useState<string>("ink");
  const [fillHexDraft, setFillHexDraft] = useState<string | null>(null);
  const [toolbarScale, setToolbarScale] = useState<number>(1);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("physboard_toolbar_collapsed") === "true";
  });
  const headerRef = useRef<HTMLElement>(null);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("physboard_toolbar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (embedded || typeof window === "undefined") return;
    const raf = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(TOOLBAR_LAYOUT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          scale?: number;
        };
        if (
          typeof parsed.scale === "number" &&
          parsed.scale >= 0.75 &&
          parsed.scale <= 1.35
        ) {
          setToolbarScale(parsed.scale);
        }
      } catch {
        // Ignore corrupt layout storage
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [embedded]);

  const persistToolbarLayout = (scale: number) => {
    if (embedded || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        TOOLBAR_LAYOUT_KEY,
        JSON.stringify({ scale })
      );
    } catch {
      // Ignore storage quota errors
    }
  };

  const resetToolbarLayout = () => {
    setToolbarScale(1);
    setIsCollapsed(false);
    try {
      window.localStorage.removeItem(TOOLBAR_LAYOUT_KEY);
      window.localStorage.removeItem("physboard_toolbar_collapsed");
    } catch {
      // ignore
    }
  };

  const updateToolbarScale = (nextScale: number) => {
    const clamped = Math.max(0.75, Math.min(1.3, Number(nextScale.toFixed(2))));
    setToolbarScale(clamped);
    persistToolbarLayout(clamped);
  };

  const selectBtnRef = useRef<HTMLDivElement>(null);
  const penBtnRef = useRef<HTMLDivElement>(null);
  const segmentBtnRef = useRef<HTMLDivElement>(null);
  const fillBtnRef = useRef<HTMLDivElement>(null);
  const functionsWrapRef = useRef<HTMLDivElement>(null);
  const statsWrapRef = useRef<HTMLDivElement>(null);
  const realworldWrapRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const targetEl = target instanceof Element ? target : null;
      if (portalMenuRef.current?.contains(target)) return;
      if (
        targetEl?.closest(
          '[data-wb-portal-menu="true"], [data-wb-menu="functions"], [data-wb-menu="statistics"], [data-wb-menu="realworld"]'
        )
      ) {
        return;
      }
      if (
        selectBtnRef.current?.contains(target) ||
        penBtnRef.current?.contains(target) ||
        segmentBtnRef.current?.contains(target) ||
        fillBtnRef.current?.contains(target) ||
        functionsWrapRef.current?.contains(target) ||
        statsWrapRef.current?.contains(target) ||
        realworldWrapRef.current?.contains(target)
      ) {
        return;
      }
      setOpenMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpenMenu(null));
    return () => cancelAnimationFrame(id);
  }, [activeTool]);

  const togglePortalMenu = (
    id: "select" | "pen" | "segment" | "fill",
    anchorEl: HTMLElement | null
  ) => {
    if (openMenu === id) {
      setOpenMenu(null);
      return;
    }
    const rect = anchorEl?.getBoundingClientRect();
    if (rect) {
      const menuHeight = id === "pen" ? 260 : id === "fill" ? 170 : 120;
      const opensUpward =
        typeof window !== "undefined" &&
        rect.bottom + menuHeight > window.innerHeight &&
        rect.top > menuHeight;
      setMenuPos({
        top: opensUpward
          ? Math.max(8, rect.top - menuHeight - 6)
          : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 260)),
      });
    }
    setOpenMenu(id);
  };

  const isSelectActive =
    activeTool === "select" ||
    activeTool === "select:marquee" ||
    activeTool === null;
  const isPenActive = typeof activeTool === "string" && PEN_TOOL_SET.has(activeTool);
  const isEraserActive = activeTool === "erase";
  const isFormulaActive =
    activeTool === "formula" || activeTool === "text.write";
  const isPointActive =
    activeTool === "point" || activeTool === "geometry.point";
  const isSegmentActive =
    typeof activeTool === "string" && SEGMENT_TOOL_SET.has(activeTool);
  const isCircleActive = activeTool === "circle" || activeTool === "c:circle";
  const isPolygonActive =
    activeTool === "polygon" || activeTool === "c:polygon";
  const isFloodFillActive =
    activeTool === "floodFill" ||
    (typeof activeTool === "string" && activeTool.startsWith("fill:"));

  const activePenVariant =
    PEN_VARIANTS.find(
      (v) => v.tool === (isPenActive ? activeTool : lastPenTool)
    ) ?? PEN_VARIANTS[0];

  const activeSegmentVariant =
    SEGMENT_VARIANTS.find(
      (v) => v.tool === (isSegmentActive ? activeTool : lastSegmentTool)
    ) ?? SEGMENT_VARIANTS[0];

  const vis = toolbarVisibility ?? {
    groupSelection: true,
    toolSelect: true,
    toolMarquee: true,
    toolEraser: true,
    toolTrash: true,
    toolUndoRedo: true,
    groupDrawing: true,
    toolPen: true,
    toolFormula: true,
    toolInsertPdf: true,
    groupPlaneGeometry: true,
    toolPoint: true,
    toolSegment: true,
    toolCircle: true,
    toolPolygon: true,
    toolPlaneMenu: true,
    toolFill: true,
    groupSpaceGeometry: true,
    toolSpaceMenu: true,
    toolFunctionsMenu: true,
    toolStatsMenu: true,
    groupPhysics: true,
    toolPhysics: true,
    toolMathFormulas: true,
    toolChemistryFormulas: true,
    toolSimLauncher: true,
    toolRealWorld: true,
    toolCalculator: true,
  };

  const TOOLBAR_FONT =
    'var(--font-sans, "Be Vietnam Pro", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)';

  const btnBaseStyle: React.CSSProperties = {
    height: 30,
    minWidth: 28,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: isPortrait ? 6 : 5,
    paddingRight: isPortrait ? 6 : 5,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#334155",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    fontFamily: TOOLBAR_FONT,
    transition:
      "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease, color 0.15s ease, box-shadow 0.18s ease",
    willChange: "transform",
  };

  const activeStyle: React.CSSProperties = {
    ...btnBaseStyle,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 700,
    boxShadow: "0 0 0 1.5px rgba(37, 99, 235, 0.4)",
  };

  const caretStyle: React.CSSProperties = {
    height: 26,
    width: 15,
    padding: "0 2px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: 10,
    cursor: "pointer",
    userSelect: "none",
    flexShrink: 0,
    fontFamily: TOOLBAR_FONT,
    transition:
      "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease, color 0.15s ease",
  };

  const dividerV = (
    <div
      style={{
        width: 1,
        height: 16,
        background: "#e8eaed",
        margin: "0 1px",
        flexShrink: 0,
      }}
    />
  );

  const portalMenuStyle: React.CSSProperties = {
    position: "fixed",
    top: menuPos?.top ?? 50,
    left: menuPos?.left ?? 12,
    zIndex: 5100,
    background: "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    boxShadow:
      "0 14px 34px -4px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.06)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    fontFamily: TOOLBAR_FONT,
  };

  const portalItemStyle: React.CSSProperties = {
    ...btnBaseStyle,
    width: "100%",
    justifyContent: "flex-start",
    padding: "6px 10px",
    height: "auto",
    fontSize: 13,
    borderRadius: 8,
  };

  if (isCollapsed && !embedded) {
    return (
      <header
        ref={headerRef}
        data-wb-toolbar="true"
        data-wb-toolbar-collapsed="true"
        data-export-skip="true"
        className="wb-toolbar wb-toolbar-compact"
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 10px",
          background: "rgba(255, 255, 255, 0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(226, 232, 240, 0.95)",
          borderTop: "none",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
          fontFamily: TOOLBAR_FONT,
          userSelect: "none",
        }}
      >

        {/* Quick Select */}
        <button
          type="button"
          data-tool="select"
          onClick={() => onSelectTool("select")}
          style={activeTool === "select" || activeTool === null ? activeStyle : btnBaseStyle}
          title="Chọn đối tượng (V)"
        >
          <IconCursor size={14} />
        </button>

        {/* Quick Pen */}
        <button
          type="button"
          data-tool="ink"
          onClick={() => onSelectTool((lastPenTool as WhiteboardTool) || "ink")}
          style={isPenActive ? activeStyle : btnBaseStyle}
          title="Bút vẽ (P)"
        >
          {renderPenIcon(lastPenTool || "ink", 14)}
        </button>

        {/* Quick Eraser */}
        <button
          type="button"
          data-tool="erase"
          onClick={() => onSelectTool(isEraserActive ? "select" : "erase")}
          style={isEraserActive ? activeStyle : btnBaseStyle}
          title="Tẩy xoá (E)"
        >
          <IconEraser size={14} />
        </button>

        {/* Quick Style Picker */}
        <div style={{ position: "relative", display: "inline-flex" }}>
          <StylePicker
            current={styleState.current}
            selection={styleState.selection}
            onPick={onPickStyle}
            iconOnly={true}
            buttonStyle={{
              height: 24,
              paddingLeft: 4, paddingRight: 4,
              border: "1px solid #e2e8f0",
              borderRadius: 5,
            }}
          />
        </div>

        {/* Undo */}
        <button
          type="button"
          data-action="undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Hoàn tác (Ctrl+Z)"
          style={{ ...btnBaseStyle, paddingLeft: 4, paddingRight: 4, color: canUndo ? "#334155" : "#cbd5e1" }}
        >
          <IconUndo size={14} />
        </button>

        {/* Redo */}
        <button
          type="button"
          data-action="redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="Làm lại (Ctrl+Y)"
          style={{ ...btnBaseStyle, paddingLeft: 4, paddingRight: 4, color: canRedo ? "#334155" : "#cbd5e1" }}
        >
          <IconRedo size={14} />
        </button>

        {/* Quick Calculator */}
        {onOpenCalculator && (
          <button
            type="button"
            data-tool="calculator"
            onClick={onOpenCalculator}
            style={isCalculatorOpen ? activeStyle : btnBaseStyle}
            title="Máy tính Casio fx-580VN X"
          >
            <IconCalculator size={14} />
          </button>
        )}

        {/* Expand Toolbar Button */}
        <button
          type="button"
          data-wb-toolbar-expand="true"
          onClick={toggleCollapsed}
          title="Mở rộng đầy đủ thanh công cụ"
          style={{
            ...btnBaseStyle,
            background: "#0284c7",
            color: "#ffffff",
            fontWeight: 600,
            padding: "0 8px",
            borderRadius: 14,
            gap: 4,
          }}
        >
          <span>⤢</span>
          <span style={{ fontSize: 11 }}>Mở rộng</span>
        </button>
      </header>
    );
  }

  return (
    <header
      ref={headerRef}
      data-wb-toolbar="true"
      data-embedded={embedded ? "true" : undefined}
      data-export-skip="true"
      className="wb-toolbar"
      style={{
        position: embedded ? "relative" : "fixed",
        top: embedded ? undefined : 0,
        left: embedded ? undefined : 0,
        right: embedded ? undefined : 0,
        width: embedded ? undefined : "100%",
        maxWidth: embedded ? undefined : "100vw",
        boxSizing: "border-box",
        zoom: embedded ? undefined : toolbarScale,
        minHeight: 42,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        gap: isPortrait ? 2 : 4,
        padding: isPortrait ? "4px 6px" : "4px 10px",
        background: "rgba(255, 255, 255, 0.97)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: embedded ? "1px solid rgba(226, 232, 240, 0.95)" : "none",
        borderBottom: embedded ? undefined : "1px solid #e2e8f0",
        borderRadius: embedded ? 12 : 0,
        boxShadow: embedded
          ? "0 8px 24px rgba(15, 23, 42, 0.1)"
          : "none",
        fontFamily: TOOLBAR_FONT,
        overflow: "visible",
      }}
    >

      {/* Left + Center Tool Groups */}
      <div
        className="wb-scroll"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: isPortrait ? 2 : 2,
          minWidth: 0,
          flex: "1 1 auto",
          overflowX: "auto",
          padding: "3px 2px",
          margin: "-3px 0",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {/* Brand Home Button / Link */}
        {onGoHome ? (
          <button
            type="button"
            onClick={onGoHome}
            title="PhysBoard — Trang chủ"
            aria-label="PhysBoard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              marginRight: 2,
              padding: 0,
              border: "none",
              background: "transparent",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="./logo.png"
              alt="PhysBoard"
              width={20}
              height={20}
              style={{ borderRadius: "50%", display: "block" }}
            />
            <span className="sr-only">PhysBoard</span>
          </button>
        ) : (
          <a
            href="./"
            title="PhysBoard — Trang chủ"
            aria-label="PhysBoard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              marginRight: 2,
              textDecoration: "none",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="./logo.png"
              alt="PhysBoard"
              width={20}
              height={20}
              style={{ borderRadius: "50%", display: "block" }}
            />
            <span className="sr-only">PhysBoard</span>
          </a>
        )}

        {dividerV}

        {/* --- GROUP 1: Chọn, Bút, Tẩy | Màu & Nét | Công thức & Chèn --- */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        {/* Select Split */}
        {vis.groupSelection && vis.toolSelect && (
        <div
          ref={selectBtnRef}
          className="wb-tool-split"
          data-active={isSelectActive ? "true" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isSelectActive
              ? "linear-gradient(135deg, rgba(238, 242, 255, 0.98), rgba(245, 243, 255, 0.98))"
              : "transparent",
            borderRadius: 7,
            boxShadow: isSelectActive
              ? "0 0 0 1.5px rgba(99, 102, 241, 0.45), 0 0 12px rgba(168, 85, 247, 0.28)"
              : undefined,
            transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            type="button"
            data-tool="select"
            data-active={isSelectActive ? "true" : undefined}
            aria-pressed={isSelectActive}
            onClick={() => {
              if (isSelectActive) {
                togglePortalMenu("select", selectBtnRef.current);
              } else {
                onSelectTool("select");
              }
            }}
            style={
              isSelectActive
                ? { ...activeStyle, background: "transparent" }
                : btnBaseStyle
            }
            title={withShortcut(
              isSelectActive ? "Chọn (bấm để mở tuỳ chọn)" : "Chọn",
              "tool:select"
            )}
          >
            {activeTool === "select:marquee" ? (
              <>
                <IconMarquee size={14} /> Chọn vùng
              </>
            ) : (
              <>
                <IconCursor size={14} /> Chọn
              </>
            )}
          </button>
          <button
            type="button"
            data-dropdown="select"
            aria-haspopup="menu"
            aria-expanded={openMenu === "select"}
            aria-label="Tuỳ chọn chọn"
            title="Mở tuỳ chọn: chọn đối tượng / chọn vùng"
            onClick={() => togglePortalMenu("select", selectBtnRef.current)}
            style={caretStyle}
          >
            ▾
          </button>
        </div>
        )}

        {/* Pen Split (6 pen types via dropdown + quick fountain shortcut) */}
        {vis.groupDrawing && vis.toolPen && (
        <div
          ref={penBtnRef}
          className="wb-tool-split"
          data-active={isPenActive ? "true" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isPenActive
              ? "linear-gradient(135deg, rgba(238, 242, 255, 0.98), rgba(245, 243, 255, 0.98))"
              : "transparent",
            borderRadius: 7,
            boxShadow: isPenActive
              ? "0 0 0 1.5px rgba(99, 102, 241, 0.45), 0 0 12px rgba(168, 85, 247, 0.28)"
              : undefined,
            transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            type="button"
            data-tool="ink"
            data-active={isPenActive ? "true" : undefined}
            aria-pressed={isPenActive}
            onClick={() => {
              onSelectTool(lastPenTool);
            }}
            style={
              isPenActive
                ? { ...activeStyle, background: "transparent" }
                : btnBaseStyle
            }
            title={withShortcut(
              isPenActive
                ? `${activePenVariant.label} (bấm để đổi loại bút)`
                : `${activePenVariant.label} (${activePenVariant.desc})`,
              "tool:ink"
            )}
          >
            {renderPenIcon(activePenVariant.tool, 14)}
            <span>{activePenVariant.short}</span>
          </button>
          <button
            type="button"
            data-dropdown="pen"
            aria-haspopup="menu"
            aria-expanded={openMenu === "pen"}
            aria-label="Chọn loại bút (Bi, Máy, Chì, Dạ quang, Lông, Nét đứt, Laser)"
            title="Chọn loại bút"
            onClick={() => togglePortalMenu("pen", penBtnRef.current)}
            style={caretStyle}
          >
            ▾
          </button>
        </div>
        )}

        {/* Laser Quick Tool Button with Split Setting Caret */}
        <div
          className="wb-tool-split"
          data-active={activeTool === "ink:laser" ? "true" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            background:
              activeTool === "ink:laser"
                ? "linear-gradient(135deg, #fee2e2, #fef2f2)"
                : "transparent",
            borderRadius: 7,
            boxShadow:
              activeTool === "ink:laser"
                ? "0 0 0 1.5px rgba(239, 68, 68, 0.5), 0 0 14px rgba(248, 113, 113, 0.4)"
                : undefined,
            transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            type="button"
            data-tool="ink:laser"
            data-laser-mode={laserConfig?.mode || "trail"}
            data-active={activeTool === "ink:laser" ? "true" : undefined}
            aria-pressed={activeTool === "ink:laser"}
            onClick={() => {
              if (activeTool === "ink:laser" && onChangeLaserConfig && laserConfig) {
                const nextMode = laserConfig.mode === "dot" ? "trail" : "dot";
                onChangeLaserConfig({ ...laserConfig, mode: nextMode });
              } else {
                onSelectTool("ink:laser");
              }
            }}
            style={
              activeTool === "ink:laser"
                ? {
                    ...activeStyle,
                    background: "#fee2e2",
                    color: "#b91c1c",
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    paddingRight: 4,
                  }
                : {
                    ...btnBaseStyle,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    paddingRight: 4,
                  }
            }
            title={
              laserConfig?.mode === "dot"
                ? `Bút chỉ Laser: Đang ở chế độ DẤU CHẤM (Bấm để đổi sang Vệt sáng, bấm ⚙ để chỉnh cỡ ${laserConfig.dotSize}px & màu)`
                : "Bút chỉ Laser: Đang ở chế độ VỆT SÁNG (Bấm để đổi sang Dấu chấm, bấm ⚙ để chỉnh độ rộng & màu)"
            }
          >
            {laserConfig?.mode === "dot" ? (
              <span
                style={{
                  display: "inline-block",
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: laserConfig?.color || "#ef4444",
                  boxShadow: `0 0 5px ${laserConfig?.color || "#ef4444"}`,
                }}
              />
            ) : (
              <IconLaser size={14} color={activeTool === "ink:laser" ? "#b91c1c" : laserConfig?.color || "#ef4444"} />
            )}
            <span>Laser</span>
          </button>
          <button
            type="button"
            data-action="laser-settings"
            aria-label="Cài đặt chế độ Laser (Dấu chấm / Vệt sáng, kích thước, màu)"
            title="Cài đặt Laser: Chọn 1 dấu chấm hoặc vệt sáng, thay đổi kích thước & màu sắc"
            onClick={onOpenLaserSettings}
            style={{
              ...caretStyle,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              background: activeTool === "ink:laser" ? "#fee2e2" : "transparent",
              color: activeTool === "ink:laser" ? "#b91c1c" : "#64748b",
              borderLeft: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            ⚙
          </button>
        </div>

        {/* Eraser */}
        {vis.groupSelection && vis.toolEraser && (
        <button
          type="button"
          data-tool="erase"
          data-active={isEraserActive ? "true" : undefined}
          aria-pressed={isEraserActive}
          onClick={() => onSelectTool(isEraserActive ? "select" : "erase")}
          style={isEraserActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Tẩy nét vẽ", "tool:erase")}
        >
          <IconEraser size={14} />
          <span>Tẩy</span>
        </button>
        )}

        {/* Undo & Redo */}
        {vis.groupSelection && vis.toolUndoRedo && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            <button
              type="button"
              data-action="undo"
              onClick={onUndo}
              disabled={!canUndo}
              title="Hoàn tác (Ctrl+Z)"
              aria-label="Hoàn tác"
              style={{ ...btnBaseStyle, paddingLeft: 4, paddingRight: 4, color: canUndo ? "#334155" : "#cbd5e1" }}
            >
              <IconUndo size={14} />
            </button>
            <button
              type="button"
              data-action="redo"
              onClick={onRedo}
              disabled={!canRedo}
              title="Làm lại (Ctrl+Y)"
              aria-label="Làm lại"
              style={{ ...btnBaseStyle, paddingLeft: 4, paddingRight: 4, color: canRedo ? "#334155" : "#cbd5e1" }}
            >
              <IconRedo size={14} />
            </button>
          </div>
        )}

        {/* StylePicker (Color & Width) */}
        <StylePicker
          current={styleState.current}
          selection={styleState.selection}
          onPick={onPickStyle}
          iconOnly={true}
          buttonStyle={{
            height: 24,
            paddingLeft: 4, paddingRight: 4,
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            gap: 3,
          }}
        />

        {/* Stylus-only vs Hand-drawing quick toggle */}
        {onTogglePenOnly && (
          <button
            type="button"
            data-action="toggle-pen-only"
            data-active={penOnlyMode ? "true" : "false"}
            aria-pressed={penOnlyMode}
            onClick={() => onTogglePenOnly(!penOnlyMode)}
            title={
              penOnlyMode
                ? "Chế độ chỉ bút: Đang BẬT (chặn tay vẽ dính mực)"
                : "Chế độ chỉ bút: Đang TẮT (cho phép vẽ cả tay và bút)"
            }
            style={
              penOnlyMode
                ? {
                    ...activeStyle,
                    border: "1px solid #3b82f6",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                  }
                : btnBaseStyle
            }
          >
            {penOnlyMode ? <IconStylusOnly size={14} /> : <IconHandTouch size={14} />}
          </button>
        )}

        {/* Formula */}
        {vis.groupDrawing && vis.toolFormula && (
        <button
          type="button"
          data-tool="formula"
          data-active={isFormulaActive ? "true" : undefined}
          aria-pressed={isFormulaActive}
          onClick={() => onSelectTool(isFormulaActive ? "select" : "formula")}
          style={isFormulaActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Công thức", "tool:formula")}
        >
          <IconFormula size={14} />
          <span>Công thức</span>
        </button>
        )}

        {dividerV}
        </div>

        {/* --- GROUP 2: Hình học phẳng & Tô màu --- */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        {/* Point */}
        <button
          type="button"
          data-tool="point"
          data-active={isPointActive ? "true" : undefined}
          aria-pressed={isPointActive}
          onClick={() => onSelectTool(isPointActive ? "select" : "point")}
          style={isPointActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Điểm", "tool:point")}
        >
          <IconPoint size={13} />
          <span>Điểm</span>
        </button>

        {/* Segment Split (CRITICAL DOM ORDER: data-dropdown="segment" FIRST with order:2, data-tool="segment" SECOND with order:1) */}
        <div
          ref={segmentBtnRef}
          className="wb-tool-split"
          data-active={isSegmentActive ? "true" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isSegmentActive
              ? "linear-gradient(135deg, rgba(238, 242, 255, 0.98), rgba(245, 243, 255, 0.98))"
              : "transparent",
            borderRadius: 7,
            boxShadow: isSegmentActive
              ? "0 0 0 1.5px rgba(99, 102, 241, 0.45), 0 0 12px rgba(168, 85, 247, 0.28)"
              : undefined,
            transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            type="button"
            data-dropdown="segment"
            aria-haspopup="menu"
            aria-expanded={openMenu === "segment"}
            aria-label="Chọn loại đoạn / đường / tia / vectơ"
            title="Chọn đoạn, đoạn đứt, đường, tia, vectơ"
            onClick={() => togglePortalMenu("segment", segmentBtnRef.current)}
            style={{ ...caretStyle, order: 2 }}
          >
            ▾
          </button>
          <button
            type="button"
            data-tool="segment"
            data-active={isSegmentActive ? "true" : undefined}
            aria-pressed={isSegmentActive}
            title={withShortcut(
              isSegmentActive
                ? "Đoạn (bấm để đổi loại đoạn / tia / vectơ)"
                : "Đoạn",
              "tool:c:segment"
            )}
            onClick={() => {
              if (isSegmentActive) {
                togglePortalMenu("segment", segmentBtnRef.current);
              } else {
                onSelectTool(lastSegmentTool);
              }
            }}
            style={{
              ...(isSegmentActive
                ? { ...activeStyle, background: "transparent" }
                : btnBaseStyle),
              order: 1,
            }}
          >
            <IconSegment size={13} />
            <span>{activeSegmentVariant.short.replace(/^[^\p{L}\p{N}]+\s*/u, "")}</span>
          </button>
        </div>

        {/* Circle */}
        <button
          type="button"
          data-tool="circle"
          data-active={isCircleActive ? "true" : undefined}
          aria-pressed={isCircleActive}
          onClick={() => onSelectTool(isCircleActive ? "select" : "circle")}
          style={isCircleActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Đường tròn", "tool:circle")}
        >
          <IconCircle size={13} />
          <span>Tròn</span>
        </button>

        {/* Polygon */}
        <button
          type="button"
          data-tool="polygon"
          data-active={isPolygonActive ? "true" : undefined}
          aria-pressed={isPolygonActive}
          onClick={() => onSelectTool(isPolygonActive ? "select" : "polygon")}
          style={isPolygonActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Đa giác", "tool:polygon")}
        >
          <IconPolygon size={13} />
          <span>Đa giác</span>
        </button>

        {/* Plane Geometry Menu */}
        <PlaneGeometryMenu
          activeTool={typeof activeTool === "string" ? activeTool : null}
          onSelectTool={(t) => onSelectTool(t)}
          onConstructMarksChange={onConstructMarksChange}
          triggerStyle={btnBaseStyle}
          activeTriggerStyle={activeStyle}
        />

        {/* Flood Fill Split (CRITICAL DOM ORDER: data-popover="fill" FIRST with order:2, data-tool="floodFill" SECOND with order:1) */}
        <div
          ref={fillBtnRef}
          className="wb-tool-split"
          data-active={isFloodFillActive ? "true" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isFloodFillActive
              ? "linear-gradient(135deg, rgba(238, 242, 255, 0.98), rgba(245, 243, 255, 0.98))"
              : "transparent",
            borderRadius: 7,
            boxShadow: isFloodFillActive
              ? "0 0 0 1.5px rgba(99, 102, 241, 0.45), 0 0 12px rgba(168, 85, 247, 0.28)"
              : undefined,
            transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            type="button"
            data-popover="fill"
            aria-haspopup="dialog"
            aria-expanded={openMenu === "fill"}
            aria-label="Chọn màu tô"
            title="Chọn màu tô"
            onClick={() => togglePortalMenu("fill", fillBtnRef.current)}
            style={{ ...caretStyle, order: 2 }}
          >
            ▾
          </button>
          <button
            type="button"
            data-tool="floodFill"
            data-active={isFloodFillActive ? "true" : undefined}
            aria-pressed={isFloodFillActive}
            title={
              isFloodFillActive
                ? "Tô màu (bấm để đổi bảng màu tô)"
                : "Tô màu"
            }
            onClick={() => {
              if (isFloodFillActive) {
                togglePortalMenu("fill", fillBtnRef.current);
              } else {
                onSelectTool("floodFill");
              }
            }}
            style={{
              ...(isFloodFillActive
                ? { ...activeStyle, background: "transparent" }
                : btnBaseStyle),
              order: 1,
            }}
          >
            <IconBucket size={14} />
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 2.5,
                border: "1px solid rgba(15,23,42,0.25)",
                background:
                  fillColor === "none"
                    ? "repeating-linear-gradient(135deg,#fff,#fff 3px,#fecaca 3px,#fecaca 5px)"
                    : fillColor,
                display: "inline-block",
              }}
            />
            <span className="sr-only">Tô màu</span>
          </button>
        </div>

        {dividerV}
        </div>

        {/* --- GROUP 3: Không gian, Giải tích & Thí nghiệm --- */}
        {vis.groupSpaceGeometry && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        {vis.toolSpaceMenu && (
        <SpaceGeometryMenu
          activeTool={typeof activeTool === "string" ? activeTool : null}
          onSelectTool={(t) => onSelectTool(t)}
          triggerStyle={btnBaseStyle}
          activeTriggerStyle={activeStyle}
        />
        )}

        {/* Functions Menu */}
        {vis.toolFunctionsMenu && (
        <div
          ref={functionsWrapRef}
          style={{ position: "relative", display: "inline-flex" }}
        >
          <button
            type="button"
            data-dropdown="functions"
            data-tool="functions"
            aria-haspopup="menu"
            aria-expanded={openMenu === "functions"}
            onClick={() =>
              setOpenMenu((prev) =>
                prev === "functions" ? null : "functions"
              )
            }
            style={openMenu === "functions" ? activeStyle : btnBaseStyle}
            title="Hệ trục Oxy, đồ thị, cônic, bảng biến thiên, lượng giác"
          >
            <IconFunction size={14} />
            <span>Hàm số ▾</span>
          </button>
          <FunctionsMenu
            open={openMenu === "functions"}
            onClose={() => setOpenMenu(null)}
            onAction={(act) => onM3Action?.(act)}
            anchorRef={functionsWrapRef}
          />
        </div>
        )}

        {/* Statistics Menu */}
        {vis.toolStatsMenu && (
        <div
          ref={statsWrapRef}
          style={{ position: "relative", display: "inline-flex" }}
        >
          <button
            type="button"
            data-dropdown="statistics"
            data-tool="statistics"
            aria-haspopup="menu"
            aria-expanded={openMenu === "statistics"}
            onClick={() =>
              setOpenMenu((prev) =>
                prev === "statistics" ? null : "statistics"
              )
            }
            style={openMenu === "statistics" ? activeStyle : btnBaseStyle}
            title="Biểu đồ, hoán vị, chỉnh hợp, tổ hợp, xác suất, Ven, trục số"
          >
            <IconChart size={14} />
            <span>Thống kê ▾</span>
          </button>
          <StatsMenu
            open={openMenu === "statistics"}
            onClose={() => setOpenMenu(null)}
            onAction={(act) => onM3Action?.(act)}
            anchorRef={statsWrapRef}
          />
        </div>
        )}
        </div>
        )}

        {/* --- GROUP 4: Vật lý & Dụng cụ --- */}
        {vis.groupPhysics && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        {/* Real-World Menu */}
        {vis.toolRealWorld && (
        <div
          ref={realworldWrapRef}
          style={{ position: "relative", display: "inline-flex" }}
        >
          <button
            type="button"
            data-dropdown="realworld"
            data-tool="realworld"
            aria-haspopup="menu"
            aria-expanded={openMenu === "realworld"}
            onClick={() =>
              setOpenMenu((prev) =>
                prev === "realworld" ? null : "realworld"
              )
            }
            style={openMenu === "realworld" ? activeStyle : btnBaseStyle}
            title="Đồ vật thực tế và trang trí đoạn"
          >
            <IconRealWorld size={14} />
            <span>Thực tế ▾</span>
          </button>
          <RealWorldMenu
            open={openMenu === "realworld"}
            onClose={() => setOpenMenu(null)}
            onSelectQuickItem={(item) => onSelectQuickRealWorld?.(item)}
            onOpenDrawer={() => onOpenRealWorldDrawer?.()}
            onOpenDecorHelp={() => onOpenDecorHelp?.()}
            anchorRef={realworldWrapRef}
          />
        </div>
        )}

        {/* Physics Drawer Button (Mở thư viện Công thức Vật lý) */}
        {vis.toolPhysics && onOpenPhysicsDrawer && (
          <button
            type="button"
            data-tool="physics"
            data-action="open-physics-drawer"
            onClick={onOpenPhysicsDrawer}
            style={btnBaseStyle}
            title="Bảng công thức, hằng số Vật lý 10–11–12 & Đổi đơn vị"
          >
            <IconPhysics size={14} color="#7c3aed" />
            <span>Vật lý</span>
          </button>
        )}

        {/* Math Formulas Drawer Button */}
        {vis.toolMathFormulas && onOpenMathDrawer && (
          <button
            type="button"
            data-tool="math-formulas"
            data-action="open-math-drawer"
            onClick={onOpenMathDrawer}
            style={btnBaseStyle}
            title="Bảng công thức Toán 10–11–12 theo từng chủ đề"
          >
            <IconMath size={15} />
            <span>Toán</span>
          </button>
        )}

        {/* Chemistry Formulas Drawer Button */}
        {vis.toolChemistryFormulas && onOpenChemistryDrawer && (
          <button
            type="button"
            data-tool="chemistry-formulas"
            data-action="open-chemistry-drawer"
            onClick={onOpenChemistryDrawer}
            style={btnBaseStyle}
            title="Bảng công thức Hoá học 10–11–12 theo từng chủ đề"
          >
            <IconChemistry size={15} />
            <span>Hoá</span>
          </button>
        )}

        {/* Fullscreen PhET / HTML Simulation Launcher */}
        {vis.toolSimLauncher && onOpenSimLauncher && (
          <button
            type="button"
            data-tool="sim-launcher"
            data-action="open-sim-launcher"
            onClick={onOpenSimLauncher}
            style={{
              ...btnBaseStyle,
              ...(hasActiveSim
                ? {
                    background: "#ecfdf5",
                    borderColor: "#6ee7b7",
                    color: "#047857",
                  }
                : {}),
            }}
            title="Thí nghiệm mô phỏng PhET Online & File HTML Offline (toàn màn hình)"
          >
            <IconSimLab size={15} />
            <span>Thí nghiệm</span>
          </button>
        )}

        {/* Quick Calculator Tool */}
        {vis.toolCalculator && onOpenCalculator && (
          <button
            type="button"
            data-tool="calculator"
            data-action="open-calculator"
            data-active={isCalculatorOpen ? "true" : undefined}
            aria-pressed={isCalculatorOpen}
            onClick={onOpenCalculator}
            style={isCalculatorOpen ? activeStyle : btnBaseStyle}
            title="Máy tính học tập (Casio / Khoa học & Chèn kết quả vào bảng)"
          >
            <IconCalculator size={14} />
            <span>Máy tính</span>
          </button>
        )}
        </div>
        )}
      </div>

      {/* --- Pinned Right Controls --- */}
      <div
        data-wb-toolbar-pinned="true"
        style={{
          position: "relative",
          zIndex: 2,
          background: "transparent",
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: 2,
          marginLeft: "auto",
          paddingLeft: 6,
          flexShrink: 0,
        }}
      >
        {/* Share (LAN Sync mode only if enabled) */}
        {onShare && process.env.NEXT_PUBLIC_ENABLE_SYNC === "1" && (
          <button
            type="button"
            data-action="share"
            onClick={onShare}
            title="Chia sẻ"
            style={{ ...btnBaseStyle, paddingLeft: 5, paddingRight: 5 }}
          >
            <span aria-hidden="true">🔗</span>
            <span className="sr-only">Chia sẻ</span>
          </button>
        )}

        {/* Fullscreen (always available in both Portrait & Landscape) */}
        <button
          type="button"
          data-tool="fullscreen"
          onClick={onToggleFullscreen}
          title={
            isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"
          }
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          style={{ ...btnBaseStyle, paddingLeft: 6, paddingRight: 6 }}
        >
          <IconFullscreen exit={isFullscreen} size={15} />
        </button>

        {/* Toolbar Zoom / Size Pill */}
        {!embedded && !isPortrait && (
          <div
            data-wb-toolbar-scale="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 24,
              borderRadius: 6,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "#e2e8f0",
              background: "#f8fafc",
              marginLeft: 2,
              overflow: "hidden",
            }}
            title="Thu phóng thanh công cụ (bấm phần trăm để đặt lại vị trí & kích thước)"
          >
            <button
              type="button"
              data-wb-toolbar-scale-dec="true"
              aria-label="Thu nhỏ thanh công cụ"
              onClick={() => updateToolbarScale(toolbarScale - 0.1)}
              style={{
                width: 18,
                height: "100%",
                borderStyle: "none",
                background: "transparent",
                color: "#475569",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              −
            </button>
            <button
              type="button"
              data-wb-toolbar-scale-reset="true"
              aria-label="Đặt lại vị trí và kích thước thanh công cụ"
              onClick={resetToolbarLayout}
              style={{
                minWidth: 34,
                height: "100%",
                borderStyle: "none",
                borderLeftWidth: 1,
                borderLeftStyle: "solid",
                borderLeftColor: "#e2e8f0",
                borderRightWidth: 1,
                borderRightStyle: "solid",
                borderRightColor: "#e2e8f0",
                background: "transparent",
                color: "#334155",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                padding: "0 3px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.round(toolbarScale * 100)}%
            </button>
            <button
              type="button"
              data-wb-toolbar-scale-inc="true"
              aria-label="Phóng to thanh công cụ"
              onClick={() => updateToolbarScale(toolbarScale + 0.1)}
              style={{
                width: 18,
                height: "100%",
                borderStyle: "none",
                background: "transparent",
                color: "#475569",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              +
            </button>
          </div>
        )}

        {/* Minimize / Collapse Toolbar Button */}
        {!embedded && (
          <button
            type="button"
            data-wb-toolbar-collapse="true"
            onClick={toggleCollapsed}
            title="Thu gọn thanh công cụ (Tối giản để vẽ)"
            aria-label="Thu gọn thanh công cụ"
            style={{
              ...btnBaseStyle,
              paddingLeft: isPortrait ? 4 : 6,
              paddingRight: isPortrait ? 4 : 6,
              background: "#f1f5f9",
              color: "#475569",
              borderRadius: 6,
              fontWeight: 600,
              gap: 2,
              fontSize: 11,
              marginLeft: 2,
            }}
          >
            <span>▲</span>
            {!isPortrait && <span>Thu gọn</span>}
          </button>
        )}
      </div>

      {/* Portal Dropdowns: Select, Pen, Segment, Fill */}
      {typeof document !== "undefined" &&
        openMenu === "select" &&
        createPortal(
          <div
            ref={portalMenuRef}
            role="menu"
            data-wb-portal-menu="true"
            style={{ ...portalMenuStyle, minWidth: 146 }}
          >
            <button
              type="button"
              role="menuitem"
              data-menu-item="select"
              onClick={() => {
                onSelectTool("select");
                setOpenMenu(null);
              }}
              style={{
                ...portalItemStyle,
                background:
                  activeTool === "select" || activeTool === null
                    ? "#e8f0fe"
                    : "transparent",
                color:
                  activeTool === "select" || activeTool === null
                    ? "#1a73e8"
                    : "#1e293b",
              }}
            >
              <IconCursor size={14} /> Chọn đối tượng
            </button>
            <button
              type="button"
              role="menuitem"
              data-menu-item="select:marquee"
              data-testid="select-marquee"
              onClick={() => {
                onSelectTool("select:marquee");
                setOpenMenu(null);
              }}
              style={{
                ...portalItemStyle,
                background:
                  activeTool === "select:marquee" ? "#e8f0fe" : "transparent",
                color:
                  activeTool === "select:marquee" ? "#1a73e8" : "#1e293b",
              }}
            >
              <IconMarquee size={14} /> Chọn vùng
            </button>
          </div>,
          document.body
        )}

      {typeof document !== "undefined" &&
        openMenu === "pen" &&
        createPortal(
          <div
            ref={portalMenuRef}
            role="menu"
            data-wb-pen-menu="true"
            data-wb-portal-menu="true"
            style={{ ...portalMenuStyle, minWidth: 215, padding: 6 }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#64748b",
                padding: "2px 8px 6px",
              }}
            >
              Chọn loại bút viết & vẽ
            </div>
            {PEN_VARIANTS.map((v) => {
              const selected = activeTool === v.tool;
              return (
                <button
                  key={v.tool}
                  type="button"
                  role="menuitem"
                  data-tool={v.tool}
                  data-menu-item={v.tool}
                  onClick={() => {
                    if (v.tool !== "ink:fountain") {
                      setLastPenTool(v.tool);
                    }
                    onSelectTool(v.tool);
                    setOpenMenu(null);
                  }}
                  style={{
                    ...portalItemStyle,
                    justifyContent: "space-between",
                    gap: 10,
                    background: selected ? "#e8f0fe" : "transparent",
                    color: selected ? "#1a73e8" : "#1e293b",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {renderPenIcon(v.tool, 15)}
                    <span>{v.label}</span>
                  </span>
                  <span style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 400 }}>
                    {v.desc}
                  </span>
                </button>
              );
            })}
            {onToggleInkToShape && (
              <>
                <div style={{ height: 1, background: "#e2e8f0", margin: "4px 6px" }} />
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={inkToShape}
                  data-action="toggle-ink-to-shape"
                  onClick={() => onToggleInkToShape(!inkToShape)}
                  style={{
                    ...portalItemStyle,
                    justifyContent: "space-between",
                    gap: 10,
                    background: inkToShape ? "#eef2ff" : "transparent",
                    color: inkToShape ? "#4338ca" : "#475569",
                  }}
                  title="Tự động nắn nét vẽ tay thành đoạn thẳng, đường tròn, elip, đa giác"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <IconShapeSnap size={15} />
                    <span>Tự nắn hình chuẩn</span>
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: inkToShape ? "#4f46e5" : "#e2e8f0",
                      color: inkToShape ? "#ffffff" : "#64748b",
                    }}
                  >
                    {inkToShape ? "BẬT" : "TẮT"}
                  </span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}

      {typeof document !== "undefined" &&
        openMenu === "segment" &&
        createPortal(
          <div
            ref={portalMenuRef}
            role="menu"
            data-wb-portal-menu="true"
            style={{ ...portalMenuStyle, minWidth: 146 }}
          >
            {SEGMENT_VARIANTS.map((v) => {
              const selected =
                activeTool === v.tool ||
                (v.tool === "c:segment" && activeTool === "segment");
              return (
                <button
                  key={v.tool}
                  type="button"
                  role="menuitem"
                  data-tool={v.tool}
                  data-menu-item={v.tool}
                  onClick={() => {
                    setLastSegmentTool(v.tool);
                    onSelectTool(v.tool);
                    setOpenMenu(null);
                  }}
                  style={{
                    ...portalItemStyle,
                    background: selected ? "#e8f0fe" : "transparent",
                    color: selected ? "#1a73e8" : "#1e293b",
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}

      {typeof document !== "undefined" &&
        openMenu === "fill" &&
        createPortal(
          <div
            ref={portalMenuRef}
            role="dialog"
            aria-label="Màu tô"
            data-wb-fill-menu="true"
            data-wb-portal-menu="true"
            style={{
              ...portalMenuStyle,
              width: 242,
              padding: 10,
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.35 }}>
              Chọn màu → bấm vào trong vùng cần tô (vùng sáng lên trước khi bấm)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 28px)",
                gap: 6,
              }}
            >
              {FILL_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  data-fill-color={hex}
                  data-color={hex}
                  aria-label={`Tô màu ${hex}`}
                  title={hex}
                  onClick={() => {
                    onChangeFillColor?.(hex);
                    onSelectTool("floodFill");
                    setOpenMenu(null);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid rgba(0,0,0,0.16)",
                    background: hex,
                    cursor: "pointer",
                    outline:
                      fillColor === hex ? "2px solid #1a56db" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
              <button
                type="button"
                data-fill-color="none"
                data-color="none"
                aria-label="Xoá màu tô"
                title="Xoá màu tô"
                onClick={() => {
                  onChangeFillColor?.("none");
                  onSelectTool("floodFill");
                  setOpenMenu(null);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "#cbd5e1",
                  background:
                    "repeating-linear-gradient(135deg,#fff,#fff 4px,#fecaca 4px,#fecaca 6px)",
                  cursor: "pointer",
                  outline:
                    fillColor === "none" ? "2px solid #1a56db" : "none",
                  outlineOffset: 2,
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopStyle: "solid",
                borderTopColor: "#f1f5f9",
              }}
            >
              <label
                title="Chọn màu tô tuỳ ý"
                style={{
                  position: "relative",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background:
                    "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "rgba(0,0,0,0.2)",
                  cursor: "pointer",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                <input
                  type="color"
                  aria-label="Bảng màu tô tuỳ ý"
                  value={
                    /^#[0-9a-f]{6}$/i.test(fillColor) ? fillColor : "#3b82f6"
                  }
                  onChange={(e) => {
                    const hex = e.target.value;
                    setFillHexDraft(hex);
                    onChangeFillColor?.(hex);
                    onSelectTool("floodFill");
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                  }}
                />
              </label>
              <input
                type="text"
                data-testid="fill-custom-hex"
                value={fillHexDraft ?? (fillColor !== "none" ? fillColor : "#3b82f6")}
                maxLength={7}
                placeholder="#3b82f6"
                aria-label="Mã hex màu tô"
                onChange={(e) => {
                  const raw = e.target.value;
                  setFillHexDraft(raw);
                  if (/^#[0-9a-f]{6}$/i.test(raw.trim())) {
                    onChangeFillColor?.(raw.trim());
                    onSelectTool("floodFill");
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 26,
                  padding: "0 7px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  borderRadius: 6,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                }}
              />
            </div>
          </div>,
          document.body
        )}

    </header>
  );
};
