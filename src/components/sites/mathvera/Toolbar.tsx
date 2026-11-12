"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import * as Y from "yjs";
import { StylePicker, StylePatch } from "./StylePicker";
import { InsertMenu } from "./InsertMenu";
import { PlaneGeometryMenu } from "./PlaneGeometryMenu";
import { SpaceGeometryMenu } from "./SpaceGeometryMenu";
import {
  FunctionsMenu,
  StatsMenu,
  RealWorldMenu,
  M3MenuAction,
} from "./FunctionsAndStatsMenus";
import { PageBar } from "./PageBar";
import { MoreMenu } from "./MoreMenu";
import { PhysicsMenu } from "./PhysicsMenu";
import { FILL_PALETTE } from "@/lib/geometry";
import type { ShortcutMap } from "@/lib/commands";
import type { ImportedImageResult, ImportedPdfPage } from "@/lib/pdf-import";
import type { RealWorldArtItem } from "@/lib/realworld-art";
import { WhiteboardTool, SelectionStyleState } from "@/types/whiteboard";

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
  onGoHome?: () => void;
  onSaveFile?: () => void;
  onOpenFile?: () => void;
  onShare?: () => void;
  getBoardElement?: () => SVGSVGElement | HTMLElement | null;
  hasPaper?: boolean;
  labelScale?: number;
  dotScale?: number;
  onScaleGeometry?: (factor: number) => void;
  onChangeLabelScale?: (nextScale: number) => void;
  onChangeDotScale?: (nextScale: number) => void;
  onOpenExam?: () => void;
  onOpenCommandPalette?: () => void;
  onExportTikz?: () => void;
  onOpenJsonModal?: () => void;
  shortcutMap?: ShortcutMap;
  embedded?: boolean;
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
  onGoHome,
  onSaveFile,
  onOpenFile,
  onShare,
  getBoardElement,
  hasPaper = false,
  labelScale = 1,
  dotScale = 1.5,
  onScaleGeometry,
  onChangeLabelScale,
  onChangeDotScale,
  onOpenExam,
  onOpenCommandPalette,
  onExportTikz,
  onOpenJsonModal,
  shortcutMap,
  embedded = false,
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

  const selectBtnRef = useRef<HTMLDivElement>(null);
  const penBtnRef = useRef<HTMLDivElement>(null);
  const segmentBtnRef = useRef<HTMLDivElement>(null);
  const fillBtnRef = useRef<HTMLDivElement>(null);
  const functionsWrapRef = useRef<HTMLDivElement>(null);
  const statsWrapRef = useRef<HTMLDivElement>(null);
  const realworldWrapRef = useRef<HTMLDivElement>(null);
  const physicsWrapRef = useRef<HTMLDivElement>(null);
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
      setMenuPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 260)),
      });
    }
    setOpenMenu(id);
  };

  const isSelectActive =
    activeTool === "select" ||
    activeTool === "select:marquee" ||
    activeTool === null;
  const isPenActive = activeTool === "ink" || activeTool === "ink:fountain";
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

  const activeSegmentVariant =
    SEGMENT_VARIANTS.find(
      (v) => v.tool === (isSegmentActive ? activeTool : lastSegmentTool)
    ) ?? SEGMENT_VARIANTS[0];

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
    width: 10,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: 8.5,
    cursor: "pointer",
    userSelect: "none",
    flexShrink: 0,
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

  return (
    <header
      data-wb-toolbar="true"
      data-embedded={embedded ? "true" : undefined}
      data-export-skip="true"
      className="wb-toolbar"
      style={{
        position: embedded ? "relative" : "fixed",
        top: embedded ? undefined : 9,
        left: embedded ? undefined : 6,
        right: embedded ? undefined : 6,
        minHeight: 35,
        zIndex: 65,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: embedded ? "wrap" : undefined,
        gap: 2,
        padding: "3px 5px",
        background: "#ffffff",
        border: "1px solid #e8eaed",
        borderRadius: embedded ? 8 : 18,
        boxShadow: "0 4px 18px rgba(15, 23, 42, 0.08)",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        overflow: "visible",
      }}
    >
      {/* Left + Center Tool Groups */}
      <div className="wb-scroll">
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

        {/* --- GROUP 1: Core & Input --- */}
        {/* Select Split */}
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
            onClick={() => onSelectTool("select")}
            style={
              isSelectActive
                ? { ...activeStyle, background: "transparent" }
                : btnBaseStyle
            }
            title={withShortcut("Chọn", "tool:select")}
          >
            {activeTool === "select:marquee" ? "⬚ Chọn vùng" : "✋ Chọn"}
          </button>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === "select"}
            aria-label="Tuỳ chọn chọn"
            onClick={() => togglePortalMenu("select", selectBtnRef.current)}
            style={caretStyle}
          >
            ▾
          </button>
        </div>

        {/* Pen Split + Direct Fountain Button for TC-02-02 */}
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
            data-active={activeTool === "ink" ? "true" : undefined}
            aria-pressed={activeTool === "ink"}
            onClick={() => onSelectTool("ink")}
            style={
              activeTool === "ink"
                ? { ...activeStyle, background: "transparent" }
                : btnBaseStyle
            }
            title={withShortcut("Bút", "tool:ink")}
          >
            ✎ Bút
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
            ✒<span className="sr-only">Bút máy</span>
          </button>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === "pen"}
            aria-label="Tuỳ chọn bút"
            onClick={() => togglePortalMenu("pen", penBtnRef.current)}
            style={caretStyle}
          >
            ▾
          </button>
        </div>

        {/* Eraser */}
        <button
          type="button"
          data-tool="erase"
          data-active={isEraserActive ? "true" : undefined}
          aria-pressed={isEraserActive}
          onClick={() => onSelectTool("erase")}
          style={isEraserActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Tẩy nét vẽ", "tool:erase")}
        >
          🧽 Tẩy
        </button>

        {/* Formula */}
        <button
          type="button"
          data-tool="formula"
          data-active={isFormulaActive ? "true" : undefined}
          aria-pressed={isFormulaActive}
          onClick={() => onSelectTool("formula")}
          style={isFormulaActive ? activeStyle : btnBaseStyle}
          title={withShortcut("Công thức", "tool:formula")}
        >
          ƒ Công thức
        </button>

        {/* Insert Dropdown */}
        <InsertMenu
          activeTool={activeTool}
          onInsertTable={(r, c) => onInsertTable?.(r, c)}
          onInsertImage={(img) => onInsertImage?.(img)}
          onInsertPdfPages={(pages) => onInsertPdfPages?.(pages)}
          buttonStyle={btnBaseStyle}
          activeButtonStyle={activeStyle}
        />

        {/* StylePicker */}
        <StylePicker
          current={styleState.current}
          selection={styleState.selection}
          onPick={onPickStyle}
          iconOnly={true}
          buttonStyle={{
            height: 24,
            padding: "0 3px",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            gap: 2,
          }}
        />

        {dividerV}

        {/* --- GROUP 2: 2D Geometry & Fill --- */}
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
          • Điểm
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
            title={withShortcut("Đoạn", "tool:c:segment")}
            onClick={() => onSelectTool(lastSegmentTool)}
            style={{
              ...(isSegmentActive
                ? { ...activeStyle, background: "transparent" }
                : btnBaseStyle),
              order: 1,
            }}
          >
            {activeSegmentVariant.short}
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
          ◯ Tròn
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
          ⬟ Đa giác
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
            title="Tô màu"
            onClick={() => onSelectTool("floodFill")}
            style={{
              ...(isFloodFillActive
                ? { ...activeStyle, background: "transparent" }
                : btnBaseStyle),
              order: 1,
            }}
          >
            <span aria-hidden="true">🪣</span>
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

        {/* --- GROUP 3: Domain Math Modules --- */}
        <SpaceGeometryMenu
          activeTool={typeof activeTool === "string" ? activeTool : null}
          onSelectTool={(t) => onSelectTool(t)}
          triggerStyle={btnBaseStyle}
          activeTriggerStyle={activeStyle}
        />

        {/* Functions Menu */}
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
            ƒ Hàm số ▾
          </button>
          <FunctionsMenu
            open={openMenu === "functions"}
            onClose={() => setOpenMenu(null)}
            onAction={(act) => onM3Action?.(act)}
          />
        </div>

        {/* Statistics Menu */}
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
            📊 Thống kê ▾
          </button>
          <StatsMenu
            open={openMenu === "statistics"}
            onClose={() => setOpenMenu(null)}
            onAction={(act) => onM3Action?.(act)}
          />
        </div>

        {/* Real-World Menu */}
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
            🏞 Thực tế ▾
          </button>
          <RealWorldMenu
            open={openMenu === "realworld"}
            onClose={() => setOpenMenu(null)}
            onSelectQuickItem={(item) => onSelectQuickRealWorld?.(item)}
            onOpenDrawer={() => onOpenRealWorldDrawer?.()}
            onOpenDecorHelp={() => onOpenDecorHelp?.()}
          />
        </div>

        {/* Physics Menu */}
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
            ⚛ Vật lý ▾
          </button>
          <PhysicsMenu
            open={openMenu === "physics"}
            onClose={() => setOpenMenu(null)}
            onAction={(act) => onPhysicsAction?.(act)}
            onOpenDrawer={() => onOpenPhysicsDrawer?.()}
          />
        </div>
      </div>

      {/* --- Pinned Right Controls --- */}
      <div
        data-wb-toolbar-pinned="true"
        style={{
          position: "relative",
          zIndex: 2,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: 1,
          marginLeft: "auto",
          paddingLeft: 4,
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
        <button
          type="button"
          data-tool="delete"
          data-action="delete"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
          title="Xoá (Delete)"
          style={{
            ...btnBaseStyle,
            padding: "0 4px",
            color: selectedCount > 0 ? "#dc2626" : "#cbd5e1",
            cursor: selectedCount > 0 ? "pointer" : "default",
          }}
        >
          🗑
        </button>

        {/* Undo */}
        <button
          type="button"
          data-tool="undo"
          data-action="undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Hoàn tác (Ctrl+Z)"
          style={{
            ...btnBaseStyle,
            padding: "0 4px",
            color: canUndo ? "#334155" : "#cbd5e1",
            cursor: canUndo ? "pointer" : "default",
          }}
        >
          ↶
        </button>

        {/* Redo */}
        <button
          type="button"
          data-tool="redo"
          data-action="redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="Làm lại (Ctrl+Shift+Z)"
          style={{
            ...btnBaseStyle,
            padding: "0 4px",
            color: canRedo ? "#334155" : "#cbd5e1",
            cursor: canRedo ? "pointer" : "default",
          }}
        >
          ↷
        </button>

        {/* Local Offline Save & Open File */}
        {onSaveFile && (
          <button
            type="button"
            data-action="save-file"
            onClick={onSaveFile}
            title="Lưu bài vẽ ra file (.phys.json)"
            style={{ ...btnBaseStyle, padding: "0 5px" }}
          >
            <span aria-hidden="true">💾</span>
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
            <span aria-hidden="true">📂</span>
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
            style={{ ...btnBaseStyle, padding: "0 4px", fontWeight: 700 }}
          >
            ⌘
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
          style={{ ...btnBaseStyle, padding: "0 4px" }}
        >
          {isFullscreen ? "⤡" : "⛶"}
        </button>

        {/* More Menu */}
        <MoreMenu
          doc={doc}
          page={page.current}
          getBoardElement={getBoardElement}
          hasPaper={hasPaper}
          labelScale={labelScale}
          dotScale={dotScale}
          onScaleGeometry={onScaleGeometry}
          onChangeLabelScale={onChangeLabelScale}
          onChangeDotScale={onChangeDotScale}
          onOpenExam={onOpenExam}
          onOpenCommandPalette={onOpenCommandPalette}
          onExportTikz={onExportTikz}
          onOpenJsonModal={onOpenJsonModal}
          buttonStyle={{ height: 26, padding: "0 4px" }}
        />
      </div>

      {/* Portal Dropdowns: Select, Pen, Segment, Fill */}
      {typeof document !== "undefined" &&
        openMenu === "select" &&
        createPortal(
          <div
            ref={portalMenuRef}
            role="menu"
            style={{ ...portalMenuStyle, minWidth: 136 }}
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
              ✋ Chọn
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
              ⬚ Chọn vùng
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
            style={{ ...portalMenuStyle, minWidth: 130 }}
          >
            <button
              type="button"
              role="menuitem"
              data-menu-item="ink"
              onClick={() => {
                onSelectTool("ink");
                setOpenMenu(null);
              }}
              style={{
                ...portalItemStyle,
                background: activeTool === "ink" ? "#e8f0fe" : "transparent",
                color: activeTool === "ink" ? "#1a73e8" : "#1e293b",
              }}
            >
              ✎ Bút
            </button>
            <button
              type="button"
              role="menuitem"
              data-menu-item="ink:fountain"
              onClick={() => {
                onSelectTool("ink:fountain");
                setOpenMenu(null);
              }}
              style={{
                ...portalItemStyle,
                background:
                  activeTool === "ink:fountain" ? "#e8f0fe" : "transparent",
                color: activeTool === "ink:fountain" ? "#1a73e8" : "#1e293b",
              }}
            >
              ✒ Bút máy
            </button>
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
                  border: "1px solid #cbd5e1",
                  background:
                    "repeating-linear-gradient(135deg,#fff,#fff 4px,#fecaca 4px,#fecaca 6px)",
                  cursor: "pointer",
                  outline:
                    fillColor === "none" ? "2px solid #1a56db" : "none",
                  outlineOffset: 2,
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
