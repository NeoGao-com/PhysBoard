"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import {
  CanvasElement,
  WhiteboardTool,
  Style,
  StylePatch,
  SelectionStyleState,
  InkProps,
  TransformHandle,
  BoundingBox,
  SPenConfig,
  DEFAULT_SPEN_CONFIG,
} from "@/types/whiteboard";
import { useWindowOrientation } from "@/hooks/useWindowOrientation";
import { screenToWorld } from "@/lib/coordinates";
import {
  OneEuroFilter,
  generateCatmullRomSpline,
  generateFilledInkPath,
} from "@/lib/ink";
import { checkEraserCollision } from "@/lib/eraser";
import {
  getSavedDrawStyle,
  saveDrawStyle,
  getCompositeBoundingBox,
  calculateResizeFactors,
  testMarqueeIntersection,
  hydrateInlinePoints,
} from "@/lib/selection";
import {
  type EmbeddedVertex,
  type Point2D,
  type PointConstraint,
  type QuadPresetKind,
  type TrianglePresetKind,
  centroid2D,
  circumcenter2D,
  createSpecialQuadPreset,
  createSpecialTrianglePreset,
  dist2D,
  extractSelectionGeometry,
  findFloodFillRegion,
  footOfPerpendicular,
  getConstructMarksEnabled,
  setConstructMarksEnabled,
  getNextPointName,
  getNextPointNames,
  incenter2D,
  intersectLineCircleAt,
  intersectLines2D,
  midpoint2D,
  orthocenter2D,
  pointAtAngle,
  pointInPolygon2D,
  reflectPointOverLine,
  reflectPointOverPoint,
  resolveCircleRadius,
  resolveLineEndpoints,
  resolveLineGeometry,
  rotatePointAround,
  snapPointToObject,
  tangentPointToCircle,
  bisectorFoot2D,
  DEFAULT_DOT_SCALE,
  DEFAULT_LABEL_SCALE,
} from "@/lib/geometry";
import {
  type RecognizedShape,
  recognizeStrokeShape,
  recognizedShapeToPreviewPoints,
} from "@/lib/ink-recognizer";
import {
  type CameraMatrix3,
  type Solid3DKind,
  type Solid3DProps,
  type SolidSubSelection,
  azimuthElevationToCamera,
  buildSpatialConstructionElements,
  cameraToAzimuthElevation,
  computeFlattenedFace,
  computeUnfoldedPolyhedronNet,
  createOxyzElement,
  projectOxyzPoint,
  createPlaneParallelogramElements,
  createSolid3DElement,
  defaultCameraForSolid,
  extractPolyhedronEdges,
  liftSolidTo3D,
  orbitCamera,
  resolveSolidSubSelectionAtPoint,
  skewLineClosest,
  solveGeometry3D,
} from "@/lib/geometry3d";
import {
  buildSignTableFromExpr,
  buildVarTableFromExpr,
} from "@/lib/math-eval";
import {
  type ImportedImageResult,
  type ImportedPdfPage,
  importPdfPages,
  readImageFile,
} from "@/lib/pdf-import";
import {
  type RealWorldArtItem,
  recordRecentRealWorldId,
} from "@/lib/realworld-art";
import { buildShareUrl, sanitizeRoomId } from "@/lib/room";
import {
  downloadBlob,
  exportPDF,
  exportPNG,
} from "@/lib/export";
import {
  BOARD_FORMAT_OPTIONS,
  BOARD_PAGES_YMAP,
  type BoardFormatId,
  DEFAULT_PAGE_BOARD_CONFIG,
  type PageBoardConfig,
  adaptElementForBoard,
  adaptStrokeForBoard,
  applyBoardConfigToAllPages,
  readPageBoardConfig,
  resolveBoardColors,
  writePageBoardConfig,
} from "@/lib/board-themes";
import {
  getShortcutMap,
  matchCommandForKeyEvent,
  type ShortcutMap,
} from "@/lib/commands";
import { useCanvasNavigation } from "@/hooks/useCanvasNavigation";
import { useHistory } from "@/hooks/useHistory";
import { useWhiteboardSync } from "@/hooks/useWhiteboardSync";
import { SvgCanvas } from "./SvgCanvas";
import { Toolbar } from "./Toolbar";
import { CommandPaletteModal } from "./CommandPaletteModal";
import { SelectionBar } from "./SelectionBar";
import { SelectionOverlay } from "./SelectionOverlay";
import { PeerCursors } from "./PeerCursors";
import { TabLockOverlay } from "./TabLockOverlay";
import { OfflineBanner } from "./OfflineBanner";
import { OrbitBar } from "./OrbitBar";
import { MathEditor, ensureMathLiveRegistered } from "./MathEditor";
import { RealWorldDrawer } from "./RealWorldDrawer";
import { PhysicsDrawer } from "./PhysicsDrawer";
import { MathFormulasDrawer } from "./MathFormulasDrawer";
import { ChemistryFormulasDrawer } from "./ChemistryFormulasDrawer";
import { SimLauncherModal } from "./SimLauncherModal";
import { FullscreenSimOverlay } from "./FullscreenSimOverlay";
import type { ActiveSimSession } from "@/lib/sim-library";
import { CalculatorWidget } from "./CalculatorWidget";
import { ExportPdfModal } from "./ExportPdfModal";
import { BoardManagerModal } from "./BoardManagerModal";
import { retrievePendingPdfPages } from "@/lib/board-manager";
import {
  addYjsPage,
  deleteYjsPages,
  setYjsCurrentPage,
  useYjsPages,
} from "./PageBar";
import { PageSidebar } from "./PageSidebar";
import { PageManagerModal } from "./PageManagerModal";
import {
  AxesPointDialog,
  AxesVectorDialog,
  Axes3DPointDialog,
  Axes3DVectorDialog,
  Axes3DFigureDialog,
  Axes3DFigureKind,
  BayesConfigDialog,
  ChartConfigDialog,
  ConicConfigDialog,
  Curve2DConfigDialog,
  Curve2DDialogMode,
  M3MenuAction,
  NumberLineConfigDialog,
  PlotConfigDialog,
  VarTableConfigDialog,
} from "./FunctionsAndStatsMenus";
import { InkElement } from "./elements/InkElement";
import { PointElement } from "./elements/PointElement";
import { SegmentElement } from "./elements/SegmentElement";
import { CircleElement } from "./elements/CircleElement";
import { PolygonElement } from "./elements/PolygonElement";
import { GeometryConstructionElement } from "./elements/GeometryConstructionElement";
import { Solid3DElement } from "./elements/Solid3DElement";
import { LaserSettingsModal } from "./LaserSettingsModal";
import { SettingsModal } from "./SettingsModal";
import { InstructionGuideBar } from "./InstructionGuideBar";
import { getToolGuide } from "@/lib/tool-guides";
import {
  ToolbarVisibilityConfig,
  loadToolbarVisibilityConfig,
  saveToolbarVisibilityConfig,
} from "@/lib/toolbar-config";
import {
  ModularLayoutConfig,
  loadModularLayoutConfig,
  saveModularLayoutConfig,
} from "@/lib/modular-toolbar";
import {
  LaserConfig,
  DEFAULT_LASER_CONFIG,
  loadLaserConfig,
  saveLaserConfig,
} from "@/lib/laser-config";
import {
  ImageElement,
  MathElement,
  TableElement,
} from "./elements/MathElement";
import {
  AxesElement,
  AxesResizeSide,
  getAxesBounds,
} from "./elements/AxesElement";
import {
  ConicElement,
  Curve2DElement,
  GraphAreaElement,
  GraphTangentElement,
  PlotElement,
  SliderElement,
} from "./elements/PlotElement";
import { VarTableElement } from "./elements/VarTableElement";
import { TrigCircleElement } from "./elements/TrigCircleElement";
import {
  ChartElement,
  CountingElement,
  NetworkElement,
  NumberLineElement,
  TreeDiagramElement,
  TreeNode,
  VennElement,
} from "./elements/StatsElements";
import {
  LineDecorElement,
  RealObjectElement,
} from "./elements/RealObjectElement";
import {
  EquationSolverModal,
} from "./EquationSolverModal";
import {
  solveEquationOrSystem,
  type EquationSolution,
} from "@/lib/equation-solver";

export interface WhiteboardProps {
  roomId?: string;
  initialRoomId?: string;
  onGoHome?: () => void;
}

const SOLID_TOOL_SPECS: Record<
  string,
  { kind: Solid3DKind; sides?: number }
> = {
  "p3:box": { kind: "box" },
  "p3:cube": { kind: "cube" },
  "p3:prism:3": { kind: "prism", sides: 3 },
  "p3:prism:5": { kind: "prism", sides: 5 },
  "p3:prism:6": { kind: "prism", sides: 6 },
  "p3:pyramid:3": { kind: "pyramid", sides: 3 },
  "p3:pyramid:4": { kind: "pyramid", sides: 4 },
  "p3:pyramid:5": { kind: "pyramid", sides: 5 },
  "p3:pyramid:6": { kind: "pyramid", sides: 6 },
  "p3:frustum:3": { kind: "frustum", sides: 3 },
  "p3:frustum:4": { kind: "frustum", sides: 4 },
  "p3:frustum:6": { kind: "frustum", sides: 6 },
  "p3:cylinder": { kind: "cylinder" },
  "p3:cone": { kind: "cone" },
  "p3:sphere": { kind: "sphere" },
};

const TRIANGLE_TOOL_KINDS: Record<string, TrianglePresetKind> = {
  "c:triRight": "right",
  "c:triRightIso": "rightIsosceles",
  "c:triIso": "isosceles",
  "c:triEqui": "equilateral",
};

const QUAD_TOOL_KINDS: Record<string, QuadPresetKind> = {
  "c:pgram": "parallelogram",
  "c:rhombus": "rhombus",
  "c:rect": "rectangle",
  "c:square": "square",
};

const SEGMENT_LIKE_TOOLS = new Set([
  "segment",
  "c:segment",
  "c:dseg",
  "c:line",
  "c:ray",
  "c:vector",
]);

function normalizeToolId(tool: WhiteboardTool): WhiteboardTool {
  if (tool === "geometry.point") return "point";
  if (tool === "text.write") return "formula";
  if (tool === "c:circle") return "circle";
  if (tool === "c:polygon") return "polygon";
  if (tool === "segment") return "c:segment";
  return tool;
}

function resolvePenNib(tool: WhiteboardTool): InkProps["nib"] | null {
  switch (tool) {
    case "ink":
      return undefined;
    case "ink:fountain":
      return "fountain";
    case "ink:pencil":
      return "pencil";
    case "ink:highlighter":
      return "highlighter";
    case "ink:brush":
      return "brush";
    case "ink:dashed":
      return "dashed";
    case "ink:laser":
      return "laser";
    default:
      return null;
  }
}

const PEN_ONLY_MODE_STORAGE_KEY = "physboard_pen_only_mode";
const INK_TO_SHAPE_STORAGE_KEY = "physboard_ink_to_shape";
const SPEN_CONFIG_STORAGE_KEY = "physboard_spen_config";

function isPenTool(tool: WhiteboardTool): boolean {
  return resolvePenNib(tool) !== null;
}

function getA4PageAtPoint(
  worldPos: Point2D,
  totalPages: number,
  pageW: number,
  pageH: number,
  pageGap = 0.8
): number | null {
  const hw = pageW / 2;
  if (worldPos.x < -hw || worldPos.x > hw) return null;
  const ySvg = -worldPos.y;
  if (ySvg < 0) return null;
  const pageStep = pageH + pageGap;
  const p = Math.floor(ySvg / pageStep) + 1;
  if (p < 1 || p > totalPages) return null;
  const pageTop = (p - 1) * pageStep;
  const pageBottom = pageTop + pageH;
  if (ySvg >= pageTop && ySvg <= pageBottom) {
    return p;
  }
  return null;
}

function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "math-field") {
    return true;
  }
  if ((el as HTMLElement).isContentEditable) return true;
  return Boolean(el.closest("math-field, [data-wb-inplace], [contenteditable='true']"));
}

function distToSeg(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function newElId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function Whiteboard({ roomId, initialRoomId, onGoHome }: WhiteboardProps) {
  const activeRoomId = sanitizeRoomId(roomId ?? initialRoomId ?? "default");

  // 1. Real-Time Sync, Awareness, Single-Tab Lock & Yjs Pages
  const {
    doc,
    dispatcher,
    isConnected,
    isTabLocked,
    releaseTabLock,
    peerCursors,
    peerCount,
    updateLocalCursor,
  } = useWhiteboardSync(activeRoomId);

  const pageState = useYjsPages(doc);
  const currentPage = pageState.current;
  const pageCount = pageState.count;

  const [elements, setElements] = useState<CanvasElement[]>(() =>
    dispatcher.getElements(0)
  );

  useEffect(() => {
    void ensureMathLiveRegistered();
  }, []);

  useEffect(() => {
    const update = () => setElements(dispatcher.getElements(0));
    update();
    const unsub = dispatcher.subscribe(update);
    return () => unsub();
  }, [dispatcher]);

  useEffect(() => {
    dispatcher.setPage(currentPage);
  }, [dispatcher, currentPage]);

  const [boardTick, setBoardTick] = useState(0);
  useEffect(() => {
    const map = doc.getMap<unknown>(BOARD_PAGES_YMAP);
    const onBoardChange = () => setBoardTick((t) => t + 1);
    map.observe(onBoardChange);
    return () => map.unobserve(onBoardChange);
  }, [doc]);

  const currentBoardConfig = useMemo(
    () => {
      void boardTick;
      return readPageBoardConfig(doc, currentPage);
    },
    [doc, currentPage, boardTick]
  );
  const currentBoardTheme = useMemo(
    () => resolveBoardColors(currentBoardConfig),
    [currentBoardConfig]
  );

  // 2. Tool, Style & Global Display State
  const [activeTool, setActiveTool] = useState<WhiteboardTool>("ink");
  const [currentStyle, setCurrentStyle] = useState<Style>(() => {
    const saved = getSavedDrawStyle();
    return {
      stroke: saved.stroke ?? "#111827",
      width: saved.width ?? 2,
      dash: saved.dash ?? false,
    };
  });
  const [fillColor, setFillColor] = useState<string>("#1565C0");
  const [labelScale, setLabelScale] = useState<number>(DEFAULT_LABEL_SCALE);
  const [dotScale, setDotScale] = useState<number>(DEFAULT_DOT_SCALE);
  const [, setConstructMarksTick] = useState<number>(0);
  const [gridEnabled, setGridEnabled] = useState<boolean>(true);
  const [penOnlyMode, setPenOnlyMode] = useState<boolean>(false);
  const [inkToShape, setInkToShape] = useState<boolean>(true);
  const [spenConfig, setSpenConfig] = useState<SPenConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(SPEN_CONFIG_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...DEFAULT_SPEN_CONFIG, ...parsed };
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_SPEN_CONFIG;
  });
  const spenPreviousToolRef = useRef<WhiteboardTool | null>(null);
  const spenActiveOverrideRef = useRef<boolean>(false);
  const [autoSwitchTarget, setAutoSwitchTarget] = useState<"select" | "ink" | "off">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("physboard_auto_switch_target");
      if (saved === "select" || saved === "ink" || saved === "off") return saved;
    }
    return "select";
  });

  const previousToolBeforeEraserRef = useRef<WhiteboardTool>("ink");
  const eraserDidEraseRef = useRef<boolean>(false);

  const handleToggleAutoSwitchTarget = useCallback(() => {
    setAutoSwitchTarget((prev) => {
      const next = prev === "select" ? "ink" : prev === "ink" ? "off" : "select";
      if (typeof window !== "undefined") {
        localStorage.setItem("physboard_auto_switch_target", next);
      }
      return next;
    });
  }, []);

  const resetToolAfterCreation = useCallback(() => {
    if (autoSwitchTarget === "off") return;
    setActiveTool(autoSwitchTarget === "ink" ? "ink" : "select");
  }, [autoSwitchTarget]);

  const resetToolAfterEraser = useCallback(() => {
    if (autoSwitchTarget === "off") return;
    const prev = previousToolBeforeEraserRef.current;
    if (autoSwitchTarget === "ink") {
      setActiveTool(prev && prev !== "erase" ? prev : "ink");
    } else {
      setActiveTool("select");
    }
  }, [autoSwitchTarget]);

  // Dedicated laser pointer ephemeral strokes (not in Yjs, decaying over time)
  const [laserStrokes, setLaserStrokes] = useState<
    Array<{ id: string; points: number[]; createdAt: number; color?: string; width?: number }>
  >([]);
  const [laserConfig, setLaserConfig] = useState<LaserConfig>(() => loadLaserConfig());
  const [laserSettingsOpen, setLaserSettingsOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [toolbarConfig, setToolbarConfig] = useState<ToolbarVisibilityConfig>(() => loadToolbarVisibilityConfig());
  const [modularConfig, setModularConfig] = useState<ModularLayoutConfig>(() => loadModularLayoutConfig());

  const handleUpdateModularConfig = useCallback((cfg: ModularLayoutConfig) => {
    setModularConfig(cfg);
    saveModularLayoutConfig(cfg);
  }, []);

  const handleUpdateToolbarConfig = useCallback((cfg: ToolbarVisibilityConfig) => {
    setToolbarConfig(cfg);
    saveToolbarVisibilityConfig(cfg);
  }, []);
  const [liveLaserScreenPos, setLiveLaserScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isLaserPressed, setIsLaserPressed] = useState(false);

  useEffect(() => {
    if (activeTool !== "ink:laser") {
      setLiveLaserScreenPos(null);
      setIsLaserPressed(false);
    }
  }, [activeTool]);

  const handleUpdateLaserConfig = useCallback((newCfg: LaserConfig) => {
    setLaserConfig(newCfg);
    saveLaserConfig(newCfg);
  }, []);

  useEffect(() => {
    if (laserStrokes.length === 0) return;
    const interval = setInterval(() => {
      const now = performance.now();
      setLaserStrokes((prev) => prev.filter((s) => now - s.createdAt < 1500));
    }, 16);
    return () => clearInterval(interval);
  }, [laserStrokes.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedPenOnly = window.localStorage.getItem(PEN_ONLY_MODE_STORAGE_KEY);
      if (savedPenOnly !== null) {
        setPenOnlyMode(savedPenOnly === "true");
      }
      const savedInkShape = window.localStorage.getItem(INK_TO_SHAPE_STORAGE_KEY);
      if (savedInkShape !== null) {
        setInkToShape(savedInkShape === "true");
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleToggleInkToShape = useCallback((enabled: boolean) => {
    setInkToShape(enabled);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(INK_TO_SHAPE_STORAGE_KEY, enabled ? "true" : "false");
      } catch {
        // ignore
      }
    }
  }, []);
  const handleTogglePenOnly = useCallback((enabled: boolean) => {
    setPenOnlyMode(enabled);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PEN_ONLY_MODE_STORAGE_KEY, enabled ? "true" : "false");
      } catch {
        // ignore
      }
    }
  }, []);

  const handleUpdateSPenConfig = useCallback((cfg: SPenConfig) => {
    setSpenConfig(cfg);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SPEN_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
      } catch {
        // ignore
      }
    }
  }, []);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [guideEnabled, setGuideEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = window.localStorage.getItem("physboard_instruction_guide_enabled");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleGuide = useCallback(() => {
    setGuideEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("physboard_instruction_guide_enabled", JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const [shortcutMap, setShortcutMap] = useState<ShortcutMap>(() =>
    getShortcutMap()
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // 3. Selection & Clipboard State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [solidSubSel, setSolidSubSel] = useState<SolidSubSelection | null>(null);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 4. Interactive Workflow Modals, Drawers & Overlays
  const [mathSession, setMathSession] = useState<{
    elementId?: string;
    worldPos: Point2D;
    initialLatex: string;
  } | null>(null);
  const [equationSolution, setEquationSolution] = useState<EquationSolution | null>(null);
  const [equationModalOpen, setEquationModalOpen] = useState(false);
  const [plotDialogOpen, setPlotDialogOpen] = useState(false);
  const [pointRenameSession, setPointRenameSession] = useState<{
    items: Array<{ id: string; originalName: string; draftName: string }>;
  } | null>(null);
  const [axesPointDialogOpen, setAxesPointDialogOpen] = useState(false);
  const [axesVectorDialogOpen, setAxesVectorDialogOpen] = useState(false);
  const [axes3DPointDialogOpen, setAxes3DPointDialogOpen] = useState(false);
  const [axes3DVectorDialogOpen, setAxes3DVectorDialogOpen] = useState(false);
  const [axes3DFigureDialogKind, setAxes3DFigureDialogKind] =
    useState<Axes3DFigureKind | null>(null);
  const [curve2dDialogMode, setCurve2dDialogMode] =
    useState<Curve2DDialogMode | null>(null);
  const [conicDialogKind, setConicDialogKind] = useState<
    "ellipse" | "parabola" | "hyperbola" | null
  >(null);
  const [varTableDialogMode, setVarTableDialogMode] = useState<
    "variation" | "sign" | null
  >(null);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [bayesDialogOpen, setBayesDialogOpen] = useState(false);
  const [numberLineDialogOpen, setNumberLineDialogOpen] = useState(false);
  const [realWorldDrawerOpen, setRealWorldDrawerOpen] = useState(false);
  const [physicsDrawerOpen, setPhysicsDrawerOpen] = useState(false);
  const [mathDrawerOpen, setMathDrawerOpen] = useState(false);
  const [chemistryDrawerOpen, setChemistryDrawerOpen] = useState(false);
  const [simLauncherOpen, setSimLauncherOpen] = useState(false);
  const [activeSim, setActiveSim] = useState<ActiveSimSession | null>(null);
  const [simMinimized, setSimMinimized] = useState(false);
  const activeSimBlobUrlRef = useRef<string | null>(null);

  const handleLaunchSimSession = useCallback((nextSession: ActiveSimSession) => {
    if (activeSimBlobUrlRef.current && activeSimBlobUrlRef.current !== nextSession.iframeSrc) {
      URL.revokeObjectURL(activeSimBlobUrlRef.current);
      activeSimBlobUrlRef.current = null;
    }
    if (nextSession.isBlobUrl) {
      activeSimBlobUrlRef.current = nextSession.iframeSrc;
    }
    setActiveSim(nextSession);
    setSimMinimized(false);
  }, []);

  const handleCloseSimSession = useCallback(() => {
    if (activeSimBlobUrlRef.current) {
      URL.revokeObjectURL(activeSimBlobUrlRef.current);
      activeSimBlobUrlRef.current = null;
    }
    setActiveSim(null);
    setSimMinimized(false);
  }, []);

  useEffect(() => {
    return () => {
      if (activeSimBlobUrlRef.current) {
        URL.revokeObjectURL(activeSimBlobUrlRef.current);
        activeSimBlobUrlRef.current = null;
      }
    };
  }, []);

  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [exportPdfModalOpen, setExportPdfModalOpen] = useState(false);
  const isPortrait = useWindowOrientation();
  const [pageSidebarOpen, setPageSidebarOpen] = useState(true);

  // Automatically collapse sidebar when screen orientation is portrait to preserve max drawing width
  useEffect(() => {
    if (isPortrait) {
      setPageSidebarOpen(false);
    }
  }, [isPortrait]);
  const [pageManagerOpen, setPageManagerOpen] = useState(false);
  const [boardManagerOpen, setBoardManagerOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [fillNamesInput, setFillNamesInput] = useState("");
  const [angleDialog, setAngleDialog] = useState<{
    vertexId: string;
    armId: string;
    vertexPos: Point2D;
    armPos: Point2D;
  } | null>(null);
  const [angleDegInput, setAngleDegInput] = useState("60");

  // 3D Orbit Bar State
  const [orbitActiveId, setOrbitActiveId] = useState<string | null>(null);
  const [orbitCamById, setOrbitCamById] = useState<
    Record<string, CameraMatrix3>
  >({});
  const [isAutoSpin, setIsAutoSpin] = useState(false);

  // 5. Gesture & Multi-Click Drafting Refs
  const liveStrokePointsRef = useRef<number[]>([]);
  const liveStrokePressuresRef = useRef<number[]>([]);
  const liveStrokeTipRef = useRef<{
    x: number;
    y: number;
    pressure: number;
  } | null>(null);
  const filterXRef = useRef(new OneEuroFilter(2.0, 0.35, 1.0));
  const filterYRef = useRef(new OneEuroFilter(2.0, 0.35, 1.0));
  const liveStrokeRafRef = useRef<number | null>(null);
  const liveStrokePathRef = useRef<SVGPathElement | null>(null);
  const liveStrokeStyleRef = useRef<Style | undefined>(undefined);
  const liveStrokeNibRef = useRef<InkProps["nib"] | undefined>(undefined);
  const liveStrokeSnappedRef = useRef<RecognizedShape | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInkSnapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastInkSnap, setLastInkSnap] = useState<{
    elementId: string;
    shapeType: RecognizedShape["type"];
    rawPoints: number[];
    rawPressures: number[];
    nib?: InkProps["nib"];
    style: Style;
    page: number;
    center?: Point2D;
    rx?: number;
    ry?: number;
    rotation?: number;
  } | null>(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const [liveStroke, setLiveStroke] = useState<{
    points: number[];
    pressures?: number[];
    nib?: InkProps["nib"];
    style: Style;
  } | null>(null);

  const marqueeRectRef = useRef<{
    sx: number;
    sy: number;
    x: number;
    y: number;
  } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{
    sx: number;
    sy: number;
    x: number;
    y: number;
  } | null>(null);

  const dragBoxStartRef = useRef<{
    startX: number;
    startY: number;
    initialTransforms: Map<string, { x: number; y: number }>;
  } | null>(null);

  const resizeStartRef = useRef<{
    handle: TransformHandle;
    initHandlePos: { x: number; y: number };
    initialElements: CanvasElement[];
  } | null>(null);

  const axesResizeRef = useRef<{
    id: string;
    side: AxesResizeSide;
    element: CanvasElement;
  } | null>(null);

  const labelDragRef = useRef<{
    id: string;
    startWorld: Point2D;
    initDx: number;
    initDy: number;
    element: CanvasElement;
  } | null>(null);

  // Two-click / drag geometry preview
  const draftTwoPtRef = useRef<{
    tool: string;
    start: Point2D;
    startId?: string;
    dragging: boolean;
  } | null>(null);
  const [draftPreviewLine, setDraftPreviewLine] = useState<{
    from: Point2D;
    to: Point2D;
    kind: string;
  } | null>(null);
  const [draftPolygonPts, setDraftPolygonPts] = useState<Point2D[]>([]);

  // Multi-pick state for 2D/3D constructions
  const [pickedItems, setPickedItems] = useState<
    Array<{
      kind: "point" | "segment" | "circle" | "solidFace";
      id?: string;
      pos: Point2D;
      segA?: Point2D;
      segB?: Point2D;
      segAId?: string;
      segBId?: string;
      polygonId?: string;
      faceIds?: string[];
    }>
  >([]);

  // Navigation Hook
  const isA4Format =
    currentBoardConfig?.format === "a4_portrait" ||
    currentBoardConfig?.format === "a4_landscape";
  const a4Opt = isA4Format
    ? BOARD_FORMAT_OPTIONS.find((f) => f.id === currentBoardConfig?.format)
    : null;

  const handleAddPageRef = useRef<() => void>(() => {});

  const {
    viewport,
    containerRef,
    isPanning,
    isSpacePressed,
    cursorWorld,
    isFitLocked,
    toggleFitLock,
    overscrollState,
    handlePointerDown: navPointerDown,
    handlePointerMove: navPointerMove,
    handlePointerUp: navPointerUp,
    handlePointerCancel: navPointerCancel,
    handlePointerLeave: navPointerLeave,
    zoomIn,
    zoomOut,
    resetView,
    scrollToPage,
  } = useCanvasNavigation({
    currentTool: activeTool,
    isA4: isA4Format,
    isSidebarOpen: pageSidebarOpen,
    totalPages: pageCount,
    pageWidthWorld: a4Opt?.widthWorld,
    pageHeightWorld: a4Opt?.heightWorld,
    pageGapWorld: 0.8,
    penOnlyMode,
    onCursorMove: updateLocalCursor,
    onPageChange: (p) => {
      if (p !== currentPage) {
        setYjsCurrentPage(doc, p);
      }
    },
    onOverscrollAddPage: () => handleAddPageRef.current?.(),
    enableOverscrollAddPage: true,
  });

  // Track which A4 page is being drawn on
  const activeDrawPageRef = useRef<number>(1);

  // Undo / Redo Hook
  const { canUndo, canRedo, undo, redo } = useHistory(dispatcher);

  // Page-filtered elements: in continuous A4 mode, all pages are visible together
  const pageElements = useMemo(
    () =>
      elements.filter(
        (el) => isA4Format || (el.meta.page ?? 1) === currentPage
      ),
    [elements, currentPage, isA4Format]
  );

  const hiddenCount = useMemo(
    () => pageElements.filter((el) => el.style?.hidden).length,
    [pageElements]
  );

  const lockedElements = useMemo(
    () =>
      pageElements.filter(
        (el) => !el.style?.hidden && (el.props?.locked || el.style?.locked)
      ),
    [pageElements]
  );

  const [hoveredLockedId, setHoveredLockedId] = useState<string | null>(null);

  const selectedElements = useMemo(
    () =>
      pageElements.filter(
        (el) =>
          selectedIds.includes(el.id) &&
          !el.style?.hidden &&
          !el.props?.locked &&
          !el.style?.locked
      ),
    [pageElements, selectedIds]
  );

  const activeGuideInfo = useMemo(() => {
    const selInfo =
      selectedElements.length > 0
        ? {
            count: selectedElements.length,
            type: selectedElements.length === 1 ? selectedElements[0].type : undefined,
            label:
              selectedElements.length === 1 && selectedElements[0].type === "GeomPoint"
                ? ((selectedElements[0].props as Record<string, unknown>)?.label as string)
                : undefined,
          }
        : null;

    return getToolGuide(activeTool, statusHint, selInfo);
  }, [activeTool, statusHint, selectedElements]);

  const selectedAxes2D = useMemo(
    () =>
      selectedElements.length === 1 && selectedElements[0].type === "Axes2D"
        ? selectedElements[0]
        : null,
    [selectedElements]
  );

  const selectedPoints = useMemo(
    () =>
      selectedElements.filter(
        (el) => el.type === "Point" || el.type === "GeomPoint"
      ),
    [selectedElements]
  );

  const activeSolidSubPart = useMemo(() => {
    if (
      !solidSubSel ||
      selectedElements.length !== 1 ||
      selectedElements[0].type !== "Solid3D" ||
      selectedElements[0].id !== solidSubSel.solidId
    ) {
      return null;
    }
    return solidSubSel;
  }, [solidSubSel, selectedElements]);

  const selectionBBox: BoundingBox | null = useMemo(
    () =>
      getCompositeBoundingBox(selectedElements, pageElements, viewport.scale),
    [selectedElements, pageElements, viewport.scale]
  );

  // Solved 2D + 3D Scene + Hydrated inline points
  const byId = useMemo(
    () => new Map(pageElements.map((el) => [el.id, el])),
    [pageElements]
  );

  const solved3D = useMemo(
    () => solveGeometry3D(pageElements, orbitCamById),
    [pageElements, orbitCamById]
  );

  const hydratedPts = useMemo(
    () => hydrateInlinePoints(pageElements, solved3D.pts),
    [pageElements, solved3D.pts]
  );

  const hoveredLockedBox = useMemo(() => {
    if (!hoveredLockedId) return null;
    const target = byId.get(hoveredLockedId);
    if (!target) return null;
    return getCompositeBoundingBox([target], pageElements, viewport.scale);
  }, [hoveredLockedId, byId, pageElements, viewport.scale]);

  // View center in math world coordinates
  const getViewCenter = useCallback((): Point2D => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 640;
    const cy = rect ? rect.top + rect.height / 2 : 400;
    return screenToWorld(
      cx,
      cy,
      viewport.tx,
      viewport.ty,
      viewport.scale,
      rect
    );
  }, [containerRef, viewport]);

  // Apply selection-aware 2D/3D constructions immediately when valid geometry is already selected
  const tryApplyConstructionFromSelection = useCallback(
    (tool: string): boolean => {
      if (selectedElements.length === 0) return false;
      const selGeom = extractSelectionGeometry(selectedElements, hydratedPts, byId);

      // 1. Triangle centers & circles (Centroid G, Orthocenter H, Circumcircle, Incircle)
      if (
        tool === "c:centroid" ||
        tool === "c:ortho" ||
        tool === "c:circum" ||
        tool === "c:incircle"
      ) {
        if (!selGeom.triangle) return false;
        const { pts, vertexIds } = selGeom.triangle;
        const [a, b, c] = pts;

        if (
          tool === "c:centroid" &&
          vertexIds[0] &&
          vertexIds[1] &&
          vertexIds[2] &&
          solved3D.owner.has(vertexIds[0])
        ) {
          const built = buildSpatialConstructionElements(
            "c:centroid",
            [vertexIds[0], vertexIds[1], vertexIds[2]],
            pageElements,
            solved3D
          );
          const createdIds: string[] = [];
          dispatcher.batch(() => {
            for (const el of built.elements) {
              const res = dispatcher.dispatch({
                type: "object.create",
                params: {
                  id: el.id,
                  type: el.type,
                  transform: el.transform,
                  style: el.style,
                  props: el.props,
                },
              });
              if (res.created?.[0]) createdIds.push(res.created[0]);
            }
          });
          if (createdIds.length > 0) setSelectedIds(createdIds);
          return true;
        }

        const center =
          tool === "c:centroid"
            ? centroid2D(a, b, c)
            : tool === "c:ortho"
              ? orthocenter2D(a, b, c)
              : tool === "c:circum"
                ? circumcenter2D(a, b, c)
                : incenter2D(a, b, c);
        if (!center) return false;

        const baseLetter =
          tool === "c:centroid"
            ? "G"
            : tool === "c:ortho"
              ? "H"
              : tool === "c:circum"
                ? "O"
                : "I";
        const ptName = getNextPointName(pageElements, [baseLetter, "K", "P", "Q"]);
        const ptId = newElId("pt");

        dispatcher.batch(() => {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id: ptId,
              type: "GeomPoint",
              transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
              props: { name: ptName, constraint: { kind: "free" } },
            },
          });

          if (tool === "c:circum" || tool === "c:incircle") {
            const foot = tool === "c:incircle" ? footOfPerpendicular(center, a, b) : null;
            const r =
              tool === "c:circum"
                ? dist2D(center, a)
                : foot
                  ? dist2D(center, foot)
                  : 1;
            dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomCircle",
                style: { stroke: "#0891b2", width: 2 },
                props: { center: ptId, radius: { kind: "value", v: r } },
              },
            });
          }
        });

        return true;
      }

      // 2. Altitude / Median / Bisector (on selected triangle OR selected point + segment)
      if (tool === "c:altitude" || tool === "c:median" || tool === "c:bisector") {
        const kind =
          tool === "c:altitude"
            ? "altitude"
            : tool === "c:median"
              ? "median"
              : "bisector";
        const defaultName =
          tool === "c:altitude" ? "H" : tool === "c:median" ? "M" : "D";

        let vertexPt: Point2D | null = null;
        let vertexId: string | undefined;
        let sideA: Point2D | null = null;
        let sideB: Point2D | null = null;
        let sideAId: string | undefined;
        let sideBId: string | undefined;

        if (selGeom.point && selGeom.segment) {
          vertexPt = selGeom.point.pos;
          vertexId = selGeom.point.elementId;
          sideA = selGeom.segment.a;
          sideB = selGeom.segment.b;
          sideAId = selGeom.segment.aId;
          sideBId = selGeom.segment.bId;
        } else if (selGeom.triangle) {
          const { pts, vertexIds, rightAngleIndex } = selGeom.triangle;
          const vIdx = rightAngleIndex ?? 0;
          const i1 = (vIdx + 1) % 3;
          const i2 = (vIdx + 2) % 3;
          vertexPt = pts[vIdx];
          vertexId = vertexIds[vIdx];
          sideA = pts[i1];
          sideB = pts[i2];
          sideAId = vertexIds[i1];
          sideBId = vertexIds[i2];
        }

        if (vertexPt && sideA && sideB) {
          const foot =
            kind === "altitude"
              ? footOfPerpendicular(vertexPt, sideA, sideB)
              : kind === "median"
                ? midpoint2D(sideA, sideB)
                : bisectorFoot2D(vertexPt, sideA, sideB);
          if (foot) {
            const label = getNextPointName(pageElements, [
              defaultName,
              "K",
              "I",
              "E",
              "F",
            ]);
            dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomConstruction",
                style: {
                  stroke:
                    kind === "altitude"
                      ? "#dc2626"
                      : kind === "median"
                        ? "#16a34a"
                        : "#2563eb",
                  width: 2,
                },
                props: {
                  kind,
                  fromPt: vertexPt,
                  toPt: foot,
                  sideAPt: sideA,
                  sideBPt: sideB,
                  ...(vertexId ? { from: vertexId } : {}),
                  ...(sideAId ? { sideA: sideAId } : {}),
                  ...(sideBId ? { sideB: sideBId } : {}),
                  label,
                },
              },
            });
            return true;
          }
        }
        return false;
      }

      // 3. Midpoint / Perpendicular Bisector (on selected segment or 2 points)
      if (tool === "c:midpoint" || tool === "c:perpbis") {
        let pA: Point2D | null = null;
        let pB: Point2D | null = null;
        let aId: string | undefined;
        let bId: string | undefined;

        if (selGeom.segment && selGeom.segments.length === 1 && selGeom.points.length === 0) {
          pA = selGeom.segment.a;
          pB = selGeom.segment.b;
          aId = selGeom.segment.aId;
          bId = selGeom.segment.bId;
        } else if (selGeom.points.length === 2 && selGeom.segments.length === 0) {
          pA = selGeom.points[0].pos;
          pB = selGeom.points[1].pos;
          aId = selGeom.points[0].elementId;
          bId = selGeom.points[1].elementId;
        }

        if (pA && pB) {
          const mid = midpoint2D(pA, pB);
          if (tool === "c:midpoint") {
            const name = getNextPointName(pageElements, ["M", "N", "P", "Q"]);
            const res = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomPoint",
                transform: { x: mid.x, y: mid.y, scale: 1, rotation: 0, z: 0 },
                props: {
                  name,
                  constraint:
                    aId &&
                    bId &&
                    (byId.has(aId) || solved3D.owner.has(aId)) &&
                    (byId.has(bId) || solved3D.owner.has(bId))
                      ? { kind: "midpointOf", a: aId, b: bId }
                      : { kind: "free" },
                },
              },
            });
            if (res.created?.[0]) setSelectedIds([res.created[0]]);
          } else {
            const dx = pB.x - pA.x;
            const dy = pB.y - pA.y;
            const len = Math.hypot(dx, dy) || 1;
            const span = Math.max(1.2, Math.min(len * 0.65, 5.5));
            const nx = -dy / len;
            const ny = dx / len;
            const res = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomConstruction",
                props: {
                  kind: "perpBisector",
                  ...(aId && bId ? { sideA: aId, sideB: bId } : {}),
                  fromPt: { x: mid.x - nx * span, y: mid.y - ny * span },
                  toPt: { x: mid.x + nx * span, y: mid.y + ny * span },
                  sideAPt: pA,
                  sideBPt: pB,
                },
              },
            });
            if (res.created?.[0]) setSelectedIds([res.created[0]]);
          }
          return true;
        }
        return false;
      }

      // 4. Perpendicular / Parallel through selected Point + Segment
      if (tool === "c:perp" || tool === "c:parallel" || tool === "c:perp3d") {
        if (selGeom.point && selGeom.segment) {
          const ptId = selGeom.point.elementId;
          const aId = selGeom.segment.aId;
          const bId = selGeom.segment.bId;
          const p3P = ptId ? solved3D.p3.get(ptId) : undefined;
          const p3A = aId ? solved3D.p3.get(aId) : undefined;
          const p3B = bId ? solved3D.p3.get(bId) : undefined;
          if (tool === "c:perp3d" && ptId && aId && bId && p3P && p3A && p3B) {
            const dx3 = p3B.x - p3A.x;
            const dy3 = p3B.y - p3A.y;
            const dz3 = p3B.z - p3A.z;
            const lenSq3 = dx3 * dx3 + dy3 * dy3 + dz3 * dz3;
            if (lenSq3 > 1e-9) {
              const t =
                ((p3P.x - p3A.x) * dx3 +
                  (p3P.y - p3A.y) * dy3 +
                  (p3P.z - p3A.z) * dz3) /
                lenSq3;
              const foot2D = {
                x: selGeom.segment.a.x + t * (selGeom.segment.b.x - selGeom.segment.a.x),
                y: selGeom.segment.a.y + t * (selGeom.segment.b.y - selGeom.segment.a.y),
              };
              const footId = newElId("pt");
              const footName = getNextPointName(pageElements, ["H", "K", "M", "N"]);
              const created: string[] = [];
              dispatcher.batch(() => {
                const rPt = dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: footId,
                    type: "GeomPoint",
                    transform: { x: foot2D.x, y: foot2D.y, scale: 1, rotation: 0, z: 0 },
                    props: {
                      name: footName,
                      constraint: { kind: "foot", p: ptId, a: aId, b: bId },
                    },
                  },
                });
                if (rPt.created?.[0]) created.push(rPt.created[0]);
                const rSeg = dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    type: "GeomSegment",
                    style: { stroke: "#0f766e", width: 2, dash: true },
                    props: { from: ptId, to: footId },
                  },
                });
                if (rSeg.created?.[0]) created.push(rSeg.created[0]);
              });
              if (created.length > 0) setSelectedIds(created);
              return true;
            }
          }
          const dx = selGeom.segment.b.x - selGeom.segment.a.x;
          const dy = selGeom.segment.b.y - selGeom.segment.a.y;
          const isPerp = tool === "c:perp" || tool === "c:perp3d";
          const vx = isPerp ? -dy : dx;
          const vy = isPerp ? dx : dy;
          const pt = selGeom.point.pos;
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomConstruction",
              props: {
                kind: isPerp ? "perp" : "parallel",
                ...(ptId && aId && bId ? { from: ptId, sideA: aId, sideB: bId } : {}),
                fromPt: { x: pt.x - vx * 0.7, y: pt.y - vy * 0.7 },
                toPt: { x: pt.x + vx * 0.7, y: pt.y + vy * 0.7 },
                sideAPt: selGeom.segment.a,
                sideBPt: selGeom.segment.b,
              },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          return true;
        }
        return false;
      }

      // 5. Intersection of 2 selected lines / 1 line + 1 circle
      if (tool === "c:intersect") {
        let inter: Point2D | null = null;
        let constraint: PointConstraint = { kind: "free" };
        if (selGeom.segments.length === 2) {
          const [s1, s2] = selGeom.segments;
          inter = intersectLines2D(
            { px: s1.a.x, py: s1.a.y, dx: s1.b.x - s1.a.x, dy: s1.b.y - s1.a.y },
            { px: s2.a.x, py: s2.a.y, dx: s2.b.x - s2.a.x, dy: s2.b.y - s2.a.y }
          );
          if (byId.has(s1.elementId) && byId.has(s2.elementId)) {
            constraint = { kind: "intersection", a: s1.elementId, b: s2.elementId, which: 0 };
          }
        } else if (selGeom.segments.length === 1 && selGeom.circles.length === 1) {
          const s = selGeom.segments[0];
          const c = selGeom.circles[0];
          inter = intersectLineCircleAt(
            { px: s.a.x, py: s.a.y, dx: s.b.x - s.a.x, dy: s.b.y - s.a.y },
            { cx: c.center.x, cy: c.center.y, r: c.r },
            0
          );
          if (byId.has(s.elementId) && byId.has(c.elementId)) {
            constraint = { kind: "intersection", a: s.elementId, b: c.elementId, which: 0 };
          }
        }
        if (inter) {
          const name = getNextPointName(pageElements, ["I", "K", "M", "N"]);
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: inter.x, y: inter.y, scale: 1, rotation: 0, z: 0 },
              props: { name, constraint },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          return true;
        }
        return false;
      }

      // 6. Tangent from selected Point + Circle
      if (tool === "c:tangent") {
        if (selGeom.circle && selGeom.point) {
          const pt = selGeom.point.pos;
          const ptId = selGeom.point.elementId;
          const circ = selGeom.circle;
          const d = dist2D(pt, circ.center);
          if (d < circ.r - 0.08) {
            setStatusHint("Điểm nằm trong đường tròn — không kẻ được tiếp tuyến.");
            return true;
          }
          const createdIds: string[] = [];
          dispatcher.batch(() => {
            if (Math.abs(d - circ.r) <= 0.08) {
              const ux = (pt.x - circ.center.x) / (d || 1);
              const uy = (pt.y - circ.center.y) / (d || 1);
              const touch = { x: circ.center.x + ux * circ.r, y: circ.center.y + uy * circ.r };
              const span = Math.max(1.8, circ.r * 1.35);
              const r1 = dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "GeomConstruction",
                  props: {
                    kind: "tangent",
                    from: ptId,
                    circle: circ.elementId,
                    fromPt: { x: touch.x + uy * span, y: touch.y - ux * span },
                    toPt: { x: touch.x - uy * span, y: touch.y + ux * span },
                    sideAPt: circ.center,
                    sideBPt: touch,
                  },
                },
              });
              if (r1.created?.[0]) createdIds.push(r1.created[0]);
            } else {
              for (const side of [0, 1] as const) {
                const tPt = tangentPointToCircle(pt, { cx: circ.center.x, cy: circ.center.y, r: circ.r }, side);
                if (!tPt) continue;
                const rTan = dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    type: "GeomConstruction",
                    props: {
                      kind: "tangent",
                      from: ptId,
                      circle: circ.elementId,
                      tangentSide: side,
                      fromPt: pt,
                      toPt: tPt,
                      sideAPt: circ.center,
                      sideBPt: tPt,
                    },
                  },
                });
                if (rTan.created?.[0]) createdIds.push(rTan.created[0]);
              }
            }
          });
          if (createdIds.length > 0) setSelectedIds(createdIds);
          return true;
        }
        return false;
      }

      // 6. 3D Cross-Section from 3 selected points
      if (tool === "c:section") {
        const ptIds = selGeom.points.map((p) => p.elementId).filter(Boolean);
        if (ptIds.length === 3) {
          const ownerId = ptIds
            .map((id) => solved3D.owner.get(id))
            .find((id): id is string => Boolean(id));
          const solidEl = ownerId ? byId.get(ownerId) : undefined;
          if (solidEl && solidEl.type === "Solid3D") {
            const secId = newElId("sec");
            const res = dispatcher.dispatch({
              type: "object.create",
              params: {
                id: secId,
                type: "RoundSection",
                style: { stroke: "#e8590c", fill: "rgba(240,140,0,0.35)", width: 2 },
                props: { solid: solidEl.id, points: ptIds },
              },
            });
            if (res.created?.[0]) setSelectedIds([res.created[0]]);
            return true;
          }
        }
      }

      return false;
    },
    [selectedElements, hydratedPts, byId, solved3D, pageElements, dispatcher]
  );

  // Select tool helper clearing transient multi-step drafts
  const handleSelectTool = useCallback(
    (rawTool: WhiteboardTool) => {
      const next = normalizeToolId(rawTool);
      if (next === "erase" && activeTool !== "erase") {
        previousToolBeforeEraserRef.current = activeTool;
      }
      draftTwoPtRef.current = null;
      setDraftPreviewLine(null);
      setDraftPolygonPts([]);
      setPickedItems([]);
      setStatusHint(null);
      setSolidSubSel(null);
      if (typeof next === "string" && tryApplyConstructionFromSelection(next)) {
        setActiveTool("select");
        return;
      }
      setActiveTool(next);
    },
    [activeTool, tryApplyConstructionFromSelection]
  );

  // Style State Aggregation
  const selectionStyleState: SelectionStyleState = useMemo(() => {
    if (selectedElements.length === 0) {
      return { count: 0, stroke: null, width: null, dash: null };
    }
    let commonStroke: string | "mixed" | null =
      selectedElements[0].style?.stroke ?? null;
    let commonWidth: number | "mixed" | null =
      selectedElements[0].style?.width ?? null;
    let commonDash: boolean | "mixed" | null =
      selectedElements[0].style?.dash ?? null;

    for (let i = 1; i < selectedElements.length; i++) {
      const s = selectedElements[i].style;
      if ((s.stroke ?? null) !== commonStroke) commonStroke = "mixed";
      if ((s.width ?? null) !== commonWidth) commonWidth = "mixed";
      if ((s.dash ?? null) !== commonDash) commonDash = "mixed";
    }
    return {
      count: selectedElements.length,
      stroke: commonStroke,
      width: commonWidth,
      dash: commonDash,
    };
  }, [selectedElements]);

  const handlePickStyle = useCallback(
    (patch: StylePatch, isCtrlPressed: boolean) => {
      if (selectedElements.length > 0) {
        dispatcher.batch(() => {
          for (const el of selectedElements) {
            dispatcher.dispatch({
              type: "style.set",
              params: {
                id: el.id,
                style: {
                  ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}),
                  ...(patch.width !== undefined ? { width: patch.width } : {}),
                  ...(patch.dash !== undefined ? { dash: patch.dash } : {}),
                },
              },
            });
          }
        });
      }

      if (selectedElements.length === 0 || !isCtrlPressed) {
        setCurrentStyle((prev) => {
          const next = {
            ...prev,
            ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}),
            ...(patch.width !== undefined ? { width: patch.width } : {}),
            ...(patch.dash !== undefined ? { dash: patch.dash } : {}),
          };
          saveDrawStyle({
            stroke: next.stroke ?? null,
            width: next.width ?? null,
            dash: next.dash ?? null,
          });
          return next;
        });
      }
    },
    [selectedElements, dispatcher]
  );

  // Selection Actions (Delete with cascading deps, Duplicate, Copy, Cut, Paste, Hide, Lock)
  const handleLockSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    dispatcher.batch(() => {
      for (const id of selectedIds) {
        const el = byId.get(id);
        dispatcher.dispatch({
          type: "object.update",
          params: {
            id,
            props: {
              locked: true,
              ...(el?.type === "Image" ? { isPdfPage: true } : {}),
            },
            style: { locked: true },
          },
        });
      }
    });
    setSelectedIds([]);
    setStatusHint(
      '🔒 Đã khóa khối vào trang. Nhấp đúp lên khối hoặc mở danh sách "🔒 khối đang khoá" ở góc dưới trái để mở lại.'
    );
  }, [selectedIds, dispatcher, byId]);

  const handleUnlockElement = useCallback(
    (id: string) => {
      dispatcher.dispatch({
        type: "object.update",
        params: {
          id,
          props: { locked: false },
          style: { locked: false },
        },
      });
      setSelectedIds([id]);
      setHoveredLockedId((prev) => (prev === id ? null : prev));
      setStatusHint("🔓 Đã mở khoá khối. Bạn có thể di chuyển hoặc chỉnh sửa.");
    },
    [dispatcher]
  );

  const handleUnlockAllLocked = useCallback(() => {
    if (lockedElements.length === 0) return;
    dispatcher.batch(() => {
      for (const el of lockedElements) {
        dispatcher.dispatch({
          type: "object.update",
          params: {
            id: el.id,
            props: { locked: false },
            style: { locked: false },
          },
        });
      }
    });
    setSelectedIds(lockedElements.map((el) => el.id));
    setStatusHint(
      `🔓 Đã mở khoá ${lockedElements.length} khối trên trang. Bạn có thể di chuyển hoặc chỉnh sửa.`
    );
  }, [lockedElements, dispatcher]);

  const handleTogglePagePdfLock = useCallback(
    (targetPage: number) => {
      const allEls = dispatcher.getAllElements();
      const pdfEls = allEls.filter(
        (el) =>
          (el.type === "Image" || el.props?.isPdfPage) &&
          (el.props?.isPdfPage || el.props?.locked || el.style?.locked) &&
          ((el.meta?.page ?? 1) === targetPage)
      );
      if (pdfEls.length === 0) return;

      const anyLocked = pdfEls.some(
        (el) => el.props?.locked || el.style?.locked
      );

      dispatcher.batch(() => {
        for (const el of pdfEls) {
          dispatcher.dispatch({
            type: "object.update",
            params: {
              id: el.id,
              props: { locked: !anyLocked },
              style: { locked: !anyLocked },
            },
          });
        }
      });

      if (anyLocked) {
        setSelectedIds(pdfEls.map((el) => el.id));
        setStatusHint(
          `✓ Đã mở khóa trang PDF trên trang ${targetPage}. Bạn có thể di chuyển, phóng to hoặc xoá.`
        );
      } else {
        setSelectedIds([]);
        setStatusHint(
          `🔒 Đã khóa cố định trang PDF trên trang ${targetPage} vào giấy (không thể chọn hay di chuyển).`
        );
      }
    },
    [dispatcher]
  );

  const pagePdfStatus = useMemo(() => {
    const status: Record<
      number,
      { hasPdf: boolean; locked: boolean; elementId: string }
    > = {};
    for (const el of elements) {
      if (
        el.type === "Image" &&
        (el.props?.isPdfPage || el.props?.locked || el.style?.locked)
      ) {
        const p = el.meta?.page ?? 1;
        const isLocked = Boolean(el.props?.locked || el.style?.locked);
        status[p] = {
          hasPdf: true,
          locked: isLocked,
          elementId: el.id,
        };
      }
    }
    return status;
  }, [elements]);

  const handleDeleteSelected = useCallback(() => {
    const targetIds = selectedElements.map((el) => el.id);
    if (targetIds.length === 0) return;
    dispatcher.deleteObjects(targetIds);
    setSelectedIds([]);
    setOrbitActiveId(null);
  }, [selectedElements, dispatcher]);

  const handleDuplicateSelected = useCallback(() => {
    const targetIds = selectedElements.map((el) => el.id);
    if (targetIds.length === 0) return;
    const newIds = dispatcher.duplicate(targetIds);
    setSelectedIds(newIds);
  }, [selectedElements, dispatcher]);

  const handleCopySelected = useCallback(() => {
    if (selectedElements.length === 0) return;
    setClipboard(JSON.parse(JSON.stringify(selectedElements)));
  }, [selectedElements]);

  const handleCutSelected = useCallback(() => {
    const targetIds = selectedElements.map((el) => el.id);
    if (targetIds.length === 0) return;
    setClipboard(JSON.parse(JSON.stringify(selectedElements)));
    dispatcher.deleteObjects(targetIds);
    setSelectedIds([]);
    setOrbitActiveId(null);
  }, [selectedElements, dispatcher]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;
    const created: string[] = [];
    dispatcher.batch(() => {
      for (const el of clipboard) {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: el.type,
            transform: {
              ...el.transform,
              x: el.transform.x + 0.5,
              y: el.transform.y - 0.5,
            },
            style: { ...el.style },
            props: JSON.parse(JSON.stringify(el.props)),
          },
        });
        if (res.created && res.created[0]) created.push(res.created[0]);
      }
    });
    setSelectedIds(created);
  }, [clipboard, dispatcher]);

  const handleHideSelected = useCallback(() => {
    const targetIds = selectedElements.map((el) => el.id);
    if (targetIds.length === 0) return;
    dispatcher.hideObjects(targetIds);
    setSelectedIds([]);
  }, [selectedElements, dispatcher]);

  const handleUnhideAll = useCallback(() => {
    dispatcher.unhideAll(currentPage);
  }, [dispatcher, currentPage]);

  // 3D Orbit Helpers
  const activeOrbitElement = useMemo(() => {
    let id =
      orbitActiveId ??
      selectedElements.find(
        (el) => el.type === "Solid3D" || el.type === "Axes3D" || el.type === "SpaceFigure"
      )?.id ??
      null;
    if (!id) return null;
    let el = byId.get(id);
    if (el?.type === "SpaceFigure" && (el.props as any)?.axes) {
      const parentAxes = byId.get((el.props as any).axes);
      if (parentAxes && parentAxes.type === "Axes3D") {
        el = parentAxes;
      }
    }
    if (!el || (el.type !== "Solid3D" && el.type !== "Axes3D")) return null;
    return el;
  }, [orbitActiveId, selectedElements, byId]);

  const activeOrbitCam = useMemo<CameraMatrix3>(() => {
    if (!activeOrbitElement) return defaultCameraForSolid("pyramid");
    const cached = orbitCamById[activeOrbitElement.id];
    if (cached) return cached;
    const props = activeOrbitElement.props as Partial<Solid3DProps>;
    if (typeof props.azimuth === "number" || typeof props.elevation === "number") {
      return azimuthElevationToCamera(props.azimuth ?? 26, props.elevation ?? 17);
    }
    return defaultCameraForSolid(
      activeOrbitElement.type === "Axes3D"
        ? "axes"
        : (props.kind ?? "pyramid")
    );
  }, [activeOrbitElement, orbitCamById]);

  const activeOrbitAngles = useMemo(
    () => cameraToAzimuthElevation(activeOrbitCam),
    [activeOrbitCam]
  );

  const applyOrbitCamera = useCallback(
    (solidEl: CanvasElement, nextCam: CameraMatrix3) => {
      const { azimuth, elevation } = cameraToAzimuthElevation(nextCam);
      setOrbitCamById((prev) => ({ ...prev, [solidEl.id]: nextCam }));
      dispatcher.layout(() => {
        dispatcher.dispatch({
          type: "object.update",
          params: {
            id: solidEl.id,
            props: { ...solidEl.props, azimuth, elevation },
          },
        });
      });
    },
    [dispatcher]
  );

  useEffect(() => {
    if (!isAutoSpin || !activeOrbitElement) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setOrbitCamById((prev) => {
        const cur =
          prev[activeOrbitElement.id] ??
          defaultCameraForSolid(
            activeOrbitElement.type === "Axes3D"
              ? "axes"
              : ((activeOrbitElement.props as Partial<Solid3DProps>).kind ??
                  "pyramid")
          );
        const next = orbitCamera(cur, dt * 0.7, 0);
        return { ...prev, [activeOrbitElement.id]: next };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isAutoSpin, activeOrbitElement]);

  // Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // PageBar Handlers backed by Y.Map("pages")
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setYjsCurrentPage(doc, currentPage - 1);
      if (isA4Format) {
        scrollToPage(currentPage - 1);
      }
      setSelectedIds([]);
      setOrbitActiveId(null);
    }
  }, [doc, currentPage, isA4Format, scrollToPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pageCount) {
      setYjsCurrentPage(doc, currentPage + 1);
      if (isA4Format) {
        scrollToPage(currentPage + 1);
      }
      setSelectedIds([]);
      setOrbitActiveId(null);
    }
  }, [doc, currentPage, pageCount, isA4Format, scrollToPage]);

  const handleAddPage = useCallback(() => {
    const added = addYjsPage(doc);
    setYjsCurrentPage(doc, added.count);
    if (isA4Format) {
      setTimeout(() => {
        scrollToPage(added.count);
      }, 40);
    }
    setSelectedIds([]);
    setOrbitActiveId(null);
  }, [doc, isA4Format, scrollToPage]);

  handleAddPageRef.current = handleAddPage;

  // Execute any registered command from Command Palette or Keyboard Shortcut
  const executeCommand = useCallback(
    (commandId: string) => {
      if (commandId.startsWith("tool:")) {
        handleSelectTool(commandId.slice(5) as WhiteboardTool);
        return;
      }
      if (commandId === "phys:drawer") {
        handleSelectTool("select");
        setMathDrawerOpen(false);
        setChemistryDrawerOpen(false);
        setPhysicsDrawerOpen(true);
        return;
      }
      if (commandId === "math:drawer") {
        handleSelectTool("select");
        setPhysicsDrawerOpen(false);
        setChemistryDrawerOpen(false);
        setMathDrawerOpen(true);
        return;
      }
      if (commandId === "chem:drawer") {
        handleSelectTool("select");
        setPhysicsDrawerOpen(false);
        setMathDrawerOpen(false);
        setChemistryDrawerOpen(true);
        return;
      }
      if (commandId === "sim:launcher") {
        handleSelectTool("select");
        setPhysicsDrawerOpen(false);
        setMathDrawerOpen(false);
        setChemistryDrawerOpen(false);
        setSimLauncherOpen(true);
        return;
      }
      switch (commandId) {
        case "action:openCommands":
          setCommandPaletteOpen(true);
          break;
        case "action:toggleConstructMarks":
          setConstructMarksEnabled(!getConstructMarksEnabled());
          setConstructMarksTick((n) => n + 1);
          break;
        case "action:openPlotDialog":
          setPlotDialogOpen(true);
          break;
        case "action:axesPoint":
          setAxesPointDialogOpen(true);
          break;
        case "action:axesVector":
          setAxesVectorDialogOpen(true);
          break;
        case "action:axesEquation":
          setCurve2dDialogMode("equation");
          break;
        case "action:axesInequality":
          setCurve2dDialogMode("inequality");
          break;
        case "action:axesParametric":
          setCurve2dDialogMode("parametric");
          break;
        case "action:axesSequence":
          setCurve2dDialogMode("sequence");
          break;
        case "action:openChartDialog":
          setChartDialogOpen(true);
          break;
        case "action:openRealWorldDrawer":
          setRealWorldDrawerOpen(true);
          break;
        case "action:duplicate":
          handleDuplicateSelected();
          break;
        case "action:zoomIn":
          zoomIn();
          break;
        case "action:zoomOut":
          zoomOut();
          break;
        case "action:zoomReset":
        case "action:fitView":
          resetView();
          break;
        case "action:toggleGrid":
          setGridEnabled((g) => !g);
          break;
        case "action:prevPage":
          handlePrevPage();
          break;
        case "action:nextPage":
          handleNextPage();
          break;
        case "action:addPage":
          handleAddPage();
          break;
        case "action:fullscreen":
          handleToggleFullscreen();
          break;
        case "action:exportPng":
          if (doc) {
            exportPNG(containerRef.current, doc, currentPage)
              .then((blob) => downloadBlob(blob, "physboard-bang-ve.png"))
              .catch(() => {});
          }
          break;
        case "action:exportPdf":
          setExportPdfModalOpen(true);
          break;
        case "action:unlockAll":
          handleUnlockAllLocked();
          break;
      }
    },
    [
      handleSelectTool,
      handleDuplicateSelected,
      handleUnlockAllLocked,
      zoomIn,
      zoomOut,
      resetView,
      handlePrevPage,
      handleNextPage,
      handleAddPage,
      handleToggleFullscreen,
      doc,
      containerRef,
      currentPage,
    ]
  );

  const commitDraftPolygon = useCallback(() => {
    if (draftPolygonPts.length < 3) return;
    const polyId = newElId("poly");
    const names = getNextPointNames(draftPolygonPts.length, pageElements);
    const marksEnabled = getConstructMarksEnabled();
    const embedded: EmbeddedVertex[] = draftPolygonPts.map((pt, i) => ({
      id: `${polyId}_v${i}`,
      name: names[i] ?? `P${i + 1}`,
      x: pt.x,
      y: pt.y,
    }));
    dispatcher.dispatch({
      type: "object.create",
      params: {
        id: polyId,
        type: "GeomPolygon",
        style: {
          stroke: currentStyle.stroke ?? "#2563eb",
          fill: "rgba(37,99,235,0.06)",
          width: currentStyle.width ?? 2,
          dash: currentStyle.dash ?? false,
        },
        props: {
          vertices: embedded.map((v) => v.id),
          points: embedded,
          marksEnabled,
        },
      },
    });
    setDraftPolygonPts([]);
    resetToolAfterCreation();
    setStatusHint(null);
  }, [
    draftPolygonPts,
    pageElements,
    dispatcher,
    currentStyle,
    resetToolAfterCreation,
  ]);

  // Global Keyboard Shortcuts (Strict Isolation inside input, textarea, math-field, contentEditable)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(document.activeElement)) return;
      if (commandPaletteOpen) return;

      const isModifier = e.metaKey || e.ctrlKey;
      const lower = e.key.toLowerCase();

      if (isModifier && (lower === "z" || e.code === "KeyZ")) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (isModifier && (lower === "y" || e.code === "KeyY")) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }
      if (isModifier && lower === "c") {
        e.preventDefault();
        handleCopySelected();
        return;
      }
      if (isModifier && lower === "x") {
        e.preventDefault();
        handleCutSelected();
        return;
      }
      if (isModifier && lower === "v") {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (isModifier && lower === "a") {
        e.preventDefault();
        setSolidSubSel(null);
        setSelectedIds(
          pageElements
            .filter(
              (el) => !el.style?.hidden && !el.props?.locked && !el.style?.locked
            )
            .map((el) => el.id)
        );
        return;
      }
      if (e.key === "Enter" && activeTool === "polygon" && draftPolygonPts.length >= 3) {
        e.preventDefault();
        commitDraftPolygon();
        return;
      }
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        if (mathSession) {
          setMathSession(null);
        } else if (shareModalOpen) {
          setShareModalOpen(false);
        } else if (realWorldDrawerOpen) {
          setRealWorldDrawerOpen(false);
        } else if (physicsDrawerOpen) {
          setPhysicsDrawerOpen(false);
        } else if (mathDrawerOpen) {
          setMathDrawerOpen(false);
        } else if (calculatorOpen) {
          setCalculatorOpen(false);
        } else if (draftTwoPtRef.current || draftPolygonPts.length > 0 || pickedItems.length > 0) {
          draftTwoPtRef.current = null;
          setDraftPreviewLine(null);
          setDraftPolygonPts([]);
          setPickedItems([]);
          setStatusHint(null);
        } else if (selectedIds.length > 0) {
          setSelectedIds([]);
          setOrbitActiveId(null);
        } else if (activeTool && activeTool !== "select") {
          handleSelectTool("select");
        }
        return;
      }

      // Open Command Palette quickly with Ctrl+K or '?' or '/'
      if ((isModifier && lower === "k") || (!isModifier && !e.altKey && (e.key === "?" || e.key === "/"))) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Match user-customizable shortcuts from registry
      const matchedCmd = matchCommandForKeyEvent(e, shortcutMap);
      if (matchedCmd) {
        e.preventDefault();
        executeCommand(matchedCmd.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    commandPaletteOpen,
    activeTool,
    selectedIds,
    pageElements,
    mathSession,
    shareModalOpen,
    realWorldDrawerOpen,
    physicsDrawerOpen,
    calculatorOpen,
    draftPolygonPts.length,
    commitDraftPolygon,
    pickedItems.length,
    shortcutMap,
    undo,
    redo,
    handleDeleteSelected,
    handleCopySelected,
    handleCutSelected,
    handlePaste,
    handleSelectTool,
    executeCommand,
  ]);

  // --- Snapping & Hit-Testing Helpers for Geometry Constructions ---
  const findNearestPoint = useCallback(
    (worldPos: Point2D, maxScreenPx = 24) => {
      const thresh = maxScreenPx / (viewport.scale || 45);
      let best: {
        id: string;
        pos: Point2D;
        dist: number;
        polygonId?: string;
      } | null = null;

      // 1. Standalone Point / GeomPoint
      for (const el of pageElements) {
        if (el.style?.hidden) continue;
        if (el.type === "GeomPoint" || el.type === "Point") {
          const p = hydratedPts.get(el.id) ?? {
            x: el.transform.x,
            y: el.transform.y,
          };
          const d = dist2D(worldPos, p);
          if (d <= thresh && (!best || d < best.dist)) {
            best = { id: el.id, pos: p, dist: d };
          }
        }
        // 2. Embedded polygon vertices
        if (el.type === "GeomPolygon" && Array.isArray(el.props.points)) {
          for (const v of el.props.points as EmbeddedVertex[]) {
            const p = { x: v.x + el.transform.x, y: v.y + el.transform.y };
            const d = dist2D(worldPos, p);
            if (d <= thresh && (!best || d < best.dist)) {
              best = { id: v.id, pos: p, dist: d, polygonId: el.id };
            }
          }
        }
        // 3. 3D Solid vertices
        if (el.type === "Solid3D" && Array.isArray(el.props.points)) {
          const ptIds = el.props.points as string[];
          const coords = Array.isArray(el.props.pointCoords)
            ? (el.props.pointCoords as Point2D[])
            : [];
          for (let i = 0; i < ptIds.length; i++) {
            const p =
              hydratedPts.get(ptIds[i]) ??
              (coords[i]
                ? {
                    x: coords[i].x + el.transform.x,
                    y: coords[i].y + el.transform.y,
                  }
                : undefined);
            if (!p) continue;
            const d = dist2D(worldPos, p);
            if (d <= thresh && (!best || d < best.dist)) {
              best = { id: ptIds[i], pos: p, dist: d };
            }
          }
        }
      }
      return best;
    },
    [pageElements, hydratedPts, viewport.scale]
  );

  const findNearestEdgeOrSegment = useCallback(
    (worldPos: Point2D, maxScreenPx = 28) => {
      const thresh = maxScreenPx / (viewport.scale || 45);
      let best: {
        id: string;
        a: Point2D;
        b: Point2D;
        aId?: string;
        bId?: string;
        dist: number;
        polygonId?: string;
      } | null = null;

      for (const el of pageElements) {
        if (el.style?.hidden) continue;
        if (
          el.type === "GeomSegment" ||
          el.type === "GeomLine" ||
          el.type === "GeomRay" ||
          el.type === "GeomVector"
        ) {
          const ends = resolveLineEndpoints(el, hydratedPts, byId);
          if (ends) {
            const d = distToSeg(worldPos, ends[0], ends[1]);
            if (d <= thresh && (!best || d < best.dist)) {
              best = {
                id: el.id,
                a: ends[0],
                b: ends[1],
                aId: typeof el.props.from === "string" ? el.props.from : undefined,
                bId: typeof el.props.to === "string" ? el.props.to : undefined,
                dist: d,
              };
            }
          }
        }
        if (el.type === "GeomPolygon") {
          const verts: Array<{ id: string; pt: Point2D }> = [];
          if (Array.isArray(el.props.points)) {
            for (const v of el.props.points as EmbeddedVertex[]) {
              verts.push({
                id: v.id,
                pt: { x: v.x + el.transform.x, y: v.y + el.transform.y },
              });
            }
          } else if (Array.isArray(el.props.vertices)) {
            for (const vid of el.props.vertices as string[]) {
              const p = hydratedPts.get(vid);
              if (p) verts.push({ id: vid, pt: p });
            }
          }
          for (let i = 0; i < verts.length; i++) {
            const u = verts[i];
            const v = verts[(i + 1) % verts.length];
            const d = distToSeg(worldPos, u.pt, v.pt);
            if (d <= thresh && (!best || d < best.dist)) {
              best = {
                id: `${el.id}_edge_${i}`,
                a: u.pt,
                b: v.pt,
                aId: u.id,
                bId: v.id,
                dist: d,
                polygonId: el.id,
              };
            }
          }
        }
        if (el.type === "Solid3D" && Array.isArray(el.props.points)) {
          const ptIds = el.props.points as string[];
          const coords = Array.isArray(el.props.pointCoords)
            ? (el.props.pointCoords as Point2D[])
            : [];
          const lift = solved3D.lifts.get(el.id);
          if (lift) {
            const edges = extractPolyhedronEdges(lift);
            for (const [i, j] of edges) {
              const idA = ptIds[i];
              const idB = ptIds[j];
              if (!idA || !idB) continue;
              const pA =
                hydratedPts.get(idA) ??
                (coords[i]
                  ? {
                      x: coords[i].x + el.transform.x,
                      y: coords[i].y + el.transform.y,
                    }
                  : undefined);
              const pB =
                hydratedPts.get(idB) ??
                (coords[j]
                  ? {
                      x: coords[j].x + el.transform.x,
                      y: coords[j].y + el.transform.y,
                    }
                  : undefined);
              if (!pA || !pB) continue;
              const d = distToSeg(worldPos, pA, pB);
              if (d <= thresh && (!best || d < best.dist)) {
                best = {
                  id: `${el.id}_edge_${i}_${j}`,
                  a: pA,
                  b: pB,
                  aId: idA,
                  bId: idB,
                  dist: d,
                };
              }
            }
          }
        }
      }
      return best;
    },
    [pageElements, hydratedPts, byId, solved3D.lifts, viewport.scale]
  );

  const findNearestCircle = useCallback(
    (worldPos: Point2D, maxScreenPx = 28) => {
      const thresh = maxScreenPx / (viewport.scale || 45);
      for (const el of pageElements) {
        if (el.style?.hidden || el.type !== "GeomCircle") continue;
        const centerId = String(el.props.center ?? "");
        const center = hydratedPts.get(centerId);
        if (!center) continue;
        const r = resolveCircleRadius(
          el.props.radius as Parameters<typeof resolveCircleRadius>[0],
          center,
          (id) => hydratedPts.get(id)
        );
        if (r === null) continue;
        if (
          Math.abs(dist2D(worldPos, center) - r) <= thresh ||
          dist2D(worldPos, center) <= thresh
        ) {
          return { el, center, centerId, r };
        }
      }
      return null;
    },
    [pageElements, hydratedPts, viewport.scale]
  );

  const snapPointAtCursor = useCallback(
    (
      worldPos: Point2D,
      maxScreenPx = 16
    ): { point: Point2D; constraint: PointConstraint } => {
      const nearEdge = findNearestEdgeOrSegment(worldPos, maxScreenPx);
      if (nearEdge) {
        const edgeEl = byId.get(nearEdge.id);
        if (edgeEl) {
          const snapped = snapPointToObject(edgeEl, worldPos, hydratedPts, byId);
          if (snapped) {
            return { point: snapped.at, constraint: snapped.constraint };
          }
        }
        const dx = nearEdge.b.x - nearEdge.a.x;
        const dy = nearEdge.b.y - nearEdge.a.y;
        const lenSq = dx * dx + dy * dy;
        if (
          lenSq > 1e-12 &&
          nearEdge.aId &&
          nearEdge.bId &&
          (byId.has(nearEdge.aId) || solved3D.owner.has(nearEdge.aId)) &&
          (byId.has(nearEdge.bId) || solved3D.owner.has(nearEdge.bId))
        ) {
          const t = Math.max(
            0,
            Math.min(
              1,
              ((worldPos.x - nearEdge.a.x) * dx +
                (worldPos.y - nearEdge.a.y) * dy) /
                lenSq
            )
          );
          return {
            point: { x: nearEdge.a.x + t * dx, y: nearEdge.a.y + t * dy },
            constraint: { kind: "onLine", a: nearEdge.aId, b: nearEdge.bId, t },
          };
        }
      }
      const nearCirc = findNearestCircle(worldPos, maxScreenPx);
      if (nearCirc) {
        const snapped = snapPointToObject(
          nearCirc.el,
          worldPos,
          hydratedPts,
          byId
        );
        if (snapped) {
          return { point: snapped.at, constraint: snapped.constraint };
        }
      }
      return { point: worldPos, constraint: { kind: "free" } };
    },
    [findNearestEdgeOrSegment, findNearestCircle, byId, hydratedPts, solved3D.owner]
  );

  // Commit Two-Point Segment / Line / Ray / Vector / Circle
  const commitTwoPointShape = useCallback(
    (
      tool: string,
      p1: Point2D,
      p2: Point2D,
      startSnapId?: string,
      endSnapId?: string
    ) => {
      const dist = dist2D(p1, p2);
      if (dist < 4 / (viewport.scale || 45)) return;

      const startSnap = startSnapId ? null : snapPointAtCursor(p1, 20);
      const endSnap = endSnapId ? null : snapPointAtCursor(p2, 20);
      const rawResolvedP1 = startSnap && startSnap.constraint.kind !== "free" ? startSnap.point : p1;
      const rawResolvedP2 = endSnap && endSnap.constraint.kind !== "free" ? endSnap.point : p2;

      const a4Opt = isA4Format
        ? BOARD_FORMAT_OPTIONS.find((f) => f.id === currentBoardConfig?.format)
        : null;
      const clampA4 = (pt: Point2D): Point2D => {
        if (!a4Opt) return pt;
        const hw = a4Opt.widthWorld / 2;
        const hh = a4Opt.heightWorld / 2;
        return {
          x: Math.max(-hw, Math.min(hw, pt.x)),
          y: Math.max(-hh, Math.min(hh, pt.y)),
        };
      };
      const resolvedP1 = clampA4(rawResolvedP1);
      const resolvedP2 = clampA4(rawResolvedP2);

      const createSnappedEndpoints = (needStart: boolean, needEnd: boolean) => {
        let sId = startSnapId;
        let eId = endSnapId;
        const usedNames: string[] = [];
        if (needStart && !sId && startSnap && startSnap.constraint.kind !== "free") {
          sId = newElId("pt");
          const sName = getNextPointName(pageElements);
          usedNames.push(sName);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id: sId,
              type: "GeomPoint",
              transform: { x: resolvedP1.x, y: resolvedP1.y, scale: 1, rotation: 0, z: 0 },
              style: { stroke: currentStyle.stroke ?? "#2563eb", width: 2 },
              props: { name: sName, constraint: startSnap.constraint },
            },
          });
        }
        if (needEnd && !eId && endSnap && endSnap.constraint.kind !== "free") {
          eId = newElId("pt");
          let eName = getNextPointName(pageElements);
          if (usedNames.includes(eName)) {
            eName = getNextPointName(pageElements, ["N", "P", "Q", "M", "K"]);
          }
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id: eId,
              type: "GeomPoint",
              transform: { x: resolvedP2.x, y: resolvedP2.y, scale: 1, rotation: 0, z: 0 },
              style: { stroke: currentStyle.stroke ?? "#2563eb", width: 2 },
              props: { name: eName, constraint: endSnap.constraint },
            },
          });
        }
        return { sId, eId };
      };

      dispatcher.batch(() => {
        if (tool === "circle") {
          const id = newElId("circ");
          const { sId, eId } = createSnappedEndpoints(true, true);
          const centerId = sId ?? `${id}_c`;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomCircle",
              style: {
                stroke: currentStyle.stroke ?? "#0891b2",
                width: currentStyle.width ?? 2,
                dash: currentStyle.dash ?? false,
              },
              props: {
                center: centerId,
                ...(sId ? {} : { centerPt: resolvedP1 }),
                radius: eId
                  ? { kind: "through", point: eId }
                  : { kind: "value", v: dist2D(resolvedP1, resolvedP2) },
              },
            },
          });
          return;
        }

        const id = newElId("seg");
        const { sId, eId } = createSnappedEndpoints(true, true);
        const fromId = sId ?? `${id}_a`;
        const toId = eId ?? `${id}_b`;
        const commonEndpoints = {
          from: fromId,
          to: toId,
          ...(sId ? {} : { fromPt: resolvedP1 }),
          ...(eId ? {} : { toPt: resolvedP2 }),
        };

        if (tool === "c:vector") {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomVector",
              style: {
                stroke: currentStyle.stroke ?? "#334155",
                width: currentStyle.width ?? 2,
                dash: currentStyle.dash ?? false,
              },
              props: commonEndpoints,
            },
          });
        } else if (tool === "c:line") {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomLine",
              style: {
                stroke: currentStyle.stroke ?? "#334155",
                width: currentStyle.width ?? 2,
                dash: currentStyle.dash ?? false,
              },
              props: { def: "through", ...commonEndpoints },
            },
          });
        } else if (tool === "c:ray") {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomRay",
              style: {
                stroke: currentStyle.stroke ?? "#334155",
                width: currentStyle.width ?? 2,
                dash: currentStyle.dash ?? false,
              },
              props: commonEndpoints,
            },
          });
        } else {
          const isDashed = tool === "c:dseg" || currentStyle.dash === true;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomSegment",
              style: {
                stroke: currentStyle.stroke ?? "#334155",
                width: currentStyle.width ?? 2,
                dash: isDashed,
              },
              props: {
                ...commonEndpoints,
                ...(isDashed ? { dashed: true } : {}),
              },
            },
          });
        }
      });
      resetToolAfterCreation();
    },
    [
      dispatcher,
      currentStyle,
      viewport.scale,
      snapPointAtCursor,
      pageElements,
      isA4Format,
      currentBoardConfig,
      resetToolAfterCreation,
    ]
  );

  // --- Insert / M3 / Exam / RealWorld Handlers ---
  const handleInsertTable = useCallback(
    (rows: number, cols: number) => {
      handleSelectTool(`table:${rows}x${cols}`);
      setStatusHint(`Bấm lên bảng để đặt bảng ${rows} × ${cols}`);
    },
    [handleSelectTool]
  );

  const handleInsertImage = useCallback(
    (img: ImportedImageResult) => {
      const center = getViewCenter();
      const res = dispatcher.dispatch({
        type: "object.create",
        params: {
          type: "Image",
          transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
          props: { src: img.src, w: img.w, h: img.h },
        },
      });
      handleSelectTool("select");
      if (res.created?.[0]) setSelectedIds([res.created[0]]);
    },
    [dispatcher, getViewCenter, handleSelectTool]
  );

  const handleInsertPdfPages = useCallback(
    (pages: ImportedPdfPage[]) => {
      if (pages.length === 0) return;

      // 1. Determine A4 format: landscape vs portrait based on the PDF aspect ratio
      const isPdfLandscape = pages[0].pixelWidth > pages[0].pixelHeight;
      const targetFormat: BoardFormatId = isPdfLandscape
        ? "a4_landscape"
        : "a4_portrait";

      const a4Option =
        BOARD_FORMAT_OPTIONS.find((f) => f.id === targetFormat) ||
        BOARD_FORMAT_OPTIONS[1];
      const pageW = a4Option.widthWorld;
      const pageH = a4Option.heightWorld;
      const pageGap = 0.8;
      const pageStep = pageH + pageGap;

      const targetBoardConfig: PageBoardConfig = {
        ...(currentBoardConfig || DEFAULT_PAGE_BOARD_CONFIG),
        format: targetFormat,
      };

      const startPage = currentPage;
      let targetCount = pageCount;

      dispatcher.batch(() => {
        // Ensure all existing pages up to current page have targetBoardConfig
        for (let p = 1; p <= targetCount; p++) {
          writePageBoardConfig(doc, p, targetBoardConfig);
        }

        pages.forEach((pg, idx) => {
          const pageNum = startPage + idx;
          while (targetCount < pageNum) {
            const added = addYjsPage(doc);
            targetCount = added.count;
            writePageBoardConfig(doc, pageNum, targetBoardConfig);
          }
          if (pageNum <= targetCount) {
            writePageBoardConfig(doc, pageNum, targetBoardConfig);
          }

          // Exact math world coordinates matching paper sheet rect[data-page-rect=pageNum]
          const pageTop = (pageNum - 1) * pageStep;
          const targetY = -(pageTop + pageH / 2);

          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Image",
              page: pageNum,
              transform: {
                x: 0,
                y: targetY,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              props: {
                src: pg.src,
                w: pageW,
                h: pageH,
                locked: true,
                isPdfPage: true,
                pageNumber: pg.pageNumber,
              },
              style: {
                locked: true,
              },
            },
          });
        });
      });

      handleSelectTool("select");
      setYjsCurrentPage(doc, startPage);
      setSelectedIds([]);
      if (scrollToPage) {
        scrollToPage(startPage);
      }
      setStatusHint(
        `✓ Đã chèn ${pages.length} trang PDF vừa khít khổ giấy và tự động khóa cố định (bấm nút 🔒 trên trang để mở khóa).`
      );
    },
    [dispatcher, doc, currentPage, pageCount, currentBoardConfig, scrollToPage, handleSelectTool]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __testInsertPdfPages?: (pages: ImportedPdfPage[]) => void }).__testInsertPdfPages = handleInsertPdfPages;
      (window as unknown as { __testSetBoardFormat?: (fmt: BoardFormatId) => void }).__testSetBoardFormat = (fmt: BoardFormatId) => {
        writePageBoardConfig(doc, currentPage, {
          ...(currentBoardConfig || DEFAULT_PAGE_BOARD_CONFIG),
          format: fmt,
        });
      };
      (window as unknown as { __testTriggerOverscrollAddPage?: () => void }).__testTriggerOverscrollAddPage = handleAddPage;
    }
  }, [handleInsertPdfPages, doc, currentPage, currentBoardConfig]);

  // Check pending PDF import from BoardManager
  useEffect(() => {
    if (typeof window === "undefined") return;
    let isCancelled = false;

    retrievePendingPdfPages(activeRoomId)
      .then((pages) => {
        if (!isCancelled && pages && Array.isArray(pages) && pages.length > 0) {
          setTimeout(() => {
            if (!isCancelled) {
              handleInsertPdfPages(pages as ImportedPdfPage[]);
            }
          }, 150);
        }
      })
      .catch((err) => {
        console.error("Error processing pending PDF import:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeRoomId, handleInsertPdfPages]);

  const handleM3Action = useCallback(
    (action: M3MenuAction) => {
      if (action.kind === "tool") {
        handleSelectTool(action.toolId);
        if (action.hint) setStatusHint(action.hint);
      } else {
        handleSelectTool("select");
        if (action.kind === "open-plot-dialog") {
          setPlotDialogOpen(true);
        } else if (action.kind === "open-conic-dialog") {
          setConicDialogKind(action.conicKind);
        } else if (action.kind === "open-vartable-dialog") {
          setVarTableDialogMode(action.mode);
        } else if (action.kind === "open-chart-dialog") {
          setChartDialogOpen(true);
        } else if (action.kind === "open-bayes-dialog") {
          setBayesDialogOpen(true);
        } else if (action.kind === "open-numberline-dialog") {
          setNumberLineDialogOpen(true);
        } else if (action.kind === "open-realworld-drawer") {
          setRealWorldDrawerOpen(true);
        } else if (action.kind === "open-decor-help") {
          setStatusHint(
            "Chọn một đoạn thẳng trên bảng rồi dùng thanh Trang trí đoạn ở bên dưới."
          );
        }
      }
    },
    [handleSelectTool]
  );

  const ensureAxes2D = useCallback((): string => {
    if (selectedAxes2D) return selectedAxes2D.id;
    const existing = pageElements.find((el) => el.type === "Axes2D");
    if (existing) return existing.id;
    const center = getViewCenter();
    const id = newElId("axes");
    dispatcher.dispatch({
      type: "object.create",
      params: {
        id,
        type: "Axes2D",
        transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
        style: { stroke: "#475569", width: 1.5 },
        props: { size: 5, grid: true, ticks: "int", legend: true },
      },
    });
    return id;
  }, [selectedAxes2D, pageElements, getViewCenter, dispatcher]);

  const ensureAxes3D = useCallback((): string => {
    const sel =
      selectedElements.length === 1 && selectedElements[0].type === "Axes3D"
        ? selectedElements[0]
        : null;
    if (sel) return sel.id;
    const existing = pageElements.find((el) => el.type === "Axes3D");
    if (existing) return existing.id;
    const center = getViewCenter();
    const axesEl = createOxyzElement(center, { page: currentPage });
    dispatcher.dispatch({
      type: "object.create",
      params: {
        id: axesEl.id,
        type: axesEl.type,
        transform: axesEl.transform,
        style: axesEl.style,
        props: axesEl.props,
      },
    });
    return axesEl.id;
  }, [selectedElements, pageElements, getViewCenter, currentPage, dispatcher]);

  const handleSubmitPlot = useCallback(
    (
      exprLatex: string,
      params: Array<{
        name: string;
        min: number;
        max: number;
        step: number;
        value: number;
      }>,
      domain?: [number, number]
    ) => {
      let createdPlotId = "";
      dispatcher.batch(() => {
        const axesId = ensureAxes2D();
        const axesEl = pageElements.find((e) => e.id === axesId);
        const axX = axesEl?.transform.x ?? getViewCenter().x;
        const axY = axesEl?.transform.y ?? getViewCenter().y;

        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "Plot",
            transform: { x: axX, y: axY, scale: 1, rotation: 0, z: 0 },
            style: { stroke: "#2563eb", width: 2.2 },
            props: {
              exprLatex,
              params,
              ...(domain ? { domain } : {}),
              axes: axesId,
              color: "#2563eb",
              marks: {
                roots: true,
                extrema: true,
                yIntercept: true,
                asymptotes: true,
              },
            },
          },
        });
        createdPlotId = res.created?.[0] ?? "";

        params.forEach((p, idx) => {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Slider",
              transform: {
                x: axX - 4.8,
                y: axY + 4.2 - idx * 1.15,
                scale: 1,
                rotation: 0,
                z: 2,
              },
              props: {
                name: p.name,
                min: p.min,
                max: p.max,
                step: p.step,
                value: p.value,
              },
            },
          });
        });
      });

      setPlotDialogOpen(false);
      if (createdPlotId) setSelectedIds([createdPlotId]);
      handleSelectTool("select");
    },
    [dispatcher, ensureAxes2D, pageElements, getViewCenter, handleSelectTool]
  );

  // Sync slider drag -> matching Plot.props.params
  const handleChangeSliderValue = useCallback(
    (sliderId: string, nextVal: number) => {
      const sliderEl = byId.get(sliderId);
      if (!sliderEl) return;
      const paramName =
        typeof sliderEl.props?.name === "string" ? sliderEl.props.name : "";

      dispatcher.batch(() => {
        dispatcher.dispatch({
          type: "object.update",
          params: {
            id: sliderId,
            props: { ...sliderEl.props, value: nextVal },
          },
        });
        if (paramName) {
          for (const el of pageElements) {
            if (el.type !== "Plot" || !Array.isArray(el.props.params)) continue;
            const list = el.props.params as Array<Record<string, unknown>>;
            if (list.some((p) => p.name === paramName)) {
              const nextParams = list.map((p) =>
                p.name === paramName ? { ...p, value: nextVal } : p
              );
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: el.id,
                  props: { ...el.props, params: nextParams },
                },
              });
            }
          }
        }
      });
    },
    [byId, pageElements, dispatcher]
  );

  const handleUpdatePlotExpr = useCallback(
    (plotId: string, exprLatex: string) => {
      const el = byId.get(plotId);
      if (!el) return;
      dispatcher.dispatch({
        type: "object.update",
        params: { id: plotId, props: { ...el.props, exprLatex } },
      });
    },
    [byId, dispatcher]
  );

  const handleUpdatePlotParam = useCallback(
    (plotId: string, name: string, value: number) => {
      const el = byId.get(plotId);
      if (!el) return;
      const list = Array.isArray(el.props.params)
        ? (el.props.params as Array<Record<string, unknown>>)
        : [];
      const nextParams = list.map((p) =>
        p.name === name ? { ...p, value } : p
      );
      dispatcher.dispatch({
        type: "object.update",
        params: { id: plotId, props: { ...el.props, params: nextParams } },
      });
    },
    [byId, dispatcher]
  );

  const handleUpdateElementProps = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      const el = byId.get(id);
      if (!el) return;
      dispatcher.dispatch({
        type: "object.update",
        params: { id, props: { ...el.props, ...patch } },
      });
    },
    [byId, dispatcher]
  );

  const openPointRename = useCallback(
    (ids: string[]) => {
      const items = ids
        .map((id) => byId.get(id))
        .filter(
          (el): el is CanvasElement =>
            Boolean(el && (el.type === "Point" || el.type === "GeomPoint"))
        )
        .map((el) => {
          const nm = typeof el.props?.name === "string" ? el.props.name : "";
          return { id: el.id, originalName: nm, draftName: nm };
        });
      if (items.length === 0) return;
      setPointRenameSession({ items });
    },
    [byId]
  );

  const handleSubmitPointRename = useCallback(
    (items: Array<{ id: string; draftName: string }>) => {
      dispatcher.batch(() => {
        for (const item of items) {
          const el = byId.get(item.id);
          if (!el) continue;
          const nextName = item.draftName.trim();
          dispatcher.dispatch({
            type: "object.update",
            params: {
              id: el.id,
              props: {
                ...el.props,
                name: nextName,
                ...(nextName ? { hideName: false } : {}),
              },
            },
          });
        }
      });
      setPointRenameSession(null);
    },
    [byId, dispatcher]
  );

  const handleUpdateTableCells = useCallback(
    (id: string, cells: string[][]) => {
      const el = byId.get(id);
      if (!el) return;
      dispatcher.dispatch({
        type: "object.update",
        params: { id, props: { ...el.props, cells } },
      });
    },
    [byId, dispatcher]
  );

  const handleConvertCountingToTree = useCallback(
    (root: TreeNode, at: { x: number; y: number }) => {
      const res = dispatcher.dispatch({
        type: "object.create",
        params: {
          type: "TreeDiagram",
          transform: { x: at.x, y: at.y, scale: 1, rotation: 0, z: 0 },
          props: { root },
        },
      });
      if (res.created?.[0]) setSelectedIds([res.created[0]]);
    },
    [dispatcher]
  );

  const handleEditMathElement = useCallback((el: CanvasElement) => {
    setMathSession({
      elementId: el.id,
      worldPos: { x: el.transform.x, y: el.transform.y },
      initialLatex: typeof el.props?.latex === "string" ? el.props.latex : "",
    });
  }, []);

  const handleSolveMathLatex = useCallback((latex: string) => {
    const sol = solveEquationOrSystem(latex);
    setEquationSolution(sol);
    setEquationModalOpen(true);
  }, []);

  // --- Construction Tool Click Handler ---
  const handleConstructionClick = useCallback(
    (tool: string, worldPos: Point2D): boolean => {
      const nearPt = findNearestPoint(worldPos, 28);
      const nearEdge = findNearestEdgeOrSegment(worldPos, 28);
      const nearCirc = findNearestCircle(worldPos, 28);

      // 1. Altitude / Median / Bisector (2-click vertex + opposite edge, OR 3-click A, B, C)
      if (
        tool === "c:altitude" ||
        tool === "c:median" ||
        tool === "c:bisector"
      ) {
        const kind =
          tool === "c:altitude"
            ? "altitude"
            : tool === "c:median"
              ? "median"
              : "bisector";
        const defaultName =
          tool === "c:altitude" ? "H" : tool === "c:median" ? "M" : "D";

        if (pickedItems.length === 0) {
          const pPos = nearPt?.pos ?? worldPos;
          setPickedItems([
            {
              kind: "point",
              id: nearPt?.id,
              pos: pPos,
              polygonId: nearPt?.polygonId,
            },
          ]);
          setStatusHint("Chọn cạnh đối diện hoặc 2 đỉnh của cạnh đối diện");
          return true;
        }

        const first = pickedItems[0];
        if (pickedItems.length === 1) {
          // Ignore edges incident to `first.pos` so clicking near another vertex picks the opposite side
          const validNearEdge =
            nearEdge &&
            dist2D(nearEdge.a, first.pos) > 1e-3 &&
            dist2D(nearEdge.b, first.pos) > 1e-3
              ? nearEdge
              : null;
          let sideA: Point2D | undefined = validNearEdge?.a;
          let sideB: Point2D | undefined = validNearEdge?.b;
          let sideAId = validNearEdge?.aId;
          let sideBId = validNearEdge?.bId;

          if ((!sideA || !sideB) && first.polygonId) {
            const poly = byId.get(first.polygonId);
            if (poly && Array.isArray(poly.props.points)) {
              const vs = poly.props.points as EmbeddedVertex[];
              const others = vs.filter((v) => v.id !== first.id);
              if (others.length === 2) {
                sideA = {
                  x: others[0].x + poly.transform.x,
                  y: others[0].y + poly.transform.y,
                };
                sideB = {
                  x: others[1].x + poly.transform.x,
                  y: others[1].y + poly.transform.y,
                };
                sideAId = others[0].id;
                sideBId = others[1].id;
              }
            }
          }

          const fromTriangleOpp = Boolean(first.polygonId && sideA && sideB);
          if (sideA && sideB && (fromTriangleOpp || !nearPt || Boolean(validNearEdge))) {
            const foot =
              kind === "altitude"
                ? footOfPerpendicular(first.pos, sideA, sideB)
                : kind === "median"
                  ? midpoint2D(sideA, sideB)
                  : bisectorFoot2D(first.pos, sideA, sideB);
            if (foot) {
              const label = getNextPointName(pageElements, [
                defaultName,
                "K",
                "I",
                "E",
                "F",
              ]);
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "GeomConstruction",
                  style: {
                    stroke:
                      kind === "altitude"
                        ? "#dc2626"
                        : kind === "median"
                          ? "#16a34a"
                          : "#2563eb",
                    width: 2,
                  },
                  props: {
                    kind,
                    fromPt: first.pos,
                    toPt: foot,
                    sideAPt: sideA,
                    sideBPt: sideB,
                    ...(first.id ? { from: first.id } : {}),
                    ...(sideAId ? { sideA: sideAId } : {}),
                    ...(sideBId ? { sideB: sideBId } : {}),
                    label,
                  },
                },
              });
              setPickedItems([]);
              setStatusHint(null);
              setActiveTool("select");
              return true;
            }
          }

          setPickedItems([
            ...pickedItems,
            { kind: "point", id: nearPt?.id, pos: nearPt?.pos ?? worldPos },
          ]);
          setStatusHint("Chọn điểm thứ hai của cạnh đối diện");
          return true;
        }

        const second = pickedItems[1];
        const thirdPos = nearPt?.pos ?? worldPos;
        const thirdId = nearPt?.id;
        const foot =
          kind === "altitude"
            ? footOfPerpendicular(first.pos, second.pos, thirdPos)
            : kind === "median"
              ? midpoint2D(second.pos, thirdPos)
              : bisectorFoot2D(first.pos, second.pos, thirdPos);
        if (foot) {
          const label = getNextPointName(pageElements, [
            defaultName,
            "K",
            "I",
            "E",
            "F",
          ]);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomConstruction",
              style: {
                stroke:
                  kind === "altitude"
                    ? "#dc2626"
                    : kind === "median"
                      ? "#16a34a"
                      : "#2563eb",
                width: 2,
              },
              props: {
                kind,
                fromPt: first.pos,
                toPt: foot,
                sideAPt: second.pos,
                sideBPt: thirdPos,
                ...(first.id ? { from: first.id } : {}),
                ...(second.id ? { sideA: second.id } : {}),
                ...(thirdId ? { sideB: thirdId } : {}),
                label,
              },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 2. Triangle centers (Centroid G, Orthocenter H, Circumcircle, Incircle)
      if (
        tool === "c:centroid" ||
        tool === "c:ortho" ||
        tool === "c:circum" ||
        tool === "c:incircle"
      ) {
        // Check if clicking inside an existing 3-vertex polygon on 1st click
        if (pickedItems.length === 0 && !nearPt) {
          for (const el of pageElements) {
            if (el.type !== "GeomPolygon") continue;
            const verts: Point2D[] = Array.isArray(el.props.points)
              ? (el.props.points as EmbeddedVertex[]).map((v) => ({
                  x: v.x + el.transform.x,
                  y: v.y + el.transform.y,
                }))
              : [];
            if (verts.length === 3 && pointInPolygon2D(verts, worldPos)) {
              const [a, b, c] = verts;
              const center =
                tool === "c:centroid"
                  ? centroid2D(a, b, c)
                  : tool === "c:ortho"
                    ? orthocenter2D(a, b, c)
                    : tool === "c:circum"
                      ? circumcenter2D(a, b, c)
                      : incenter2D(a, b, c);
              if (center) {
                dispatcher.batch(() => {
                  const ptName =
                    tool === "c:centroid"
                      ? "G"
                      : tool === "c:ortho"
                        ? "H"
                        : tool === "c:circum"
                          ? "O"
                          : "I";
                  const ptId = newElId("pt");
                  dispatcher.dispatch({
                    type: "object.create",
                    params: {
                      id: ptId,
                      type: "GeomPoint",
                      transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
                      props: { name: ptName, constraint: { kind: "free" } },
                    },
                  });
                  if (tool === "c:circum" || tool === "c:incircle") {
                    const r =
                      tool === "c:circum"
                        ? dist2D(center, a)
                        : (() => {
                            const f = footOfPerpendicular(center, a, b);
                            return f ? dist2D(center, f) : 1;
                          })();
                    dispatcher.dispatch({
                      type: "object.create",
                      params: {
                        type: "GeomCircle",
                        style: { stroke: "#0891b2", width: 2 },
                        props: { center: ptId, radius: { kind: "value", v: r } },
                      },
                    });
                  }
                });
                setPickedItems([]);
                setStatusHint(null);
                setActiveTool("select");
                return true;
              }
            }
          }
        }

        // Check 3D solid centroid if 3 picks belong to a 3D solid
        const ptPos = nearPt?.pos ?? worldPos;
        const nextPicked = [
          ...pickedItems,
          { kind: "point" as const, id: nearPt?.id, pos: ptPos },
        ];
        if (nextPicked.length < 3) {
          setPickedItems(nextPicked);
          setStatusHint(`Chọn đỉnh thứ ${nextPicked.length + 1} của tam giác`);
          return true;
        }
        const [pA, pB, pC] = nextPicked;
        if (
          tool === "c:centroid" &&
          pA.id &&
          pB.id &&
          pC.id &&
          solved3D.owner.has(pA.id)
        ) {
          const built = buildSpatialConstructionElements(
            "c:centroid",
            [pA.id, pB.id, pC.id],
            pageElements,
            solved3D
          );
          dispatcher.batch(() => {
            for (const el of built.elements) {
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  id: el.id,
                  type: el.type,
                  transform: el.transform,
                  style: el.style,
                  props: el.props,
                },
              });
            }
          });
          setPickedItems([]);
          setStatusHint(null);
          setActiveTool("select");
          return true;
        }

        const center =
          tool === "c:centroid"
            ? centroid2D(pA.pos, pB.pos, pC.pos)
            : tool === "c:ortho"
              ? orthocenter2D(pA.pos, pB.pos, pC.pos)
              : tool === "c:circum"
                ? circumcenter2D(pA.pos, pB.pos, pC.pos)
                : incenter2D(pA.pos, pB.pos, pC.pos);
        if (center) {
          const ptName =
            tool === "c:centroid"
              ? "G"
              : tool === "c:ortho"
                ? "H"
                : tool === "c:circum"
                  ? "O"
                  : "I";
          const ptId = newElId("pt");
          dispatcher.batch(() => {
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: ptId,
                type: "GeomPoint",
                transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
                props: { name: ptName, constraint: { kind: "free" } },
              },
            });
            if (tool === "c:circum" || tool === "c:incircle") {
              const r =
                tool === "c:circum"
                  ? dist2D(center, pA.pos)
                  : (() => {
                      const f = footOfPerpendicular(center, pA.pos, pB.pos);
                      return f ? dist2D(center, f) : 1;
                    })();
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "GeomCircle",
                  style: { stroke: "#0891b2", width: 2 },
                  props: { center: ptId, radius: { kind: "value", v: r } },
                },
              });
            }
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 3. Midpoint / Perpendicular Bisector
      if (tool === "c:midpoint" || tool === "c:perpbis") {
        if (pickedItems.length === 0 && nearEdge && !nearPt) {
          const mid = midpoint2D(nearEdge.a, nearEdge.b);
          if (tool === "c:midpoint") {
            const name = getNextPointName(pageElements, ["M", "N", "P", "Q"]);
            dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomPoint",
                transform: { x: mid.x, y: mid.y, scale: 1, rotation: 0, z: 0 },
                props: {
                  name,
                  constraint:
                    nearEdge.aId &&
                    nearEdge.bId &&
                    (byId.has(nearEdge.aId) || solved3D.owner.has(nearEdge.aId)) &&
                    (byId.has(nearEdge.bId) || solved3D.owner.has(nearEdge.bId))
                      ? { kind: "midpointOf", a: nearEdge.aId, b: nearEdge.bId }
                      : { kind: "free" },
                },
              },
            });
          } else {
            const dx = nearEdge.b.x - nearEdge.a.x;
            const dy = nearEdge.b.y - nearEdge.a.y;
            const len = Math.hypot(dx, dy) || 1;
            const span = Math.max(1.2, Math.min(len * 0.65, 5.5));
            const nx = -dy / len;
            const ny = dx / len;
            dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomConstruction",
                props: {
                  kind: "perpBisector",
                  ...(nearEdge.aId && nearEdge.bId
                    ? { sideA: nearEdge.aId, sideB: nearEdge.bId }
                    : {}),
                  fromPt: { x: mid.x - nx * span, y: mid.y - ny * span },
                  toPt: { x: mid.x + nx * span, y: mid.y + ny * span },
                  sideAPt: nearEdge.a,
                  sideBPt: nearEdge.b,
                },
              },
            });
          }
          setStatusHint(null);
          setActiveTool("select");
          return true;
        }
        const nextPicked = [
          ...pickedItems,
          { kind: "point" as const, id: nearPt?.id, pos: nearPt?.pos ?? worldPos },
        ];
        if (nextPicked.length < 2) {
          setPickedItems(nextPicked);
          setStatusHint("Chọn điểm thứ hai");
          return true;
        }
        const [p1, p2] = nextPicked;
        const mid = midpoint2D(p1.pos, p2.pos);
        if (tool === "c:midpoint") {
          const name = getNextPointName(pageElements, ["M", "N", "P", "Q"]);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: mid.x, y: mid.y, scale: 1, rotation: 0, z: 0 },
              props: {
                name,
                constraint:
                  p1.id &&
                  p2.id &&
                  (byId.has(p1.id) || solved3D.owner.has(p1.id)) &&
                  (byId.has(p2.id) || solved3D.owner.has(p2.id))
                    ? { kind: "midpointOf", a: p1.id, b: p2.id }
                    : { kind: "free" },
              },
            },
          });
        } else {
          const dx = p2.pos.x - p1.pos.x;
          const dy = p2.pos.y - p1.pos.y;
          const len = Math.hypot(dx, dy) || 1;
          const span = Math.max(1.2, Math.min(len * 0.65, 5.5));
          const nx = -dy / len;
          const ny = dx / len;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomConstruction",
              props: {
                kind: "perpBisector",
                ...(p1.id && p2.id ? { sideA: p1.id, sideB: p2.id } : {}),
                fromPt: { x: mid.x - nx * span, y: mid.y - ny * span },
                toPt: { x: mid.x + nx * span, y: mid.y + ny * span },
                sideAPt: p1.pos,
                sideBPt: p2.pos,
              },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 4. Point on line / circle (`c:onedge`)
      if (tool === "c:onedge") {
        const snapped = snapPointAtCursor(worldPos, 30);
        const pos = snapped.point;
        const name = getNextPointName(pageElements, [
          "M",
          "N",
          "P",
          "Q",
          "K",
          "H",
          "E",
          "F",
          "I",
          "J",
        ]);
        dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "GeomPoint",
            transform: { x: pos.x, y: pos.y, scale: 1, rotation: 0, z: 0 },
            props: { name, constraint: snapped.constraint },
          },
        });
        return true;
      }

      // 5. Perpendicular / Parallel
      if (tool === "c:perp" || tool === "c:parallel" || tool === "c:perp3d") {
        if (pickedItems.length === 0) {
          if (nearEdge && !nearPt) {
            setPickedItems([
              {
                kind: "segment",
                id: nearEdge.id,
                pos: worldPos,
                segA: nearEdge.a,
                segB: nearEdge.b,
                segAId: nearEdge.aId,
                segBId: nearEdge.bId,
              },
            ]);
            setStatusHint("Chọn điểm đi qua");
            return true;
          }
          if (nearPt) {
            setPickedItems([
              { kind: "point", id: nearPt.id, pos: nearPt.pos },
            ]);
            setStatusHint("Chọn đường thẳng hoặc đoạn thẳng");
            return true;
          }
          return true;
        }
        const first = pickedItems[0];
        const seg =
          first.kind === "segment"
            ? first
            : nearEdge
              ? {
                  segA: nearEdge.a,
                  segB: nearEdge.b,
                  segAId: nearEdge.aId,
                  segBId: nearEdge.bId,
                }
              : null;
        const ptId = first.kind === "point" ? first.id : nearPt?.id;
        const pt = first.kind === "point" ? first.pos : (nearPt?.pos ?? worldPos);
        if (seg?.segA && seg?.segB) {
          const p3P = ptId ? solved3D.p3.get(ptId) : undefined;
          const p3A = seg.segAId ? solved3D.p3.get(seg.segAId) : undefined;
          const p3B = seg.segBId ? solved3D.p3.get(seg.segBId) : undefined;
          if (
            tool === "c:perp3d" &&
            ptId &&
            seg.segAId &&
            seg.segBId &&
            p3P &&
            p3A &&
            p3B
          ) {
            const dx3 = p3B.x - p3A.x;
            const dy3 = p3B.y - p3A.y;
            const dz3 = p3B.z - p3A.z;
            const lenSq3 = dx3 * dx3 + dy3 * dy3 + dz3 * dz3;
            if (lenSq3 > 1e-9) {
              const t =
                ((p3P.x - p3A.x) * dx3 +
                  (p3P.y - p3A.y) * dy3 +
                  (p3P.z - p3A.z) * dz3) /
                lenSq3;
              const foot2D = {
                x: seg.segA.x + t * (seg.segB.x - seg.segA.x),
                y: seg.segA.y + t * (seg.segB.y - seg.segA.y),
              };
              const footId = newElId("pt");
              const footName = getNextPointName(pageElements, ["H", "K", "M", "N"]);
              dispatcher.batch(() => {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: footId,
                    type: "GeomPoint",
                    transform: { x: foot2D.x, y: foot2D.y, scale: 1, rotation: 0, z: 0 },
                    props: {
                      name: footName,
                      constraint: {
                        kind: "foot",
                        p: ptId,
                        a: seg.segAId!,
                        b: seg.segBId!,
                      },
                    },
                  },
                });
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    type: "GeomSegment",
                    style: { stroke: "#0f766e", width: 2, dash: true },
                    props: { from: ptId, to: footId },
                  },
                });
              });
              setPickedItems([]);
              setStatusHint(null);
              setActiveTool("select");
              return true;
            }
          }
          const dx = seg.segB.x - seg.segA.x;
          const dy = seg.segB.y - seg.segA.y;
          const isPerp = tool === "c:perp" || tool === "c:perp3d";
          const vx = isPerp ? -dy : dx;
          const vy = isPerp ? dx : dy;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomConstruction",
              props: {
                kind: isPerp ? "perp" : "parallel",
                ...(ptId && seg.segAId && seg.segBId
                  ? { from: ptId, sideA: seg.segAId, sideB: seg.segBId }
                  : {}),
                fromPt: { x: pt.x - vx * 0.7, y: pt.y - vy * 0.7 },
                toPt: { x: pt.x + vx * 0.7, y: pt.y + vy * 0.7 },
                sideAPt: seg.segA,
                sideBPt: seg.segB,
              },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 6. Intersection (`c:intersect`)
      if (tool === "c:intersect") {
        const hitSeg = nearEdge && byId.get(nearEdge.id);
        const pickedTarget = nearCirc
          ? { kind: "circle" as const, id: nearCirc.el.id, pos: worldPos }
          : nearEdge
            ? {
                kind: "segment" as const,
                id: hitSeg?.id ?? nearEdge.id,
                pos: worldPos,
                segA: nearEdge.a,
                segB: nearEdge.b,
                segAId: nearEdge.aId,
                segBId: nearEdge.bId,
              }
            : null;
        if (!pickedTarget) return true;
        if (pickedItems.length === 0) {
          setPickedItems([pickedTarget]);
          setStatusHint("Chọn đường hoặc đường tròn thứ hai");
          return true;
        }
        const first = pickedItems[0];
        const l1 =
          first.kind === "segment" && first.segA && first.segB
            ? {
                px: first.segA.x,
                py: first.segA.y,
                dx: first.segB.x - first.segA.x,
                dy: first.segB.y - first.segA.y,
              }
            : first.id
              ? resolveLineGeometry(byId.get(first.id), (id) => hydratedPts.get(id), byId)
              : null;
        const l2 =
          pickedTarget.kind === "segment" && pickedTarget.segA && pickedTarget.segB
            ? {
                px: pickedTarget.segA.x,
                py: pickedTarget.segA.y,
                dx: pickedTarget.segB.x - pickedTarget.segA.x,
                dy: pickedTarget.segB.y - pickedTarget.segA.y,
              }
            : pickedTarget.id
              ? resolveLineGeometry(byId.get(pickedTarget.id), (id) => hydratedPts.get(id), byId)
              : null;

        const firstEl = first.id ? byId.get(first.id) : undefined;
        const secondEl = pickedTarget.id ? byId.get(pickedTarget.id) : undefined;
        const a1Id =
          first.segAId ??
          (typeof firstEl?.props.from === "string" ? firstEl.props.from : undefined);
        const b1Id =
          first.segBId ??
          (typeof firstEl?.props.to === "string" ? firstEl.props.to : undefined);
        const a2Id =
          pickedTarget.segAId ??
          (typeof secondEl?.props.from === "string" ? secondEl.props.from : undefined);
        const b2Id =
          pickedTarget.segBId ??
          (typeof secondEl?.props.to === "string" ? secondEl.props.to : undefined);
        const p3A1 = a1Id ? solved3D.p3.get(a1Id) : undefined;
        const p3B1 = b1Id ? solved3D.p3.get(b1Id) : undefined;
        const p3A2 = a2Id ? solved3D.p3.get(a2Id) : undefined;
        const p3B2 = b2Id ? solved3D.p3.get(b2Id) : undefined;
        const skew =
          l1 && l2 && p3A1 && p3B1 && p3A2 && p3B2
            ? skewLineClosest(p3A1, p3B1, p3A2, p3B2)
            : null;
        if (skew && skew.normalizedGap > 0.04) {
          setPickedItems([]);
          setStatusHint("Hai đường thẳng chéo nhau trong không gian — không đồng phẳng!");
          setActiveTool("select");
          return true;
        }

        let inter: Point2D | null = null;
        if (l1 && l2) {
          inter = intersectLines2D(l1, l2);
        } else if (l1 && nearCirc) {
          inter = intersectLineCircleAt(l1, { cx: nearCirc.center.x, cy: nearCirc.center.y, r: nearCirc.r }, 0);
        } else if (l2 && first.kind === "circle" && first.id) {
          const cEl = byId.get(first.id);
          const cPt = cEl ? hydratedPts.get(String(cEl.props.center ?? "")) : undefined;
          const r = cPt && cEl ? resolveCircleRadius(cEl.props.radius as Parameters<typeof resolveCircleRadius>[0], cPt, (id) => hydratedPts.get(id)) : null;
          if (cPt && r !== null) {
            inter = intersectLineCircleAt(l2, { cx: cPt.x, cy: cPt.y, r }, 0);
          }
        }
        if (inter) {
          const name = getNextPointName(pageElements, ["I", "K", "M", "N"]);
          const constraint: PointConstraint =
            l1 && l2 && firstEl && secondEl
              ? { kind: "intersection", a: firstEl.id, b: secondEl.id }
              : skew &&
                  a1Id &&
                  b1Id &&
                  (byId.has(a1Id) || solved3D.owner.has(a1Id)) &&
                  (byId.has(b1Id) || solved3D.owner.has(b1Id))
                ? { kind: "onLine", a: a1Id, b: b1Id, t: skew.t }
                : { kind: "free" };
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: inter.x, y: inter.y, scale: 1, rotation: 0, z: 0 },
              props: { name, constraint },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 7. Tangent (`c:tangent`)
      if (tool === "c:tangent") {
        if (pickedItems.length === 0) {
          if (nearCirc && (!nearPt || dist2D(nearPt.pos, nearCirc.center) < nearCirc.r * 0.6)) {
            setPickedItems([
              { kind: "circle", id: nearCirc.el.id, pos: nearCirc.center },
            ]);
            setStatusHint("Chọn điểm nằm ngoài hoặc trên đường tròn");
          } else if (nearPt) {
            setPickedItems([{ kind: "point", id: nearPt.id, pos: nearPt.pos }]);
            setStatusHint("Chọn đường tròn");
          } else if (nearCirc) {
            setPickedItems([
              { kind: "circle", id: nearCirc.el.id, pos: nearCirc.center },
            ]);
            setStatusHint("Chọn điểm nằm ngoài hoặc trên đường tròn");
          }
          return true;
        }
        const first = pickedItems[0];
        const circ = nearCirc ?? (first.kind === "circle" && first.id ? (() => {
          const cEl = byId.get(first.id);
          const cPt = cEl ? hydratedPts.get(String(cEl.props.center ?? "")) : undefined;
          const r = cEl && cPt ? resolveCircleRadius(cEl.props.radius as Parameters<typeof resolveCircleRadius>[0], cPt, (id) => hydratedPts.get(id)) : null;
          return cEl && cPt && r !== null ? { el: cEl, center: cPt, centerId: String(cEl.props.center), r } : null;
        })() : null);

        let ptId = first.kind === "point" ? first.id : nearPt?.id;
        let pt = first.kind === "point" ? first.pos : (nearPt?.pos ?? worldPos);
        if (circ) {
          if (first.kind === "circle" && !nearPt) {
            const onRim = snapPointAtCursor(worldPos, 24);
            pt = onRim.constraint.kind !== "free" ? onRim.point : worldPos;
          }
          const d = dist2D(pt, circ.center);
          if (d < circ.r - 0.08) {
            setStatusHint(
              "Điểm nằm trong đường tròn — không kẻ được tiếp tuyến."
            );
            setPickedItems([]);
            return true;
          }
          dispatcher.batch(() => {
            if (!ptId) {
              ptId = newElId("pt");
              const pName = getNextPointName(pageElements, ["M", "N", "P", "A"]);
              const onRim = Math.abs(d - circ.r) <= 0.08;
              const angle = Math.atan2(pt.y - circ.center.y, pt.x - circ.center.x);
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  id: ptId,
                  type: "GeomPoint",
                  transform: { x: pt.x, y: pt.y, scale: 1, rotation: 0, z: 0 },
                  props: {
                    name: pName,
                    constraint: onRim
                      ? { kind: "onObject", target: circ.el.id, t: angle }
                      : { kind: "free" },
                  },
                },
              });
            }
            if (Math.abs(d - circ.r) <= 0.08) {
              const ux = (pt.x - circ.center.x) / (d || 1);
              const uy = (pt.y - circ.center.y) / (d || 1);
              const touch = { x: circ.center.x + ux * circ.r, y: circ.center.y + uy * circ.r };
              const span = Math.max(1.8, circ.r * 1.35);
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "GeomConstruction",
                  props: {
                    kind: "tangent",
                    from: ptId,
                    circle: circ.el.id,
                    fromPt: { x: touch.x + uy * span, y: touch.y - ux * span },
                    toPt: { x: touch.x - uy * span, y: touch.y + ux * span },
                    sideAPt: circ.center,
                    sideBPt: touch,
                  },
                },
              });
            } else {
              for (const side of [0, 1] as const) {
                const tPt = tangentPointToCircle(
                  pt,
                  { cx: circ.center.x, cy: circ.center.y, r: circ.r },
                  side
                );
                if (!tPt) continue;
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    type: "GeomConstruction",
                    props: {
                      kind: "tangent",
                      from: ptId,
                      circle: circ.el.id,
                      tangentSide: side,
                      fromPt: pt,
                      toPt: tPt,
                      sideAPt: circ.center,
                      sideBPt: tPt,
                    },
                  },
                });
              }
            }
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 8. Diameter (`c:diameter`)
      if (tool === "c:diameter") {
        const nextPicked = [
          ...pickedItems,
          { kind: "point" as const, id: nearPt?.id, pos: nearPt?.pos ?? worldPos },
        ];
        if (nextPicked.length < 2) {
          setPickedItems(nextPicked);
          setStatusHint("Chọn điểm trên đường tròn");
          return true;
        }
        const [center, onPt] = nextPicked;
        const other = reflectPointOverPoint(onPt.pos, center.pos);
        const id = newElId("diam");
        dispatcher.dispatch({
          type: "object.create",
          params: {
            id,
            type: "GeomSegment",
            props: {
              from: `${id}_a`,
              to: `${id}_b`,
              fromPt: onPt.pos,
              toPt: other,
            },
          },
        });
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 9. Reflection (`c:reflect`)
      if (tool === "c:reflect") {
        if (pickedItems.length === 0) {
          setPickedItems([
            { kind: "point", id: nearPt?.id, pos: nearPt?.pos ?? worldPos },
          ]);
          setStatusHint("Chọn tâm đối xứng hoặc đường đối xứng");
          return true;
        }
        const src = pickedItems[0];
        let mirrored: Point2D | null = null;
        if (nearEdge && !nearPt) {
          mirrored = reflectPointOverLine(src.pos, nearEdge.a, nearEdge.b);
        } else {
          mirrored = reflectPointOverPoint(src.pos, nearPt?.pos ?? worldPos);
        }
        if (mirrored) {
          const name = getNextPointName(pageElements);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: mirrored.x, y: mirrored.y, scale: 1, rotation: 0, z: 0 },
              props: { name, constraint: { kind: "free" } },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 10. Angle by degree (`c:angleval`)
      if (tool === "c:angleval") {
        const ptPos = nearPt?.pos ?? worldPos;
        const next = [
          ...pickedItems,
          { kind: "point" as const, id: nearPt?.id, pos: ptPos },
        ];
        if (next.length < 2) {
          setPickedItems(next);
          setStatusHint("Chọn đỉnh của góc");
          return true;
        }
        setAngleDialog({
          vertexId: next[1].id ?? newElId("angv"),
          armId: next[0].id ?? newElId("anga"),
          vertexPos: next[1].pos,
          armPos: next[0].pos,
        });
        setPickedItems([]);
        setStatusHint(null);
        setActiveTool("select");
        return true;
      }

      // 11. 3D Face Extraction (`c:flatten`: 1st click near solid face + 2nd click placement, OR 3 vertex clicks)
      if (tool === "c:flatten") {
        if (pickedItems.length === 0) {
          // Check if user clicked on a 3D solid (even interior) -> detect top/front 3 vertices
          if (!nearPt) {
            for (const el of pageElements) {
              if (el.type !== "Solid3D") continue;
              const ptIds = Array.isArray(el.props.points) ? (el.props.points as string[]) : [];
              const kind = (el.props.kind ?? "pyramid") as Solid3DKind;
              const pts2d = ptIds.map((id) => hydratedPts.get(id)).filter((p): p is Point2D => Boolean(p));
              const lift = solved3D.lifts.get(el.id) ?? (pts2d.length === ptIds.length ? liftSolidTo3D(kind, pts2d) : null);
              if (lift) {
                const hitFace = lift.faces.find((face) => {
                  const poly = face.map((idx) => pts2d[idx]).filter(Boolean);
                  return poly.length >= 3 && pointInPolygon2D(poly, worldPos);
                }) ?? lift.faces[0];
                if (hitFace && hitFace.length >= 3) {
                  setPickedItems([
                    {
                      kind: "solidFace",
                      id: el.id,
                      pos: worldPos,
                      faceIds: hitFace.slice(0, 3).map((idx) => ptIds[idx]),
                    },
                  ]);
                  setStatusHint("Bấm vào vị trí bên cạnh để đặt hình phẳng thật");
                  return true;
                }
              }
            }
          }
          if (nearPt) {
            setPickedItems([{ kind: "point", id: nearPt.id, pos: nearPt.pos }]);
            setStatusHint("Chọn thêm 2 đỉnh của mặt cần tách");
          }
          return true;
        }

        const first = pickedItems[0];
        if (first.kind === "solidFace" && first.faceIds && first.faceIds.length >= 3) {
          const flat = computeFlattenedFace(
            [first.faceIds[0], first.faceIds[1], first.faceIds[2]],
            solved3D,
            pageElements,
            worldPos
          );
          if (flat) {
            const polyEl = flat.polygonElement;
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: polyEl.id,
                type: polyEl.type,
                transform: polyEl.transform,
                style: polyEl.style,
                props: polyEl.props,
              },
            });
          }
          setPickedItems([]);
          setStatusHint(null);
          setActiveTool("select");
          return true;
        }

        if (nearPt) {
          const next = [...pickedItems, { kind: "point" as const, id: nearPt.id, pos: nearPt.pos }];
          if (next.length < 3) {
            setPickedItems(next);
            setStatusHint("Chọn đỉnh thứ 3 của mặt");
            return true;
          }
          const faceIds = next.map((n) => n.id).filter((id): id is string => Boolean(id));
          if (faceIds.length === 3) {
            const flat = computeFlattenedFace(
              [faceIds[0], faceIds[1], faceIds[2]],
              solved3D,
              pageElements
            );
            if (flat) {
              const polyEl = flat.polygonElement;
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  id: polyEl.id,
                  type: polyEl.type,
                  transform: polyEl.transform,
                  style: polyEl.style,
                  props: polyEl.props,
                },
              });
            }
          }
          setPickedItems([]);
          setStatusHint(null);
          setActiveTool("select");
          return true;
        }
        return true;
      }

      // 11b. 3D Net Unfolding (`c:unfold`: Click any Solid3D to unfold all faces into 2D printable net)
      if (tool === "c:unfold") {
        let hitSolid: CanvasElement | undefined;
        if (nearPt?.id) {
          const ownerId = solved3D.owner.get(nearPt.id);
          if (ownerId) hitSolid = byId.get(ownerId);
        }
        if (!hitSolid) {
          for (const el of pageElements) {
            if (el.type !== "Solid3D") continue;
            const ptIds = Array.isArray(el.props.points) ? (el.props.points as string[]) : [];
            const kind = (el.props.kind ?? "pyramid") as Solid3DKind;
            const pts2d = ptIds.map((id) => hydratedPts.get(id)).filter((p): p is Point2D => Boolean(p));
            const lift = pts2d.length === ptIds.length ? liftSolidTo3D(kind, pts2d) : null;
            if (lift) {
              const inside = lift.faces.some((face) => {
                const poly = face.map((idx) => pts2d[idx]).filter(Boolean);
                return poly.length >= 3 && pointInPolygon2D(poly, worldPos);
              });
              if (inside) {
                hitSolid = el;
                break;
              }
            }
          }
        }

        if (hitSolid) {
          const netRes = computeUnfoldedPolyhedronNet(hitSolid.id, solved3D, pageElements);
          if (netRes && netRes.polygons.length > 0) {
            dispatcher.batch(() => {
              netRes.polygons.forEach((polyEl) => {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: polyEl.id,
                    type: polyEl.type,
                    transform: polyEl.transform,
                    style: polyEl.style,
                    props: polyEl.props,
                  },
                });
              });
              netRes.points?.forEach((ptEl) => {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: ptEl.id,
                    type: ptEl.type,
                    transform: ptEl.transform,
                    style: ptEl.style,
                    props: ptEl.props,
                  },
                });
              });
            });
            const ptsCount = netRes.points?.length ?? 0;
            setStatusHint(
              `✓ Đã trải phẳng ${netRes.polygons.length} mặt của khối${ptsCount > 0 ? ` cùng ${ptsCount} điểm đặc biệt` : ""}`
            );
          } else {
            setStatusHint("Không thể trải phẳng khối này (chỉ hỗ trợ hình chóp, lăng trụ, hộp chữ nhật, lập phương)");
          }
        } else {
          setStatusHint("Vui lòng bấm vào một khối 3D để trải phẳng");
        }
        setActiveTool("select");
        return true;
      }

      // 12. 3D Cross-Section (`c:section`), Circumsphere (`c:circumsphere`), & Spatial Measurements
      if (tool === "plane") {
        const createdEls = createPlaneParallelogramElements(worldPos, pageElements);
        dispatcher.batch(() => {
          for (const el of createdEls) {
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: el.id,
                type: el.type,
                transform: el.transform,
                style: el.style,
                props: el.props,
              },
            });
          }
        });
        setActiveTool("select");
        return true;
      }

      if (
        tool === "c:section" ||
        tool === "c:circumsphere" ||
        tool === "c:lineplane" ||
        tool === "c:giaotuyen" ||
        tool === "c:footplane" ||
        tool === "c:distplane" ||
        tool === "c:commonperp" ||
        tool === "c:measure" ||
        tool === "c:anglelp" ||
        tool === "c:angleplanes" ||
        tool === "c:boxrule"
      ) {
        if (!nearPt?.id) return true;
        const nextIds = [
          ...pickedItems.map((p) => p.id).filter((x): x is string => Boolean(x)),
          nearPt.id,
        ];
        const needed =
          tool === "c:circumsphere"
            ? 1
            : tool === "c:section" || tool === "c:measure"
              ? 3
              : tool === "c:footplane" ||
                  tool === "c:distplane" ||
                  tool === "c:commonperp" ||
                  tool === "c:boxrule" ||
                  tool === "c:anglelp"
                ? 4
                : tool === "c:lineplane"
                  ? 5
                  : 6;

        if (nextIds.length < needed) {
          setPickedItems([
            ...pickedItems,
            { kind: "point", id: nearPt.id, pos: nearPt.pos },
          ]);
          setStatusHint(`Đã chọn ${nextIds.length}/${needed} điểm`);
          return true;
        }

        if (tool === "c:section") {
          const ownerId = nextIds
            .map((id) => {
              if (solved3D.owner.get(id)) return solved3D.owner.get(id);
              for (const el of pageElements) {
                if (el.type === "Solid3D" && Array.isArray(el.props.points) && (el.props.points as string[]).includes(id)) {
                  return el.id;
                }
              }
              return undefined;
            })
            .find((id): id is string => Boolean(id));
          const solidEl = ownerId ? byId.get(ownerId) : undefined;
          if (!solidEl || solidEl.type !== "Solid3D") {
            setStatusHint(
              "Vui lòng chọn 3 điểm thuộc hoặc nằm trên các cạnh/mặt của một khối 3D."
            );
          } else {
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: newElId("sec"),
                type: "RoundSection",
                style: { stroke: "#e8590c", fill: "rgba(240,140,0,0.35)", width: 2 },
                props: { solid: solidEl.id, points: [nextIds[0], nextIds[1], nextIds[2]] },
              },
            });
            setStatusHint(null);
          }
        } else {
          const built = buildSpatialConstructionElements(
            tool,
            nextIds,
            pageElements,
            solved3D
          );
          if (built.error) {
            setStatusHint(built.error);
          } else {
            dispatcher.batch(() => {
              for (const el of built.elements) {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: el.id,
                    type: el.type,
                    transform: el.transform,
                    style: el.style,
                    props: el.props,
                  },
                });
              }
            });
            setStatusHint(null);
          }
        }
        setPickedItems([]);
        setActiveTool("select");
        return true;
      }

      return false;
    },
    [
      findNearestPoint,
      findNearestEdgeOrSegment,
      findNearestCircle,
      snapPointAtCursor,
      pickedItems,
      byId,
      pageElements,
      dispatcher,
      hydratedPts,
      solved3D,
    ]
  );

  // --- Transform Handles & Element Pointer Handlers ---
  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent, handle: TransformHandle) => {
      // Allow 1-finger touch or stylus to drag the resize squares (TransformHandles)
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore capture errors
      }
      resizeStartRef.current = {
        handle,
        initHandlePos: { x: handle.x, y: handle.y },
        initialElements: JSON.parse(JSON.stringify(selectedElements)),
      };
      dispatcher.gesture(true);
    },
    [dispatcher, selectedElements]
  );

  // Build drag map for selected elements including geometric & Cartesian/function dependencies
  const buildDragTransformMap = useCallback(
    (elementsToDrag: CanvasElement[]) => {
      const map = new Map<string, { x: number; y: number }>();
      const addEl = (el: CanvasElement) => {
        if (!map.has(el.id)) {
          map.set(el.id, { x: el.transform.x, y: el.transform.y });
        }
      };

      for (const el of elementsToDrag) {
        addEl(el);

        // 1. Also move referenced free points when dragging a segment/circle/polygon
        const refIds: string[] = [];
        if (typeof el.props?.from === "string") refIds.push(el.props.from);
        if (typeof el.props?.to === "string") refIds.push(el.props.to);
        if (typeof el.props?.center === "string") refIds.push(el.props.center);
        if (Array.isArray(el.props?.vertices)) {
          for (const vid of el.props.vertices) {
            if (typeof vid === "string") refIds.push(vid);
          }
        }
        for (const rid of refIds) {
          const refEl = byId.get(rid);
          if (refEl) addEl(refEl);
        }

        // 2. LineDecor dependencies
        for (const other of pageElements) {
          if (other.type === "LineDecor" && other.props?.target === el.id) {
            addEl(other);
          }
        }
        if (el.type === "LineDecor" && typeof el.props?.target === "string") {
          const targetSeg = byId.get(el.props.target);
          if (targetSeg) {
            addEl(targetSeg);
            if (typeof targetSeg.props?.from === "string") {
              const pA = byId.get(targetSeg.props.from);
              if (pA) addEl(pA);
            }
            if (typeof targetSeg.props?.to === "string") {
              const pB = byId.get(targetSeg.props.to);
              if (pB) addEl(pB);
            }
          }
        }

        // 3. Cartesian Axes2D & Function/Graph dependencies
        // If dragging a function curve/plot/conic/tangent/area/slider linked to Axes2D, move the axes (and sibling plots/sliders) too!
        if (
          el.type === "Plot" ||
          el.type === "Conic" ||
          el.type === "Curve2D" ||
          el.type === "GraphTangent" ||
          el.type === "GraphArea" ||
          el.type === "Slider"
        ) {
          const linkedAxesId =
            typeof el.props?.axes === "string"
              ? el.props.axes
              : pageElements.find((cand) => cand.type === "Axes2D")?.id;
          if (linkedAxesId) {
            const axesEl = byId.get(linkedAxesId);
            if (axesEl) {
              addEl(axesEl);
              // Also add all items attached to this axes
              for (const other of pageElements) {
                if (
                  other.props?.axes === linkedAxesId ||
                  (other.props?.constraint as { kind?: string; axes?: string } | undefined)?.axes === linkedAxesId
                ) {
                  addEl(other);
                }
              }
            }
          }
        }

        // If dragging Axes2D or Axes3D, move all attached plots, curves, conics, tangents, areas, sliders, oxy-points
        if (el.type === "Axes2D" || el.type === "Axes3D") {
          for (const other of pageElements) {
            if (
              other.props?.axes === el.id ||
              (other.props?.constraint as { kind?: string; axes?: string } | undefined)?.axes === el.id
            ) {
              addEl(other);
            }
          }
        }

        // If point has constraint to axes (e.g. oxy or oxyz)
        const constraintAxes = (el.props?.constraint as { kind?: string; axes?: string } | undefined)?.axes;
        if (constraintAxes) {
          const axesEl = byId.get(constraintAxes);
          if (axesEl) {
            addEl(axesEl);
            for (const other of pageElements) {
              if (
                other.props?.axes === constraintAxes ||
                (other.props?.constraint as { kind?: string; axes?: string } | undefined)?.axes === constraintAxes
              ) {
                addEl(other);
              }
            }
          }
        }
      }

      return map;
    },
    [byId, pageElements]
  );

  const handleBoxPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (penOnlyMode && e.pointerType === "touch") {
        navPointerDown(e as unknown as React.PointerEvent<SVGSVGElement>);
        return;
      }
      e.stopPropagation();
      const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
      if (!containerRectRef.current && rect) {
        containerRectRef.current = rect;
      }
      const worldPos = screenToWorld(
        e.clientX,
        e.clientY,
        viewport.tx,
        viewport.ty,
        viewport.scale,
        rect
      );
      const map = buildDragTransformMap(selectedElements);
      dragBoxStartRef.current = {
        startX: worldPos.x,
        startY: worldPos.y,
        initialTransforms: map,
      };
      dispatcher.gesture(true);
    },
    [dispatcher, containerRef, viewport, selectedElements, penOnlyMode, navPointerDown, buildDragTransformMap]
  );

  const lastLockedTapRef = useRef<{ id: string; time: number; x: number; y: number } | null>(null);

  const handleElementPointerDown = useCallback(
    (e: React.PointerEvent, elementId: string) => {
      if (penOnlyMode && e.pointerType === "touch") {
        navPointerDown(e as unknown as React.PointerEvent<SVGSVGElement>);
        return;
      }
      if (activeTool === "erase") return;

      // Locked element: ignore single taps so writing/drawing passes through,
      // but double-tap/double-click in Select mode unlocks ONLY that specific element.
      const targetEl = byId.get(elementId);
      if (targetEl?.props?.locked || targetEl?.style?.locked) {
        if (
          activeTool === null ||
          activeTool === "select" ||
          activeTool === "select:marquee"
        ) {
          const now = Date.now();
          const prev = lastLockedTapRef.current;
          if (
            prev &&
            prev.id === elementId &&
            now - prev.time < 380 &&
            Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 24
          ) {
            lastLockedTapRef.current = null;
            e.stopPropagation();
            handleUnlockElement(elementId);
            return;
          }
          lastLockedTapRef.current = { id: elementId, time: now, x: e.clientX, y: e.clientY };
        }
        return;
      }

      if (
        activeTool === null ||
        activeTool === "select" ||
        activeTool === "select:marquee"
      ) {
        e.stopPropagation();
        let resolvedId = elementId;
        let nextSubSel: SolidSubSelection | null = null;
        const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
      if (!containerRectRef.current && rect) {
        containerRectRef.current = rect;
      }
        const worldPos = screenToWorld(
          e.clientX,
          e.clientY,
          viewport.tx,
          viewport.ty,
          viewport.scale,
          rect
        );

        if (!e.shiftKey) {
          const threshold = 14 / (viewport.scale || 45);
          let bestDist = Infinity;
          for (const el of pageElements) {
            if (el.style?.hidden) continue;
            if (el.type !== "Point" && el.type !== "GeomPoint") continue;
            const ptPos = hydratedPts.get(el.id) ?? {
              x: el.transform.x,
              y: el.transform.y,
            };
            const d = dist2D(worldPos, ptPos);
            if (d <= threshold && d < bestDist) {
              bestDist = d;
              resolvedId = el.id;
            }
          }
          const hitEl = byId.get(resolvedId);
          if (hitEl?.type === "Solid3D") {
            nextSubSel = resolveSolidSubSelectionAtPoint(
              hitEl,
              worldPos,
              solved3D,
              hydratedPts,
              byId,
              10 / (viewport.scale || 45)
            );
          }
        }

        let nextSelectedIds = selectedIds;
        if (e.shiftKey) {
          setSolidSubSel(null);
          nextSelectedIds = selectedIds.includes(resolvedId)
            ? selectedIds.filter((id) => id !== resolvedId)
            : [...selectedIds, resolvedId];
          setSelectedIds(nextSelectedIds);
        } else {
          setSolidSubSel(nextSubSel);
          if (selectedIds.length !== 1 || selectedIds[0] !== resolvedId) {
            nextSelectedIds = [resolvedId];
            setSelectedIds(nextSelectedIds);
          }
        }

        const clickedEl = byId.get(resolvedId);
        if (
          clickedEl &&
          (clickedEl.type === "Solid3D" || clickedEl.type === "Axes3D")
        ) {
          setOrbitActiveId(clickedEl.id);
        } else {
          setOrbitActiveId(null);
        }

        // Initialize drag immediately on element pointerdown so dragging starts smoothly
        const dragTargets: CanvasElement[] = [];
        for (const id of nextSelectedIds) {
          const target = byId.get(id);
          if (target) dragTargets.push(target);
        }
        if (dragTargets.length > 0) {
          const map = buildDragTransformMap(dragTargets);
          dragBoxStartRef.current = {
            startX: worldPos.x,
            startY: worldPos.y,
            initialTransforms: map,
          };
          dispatcher.gesture(true);
        }
      }
    },
    [
      activeTool,
      selectedIds,
      byId,
      containerRef,
      viewport.tx,
      viewport.ty,
      viewport.scale,
      pageElements,
      hydratedPts,
      solved3D,
      penOnlyMode,
      navPointerDown,
      buildDragTransformMap,
      handleUnlockElement,
      dispatcher,
    ]
  );

  const buildLiveStrokePathData = useCallback(() => {
    if (liveStrokeSnappedRef.current) {
      const previewPts = recognizedShapeToPreviewPoints(
        liveStrokeSnappedRef.current
      );
      if (previewPts.length >= 4) {
        return generateCatmullRomSpline(previewPts);
      }
    }
    const basePts = liveStrokePointsRef.current;
    const tip = liveStrokeTipRef.current;
    const pts = tip ? [...basePts, tip.x, tip.y] : basePts;
    if (pts.length < 2) return "";
    const nib = liveStrokeNibRef.current;
    if (nib === "fountain" || nib === "brush") {
      const baseW = liveStrokeStyleRef.current?.width ?? 2.2;
      const effW = nib === "brush" ? baseW * 1.9 : baseW;
      const pressures = tip
        ? [...liveStrokePressuresRef.current, tip.pressure]
        : liveStrokePressuresRef.current;
      return generateFilledInkPath(
        pts,
        pressures,
        viewport.scale || 45,
        effW,
        nib
      );
    }
    return generateCatmullRomSpline(pts);
  }, [viewport.scale]);

  useLayoutEffect(() => {
    if (!liveStroke || !liveStrokePathRef.current) return;
    const d = buildLiveStrokePathData();
    if (d) {
      liveStrokePathRef.current.setAttribute("d", d);
    }
  }, [liveStroke, buildLiveStrokePathData]);

  // --- Root Canvas Pointer Down ---
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // If Pen-Only mode is enabled: touches from fingers are routed to panning & navigation
      if (penOnlyMode && e.pointerType === "touch") {
        navPointerDown(e);
        return;
      }

      // Check S Pen / Stylus side button (button === 2 or 5, or buttons & 2, or buttons & 32)
      let currentActiveTool = activeTool;
      if (
        e.pointerType === "pen" &&
        spenConfig.action !== "none" &&
        (e.button === 2 || e.button === 5 || (e.buttons & 2) !== 0 || (e.buttons & 32) !== 0)
      ) {
        if (spenConfig.behavior === "hold") {
          if (!spenActiveOverrideRef.current) {
            spenPreviousToolRef.current = activeTool;
            spenActiveOverrideRef.current = true;
          }
          currentActiveTool = spenConfig.action as WhiteboardTool;
          setActiveTool(currentActiveTool);
        } else if (spenConfig.behavior === "toggle") {
          if (activeTool !== spenConfig.action) {
            spenPreviousToolRef.current = activeTool;
            currentActiveTool = spenConfig.action as WhiteboardTool;
            setActiveTool(currentActiveTool);
            if (spenConfig.returnAfterAction) {
              spenActiveOverrideRef.current = true;
            }
          } else if (spenPreviousToolRef.current) {
            currentActiveTool = spenPreviousToolRef.current;
            setActiveTool(currentActiveTool);
            spenPreviousToolRef.current = null;
            spenActiveOverrideRef.current = false;
          }
        }
      }

      const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
      if (!containerRectRef.current && rect) {
        containerRectRef.current = rect;
      }
      const worldPos = screenToWorld(
        e.clientX,
        e.clientY,
        viewport.tx,
        viewport.ty,
        viewport.scale,
        rect
      );

      const isMiddleClick = e.button === 1;
      const isPan = isSpacePressed || isMiddleClick || currentActiveTool === "pan";
      if (isPan) {
        navPointerDown(e);
        return;
      }

      // Select / Marquee
      if (
        currentActiveTool === null ||
        currentActiveTool === "select" ||
        currentActiveTool === "select:marquee"
      ) {
        setSelectedIds([]);
        setOrbitActiveId(null);
        const m = {
          sx: worldPos.x,
          sy: worldPos.y,
          x: worldPos.x,
          y: worldPos.y,
        };
        marqueeRectRef.current = m;
        setMarqueeRect(m);
        return;
      }

      // In continuous A4 mode: strictly only allow writing / drawing inside one of the paper sheets!
      if (isA4Format) {
        if (a4Opt) {
          const targetPage = getA4PageAtPoint(
            worldPos,
            pageCount,
            a4Opt.widthWorld,
            a4Opt.heightWorld,
            0.8
          );
          if (!targetPage) {
            // Cannot start writing, drawing, or placing objects outside the A4 paper sheets
            return;
          }
          activeDrawPageRef.current = targetPage;
        }
      } else {
        activeDrawPageRef.current = currentPage;
      }

      // Contact Eraser
      if (activeTool === "erase") {
        eraserDidEraseRef.current = true;
        checkEraserCollision(worldPos, pageElements, viewport.scale, (id) => {
          dispatcher.deleteObjects([id]);
        });
        return;
      }

      // Formula Tool (`formula` / `text.write`)
      if (activeTool === "formula" || activeTool === "text.write") {
        e.stopPropagation();
        setMathSession({
          worldPos,
          initialLatex: "",
        });
        return;
      }

      // Point Tool (`point` / `geometry.point`)
      if (activeTool === "point" || activeTool === "geometry.point") {
        // If clicking directly on an existing vertex or point, select it instead of creating a duplicate overlapping point
        const nearPt = findNearestPoint(worldPos, 14);
        if (nearPt) {
          if (nearPt.id && byId.has(nearPt.id)) {
            setSelectedIds([nearPt.id]);
          } else if (nearPt.polygonId && byId.has(nearPt.polygonId)) {
            setSelectedIds([nearPt.polygonId]);
          }
          handleSelectTool("select");
          return;
        }

        const snapped = snapPointAtCursor(worldPos, 16);
        const preferredPool =
          snapped.constraint.kind !== "free"
            ? ["M", "N", "P", "Q", "K", "H", "E", "F", "I", "J"]
            : [];
        const name = getNextPointName(pageElements, preferredPool);
        dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "GeomPoint",
            transform: {
              x: snapped.point.x,
              y: snapped.point.y,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            style: { stroke: currentStyle.stroke ?? "#2563eb", width: 2 },
            props: { name, constraint: snapped.constraint },
          },
        });
        return;
      }

      // Segment / Dashed / Line / Ray / Vector / Circle (drag or 2-click)
      if (
        (typeof activeTool === "string" &&
          SEGMENT_LIKE_TOOLS.has(activeTool)) ||
        activeTool === "circle"
      ) {
        const snap = findNearestPoint(worldPos, 24);
        const startPt = snap?.pos ?? worldPos;
        if (draftTwoPtRef.current && !draftTwoPtRef.current.dragging) {
          commitTwoPointShape(
            activeTool,
            draftTwoPtRef.current.start,
            startPt,
            draftTwoPtRef.current.startId,
            snap?.id
          );
          draftTwoPtRef.current = null;
          setDraftPreviewLine(null);
          return;
        }
        draftTwoPtRef.current = {
          tool: activeTool,
          start: startPt,
          startId: snap?.id,
          dragging: true,
        };
        setDraftPreviewLine({ from: startPt, to: startPt, kind: activeTool });
        return;
      }

      // Arbitrary Polygon (`polygon`)
      if (activeTool === "polygon") {
        const snap = findNearestPoint(worldPos, 22);
        const clickPt = snap?.pos ?? worldPos;
        if (draftPolygonPts.length >= 3) {
          const first = draftPolygonPts[0];
          if (dist2D(clickPt, first) <= 22 / (viewport.scale || 45)) {
            commitDraftPolygon();
            return;
          }
        }
        setDraftPolygonPts((prev) => [...prev, clickPt]);
        return;
      }

      // Special Triangles
      if (typeof activeTool === "string" && TRIANGLE_TOOL_KINDS[activeTool]) {
        const triEl = createSpecialTrianglePreset(
          TRIANGLE_TOOL_KINDS[activeTool],
          worldPos,
          pageElements,
          {
            style: currentStyle,
            page: currentPage,
            marksEnabled: getConstructMarksEnabled(),
          }
        );
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            id: triEl.id,
            type: triEl.type,
            transform: triEl.transform,
            style: triEl.style,
            props: triEl.props,
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // Special Quadrilaterals
      if (typeof activeTool === "string" && QUAD_TOOL_KINDS[activeTool]) {
        const quadEl = createSpecialQuadPreset(
          QUAD_TOOL_KINDS[activeTool],
          worldPos,
          pageElements,
          {
            style: currentStyle,
            page: currentPage,
            marksEnabled: getConstructMarksEnabled(),
          }
        );
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            id: quadEl.id,
            type: quadEl.type,
            transform: quadEl.transform,
            style: quadEl.style,
            props: quadEl.props,
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // Flood Fill (`Tô màu`)
      if (
        activeTool === "floodFill" ||
        (typeof activeTool === "string" && activeTool.startsWith("fill:"))
      ) {
        const activeFill =
          typeof activeTool === "string" && activeTool.startsWith("fill:")
            ? activeTool.slice(5)
            : fillColor;
        const fillStyleValue =
          activeFill === "none" ? "transparent" : activeFill;

        // 1. Check 3D solid faces
        for (const el of pageElements) {
          if (el.type !== "Solid3D") continue;
          const ptIds = Array.isArray(el.props.points)
            ? (el.props.points as string[])
            : [];
          const kind = (el.props.kind ?? "pyramid") as Solid3DKind;
          const pts2d = ptIds
            .map((id) => hydratedPts.get(id))
            .filter((p): p is Point2D => Boolean(p));
          const lift =
            pts2d.length === ptIds.length ? liftSolidTo3D(kind, pts2d) : null;
          if (lift) {
            const hitFace = lift.faces.find((face) => {
              const poly = face.map((idx) => pts2d[idx]).filter(Boolean);
              return poly.length >= 3 && pointInPolygon2D(poly, worldPos);
            });
            if (hitFace) {
              const key = hitFace
                .map((idx) => ptIds[idx] ?? String(idx))
                .join("|");
              const nextFaceFill = {
                ...((el.props.faceFill as Record<string, string>) ?? {}),
                [key]: fillStyleValue,
              };
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: el.id,
                  props: { ...el.props, faceFill: nextFaceFill },
                },
              });
              return;
            }
          }
        }

        // 2. Planar flood fill cycle
        const region = findFloodFillRegion(
          pageElements,
          hydratedPts,
          worldPos,
          0.15,
          solved3D.p3
        );
        if (region) {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "FillRegion",
              style: {
                fill: fillStyleValue,
                opacity: activeFill === "none" ? 0 : 0.35,
              },
              props: {
                bounds: region.bounds,
                cycle: region.cycle,
                seed: [worldPos.x, worldPos.y],
                gap: 0.15,
              },
            },
          });
          return;
        }

        // 3. Fallback: direct polygon interior fill
        for (const el of pageElements) {
          if (el.type !== "GeomPolygon") continue;
          const coords: Point2D[] = Array.isArray(el.props.points)
            ? (el.props.points as EmbeddedVertex[]).map((v) => ({
                x: v.x + el.transform.x,
                y: v.y + el.transform.y,
              }))
            : [];
          if (coords.length >= 3 && pointInPolygon2D(coords, worldPos)) {
            dispatcher.dispatch({
              type: "style.set",
              params: {
                id: el.id,
                style: { fill: fillStyleValue, opacity: 0.35 },
              },
            });
            return;
          }
        }
        return;
      }

      // 3D Solids
      if (typeof activeTool === "string" && SOLID_TOOL_SPECS[activeTool]) {
        const spec = SOLID_TOOL_SPECS[activeTool];
        const solidEl = createSolid3DElement(
          spec.kind,
          worldPos,
          pageElements,
          { sides: spec.sides, page: currentPage }
        );
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            id: solidEl.id,
            type: solidEl.type,
            transform: solidEl.transform,
            style: solidEl.style,
            props: solidEl.props,
          },
        });
        const newId = res.created?.[0];
        if (newId) {
          setSelectedIds([newId]);
          setOrbitActiveId(newId);
        }
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // Oxyz 3D Coordinate Axes
      if (activeTool === "p3:axes") {
        const axesEl = createOxyzElement(worldPos, { page: currentPage });
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            id: axesEl.id,
            type: axesEl.type,
            transform: axesEl.transform,
            style: axesEl.style,
            props: axesEl.props,
          },
        });
        const newId = res.created?.[0];
        if (newId) {
          setSelectedIds([newId]);
          setOrbitActiveId(newId);
        }
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // 2D Oxy Axes
      if (activeTool === "p3:oxy") {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "Axes2D",
            transform: {
              x: worldPos.x,
              y: worldPos.y,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            style: { stroke: "#475569", width: 1.5 },
            props: { size: 5, grid: true, ticks: "int", legend: true },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // Variation Table / Sign Table / Empty VarTable
      if (
        activeTool === "bang-bien-thien" ||
        activeTool === "bang-xet-dau" ||
        activeTool === "bang-trong"
      ) {
        const tableData =
          activeTool === "bang-bien-thien"
            ? buildVarTableFromExpr("x^3 - 3x + 1")
            : activeTool === "bang-xet-dau"
              ? buildSignTableFromExpr("x^2 - 4")
              : {
                  xs: ["-\\infty", "x_1", "x_2", "+\\infty"],
                  rows: [
                    { kind: "sign", label: "y'", cells: ["", "", "0", "", "0", "", ""] },
                    {
                      kind: "variation",
                      label: "y",
                      cells: [
                        { v: [{ latex: "", level: "bottom" }] },
                        { v: [{ latex: "", level: "top" }] },
                        { v: [{ latex: "", level: "bottom" }] },
                        { v: [{ latex: "", level: "top" }] },
                      ],
                    },
                  ],
                };
        const propsObj =
          "error" in tableData
            ? { xs: ["-\\infty", "0", "+\\infty"], rows: [] }
            : { ...tableData };
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "VarTable",
            transform: {
              x: worldPos.x - 3,
              y: worldPos.y + 1.8,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: propsObj,
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // Trigonometric Circle
      if (activeTool === "trig-circle") {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "TrigCircle",
            transform: {
              x: worldPos.x,
              y: worldPos.y,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: {
              angle: Math.PI / 6,
              unit: "rad",
              show: { sin: true, cos: true, tan: true, cot: true, special: true },
            },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // Combinatorics / Probability / Venn / Network
      if (
        activeTool === "count-perm" ||
        activeTool === "count-arr" ||
        activeTool === "count-comb"
      ) {
        const kind =
          activeTool === "count-perm"
            ? "perm"
            : activeTool === "count-arr"
              ? "arr"
              : "comb";
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "Counting",
            transform: {
              x: worldPos.x - 3,
              y: worldPos.y + 1.5,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: { kind, items: ["A", "B", "C", "D"], k: 2 },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      if (activeTool === "tree") {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "TreeDiagram",
            transform: {
              x: worldPos.x - 3,
              y: worldPos.y + 1.5,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: {
              root: {
                label: "Ω",
                children: [
                  {
                    label: "A",
                    p: "0,6",
                    children: [
                      { label: "B", p: "0,7" },
                      { label: "B̄", p: "0,3" },
                    ],
                  },
                  {
                    label: "Ā",
                    p: "0,4",
                    children: [
                      { label: "B", p: "0,2" },
                      { label: "B̄", p: "0,8" },
                    ],
                  },
                ],
              },
            },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      if (activeTool === "venn") {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "Venn",
            transform: {
              x: worldPos.x,
              y: worldPos.y,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: { labels: ["A", "B"], universe: "U", shade: [] },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      if (activeTool === "network") {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "Network",
            transform: {
              x: worldPos.x,
              y: worldPos.y,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: {
              nodes: [
                { id: "1", label: "A", x: -1.8, y: 1.2 },
                { id: "2", label: "B", x: 1.8, y: 1.2 },
                { id: "3", label: "C", x: 1.8, y: -1.2 },
                { id: "4", label: "D", x: -1.8, y: -1.2 },
              ],
              edges: [
                { a: "1", b: "2" },
                { a: "2", b: "3" },
                { a: "3", b: "4" },
                { a: "4", b: "1" },
                { a: "1", b: "3" },
              ],
            },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // Table Tool (`table:RxC`)
      if (typeof activeTool === "string" && activeTool.startsWith("table:")) {
        const [rStr, cStr] = activeTool.slice(6).split("x");
        const rows = Math.max(1, Math.min(8, Number(rStr) || 3));
        const cols = Math.max(1, Math.min(8, Number(cStr) || 3));
        const cells = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => "")
        );
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "Table",
            transform: {
              x: worldPos.x,
              y: worldPos.y,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: { cells },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        handleSelectTool("select");
        return;
      }

      // Real-World Object Placement (`realworld:<iconId>`)
      if (
        typeof activeTool === "string" &&
        activeTool.startsWith("realworld:")
      ) {
        const iconId = activeTool.slice(10);
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "RealObject",
            transform: {
              x: worldPos.x,
              y: worldPos.y,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: { icon: iconId, from: "", to: "", width: 1 },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
        resetToolAfterCreation();
        setStatusHint(null);
        return;
      }

      // 2D & 3D Constructions
      if (typeof activeTool === "string") {
        if (handleConstructionClick(activeTool, worldPos)) {
          return;
        }
      }

      // Ink / Multi-nib Pens
      if (isPenTool(activeTool)) {
        if (activeTool === "ink:laser") {
          const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
      if (!containerRectRef.current && rect) {
        containerRectRef.current = rect;
      }
          setLiveLaserScreenPos({
            x: e.clientX - (rect?.left ?? 0),
            y: e.clientY - (rect?.top ?? 0),
          });
          if (laserConfig.mode === "dot") {
            setIsLaserPressed(true);
            return;
          }
        }
        dispatcher.gesture(true);
        const drawPt = worldPos;

        const nib = resolvePenNib(activeTool) ?? undefined;
        const smooth = nib === "fountain" || nib === "brush";
        filterXRef.current.reset();
        filterYRef.current.reset();
        const ts = e.nativeEvent.timeStamp || performance.now();
        const x = smooth
          ? filterXRef.current.filter(drawPt.x, ts)
          : drawPt.x;
        const y = smooth
          ? filterYRef.current.filter(drawPt.y, ts)
          : drawPt.y;
        const effectiveStyle: Style =
          nib === "laser"
            ? { stroke: laserConfig.color || "#ef4444", width: laserConfig.trailWidth || 4.5 }
            : nib === "highlighter" &&
              (!currentStyle.stroke || currentStyle.stroke.toLowerCase() === "#111827")
            ? { ...currentStyle, stroke: "#facc15" }
            : nib === "dashed"
            ? { ...currentStyle, dash: true }
            : currentStyle;
        liveStrokePointsRef.current = [x, y];
        liveStrokePressuresRef.current = [e.pressure || 0.5];
        liveStrokeTipRef.current = null;
        liveStrokeStyleRef.current = effectiveStyle;
        liveStrokeNibRef.current = nib;
        liveStrokeSnappedRef.current = null;
        if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
        setLastInkSnap(null);
        setLiveStroke({
          points: [x, y],
          pressures: [e.pressure || 0.5],
          nib,
          style: effectiveStyle,
        });
      }
    },
    [
      containerRef,
      viewport,
      isSpacePressed,
      activeTool,
      navPointerDown,
      pageElements,
      dispatcher,
      hydratedPts,
      currentStyle,
      findNearestPoint,
      snapPointAtCursor,
      commitTwoPointShape,
      commitDraftPolygon,
      draftPolygonPts,
      currentPage,
      fillColor,
      solved3D.p3,
      handleSelectTool,
      handleConstructionClick,
      penOnlyMode,
      isA4Format,
      currentBoardConfig,
      spenConfig,
      laserConfig,
    ]
  );

  // --- Root Canvas Pointer Move ---
  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      navPointerMove(e);

      const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
      if (!containerRectRef.current && rect) {
        containerRectRef.current = rect;
      }

      // Track laser screen position when active
      if (activeTool === "ink:laser") {
        setLiveLaserScreenPos({
          x: e.clientX - (rect?.left ?? 0),
          y: e.clientY - (rect?.top ?? 0),
        });
        if (laserConfig.mode === "dot") {
          return;
        }
      } else if (liveLaserScreenPos !== null) {
        setLiveLaserScreenPos(null);
      }

      const worldPos = screenToWorld(
        e.clientX,
        e.clientY,
        viewport.tx,
        viewport.ty,
        viewport.scale,
        rect
      );

      // 0. Label Drag (Point name offset)
      if (labelDragRef.current) {
        const { id, startWorld, initDx, initDy, element } = labelDragRef.current;
        const dx = Number((initDx + (worldPos.x - startWorld.x)).toFixed(3));
        const dy = Number((initDy + (worldPos.y - startWorld.y)).toFixed(3));
        dispatcher.dispatch({
          type: "object.update",
          params: { id, props: { ...element.props, labelDx: dx, labelDy: dy } },
        });
        return;
      }

      // 0. Axes2D 4-Tip Extension Handles
      if (axesResizeRef.current) {
        const { id, side, element } = axesResizeRef.current;
        const bounds = getAxesBounds(element);
        const relX = (worldPos.x - bounds.originX) / bounds.unitScale;
        const relY = (worldPos.y - bounds.originY) / bounds.unitScale;
        const snapHalf = (v: number) => Math.max(2, Math.min(25, Math.round(v * 2) / 2));
        const patch: Record<string, unknown> = { ...element.props };
        if (side === "xPos") patch.xPos = snapHalf(relX);
        else if (side === "xNeg") patch.xNeg = snapHalf(-relX);
        else if (side === "yPos") patch.yPos = snapHalf(relY);
        else if (side === "yNeg") patch.yNeg = snapHalf(-relY);
        dispatcher.dispatch({
          type: "object.update",
          params: { id, props: patch },
        });
        return;
      }

      // 1. Handle Resize
      if (resizeStartRef.current) {
        const { handle, initHandlePos, initialElements } =
          resizeStartRef.current;
        const { scaleX, scaleY } = calculateResizeFactors(
          handle,
          initHandlePos,
          worldPos
        );
        const avgScale = (scaleX + scaleY) / 2;
        const initById = new Map<string, CanvasElement>();
        for (const el of pageElements) initById.set(el.id, el);
        for (const el of initialElements) initById.set(el.id, el);
        const scaledPointIds = new Set<string>();
        const scalePointCoord = (p: Point2D, sx = scaleX, sy = scaleY): Point2D => ({
          x: handle.anchorX + (p.x - handle.anchorX) * sx,
          y: handle.anchorY + (p.y - handle.anchorY) * sy,
        });
        const scaleFreePointById = (ptId: unknown, sx = scaleX, sy = scaleY) => {
          if (typeof ptId !== "string" || scaledPointIds.has(ptId)) return;
          const ptEl = initById.get(ptId);
          if (!ptEl || (ptEl.type !== "GeomPoint" && ptEl.type !== "Point")) return;
          const kind = (ptEl.props?.constraint as { kind?: string } | undefined)?.kind ?? "free";
          if (kind !== "free") return;
          scaledPointIds.add(ptId);
          dispatcher.dispatch({
            type: "object.update",
            params: {
              id: ptEl.id,
              transform: {
                x: handle.anchorX + (ptEl.transform.x - handle.anchorX) * sx,
                y: handle.anchorY + (ptEl.transform.y - handle.anchorY) * sy,
              },
            },
          });
        };

        dispatcher.batch(() => {
          for (const initEl of initialElements) {
            if (initEl.type === "GeomPoint" || initEl.type === "Point") {
              scaleFreePointById(initEl.id);
            } else if (initEl.type === "Ink") {
              const pts = (initEl.props.points as number[]) || [];
              const scaledPoints: number[] = [];
              for (let i = 0; i + 1 < pts.length; i += 2) {
                const wx = initEl.transform.x + pts[i] * initEl.transform.scale;
                const wy =
                  initEl.transform.y + pts[i + 1] * initEl.transform.scale;
                scaledPoints.push(
                  handle.anchorX + (wx - handle.anchorX) * scaleX,
                  handle.anchorY + (wy - handle.anchorY) * scaleY
                );
              }
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: initEl.id,
                  transform: { x: 0, y: 0, scale: 1 },
                  props: { ...initEl.props, points: scaledPoints },
                },
              });
            } else if (initEl.type === "Rectangle") {
              const initW = (initEl.props.width as number) || 2.5;
              const initH = (initEl.props.height as number) || 1.8;
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: initEl.id,
                  transform: {
                    x:
                      handle.anchorX +
                      (initEl.transform.x - handle.anchorX) * scaleX,
                    y:
                      handle.anchorY +
                      (initEl.transform.y - handle.anchorY) * scaleY,
                  },
                  props: {
                    ...initEl.props,
                    width: Math.max(0.2, initW * Math.abs(scaleX)),
                    height: Math.max(0.2, initH * Math.abs(scaleY)),
                  },
                },
              });
            } else if (initEl.type === "Image") {
              const initW = (initEl.props.w as number) || 6;
              const initH = (initEl.props.h as number) || 4;
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: initEl.id,
                  transform: {
                    x:
                      handle.anchorX +
                      (initEl.transform.x - handle.anchorX) * scaleX,
                    y:
                      handle.anchorY +
                      (initEl.transform.y - handle.anchorY) * scaleY,
                  },
                  props: {
                    ...initEl.props,
                    w: Math.max(0.5, initW * Math.abs(scaleX)),
                    h: Math.max(0.5, initH * Math.abs(scaleY)),
                  },
                },
              });
            } else if (initEl.type === "GeomPolygon") {
              if (Array.isArray(initEl.props.points)) {
                const scaledPts = (initEl.props.points as EmbeddedVertex[]).map(
                  (v) => {
                    const wx = v.x + initEl.transform.x;
                    const wy = v.y + initEl.transform.y;
                    return {
                      ...v,
                      x:
                        handle.anchorX +
                        (wx - handle.anchorX) * scaleX -
                        initEl.transform.x,
                      y:
                        handle.anchorY +
                        (wy - handle.anchorY) * scaleY -
                        initEl.transform.y,
                    };
                  }
                );
                dispatcher.dispatch({
                  type: "object.update",
                  params: {
                    id: initEl.id,
                    props: { ...initEl.props, points: scaledPts },
                  },
                });
              } else if (Array.isArray(initEl.props.vertices)) {
                for (const vid of initEl.props.vertices) {
                  scaleFreePointById(vid);
                }
              }
            } else if (initEl.type === "GeomCircle") {
              const rad = initEl.props.radius as Record<string, unknown> | undefined;
              scaleFreePointById(initEl.props.center, scaleX, scaleY);
              if (rad?.kind === "through") {
                scaleFreePointById(rad.point, scaleX, scaleY);
              }
              const nextProps: Record<string, unknown> = { ...initEl.props };
              if (
                initEl.props.centerPt &&
                typeof initEl.props.centerPt === "object"
              ) {
                nextProps.centerPt = scalePointCoord(
                  initEl.props.centerPt as Point2D
                );
              }
              if (rad?.kind === "value" && typeof rad.v === "number") {
                nextProps.radius = {
                  kind: "value",
                  v: Math.max(0.2, rad.v * Math.abs(avgScale)),
                };
              }
              dispatcher.dispatch({
                type: "object.update",
                params: { id: initEl.id, props: nextProps },
              });
            } else if (
              initEl.type === "GeomSegment" ||
              initEl.type === "GeomVector" ||
              initEl.type === "GeomRay" ||
              (initEl.type === "GeomLine" && initEl.props.def === "through")
            ) {
              scaleFreePointById(initEl.props.from);
              scaleFreePointById(initEl.props.to);
              const nextProps: Record<string, unknown> = { ...initEl.props };
              let changed = false;
              if (initEl.props.fromPt && typeof initEl.props.fromPt === "object") {
                nextProps.fromPt = scalePointCoord(initEl.props.fromPt as Point2D);
                changed = true;
              }
              if (initEl.props.toPt && typeof initEl.props.toPt === "object") {
                nextProps.toPt = scalePointCoord(initEl.props.toPt as Point2D);
                changed = true;
              }
              if (changed) {
                dispatcher.dispatch({
                  type: "object.update",
                  params: { id: initEl.id, props: nextProps },
                });
              }
            } else if (initEl.type === "Solid3D") {
              const kind = initEl.props.kind as Solid3DKind | undefined;
              const isSphere = kind === "sphere";
              const sx = isSphere ? Math.abs(avgScale) : scaleX;
              const sy = isSphere ? Math.abs(avgScale) : scaleY;
              if (Array.isArray(initEl.props.points)) {
                for (const ptId of initEl.props.points) {
                  scaleFreePointById(ptId, sx, sy);
                }
              }
              const nextProps: Record<string, unknown> = { ...initEl.props };
              if (Array.isArray(initEl.props.pointCoords)) {
                nextProps.pointCoords = (
                  initEl.props.pointCoords as Point2D[]
                ).map((c) => {
                  const wx = c.x + initEl.transform.x;
                  const wy = c.y + initEl.transform.y;
                  return {
                    x:
                      handle.anchorX +
                      (wx - handle.anchorX) * sx -
                      initEl.transform.x,
                    y:
                      handle.anchorY +
                      (wy - handle.anchorY) * sy -
                      initEl.transform.y,
                  };
                });
              }
              if (typeof initEl.props.r === "number" && !initEl.props.through) {
                const rScale = isSphere ? Math.abs(avgScale) : Math.abs(scaleX);
                nextProps.r = Math.max(0.25, initEl.props.r * rScale);
              }
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: initEl.id,
                  props: nextProps,
                },
              });
            } else {
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: initEl.id,
                  transform: {
                    x:
                      handle.anchorX +
                      (initEl.transform.x - handle.anchorX) * scaleX,
                    y:
                      handle.anchorY +
                      (initEl.transform.y - handle.anchorY) * scaleY,
                    scale: Math.max(
                      0.25,
                      (initEl.transform.scale || 1) * avgScale
                    ),
                  },
                },
              });
            }
          }
        });
        return;
      }

      // 2. Drag Move Selected
      if (dragBoxStartRef.current) {
        const { startX, startY, initialTransforms } = dragBoxStartRef.current;
        const dx = worldPos.x - startX;
        const dy = worldPos.y - startY;
        dispatcher.batch(() => {
          for (const [id, init] of initialTransforms.entries()) {
            dispatcher.dispatch({
              type: "object.update",
              params: {
                id,
                transform: { x: init.x + dx, y: init.y + dy },
              },
            });
          }
        });
        return;
      }

      // 3. Marquee Drag
      if (marqueeRectRef.current) {
        marqueeRectRef.current = {
          ...marqueeRectRef.current,
          x: worldPos.x,
          y: worldPos.y,
        };
        setMarqueeRect({ ...marqueeRectRef.current });
        return;
      }

      // 4. Two-point drag preview
      if (draftTwoPtRef.current) {
        setDraftPreviewLine({
          from: draftTwoPtRef.current.start,
          to: worldPos,
          kind: draftTwoPtRef.current.tool,
        });
        return;
      }

      // 5. Eraser Sweep
      if (activeTool === "erase" && e.buttons === 1) {
        eraserDidEraseRef.current = true;
        checkEraserCollision(worldPos, pageElements, viewport.scale, (id) => {
          dispatcher.deleteObjects([id]);
        });
        return;
      }

      // 6. Ink / Multi-nib Pens (Coalesced High-Refresh Input + Direct DOM rAF Path Update)
      if (
        isPenTool(activeTool) &&
        e.buttons === 1 &&
        liveStrokePointsRef.current.length > 0
      ) {
        const nib = liveStrokeNibRef.current ?? resolvePenNib(activeTool) ?? undefined;
        const smooth = nib === "fountain" || nib === "brush";
        const coalesced =
          typeof e.nativeEvent.getCoalescedEvents === "function"
            ? e.nativeEvent.getCoalescedEvents()
            : null;
        const events = coalesced && coalesced.length > 0 ? coalesced : [e.nativeEvent];
        const minWorldDist = 1.4 / (viewport.scale || 45);
        const ptsArr = liveStrokePointsRef.current;
        const pressArr = liveStrokePressuresRef.current;

        for (const ev of events) {
          const evWorld = screenToWorld(
            ev.clientX,
            ev.clientY,
            viewport.tx,
            viewport.ty,
            viewport.scale,
            rect
          );
          const drawPt = evWorld;
          const ts = ev.timeStamp || performance.now();
          const x = smooth
            ? filterXRef.current.filter(drawPt.x, ts)
            : drawPt.x;
          const y = smooth
            ? filterYRef.current.filter(drawPt.y, ts)
            : drawPt.y;
          const lastX = ptsArr[ptsArr.length - 2];
          const lastY = ptsArr[ptsArr.length - 1];
          const d = Math.hypot(x - lastX, y - lastY);
          const p = ev.pressure || 0.5;
          if (d >= minWorldDist) {
            ptsArr.push(x, y);
            pressArr.push(p);
            liveStrokeTipRef.current = null;
          } else {
            liveStrokeTipRef.current = { x, y, pressure: p };
          }
        }
        liveStrokeSnappedRef.current = null;

        // Draw-and-Hold dwell preview (340ms stationary pause snaps preview smoothly like GoodNotes/Samsung Notes)
        if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
        if (
          inkToShape &&
          (nib === undefined || nib === "pencil") &&
          liveStrokePointsRef.current.length >= 8
        ) {
          dwellTimerRef.current = setTimeout(() => {
            dwellTimerRef.current = null;
            if (liveStrokeRafRef.current) {
              cancelAnimationFrame(liveStrokeRafRef.current);
              liveStrokeRafRef.current = null;
            }
            const currentPts = liveStrokePointsRef.current;
            if (currentPts.length < 8 || !liveStrokeStyleRef.current) return;
            const shape = recognizeStrokeShape(currentPts);
            if (shape) {
              liveStrokeSnappedRef.current = shape;
              const previewPts = recognizedShapeToPreviewPoints(shape);
              if (previewPts.length >= 4) {
                const d = generateCatmullRomSpline(previewPts);
                if (d) {
                  liveStrokePathRef.current?.setAttribute("d", d);
                }
              }
            }
          }, 340);
        }

        // Update live SVG <path d="..."> directly on requestAnimationFrame with zero React re-renders
        if (!liveStrokeRafRef.current) {
          liveStrokeRafRef.current = requestAnimationFrame(() => {
            liveStrokeRafRef.current = null;
            if (
              liveStrokePathRef.current &&
              liveStrokePointsRef.current.length > 0 &&
              liveStrokeStyleRef.current
            ) {
              const d = buildLiveStrokePathData();
              if (d) {
                liveStrokePathRef.current.setAttribute("d", d);
              }
            }
          });
        }
      }
    },
    [
      navPointerMove,
      containerRef,
      viewport,
      dispatcher,
      activeTool,
      pageElements,
      buildLiveStrokePathData,
      laserConfig,
      liveLaserScreenPos,
      inkToShape,
    ]
  );

  // --- Root Canvas Pointer Up ---
  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      navPointerUp(e);

      if (labelDragRef.current) {
        labelDragRef.current = null;
        dispatcher.gesture(false);
        return;
      }
      if (axesResizeRef.current) {
        axesResizeRef.current = null;
        dispatcher.gesture(false);
        return;
      }
      if (resizeStartRef.current) {
        resizeStartRef.current = null;
        dispatcher.gesture(false);
        return;
      }
      if (dragBoxStartRef.current) {
        dragBoxStartRef.current = null;
        dispatcher.gesture(false);
        return;
      }
      if (marqueeRectRef.current) {
        const m = marqueeRectRef.current;
        const dragDist = Math.hypot(
          (m.x - m.sx) * (viewport.scale || 45),
          (m.y - m.sy) * (viewport.scale || 45)
        );
        if (dragDist > 4) {
          setSelectedIds(testMarqueeIntersection(m, pageElements));
        } else {
          setSelectedIds([]);
        }
        marqueeRectRef.current = null;
        setMarqueeRect(null);
        return;
      }

      if (draftTwoPtRef.current) {
        const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
      if (!containerRectRef.current && rect) {
        containerRectRef.current = rect;
      }
        const worldPos = screenToWorld(
          e.clientX,
          e.clientY,
          viewport.tx,
          viewport.ty,
          viewport.scale,
          rect
        );
        const snap = findNearestPoint(worldPos, 24);
        const endPt = snap?.pos ?? worldPos;
        const dragPx =
          dist2D(draftTwoPtRef.current.start, endPt) * (viewport.scale || 45);
        if (dragPx >= 8) {
          commitTwoPointShape(
            draftTwoPtRef.current.tool,
            draftTwoPtRef.current.start,
            endPt,
            draftTwoPtRef.current.startId,
            snap?.id
          );
          draftTwoPtRef.current = null;
          setDraftPreviewLine(null);
        } else {
          // Keep anchor for 2-click placement
          draftTwoPtRef.current.dragging = false;
        }
        return;
      }

      if (activeTool === "ink:laser" && laserConfig.mode === "dot") {
        setIsLaserPressed(false);
      }

      const activeLive =
        liveStroke ??
        (liveStrokeStyleRef.current
          ? {
              points: liveStrokePointsRef.current,
              pressures: liveStrokePressuresRef.current,
              nib: liveStrokeNibRef.current,
              style: liveStrokeStyleRef.current,
            }
          : null);

      if (activeLive) {
        const pts = liveStrokePointsRef.current;
        const pressures = liveStrokePressuresRef.current;
        if (pts.length === 2 && liveStrokeTipRef.current) {
          pts.push(liveStrokeTipRef.current.x, liveStrokeTipRef.current.y);
          pressures.push(liveStrokeTipRef.current.pressure);
          liveStrokeTipRef.current = null;
        }
        if (pts.length >= 4) {
          if (activeLive.nib === "laser") {
            // Dedicated laser pointer: fade out completely after 1.5s, not persisting in Yjs
            const strokeId = newElId("laser");
            setLaserStrokes((prev) => [
              ...prev,
              {
                id: strokeId,
                points: [...pts],
                createdAt: performance.now(),
                color: laserConfig.color,
                width: laserConfig.trailWidth,
              },
            ]);
          } else if (
            inkToShape &&
            (activeLive.nib === undefined ||
              activeLive.nib === "pencil")
          ) {
            // Ink-to-shape intelligence: use cached dwell snap or classify stroke via ShortStraw + PaleoSketch
            const recognized = liveStrokeSnappedRef.current ?? recognizeStrokeShape(pts);
            const targetPage = isA4Format ? (activeDrawPageRef.current || currentPage) : currentPage;
            const showSnapPill = (
              elementId: string,
              shapeType: RecognizedShape["type"],
              extra?: { center?: Point2D; rx?: number; ry?: number; rotation?: number }
            ) => {
              if (lastInkSnapTimerRef.current) clearTimeout(lastInkSnapTimerRef.current);
              setLastInkSnap({
                elementId,
                shapeType,
                rawPoints: [...pts],
                rawPressures: [...pressures],
                nib: activeLive.nib,
                style: { ...activeLive.style },
                page: targetPage,
                ...extra,
              });
              lastInkSnapTimerRef.current = setTimeout(() => {
                setLastInkSnap(null);
                lastInkSnapTimerRef.current = null;
              }, 5500);
            };
            if (recognized) {
              if (recognized.type === "circle") {
                const circId = newElId("circ");
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: circId,
                    type: "GeomCircle",
                    page: targetPage,
                    style: {
                      stroke: activeLive.style.stroke ?? "#0891b2",
                      width: activeLive.style.width ?? 2,
                      dash: activeLive.style.dash ?? false,
                    },
                    props: {
                      center: `${circId}_c`,
                      centerPt: recognized.center,
                      radius: { kind: "value", v: recognized.radius },
                    },
                  },
                });
                showSnapPill(circId, "circle", {
                  center: recognized.center,
                  rx: recognized.radius,
                  ry: recognized.radius,
                  rotation: 0,
                });
              } else if (recognized.type === "ellipse") {
                const ellId = newElId("circ");
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: ellId,
                    type: "GeomCircle",
                    page: targetPage,
                    style: {
                      stroke: activeLive.style.stroke ?? "#0891b2",
                      width: activeLive.style.width ?? 2,
                      dash: activeLive.style.dash ?? false,
                    },
                    props: {
                      center: `${ellId}_c`,
                      centerPt: recognized.center,
                      radius: { kind: "value", v: Number(((recognized.rx + recognized.ry) / 2).toFixed(3)) },
                      rx: Number(recognized.rx.toFixed(3)),
                      ry: Number(recognized.ry.toFixed(3)),
                      rotation: Number(recognized.rotation.toFixed(4)),
                    },
                  },
                });
                showSnapPill(ellId, "ellipse", {
                  center: recognized.center,
                  rx: recognized.rx,
                  ry: recognized.ry,
                  rotation: recognized.rotation,
                });
              } else if (recognized.type === "segment") {
                const segId = newElId("seg");
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: segId,
                    type: "GeomSegment",
                    page: targetPage,
                    style: {
                      stroke: activeLive.style.stroke ?? "#334155",
                      width: activeLive.style.width ?? 2,
                      dash: activeLive.style.dash ?? false,
                    },
                    props: {
                      from: `${segId}_a`,
                      to: `${segId}_b`,
                      fromPt: recognized.start,
                      toPt: recognized.end,
                    },
                  },
                });
                showSnapPill(segId, "segment");
              } else if (recognized.type === "arrow") {
                const vecId = newElId("vec");
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: vecId,
                    type: "GeomVector",
                    page: targetPage,
                    style: {
                      stroke: activeLive.style.stroke ?? "#334155",
                      width: activeLive.style.width ?? 2,
                      dash: activeLive.style.dash ?? false,
                    },
                    props: {
                      from: `${vecId}_a`,
                      to: `${vecId}_b`,
                      fromPt: recognized.start,
                      toPt: recognized.end,
                    },
                  },
                });
                showSnapPill(vecId, "arrow");
              } else if (recognized.type === "triangle" || recognized.type === "rectangle") {
                const polyId = newElId("poly");
                const verts = recognized.vertices;
                const embedded: EmbeddedVertex[] = verts.map((pt, i) => ({
                  id: `${polyId}_v${i}`,
                  name: "",
                  x: pt.x,
                  y: pt.y,
                }));
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: polyId,
                    type: "GeomPolygon",
                    page: targetPage,
                    style: {
                      stroke: activeLive.style.stroke ?? "#334155",
                      fill: "none",
                      width: activeLive.style.width ?? 2,
                      dash: activeLive.style.dash ?? false,
                    },
                    props: {
                      vertices: embedded.map((v) => v.id),
                      points: embedded,
                      bareShape: true,
                    },
                  },
                });
                showSnapPill(polyId, recognized.type);
              }
            } else {
              // Normal ink stroke
              dispatcher.dispatch({
                type: "ink.stroke",
                params: {
                  points: pts,
                  pressures,
                  nib: activeLive.nib,
                  style: activeLive.style,
                  page: targetPage,
                },
              });
            }
          } else {
            dispatcher.dispatch({
              type: "ink.stroke",
              params: {
                points: pts,
                pressures,
                nib: activeLive.nib,
                style: activeLive.style,
                page: isA4Format ? (activeDrawPageRef.current || currentPage) : currentPage,
              },
            });
          }
        }
        if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
        liveStrokeSnappedRef.current = null;
        if (liveStrokeRafRef.current) {
          cancelAnimationFrame(liveStrokeRafRef.current);
          liveStrokeRafRef.current = null;
        }
        dispatcher.gesture(false);
        liveStrokePointsRef.current = [];
        liveStrokePressuresRef.current = [];
        liveStrokeTipRef.current = null;
        liveStrokeStyleRef.current = undefined;
        liveStrokeNibRef.current = undefined;
        containerRectRef.current = null;
        setLiveStroke(null);
      }

      if (activeTool === "erase") {
        if (eraserDidEraseRef.current) {
          eraserDidEraseRef.current = false;
          resetToolAfterEraser();
        }
      }

      // Check S Pen auto-return: if stylus button was held or configured to return after action
      if (spenActiveOverrideRef.current && spenPreviousToolRef.current) {
        if (spenConfig.behavior === "hold" || spenConfig.returnAfterAction) {
          setActiveTool(spenPreviousToolRef.current);
          spenPreviousToolRef.current = null;
          spenActiveOverrideRef.current = false;
        }
      }
    },
    [
      navPointerUp,
      dispatcher,
      viewport,
      pageElements,
      isA4Format,
      currentPage,
      containerRef,
      findNearestPoint,
      commitTwoPointShape,
      liveStroke,
      inkToShape,
      activeTool,
      resetToolAfterEraser,
      spenConfig,
      laserConfig,
    ]
  );

  const handleCanvasPointerCancel = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      navPointerCancel(e);
      if (labelDragRef.current) {
        labelDragRef.current = null;
        dispatcher.gesture(false);
      }
      if (axesResizeRef.current) {
        axesResizeRef.current = null;
        dispatcher.gesture(false);
      }
      if (resizeStartRef.current) {
        resizeStartRef.current = null;
        dispatcher.gesture(false);
      }
      if (dragBoxStartRef.current) {
        dragBoxStartRef.current = null;
        dispatcher.gesture(false);
      }
      marqueeRectRef.current = null;
      setMarqueeRect(null);
      draftTwoPtRef.current = null;
      setDraftPreviewLine(null);
      if (activeTool === "ink:laser" && laserConfig.mode === "dot") {
        setIsLaserPressed(false);
      }

      if (liveStroke) {
        if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
        liveStrokeSnappedRef.current = null;
        if (liveStrokeRafRef.current) {
          cancelAnimationFrame(liveStrokeRafRef.current);
          liveStrokeRafRef.current = null;
        }
        dispatcher.gesture(false);
        liveStrokePointsRef.current = [];
        liveStrokePressuresRef.current = [];
        liveStrokeTipRef.current = null;
        liveStrokeStyleRef.current = undefined;
        liveStrokeNibRef.current = undefined;
        containerRectRef.current = null;
        setLiveStroke(null);
      }
      if (spenActiveOverrideRef.current && spenPreviousToolRef.current) {
        if (spenConfig.behavior === "hold" || spenConfig.returnAfterAction) {
          setActiveTool(spenPreviousToolRef.current);
          spenPreviousToolRef.current = null;
          spenActiveOverrideRef.current = false;
        }
      }
    },
    [navPointerCancel, dispatcher, liveStroke, spenConfig]
  );

  // Drag-and-drop image or PDF file onto canvas
  const handleDropOnCanvas = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const isImage = file.type.startsWith("image/");
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      if (!isImage && !isPdf) return;

      e.preventDefault();

      if (isPdf) {
        try {
          const res = await importPdfPages(file);
          handleInsertPdfPages(res.pages);
        } catch (err) {
          console.error("Lỗi đọc file PDF kéo thả:", err);
        }
        return;
      }
      const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
      if (!containerRectRef.current && rect) {
        containerRectRef.current = rect;
      }
      const pt = screenToWorld(
        e.clientX,
        e.clientY,
        viewport.tx,
        viewport.ty,
        viewport.scale,
        rect
      );

      if (isA4Format) {
        const a4Opt = BOARD_FORMAT_OPTIONS.find(
          (f) => f.id === currentBoardConfig?.format
        );
        if (a4Opt) {
          const hw = a4Opt.widthWorld / 2;
          const hh = a4Opt.heightWorld / 2;
          pt.x = Math.max(-hw, Math.min(hw, pt.x));
          pt.y = Math.max(-hh, Math.min(hh, pt.y));
        }
      }

      if (isImage) {
        try {
          const img = await readImageFile(file);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Image",
              transform: { x: pt.x, y: pt.y, scale: 1, rotation: 0, z: 0 },
              props: { src: img.src, w: img.w, h: img.h },
            },
          });
        } catch {
          // Ignore invalid dropped image
        }
      }
    },
    [containerRef, viewport, dispatcher, isA4Format, currentBoardConfig, handleInsertPdfPages]
  );

  // --- Shared Renderers (used in both Fullscreen Whiteboard & 50/50 Split Exam Mode) ---
  const renderBoardElement = useCallback(
    (rawEl: CanvasElement) => {
    if (rawEl.style?.hidden) return null;
    const el = adaptElementForBoard(rawEl, currentBoardTheme.isDark);
    const isSel =
      !rawEl.props?.locked &&
      !rawEl.style?.locked &&
      selectedIds.includes(el.id);

    switch (el.type) {
      case "Ink": {
        const inkProps = el.props as unknown as InkProps;
        return (
          <g
            key={el.id}
            data-id={el.id}
            data-oid={el.id}
            data-element-type="Ink"
            data-nib={inkProps?.nib}
            className={
              inkProps?.nib === "fountain"
                ? "wb-fountain-stroke"
                : "wb-ink-stroke"
            }
          >
            <InkElement
              id={el.id}
              transform={el.transform}
              style={el.style}
              props={inkProps}
              scale={viewport.scale}
              isSelected={isSel}
              onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            />
          </g>
        );
      }

      case "Point":
      case "GeomPoint":
        return (
          <PointElement
            key={el.id}
            element={el}
            position={hydratedPts.get(el.id)}
            scale={viewport.scale}
            labelScale={labelScale}
            dotScale={dotScale}
            isSelected={isSel}
            onPointerDown={(e, id) => handleElementPointerDown(e, id)}
            onLabelPointerDown={(e, id) => {
              if (penOnlyMode && e.pointerType === "touch") {
                navPointerDown(e as unknown as React.PointerEvent<SVGSVGElement>);
                return;
              }
              e.stopPropagation();
              setSelectedIds([id]);
              const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
      if (!containerRectRef.current && rect) {
        containerRectRef.current = rect;
      }
              const startWorld = screenToWorld(
                e.clientX,
                e.clientY,
                viewport.tx,
                viewport.ty,
                viewport.scale,
                rect
              );
              const effScale =
                typeof el.props?.labelScale === "number" && el.props.labelScale > 0
                  ? el.props.labelScale
                  : labelScale;
              const initDx =
                typeof el.props?.labelDx === "number"
                  ? el.props.labelDx
                  : 0.18 * effScale;
              const initDy =
                typeof el.props?.labelDy === "number"
                  ? el.props.labelDy
                  : 0.12 * effScale;
              labelDragRef.current = {
                id,
                startWorld,
                initDx,
                initDy,
                element: el,
              };
              dispatcher.gesture(true);
            }}
            onLabelDoubleClick={(e, id) => {
              e.stopPropagation();
              setSelectedIds([id]);
              openPointRename([id]);
            }}
          />
        );

      case "Rectangle": {
        const w = (el.props?.width as number) || 2.5;
        const h = (el.props?.height as number) || 1.6;
        return (
          <g
            key={el.id}
            data-id={el.id}
            data-oid={el.id}
            data-element-type="Rectangle"
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={el.transform.x - w / 2}
              y={-el.transform.y - h / 2}
              width={w}
              height={h}
              fill={el.style?.fill ?? "rgba(37,99,235,0.05)"}
              stroke={isSel ? "#f59e0b" : el.style?.stroke || "#111827"}
              strokeWidth={el.style?.width || 2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      }

      case "GeomSegment":
      case "GeomVector":
      case "GeomRay":
      case "GeomLine":
        return (
          <SegmentElement
            key={el.id}
            element={el}
            points={hydratedPts}
            byId={byId}
            points3D={solved3D.p3}
            isSelected={isSel}
            onPointerDown={(e, id) => handleElementPointerDown(e, id)}
          />
        );

      case "GeomCircle":
        return (
          <CircleElement
            key={el.id}
            element={el}
            points={hydratedPts}
            isSelected={isSel}
            onPointerDown={(e, id) => handleElementPointerDown(e, id)}
          />
        );

      case "GeomPolygon":
      case "GeomAngle":
      case "FillRegion":
        return (
          <PolygonElement
            key={el.id}
            element={el}
            points={hydratedPts}
            byId={byId}
            points3D={solved3D.p3}
            scale={viewport.scale}
            labelScale={labelScale}
            dotScale={dotScale}
            isSelected={isSel}
            onPointerDown={(e, id) => handleElementPointerDown(e, id)}
          />
        );

      case "GeomConstruction":
        return (
          <GeometryConstructionElement
            key={el.id}
            element={el}
            points={hydratedPts}
            byId={byId}
            scale={viewport.scale}
            labelScale={labelScale}
            dotScale={dotScale}
            isSelected={isSel}
            onPointerDown={(e, id) => handleElementPointerDown(e, id)}
          />
        );

      case "Solid3D":
      case "Axes3D":
      case "RoundSection":
      case "SolidSection":
      case "SpaceFigure":
      case "OrthoViews":
      case "Revolution":
        return (
          <Solid3DElement
            key={el.id}
            element={el}
            points={hydratedPts}
            byId={byId}
            points3D={solved3D.p3}
            lifts={solved3D.lifts}
            scale={viewport.scale}
            labelScale={labelScale}
            dotScale={dotScale}
            orbitCam={
              orbitCamById[el.id] ??
              ((el.type === "RoundSection" || (el.type as string) === "SolidSection") && (el.props as Record<string, unknown>)?.solid
                ? orbitCamById[String((el.props as Record<string, unknown>).solid)]
                : undefined) ??
              (el.type === "SpaceFigure" && (el.props as Record<string, unknown>)?.axes
                ? orbitCamById[String((el.props as Record<string, unknown>).axes)]
                : undefined)
            }
            isSelected={isSel}
            selectedSubPart={activeSolidSubPart}
            onPointerDown={(e, id) => handleElementPointerDown(e, id)}
            onDoubleClick={(e, id) => {
              e.stopPropagation();
              setSelectedIds([id]);
              setSolidSubSel(null);
            }}
          />
        );

      case "MathText":
        return (
          <MathElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onDoubleClick={handleEditMathElement}
          />
        );

      case "Table":
        return (
          <TableElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateCells={handleUpdateTableCells}
          />
        );

      case "Image":
        return (
          <ImageElement
            key={el.id}
            element={el}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "Axes2D":
        return (
          <AxesElement
            key={el.id}
            element={el}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onResizeHandlePointerDown={(e, side) => {
              e.stopPropagation();
              axesResizeRef.current = { id: el.id, side, element: el };
              dispatcher.gesture(true);
            }}
          />
        );

      case "Plot":
        return (
          <PlotElement
            key={el.id}
            element={el}
            allElements={pageElements}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateExpr={handleUpdatePlotExpr}
            onUpdateParam={handleUpdatePlotParam}
          />
        );

      case "Slider":
        return (
          <SliderElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onChangeValue={handleChangeSliderValue}
          />
        );

      case "Conic":
        return (
          <ConicElement
            key={el.id}
            element={el}
            allElements={pageElements}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "Curve2D":
        return (
          <Curve2DElement
            key={el.id}
            element={el}
            allElements={pageElements}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "GraphTangent":
        return (
          <GraphTangentElement
            key={el.id}
            element={el}
            allElements={pageElements}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "GraphArea":
        return (
          <GraphAreaElement
            key={el.id}
            element={el}
            allElements={pageElements}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "VarTable":
        return (
          <VarTableElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdate={handleUpdateElementProps}
          />
        );

      case "TrigCircle":
        return (
          <TrigCircleElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateProps={handleUpdateElementProps}
          />
        );

      case "Chart":
        return (
          <ChartElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "TreeDiagram":
        return (
          <TreeDiagramElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "Venn":
        return (
          <VennElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateProps={handleUpdateElementProps}
          />
        );

      case "Counting":
        return (
          <CountingElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateProps={handleUpdateElementProps}
            onConvertToTree={handleConvertCountingToTree}
          />
        );

      case "NumberLine":
        return (
          <NumberLineElement
            key={el.id}
            element={el}
            scale={viewport.scale}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "Network":
        return (
          <NetworkElement
            key={el.id}
            element={el}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateProps={handleUpdateElementProps}
          />
        );

      case "RealObject":
        return (
          <RealObjectElement
            key={el.id}
            element={el}
            allElements={pageElements}
            points={hydratedPts}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "LineDecor":
        return (
          <LineDecorElement
            key={el.id}
            element={el}
            allElements={pageElements}
            points={hydratedPts}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      default:
        return null;
    }
    },
    [
      currentBoardTheme.isDark,
      selectedIds,
      viewport.scale,
      viewport.tx,
      viewport.ty,
      handleElementPointerDown,
      hydratedPts,
      labelScale,
      dotScale,
      penOnlyMode,
      navPointerDown,
      containerRef,
      dispatcher,
      openPointRename,
      byId,
      solved3D.p3,
      solved3D.lifts,
      orbitCamById,
      activeSolidSubPart,
      handleEditMathElement,
      handleUpdateTableCells,
      pageElements,
      handleUpdatePlotExpr,
      handleUpdatePlotParam,
      handleChangeSliderValue,
      handleUpdateElementProps,
    ]
  );

  const renderedBoardElements = useMemo(
    () =>
      [...pageElements]
        .sort((a, b) => (a.transform.z ?? 0) - (b.transform.z ?? 0))
        .map(renderBoardElement),
    [pageElements, renderBoardElement]
  );

  const renderCanvas = (contained = false) => (
    <SvgCanvas
      viewport={viewport}
      containerRef={containerRef}
      currentTool={activeTool}
      isPanning={isPanning}
      isSpacePressed={isSpacePressed}
      contained={contained}
      isSidebarOpen={!contained && pageSidebarOpen}
      boardConfig={currentBoardConfig}
      totalPages={pageCount}
      currentPage={currentPage}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerCancel}
      onPointerLeave={() => {
        navPointerLeave();
        setLiveLaserScreenPos(null);
        setIsLaserPressed(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropOnCanvas}
      gridEnabled={gridEnabled}
      svgOverlay={
        <>
          {(selectionBBox || marqueeRect) && (
            <SelectionOverlay
              bbox={activeSolidSubPart ? null : selectionBBox}
              cameraScale={viewport.scale}
              marqueeRect={marqueeRect}
              interactive={
                activeTool === null ||
                activeTool === "select" ||
                activeTool === "select:marquee"
              }
              boxInteriorPassthrough={
                selectedElements.length === 1 &&
                (selectedElements[0].type === "Slider" ||
                  selectedElements[0].type === "Solid3D" ||
                  selectedElements[0].type === "VarTable" ||
                  selectedElements[0].type === "TrigCircle" ||
                  selectedElements[0].type === "Counting" ||
                  selectedElements[0].type === "Venn" ||
                  selectedElements[0].type === "Network" ||
                  selectedElements[0].type === "Table" ||
                  selectedElements[0].type === "Axes2D" ||
                  selectedElements[0].type === "GeomSegment" ||
                  selectedElements[0].type === "LineDecor")
              }
              onHandlePointerDown={handleHandlePointerDown}
              onBoxPointerDown={handleBoxPointerDown}
            />
          )}
          {draftPreviewLine &&
            (draftPreviewLine.kind === "circle" ? (
              <circle
                cx={draftPreviewLine.from.x}
                cy={-draftPreviewLine.from.y}
                r={Math.max(
                  0.05,
                  dist2D(draftPreviewLine.from, draftPreviewLine.to)
                )}
                fill="none"
                stroke="#2563eb"
                strokeDasharray="5 4"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <line
                x1={draftPreviewLine.from.x}
                y1={-draftPreviewLine.from.y}
                x2={draftPreviewLine.to.x}
                y2={-draftPreviewLine.to.y}
                stroke="#2563eb"
                strokeDasharray="5 4"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          {hoveredLockedBox && (
            <rect
              x={hoveredLockedBox.minX - 0.12}
              y={-hoveredLockedBox.maxY - 0.12}
              width={Math.max(0.24, hoveredLockedBox.maxX - hoveredLockedBox.minX + 0.24)}
              height={Math.max(0.24, hoveredLockedBox.maxY - hoveredLockedBox.minY + 0.24)}
              fill="rgba(37, 99, 235, 0.12)"
              stroke="#2563eb"
              strokeWidth={2.2}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: "none" }}
            />
          )}
          {draftPolygonPts.length > 0 && (
            <polyline
              points={draftPolygonPts.map((p) => `${p.x},${-p.y}`).join(" ")}
              fill="rgba(37,99,235,0.06)"
              stroke="#2563eb"
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Ephemeral fading Laser Pointer strokes in SVG overlay so they don't count as board elements */}
          {laserStrokes.map((ls) => {
            const age = performance.now() - ls.createdAt;
            const opacity = Math.max(0, 1 - age / 1500);
            return (
              <g key={ls.id} style={{ opacity, pointerEvents: "none" }} data-laser-stroke="true">
                <InkElement
                  id={ls.id}
                  transform={{ x: 0, y: 0, scale: 1, rotation: 0, z: 99999 }}
                  style={{
                    stroke: ls.color || "#ef4444",
                    width: ls.width || 4.5,
                  }}
                  props={{
                    points: ls.points,
                    nib: "laser",
                  }}
                  scale={viewport.scale}
                />
              </g>
            );
          })}
        </>
      }
      cursorOverride={activeTool === "ink:laser" && laserConfig.mode === "dot" ? "none" : undefined}
      overlayChildren={
        <>
          <PeerCursors
            peers={peerCursors}
            viewport={viewport}
            peerCount={peerCount}
            showCounter={!contained}
          />
          {/* Live Single Dot Laser Pointer indicator with customizable size and halo glow */}
          {activeTool === "ink:laser" && laserConfig.mode === "dot" && liveLaserScreenPos && (
            <div
              data-laser-spot="true"
              data-export-skip="true"
              data-laser-pressed={isLaserPressed ? "true" : "false"}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `translate3d(${liveLaserScreenPos.x}px, ${liveLaserScreenPos.y}px, 0) translate(-50%, -50%) scale(${isLaserPressed ? 1.25 : 1})`,
                transition: "transform 60ms ease-out",
                pointerEvents: "none",
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Outer soft pulsing glow */}
              <div
                style={{
                  position: "absolute",
                  width: laserConfig.dotSize * (isLaserPressed ? 3.2 : 2.4),
                  height: laserConfig.dotSize * (isLaserPressed ? 3.2 : 2.4),
                  borderRadius: "50%",
                  background: laserConfig.color || "#ef4444",
                  opacity: isLaserPressed ? 0.45 : 0.28,
                  filter: "blur(5px)",
                  transition: "all 60ms ease-out",
                }}
              />
              {/* Middle bright halo */}
              <div
                style={{
                  position: "absolute",
                  width: laserConfig.dotSize * 1.5,
                  height: laserConfig.dotSize * 1.5,
                  borderRadius: "50%",
                  background: laserConfig.color || "#ef4444",
                  opacity: 0.55,
                  filter: "blur(2px)",
                }}
              />
              {/* Core intense laser spot */}
              <div
                style={{
                  width: laserConfig.dotSize,
                  height: laserConfig.dotSize,
                  borderRadius: "50%",
                  background: "#ffffff",
                  backgroundColor: laserConfig.color || "#ef4444",
                  boxShadow: `0 0 8px ${laserConfig.color || "#ef4444"}, 0 0 16px ${laserConfig.color || "#ef4444"}, 0 0 24px #fbbf24`,
                  border: "2px solid #ffffff",
                }}
              />
            </div>
          )}
        </>
      }
    >
      {renderedBoardElements}

      {liveStroke && (
        <InkElement
          id="live-in-progress-stroke"
          pathRef={liveStrokePathRef}
          transform={{ x: 0, y: 0, scale: 1, rotation: 0, z: 9999 }}
          style={{
            ...liveStroke.style,
            stroke: adaptStrokeForBoard(
              liveStroke.style?.stroke,
              currentBoardTheme.isDark
            ),
          }}
          props={{
            points: liveStroke.points,
            pressures: liveStroke.pressures,
            nib: liveStroke.nib,
          }}
          scale={viewport.scale}
        />
      )}
    </SvgCanvas>
  );

  const renderToolbar = (embedded = false) => (
    <Toolbar
      doc={doc}
      embedded={embedded}
      activeTool={activeTool}
      onSelectTool={handleSelectTool}
      styleState={{
        current: {
          stroke: currentStyle.stroke ?? null,
          width: currentStyle.width ?? null,
          dash: currentStyle.dash ?? null,
        },
        selection: selectionStyleState,
      }}
      onPickStyle={handlePickStyle}
      fillColor={fillColor}
      onChangeFillColor={(c) => {
        setFillColor(c);
        handleSelectTool("floodFill");
      }}
      onConstructMarksChange={() => setConstructMarksTick((n) => n + 1)}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={undo}
      onRedo={redo}
      selectedCount={selectedElements.length}
      onDeleteSelected={handleDeleteSelected}
      isFullscreen={isFullscreen}
      onToggleFullscreen={handleToggleFullscreen}
      isA4Format={isA4Format}
      isFitLocked={isFitLocked}
      onToggleFitLock={toggleFitLock}
      page={{ current: currentPage, count: pageCount }}
      onPrevPage={handlePrevPage}
      onNextPage={handleNextPage}
      onAddPage={handleAddPage}
      onInsertTable={handleInsertTable}
      onInsertImage={handleInsertImage}
      onInsertPdfPages={handleInsertPdfPages}
      onM3Action={handleM3Action}
      onSelectQuickRealWorld={(item: RealWorldArtItem) => {
        recordRecentRealWorldId(item.id);
        handleSelectTool(`realworld:${item.id}`);
        setStatusHint(`Bấm lên bảng để đặt ${item.name}`);
      }}
      onOpenRealWorldDrawer={() => {
        handleSelectTool("select");
        setRealWorldDrawerOpen(true);
      }}
      onOpenPhysicsDrawer={() => {
        handleSelectTool("select");
        setMathDrawerOpen(false);
        setPhysicsDrawerOpen(true);
      }}
      onOpenMathDrawer={() => {
        handleSelectTool("select");
        setPhysicsDrawerOpen(false);
        setChemistryDrawerOpen(false);
        setMathDrawerOpen(true);
      }}
      onOpenChemistryDrawer={() => {
        handleSelectTool("select");
        setPhysicsDrawerOpen(false);
        setMathDrawerOpen(false);
        setChemistryDrawerOpen(true);
      }}
      onOpenSimLauncher={() => {
        handleSelectTool("select");
        setPhysicsDrawerOpen(false);
        setMathDrawerOpen(false);
        setChemistryDrawerOpen(false);
        setSimLauncherOpen(true);
      }}
      hasActiveSim={Boolean(activeSim)}
      onOpenCalculator={() => {
        if (!calculatorOpen) handleSelectTool("select");
        setCalculatorOpen((prev) => !prev);
      }}
      isCalculatorOpen={calculatorOpen}
      onGoHome={() => {
        handleSelectTool("select");
        setBoardManagerOpen(true);
      }}
      onOpenDecorHelp={() => {
        handleSelectTool("select");
        setStatusHint(
          "Chọn một đoạn thẳng trên bảng rồi dùng thanh Trang trí đoạn bên dưới."
        );
      }}
      onShare={() => {
        const url = buildShareUrl(activeRoomId);
        navigator.clipboard?.writeText(url).catch(() => {});
        setShareCopied(true);
        setShareModalOpen(true);
      }}
      getBoardElement={() => containerRef.current}
      labelScale={labelScale}
      dotScale={dotScale}
      boardConfig={currentBoardConfig}
      onChangeBoardConfig={(next: PageBoardConfig) => {
        writePageBoardConfig(doc, currentPage, next);
        if (next.pattern !== "none") setGridEnabled(true);
      }}
      onApplyBoardAllPages={(cfg: PageBoardConfig) => {
        applyBoardConfigToAllPages(doc, pageCount, cfg);
        setStatusHint("✓ Đã áp dụng loại bảng cho tất cả các trang");
      }}
      onScaleGeometry={(factor) => dispatcher.scaleGeometry(factor)}
      onChangeLabelScale={setLabelScale}
      onChangeDotScale={setDotScale}
      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      onExportPdf={() => setExportPdfModalOpen(true)}
      shortcutMap={shortcutMap}
      penOnlyMode={penOnlyMode}
      onTogglePenOnly={handleTogglePenOnly}
      inkToShape={inkToShape}
      onToggleInkToShape={handleToggleInkToShape}
      autoSwitchTarget={autoSwitchTarget}
      onToggleAutoSwitchTarget={handleToggleAutoSwitchTarget}
      laserConfig={laserConfig}
      onChangeLaserConfig={handleUpdateLaserConfig}
      onOpenLaserSettings={() => setLaserSettingsOpen(true)}
      toolbarVisibility={toolbarConfig}
      modularConfig={modularConfig}
      onChangeModularConfig={handleUpdateModularConfig}
      onOpenSettings={() => setSettingsModalOpen(true)}
      isSidebarOpen={pageSidebarOpen}
      isPortrait={isPortrait}
      isGuideEnabled={guideEnabled}
      onToggleGuide={toggleGuide}
    />
  );

  const selectedLineDecor =
    selectedElements.length === 1 && selectedElements[0].type === "LineDecor"
      ? selectedElements[0]
      : null;

  const selectedSegment = (() => {
    if (selectedElements.length !== 1) return null;
    const sel = selectedElements[0];
    if (sel.type === "GeomSegment") return sel;
    if (sel.type === "LineDecor" && typeof sel.props?.target === "string") {
      const target = byId.get(sel.props.target);
      if (target && target.type === "GeomSegment") return target;
    }
    return null;
  })();

  const attachedSegmentDecors = selectedSegment
    ? pageElements.filter(
        (el) =>
          !el.style?.hidden &&
          el.type === "LineDecor" &&
          el.props?.target === selectedSegment.id
      )
    : [];

  return (
    <div
      data-wb-room={activeRoomId}
      data-room-id={activeRoomId}
      className="relative w-screen h-screen overflow-hidden select-none bg-[#FBFBFD]"
    >
      {/* Single-Tab Lock Screen */}
      {isTabLocked && <TabLockOverlay onRetry={releaseTabLock} />}

      {/* Offline Banner */}
      <OfflineBanner isOffline={!isConnected} />

      {/* Main Whiteboard View */}
      <PageSidebar
        currentPage={currentPage}
        totalPages={pageCount}
        pagePdfStatus={pagePdfStatus}
        onTogglePagePdfLock={handleTogglePagePdfLock}
        isOpen={pageSidebarOpen}
        isPortrait={isPortrait}
        onToggleOpen={() => setPageSidebarOpen((v) => !v)}
        onOpenPageManager={() => setPageManagerOpen(true)}
        onInsertPdfPages={handleInsertPdfPages}
        onOpenSimLauncher={() => {
          handleSelectTool("select");
          setPhysicsDrawerOpen(false);
          setMathDrawerOpen(false);
          setSimLauncherOpen(true);
        }}
        hasActiveSim={Boolean(activeSim)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        selectedCount={selectedElements.length}
        onDeleteSelected={handleDeleteSelected}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenBoardManager={() => {
          handleSelectTool("select");
          setBoardManagerOpen(true);
        }}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onSelectPage={(p) => {
          setYjsCurrentPage(doc, p);
          if (isA4Format) {
            scrollToPage(p);
          }
        }}
        onAddPage={() => {
          const added = addYjsPage(doc);
          if (isA4Format) {
            setTimeout(() => {
              scrollToPage(added.count);
            }, 40);
          }
        }}
        onDeletePage={(p) => {
          if (doc && pageCount > 1) {
            deleteYjsPages(doc, [p]);
          }
        }}
      />
      {renderToolbar(false)}
      {renderCanvas(false)}

      {/* Tool & Feature Instruction Guide Bar */}
      {guideEnabled && (
        <InstructionGuideBar
          guide={activeGuideInfo}
          enabled={guideEnabled}
          onToggleEnabled={toggleGuide}
          isSidebarOpen={pageSidebarOpen}
          isPortrait={isPortrait}
          hasActiveStatusHint={Boolean(statusHint)}
          onClearStatusHint={() => {
            setStatusHint(null);
            setPickedItems([]);
            draftTwoPtRef.current = null;
            setDraftPreviewLine(null);
          }}
        />
      )}

      {/* Continuous A4 Overscroll Hold To Add Page Floating Indicator */}
      {isA4Format && overscrollState.isOverscrolling && (
        <div
          data-testid="overscroll-add-page-indicator"
          data-status={overscrollState.status}
          data-export-skip="true"
          style={{
            position: "fixed",
            bottom: 24,
            left: pageSidebarOpen ? "calc(50% + 70px)" : "50%",
            transform: "translateX(-50%)",
            zIndex: 85,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            borderRadius: 9999,
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border:
              overscrollState.status === "added"
                ? "1px solid #34d399"
                : "1px solid rgba(255, 255, 255, 0.2)",
            background:
              overscrollState.status === "added"
                ? "rgba(5, 150, 105, 0.95)"
                : "rgba(15, 23, 42, 0.92)",
            color: "#ffffff",
            pointerEvents: "none",
            userSelect: "none",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {overscrollState.status === "added" ? (
            <>
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.8}
                style={{ color: "#a7f3d0" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 0.2,
                }}
              >
                Đã thêm trang mới!
              </span>
            </>
          ) : (
            <>
              <div
                style={{
                  position: "relative",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9.5"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9.5"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 9.5}
                    strokeDashoffset={
                      2 * Math.PI * 9.5 * (1 - overscrollState.progress)
                    }
                    style={{ transition: "stroke-dashoffset 0.05s linear" }}
                  />
                </svg>
                <span
                  style={{
                    position: "absolute",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#7dd3fc",
                    lineHeight: 1,
                  }}
                >
                  +
                </span>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#f8fafc",
                }}
              >
                Giữ để thêm trang mới (
                {Math.round(overscrollState.progress * 100)}%)
              </span>
            </>
          )}
        </div>
      )}

      {/* Fallback Construction Status Hint Pill (when guide is disabled but active construction is in progress) */}
      {statusHint && !guideEnabled && (
        <div
          data-wb-construct-hint="true"
          data-export-skip="true"
          style={{
            position: "fixed",
            top: isPortrait ? 96 : 56,
            left: isPortrait ? "50%" : pageSidebarOpen ? "calc(50% + 70px)" : "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            background: "#0f172a",
            color: "#ffffff",
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.22)",
          }}
        >
          <span>{statusHint}</span>
          <button
            type="button"
            onClick={() => {
              setStatusHint(null);
              setPickedItems([]);
              draftTwoPtRef.current = null;
              setDraftPreviewLine(null);
            }}
            style={{
              border: "none",
              background: "rgba(255,255,255,0.16)",
              color: "#ffffff",
              borderRadius: 999,
              padding: "1px 7px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Post-Snap Ink-to-Shape Quick Switch & Revert Floating Pill */}
      {lastInkSnap && (
        <div
          data-wb-ink-snap-pill="true"
          data-export-skip="true"
          style={{
            position: "fixed",
            bottom: 18,
            left: isPortrait ? "50%" : pageSidebarOpen ? "calc(50% + 70px)" : "50%",
            transform: "translateX(-50%)",
            zIndex: 72,
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.28)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
          }}
        >
          <span style={{ color: "#93c5fd", fontWeight: 600 }}>
            ✨ {lastInkSnap.shapeType === "circle"
              ? "Hình tròn"
              : lastInkSnap.shapeType === "ellipse"
              ? "Hình elip"
              : lastInkSnap.shapeType === "rectangle"
              ? "Hình chữ nhật"
              : lastInkSnap.shapeType === "triangle"
              ? "Tam giác"
              : lastInkSnap.shapeType === "arrow"
              ? "Mũi tên"
              : "Đoạn thẳng"}
          </span>

          {(lastInkSnap.shapeType === "circle" || lastInkSnap.shapeType === "ellipse") &&
            lastInkSnap.rx &&
            lastInkSnap.ry && (
              <button
                type="button"
                data-action="toggle-circle-ellipse"
                onClick={() => {
                  const snap = lastInkSnap;
                  const nextType = snap.shapeType === "circle" ? "ellipse" : "circle";
                  if (nextType === "circle") {
                    const avgR = Number((((snap.rx ?? 1) + (snap.ry ?? 1)) / 2).toFixed(3));
                    dispatcher.dispatch({
                      type: "object.update",
                      params: {
                        id: snap.elementId,
                        props: {
                          radius: { kind: "value", v: avgR },
                          rx: undefined,
                          ry: undefined,
                          rotation: undefined,
                        },
                      },
                    });
                  } else {
                    const rxVal = Number((snap.rx ?? 1.4).toFixed(3));
                    const ryVal = Number(
                      (Math.abs((snap.rx ?? 1.4) - (snap.ry ?? 1.0)) < 0.05
                        ? rxVal * 0.65
                        : (snap.ry ?? 1.0)
                      ).toFixed(3)
                    );
                    dispatcher.dispatch({
                      type: "object.update",
                      params: {
                        id: snap.elementId,
                        props: {
                          radius: { kind: "value", v: Number(((rxVal + ryVal) / 2).toFixed(3)) },
                          rx: rxVal,
                          ry: ryVal,
                          rotation: snap.rotation ?? 0,
                        },
                      },
                    });
                  }
                  setLastInkSnap({ ...snap, shapeType: nextType });
                }}
                style={{
                  border: "1px solid rgba(56, 189, 248, 0.45)",
                  background: "rgba(56, 189, 248, 0.16)",
                  color: "#e0f2fe",
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {lastInkSnap.shapeType === "circle" ? "⬭ Đổi sang Elip" : "⭕ Đổi sang Hình tròn"}
              </button>
            )}

          <button
            type="button"
            data-action="revert-ink-snap"
            onClick={() => {
              const snap = lastInkSnap;
              if (lastInkSnapTimerRef.current) {
                clearTimeout(lastInkSnapTimerRef.current);
                lastInkSnapTimerRef.current = null;
              }
              setLastInkSnap(null);
              dispatcher.batch(() => {
                dispatcher.deleteObjects([snap.elementId]);
                dispatcher.dispatch({
                  type: "ink.stroke",
                  params: {
                    points: snap.rawPoints,
                    pressures: snap.rawPressures,
                    nib: snap.nib,
                    style: snap.style,
                    page: snap.page,
                  },
                });
              });
            }}
            style={{
              border: "none",
              background: "rgba(255, 255, 255, 0.14)",
              color: "#ffffff",
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ↩ Giữ nét vẽ tay
          </button>

          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setLastInkSnap(null)}
            style={{
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              fontSize: 12,
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Flood-Fill Name-Input Helper Strip */}
      {activeTool === "floodFill" && (
        <div
          data-export-skip="true"
          style={{
            position: "fixed",
            bottom: 14,
            left: isPortrait ? "50%" : pageSidebarOpen ? "calc(50% + 70px)" : "50%",
            transform: "translateX(-50%)",
            zIndex: 62,
            background: "#0f172a",
            color: "#ffffff",
            padding: "6px 10px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            boxShadow: "0 6px 20px rgba(15, 23, 42, 0.25)",
          }}
        >
          <span>Bấm vào trong vùng cần tô</span>
          <input
            data-wb-fill-names="true"
            placeholder="vd: ABC"
            value={fillNamesInput}
            onChange={(e) => setFillNamesInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && fillNamesInput.trim().length >= 3) {
                const chars = fillNamesInput
                  .trim()
                  .toUpperCase()
                  .split(/\s+|(?=[A-Z])/);
                const pts: Point2D[] = [];
                const ids: string[] = [];
                for (const name of chars) {
                  const ptEl = pageElements.find(
                    (el) =>
                      (el.type === "GeomPoint" || el.type === "Point") &&
                      String(el.props?.name ?? "").toUpperCase() === name
                  );
                  if (ptEl) {
                    const p = hydratedPts.get(ptEl.id);
                    if (p) {
                      pts.push(p);
                      ids.push(ptEl.id);
                    }
                  }
                }
                if (pts.length >= 3) {
                  const polyId = newElId("fillpoly");
                  const embedded: EmbeddedVertex[] = pts.map((pt, i) => ({
                    id: `${polyId}_v${i}`,
                    name: "",
                    x: pt.x,
                    y: pt.y,
                  }));
                  dispatcher.dispatch({
                    type: "object.create",
                    params: {
                      id: polyId,
                      type: "GeomPolygon",
                      style: {
                        stroke: "transparent",
                        fill: fillColor,
                        opacity: 0.35,
                      },
                      props: {
                        vertices: ids.length === pts.length ? ids : embedded.map((v) => v.id),
                        points: embedded,
                      },
                    },
                  });
                  setFillNamesInput("");
                }
              }
            }}
            style={{
              width: 74,
              height: 24,
              borderRadius: 6,
              border: "1px solid #475569",
              background: "#1e293b",
              color: "#ffffff",
              padding: "0 6px",
              fontSize: 12,
            }}
          />
          <button
            type="button"
            onClick={() => handleSelectTool("select")}
            style={{
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 7,
              padding: "4px 9px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Thôi tô (✋ Chọn)
          </button>
        </div>
      )}

      {/* Contextual Segment Decoration Bar */}
      {selectedSegment && (
        <div
          data-export-skip="true"
          data-wb-segment-decor-bar="true"
          style={{
            position: "fixed",
            bottom: 64,
            left: pageSidebarOpen ? 152 : 38,
            zIndex: 85,
            maxWidth: `calc(100vw - ${(pageSidebarOpen ? 152 : 38) + 12}px)`,
            transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "5px 8px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
            fontSize: 12,
          }}
        >
          {(
            [
              { kind: "dim", label: "📏 Kích thước", text: "a", defaultSide: 1 as const },
              { kind: "label", label: "🏷 Ghi chữ", text: "cạnh", defaultSide: 1 as const },
              { kind: "ground", label: "▨ Mặt đất", text: "", defaultSide: -1 as const },
              { kind: "water", label: "〰 Mặt nước", text: "", defaultSide: -1 as const },
            ] as const
          ).map((d) => {
            const matchingDecors = attachedSegmentDecors.filter(
              (el) => el.props?.kind === d.kind
            );
            const isActive = matchingDecors.length > 0;
            return (
              <button
                key={d.kind}
                type="button"
                data-decor-kind={d.kind}
                data-active={isActive ? "true" : "false"}
                aria-pressed={isActive}
                title={
                  isActive
                    ? `Bấm để xoá trang trí ${d.label}`
                    : `Thêm trang trí ${d.label}`
                }
                onClick={() => {
                  if (isActive) {
                    const deleteIds = matchingDecors.map((el) => el.id);
                    dispatcher.deleteObjects(deleteIds);
                    if (
                      selectedLineDecor &&
                      deleteIds.includes(selectedLineDecor.id)
                    ) {
                      setSelectedIds([selectedSegment.id]);
                    }
                  } else {
                    dispatcher.dispatch({
                      type: "object.create",
                      params: {
                        type: "LineDecor",
                        props: {
                          target: selectedSegment.id,
                          kind: d.kind,
                          side: d.defaultSide,
                          ...(d.text ? { text: d.text } : {}),
                        },
                      },
                    });
                  }
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: isActive ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                  background: isActive ? "#eff6ff" : "#f8fafc",
                  color: isActive ? "#1d4ed8" : "#1e293b",
                  cursor: "pointer",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {d.label}
              </button>
            );
          })}
          {attachedSegmentDecors.length > 0 && (
            <>
              <div
                style={{
                  width: 1,
                  alignSelf: "stretch",
                  background: "#e2e8f0",
                  margin: "2px 0",
                }}
              />
              <button
                type="button"
                data-action="line-decor-flip"
                title="Đảo mặt trang trí giữa mặt trên và mặt dưới đoạn thẳng"
                onClick={() => {
                  const targets = selectedLineDecor
                    ? [selectedLineDecor]
                    : attachedSegmentDecors;
                  dispatcher.batch(() => {
                    for (const decor of targets) {
                      const kindVal = decor.props?.kind as string | undefined;
                      const defSide: 1 | -1 =
                        kindVal === "ground" || kindVal === "water" ? -1 : 1;
                      const curSide: 1 | -1 =
                        decor.props?.side === -1
                          ? -1
                          : decor.props?.side === 1
                            ? 1
                            : defSide;
                      const nextSide: 1 | -1 = curSide === 1 ? -1 : 1;
                      dispatcher.dispatch({
                        type: "object.update",
                        params: {
                          id: decor.id,
                          props: { ...decor.props, side: nextSide },
                        },
                      });
                    }
                  });
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#334155",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                ⇅ Đổi mặt
              </button>
              <button
                type="button"
                data-action="line-decor-clear"
                title="Xoá toàn bộ trang trí trên đoạn thẳng này"
                onClick={() => {
                  dispatcher.deleteObjects(
                    attachedSegmentDecors.map((el) => el.id)
                  );
                  if (selectedLineDecor) {
                    setSelectedIds([selectedSegment.id]);
                  }
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                🗑 Xoá trang trí
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating Selection Bar */}
      <SelectionBar
          sidebarOpen={pageSidebarOpen}
          isPortrait={isPortrait}
          selectedCount={selectedElements.length}
          hiddenCount={hiddenCount}
          lockedElements={lockedElements}
          onUnlockElement={handleUnlockElement}
          onUnlockAll={handleUnlockAllLocked}
          onHoverLockedElement={setHoveredLockedId}
          selectedAxes2D={selectedAxes2D}
          selectedAxes3D={
            selectedElements.length === 1 && selectedElements[0].type === "Axes3D"
              ? selectedElements[0]
              : null
          }
          selectedSolidEl={
            selectedElements.length === 1 && selectedElements[0].type === "Solid3D"
              ? selectedElements[0]
              : null
          }
          selectedPoints={selectedPoints}
          selectedMathText={
            selectedElements.length === 1 && selectedElements[0].type === "MathText"
              ? selectedElements[0]
              : null
          }
          onEditMath={() => {
            const mathEl =
              selectedElements.length === 1 && selectedElements[0].type === "MathText"
                ? selectedElements[0]
                : null;
            if (mathEl) handleEditMathElement(mathEl);
          }}
          onSolveEquation={() => {
            const mathEl =
              selectedElements.length === 1 && selectedElements[0].type === "MathText"
                ? selectedElements[0]
                : null;
            if (mathEl && typeof mathEl.props?.latex === "string") {
              handleSolveMathLatex(mathEl.props.latex);
            }
          }}
          selectedSolidSubPart={activeSolidSubPart}
          isSolidFaceFilled={Boolean(
            activeSolidSubPart?.kind === "face" &&
              (byId.get(activeSolidSubPart.solidId)?.props.faceFill as
                | Record<string, string>
                | undefined)?.[activeSolidSubPart.faceKey]
          )}
          isSolidEdgeMeasured={Boolean(
            activeSolidSubPart?.kind === "edge" &&
              (byId.get(activeSolidSubPart.solidId)?.props.edgeMeasures as
                | Record<string, boolean>
                | undefined)?.[activeSolidSubPart.edgeKey]
          )}
          labelScale={labelScale}
          dotScale={dotScale}
          onSolidUnfold={() => {
            const solid =
              selectedElements.length === 1 && selectedElements[0].type === "Solid3D"
                ? selectedElements[0]
                : null;
            if (!solid) return;
            const netRes = computeUnfoldedPolyhedronNet(solid.id, solved3D, pageElements);
            if (netRes && netRes.polygons.length > 0) {
              dispatcher.batch(() => {
                netRes.polygons.forEach((polyEl) => {
                  dispatcher.dispatch({
                    type: "object.create",
                    params: {
                      id: polyEl.id,
                      type: polyEl.type,
                      transform: polyEl.transform,
                      style: polyEl.style,
                      props: polyEl.props,
                    },
                  });
                });
                netRes.points?.forEach((ptEl) => {
                  dispatcher.dispatch({
                    type: "object.create",
                    params: {
                      id: ptEl.id,
                      type: ptEl.type,
                      transform: ptEl.transform,
                      style: ptEl.style,
                      props: ptEl.props,
                    },
                  });
                });
              });
              const ptsCount = netRes.points?.length ?? 0;
              setStatusHint(
                `✓ Đã trải phẳng ${netRes.polygons.length} mặt của khối${ptsCount > 0 ? ` cùng ${ptsCount} điểm đặc biệt` : ""}`
              );
            } else {
              setStatusHint("Không thể trải phẳng khối này (chỉ hỗ trợ hình chóp, lăng trụ, hộp chữ nhật, lập phương)");
            }
          }}
          onSolidSelectWhole={() => setSolidSubSel(null)}
          onSolidFaceFlatten={() => {
            if (activeSolidSubPart?.kind !== "face") return;
            const flat = computeFlattenedFace(
              activeSolidSubPart.vertIds,
              solved3D,
              pageElements,
              { x: 2.2, y: 0 }
            );
            if (!flat) return;
            const polyEl = flat.polygonElement;
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: polyEl.id,
                type: polyEl.type,
                transform: polyEl.transform,
                style: polyEl.style,
                props: polyEl.props,
              },
            });
          }}
          onSolidFaceFill={() => {
            if (activeSolidSubPart?.kind !== "face") return;
            const solid = byId.get(activeSolidSubPart.solidId);
            if (!solid) return;
            const prevFill =
              (solid.props.faceFill as Record<string, string> | undefined) ?? {};
            const nextFill = { ...prevFill };
            if (nextFill[activeSolidSubPart.faceKey]) {
              delete nextFill[activeSolidSubPart.faceKey];
            } else {
              nextFill[activeSolidSubPart.faceKey] =
                fillColor && fillColor !== "none"
                  ? `${fillColor}38`
                  : "rgba(37, 99, 235, 0.22)";
            }
            handleUpdateElementProps(solid.id, { faceFill: nextFill });
          }}
          onSolidFaceExtendPlane={() => {
            if (activeSolidSubPart?.kind !== "face") return;
            const pts2 = activeSolidSubPart.vertIds
              .map((id) => hydratedPts.get(id))
              .filter((p): p is Point2D => Boolean(p));
            if (pts2.length < 3) return;
            const cx = pts2.reduce((s, p) => s + p.x, 0) / pts2.length;
            const cy = pts2.reduce((s, p) => s + p.y, 0) / pts2.length;
            const expanded =
              pts2.length === 3
                ? [
                    pts2[0],
                    pts2[1],
                    {
                      x: pts2[1].x + (pts2[2].x - pts2[0].x),
                      y: pts2[1].y + (pts2[2].y - pts2[0].y),
                    },
                    pts2[2],
                  ].map((p) => ({
                    x: cx + (p.x - cx) * 1.45,
                    y: cy + (p.y - cy) * 1.45,
                  }))
                : pts2.map((p) => ({
                    x: cx + (p.x - cx) * 1.45,
                    y: cy + (p.y - cy) * 1.45,
                  }));
            const polyId = newElId("plane");
            const embedded: EmbeddedVertex[] = expanded.map((p, idx) => ({
              id: `${polyId}_v${idx}`,
              name: "",
              x: p.x,
              y: p.y,
            }));
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: polyId,
                type: "GeomPolygon",
                transform: { x: 0, y: 0, scale: 1, rotation: 0, z: -1 },
                style: {
                  stroke: "#64748b",
                  fill: "rgba(148, 163, 184, 0.14)",
                  width: 1.5,
                  dash: true,
                },
                props: {
                  vertices: embedded.map((v) => v.id),
                  points: embedded,
                  label: `(${activeSolidSubPart.faceLabel})`,
                },
              },
            });
          }}
          onSolidFaceCenter={() => {
            if (activeSolidSubPart?.kind !== "face") return;
            const refs = activeSolidSubPart.vertIds;
            const pts2 = refs
              .map((id) => hydratedPts.get(id))
              .filter((p): p is Point2D => Boolean(p));
            if (refs.length < 3 || pts2.length === 0) return;
            const cx = pts2.reduce((s, p) => s + p.x, 0) / pts2.length;
            const cy = pts2.reduce((s, p) => s + p.y, 0) / pts2.length;
            const name = getNextPointName(pageElements, ["O", "I", "G", "M"]);
            const res = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomPoint",
                transform: { x: cx, y: cy, scale: 1, rotation: 0, z: 0 },
                props: {
                  name,
                  constraint: {
                    kind: "combo",
                    refs,
                    w: refs.map(() => 1 / refs.length),
                  },
                },
              },
            });
            if (res.created?.[0]) {
              setSolidSubSel(null);
              setSelectedIds([res.created[0]]);
            }
          }}
          onSolidEdgeMeasure={() => {
            if (activeSolidSubPart?.kind !== "edge") return;
            const solid = byId.get(activeSolidSubPart.solidId);
            if (!solid) return;
            const prevMeasures =
              (solid.props.edgeMeasures as Record<string, boolean> | undefined) ??
              {};
            handleUpdateElementProps(solid.id, {
              edgeMeasures: {
                ...prevMeasures,
                [activeSolidSubPart.edgeKey]: !prevMeasures[activeSolidSubPart.edgeKey],
              },
            });
          }}
          onSolidEdgeMidpoint={() => {
            if (activeSolidSubPart?.kind !== "edge") return;
            const pA = hydratedPts.get(activeSolidSubPart.aId);
            const pB = hydratedPts.get(activeSolidSubPart.bId);
            if (!pA || !pB) return;
            const mid = midpoint2D(pA, pB);
            const name = getNextPointName(pageElements, ["M", "N", "I", "K"]);
            const res = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomPoint",
                transform: { x: mid.x, y: mid.y, scale: 1, rotation: 0, z: 0 },
                props: {
                  name,
                  constraint: {
                    kind: "midpointOf",
                    a: activeSolidSubPart.aId,
                    b: activeSolidSubPart.bId,
                  },
                },
              },
            });
            if (res.created?.[0]) {
              setSolidSubSel(null);
              setSelectedIds([res.created[0]]);
            }
          }}
          onSolidEdgePoint={() => {
            if (activeSolidSubPart?.kind !== "edge") return;
            const pA = hydratedPts.get(activeSolidSubPart.aId);
            const pB = hydratedPts.get(activeSolidSubPart.bId);
            if (!pA || !pB) return;
            const usedTs = new Set(
              pageElements
                .filter(
                  (el) =>
                    el.type === "GeomPoint" &&
                    (el.props?.constraint as { kind?: string; a?: string; b?: string } | undefined)
                      ?.kind === "onLine" &&
                    ((el.props?.constraint as { a?: string; b?: string }).a ===
                      activeSolidSubPart.aId &&
                      (el.props?.constraint as { a?: string; b?: string }).b ===
                        activeSolidSubPart.bId)
                )
                .map((el) =>
                  Number((el.props?.constraint as { t?: number }).t ?? 0.35).toFixed(2)
                )
            );
            const t =
              [0.35, 0.65, 0.25, 0.75, 0.5].find((cand) => !usedTs.has(cand.toFixed(2))) ??
              0.35;
            const pos = { x: pA.x + t * (pB.x - pA.x), y: pA.y + t * (pB.y - pA.y) };
            const name = getNextPointName(pageElements, ["M", "N", "P", "Q"]);
            const res = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomPoint",
                transform: { x: pos.x, y: pos.y, scale: 1, rotation: 0, z: 0 },
                props: {
                  name,
                  constraint: {
                    kind: "onLine",
                    a: activeSolidSubPart.aId,
                    b: activeSolidSubPart.bId,
                    t,
                  },
                },
              },
            });
            if (res.created?.[0]) {
              setSolidSubSel(null);
              setSelectedIds([res.created[0]]);
            }
          }}
          onSolidEdgePerpBisector={() => {
            if (activeSolidSubPart?.kind !== "edge") return;
            const pA = hydratedPts.get(activeSolidSubPart.aId);
            const pB = hydratedPts.get(activeSolidSubPart.bId);
            if (!pA || !pB) return;
            const mid = midpoint2D(pA, pB);
            const dx = pB.x - pA.x;
            const dy = pB.y - pA.y;
            const len = Math.hypot(dx, dy) || 1;
            const span = Math.max(1.2, Math.min(len * 0.65, 5.5));
            const nx = -dy / len;
            const ny = dx / len;
            const res = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomConstruction",
                props: {
                  kind: "perpBisector",
                  sideA: activeSolidSubPart.aId,
                  sideB: activeSolidSubPart.bId,
                  fromPt: { x: mid.x - nx * span, y: mid.y - ny * span },
                  toPt: { x: mid.x + nx * span, y: mid.y + ny * span },
                  sideAPt: pA,
                  sideBPt: pB,
                },
              },
            });
            if (res.created?.[0]) {
              setSolidSubSel(null);
              setSelectedIds([res.created[0]]);
            }
          }}
          onDelete={handleDeleteSelected}
          onDuplicate={handleDuplicateSelected}
          onCopy={handleCopySelected}
          onCut={handleCutSelected}
          onHide={handleHideSelected}
          onUnhideAll={handleUnhideAll}
          onPointRename={() => openPointRename(selectedPoints.map((pt) => pt.id))}
          onPointToggleHideName={() => {
            if (selectedPoints.length === 0) return;
            const allHidden = selectedPoints.every((pt) => pt.props?.hideName === true);
            dispatcher.batch(() => {
              for (const pt of selectedPoints) {
                handleUpdateElementProps(pt.id, { hideName: !allHidden });
              }
            });
          }}
          onPointCycleDot={() => {
            if (selectedPoints.length === 0) return;
            const cur =
              selectedPoints[0].props?.dot === "cross"
                ? "cross"
                : selectedPoints[0].props?.dot === "none"
                ? "none"
                : "dot";
            const next = cur === "dot" ? "cross" : cur === "cross" ? "none" : "dot";
            dispatcher.batch(() => {
              for (const pt of selectedPoints) {
                handleUpdateElementProps(pt.id, { dot: next });
              }
            });
          }}
          onPointChangeDotSize={(delta) => {
            if (selectedPoints.length === 0) return;
            dispatcher.batch(() => {
              for (const pt of selectedPoints) {
                const cur =
                  typeof pt.props?.dotSize === "number" && pt.props.dotSize > 0
                    ? pt.props.dotSize
                    : dotScale;
                const next = Math.max(0.5, Math.min(3.0, Number((cur + delta).toFixed(2))));
                handleUpdateElementProps(pt.id, { dotSize: next });
              }
            });
          }}
          onPointResetDotSize={() => {
            if (selectedPoints.length === 0) return;
            dispatcher.batch(() => {
              for (const pt of selectedPoints) {
                handleUpdateElementProps(pt.id, { dotSize: DEFAULT_DOT_SCALE });
              }
            });
          }}
          onChangeLabelScale={setLabelScale}
          onAxesPlot={() => setPlotDialogOpen(true)}
          onAxesAddPoint={() => setAxesPointDialogOpen(true)}
          onAxesToggleGrid={() => {
            if (!selectedAxes2D) return;
            handleUpdateElementProps(selectedAxes2D.id, {
              grid: selectedAxes2D.props?.grid === false,
            });
          }}
          onAxesToggleTicks={() => {
            if (!selectedAxes2D) return;
            const nextTicks =
              selectedAxes2D.props?.ticks === "pi" ? "int" : "pi";
            handleUpdateElementProps(selectedAxes2D.id, { ticks: nextTicks });
          }}
          onAxesAddVector={() => setAxesVectorDialogOpen(true)}
          onAxes3DAddPoint={() => setAxes3DPointDialogOpen(true)}
          onAxes3DAddVector={() => setAxes3DVectorDialogOpen(true)}
          onAxes3DAddPlane={() => setAxes3DFigureDialogKind("plane")}
          onAxes3DAddLine={() => setAxes3DFigureDialogKind("line")}
          onAxes3DAddSphere={() => setAxes3DFigureDialogKind("sphere")}
          onAxesOpenConic={() => setConicDialogKind("ellipse")}
          onAxesOpenEquation={() => setCurve2dDialogMode("equation")}
          onAxesOpenInequality={() => setCurve2dDialogMode("inequality")}
          onAxesOpenParametric={() => setCurve2dDialogMode("parametric")}
          onAxesOpenSequence={() => setCurve2dDialogMode("sequence")}
          onRotateSelection={(deltaDeg) => {
            if (selectedElements.length === 0) return;
            const bbox = getCompositeBoundingBox(selectedElements, pageElements, viewport.scale);
            const center: Point2D = bbox
              ? { x: bbox.centerX, y: bbox.centerY }
              : {
                  x:
                    selectedElements.reduce((sum, e) => sum + e.transform.x, 0) /
                    selectedElements.length,
                  y:
                    selectedElements.reduce((sum, e) => sum + e.transform.y, 0) /
                    selectedElements.length,
                };

            const rotatedPointIds = new Set<string>();
            const rotateFreePointById = (ptId: unknown) => {
              if (typeof ptId !== "string" || rotatedPointIds.has(ptId)) return;
              const ptEl = byId.get(ptId);
              if (!ptEl || (ptEl.type !== "GeomPoint" && ptEl.type !== "Point")) return;
              const kind = (ptEl.props?.constraint as { kind?: string } | undefined)?.kind ?? "free";
              if (kind !== "free") return;
              rotatedPointIds.add(ptId);
              const p = rotatePointAround(
                { x: ptEl.transform.x, y: ptEl.transform.y },
                center,
                deltaDeg
              );
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: ptEl.id,
                  transform: { x: p.x, y: p.y },
                },
              });
            };

            dispatcher.batch(() => {
              for (const el of selectedElements) {
                if (el.type === "Solid3D" || el.type === "Axes3D") {
                  const sProps = el.props as Partial<Solid3DProps>;
                  const curAz = typeof sProps.azimuth === "number" ? sProps.azimuth : 26;
                  const curEl = typeof sProps.elevation === "number" ? sProps.elevation : 17;
                  let nextAz = Math.round(curAz + deltaDeg);
                  while (nextAz > 180) nextAz -= 360;
                  while (nextAz < -180) nextAz += 360;
                  const nextCam = azimuthElevationToCamera(nextAz, curEl);
                  setOrbitCamById((prev) => ({ ...prev, [el.id]: nextCam }));
                  dispatcher.dispatch({
                    type: "object.update",
                    params: {
                      id: el.id,
                      props: { ...el.props, azimuth: nextAz, elevation: curEl },
                    },
                  });
                } else if (el.type === "GeomPoint" || el.type === "Point") {
                  rotateFreePointById(el.id);
                } else if (el.type === "GeomPolygon") {
                  if (Array.isArray(el.props.points)) {
                    const rotatedPts = (el.props.points as EmbeddedVertex[]).map((v) => {
                      const wx = v.x + el.transform.x;
                      const wy = v.y + el.transform.y;
                      const r = rotatePointAround({ x: wx, y: wy }, center, deltaDeg);
                      return {
                        ...v,
                        x: r.x - el.transform.x,
                        y: r.y - el.transform.y,
                      };
                    });
                    dispatcher.dispatch({
                      type: "object.update",
                      params: {
                        id: el.id,
                        props: { ...el.props, points: rotatedPts },
                      },
                    });
                  } else if (Array.isArray(el.props.vertices)) {
                    for (const vid of el.props.vertices) {
                      rotateFreePointById(vid);
                    }
                  }
                } else if (el.type === "GeomCircle") {
                  rotateFreePointById(el.props.center);
                  const rad = el.props.radius as Record<string, unknown> | undefined;
                  if (rad?.kind === "through") {
                    rotateFreePointById(rad.point);
                  }
                  if (el.props.centerPt && typeof el.props.centerPt === "object") {
                    const nextCenter = rotatePointAround(el.props.centerPt as Point2D, center, deltaDeg);
                    dispatcher.dispatch({
                      type: "object.update",
                      params: {
                        id: el.id,
                        props: { ...el.props, centerPt: nextCenter },
                      },
                    });
                  }
                } else if (
                  el.type === "GeomSegment" ||
                  el.type === "GeomVector" ||
                  el.type === "GeomRay" ||
                  (el.type === "GeomLine" && el.props.def === "through")
                ) {
                  rotateFreePointById(el.props.from);
                  rotateFreePointById(el.props.to);
                  const nextProps: Record<string, unknown> = { ...el.props };
                  let changed = false;
                  if (el.props.fromPt && typeof el.props.fromPt === "object") {
                    nextProps.fromPt = rotatePointAround(el.props.fromPt as Point2D, center, deltaDeg);
                    changed = true;
                  }
                  if (el.props.toPt && typeof el.props.toPt === "object") {
                    nextProps.toPt = rotatePointAround(el.props.toPt as Point2D, center, deltaDeg);
                    changed = true;
                  }
                  if (changed) {
                    dispatcher.dispatch({
                      type: "object.update",
                      params: { id: el.id, props: nextProps },
                    });
                  }
                } else if (el.type === "Ink") {
                  const pts = (el.props.points as number[]) || [];
                  const rotatedPoints: number[] = [];
                  for (let i = 0; i + 1 < pts.length; i += 2) {
                    const wx = el.transform.x + pts[i] * el.transform.scale;
                    const wy = el.transform.y + pts[i + 1] * el.transform.scale;
                    const r = rotatePointAround({ x: wx, y: wy }, center, deltaDeg);
                    rotatedPoints.push(r.x, r.y);
                  }
                  dispatcher.dispatch({
                    type: "object.update",
                    params: {
                      id: el.id,
                      transform: { x: 0, y: 0, scale: 1 },
                      props: { ...el.props, points: rotatedPoints },
                    },
                  });
                } else {
                  const r = rotatePointAround({ x: el.transform.x, y: el.transform.y }, center, deltaDeg);
                  dispatcher.dispatch({
                    type: "object.update",
                    params: {
                      id: el.id,
                      transform: {
                        ...el.transform,
                        x: r.x,
                        y: r.y,
                        rotation: Math.round(((el.transform.rotation || 0) + deltaDeg) % 360),
                      },
                    },
                  });
                }
              }
            });
          }}
          onLockSelection={handleLockSelection}
        />

      {/* 3D Orbital Controls Bar */}
      {activeOrbitElement && (
        <OrbitBar
          visible={true}
          isPortrait={isPortrait}
          azimuth={activeOrbitAngles.azimuth}
          elevation={activeOrbitAngles.elevation}
          isAutoSpin={isAutoSpin}
          onChangeAzimuth={(deg) =>
            applyOrbitCamera(
              activeOrbitElement,
              azimuthElevationToCamera(deg, activeOrbitAngles.elevation)
            )
          }
          onChangeElevation={(deg) =>
            applyOrbitCamera(
              activeOrbitElement,
              azimuthElevationToCamera(activeOrbitAngles.azimuth, deg)
            )
          }
          onOrbitDrag={(dx, dy) =>
            applyOrbitCamera(
              activeOrbitElement,
              orbitCamera(activeOrbitCam, -dx * 0.012, dy * 0.012)
            )
          }
          onReset={() => {
            const defCam = defaultCameraForSolid(
              activeOrbitElement.type === "Axes3D"
                ? "axes"
                : ((activeOrbitElement.props as Partial<Solid3DProps>).kind ??
                    "pyramid")
            );
            applyOrbitCamera(activeOrbitElement, defCam);
            setIsAutoSpin(false);
          }}
          onToggleSpin={() => setIsAutoSpin((v) => !v)}
          onDone={() => {
            setIsAutoSpin(false);
            setOrbitActiveId(null);
          }}
        />
      )}

      {/* MathLive Inline Formula Editor */}
      {mathSession && (
        <MathEditor
          initialLatex={mathSession.initialLatex}
          worldPos={mathSession.worldPos}
          viewport={viewport}
          defaultKeyboardOpen={true}
          onCommit={(latex) => {
            if (mathSession.elementId) {
              const existing = byId.get(mathSession.elementId);
              if (existing) {
                dispatcher.dispatch({
                  type: "object.update",
                  params: {
                    id: existing.id,
                    props: { ...existing.props, latex },
                  },
                });
              }
            } else {
              const res = dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "MathText",
                  transform: {
                    x: mathSession.worldPos.x,
                    y: mathSession.worldPos.y,
                    scale: 1,
                    rotation: 0,
                    z: 0,
                  },
                  style: { stroke: currentStyle.stroke ?? "#0f172a" },
                  props: { latex },
                },
              });
              if (res.created?.[0]) setSelectedIds([res.created[0]]);
            }
            setMathSession(null);
            resetToolAfterCreation();
          }}
          onCancel={() => {
            setMathSession(null);
            resetToolAfterCreation();
          }}
          onSolveEquation={(latex) => {
            handleSolveMathLatex(latex);
          }}
          onPlotFunction={(latex) => {
            const clean = latex.replace(/^[yY]\s*=\s*/, "").replace(/^f\(x\)\s*=\s*/, "").trim();
            handleSubmitPlot(clean || latex, []);
            setStatusHint("Đã vẽ đồ thị hàm số sang hệ trục Oxy");
          }}
          onBuildVarTable={(latex) => {
            const clean = latex.replace(/^[yY]\s*=\s*/, "").replace(/^f\(x\)\s*=\s*/, "").trim();
            const exprToUse = clean || "x^2 - 2x";
            const res = buildVarTableFromExpr(exprToUse);
            if ("error" in res) {
              setStatusHint(res.error);
              return;
            }
            const center = getViewCenter();
            const vtRes = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "VarTable",
                transform: { x: center.x, y: center.y - 1, scale: 1, rotation: 0, z: 0 },
                style: { stroke: "#0f172a", width: 1.5 },
                props: { table: res, formulaLatex: exprToUse },
              },
            });
            if (vtRes.created?.[0]) setSelectedIds([vtRes.created[0]]);
            setStatusHint("Đã tạo bảng biến thiên tự động");
          }}
          onShadeIntegral={(latex) => {
            const clean = latex.replace(/^[yY]\s*=\s*/, "").replace(/^f\(x\)\s*=\s*/, "").trim();
            handleSubmitPlot(clean || latex, [], [-2, 2]);
            // Find created plot and set shade domain
            setTimeout(() => {
              const created = pageElements.find(
                (el) => el.type === "Plot" && (el.props.exprLatex === clean || el.props.exprLatex === latex)
              );
              if (created) {
                dispatcher.dispatch({
                  type: "object.update",
                  params: {
                    id: created.id,
                    props: { ...created.props, shade: [0, 2] },
                  },
                });
              }
            }, 50);
            setStatusHint("Đã vẽ hàm số và tô miền tích phân [0, 2]");
          }}
        />
      )}

      {/* Equation / System of Equations Solver Modal */}
      <EquationSolverModal
        isOpen={equationModalOpen}
        onClose={() => setEquationModalOpen(false)}
        solution={equationSolution}
        onInsertToCanvas={(latex) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "MathText",
              transform: {
                x: center.x,
                y: center.y - 1,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              style: { stroke: "#2563eb" },
              props: { latex },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          handleSelectTool("select");
          setStatusHint("Đã chèn nghiệm phương trình lên bảng");
        }}
      />

      {/* M3 Config Dialogs */}
      <PlotConfigDialog
        open={plotDialogOpen}
        onSubmit={handleSubmitPlot}
        onCancel={() => setPlotDialogOpen(false)}
      />

      <AxesPointDialog
        open={axesPointDialogOpen}
        defaultName={getNextPointName(pageElements, ["M", "N", "P", "Q", "A", "B"])}
        onSubmit={(name, x, y) => {
          const axesId = ensureAxes2D();
          const axesEl = pageElements.find((e) => e.id === axesId);
          const sc = axesEl?.transform.scale || 1;
          const wx = (axesEl?.transform.x ?? 0) + sc * x;
          const wy = (axesEl?.transform.y ?? 0) + sc * y;
          const res = dispatcher.dispatch({
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
          if (!selectedAxes2D && res.created?.[0]) setSelectedIds([res.created[0]]);
          setAxesPointDialogOpen(false);
          handleSelectTool("select");
        }}
        onCancel={() => setAxesPointDialogOpen(false)}
      />

      {pointRenameSession && (
        <div
          data-export-skip="true"
          data-testid="point-rename-dialog"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setPointRenameSession(null);
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
              handleSubmitPointRename(pointRenameSession.items);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setPointRenameSession(null);
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
              {pointRenameSession.items.length === 1
                ? "Đổi tên điểm"
                : `Đổi tên ${pointRenameSession.items.length} điểm`}
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
              {pointRenameSession.items.map((item, idx) => (
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
                  {pointRenameSession.items.length > 1 && (
                    <span style={{ minWidth: 68, color: "#64748b" }}>
                      {item.originalName ? `Điểm ${item.originalName}:` : `Điểm #${idx + 1}:`}
                    </span>
                  )}
                  <input
                    data-testid={
                      idx === 0 ? "point-rename-input" : `point-rename-input-${idx}`
                    }
                    type="text"
                    autoFocus={idx === 0}
                    onFocus={(e) => e.currentTarget.select()}
                    value={item.draftName}
                    placeholder="Nhập tên điểm (vd: A, M, A')"
                    onChange={(e) => {
                      const val = e.target.value;
                      setPointRenameSession((prev) =>
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
                onClick={() => setPointRenameSession(null)}
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
        open={axesVectorDialogOpen}
        onSubmit={(vx, vy, x0, y0) => {
          const axesId = ensureAxes2D();
          const axesEl = pageElements.find((e) => e.id === axesId);
          const sc = axesEl?.transform.scale || 1;
          const axX = axesEl?.transform.x ?? 0;
          const axY = axesEl?.transform.y ?? 0;
          const pAId = newElId("pt");
          const pBId = newElId("pt");
          let vecId = "";
          dispatcher.batch(() => {
            dispatcher.dispatch({
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
            dispatcher.dispatch({
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
            const vRes = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomVector",
                style: { stroke: "#2563eb", width: 2.2 },
                props: { from: pAId, to: pBId },
              },
            });
            vecId = vRes.created?.[0] ?? "";
          });
          if (!selectedAxes2D && vecId) setSelectedIds([vecId]);
          setAxesVectorDialogOpen(false);
          handleSelectTool("select");
        }}
        onCancel={() => setAxesVectorDialogOpen(false)}
      />

      <Axes3DPointDialog
        open={axes3DPointDialogOpen}
        defaultName={getNextPointName(pageElements, ["M", "N", "P", "Q", "A", "B", "C"])}
        onSubmit={(name, x, y, z) => {
          const axesId = ensureAxes3D();
          const axesEl = pageElements.find((e) => e.id === axesId);
          const tr = axesEl?.transform ?? { x: 0, y: 0, scale: 1 };
          const p2 = projectOxyzPoint(tr, { x, y, z });
          const res = dispatcher.dispatch({
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
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          setAxes3DPointDialogOpen(false);
          handleSelectTool("select");
        }}
        onCancel={() => setAxes3DPointDialogOpen(false)}
      />

      <Axes3DVectorDialog
        open={axes3DVectorDialogOpen}
        onSubmit={(vx, vy, vz, x0, y0, z0) => {
          const axesId = ensureAxes3D();
          const axesEl = pageElements.find((e) => e.id === axesId);
          const tr = axesEl?.transform ?? { x: 0, y: 0, scale: 1 };
          const pA2 = projectOxyzPoint(tr, { x: x0, y: y0, z: z0 });
          const pB2 = projectOxyzPoint(tr, { x: x0 + vx, y: y0 + vy, z: z0 + vz });
          const pAId = newElId("pt");
          const pBId = newElId("pt");
          let vecId = "";
          dispatcher.batch(() => {
            dispatcher.dispatch({
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
            dispatcher.dispatch({
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
            const vRes = dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomVector",
                style: { stroke: "#0891b2", width: 2.2 },
                props: { from: pAId, to: pBId },
              },
            });
            vecId = vRes.created?.[0] ?? "";
          });
          if (vecId) setSelectedIds([vecId]);
          setAxes3DVectorDialogOpen(false);
          handleSelectTool("select");
        }}
        onCancel={() => setAxes3DVectorDialogOpen(false)}
      />

      <Axes3DFigureDialog
        open={axes3DFigureDialogKind !== null}
        kind={axes3DFigureDialogKind ?? "plane"}
        onSubmit={(def, name, color) => {
          const axesId = ensureAxes3D();
          const axesEl = pageElements.find((e) => e.id === axesId);
          const tr = axesEl?.transform ?? { x: 0, y: 0, scale: 1, rotation: 0, z: 0 };
          const res = dispatcher.dispatch({
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
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          setAxes3DFigureDialogKind(null);
          handleSelectTool("select");
        }}
        onCancel={() => setAxes3DFigureDialogKind(null)}
      />

      <Curve2DConfigDialog
        open={curve2dDialogMode !== null}
        mode={curve2dDialogMode ?? "equation"}
        onSubmit={(def, color) => {
          const axesId = ensureAxes2D();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Curve2D",
              style: { stroke: color, width: 2 },
              props: { axes: axesId, color, def },
            },
          });
          if (!selectedAxes2D && res.created?.[0]) setSelectedIds([res.created[0]]);
          setCurve2dDialogMode(null);
          handleSelectTool("select");
        }}
        onCancel={() => setCurve2dDialogMode(null)}
      />

      <ConicConfigDialog
        open={conicDialogKind !== null}
        kind={conicDialogKind ?? "ellipse"}
        onSubmit={(kind, a, b) => {
          const axesId = ensureAxes2D();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Conic",
              style: { stroke: "#9333ea", width: 2.2 },
              props: { kind, a, b, axes: axesId },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          setConicDialogKind(null);
          handleSelectTool("select");
        }}
        onCancel={() => setConicDialogKind(null)}
      />

      <VarTableConfigDialog
        open={varTableDialogMode !== null}
        mode={varTableDialogMode ?? "variation"}
        onSubmit={(propsObj) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
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
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          setVarTableDialogMode(null);
          handleSelectTool("select");
        }}
        onCancel={() => setVarTableDialogMode(null)}
      />

      {doc && (
        <PageManagerModal
          open={pageManagerOpen}
          onClose={() => setPageManagerOpen(false)}
          doc={doc}
          currentPage={currentPage}
          totalPages={pageCount}
        />
      )}

      <ChartConfigDialog
        open={chartDialogOpen}
        onSubmit={(propsObj) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
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
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          setChartDialogOpen(false);
          handleSelectTool("select");
        }}
        onCancel={() => setChartDialogOpen(false)}
      />

      <BayesConfigDialog
        open={bayesDialogOpen}
        onSubmit={(root, formulaLatex) => {
          const center = getViewCenter();
          dispatcher.batch(() => {
            dispatcher.dispatch({
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
            dispatcher.dispatch({
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
          setBayesDialogOpen(false);
          handleSelectTool("select");
        }}
        onCancel={() => setBayesDialogOpen(false)}
      />

      <NumberLineConfigDialog
        open={numberLineDialogOpen}
        onSubmit={(setExpr) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
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
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          setNumberLineDialogOpen(false);
          handleSelectTool("select");
        }}
        onCancel={() => setNumberLineDialogOpen(false)}
      />

      {/* Angle Degree Popover for c:angleval */}
      {angleDialog && (
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
            value={angleDegInput}
            onChange={(e) => setAngleDegInput(e.target.value)}
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
              const deg = Number(angleDegInput) || 60;
              const endPt = pointAtAngle(
                angleDialog.vertexPos,
                angleDialog.armPos,
                deg
              );
              if (!endPt) return;
              const segId = newElId("angray");
              const endId = `${segId}_b`;
              dispatcher.batch(() => {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: endId,
                    type: "GeomPoint",
                    transform: { x: endPt.x, y: endPt.y, scale: 1, rotation: 0, z: 0 },
                    props: {
                      name: getNextPointName(pageElements),
                      constraint: { kind: "free" },
                    },
                  },
                });
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: segId,
                    type: "GeomRay",
                    props: {
                      from: angleDialog.vertexId,
                      to: endId,
                      fromPt: angleDialog.vertexPos,
                    },
                  },
                });
              });
              setAngleDialog(null);
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
            onClick={() => setAngleDialog(null)}
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

      {/* Physics Simulation & Teaching Drawer */}
      <PhysicsDrawer
        open={physicsDrawerOpen}
        onClose={() => setPhysicsDrawerOpen(false)}
        onInsertFormulaLatex={(latex) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "MathText",
              transform: {
                x: center.x,
                y: center.y,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              style: { stroke: currentStyle.stroke ?? "#0f172a" },
              props: { latex },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          handleSelectTool("select");
        }}
      />

      {/* Math Formulas Drawer */}
      <MathFormulasDrawer
        open={mathDrawerOpen}
        onClose={() => setMathDrawerOpen(false)}
        onInsertFormulaLatex={(latex) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "MathText",
              transform: {
                x: center.x,
                y: center.y,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              style: { stroke: currentStyle.stroke ?? "#0f172a" },
              props: { latex },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          handleSelectTool("select");
        }}
      />

      {/* Chemistry Formulas Drawer */}
      <ChemistryFormulasDrawer
        open={chemistryDrawerOpen}
        onClose={() => setChemistryDrawerOpen(false)}
        onInsertFormulaLatex={(latex) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "MathText",
              transform: {
                x: center.x,
                y: center.y,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              style: { stroke: currentStyle.stroke ?? "#0f172a" },
              props: { latex },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          handleSelectTool("select");
        }}
      />

      {/* Fullscreen PhET Online & Offline HTML Simulation System */}
      <SimLauncherModal
        open={simLauncherOpen}
        onClose={() => setSimLauncherOpen(false)}
        activeSim={activeSim}
        onResumeActive={() => setSimMinimized(false)}
        onLaunchSession={handleLaunchSimSession}
      />

      <FullscreenSimOverlay
        session={activeSim}
        minimized={simMinimized}
        onMinimize={() => setSimMinimized(true)}
        onRestore={() => setSimMinimized(false)}
        onClose={handleCloseSimSession}
        onOpenLauncher={() => setSimLauncherOpen(true)}
      />

      {/* Searchable 100-item RealWorld Drawer */}
      <RealWorldDrawer
        open={realWorldDrawerOpen}
        onClose={() => setRealWorldDrawerOpen(false)}
        onSelectIcon={(item) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "RealObject",
              transform: {
                x: center.x,
                y: center.y - 1.5,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              props: { icon: item.id, from: "", to: "", width: 1 },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          handleSelectTool("select");
        }}
        onSelectPicture={({ src, ratio }) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "RealObject",
              transform: {
                x: center.x,
                y: center.y - 1.5,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              props: { icon: "custom", src, ratio, from: "", to: "", width: 1 },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          handleSelectTool("select");
        }}
      />

      {/* Floating Scientific & Casio Calculator Widget */}
      <CalculatorWidget
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onInsertLatex={(latex) => {
          const center = getViewCenter();
          const res = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "MathText",
              transform: {
                x: center.x,
                y: center.y,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              style: { stroke: currentStyle.stroke ?? "#0f172a" },
              props: { latex },
            },
          });
          if (res.created?.[0]) setSelectedIds([res.created[0]]);
          handleSelectTool("select");
          setStatusHint(`✓ Đã chèn công thức "${latex}" vào bảng`);
        }}
      />

      {/* PDF Export Modal with Page Range & Filename Selection */}
      <ExportPdfModal
        open={exportPdfModalOpen}
        doc={doc}
        currentPage={currentPage}
        totalPages={pageCount}
        getBoardElement={() => containerRef.current}
        onClose={() => setExportPdfModalOpen(false)}
      />

      {/* Laser Pointer Settings Modal */}
      <LaserSettingsModal
        open={laserSettingsOpen}
        onClose={() => setLaserSettingsOpen(false)}
        config={laserConfig}
        onChangeConfig={handleUpdateLaserConfig}
      />

      {/* Main Settings Modal (Settings, Toolbar Customizer, Board Themes, Scales & Exports) */}
      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        modularConfig={modularConfig}
        onChangeModularConfig={handleUpdateModularConfig}
        toolbarConfig={toolbarConfig}
        onChangeToolbarConfig={handleUpdateToolbarConfig}
        autoSwitchTarget={autoSwitchTarget}
        onChangeAutoSwitchTarget={(target) => {
          setAutoSwitchTarget(target);
          if (typeof window !== "undefined") {
            localStorage.setItem("physboard_auto_switch_target", target);
          }
        }}
        inkToShape={inkToShape}
        onChangeInkToShape={(val) => setInkToShape(val)}
        penOnlyMode={penOnlyMode}
        onChangePenOnlyMode={(val) => setPenOnlyMode(val)}
        spenConfig={spenConfig}
        onChangeSPenConfig={handleUpdateSPenConfig}
        laserConfig={laserConfig}
        onChangeLaserConfig={handleUpdateLaserConfig}
        gridEnabled={gridEnabled}
        onChangeGridEnabled={(val) => setGridEnabled(val)}
        isGuideEnabled={guideEnabled}
        onToggleGuide={toggleGuide}
        doc={doc}
        page={currentPage}
        totalPages={pageCount}
        getBoardElement={() => containerRef.current}
        boardConfig={currentBoardConfig}
        onChangeBoardConfig={(next: PageBoardConfig) => {
          writePageBoardConfig(doc, currentPage, next);
          if (next.pattern !== "none") setGridEnabled(true);
        }}
        onApplyBoardAllPages={(cfg: PageBoardConfig) => {
          applyBoardConfigToAllPages(doc, pageCount, cfg);
          setStatusHint("✓ Đã áp dụng loại bảng cho tất cả các trang");
        }}
        onScaleGeometry={(factor) => dispatcher.scaleGeometry(factor)}
        labelScale={labelScale}
        onChangeLabelScale={setLabelScale}
        dotScale={dotScale}
        onChangeDotScale={setDotScale}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onExportPdf={() => setExportPdfModalOpen(true)}
      />

      {/* Share URL Modal */}
      {shareModalOpen && (
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
            if (e.target === e.currentTarget) setShareModalOpen(false);
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
              value={buildShareUrl(activeRoomId)}
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
                    ?.writeText(buildShareUrl(activeRoomId))
                    .catch(() => {});
                  setShareCopied(true);
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
                {shareCopied ? "✓ Đã sao chép" : "📋 Sao chép liên kết"}
              </button>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
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
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        shortcutMap={shortcutMap}
        onShortcutMapChange={setShortcutMap}
        onExecuteCommand={executeCommand}
        selectedCount={selectedElements.length}
      />

      {/* Live Coordinate & Zoom HUD */}
      <div
        data-wb-hud="true"
          data-export-skip="true"
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(8px)",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            padding: "4px 8px",
            fontSize: 11,
            fontFamily: "sans-serif",
            color: "#64748b",
            pointerEvents: "auto",
            zIndex: 40,
            userSelect: "none",
          }}
        >
          {cursorWorld ? (
            <span style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 10 }}>
              X: {cursorWorld.x.toFixed(1)} | Y: {cursorWorld.y.toFixed(1)} |{" "}
            </span>
          ) : null}

          {isA4Format && (
            <button
              type="button"
              onClick={toggleFitLock}
              style={{
                width: 22,
                height: 22,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: isFitLocked ? "#dbeafe" : "#f1f5f9",
                color: isFitLocked ? "#1d4ed8" : "#475569",
                border: `1px solid ${isFitLocked ? "#93c5fd" : "#cbd5e1"}`,
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
              }}
              title={
                isFitLocked
                  ? "Đang khóa vừa màn hình (Bấm để mở khóa thu phóng)"
                  : "Tự động vừa màn hình & Khóa thu phóng"
              }
            >
              <span aria-hidden="true">{isFitLocked ? "🔒" : "🔓"}</span>
            </button>
          )}

          {!isFitLocked && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <button
                type="button"
                onClick={zoomOut}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "0 3px",
                }}
                title="Thu nhỏ"
              >
                −
              </button>
              <button
                type="button"
                onClick={resetView}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: "pointer",
                  fontVariantNumeric: "tabular-nums",
                }}
                title="Đặt lại mức thu phóng"
              >
                {Math.round(viewport.scale)}
              </button>
              <button
                type="button"
                onClick={zoomIn}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "0 3px",
                }}
                title="Phóng to"
              >
                +
              </button>
            </div>
          )}
          {isFitLocked && (
            <span style={{ fontVariantNumeric: "tabular-nums", color: "#64748b", fontSize: 11 }}>
              Zoom: {Math.round(viewport.scale)}
            </span>
          )}
        </div>

      {/* Board & Folder Manager Modal (Samsung Notes inspired) */}
      <BoardManagerModal
        open={boardManagerOpen}
        onClose={() => setBoardManagerOpen(false)}
        currentRoomId={activeRoomId}
        onInsertPdfIntoCurrentBoard={(pages) => {
          handleInsertPdfPages(pages);
        }}
        onSelectBoard={(newBoardId) => {
          if (newBoardId !== activeRoomId) {
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("room", newBoardId);
              window.history.pushState(null, "", url.toString());
              window.location.href = url.toString();
            }
          }
        }}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />
    </div>
  );
}
