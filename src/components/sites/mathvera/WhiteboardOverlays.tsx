"use client";

import React from "react";
import type * as Y from "yjs";
import type { CanvasElement, SPenConfig, Style, WhiteboardTool } from "@/types/whiteboard";
import type { ViewportTransform } from "@/lib/coordinates";
import type { Point2D } from "@/lib/geometry";
import { getNextPointName, pointAtAngle } from "@/lib/geometry";
import { projectOxyzPoint } from "@/lib/geometry3d";
import { buildVarTableFromExpr } from "@/lib/math-eval";
import { buildShareUrl } from "@/lib/room";
import {
  BOARD_FORMAT_OPTIONS,
  applyBoardConfigToAllPages,
  writePageBoardConfig,
  type PageBoardConfig,
} from "@/lib/board-themes";
import type { ShortcutMap } from "@/lib/commands";
import type { LaserConfig } from "@/lib/laser-config";
import type { ToolbarVisibilityConfig } from "@/lib/toolbar-config";
import type { ActiveSimSession } from "@/lib/sim-library";
import type { ImportedPdfPage } from "@/lib/pdf-import";
import type { EquationSolution } from "@/lib/equation-solver";
import type { WhiteboardCommandDispatcher } from "@/lib/dispatcher";
import { addYjsPage, setYjsCurrentPage } from "./PageBar";
import { MathEditor } from "./MathEditor";
import { EquationSolverModal } from "./EquationSolverModal";
import {
  AxesPointDialog,
  AxesVectorDialog,
  Axes3DPointDialog,
  Axes3DVectorDialog,
  Axes3DFigureDialog,
  type Axes3DFigureKind,
  BayesConfigDialog,
  ChartConfigDialog,
  ConicConfigDialog,
  Curve2DConfigDialog,
  type Curve2DDialogMode,
  NumberLineConfigDialog,
  PlotConfigDialog,
  VarTableConfigDialog,
} from "./FunctionsAndStatsMenus";
import { PageManagerModal } from "./PageManagerModal";
import { PhysicsDrawer } from "./PhysicsDrawer";
import { MathFormulasDrawer } from "./MathFormulasDrawer";
import { ChemistryFormulasDrawer } from "./ChemistryFormulasDrawer";
import { SimLauncherModal } from "./SimLauncherModal";
import { FullscreenSimOverlay } from "./FullscreenSimOverlay";
import {
  QuestionCropModal,
  type BatchCroppedQuestionsResult,
  type CroppedQuestionResult,
} from "./QuestionCropModal";
import { ClassroomToolsWidget } from "./ClassroomToolsWidget";
import { FeatureGuideModal } from "./FeatureGuideModal";
import { PdfManualViewerModal } from "./PdfManualViewerModal";
import { RealWorldDrawer } from "./RealWorldDrawer";
import { CalculatorWidget } from "./CalculatorWidget";
import { ExportPdfModal } from "./ExportPdfModal";
import { LaserSettingsModal } from "./LaserSettingsModal";
import { SettingsModal, type SettingsTab } from "./SettingsModal";
import { CommandPaletteModal } from "./CommandPaletteModal";
import { BoardManagerModal } from "./BoardManagerModal";

function newOverlayElId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface PointRenameItem {
  id: string;
  originalName: string;
  draftName: string;
}

export interface WhiteboardOverlaysProps {
  activeRoomId: string;
  doc: Y.Doc | null;
  dispatcher: WhiteboardCommandDispatcher;
  currentPage: number;
  pageCount: number;
  pageElements: CanvasElement[];
  byId: Map<string, CanvasElement>;
  selectedElements: CanvasElement[];
  selectedAxes2D: CanvasElement | null;
  viewport: ViewportTransform;
  currentStyle: Style;
  isA4Format: boolean;
  currentBoardConfig: PageBoardConfig;
  getBoardElement: () => SVGSVGElement | null;
  getViewCenter: () => Point2D;
  setSelectedIds: (ids: string[]) => void;
  handleSelectTool: (tool: WhiteboardTool) => void;
  resetToolAfterCreation: () => void;
  setStatusHint: (hint: string | null) => void;

  // Math editor & equation solver
  mathSession: { elementId?: string; worldPos: Point2D; initialLatex: string } | null;
  setMathSession: React.Dispatch<
    React.SetStateAction<{ elementId?: string; worldPos: Point2D; initialLatex: string } | null>
  >;
  handleSolveMathLatex: (latex: string) => void;
  equationModalOpen: boolean;
  setEquationModalOpen: (open: boolean) => void;
  equationSolution: EquationSolution | null;

  // Geometry / axes / M3 dialogs
  ensureAxes2D: () => string;
  ensureAxes3D: () => string;
  handleSubmitPlot: (
    exprLatex: string,
    params: Array<{ name: string; min: number; max: number; step: number; value: number }>,
    domain?: [number, number]
  ) => void;
  plotDialogOpen: boolean;
  setPlotDialogOpen: (open: boolean) => void;
  axesPointDialogOpen: boolean;
  setAxesPointDialogOpen: (open: boolean) => void;
  axesVectorDialogOpen: boolean;
  setAxesVectorDialogOpen: (open: boolean) => void;
  axes3DPointDialogOpen: boolean;
  setAxes3DPointDialogOpen: (open: boolean) => void;
  axes3DVectorDialogOpen: boolean;
  setAxes3DVectorDialogOpen: (open: boolean) => void;
  axes3DFigureDialogKind: Axes3DFigureKind | null;
  setAxes3DFigureDialogKind: (kind: Axes3DFigureKind | null) => void;
  curve2dDialogMode: Curve2DDialogMode | null;
  setCurve2dDialogMode: (mode: Curve2DDialogMode | null) => void;
  conicDialogKind: "ellipse" | "parabola" | "hyperbola" | null;
  setConicDialogKind: (kind: "ellipse" | "parabola" | "hyperbola" | null) => void;
  varTableDialogMode: "variation" | "sign" | null;
  setVarTableDialogMode: (mode: "variation" | "sign" | null) => void;
  chartDialogOpen: boolean;
  setChartDialogOpen: (open: boolean) => void;
  bayesDialogOpen: boolean;
  setBayesDialogOpen: (open: boolean) => void;
  numberLineDialogOpen: boolean;
  setNumberLineDialogOpen: (open: boolean) => void;

  // Point rename & Angle popover
  pointRenameSession: { items: PointRenameItem[] } | null;
  setPointRenameSession: React.Dispatch<React.SetStateAction<{ items: PointRenameItem[] } | null>>;
  handleSubmitPointRename: (items: Array<{ id: string; draftName: string }>) => void;
  angleDialog: { vertexId: string; armId: string; vertexPos: Point2D; armPos: Point2D } | null;
  setAngleDialog: React.Dispatch<
    React.SetStateAction<{ vertexId: string; armId: string; vertexPos: Point2D; armPos: Point2D } | null>
  >;
  angleDegInput: string;
  setAngleDegInput: (val: string) => void;

  // Side drawers & teaching widgets
  physicsDrawerOpen: boolean;
  setPhysicsDrawerOpen: (open: boolean) => void;
  mathDrawerOpen: boolean;
  setMathDrawerOpen: (open: boolean) => void;
  chemistryDrawerOpen: boolean;
  setChemistryDrawerOpen: (open: boolean) => void;
  realWorldDrawerOpen: boolean;
  setRealWorldDrawerOpen: (open: boolean) => void;
  calculatorOpen: boolean;
  setCalculatorOpen: (open: boolean) => void;
  classroomToolsOpen: boolean;
  setClassroomToolsOpen: (open: boolean) => void;
  featureGuideOpen: boolean;
  setFeatureGuideOpen: (open: boolean) => void;
  pdfManualOpen: boolean;
  setPdfManualOpen: (open: boolean) => void;
  onOpenTutorialBoard: (boardId: string) => Promise<void>;
  onRestoreTutorials: () => Promise<void>;

  // Simulations
  simLauncherOpen: boolean;
  setSimLauncherOpen: (open: boolean) => void;
  activeSim: ActiveSimSession | null;
  simMinimized: boolean;
  setSimMinimized: (min: boolean) => void;
  onLaunchSimSession: (session: ActiveSimSession) => void;
  onCloseSimSession: () => void;

  // Modals: Crop, PageManager, ExportPDF, Laser, Settings, Share, CommandPalette, BoardManager
  questionCropOpen: boolean;
  setQuestionCropOpen: (open: boolean) => void;
  pageManagerOpen: boolean;
  setPageManagerOpen: (open: boolean) => void;
  exportPdfModalOpen: boolean;
  setExportPdfModalOpen: (open: boolean) => void;
  laserSettingsOpen: boolean;
  setLaserSettingsOpen: (open: boolean) => void;
  laserConfig: LaserConfig;
  onUpdateLaserConfig: (cfg: LaserConfig) => void;

  settingsModalOpen: boolean;
  settingsInitialTab: SettingsTab | undefined;
  closeSettingsModal: () => void;
  toolbarConfig: ToolbarVisibilityConfig;
  onUpdateToolbarConfig: (cfg: ToolbarVisibilityConfig) => void;
  autoSwitchTarget: "select" | "ink" | "off";
  onChangeAutoSwitchTarget: (target: "select" | "ink" | "off") => void;
  inkToShape: boolean;
  onChangeInkToShape: (val: boolean) => void;
  penOnlyMode: boolean;
  onChangePenOnlyMode: (val: boolean) => void;
  spenConfig: SPenConfig;
  onUpdateSPenConfig: (cfg: SPenConfig) => void;
  onChangeGridEnabled: (val: boolean) => void;
  guideEnabled: boolean;
  onToggleGuide: () => void;
  labelScale: number;
  onChangeLabelScale: (scale: number) => void;
  dotScale: number;
  onChangeDotScale: (scale: number) => void;

  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
  shareCopied: boolean;
  setShareCopied: (copied: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  shortcutMap: ShortcutMap;
  onChangeShortcutMap: (map: ShortcutMap) => void;
  executeCommand: (cmdId: string) => void;

  boardManagerOpen: boolean;
  setBoardManagerOpen: (open: boolean) => void;
  onInsertPdfPages: (pages: ImportedPdfPage[]) => void;
  openSettingsModal: (tab?: SettingsTab) => void;
}

/**
 * Orchestrates all secondary modals, configuration dialogs, formula drawers,
 * simulators, question cropper, and settings panels for Whiteboard.
 */
export const WhiteboardOverlays: React.FC<WhiteboardOverlaysProps> = (p) => {
  const insertMathAtCenter = (
    latex: string,
    opts?: { offsetY?: number; stroke?: string; hint?: string }
  ) => {
    const center = p.getViewCenter();
    const res = p.dispatcher.dispatch({
      type: "object.create",
      params: {
        type: "MathText",
        transform: {
          x: center.x,
          y: center.y + (opts?.offsetY ?? 0),
          scale: 1,
          rotation: 0,
          z: 0,
        },
        style: { stroke: opts?.stroke ?? p.currentStyle.stroke ?? "#0f172a" },
        props: { latex },
      },
    });
    if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
    p.handleSelectTool("select");
    if (opts?.hint) p.setStatusHint(opts.hint);
  };

  const a4Opt = p.isA4Format
    ? BOARD_FORMAT_OPTIONS.find((f) => f.id === p.currentBoardConfig.format) ||
      BOARD_FORMAT_OPTIONS[1]
    : null;

  return (
    <>
      {/* MathLive Inline Formula Editor */}
      {p.mathSession && (
        <MathEditor
          initialLatex={p.mathSession.initialLatex}
          worldPos={p.mathSession.worldPos}
          viewport={p.viewport}
          defaultKeyboardOpen={true}
          onCommit={(latex) => {
            if (p.mathSession?.elementId) {
              const existing = p.byId.get(p.mathSession.elementId);
              if (existing) {
                p.dispatcher.dispatch({
                  type: "object.update",
                  params: {
                    id: existing.id,
                    props: { ...existing.props, latex },
                  },
                });
              }
            } else if (p.mathSession) {
              const res = p.dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "MathText",
                  transform: {
                    x: p.mathSession.worldPos.x,
                    y: p.mathSession.worldPos.y,
                    scale: 1,
                    rotation: 0,
                    z: 0,
                  },
                  style: { stroke: p.currentStyle.stroke ?? "#0f172a" },
                  props: { latex },
                },
              });
              if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
            }
            p.setMathSession(null);
            p.resetToolAfterCreation();
          }}
          onCancel={() => {
            p.setMathSession(null);
            p.resetToolAfterCreation();
          }}
          onSolveEquation={(latex) => {
            p.handleSolveMathLatex(latex);
          }}
          onPlotFunction={(latex) => {
            const clean = latex.replace(/^[yY]\s*=\s*/, "").replace(/^f\(x\)\s*=\s*/, "").trim();
            p.handleSubmitPlot(clean || latex, []);
            p.setStatusHint("Đã vẽ đồ thị hàm số sang hệ trục Oxy");
          }}
          onBuildVarTable={(latex) => {
            const clean = latex.replace(/^[yY]\s*=\s*/, "").replace(/^f\(x\)\s*=\s*/, "").trim();
            const exprToUse = clean || "x^2 - 2x";
            const res = buildVarTableFromExpr(exprToUse);
            if ("error" in res) {
              p.setStatusHint(res.error);
              return;
            }
            const center = p.getViewCenter();
            const vtRes = p.dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "VarTable",
                transform: { x: center.x, y: center.y - 1, scale: 1, rotation: 0, z: 0 },
                style: { stroke: "#0f172a", width: 1.5 },
                props: { table: res, formulaLatex: exprToUse },
              },
            });
            if (vtRes.created?.[0]) p.setSelectedIds([vtRes.created[0]]);
            p.setStatusHint("Đã tạo bảng biến thiên tự động");
          }}
          onShadeIntegral={(latex) => {
            const clean = latex.replace(/^[yY]\s*=\s*/, "").replace(/^f\(x\)\s*=\s*/, "").trim();
            p.handleSubmitPlot(clean || latex, [], [-2, 2]);
            setTimeout(() => {
              const created = p.pageElements.find(
                (el) => el.type === "Plot" && (el.props.exprLatex === clean || el.props.exprLatex === latex)
              );
              if (created) {
                p.dispatcher.dispatch({
                  type: "object.update",
                  params: {
                    id: created.id,
                    props: { ...created.props, shade: [0, 2] },
                  },
                });
              }
            }, 50);
            p.setStatusHint("Đã vẽ hàm số và tô miền tích phân [0, 2]");
          }}
        />
      )}

      {/* Equation / System of Equations Solver Modal */}
      <EquationSolverModal
        isOpen={p.equationModalOpen}
        onClose={() => p.setEquationModalOpen(false)}
        solution={p.equationSolution}
        onInsertToCanvas={(latex) =>
          insertMathAtCenter(latex, {
            offsetY: -1,
            stroke: "#2563eb",
            hint: "Đã chèn nghiệm phương trình lên bảng",
          })
        }
      />

      {/* M3 Config Dialogs */}
      <PlotConfigDialog
        open={p.plotDialogOpen}
        onSubmit={p.handleSubmitPlot}
        onCancel={() => p.setPlotDialogOpen(false)}
      />

      <AxesPointDialog
        open={p.axesPointDialogOpen}
        defaultName={getNextPointName(p.pageElements, ["M", "N", "P", "Q", "A", "B"])}
        onSubmit={(name, x, y) => {
          const axesId = p.ensureAxes2D();
          const axesEl = p.pageElements.find((e) => e.id === axesId);
          const sc = axesEl?.transform.scale || 1;
          const wx = (axesEl?.transform.x ?? 0) + sc * x;
          const wy = (axesEl?.transform.y ?? 0) + sc * y;
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: wx, y: wy, scale: 1, rotation: 0, z: 0 },
              style: { stroke: "#2563eb", fill: "#2563eb" },
              props: {
                name: `${name}(${x}; ${y})`,
                constraint: { kind: "oxy", axes: axesId, x, y },
              },
            },
          });
          if (!p.selectedAxes2D && res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.setAxesPointDialogOpen(false);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setAxesPointDialogOpen(false)}
      />

      {p.pointRenameSession && (
        <div
          data-export-skip="true"
          data-testid="point-rename-dialog"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) p.setPointRenameSession(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10050,
            background: "rgba(15, 23, 42, 0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (p.pointRenameSession) p.handleSubmitPointRename(p.pointRenameSession.items);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                p.setPointRenameSession(null);
              }
            }}
            style={{
              width: "100%",
              maxWidth: 360,
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {p.pointRenameSession.items.length === 1
                ? "Đổi tên điểm"
                : `Đổi tên ${p.pointRenameSession.items.length} điểm`}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {p.pointRenameSession.items.map((item, idx) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13.5,
                    color: "#334155",
                    fontWeight: 600,
                  }}
                >
                  {p.pointRenameSession && p.pointRenameSession.items.length > 1 && (
                    <span style={{ minWidth: 68, color: "#64748b" }}>
                      {item.originalName ? `Điểm ${item.originalName}:` : `Điểm #${idx + 1}:`}
                    </span>
                  )}
                  <input
                    data-testid={idx === 0 ? "point-rename-input" : `point-rename-input-${idx}`}
                    type="text"
                    autoFocus={idx === 0}
                    onFocus={(e) => e.currentTarget.select()}
                    value={item.draftName}
                    placeholder="Nhập tên điểm (vd: A, M, A')"
                    onChange={(e) => {
                      const val = e.target.value;
                      p.setPointRenameSession((prev) =>
                        prev
                          ? {
                              items: prev.items.map((it) =>
                                it.id === item.id ? { ...it, draftName: val } : it
                              ),
                            }
                          : null
                      );
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 14,
                      color: "#0f172a",
                      outline: "none",
                    }}
                  />
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                data-action="point-rename-cancel"
                onClick={() => p.setPointRenameSession(null)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
              <button
                type="submit"
                data-action="point-rename-save"
                style={{
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Lưu tên
              </button>
            </div>
          </form>
        </div>
      )}

      <AxesVectorDialog
        open={p.axesVectorDialogOpen}
        onSubmit={(vx, vy, x0, y0) => {
          const axesId = p.ensureAxes2D();
          const axesEl = p.pageElements.find((e) => e.id === axesId);
          const sc = axesEl?.transform.scale || 1;
          const axX = axesEl?.transform.x ?? 0;
          const axY = axesEl?.transform.y ?? 0;
          const pAId = newOverlayElId("pt");
          const pBId = newOverlayElId("pt");
          let vecId = "";
          p.dispatcher.batch(() => {
            p.dispatcher.dispatch({
              type: "object.create",
              params: {
                id: pAId,
                type: "GeomPoint",
                transform: { x: axX + sc * x0, y: axY + sc * y0, scale: 1, rotation: 0, z: 0 },
                props: {
                  name: "",
                  dot: "none",
                  constraint: { kind: "oxy", axes: axesId, x: x0, y: y0 },
                },
              },
            });
            p.dispatcher.dispatch({
              type: "object.create",
              params: {
                id: pBId,
                type: "GeomPoint",
                transform: {
                  x: axX + sc * (x0 + vx),
                  y: axY + sc * (y0 + vy),
                  scale: 1,
                  rotation: 0,
                  z: 0,
                },
                props: {
                  name: `(${vx}; ${vy})`,
                  dot: "none",
                  constraint: { kind: "oxy", axes: axesId, x: x0 + vx, y: y0 + vy },
                },
              },
            });
            const vRes = p.dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomVector",
                style: { stroke: "#2563eb", width: 2.2 },
                props: { from: pAId, to: pBId },
              },
            });
            vecId = vRes.created?.[0] ?? "";
          });
          if (!p.selectedAxes2D && vecId) p.setSelectedIds([vecId]);
          p.setAxesVectorDialogOpen(false);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setAxesVectorDialogOpen(false)}
      />

      <Axes3DPointDialog
        open={p.axes3DPointDialogOpen}
        defaultName={getNextPointName(p.pageElements, ["M", "N", "P", "Q", "A", "B", "C"])}
        onSubmit={(name, x, y, z) => {
          const axesId = p.ensureAxes3D();
          const axesEl = p.pageElements.find((e) => e.id === axesId);
          const tr = axesEl?.transform ?? { x: 0, y: 0, scale: 1 };
          const p2 = projectOxyzPoint(tr, { x, y, z });
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: p2.x, y: p2.y, scale: 1, rotation: 0, z: 0 },
              style: { stroke: "#2563eb", fill: "#2563eb" },
              props: {
                name: `${name}(${x}; ${y}; ${z})`,
                constraint: { kind: "oxyz", axes: axesId, x, y, z },
              },
            },
          });
          if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.setAxes3DPointDialogOpen(false);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setAxes3DPointDialogOpen(false)}
      />

      <Axes3DVectorDialog
        open={p.axes3DVectorDialogOpen}
        onSubmit={(vx, vy, vz, x0, y0, z0) => {
          const axesId = p.ensureAxes3D();
          const axesEl = p.pageElements.find((e) => e.id === axesId);
          const tr = axesEl?.transform ?? { x: 0, y: 0, scale: 1 };
          const pA2 = projectOxyzPoint(tr, { x: x0, y: y0, z: z0 });
          const pB2 = projectOxyzPoint(tr, { x: x0 + vx, y: y0 + vy, z: z0 + vz });
          const pAId = newOverlayElId("pt");
          const pBId = newOverlayElId("pt");
          let vecId = "";
          p.dispatcher.batch(() => {
            p.dispatcher.dispatch({
              type: "object.create",
              params: {
                id: pAId,
                type: "GeomPoint",
                transform: { x: pA2.x, y: pA2.y, scale: 1, rotation: 0, z: 0 },
                props: {
                  name: "",
                  dot: "none",
                  constraint: { kind: "oxyz", axes: axesId, x: x0, y: y0, z: z0 },
                },
              },
            });
            p.dispatcher.dispatch({
              type: "object.create",
              params: {
                id: pBId,
                type: "GeomPoint",
                transform: { x: pB2.x, y: pB2.y, scale: 1, rotation: 0, z: 0 },
                props: {
                  name: `u⃗(${vx}; ${vy}; ${vz})`,
                  dot: "none",
                  constraint: { kind: "oxyz", axes: axesId, x: x0 + vx, y: y0 + vy, z: z0 + vz },
                },
              },
            });
            const vRes = p.dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomVector",
                style: { stroke: "#0891b2", width: 2.2 },
                props: { from: pAId, to: pBId },
              },
            });
            vecId = vRes.created?.[0] ?? "";
          });
          if (vecId) p.setSelectedIds([vecId]);
          p.setAxes3DVectorDialogOpen(false);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setAxes3DVectorDialogOpen(false)}
      />

      <Axes3DFigureDialog
        open={p.axes3DFigureDialogKind !== null}
        kind={p.axes3DFigureDialogKind ?? "plane"}
        onSubmit={(def, name, color) => {
          const axesId = p.ensureAxes3D();
          const axesEl = p.pageElements.find((e) => e.id === axesId);
          const tr = axesEl?.transform ?? { x: 0, y: 0, scale: 1, rotation: 0, z: 0 };
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "SpaceFigure",
              transform: { ...tr },
              style: { stroke: color ?? "#7c3aed", width: 2 },
              props: {
                axes: axesId,
                def,
                name,
                color,
              },
            },
          });
          if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.setAxes3DFigureDialogKind(null);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setAxes3DFigureDialogKind(null)}
      />

      <Curve2DConfigDialog
        open={p.curve2dDialogMode !== null}
        mode={p.curve2dDialogMode ?? "equation"}
        onSubmit={(def, color) => {
          const axesId = p.ensureAxes2D();
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Curve2D",
              style: { stroke: color, width: 2 },
              props: { axes: axesId, color, def },
            },
          });
          if (!p.selectedAxes2D && res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.setCurve2dDialogMode(null);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setCurve2dDialogMode(null)}
      />

      <ConicConfigDialog
        open={p.conicDialogKind !== null}
        kind={p.conicDialogKind ?? "ellipse"}
        onSubmit={(kind, a, b) => {
          const axesId = p.ensureAxes2D();
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Conic",
              style: { stroke: "#9333ea", width: 2.2 },
              props: { kind, a, b, axes: axesId },
            },
          });
          if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.setConicDialogKind(null);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setConicDialogKind(null)}
      />

      <VarTableConfigDialog
        open={p.varTableDialogMode !== null}
        mode={p.varTableDialogMode ?? "variation"}
        onSubmit={(propsObj) => {
          const center = p.getViewCenter();
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "VarTable",
              transform: {
                x: center.x - 3,
                y: center.y + 1.5,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              props: propsObj,
            },
          });
          if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.setVarTableDialogMode(null);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setVarTableDialogMode(null)}
      />

      {p.doc && (
        <PageManagerModal
          open={p.pageManagerOpen}
          onClose={() => p.setPageManagerOpen(false)}
          doc={p.doc}
          currentPage={p.currentPage}
          totalPages={p.pageCount}
        />
      )}

      <ChartConfigDialog
        open={p.chartDialogOpen}
        onSubmit={(propsObj) => {
          const center = p.getViewCenter();
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Chart",
              transform: {
                x: center.x - 3,
                y: center.y + 2,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              props: propsObj,
            },
          });
          if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.setChartDialogOpen(false);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setChartDialogOpen(false)}
      />

      <BayesConfigDialog
        open={p.bayesDialogOpen}
        onSubmit={(root, formulaLatex) => {
          const center = p.getViewCenter();
          p.dispatcher.batch(() => {
            p.dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "TreeDiagram",
                transform: {
                  x: center.x - 3,
                  y: center.y + 2,
                  scale: 1,
                  rotation: 0,
                  z: 0,
                },
                props: { root },
              },
            });
            p.dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "MathText",
                transform: {
                  x: center.x - 3,
                  y: center.y - 2.2,
                  scale: 1,
                  rotation: 0,
                  z: 0,
                },
                props: { latex: formulaLatex },
              },
            });
          });
          p.setBayesDialogOpen(false);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setBayesDialogOpen(false)}
      />

      <NumberLineConfigDialog
        open={p.numberLineDialogOpen}
        onSubmit={(setExpr) => {
          const center = p.getViewCenter();
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "NumberLine",
              transform: {
                x: center.x - 4,
                y: center.y + 1,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              props: { set: setExpr },
            },
          });
          if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.setNumberLineDialogOpen(false);
          p.handleSelectTool("select");
        }}
        onCancel={() => p.setNumberLineDialogOpen(false)}
      />

      {/* Angle Degree Popover for c:angleval */}
      {p.angleDialog && (
        <div
          data-wb-angle-input="true"
          style={{
            position: "fixed",
            top: 64,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 10px 28px rgba(15,23,42,0.16)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
          }}
        >
          <span>Số đo góc (°):</span>
          <input
            autoFocus
            value={p.angleDegInput}
            onChange={(e) => p.setAngleDegInput(e.target.value)}
            style={{
              width: 68,
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "4px 8px",
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!p.angleDialog) return;
              const deg = Number(p.angleDegInput) || 60;
              const endPt = pointAtAngle(p.angleDialog.vertexPos, p.angleDialog.armPos, deg);
              if (!endPt) return;
              const segId = newOverlayElId("angray");
              const endId = `${segId}_b`;
              const vId = p.angleDialog.vertexId;
              const vPos = p.angleDialog.vertexPos;
              p.dispatcher.batch(() => {
                p.dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: endId,
                    type: "GeomPoint",
                    transform: { x: endPt.x, y: endPt.y, scale: 1, rotation: 0, z: 0 },
                    props: {
                      name: getNextPointName(p.pageElements),
                      constraint: { kind: "free" },
                    },
                  },
                });
                p.dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: segId,
                    type: "GeomRay",
                    props: {
                      from: vId,
                      to: endId,
                      fromPt: vPos,
                    },
                  },
                });
              });
              p.setAngleDialog(null);
            }}
            style={{
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 7,
              padding: "5px 12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Dựng
          </button>
          <button
            type="button"
            onClick={() => p.setAngleDialog(null)}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              borderRadius: 7,
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            Huỷ
          </button>
        </div>
      )}

      {/* Physics, Math, Chemistry Formula Drawers */}
      <PhysicsDrawer
        open={p.physicsDrawerOpen}
        onClose={() => p.setPhysicsDrawerOpen(false)}
        onInsertFormulaLatex={(latex) => insertMathAtCenter(latex)}
      />

      <MathFormulasDrawer
        open={p.mathDrawerOpen}
        onClose={() => p.setMathDrawerOpen(false)}
        onInsertFormulaLatex={(latex) => insertMathAtCenter(latex)}
      />

      <ChemistryFormulasDrawer
        open={p.chemistryDrawerOpen}
        onClose={() => p.setChemistryDrawerOpen(false)}
        onInsertFormulaLatex={(latex) => insertMathAtCenter(latex)}
      />

      {/* Fullscreen PhET Online & Offline HTML Simulation System */}
      <SimLauncherModal
        open={p.simLauncherOpen}
        onClose={() => p.setSimLauncherOpen(false)}
        activeSim={p.activeSim}
        onResumeActive={() => p.setSimMinimized(false)}
        onLaunchSession={p.onLaunchSimSession}
      />

      <FullscreenSimOverlay
        key={p.activeSim?.id ?? "empty"}
        session={p.activeSim}
        minimized={p.simMinimized}
        onMinimize={() => p.setSimMinimized(true)}
        onRestore={() => p.setSimMinimized(false)}
        onClose={p.onCloseSimSession}
        onOpenLauncher={() => p.setSimLauncherOpen(true)}
      />

      {/* Quick Question Cropper from PDF / Image */}
      <QuestionCropModal
        open={p.questionCropOpen}
        onClose={() => p.setQuestionCropOpen(false)}
        onInsertCropped={(res: CroppedQuestionResult) => {
          const center = p.getViewCenter();
          const aspect = res.heightPx / Math.max(1, res.widthPx);

          if (p.isA4Format && p.doc) {
            const pageW = a4Opt?.widthWorld ?? 17;
            const pageH = a4Opt?.heightWorld ?? 24.04;
            const pageGap = 0.8;
            const pageStep = pageH + pageGap;
            const marginX = 0.9;
            const marginTop = 0.85;
            const marginBottom = 0.85;
            const maxPrintableW = Math.max(4, pageW - marginX * 2);
            const maxPrintableH = Math.max(4, pageH - marginTop - marginBottom);

            let targetW = Math.min(maxPrintableW, Math.max(4.5, res.widthPx / 65));
            let targetH = targetW * aspect;
            if (targetH > maxPrintableH) {
              const shrink = maxPrintableH / targetH;
              targetW *= shrink;
              targetH = maxPrintableH;
            }

            let topSvg = Math.max(marginTop, -(center.y + 1.5) - targetH / 2);
            let targetPage = Math.max(1, Math.floor(topSvg / pageStep) + 1);
            const pageTopSvg = (targetPage - 1) * pageStep + marginTop;
            const pageBottomSvg = (targetPage - 1) * pageStep + pageH - marginBottom;
            if (topSvg < pageTopSvg) {
              topSvg = pageTopSvg;
            }
            if (topSvg + targetH > pageBottomSvg) {
              targetPage += 1;
              topSvg = (targetPage - 1) * pageStep + marginTop;
            }

            const prevCurrent = p.currentPage;
            let curCount = p.pageCount;
            while (curCount < targetPage) {
              addYjsPage(p.doc);
              curCount++;
            }
            if (targetPage > p.pageCount) {
              setYjsCurrentPage(p.doc, prevCurrent);
            }

            const cy = -(topSvg + targetH / 2);
            const created = p.dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "Image",
                transform: { x: 0, y: cy, scale: 1, rotation: 0, z: 0 },
                style: res.lockOnInsert ? { locked: true } : {},
                props: {
                  src: res.dataUrl,
                  w: targetW,
                  h: targetH,
                  locked: res.lockOnInsert,
                },
              },
            });
            p.setSelectedIds(!res.lockOnInsert && created.created?.[0] ? [created.created[0]] : []);
            p.setStatusHint(
              res.lockOnInsert
                ? "✓ Đã cắt & khoá đề bài lên trang A4 (tự tránh vạch ngắt trang)"
                : "✓ Đã cắt & ghim câu hỏi lên trang A4"
            );
            return;
          }

          const targetW = Math.min(11, Math.max(4.5, res.widthPx / 65));
          const targetH = targetW * aspect;
          const created = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Image",
              transform: { x: center.x, y: center.y + 1.5, scale: 1, rotation: 0, z: 0 },
              style: res.lockOnInsert ? { locked: true } : {},
              props: {
                src: res.dataUrl,
                w: targetW,
                h: targetH,
                locked: res.lockOnInsert,
              },
            },
          });
          p.setSelectedIds(!res.lockOnInsert && created.created?.[0] ? [created.created[0]] : []);
          p.setStatusHint(
            res.lockOnInsert
              ? "✓ Đã cắt & khoá đề bài lên bảng (nhấp đúp để mở khoá nếu cần di chuyển)"
              : "✓ Đã cắt & ghim câu hỏi lên bảng"
          );
        }}
        onInsertBatchCropped={(batch: BatchCroppedQuestionsResult) => {
          if (batch.items.length === 0) return;
          const center = p.getViewCenter();
          const maxWidthPx = Math.max(1, ...batch.items.map((it) => it.widthPx));
          const createdIds: string[] = [];

          if (p.isA4Format && p.doc) {
            const pageW = a4Opt?.widthWorld ?? 17;
            const pageH = a4Opt?.heightWorld ?? 24.04;
            const pageGap = 0.8;
            const pageStep = pageH + pageGap;
            const marginX = 0.9;
            const marginTop = 0.85;
            const marginBottom = 0.85;
            const maxPrintableW = Math.max(4, pageW - marginX * 2);
            const maxPrintableH = Math.max(4, pageH - marginTop - marginBottom);

            const pxPerWorld = Math.max(65, maxWidthPx / Math.min(13.2, maxPrintableW));
            const maxTargetW = Math.min(maxPrintableW, maxWidthPx / pxPerWorld);
            const leftX = Math.max(-pageW / 2 + marginX, -maxTargetW / 2);

            const startPage = Math.max(1, Math.floor(Math.max(0, -center.y) / pageStep) + 1);
            let cursorTopSvg = Math.max((startPage - 1) * pageStep + marginTop, -center.y - 6.0);
            let maxPageUsed = startPage;

            for (const item of batch.items) {
              let targetW = item.widthPx / pxPerWorld;
              let targetH = item.heightPx / pxPerWorld;
              if (targetW > maxPrintableW) {
                const shrink = maxPrintableW / targetW;
                targetW = maxPrintableW;
                targetH *= shrink;
              }
              if (targetH > maxPrintableH) {
                const shrink = maxPrintableH / targetH;
                targetW *= shrink;
                targetH = maxPrintableH;
              }

              let curPage = Math.max(1, Math.floor(Math.max(0, cursorTopSvg) / pageStep) + 1);
              const pageTopSvg = (curPage - 1) * pageStep + marginTop;
              const pageBottomSvg = (curPage - 1) * pageStep + pageH - marginBottom;

              if (cursorTopSvg < pageTopSvg) cursorTopSvg = pageTopSvg;
              if (cursorTopSvg + targetH > pageBottomSvg) {
                curPage += 1;
                cursorTopSvg = (curPage - 1) * pageStep + marginTop;
              }

              maxPageUsed = Math.max(maxPageUsed, curPage);
              const cx = Math.min(pageW / 2 - marginX - targetW / 2, leftX + targetW / 2);
              const cy = -(cursorTopSvg + targetH / 2);
              cursorTopSvg += targetH + batch.gapWorld;

              const created = p.dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "Image",
                  transform: { x: cx, y: cy, scale: 1, rotation: 0, z: 0 },
                  style: batch.lockOnInsert ? { locked: true } : {},
                  props: {
                    src: item.dataUrl,
                    w: targetW,
                    h: targetH,
                    locked: batch.lockOnInsert,
                  },
                },
              });
              if (created.created?.[0]) createdIds.push(created.created[0]);
            }

            const prevCurrent = p.currentPage;
            let curCount = p.pageCount;
            while (curCount < maxPageUsed) {
              addYjsPage(p.doc);
              curCount++;
            }
            if (maxPageUsed > p.pageCount) {
              setYjsCurrentPage(p.doc, prevCurrent);
            }

            p.setSelectedIds(!batch.lockOnInsert && createdIds.length > 0 ? createdIds : []);
            p.setStatusHint(
              `✓ Đã chèn ${createdIds.length} câu hỏi qua ${maxPageUsed} trang A4 (tự nhảy trang, không đè vạch cắt)`
            );
            return;
          }

          const pxPerWorld = Math.max(65, maxWidthPx / 10.5);
          const maxTargetW = maxWidthPx / pxPerWorld;
          const leftX = center.x - maxTargetW / 2;
          let cursorTopY = center.y + 4.5;

          for (const item of batch.items) {
            const targetW = item.widthPx / pxPerWorld;
            const targetH = item.heightPx / pxPerWorld;
            const cx = leftX + targetW / 2;
            const cy = cursorTopY - targetH / 2;
            cursorTopY -= targetH + batch.gapWorld;

            const created = p.dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "Image",
                transform: { x: cx, y: cy, scale: 1, rotation: 0, z: 0 },
                style: batch.lockOnInsert ? { locked: true } : {},
                props: {
                  src: item.dataUrl,
                  w: targetW,
                  h: targetH,
                  locked: batch.lockOnInsert,
                },
              },
            });
            if (created.created?.[0]) createdIds.push(created.created[0]);
          }

          p.setSelectedIds(!batch.lockOnInsert && createdIds.length > 0 ? createdIds : []);
          p.setStatusHint(
            `✓ Đã tự động cắt & chèn ${createdIds.length} câu hỏi lên bảng (có khoảng trống để viết lời giải)`
          );
        }}
      />

      {/* Classroom Countdown Timer & Random Student Picker */}
      <ClassroomToolsWidget
        open={p.classroomToolsOpen}
        onClose={() => p.setClassroomToolsOpen(false)}
      />

      {/* First-Launch Onboarding & Interactive Feature Guide */}
      <FeatureGuideModal
        open={p.featureGuideOpen}
        onClose={() => p.setFeatureGuideOpen(false)}
        onOpenPdfManual={() => {
          p.setFeatureGuideOpen(false);
          p.setPdfManualOpen(true);
        }}
        onOpenTutorialBoard={p.onOpenTutorialBoard}
        onRestoreTutorials={p.onRestoreTutorials}
      />

      {/* Offline Complete A4 PDF Manual Viewer */}
      <PdfManualViewerModal
        open={p.pdfManualOpen}
        onClose={() => p.setPdfManualOpen(false)}
      />

      {/* Searchable 100-item RealWorld Drawer */}
      <RealWorldDrawer
        open={p.realWorldDrawerOpen}
        onClose={() => p.setRealWorldDrawerOpen(false)}
        onSelectIcon={(item) => {
          const center = p.getViewCenter();
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "RealObject",
              transform: { x: center.x, y: center.y - 1.5, scale: 1, rotation: 0, z: 0 },
              props: { icon: item.id, from: "", to: "", width: 1 },
            },
          });
          if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.handleSelectTool("select");
        }}
        onSelectPicture={({ src, ratio }) => {
          const center = p.getViewCenter();
          const res = p.dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "RealObject",
              transform: { x: center.x, y: center.y - 1.5, scale: 1, rotation: 0, z: 0 },
              props: { icon: "custom", src, ratio, from: "", to: "", width: 1 },
            },
          });
          if (res.created?.[0]) p.setSelectedIds([res.created[0]]);
          p.handleSelectTool("select");
        }}
      />

      {/* Floating Scientific & Casio Calculator Widget */}
      <CalculatorWidget
        open={p.calculatorOpen}
        onClose={() => p.setCalculatorOpen(false)}
        onInsertLatex={(latex) =>
          insertMathAtCenter(latex, { hint: `✓ Đã chèn công thức "${latex}" vào bảng` })
        }
      />

      {/* PDF Export Modal */}
      <ExportPdfModal
        open={p.exportPdfModalOpen}
        doc={p.doc}
        currentPage={p.currentPage}
        totalPages={p.pageCount}
        getBoardElement={p.getBoardElement}
        onClose={() => p.setExportPdfModalOpen(false)}
      />

      {/* Laser Pointer Settings Modal */}
      <LaserSettingsModal
        open={p.laserSettingsOpen}
        onClose={() => p.setLaserSettingsOpen(false)}
        config={p.laserConfig}
        onChangeConfig={p.onUpdateLaserConfig}
      />

      {/* Main Settings Modal */}
      <SettingsModal
        open={p.settingsModalOpen}
        initialTab={p.settingsInitialTab}
        onClose={p.closeSettingsModal}
        toolbarConfig={p.toolbarConfig}
        onChangeToolbarConfig={p.onUpdateToolbarConfig}
        autoSwitchTarget={p.autoSwitchTarget}
        onChangeAutoSwitchTarget={p.onChangeAutoSwitchTarget}
        inkToShape={p.inkToShape}
        onChangeInkToShape={p.onChangeInkToShape}
        penOnlyMode={p.penOnlyMode}
        onChangePenOnlyMode={p.onChangePenOnlyMode}
        spenConfig={p.spenConfig}
        onChangeSPenConfig={p.onUpdateSPenConfig}
        laserConfig={p.laserConfig}
        onChangeLaserConfig={p.onUpdateLaserConfig}
        onChangeGridEnabled={p.onChangeGridEnabled}
        isGuideEnabled={p.guideEnabled}
        onToggleGuide={p.onToggleGuide}
        doc={p.doc}
        page={p.currentPage}
        totalPages={p.pageCount}
        getBoardElement={p.getBoardElement}
        boardConfig={p.currentBoardConfig}
        onChangeBoardConfig={(next: PageBoardConfig) => {
          if (!p.doc) return;
          writePageBoardConfig(p.doc, p.currentPage, next);
          if (next.pattern !== "none") p.onChangeGridEnabled(true);
        }}
        onApplyBoardAllPages={(cfg: PageBoardConfig) => {
          if (!p.doc) return;
          applyBoardConfigToAllPages(p.doc, p.pageCount, cfg);
          p.setStatusHint("✓ Đã áp dụng loại bảng cho tất cả các trang");
        }}
        onScaleGeometry={(factor) => p.dispatcher.scaleGeometry(factor)}
        labelScale={p.labelScale}
        onChangeLabelScale={p.onChangeLabelScale}
        dotScale={p.dotScale}
        onChangeDotScale={p.onChangeDotScale}
        onOpenCommandPalette={() => p.setCommandPaletteOpen(true)}
        onExportPdf={() => p.setExportPdfModalOpen(true)}
        onOpenFeatureGuide={() => p.setFeatureGuideOpen(true)}
        onOpenPdfManual={() => p.setPdfManualOpen(true)}
      />

      {/* Share URL Modal */}
      {p.shareModalOpen && (
        <div
          data-wb-share-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 6000,
            background: "rgba(15, 23, 42, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) p.setShareModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chia sẻ bảng"
            style={{
              width: "min(460px, 100%)",
              background: "#ffffff",
              borderRadius: 14,
              padding: 18,
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              Chia sẻ liên kết phòng học
            </div>
            <input
              type="text"
              readOnly
              data-wb-share-url="true"
              data-testid="share-link"
              value={buildShareUrl(p.activeRoomId)}
              onClick={(e) => e.currentTarget.select()}
              style={{
                width: "100%",
                height: 36,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                color: "#0f172a",
                background: "#f8fafc",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(buildShareUrl(p.activeRoomId))
                    .catch(() => {});
                  p.setShareCopied(true);
                }}
                style={{
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {p.shareCopied ? "✓ Đã sao chép" : "📋 Sao chép liên kết"}
              </button>
              <button
                type="button"
                onClick={() => p.setShareModalOpen(false)}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette & Keyboard Shortcut Manager */}
      <CommandPaletteModal
        isOpen={p.commandPaletteOpen}
        onClose={() => p.setCommandPaletteOpen(false)}
        shortcutMap={p.shortcutMap}
        onShortcutMapChange={p.onChangeShortcutMap}
        onExecuteCommand={p.executeCommand}
        selectedCount={p.selectedElements.length}
      />

      {/* Board & Folder Manager Modal */}
      <BoardManagerModal
        open={p.boardManagerOpen}
        onClose={() => p.setBoardManagerOpen(false)}
        currentRoomId={p.activeRoomId}
        onInsertPdfIntoCurrentBoard={p.onInsertPdfPages}
        onSelectBoard={(newBoardId) => {
          if (newBoardId !== p.activeRoomId && typeof window !== "undefined") {
            try {
              window.localStorage.setItem("physboard_active_board", newBoardId);
            } catch {
              // Ignore storage error
            }
            const url = new URL(window.location.href);
            url.searchParams.set("room", newBoardId);
            window.location.href = url.toString();
          }
        }}
        onOpenSettings={() => p.openSettingsModal(undefined)}
      />
    </>
  );
};
