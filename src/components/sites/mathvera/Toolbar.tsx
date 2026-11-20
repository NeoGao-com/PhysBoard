"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import * as Y from "yjs";
import { StylePicker, StylePatch } from "./StylePicker";
import { PlaneGeometryMenu } from "./PlaneGeometryMenu";
import { SpaceGeometryMenu } from "./SpaceGeometryMenu";
import {
  FunctionsMenu,
  StatsMenu,
  RealWorldMenu,
  M3MenuAction,
} from "./FunctionsAndStatsMenus";
import { PageBar } from "./PageBar";
import { FILL_PALETTE } from "@/lib/geometry";
import type { ShortcutMap } from "@/lib/commands";
import type { ImportedImageResult, ImportedPdfPage } from "@/lib/pdf-import";
import { RealWorldArtItem } from "@/lib/realworld-art";
import type { PageBoardConfig } from "@/lib/board-themes";
import { WhiteboardTool, SelectionStyleState } from "@/types/whiteboard";
import { LaserConfig } from "@/lib/laser-config";
import { ToolbarVisibilityConfig } from "@/lib/toolbar-config";
import {
  ModularLayoutConfig,
  DEFAULT_MODULAR_LAYOUT,
  type ModularBlockId,
} from "@/lib/modular-toolbar";
import { FloatingDock } from "./FloatingDock";
import {
  IconBrush,
  IconBucket,
  IconCalculator,
  IconChart,
  IconCircle,
  IconCursor,
  IconDashedPen,
  IconEraser,
  IconFormula,
  IconFountain,
  IconFullscreen,
  IconFunction,
  IconGrip,
  IconHandTouch,
  IconHighlighter,
  IconLaser,
  IconMarquee,
  IconPen,
  IconPencil,
  IconPhysics,
  IconPoint,
  IconPolygon,
  IconRealWorld,
  IconRedo,
  IconSegment,
  IconShapeSnap,
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
  { tool: "ink:laser", label: "Bút chỉ Laser (Tự mờ)", short: "Laser", desc: "Vệt sáng tự tan biến sau 1.5s" },
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
  doc?: Y.Doc | null;
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
  selectedCount: number;
  onDeleteSelected: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  page?: { current: number; count: number };
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onAddPage?: () => void;
  onInsertTable?: (rows: number, cols: number) => void;
  onInsertImage?: (img: ImportedImageResult) => void;
  onInsertPdfPages?: (pages: ImportedPdfPage[]) => void;
  onM3Action?: (action: M3MenuAction) => void;
  onSelectQuickRealWorld?: (item: RealWorldArtItem) => void;
  onOpenRealWorldDrawer?: () => void;
  onOpenDecorHelp?: () => void;
  onOpenPhysicsDrawer?: () => void;
  onOpenHtmlSimModal?: () => void;
  onGoHome?: () => void;
  onSaveFile?: () => void;
  onOpenFile?: () => void;
  onShare?: () => void;
  getBoardElement?: () => SVGSVGElement | HTMLElement | null;
  hasPaper?: boolean;
  labelScale?: number;
  dotScale?: number;
  boardConfig?: PageBoardConfig;
  onChangeBoardConfig?: (next: PageBoardConfig) => void;
  onApplyBoardAllPages?: (cfg: PageBoardConfig) => void;
  onScaleGeometry?: (factor: number) => void;
  onChangeLabelScale?: (nextScale: number) => void;
  onChangeDotScale?: (nextScale: number) => void;
  onOpenExam?: () => void;
  onOpenCalculator?: () => void;
  isCalculatorOpen?: boolean;
  onOpenCommandPalette?: () => void;
  isA4Format?: boolean;
  isFitLocked?: boolean;
  onToggleFitLock?: () => void;
  onExportPdf?: () => void;
  onExportTikz?: () => void;
  onOpenJsonModal?: () => void;
  shortcutMap?: ShortcutMap;
  embedded?: boolean;
  penOnlyMode?: boolean;
  onTogglePenOnly?: (enabled: boolean) => void;
  inkToShape?: boolean;
  onToggleInkToShape?: (enabled: boolean) => void;
  autoSwitchTarget?: "select" | "ink" | "off";
  onToggleAutoSwitchTarget?: () => void;
  laserConfig?: LaserConfig;
  onOpenLaserSettings?: () => void;
  toolbarVisibility?: ToolbarVisibilityConfig;
  modularConfig?: ModularLayoutConfig;
  onChangeModularConfig?: (cfg: ModularLayoutConfig) => void;
  onOpenSettings?: () => void;
  isSidebarOpen?: boolean;
  isGuideEnabled?: boolean;
  onToggleGuide?: () => void;
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
  doc,
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
  selectedCount,
  onDeleteSelected,
  isFullscreen,
  onToggleFullscreen,
  page = { current: 1, count: 1 },
  onPrevPage,
  onNextPage,
  onAddPage,
  onInsertTable,
  onInsertImage,
  onInsertPdfPages,
  onM3Action,
  onSelectQuickRealWorld,
  onOpenRealWorldDrawer,
  onOpenDecorHelp,
  onOpenPhysicsDrawer,
  onOpenHtmlSimModal,
  onGoHome,
  onSaveFile,
  onOpenFile,
  onShare,
  getBoardElement,
  hasPaper = false,
  labelScale = 1,
  dotScale = 1.5,
  boardConfig,
  onChangeBoardConfig,
  onApplyBoardAllPages,
  onScaleGeometry,
  onChangeLabelScale,
  onChangeDotScale,
  onOpenExam,
  onOpenCalculator,
  isCalculatorOpen,
  onOpenCommandPalette,
  isA4Format = false,
  isFitLocked = false,
  onToggleFitLock,
  onExportPdf,
  onExportTikz,
  onOpenJsonModal,
  shortcutMap,
  embedded = false,
  penOnlyMode = false,
  onTogglePenOnly,
  inkToShape = true,
  onToggleInkToShape,
  autoSwitchTarget = "select",
  onToggleAutoSwitchTarget,
  laserConfig,
  onOpenLaserSettings,
  toolbarVisibility,
  modularConfig = DEFAULT_MODULAR_LAYOUT,
  onChangeModularConfig,
  onOpenSettings,
  isSidebarOpen = false,
  isGuideEnabled = true,
  onToggleGuide,
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
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
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
          pos?: { x: number; y: number } | null;
          scale?: number;
        };
        if (
          parsed.pos &&
          typeof parsed.pos.x === "number" &&
          typeof parsed.pos.y === "number"
        ) {
          setToolbarPos(parsed.pos);
        }
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

  const persistToolbarLayout = (
    pos: { x: number; y: number } | null,
    scale: number
  ) => {
    if (embedded || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        TOOLBAR_LAYOUT_KEY,
        JSON.stringify({ pos, scale })
      );
    } catch {
      // Ignore storage quota errors
    }
  };

  const resetToolbarLayout = () => {
    setToolbarPos(null);
    setToolbarScale(1);
    setIsCollapsed(false);
    try {
      window.localStorage.removeItem(TOOLBAR_LAYOUT_KEY);
      window.localStorage.removeItem("physboard_toolbar_collapsed");
    } catch {
      // ignore
    }
  };

  const handleStartToolbarDrag = (e: React.PointerEvent) => {
    if (embedded) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = headerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const initLeft = rect.left;
    const initTop = rect.top;
    let latestPos: { x: number; y: number } | null = toolbarPos;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const effectiveW = rect.width;
      const maxX = Math.max(4, window.innerWidth - effectiveW - 8);
      const maxY = Math.max(4, window.innerHeight - 52);
      const next = {
        x: Math.round(Math.max(4, Math.min(maxX, initLeft + dx))),
        y: Math.round(Math.max(4, Math.min(maxY, initTop + dy))),
      };
      latestPos = next;
      setToolbarPos(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      persistToolbarLayout(latestPos, toolbarScale);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const updateToolbarScale = (nextScale: number) => {
    const clamped = Math.max(0.75, Math.min(1.3, Number(nextScale.toFixed(2))));
    setToolbarScale(clamped);
    persistToolbarLayout(toolbarPos, clamped);
  };

  const handleDockBlock = (blockId: ModularBlockId) => {
    if (!onChangeModularConfig) return;
    const next: ModularLayoutConfig = {
      ...modularConfig,
      blocks: {
        ...modularConfig.blocks,
        [blockId]: {
          ...modularConfig.blocks[blockId],
          isFloating: false,
        },
      },
    };
    onChangeModularConfig(next);
  };

  const handleFloatBlock = (blockId: ModularBlockId, initialPos?: { x: number; y: number }) => {
    if (!onChangeModularConfig) return;
    const pos = initialPos || modularConfig.blocks[blockId]?.position || { x: 100, y: 100 };
    const next: ModularLayoutConfig = {
      ...modularConfig,
      blocks: {
        ...modularConfig.blocks,
        [blockId]: {
          ...modularConfig.blocks[blockId],
          isFloating: true,
          position: pos,
        },
      },
    };
    onChangeModularConfig(next);
  };

  const handleMoveFloatingBlock = (blockId: ModularBlockId, pos: { x: number; y: number }) => {
    if (!onChangeModularConfig) return;
    const next: ModularLayoutConfig = {
      ...modularConfig,
      blocks: {
        ...modularConfig.blocks,
        [blockId]: {
          ...modularConfig.blocks[blockId],
          position: pos,
        },
      },
    };
    onChangeModularConfig(next);
  };

  const renderModuleGrip = (blockId: ModularBlockId, title: string) => {
    if (embedded) return null;
    return (
      <div
        data-wb-module-drag={blockId}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startY = e.clientY;
          let movedFar = false;

          const onMove = (ev: PointerEvent) => {
            const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
            if (dist > 15 && !movedFar) {
              movedFar = true;
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
              handleFloatBlock(blockId, { x: Math.max(10, ev.clientX - 60), y: Math.max(10, ev.clientY - 20) });
            }
          };

          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            if (!movedFar) {
              handleFloatBlock(blockId, { x: Math.max(10, startX - 40), y: Math.max(10, startY + 25) });
            }
          };

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
        title={`Kéo để tách "${title}" thành bảng nổi riêng (Floating Dock)`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 9,
          height: 22,
          cursor: "grab",
          color: "#94a3b8",
          fontSize: 10,
          userSelect: "none",
          padding: "0 1px",
          borderRadius: 3,
          marginRight: 1,
        }}
      >
        ⋮
      </div>
    );
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
      const target = e.target as Node;
      if (portalMenuRef.current?.contains(target)) return;
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
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

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
    toolRealWorld: true,
    toolCalculator: true,
  };

  const TOOLBAR_FONT =
    'var(--font-anime, "Comfortaa", "Nunito", "Quicksand", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)';

  const btnBaseStyle: React.CSSProperties = {
    height: 26,
    padding: "0 3.5px",
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    borderRadius: 7,
    border: "none",
    background: "transparent",
    color: "#334155",
    fontSize: 11,
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
    background: "#eef2ff",
    color: "#4338ca",
    fontWeight: 700,
    boxShadow: "0 0 0 1.5px rgba(99, 102, 241, 0.5)",
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
    backdropFilter: "blur(12px)",
    border: "1px solid #e0e7ff",
    borderRadius: 14,
    boxShadow:
      "0 12px 36px rgba(99, 102, 241, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 2,
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

  const sidebarOffset = !embedded && isSidebarOpen ? 148 : 28;

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
          top: toolbarPos ? toolbarPos.y : 10,
          left: toolbarPos
            ? `max(${sidebarOffset}px, ${toolbarPos.x}px)`
            : isSidebarOpen
            ? `calc(50% + 70px)`
            : "50%",
          transform: toolbarPos ? undefined : "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(203, 213, 225, 0.9)",
          borderRadius: 20,
          boxShadow:
            "0 10px 30px rgba(99, 102, 241, 0.16), 0 2px 10px rgba(15, 23, 42, 0.08)",
          fontFamily: TOOLBAR_FONT,
          userSelect: "none",
        }}
      >
      {/* Drag handle */}
      <div
        data-wb-toolbar-drag="true"
        onPointerDown={handleStartToolbarDrag}
        onDoubleClick={resetToolbarLayout}
        title="Kéo di chuyển · Nhấp đúp để đặt lại vị trí giữa"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 26,
          cursor: "grab",
          borderRadius: 6,
          background: "#f1f5f9",
          border: "1px solid #e2e8f0",
          color: "#64748b",
          marginRight: 2,
          flexShrink: 0,
        }}
      >
        <IconGrip size={14} color="#64748b" />
      </div>

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
          onClick={() => onSelectTool("erase")}
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
              padding: "0 4px",
              border: "1px solid #e2e8f0",
              borderRadius: 5,
            }}
          />
        </div>

        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Hoàn tác (Ctrl+Z)"
          style={{ ...btnBaseStyle, padding: "0 4px", color: canUndo ? "#334155" : "#cbd5e1" }}
        >
          <IconUndo size={14} />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Làm lại (Ctrl+Y)"
          style={{ ...btnBaseStyle, padding: "0 4px", color: canRedo ? "#334155" : "#cbd5e1" }}
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
        top: embedded ? undefined : toolbarPos ? toolbarPos.y : 8,
        left: embedded
          ? undefined
          : toolbarPos
          ? `max(${sidebarOffset}px, ${toolbarPos.x}px)`
          : isSidebarOpen
          ? `calc(50% + 70px)`
          : "50%",
        transform: embedded ? undefined : toolbarPos ? undefined : "translateX(-50%)",
        width: "max-content",
        maxWidth: embedded
          ? undefined
          : `calc(100vw - ${sidebarOffset + 16}px)`,
        zoom: embedded ? undefined : toolbarScale,
        transition: "left 0.22s ease, max-width 0.22s ease",
        minHeight: 36,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        gap: 4,
        padding: "4px 8px",
        background: "rgba(255, 255, 255, 0.97)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(203, 213, 225, 0.85)",
        borderRadius: embedded ? 12 : 18,
        boxShadow:
          "0 10px 32px rgba(99, 102, 241, 0.14), 0 2px 10px rgba(15, 23, 42, 0.08)",
        fontFamily: TOOLBAR_FONT,
        overflow: "visible",
      }}
    >
      {/* Pinned Toolbar Drag Handle (Always at the very left of the toolbar) */}
      {!embedded && (
        <div
          data-wb-toolbar-drag="true"
          onPointerDown={handleStartToolbarDrag}
          onDoubleClick={resetToolbarLayout}
          title="Kéo để di chuyển thanh công cụ · Nhấp đúp để đặt lại vị trí ban đầu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 26,
            cursor: "grab",
            borderRadius: 6,
            background: "#f1f5f9",
            color: "#64748b",
            flexShrink: 0,
            border: "1px solid #e2e8f0",
            marginRight: 2,
            userSelect: "none",
          }}
        >
          <IconGrip size={14} color="#64748b" />
        </div>
      )}

      {/* Left + Center Tool Groups */}
      <div
        className="wb-scroll"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: 2,
          minWidth: 0,
          flex: "1 1 auto",
          overflowX: "auto",
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
        {!modularConfig.blocks.ink.isFloating && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {renderModuleGrip("ink", "Thao tác & Viết vẽ")}
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
            data-active={activeTool === "ink:laser" ? "true" : undefined}
            aria-pressed={activeTool === "ink:laser"}
            onClick={() => onSelectTool("ink:laser")}
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
                ? `Bút chỉ Laser (Dấu chấm ${laserConfig.dotSize}px)`
                : "Bút chỉ Laser (Vệt sáng tan biến sau 1.5s)"
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
                  boxShadow: `0 0 4px ${laserConfig?.color || "#ef4444"}`,
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
          onClick={() => onSelectTool("erase")}
          style={isEraserActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Tẩy nét vẽ", "tool:erase")}
        >
          <IconEraser size={14} />
          <span>Tẩy</span>
        </button>
        )}

        {/* StylePicker (Color & Width) */}
        <StylePicker
          current={styleState.current}
          selection={styleState.selection}
          onPick={onPickStyle}
          iconOnly={true}
          buttonStyle={{
            height: 24,
            padding: "0 4px",
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
          onClick={() => onSelectTool("formula")}
          style={isFormulaActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Công thức", "tool:formula")}
        >
          <IconFormula size={14} />
          <span>Công thức</span>
        </button>
        )}

        {dividerV}
        </div>
        )}

        {/* --- GROUP 2: Hình học phẳng & Tô màu --- */}
        {!modularConfig.blocks.geometry2d.isFloating && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {renderModuleGrip("geometry2d", "Hình học phẳng")}
        {/* Point */}
        <button
          type="button"
          data-tool="point"
          data-active={isPointActive ? "true" : undefined}
          aria-pressed={isPointActive}
          onClick={() => onSelectTool("point")}
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
          onClick={() => onSelectTool("circle")}
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
          onClick={() => onSelectTool("polygon")}
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
        )}

        {/* --- GROUP 3: Không gian, Giải tích & Thí nghiệm --- */}
        {!modularConfig.blocks.space3d.isFloating && vis.groupSpaceGeometry && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {renderModuleGrip("space3d", "Không gian & Hàm số")}
        <>
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
        </>
        </div>
        )}

        {/* --- GROUP 4: Vật lý & Dụng cụ --- */}
        {!modularConfig.blocks.physics.isFloating && vis.groupPhysics && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {renderModuleGrip("physics", "Vật lý & Dụng cụ")}
        <>
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

        {/* Physics Drawer Button (Mở thư viện Thí nghiệm Vật lý) */}
        {vis.toolPhysics && onOpenPhysicsDrawer && (
          <button
            type="button"
            data-tool="physics"
            data-action="open-physics-drawer"
            onClick={onOpenPhysicsDrawer}
            style={btnBaseStyle}
            title="Thư viện thí nghiệm Vật lý 10–11–12, Công thức & Mô phỏng"
          >
            <IconPhysics size={14} color="#7c3aed" />
            <span>Vật lý</span>
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
        </>
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
            style={{ ...btnBaseStyle, padding: "0 5px" }}
          >
            <span aria-hidden="true">🔗</span>
            <span className="sr-only">Chia sẻ</span>
          </button>
        )}

        {/* A4 Fit Screen & Lock Zoom Toggle */}
        {isA4Format && onToggleFitLock && (
          <button
            type="button"
            data-tool="a4-fit-lock"
            onClick={onToggleFitLock}
            title={
              isFitLocked
                ? "Đang khóa vừa màn hình (Bấm để mở khóa thu phóng)"
                : "Tự động phóng to vừa màn hình & Khóa thu phóng"
            }
            aria-label={isFitLocked ? "Mở khóa thu phóng" : "Khóa vừa màn hình"}
            aria-pressed={isFitLocked}
            style={{
              ...btnBaseStyle,
              width: 26,
              height: 26,
              padding: 0,
              justifyContent: "center",
              background: isFitLocked ? "#dbeafe" : "#f1f5f9",
              color: isFitLocked ? "#1d4ed8" : "#64748b",
              border: `1px solid ${isFitLocked ? "#93c5fd" : "#cbd5e1"}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <span aria-hidden="true">{isFitLocked ? "🔒" : "🔓"}</span>
          </button>
        )}

        {/* Toggle Instruction Guide */}
        {onToggleGuide && (
          <button
            type="button"
            data-tool="instruction-guide"
            onClick={onToggleGuide}
            title={
              isGuideEnabled
                ? "Đang bật dòng chỉ dẫn cách sử dụng chức năng (Bấm để tắt)"
                : "Bật dòng chỉ dẫn cách sử dụng chức năng (Từng bước khi chọn công cụ)"
            }
            aria-label={isGuideEnabled ? "Tắt chỉ dẫn" : "Bật chỉ dẫn"}
            aria-pressed={isGuideEnabled}
            style={{
              ...btnBaseStyle,
              width: 26,
              height: 26,
              padding: 0,
              justifyContent: "center",
              background: isGuideEnabled ? "#fef3c7" : "#f1f5f9",
              color: isGuideEnabled ? "#b45309" : "#94a3b8",
              border: `1px solid ${isGuideEnabled ? "#fcd34d" : "#cbd5e1"}`,
              borderRadius: 6,
              fontSize: 12,
              opacity: isGuideEnabled ? 1 : 0.65,
            }}
          >
            <span aria-hidden="true">💡</span>
          </button>
        )}

        {/* Fullscreen */}
        <button
          type="button"
          data-tool="fullscreen"
          onClick={onToggleFullscreen}
          title={
            isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"
          }
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          style={{ ...btnBaseStyle, padding: "0 5px" }}
        >
          <IconFullscreen exit={isFullscreen} size={14} />
        </button>

        {/* Toolbar Zoom / Size Pill */}
        {!embedded && (
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
              padding: "0 6px",
              background: "#f1f5f9",
              color: "#475569",
              borderRadius: 6,
              fontWeight: 600,
              gap: 3,
              fontSize: 11,
              marginLeft: 2,
            }}
          >
            <span>▲</span>
            <span>Thu gọn</span>
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

      {/* Floating Docks for unpinned blocks */}
      {modularConfig.blocks.ink.isFloating && (
        <FloatingDock
          id="ink"
          title="Thao tác & Viết vẽ"
          position={modularConfig.blocks.ink.position}
          onMove={(pos) => handleMoveFloatingBlock("ink", pos)}
          onDock={() => handleDockBlock("ink")}
        >
          {vis.groupSelection && vis.toolSelect && (
            <div style={{ display: "inline-flex", alignItems: "center", borderRadius: 6, background: isSelectActive ? "#e8f0fe" : "transparent" }}>
              <button
                type="button"
                onClick={() => onSelectTool("select")}
                style={isSelectActive ? { ...activeStyle, background: "transparent" } : btnBaseStyle}
                title="Chọn"
              >
                <IconCursor size={14} /> <span>Chọn</span>
              </button>
            </div>
          )}

          {vis.groupDrawing && vis.toolPen && (
            <button
              type="button"
              onClick={() => onSelectTool(lastPenTool)}
              style={isPenActive && activeTool !== "ink:fountain" ? activeStyle : btnBaseStyle}
              title="Bút vẽ"
            >
              {renderPenIcon(activePenVariant.tool, 14)} <span>{activePenVariant.short}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectTool("ink:laser")}
            style={activeTool === "ink:laser" ? { ...activeStyle, background: "#fee2e2", color: "#b91c1c" } : btnBaseStyle}
            title="Laser"
          >
            <IconLaser size={14} color="#ef4444" /> <span>Laser</span>
          </button>

          {vis.groupSelection && vis.toolEraser && (
            <button
              type="button"
              onClick={() => onSelectTool("erase")}
              style={activeTool === "erase" ? activeStyle : btnBaseStyle}
              title="Tẩy"
            >
              <IconEraser size={14} /> <span>Tẩy</span>
            </button>
          )}

          <StylePicker
            current={styleState.current}
            selection={styleState.selection}
            onPick={onPickStyle}
            buttonStyle={btnBaseStyle}
          />
        </FloatingDock>
      )}

      {modularConfig.blocks.geometry2d.isFloating && (
        <FloatingDock
          id="geometry2d"
          title="Hình học phẳng"
          position={modularConfig.blocks.geometry2d.position}
          onMove={(pos) => handleMoveFloatingBlock("geometry2d", pos)}
          onDock={() => handleDockBlock("geometry2d")}
        >
          <button
            type="button"
            onClick={() => onSelectTool("point")}
            style={isPointActive ? activeStyle : btnBaseStyle}
            title="Điểm"
          >
            <IconPoint size={13} /> <span>Điểm</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("c:segment")}
            style={isSegmentActive ? activeStyle : btnBaseStyle}
            title="Đoạn thẳng"
          >
            <IconSegment size={14} /> <span>Đoạn</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("circle")}
            style={activeTool === "circle" ? activeStyle : btnBaseStyle}
            title="Đường tròn"
          >
            <IconCircle size={14} /> <span>Tròn</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("polygon")}
            style={activeTool === "polygon" ? activeStyle : btnBaseStyle}
            title="Đa giác"
          >
            <IconPolygon size={14} /> <span>Đa giác</span>
          </button>

          <PlaneGeometryMenu
            activeTool={typeof activeTool === "string" ? activeTool : null}
            onSelectTool={(t) => onSelectTool(t)}
            triggerStyle={btnBaseStyle}
            activeTriggerStyle={activeStyle}
          />
        </FloatingDock>
      )}

      {modularConfig.blocks.space3d.isFloating && (
        <FloatingDock
          id="space3d"
          title="Không gian & Hàm số"
          position={modularConfig.blocks.space3d.position}
          onMove={(pos) => handleMoveFloatingBlock("space3d", pos)}
          onDock={() => handleDockBlock("space3d")}
        >
          <SpaceGeometryMenu
            activeTool={typeof activeTool === "string" ? activeTool : null}
            onSelectTool={(t) => onSelectTool(t)}
            triggerStyle={btnBaseStyle}
            activeTriggerStyle={activeStyle}
          />

          <div ref={functionsWrapRef} style={{ position: "relative", display: "inline-flex" }}>
            <button
              type="button"
              onClick={() => setOpenMenu((p) => (p === "functions" ? null : "functions"))}
              style={openMenu === "functions" ? activeStyle : btnBaseStyle}
              title="Hàm số"
            >
              <IconFunction size={14} /> <span>Hàm số ▾</span>
            </button>
            <FunctionsMenu
              open={openMenu === "functions"}
              onClose={() => setOpenMenu(null)}
              onAction={(act) => onM3Action?.(act)}
              anchorRef={functionsWrapRef}
            />
          </div>

          <div ref={statsWrapRef} style={{ position: "relative", display: "inline-flex" }}>
            <button
              type="button"
              onClick={() => setOpenMenu((p) => (p === "statistics" ? null : "statistics"))}
              style={openMenu === "statistics" ? activeStyle : btnBaseStyle}
              title="Thống kê"
            >
              <IconChart size={14} /> <span>Thống kê ▾</span>
            </button>
            <StatsMenu
              open={openMenu === "statistics"}
              onClose={() => setOpenMenu(null)}
              onAction={(act) => onM3Action?.(act)}
              anchorRef={statsWrapRef}
            />
          </div>
        </FloatingDock>
      )}

      {modularConfig.blocks.physics.isFloating && (
        <FloatingDock
          id="physics"
          title="Vật lý & Dụng cụ"
          position={modularConfig.blocks.physics.position}
          onMove={(pos) => handleMoveFloatingBlock("physics", pos)}
          onDock={() => handleDockBlock("physics")}
        >
          <div ref={realworldWrapRef} style={{ position: "relative", display: "inline-flex" }}>
            <button
              type="button"
              onClick={() => setOpenMenu((p) => (p === "realworld" ? null : "realworld"))}
              style={openMenu === "realworld" ? activeStyle : btnBaseStyle}
              title="Thực tế"
            >
              <IconRealWorld size={14} /> <span>Thực tế ▾</span>
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

          {onOpenPhysicsDrawer && (
            <button
              type="button"
              onClick={onOpenPhysicsDrawer}
              style={btnBaseStyle}
              title="Vật lý"
            >
              <IconPhysics size={14} color="#7c3aed" /> <span>Vật lý</span>
            </button>
          )}

          {onOpenCalculator && (
            <button
              type="button"
              onClick={onOpenCalculator}
              style={isCalculatorOpen ? activeStyle : btnBaseStyle}
              title="Máy tính"
            >
              <IconCalculator size={14} /> <span>Máy tính</span>
            </button>
          )}
        </FloatingDock>
      )}
    </header>
  );
};
