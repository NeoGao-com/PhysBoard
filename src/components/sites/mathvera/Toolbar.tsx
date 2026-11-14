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
import { PhysicsMenu } from "./PhysicsMenu";
import { FILL_PALETTE } from "@/lib/geometry";
import type { ShortcutMap } from "@/lib/commands";
import type { ImportedImageResult, ImportedPdfPage } from "@/lib/pdf-import";
import { RealWorldArtItem } from "@/lib/realworld-art";
import type { PageBoardConfig } from "@/lib/board-themes";
import { WhiteboardTool, SelectionStyleState } from "@/types/whiteboard";
import { LaserConfig } from "@/lib/laser-config";
import { ToolbarVisibilityConfig } from "@/lib/toolbar-config";
import { importPdfPages } from "@/lib/pdf-import";
import {
  IconBrush,
  IconBucket,
  IconCalculator,
  IconChart,
  IconCircle,
  IconCommand,
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
  IconOpenFile,
  IconPen,
  IconPencil,
  IconPhysics,
  IconPdf,
  IconHtmlSim,
  IconPoint,
  IconPolygon,
  IconRealWorld,
  IconRedo,
  IconSave,
  IconSegment,
  IconSetSquare,
  IconSettings,
  IconProtractor,
  IconCompassTool,
  IconShapeSnap,
  IconStylusOnly,
  IconTrash,
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
  onPhysicsAction?: (action: string) => void;
  onOpenPhysicsDrawer?: () => void;
  onOpenHtmlSimModal?: () => void;
  onSelectInstrument?: (kind: "ruler" | "setsquare" | "setsquare-45" | "protractor" | "protractor-360" | "compass") => void;
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
  onOpenSettings?: () => void;
}

type OpenDropdown =
  | "select"
  | "pen"
  | "segment"
  | "fill"
  | "functions"
  | "statistics"
  | "realworld"
  | "physics"
  | "instruments"
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
  onPhysicsAction,
  onOpenPhysicsDrawer,
  onOpenHtmlSimModal,
  onSelectInstrument,
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
  onOpenSettings,
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

  const selectBtnRef = useRef<HTMLDivElement>(null);
  const penBtnRef = useRef<HTMLDivElement>(null);
  const segmentBtnRef = useRef<HTMLDivElement>(null);
  const fillBtnRef = useRef<HTMLDivElement>(null);
  const functionsWrapRef = useRef<HTMLDivElement>(null);
  const statsWrapRef = useRef<HTMLDivElement>(null);
  const realworldWrapRef = useRef<HTMLDivElement>(null);
  const physicsWrapRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfImporting, setPdfImporting] = useState(false);

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
        realworldWrapRef.current?.contains(target) ||
        physicsWrapRef.current?.contains(target)
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

  const btnBaseStyle: React.CSSProperties = {
    height: 25,
    padding: "0 2.5px",
    display: "inline-flex",
    alignItems: "center",
    gap: 1.5,
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#334155",
    fontSize: 10.5,
    fontWeight: 500,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "background-color 0.1s ease",
  };

  const activeStyle: React.CSSProperties = {
    ...btnBaseStyle,
    background: "#e8f0fe",
    color: "#1a73e8",
    fontWeight: 600,
  };

  const caretStyle: React.CSSProperties = {
    height: 25,
    width: 15,
    padding: "0 2px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: 9.5,
    cursor: "pointer",
    userSelect: "none",
    flexShrink: 0,
    transition: "background-color 0.15s ease",
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
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  };

  const portalItemStyle: React.CSSProperties = {
    ...btnBaseStyle,
    width: "100%",
    justifyContent: "flex-start",
    padding: "6px 10px",
    height: "auto",
    fontSize: 13,
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
          top: toolbarPos ? toolbarPos.y : 10,
          left: toolbarPos ? toolbarPos.x : "50%",
          transform: toolbarPos ? undefined : "translateX(-50%)",
          zIndex: 65,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid #cbd5e1",
          borderRadius: 20,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
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
            width: 14,
            height: 24,
            cursor: "grab",
            borderRadius: 4,
            color: "#94a3b8",
            marginRight: 2,
          }}
        >
          <IconGrip size={13} />
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
        left: embedded ? undefined : toolbarPos ? toolbarPos.x : "50%",
        transform: embedded ? undefined : toolbarPos ? undefined : "translateX(-50%)",
        width: "max-content",
        maxWidth: embedded
          ? undefined
          : `calc((100vw - 16px) / ${toolbarScale || 1})`,
        zoom: embedded ? undefined : toolbarScale,
        minHeight: 36,
        zIndex: 65,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        gap: 4,
        padding: "4px 8px",
        background: "rgba(255, 255, 255, 0.97)",
        backdropFilter: "blur(10px)",
        border: "1px solid #cbd5e1",
        borderRadius: embedded ? 10 : 16,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
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
          gap: 2,
          minWidth: 0,
          flex: "1 1 auto",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {!embedded && (
          <div
            data-wb-toolbar-drag="true"
            onPointerDown={handleStartToolbarDrag}
            onDoubleClick={resetToolbarLayout}
            title="Kéo để di chuyển thanh công cụ · Nhấp đúp để đặt lại vị trí & kích thước"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 14,
              height: 24,
              cursor: "grab",
              borderRadius: 5,
              flexShrink: 0,
            }}
          >
            <IconGrip size={13} color="#94a3b8" />
          </div>
        )}

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

        {/* --- GROUP 1: Chọn, Bút, Tẩy | Màu & Nét | Công thức & Chèn --- */}
        {/* Select Split */}
        {vis.groupSelection && vis.toolSelect && (
        <div
          ref={selectBtnRef}
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isSelectActive ? "#e8f0fe" : "transparent",
            borderRadius: 6,
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isPenActive ? "#e8f0fe" : "transparent",
            borderRadius: 6,
          }}
        >
          <button
            type="button"
            data-tool="ink"
            data-active={
              isPenActive && activeTool !== "ink:fountain" ? "true" : undefined
            }
            aria-pressed={isPenActive && activeTool !== "ink:fountain"}
            onClick={() => {
              onSelectTool(lastPenTool);
            }}
            style={
              isPenActive && activeTool !== "ink:fountain"
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
            data-tool="ink:fountain"
            data-active={activeTool === "ink:fountain" ? "true" : undefined}
            aria-pressed={activeTool === "ink:fountain"}
            onClick={() => onSelectTool("ink:fountain")}
            style={
              activeTool === "ink:fountain"
                ? { ...activeStyle, padding: "0 4px" }
                : { ...btnBaseStyle, padding: "0 4px" }
            }
            title={withShortcut("Bút máy", "tool:ink:fountain")}
          >
            <IconFountain size={14} />
            <span className="sr-only">Bút máy</span>
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
        <div style={{ display: "inline-flex", alignItems: "center" }}>
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

        {/* Chèn file PDF trực tiếp (thay thế menu chèn cũ) */}
        {vis.groupDrawing && vis.toolInsertPdf && (
        <>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setPdfImporting(true);
            try {
              const result = await importPdfPages(file);
              onInsertPdfPages?.(result.pages);
            } catch (err) {
              console.error("Lỗi chèn file PDF:", err);
            } finally {
              setPdfImporting(false);
            }
          }}
        />
        <button
          type="button"
          data-tool="insert-pdf"
          disabled={pdfImporting}
          onClick={() => pdfInputRef.current?.click()}
          style={{
            ...btnBaseStyle,
            opacity: pdfImporting ? 0.6 : 1,
            cursor: pdfImporting ? "wait" : "pointer",
          }}
          title="Chèn file PDF vào bảng"
        >
          <IconPdf size={14} color="#ef4444" />
          <span>{pdfImporting ? "Đang nạp..." : "Chèn PDF"}</span>
        </button>
        </>
        )}

        {/* Nút nạp mô phỏng HTML (.html, .htm) trực tiếp */}
        {onOpenHtmlSimModal && (
          <button
            type="button"
            data-tool="insert-html-sim"
            onClick={onOpenHtmlSimModal}
            style={{
              ...btnBaseStyle,
              color: "#15803d",
              fontWeight: 600,
            }}
            title="Nạp & nhúng file mô phỏng HTML thí nghiệm trực tiếp vào bảng"
          >
            <IconHtmlSim size={14} color="#16a34a" />
            <span>Nạp HTML</span>
          </button>
        )}

        {dividerV}

        {/* --- GROUP 2: Hình học phẳng & Tô màu --- */}
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isSegmentActive ? "#e8f0fe" : "transparent",
            borderRadius: 6,
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isFloodFillActive ? "#e8f0fe" : "transparent",
            borderRadius: 6,
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

        {/* --- GROUP 3: Không gian, Giải tích & Thí nghiệm --- */}
        {vis.groupSpaceGeometry && (
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
        )}

        {/* --- GROUP 4: Vật lý & Dụng cụ --- */}
        {vis.groupPhysics && (
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

        {/* Physics Menu */}
        {vis.toolPhysics && (
        <div
          ref={physicsWrapRef}
          style={{ position: "relative", display: "inline-flex" }}
        >
          <button
            type="button"
            data-dropdown="physics"
            data-tool="physics"
            aria-haspopup="menu"
            aria-expanded={openMenu === "physics"}
            onClick={() =>
              setOpenMenu((prev) =>
                prev === "physics" ? null : "physics"
              )
            }
            style={openMenu === "physics" ? activeStyle : btnBaseStyle}
            title="Mô phỏng thí nghiệm Vật lý 10–11–12, Mạch điện, Lực, Quang hình, Đo đạc & Công thức"
          >
            <IconPhysics size={14} />
            <span>Vật lý ▾</span>
          </button>
          <PhysicsMenu
            open={openMenu === "physics"}
            onClose={() => setOpenMenu(null)}
            onAction={(act) => onPhysicsAction?.(act)}
            onOpenDrawer={() => onOpenPhysicsDrawer?.()}
            onOpenHtmlSimModal={() => onOpenHtmlSimModal?.()}
            anchorRef={physicsWrapRef}
          />
        </div>
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
        <PageBar
          doc={doc}
          current={page.current}
          count={page.count}
          onPrevPage={onPrevPage}
          onNextPage={onNextPage}
          onAddPage={onAddPage}
          compact={embedded}
        />

        {dividerV}

        {/* Delete */}
        {vis.groupSelection && vis.toolTrash && (
        <button
          type="button"
          data-tool="delete"
          data-action="delete"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
          title="Xoá (Delete)"
          aria-label="Xoá phần tử đang chọn"
          style={{
            ...btnBaseStyle,
            padding: "0 5px",
            color: selectedCount > 0 ? "#dc2626" : "#cbd5e1",
            cursor: selectedCount > 0 ? "pointer" : "default",
          }}
        >
          <IconTrash size={14} />
        </button>
        )}

        {/* Undo & Redo */}
        {vis.groupSelection && vis.toolUndoRedo && (
        <>
        <button
          type="button"
          data-tool="undo"
          data-action="undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Hoàn tác (Ctrl+Z)"
          aria-label="Hoàn tác"
          style={{
            ...btnBaseStyle,
            padding: "0 5px",
            color: canUndo ? "#334155" : "#cbd5e1",
            cursor: canUndo ? "pointer" : "default",
          }}
        >
          <IconUndo size={14} />
        </button>

        <button
          type="button"
          data-tool="redo"
          data-action="redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="Làm lại (Ctrl+Shift+Z)"
          aria-label="Làm lại"
          style={{
            ...btnBaseStyle,
            padding: "0 5px",
            color: canRedo ? "#334155" : "#cbd5e1",
            cursor: canRedo ? "pointer" : "default",
          }}
        >
          <IconRedo size={14} />
        </button>
        </>
        )}

        {/* Local Offline Save & Open File */}
        {onSaveFile && (
          <button
            type="button"
            data-action="save-file"
            onClick={onSaveFile}
            title="Lưu bài vẽ ra file (.phys.json)"
            style={{ ...btnBaseStyle, padding: "0 5px" }}
          >
            <IconSave size={14} />
            <span className="sr-only">Lưu file</span>
          </button>
        )}
        {onOpenFile && (
          <button
            type="button"
            data-action="open-file"
            onClick={onOpenFile}
            title="Mở file bài vẽ (.json)"
            style={{ ...btnBaseStyle, padding: "0 5px" }}
          >
            <IconOpenFile size={14} />
            <span className="sr-only">Mở file</span>
          </button>
        )}

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

        {/* Command Palette / Shortcuts */}
        {onOpenCommandPalette && (
          <button
            type="button"
            data-action="command-palette"
            onClick={onOpenCommandPalette}
            title={withShortcut("Cửa sổ lệnh & Phím tắt", "action:openCommands")}
            aria-label="Cửa sổ lệnh & Phím tắt"
            style={{ ...btnBaseStyle, padding: "0 5px" }}
          >
            <IconCommand size={14} />
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

        {/* Stylus-only vs Hand-drawing quick toggle (also configurable in Settings) */}
        {/* Ink-to-Shape quick toggle (also configurable in Settings) */}

        {/* Toolbar Zoom / Size Pill + Right-edge Resize Handle */}
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

        {/* Nút Cài đặt Hệ thống & Thanh công cụ (đã gộp toàn bộ tính năng menu ⋯) */}
        <button
          type="button"
          data-action="more"
          onClick={onOpenSettings}
          title="Cài đặt hệ thống, khổ bảng, tỉ lệ hình & ẩn/hiện thanh công cụ"
          aria-label="Cài đặt hệ thống & thanh công cụ"
          style={{
            ...btnBaseStyle,
            padding: "0 8px",
            color: "#1e293b",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            fontWeight: 600,
            gap: 5,
          }}
        >
          <IconSettings size={15} color="#2563eb" />
          <span>Cài đặt</span>
        </button>

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
