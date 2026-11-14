"use client";

import React, {
  useState,
  useRef,
  useEffect,
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
} from "@/types/whiteboard";
import { screenToWorld } from "@/lib/coordinates";
import { OneEuroFilter } from "@/lib/ink";
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
  snapPointToObject,
  tangentPointToCircle,
  bisectorFoot2D,
  DEFAULT_DOT_SCALE,
  DEFAULT_LABEL_SCALE,
} from "@/lib/geometry";
import { recognizeStrokeShape } from "@/lib/ink-recognizer";
import {
  type CameraMatrix3,
  type Solid3DKind,
  type Solid3DProps,
  type SolidSubSelection,
  azimuthElevationToCamera,
  buildSpatialConstructionElements,
  cameraToAzimuthElevation,
  computeFlattenedFace,
  computePolyhedronSection,
  computeUnfoldedPolyhedronNet,
  createOxyzElement,
  createPlaneParallelogramElements,
  createSolid3DElement,
  defaultCameraForSolid,
  extractPolyhedronEdges,
  liftSolidTo3D,
  orbitCamera,
  project3DTo2D,
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
  readImageFile,
} from "@/lib/pdf-import";
import {
  type RealWorldArtItem,
  recordRecentRealWorldId,
} from "@/lib/realworld-art";
import { snapPointToInstruments } from "@/lib/instruments";
import { buildShareUrl, sanitizeRoomId } from "@/lib/room";
import {
  downloadBlob,
  downloadText,
  exportPDF,
  exportPNG,
  loadState,
  serializeState,
} from "@/lib/export";
import {
  BOARD_PAGES_YMAP,
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
import { ExportModal } from "./ExportModal";
import { ExamEditor } from "./ExamEditor";
import type {
  PhysicsInstrumentKind,
  PhysicsInstrumentProps,
  PhysicsLabTableProps,
  PhysicsLessonPreset,
  PhysicsSimKind,
  PhysicsSimProps,
} from "@/types/physics";
import {
  createDefaultPhysicsSimProps,
  evaluatePhysicsSim,
  getEffectiveSimTime,
  getPhysicsSimMeta,
} from "@/lib/physics-sim";
import { createDefaultCircuitDiagramProps } from "@/lib/physics-circuit";
import { createDefaultFbdDiagramProps } from "@/lib/physics-forces";
import { createDefaultOpticsDiagramProps } from "@/lib/physics-optics";
import {
  addYjsPage,
  setYjsCurrentPage,
  useYjsPages,
} from "./PageBar";
import {
  AxesPointDialog,
  AxesVectorDialog,
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
import { PhysicsSimElement } from "./elements/PhysicsSimElement";
import { PhysicsDiagramElement } from "./elements/PhysicsDiagramElement";
import { PhysicsInstrumentElement } from "./elements/PhysicsInstrumentElement";
import {
  PhysicsLabTableElement,
  computeLinearRegression,
} from "./elements/PhysicsLabTableElement";
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

function isPenTool(tool: WhiteboardTool): boolean {
  return resolvePenNib(tool) !== null;
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
  const openFileInputRef = useRef<HTMLInputElement>(null);

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

  // Dedicated laser pointer ephemeral strokes (not in Yjs, decaying over time)
  const [laserStrokes, setLaserStrokes] = useState<
    Array<{ id: string; points: number[]; createdAt: number }>
  >([]);

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
  const [statusHint, setStatusHint] = useState<string | null>(null);
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
  const [plotDialogOpen, setPlotDialogOpen] = useState(false);
  const [pointRenameSession, setPointRenameSession] = useState<{
    items: Array<{ id: string; originalName: string; draftName: string }>;
  } | null>(null);
  const [axesPointDialogOpen, setAxesPointDialogOpen] = useState(false);
  const [axesVectorDialogOpen, setAxesVectorDialogOpen] = useState(false);
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
  const [exportModalMode, setExportModalMode] = useState<"tikz" | "json" | null>(
    null
  );
  const [examOpen, setExamOpen] = useState(false);
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
  const filterXRef = useRef(new OneEuroFilter(1.2, 0.06, 1.0));
  const filterYRef = useRef(new OneEuroFilter(1.2, 0.06, 1.0));
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
  const {
    viewport,
    containerRef,
    isPanning,
    isSpacePressed,
    cursorWorld,
    handlePointerDown: navPointerDown,
    handlePointerMove: navPointerMove,
    handlePointerUp: navPointerUp,
    handlePointerCancel: navPointerCancel,
    handlePointerLeave: navPointerLeave,
    zoomIn,
    zoomOut,
    resetView,
  } = useCanvasNavigation({
    currentTool: activeTool,
    onCursorMove: updateLocalCursor,
  });

  // Undo / Redo Hook
  const { canUndo, canRedo, undo, redo } = useHistory(dispatcher);

  // Page-filtered elements
  const pageElements = useMemo(
    () =>
      elements.filter(
        (el) =>
          (el.meta.page ?? 1) === currentPage &&
          el.type !== "ExamPaper" &&
          el.type !== "ExamItem"
      ),
    [elements, currentPage]
  );

  const hasPaper = useMemo(
    () => elements.some((el) => el.type === "ExamPaper"),
    [elements]
  );

  const hiddenCount = useMemo(
    () => pageElements.filter((el) => el.style?.hidden).length,
    [pageElements]
  );

  const selectedElements = useMemo(
    () =>
      pageElements.filter(
        (el) => selectedIds.includes(el.id) && !el.style?.hidden
      ),
    [pageElements, selectedIds]
  );

  const selectedAxes2D = useMemo(
    () =>
      selectedElements.length === 1 && selectedElements[0].type === "Axes2D"
        ? selectedElements[0]
        : null,
    [selectedElements]
  );

  const selectedPhysicsEl = useMemo(
    () =>
      selectedElements.length === 1 &&
      (selectedElements[0].type === "PhysicsSim" ||
        selectedElements[0].type === "PhysicsDiagram" ||
        selectedElements[0].type === "PhysicsInstrument" ||
        selectedElements[0].type === "PhysicsLabTable")
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
    () => solveGeometry3D(pageElements),
    [pageElements]
  );

  const hydratedPts = useMemo(
    () => hydrateInlinePoints(pageElements, solved3D.pts),
    [pageElements, solved3D.pts]
  );

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

      return false;
    },
    [selectedElements, hydratedPts, byId, solved3D, pageElements, dispatcher]
  );

  // Select tool helper clearing transient multi-step drafts
  const handleSelectTool = useCallback(
    (rawTool: WhiteboardTool) => {
      const next = normalizeToolId(rawTool);
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
    [tryApplyConstructionFromSelection]
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

  // Selection Actions (Delete with cascading deps, Duplicate, Copy, Cut, Paste, Hide)
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    dispatcher.deleteObjects(selectedIds);
    setSelectedIds([]);
    setOrbitActiveId(null);
  }, [selectedIds, dispatcher]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const newIds = dispatcher.duplicate(selectedIds);
    setSelectedIds(newIds);
  }, [selectedIds, dispatcher]);

  const handleCopySelected = useCallback(() => {
    if (selectedElements.length === 0) return;
    setClipboard(JSON.parse(JSON.stringify(selectedElements)));
  }, [selectedElements]);

  const handleCutSelected = useCallback(() => {
    if (selectedElements.length === 0) return;
    setClipboard(JSON.parse(JSON.stringify(selectedElements)));
    dispatcher.deleteObjects(selectedIds);
    setSelectedIds([]);
    setOrbitActiveId(null);
  }, [selectedElements, selectedIds, dispatcher]);

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
    if (selectedIds.length === 0) return;
    dispatcher.hideObjects(selectedIds);
    setSelectedIds([]);
  }, [selectedIds, dispatcher]);

  const handleUnhideAll = useCallback(() => {
    dispatcher.unhideAll(currentPage);
  }, [dispatcher, currentPage]);

  // 3D Orbit Helpers
  const activeOrbitElement = useMemo(() => {
    const id =
      orbitActiveId ??
      selectedElements.find(
        (el) => el.type === "Solid3D" || el.type === "Axes3D"
      )?.id ??
      null;
    if (!id) return null;
    const el = byId.get(id);
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
      setSelectedIds([]);
      setOrbitActiveId(null);
    }
  }, [doc, currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pageCount) {
      setYjsCurrentPage(doc, currentPage + 1);
      setSelectedIds([]);
      setOrbitActiveId(null);
    }
  }, [doc, currentPage, pageCount]);

  const handleAddPage = useCallback(() => {
    addYjsPage(doc);
    setSelectedIds([]);
    setOrbitActiveId(null);
  }, [doc]);

  // --- Physics Teaching Suite Handlers ---
  const handleInsertPhysicsSim = useCallback(
    (kind: PhysicsSimKind) => {
      const center = getViewCenter();
      const props = createDefaultPhysicsSimProps(kind);
      const res = dispatcher.dispatch({
        type: "object.create",
        params: {
          type: "PhysicsSim",
          transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
          props: { ...props },
        },
      });
      if (res.created?.[0]) setSelectedIds([res.created[0]]);
      handleSelectTool("select");
      setStatusHint(`Đã chèn thí nghiệm: ${getPhysicsSimMeta(kind).shortTitle}`);
    },
    [getViewCenter, dispatcher, handleSelectTool]
  );

  const handlePhysicsAction = useCallback(
    (action: string) => {
      if (action === "phys:drawer") {
        setPhysicsDrawerOpen(true);
        return;
      }
      if (action.startsWith("phys:sim:")) {
        handleInsertPhysicsSim(action.slice(9) as PhysicsSimKind);
        return;
      }
      const center = getViewCenter();
      if (action === "phys:diag:circuit" || action === "phys:diag:circuit_parallel") {
        const props = createDefaultCircuitDiagramProps(
          action === "phys:diag:circuit_parallel" ? "parallel" : "series"
        );
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "PhysicsDiagram",
            transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
            props: { ...props },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
      } else if (action === "phys:diag:fbd") {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "PhysicsDiagram",
            transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
            props: { ...createDefaultFbdDiagramProps() },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
      } else if (action === "phys:diag:optics") {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "PhysicsDiagram",
            transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
            props: { ...createDefaultOpticsDiagramProps("converging_lens") },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
      } else if (
        action === "phys:inst:ruler" ||
        action === "phys:inst:protractor" ||
        action === "phys:inst:stopwatch" ||
        action === "phys:inst:setsquare" ||
        action === "phys:inst:compass"
      ) {
        const instrumentKind = action.slice(10) as PhysicsInstrumentKind;
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "PhysicsInstrument",
            transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
            props: {
              instrumentKind,
              ...(instrumentKind === "ruler" ? { lengthCm: 20 } : {}),
              ...(instrumentKind === "stopwatch" ? { running: false, elapsedSec: 0, laps: [] } : {}),
              ...(instrumentKind === "setsquare" ? { setSquareKind: "30-60-90" } : {}),
              ...(instrumentKind === "protractor" ? { protractorType: "180", protractorAngle: 45 } : {}),
              ...(instrumentKind === "compass" ? { compassRadius: 3.0, compassAngle: 0 } : {}),
            },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
      } else if (action === "phys:labtable") {
        const res = dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "PhysicsLabTable",
            transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
            props: {
              title: "Bảng số liệu thực hành",
              xLabel: "x",
              yLabel: "y",
              rows: [],
            },
          },
        });
        if (res.created?.[0]) setSelectedIds([res.created[0]]);
      }
      handleSelectTool("select");
    },
    [getViewCenter, dispatcher, handleInsertPhysicsSim, handleSelectTool]
  );

  const handleSelectTeachingInstrument = useCallback(
    (kind: "ruler" | "setsquare" | "setsquare-45" | "protractor" | "protractor-360" | "compass") => {
      const center = getViewCenter();
      let instrumentKind: PhysicsInstrumentKind = "ruler";
      let extraProps: Record<string, unknown> = {};

      if (kind === "ruler") {
        instrumentKind = "ruler";
        extraProps = { lengthCm: 20 };
      } else if (kind === "setsquare") {
        instrumentKind = "setsquare";
        extraProps = { setSquareKind: "30-60-90", width: 7.2, height: 4.5 };
      } else if (kind === "setsquare-45") {
        instrumentKind = "setsquare";
        extraProps = { setSquareKind: "45-45-90", width: 6.0, height: 6.0 };
      } else if (kind === "protractor") {
        instrumentKind = "protractor";
        extraProps = { protractorType: "180", protractorAngle: 45, width: 6.4, height: 3.6 };
      } else if (kind === "protractor-360") {
        instrumentKind = "protractor";
        extraProps = { protractorType: "360", protractorAngle: 45, width: 6.4, height: 6.4 };
      } else if (kind === "compass") {
        instrumentKind = "compass";
        extraProps = { compassRadius: 3.0, compassAngle: 0, width: 5.2, height: 5.2 };
      }

      const res = dispatcher.dispatch({
        type: "object.create",
        params: {
          type: "PhysicsInstrument",
          transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
          props: {
            instrumentKind,
            ...extraProps,
          },
        },
      });
      if (res.created?.[0]) setSelectedIds([res.created[0]]);
      handleSelectTool("select");
    },
    [getViewCenter, dispatcher, handleSelectTool]
  );

  const handleCompassDrawArc = useCallback(
    (cx: number, cy: number, r: number, startDeg = 0, endDeg = 360) => {
      const pts: number[] = [];
      const pressures: number[] = [];
      const step = 4;
      const span = Math.abs(endDeg - startDeg);
      const count = Math.max(16, Math.round(span / step));
      for (let i = 0; i <= count; i++) {
        const aDeg = startDeg + (i / count) * (endDeg - startDeg);
        const rad = (aDeg * Math.PI) / 180;
        pts.push(Number((cx + r * Math.cos(rad)).toFixed(3)));
        pts.push(Number((cy + r * Math.sin(rad)).toFixed(3)));
        pressures.push(0.65);
      }
      dispatcher.dispatch({
        type: "ink.stroke",
        params: {
          points: pts,
          pressures,
          nib: "fountain",
          style: { stroke: "#2563eb", width: 2.2 },
        },
      });
    },
    [dispatcher]
  );

  const handleExportPhysicsGraph = useCallback(
    (simId: string) => {
      const simEl = byId.get(simId);
      if (!simEl || simEl.type !== "PhysicsSim") return;
      const p = simEl.props as unknown as PhysicsSimProps;
      const meta = getPhysicsSimMeta(p.kind);
      const t = getEffectiveSimTime(p);
      const ev = evaluatePhysicsSim(p.kind, t, p.params ?? {}, p.mode);
      if (ev.series.length < 2) return;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const s of ev.series) {
        if (s.x < minX) minX = s.x;
        if (s.x > maxX) maxX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.y > maxY) maxY = s.y;
      }
      const spanX = Math.max(1e-6, maxX - minX);
      const spanY = Math.max(1e-6, maxY - minY);
      const axesId = newElId("axes");
      const axX = simEl.transform.x + 11.2;
      const axY = simEl.transform.y;

      dispatcher.batch(() => {
        dispatcher.dispatch({
          type: "object.create",
          params: {
            id: axesId,
            type: "Axes2D",
            transform: { x: axX, y: axY, scale: 1, rotation: 0, z: 0 },
            style: { stroke: "#475569", width: 1.5 },
            props: { size: 5, grid: true, ticks: "int", legend: true, linkedSimId: simId },
          },
        });
        dispatcher.dispatch({
          type: "object.update",
          params: {
            id: simId,
            props: { ...simEl.props, linkedAxesId: axesId },
          },
        });
        dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "MathText",
            transform: { x: axX, y: axY + 5.4, scale: 1, rotation: 0, z: 0 },
            style: { stroke: "#1d4ed8" },
            props: {
              latex: `\\text{${meta.graphAxesLabel.title} (${meta.graphAxesLabel.xLabel} ; ${meta.graphAxesLabel.yLabel})}`,
            },
          },
        });
        const step = Math.max(1, Math.floor(ev.series.length / 28));
        const ptIds: string[] = [];
        for (let i = 0; i < ev.series.length; i += step) {
          const s = ev.series[i];
          const nx = -4 + ((s.x - minX) / spanX) * 8;
          const ny = -3.5 + ((s.y - minY) / spanY) * 7;
          const pid = newElId("pt");
          ptIds.push(pid);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id: pid,
              type: "GeomPoint",
              transform: { x: axX + nx, y: axY + ny, scale: 1, rotation: 0, z: 0 },
              props: {
                name: "",
                dot: "none",
                constraint: { kind: "oxy", axes: axesId, x: nx, y: ny },
              },
            },
          });
        }
        for (let i = 0; i + 1 < ptIds.length; i++) {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomSegment",
              style: { stroke: "#2563eb", width: 2.4 },
              props: { from: ptIds[i], to: ptIds[i + 1] },
            },
          });
        }
      });
      setStatusHint(`Đã xuất đồ thị ${meta.graphAxesLabel.title} sang hệ trục Oxy`);
    },
    [byId, dispatcher]
  );

  const handleRecordPhysicsSample = useCallback(
    (simId: string, sample: { x: number; y: number }) => {
      const simEl = byId.get(simId);
      const simKind = simEl?.type === "PhysicsSim" ? (simEl.props.kind as PhysicsSimKind) : undefined;
      const meta = simKind ? getPhysicsSimMeta(simKind) : null;
      const existing = pageElements.find(
        (el) =>
          !el.style?.hidden &&
          el.type === "PhysicsLabTable" &&
          (el.props.linkedSimId === simId || !el.props.linkedSimId)
      );
      const newRow = { id: newElId("row"), x: sample.x, y: sample.y };
      if (existing) {
        const curRows = Array.isArray(existing.props.rows)
          ? (existing.props.rows as PhysicsLabTableProps["rows"])
          : [];
        dispatcher.dispatch({
          type: "object.update",
          params: {
            id: existing.id,
            props: {
              ...existing.props,
              linkedSimId: existing.props.linkedSimId ?? simId,
              rows: [...curRows, newRow],
            },
          },
        });
      } else {
        const basePos = simEl ? simEl.transform : getViewCenter();
        dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "PhysicsLabTable",
            transform: {
              x: basePos.x + 10.0,
              y: basePos.y - 1.5,
              scale: 1,
              rotation: 0,
              z: 0,
            },
            props: {
              title: meta ? `Số liệu: ${meta.shortTitle}` : "Bảng số liệu thực hành",
              xLabel: meta?.graphAxesLabel.xLabel ?? "x",
              yLabel: meta?.graphAxesLabel.yLabel ?? "y",
              linkedSimId: simId,
              rows: [newRow],
            },
          },
        });
      }
      setStatusHint(`Đã ghi số đo (${sample.x}; ${sample.y}) vào bảng thực hành`);
    },
    [byId, pageElements, dispatcher, getViewCenter]
  );

  const handlePlotLabRegression = useCallback(
    (tableId: string) => {
      const tableEl = byId.get(tableId);
      if (!tableEl || tableEl.type !== "PhysicsLabTable") return;
      const tProps = tableEl.props as unknown as PhysicsLabTableProps;
      const rows = tProps.rows ?? [];
      if (rows.length === 0) return;

      const maxAbs = Math.max(1, ...rows.flatMap((r) => [Math.abs(r.x), Math.abs(r.y)]));
      const scaleFactor = maxAbs > 4.5 ? 4.2 / maxAbs : 1;
      const axesId = newElId("axes");
      const axX = tableEl.transform.x + 8.8;
      const axY = tableEl.transform.y;
      const reg = computeLinearRegression(rows);
      const linkedSimId = tProps.linkedSimId;
      const simEl = linkedSimId ? byId.get(linkedSimId) : undefined;

      dispatcher.batch(() => {
        dispatcher.dispatch({
          type: "object.create",
          params: {
            id: axesId,
            type: "Axes2D",
            transform: { x: axX, y: axY, scale: 1, rotation: 0, z: 0 },
            style: { stroke: "#475569", width: 1.5 },
            props: { size: 5, grid: true, ticks: "int", legend: true, ...(linkedSimId ? { linkedSimId } : {}) },
          },
        });
        if (linkedSimId && simEl) {
          dispatcher.dispatch({
            type: "object.update",
            params: {
              id: linkedSimId,
              props: { ...simEl.props, linkedAxesId: axesId },
            },
          });
        }
        rows.forEach((r, idx) => {
          const sx = Number((r.x * scaleFactor).toFixed(3));
          const sy = Number((r.y * scaleFactor).toFixed(3));
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: axX + sx, y: axY + sy, scale: 1, rotation: 0, z: 0 },
              style: { stroke: "#dc2626", fill: "#dc2626" },
              props: {
                name: `M_${idx + 1}`,
                constraint: { kind: "oxy", axes: axesId, x: sx, y: sy },
              },
            },
          });
        });
        if (reg) {
          const bScaled = reg.b * scaleFactor;
          const exprLatex = `${reg.a.toFixed(4)}*x + ${bScaled.toFixed(4)}`;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Plot",
              transform: { x: axX, y: axY, scale: 1, rotation: 0, z: 0 },
              style: { stroke: "#0f766e", width: 2.2 },
              props: {
                exprLatex,
                params: {},
                axes: axesId,
                color: "#0f766e",
                marks: { roots: false, extrema: false, yIntercept: false },
              },
            },
          });
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "MathText",
              transform: { x: axX, y: axY + 5.4, scale: 1, rotation: 0, z: 0 },
              style: { stroke: "#0f766e" },
              props: {
                latex: `y = ${reg.a.toFixed(2)}x ${reg.b >= 0 ? "+" : "-"} ${Math.abs(reg.b).toFixed(2)}\\;(R^2=${reg.r2.toFixed(3)})`,
              },
            },
          });
        }
      });
      setStatusHint("Đã vẽ điểm thực nghiệm & đường hồi quy trên hệ trục Oxy");
    },
    [byId, dispatcher]
  );

  const handleInsertLessonPreset = useCallback(
    (lesson: PhysicsLessonPreset) => {
      const center = getViewCenter();
      const created: string[] = [];
      dispatcher.batch(() => {
        if (lesson.simKind) {
          const r = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "PhysicsSim",
              transform: { x: center.x - 2.6, y: center.y, scale: 1, rotation: 0, z: 0 },
              props: { ...createDefaultPhysicsSimProps(lesson.simKind) },
            },
          });
          if (r.created?.[0]) created.push(r.created[0]);
        } else if (lesson.diagramKind) {
          const props =
            lesson.diagramKind === "circuit"
              ? createDefaultCircuitDiagramProps("series")
              : lesson.diagramKind === "fbd"
                ? createDefaultFbdDiagramProps()
                : createDefaultOpticsDiagramProps("converging_lens");
          const r = dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "PhysicsDiagram",
              transform: { x: center.x - 2.6, y: center.y, scale: 1, rotation: 0, z: 0 },
              props: { ...props },
            },
          });
          if (r.created?.[0]) created.push(r.created[0]);
        }

        dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "MathText",
            transform: { x: center.x - 2.6, y: center.y + 4.4, scale: 1, rotation: 0, z: 0 },
            style: { stroke: "#1e3a8a" },
            props: { latex: `\\textbf{${lesson.title}}` },
          },
        });

        lesson.formulaLatexList.forEach((latex, idx) => {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "MathText",
              transform: { x: center.x + 6.8, y: center.y + 2.4 - idx * 1.4, scale: 1, rotation: 0, z: 0 },
              style: { stroke: "#0f766e" },
              props: { latex },
            },
          });
        });

        dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "MathText",
            transform: { x: center.x + 6.8, y: center.y - 1.5, scale: 1, rotation: 0, z: 0 },
            style: { stroke: "#334155" },
            props: { latex: `\\text{Câu hỏi: ${lesson.questionPrompt}}` },
          },
        });
      });
      if (created.length > 0) setSelectedIds(created);
      handleSelectTool("select");
      setStatusHint(`Đã dựng trọn trang: ${lesson.title}`);
    },
    [getViewCenter, dispatcher, handleSelectTool]
  );

  // Execute any registered command from Command Palette or Keyboard Shortcut
  const executeCommand = useCallback(
    (commandId: string) => {
      if (commandId.startsWith("tool:")) {
        handleSelectTool(commandId.slice(5) as WhiteboardTool);
        return;
      }
      if (commandId.startsWith("phys:")) {
        handlePhysicsAction(commandId);
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
        case "action:openExam":
          setExamOpen(true);
          break;
        case "action:exportPng":
          if (doc) {
            exportPNG(containerRef.current, doc, currentPage)
              .then((blob) => downloadBlob(blob, "physboard-bang-ve.png"))
              .catch(() => {});
          }
          break;
        case "action:exportPdf":
          if (doc) {
            exportPDF(containerRef.current, doc, currentPage)
              .then((blob) => downloadBlob(blob, "physboard-bang-ve.pdf"))
              .catch(() => {});
          }
          break;
        case "action:exportTikz":
          setExportModalMode("tikz");
          break;
        case "action:openJson":
          setExportModalMode("json");
          break;
      }
    },
    [
      handleSelectTool,
      handlePhysicsAction,
      handleDuplicateSelected,
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

  // Global Keyboard Shortcuts (Strict Isolation inside input, textarea, math-field, contentEditable)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(document.activeElement)) return;
      if (examOpen || commandPaletteOpen) return;

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
        setSelectedIds(
          pageElements.filter((el) => !el.style?.hidden).map((el) => el.id)
        );
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
        } else if (exportModalMode) {
          setExportModalMode(null);
        } else if (realWorldDrawerOpen) {
          setRealWorldDrawerOpen(false);
        } else if (physicsDrawerOpen) {
          setPhysicsDrawerOpen(false);
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
    examOpen,
    commandPaletteOpen,
    activeTool,
    selectedIds,
    pageElements,
    mathSession,
    shareModalOpen,
    exportModalMode,
    realWorldDrawerOpen,
    physicsDrawerOpen,
    draftPolygonPts.length,
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
      const resolvedP1 = startSnap && startSnap.constraint.kind !== "free" ? startSnap.point : p1;
      const resolvedP2 = endSnap && endSnap.constraint.kind !== "free" ? endSnap.point : p2;

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
    },
    [dispatcher, currentStyle, viewport.scale, snapPointAtCursor, pageElements]
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
      if (res.created?.[0]) setSelectedIds([res.created[0]]);
    },
    [dispatcher, getViewCenter]
  );

  const handleInsertPdfPages = useCallback(
    (pages: ImportedPdfPage[]) => {
      if (pages.length === 0) return;
      // When A4 format is active, center is (0, 0), otherwise use current view center
      const isA4 = currentBoardConfig?.format === "a4_portrait" || currentBoardConfig?.format === "a4_landscape";
      const targetPos = isA4 ? { x: 0, y: 0 } : getViewCenter();
      const startPage = currentPage;
      let targetCount = pageCount;

      dispatcher.batch(() => {
        pages.forEach((pg, idx) => {
          const pageNum = startPage + idx;
          while (targetCount < pageNum) {
            const added = addYjsPage(doc);
            targetCount = added.count;
            // Inherit the board configuration (e.g. A4 format, surface theme) to the newly created pages
            if (currentBoardConfig) {
              writePageBoardConfig(doc, pageNum, currentBoardConfig);
            }
          }
          // If inserting into current or existing page, also ensure its board format is consistent
          if (currentBoardConfig && pageNum <= targetCount) {
            writePageBoardConfig(doc, pageNum, currentBoardConfig);
          }
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "Image",
              page: pageNum,
              transform: {
                x: targetPos.x,
                y: targetPos.y,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              props: { src: pg.src, w: pg.w, h: pg.h },
            },
          });
        });
      });
      setYjsCurrentPage(doc, startPage);
      setStatusHint(`✓ Đã nhập thành công ${pages.length} trang PDF vào các trang bảng`);
    },
    [dispatcher, doc, currentPage, pageCount, getViewCenter, currentBoardConfig]
  );

  const handleM3Action = useCallback(
    (action: M3MenuAction) => {
      if (action.kind === "tool") {
        handleSelectTool(action.toolId);
        if (action.hint) setStatusHint(action.hint);
      } else if (action.kind === "open-plot-dialog") {
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
        const name = getNextPointName(pageElements);
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
              const lift = pts2d.length === ptIds.length ? liftSolidTo3D(kind, pts2d) : null;
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
            });
            setStatusHint(`✓ Đã trải phẳng ${netRes.polygons.length} mặt của khối thành hình 2D`);
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
            .map((id) => solved3D.owner.get(id))
            .find((id): id is string => Boolean(id));
          const solidEl = ownerId ? byId.get(ownerId) : undefined;
          if (!solidEl || solidEl.type !== "Solid3D") {
            setStatusHint(
              "Vui lòng chọn 3 điểm thuộc hoặc nằm trên các cạnh/mặt của một khối 3D."
            );
          } else {
            const kind = solidEl.props.kind as Solid3DKind;
            if (kind === "cone" || kind === "cylinder" || kind === "sphere") {
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  id: newElId("rsec"),
                  type: "RoundSection",
                  style: { stroke: "#e8590c", fill: "rgba(240,140,0,0.35)", width: 2 },
                  props: { solid: solidEl.id, points: [nextIds[0], nextIds[1], nextIds[2]] },
                },
              });
              setStatusHint(null);
            } else {
              const lift = solved3D.lifts.get(solidEl.id);
              const p3A = solved3D.p3.get(nextIds[0]);
              const p3B = solved3D.p3.get(nextIds[1]);
              const p3C = solved3D.p3.get(nextIds[2]);
              const poly3 =
                lift && p3A && p3B && p3C
                  ? computePolyhedronSection(lift, [p3A, p3B, p3C])
                  : null;
              if (poly3 && lift) {
                const secId = newElId("sec");
                const embedded: EmbeddedVertex[] = poly3.map((p3, i) => {
                  const pt2 = project3DTo2D(lift, p3);
                  return {
                    id: `${secId}_v${i}`,
                    name: "",
                    x: pt2.x,
                    y: pt2.y,
                  };
                });
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: secId,
                    type: "GeomPolygon",
                    style: { stroke: "#e8590c", fill: "rgba(240,140,0,0.35)", width: 2 },
                    props: { vertices: embedded.map((v) => v.id), points: embedded },
                  },
                });
                setStatusHint(null);
              } else {
                setStatusHint("3 điểm thẳng hàng hoặc mặt phẳng không cắt khối.");
              }
            }
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
      e.stopPropagation();
      resizeStartRef.current = {
        handle,
        initHandlePos: { x: handle.x, y: handle.y },
        initialElements: JSON.parse(JSON.stringify(selectedElements)),
      };
      dispatcher.gesture(true);
    },
    [dispatcher, selectedElements]
  );

  const handleBoxPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      const worldPos = screenToWorld(
        e.clientX,
        e.clientY,
        viewport.tx,
        viewport.ty,
        viewport.scale,
        rect
      );
      const map = new Map<string, { x: number; y: number }>();
      for (const el of selectedElements) {
        map.set(el.id, { x: el.transform.x, y: el.transform.y });
        // Also move referenced free points when dragging a segment/circle/polygon
        const refIds: string[] = [];
        if (typeof el.props.from === "string") refIds.push(el.props.from);
        if (typeof el.props.to === "string") refIds.push(el.props.to);
        if (typeof el.props.center === "string") refIds.push(el.props.center);
        if (Array.isArray(el.props.vertices)) {
          for (const vid of el.props.vertices) {
            if (typeof vid === "string") refIds.push(vid);
          }
        }
        for (const rid of refIds) {
          const refEl = byId.get(rid);
          if (refEl && !map.has(rid)) {
            map.set(rid, { x: refEl.transform.x, y: refEl.transform.y });
          }
        }
      }
      dragBoxStartRef.current = {
        startX: worldPos.x,
        startY: worldPos.y,
        initialTransforms: map,
      };
      dispatcher.gesture(true);
    },
    [dispatcher, containerRef, viewport, selectedElements, byId]
  );

  const handleElementPointerDown = useCallback(
    (e: React.PointerEvent, elementId: string) => {
      if (activeTool === "erase") return;
      if (
        activeTool === null ||
        activeTool === "select" ||
        activeTool === "select:marquee"
      ) {
        e.stopPropagation();
        let resolvedId = elementId;
        let nextSubSel: SolidSubSelection | null = null;
        if (!e.shiftKey) {
          const rect = containerRef.current?.getBoundingClientRect();
          const worldPos = screenToWorld(
            e.clientX,
            e.clientY,
            viewport.tx,
            viewport.ty,
            viewport.scale,
            rect
          );
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
        if (e.shiftKey) {
          setSolidSubSel(null);
          setSelectedIds((prev) =>
            prev.includes(resolvedId)
              ? prev.filter((id) => id !== resolvedId)
              : [...prev, resolvedId]
          );
        } else {
          setSolidSubSel(nextSubSel);
          if (selectedIds.length !== 1 || selectedIds[0] !== resolvedId) {
            setSelectedIds([resolvedId]);
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
    ]
  );

  // --- Root Canvas Pointer Down ---
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // If Pen-Only mode is enabled: touches from fingers are routed to panning & navigation
      if (penOnlyMode && e.pointerType === "touch") {
        navPointerDown(e);
        return;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      const worldPos = screenToWorld(
        e.clientX,
        e.clientY,
        viewport.tx,
        viewport.ty,
        viewport.scale,
        rect
      );

      const isMiddleClick = e.button === 1;
      const isPan = isSpacePressed || isMiddleClick || activeTool === "pan";
      if (isPan) {
        navPointerDown(e);
        return;
      }

      // Select / Marquee
      if (
        activeTool === null ||
        activeTool === "select" ||
        activeTool === "select:marquee"
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

      // Contact Eraser
      if (activeTool === "erase") {
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
        const snapped = snapPointAtCursor(worldPos, 16);
        const name = getNextPointName(pageElements);
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
            const polyId = newElId("poly");
            const names = getNextPointNames(
              draftPolygonPts.length,
              pageElements
            );
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
            setActiveTool("select");
            setStatusHint(null);
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        setActiveTool("select");
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
        dispatcher.gesture(true);
        // Magnetic snap to Ruler or Set Square edges if nearby
        const instrumentSnap = snapPointToInstruments(worldPos, pageElements, 0.45);
        const drawPt = instrumentSnap.didSnap ? instrumentSnap.snapped : worldPos;

        const nib = resolvePenNib(activeTool) ?? undefined;
        const smooth = nib === "fountain" || nib === "brush";
        filterXRef.current.reset();
        filterYRef.current.reset();
        const ts = performance.now();
        const x = smooth
          ? filterXRef.current.filter(drawPt.x, ts)
          : drawPt.x;
        const y = smooth
          ? filterYRef.current.filter(drawPt.y, ts)
          : drawPt.y;
        const effectiveStyle: Style =
          nib === "laser"
            ? { stroke: "#ef4444", width: 4 }
            : nib === "highlighter" &&
              (!currentStyle.stroke || currentStyle.stroke.toLowerCase() === "#111827")
            ? { ...currentStyle, stroke: "#facc15" }
            : nib === "dashed"
            ? { ...currentStyle, dash: true }
            : currentStyle;
        liveStrokePointsRef.current = [x, y];
        liveStrokePressuresRef.current = [e.pressure || 0.5];
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
      draftPolygonPts,
      currentPage,
      fillColor,
      solved3D.p3,
      handleSelectTool,
      handleConstructionClick,
      penOnlyMode,
    ]
  );

  // --- Root Canvas Pointer Move ---
  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      navPointerMove(e);

      const rect = containerRef.current?.getBoundingClientRect();
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
            } else if (
              initEl.type === "PhysicsSim" ||
              initEl.type === "PhysicsDiagram" ||
              initEl.type === "PhysicsInstrument" ||
              initEl.type === "PhysicsLabTable"
            ) {
              const s = Math.max(0.45, Math.abs(avgScale));
              dispatcher.dispatch({
                type: "object.update",
                params: {
                  id: initEl.id,
                  transform: {
                    x: handle.anchorX + (initEl.transform.x - handle.anchorX) * s,
                    y: handle.anchorY + (initEl.transform.y - handle.anchorY) * s,
                    scale: Math.max(0.45, (initEl.transform.scale || 1) * s),
                  },
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
        checkEraserCollision(worldPos, pageElements, viewport.scale, (id) => {
          dispatcher.deleteObjects([id]);
        });
        return;
      }

      // 6. Ink / Multi-nib Pens
      if (
        isPenTool(activeTool) &&
        e.buttons === 1 &&
        liveStroke
      ) {
        // Magnetic snap to Ruler or Set Square edges if nearby
        const instrumentSnap = snapPointToInstruments(worldPos, pageElements, 0.45);
        const drawPt = instrumentSnap.didSnap ? instrumentSnap.snapped : worldPos;

        const nib = resolvePenNib(activeTool) ?? undefined;
        const smooth = nib === "fountain" || nib === "brush";
        const ts = performance.now();
        const x = smooth
          ? filterXRef.current.filter(drawPt.x, ts)
          : drawPt.x;
        const y = smooth
          ? filterYRef.current.filter(drawPt.y, ts)
          : drawPt.y;
        liveStrokePointsRef.current.push(x, y);
        liveStrokePressuresRef.current.push(e.pressure || 0.5);
        setLiveStroke({
          points: [...liveStrokePointsRef.current],
          pressures: [...liveStrokePressuresRef.current],
          nib,
          style: liveStroke.style,
        });
      }
    },
    [
      navPointerMove,
      containerRef,
      viewport,
      dispatcher,
      activeTool,
      pageElements,
      liveStroke,
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
        const rect = containerRef.current?.getBoundingClientRect();
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

      if (liveStroke) {
        const pts = liveStrokePointsRef.current;
        const pressures = liveStrokePressuresRef.current;
        if (pts.length >= 4) {
          if (liveStroke.nib === "laser") {
            // Dedicated laser pointer: fade out completely after 1.5s, not persisting in Yjs
            const strokeId = newElId("laser");
            setLaserStrokes((prev) => [
              ...prev,
              { id: strokeId, points: [...pts], createdAt: performance.now() },
            ]);
          } else if (
            inkToShape &&
            (liveStroke.nib === undefined ||
              liveStroke.nib === "pencil" ||
              liveStroke.nib === "fountain")
          ) {
            // Ink-to-shape intelligence: check if matches straight segment, arrow, circle, triangle, or rectangle
            const recognized = recognizeStrokeShape(pts);
            if (recognized) {
              if (recognized.type === "circle") {
                const circId = newElId("circ");
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: circId,
                    type: "GeomCircle",
                    style: {
                      stroke: liveStroke.style.stroke ?? "#0891b2",
                      width: liveStroke.style.width ?? 2,
                      dash: liveStroke.style.dash ?? false,
                    },
                    props: {
                      center: `${circId}_c`,
                      centerPt: recognized.center,
                      radius: { kind: "value", v: recognized.radius },
                    },
                  },
                });
              } else if (recognized.type === "segment") {
                const segId = newElId("seg");
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: segId,
                    type: "GeomSegment",
                    style: {
                      stroke: liveStroke.style.stroke ?? "#334155",
                      width: liveStroke.style.width ?? 2,
                      dash: liveStroke.style.dash ?? false,
                    },
                    props: {
                      from: `${segId}_a`,
                      to: `${segId}_b`,
                      fromPt: recognized.start,
                      toPt: recognized.end,
                    },
                  },
                });
              } else if (recognized.type === "arrow") {
                const vecId = newElId("vec");
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: vecId,
                    type: "GeomVector",
                    style: {
                      stroke: liveStroke.style.stroke ?? "#334155",
                      width: liveStroke.style.width ?? 2,
                      dash: liveStroke.style.dash ?? false,
                    },
                    props: {
                      from: `${vecId}_a`,
                      to: `${vecId}_b`,
                      fromPt: recognized.start,
                      toPt: recognized.end,
                    },
                  },
                });
              } else if (recognized.type === "triangle" || recognized.type === "rectangle") {
                const polyId = newElId("poly");
                const verts = recognized.vertices;
                const names = getNextPointNames(verts.length, pageElements);
                const marksEnabled = getConstructMarksEnabled();
                const embedded: EmbeddedVertex[] = verts.map((pt, i) => ({
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
                      stroke: liveStroke.style.stroke ?? "#2563eb",
                      fill: "rgba(37,99,235,0.06)",
                      width: liveStroke.style.width ?? 2,
                      dash: liveStroke.style.dash ?? false,
                    },
                    props: {
                      vertices: embedded.map((v) => v.id),
                      points: embedded,
                      marksEnabled,
                    },
                  },
                });
              }
            } else {
              // Normal ink stroke
              dispatcher.dispatch({
                type: "ink.stroke",
                params: {
                  points: pts,
                  pressures,
                  nib: liveStroke.nib,
                  style: liveStroke.style,
                },
              });
            }
          } else {
            dispatcher.dispatch({
              type: "ink.stroke",
              params: {
                points: pts,
                pressures,
                nib: liveStroke.nib,
                style: liveStroke.style,
              },
            });
          }
        }
        dispatcher.gesture(false);
        liveStrokePointsRef.current = [];
        liveStrokePressuresRef.current = [];
        setLiveStroke(null);
      }
    },
    [
      navPointerUp,
      dispatcher,
      viewport,
      pageElements,
      containerRef,
      findNearestPoint,
      commitTwoPointShape,
      liveStroke,
      inkToShape,
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
      if (liveStroke) {
        dispatcher.gesture(false);
        liveStrokePointsRef.current = [];
        liveStrokePressuresRef.current = [];
        setLiveStroke(null);
      }
    },
    [navPointerCancel, dispatcher, liveStroke]
  );

  // Drag-and-drop image file onto canvas
  const handleDropOnCanvas = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      e.preventDefault();
      try {
        const img = await readImageFile(file);
        const rect = containerRef.current?.getBoundingClientRect();
        const pt = screenToWorld(
          e.clientX,
          e.clientY,
          viewport.tx,
          viewport.ty,
          viewport.scale,
          rect
        );
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
    },
    [containerRef, viewport, dispatcher]
  );

  // --- Shared Renderers (used in both Fullscreen Whiteboard & 50/50 Split Exam Mode) ---
  const renderBoardElement = (rawEl: CanvasElement) => {
    if (rawEl.style?.hidden) return null;
    const el = adaptElementForBoard(rawEl, currentBoardTheme.isDark);
    const isSel = selectedIds.includes(el.id);

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
              e.stopPropagation();
              setSelectedIds([id]);
              const rect = containerRef.current?.getBoundingClientRect();
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
            orbitCam={orbitCamById[el.id]}
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
            allElements={pageElements}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onResizeHandlePointerDown={(e, side) => {
              void e;
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
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
          />
        );

      case "PhysicsSim":
        return (
          <PhysicsSimElement
            key={el.id}
            element={el}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateProps={handleUpdateElementProps}
            onExportGraph={handleExportPhysicsGraph}
            onRecordData={handleRecordPhysicsSample}
          />
        );

      case "PhysicsDiagram":
        return (
          <PhysicsDiagramElement
            key={el.id}
            element={el}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateProps={handleUpdateElementProps}
          />
        );

      case "PhysicsInstrument":
        return (
          <PhysicsInstrumentElement
            key={el.id}
            element={el}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateProps={handleUpdateElementProps}
            onDrawArcStroke={handleCompassDrawArc}
          />
        );

      case "PhysicsLabTable":
        return (
          <PhysicsLabTableElement
            key={el.id}
            element={el}
            isSelected={isSel}
            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
            onUpdateProps={handleUpdateElementProps}
            onPlotRegression={handlePlotLabRegression}
          />
        );

      default:
        return null;
    }
  };

  const renderCanvas = (contained = false) => (
    <SvgCanvas
      viewport={viewport}
      containerRef={containerRef}
      currentTool={activeTool}
      isPanning={isPanning}
      isSpacePressed={isSpacePressed}
      contained={contained}
      boardConfig={currentBoardConfig}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerCancel}
      onPointerLeave={navPointerLeave}
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
                Boolean(selectedPhysicsEl) ||
                (selectedElements.length === 1 &&
                  (selectedElements[0].type === "Slider" ||
                    selectedElements[0].type === "Solid3D"))
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
          {draftPolygonPts.length > 0 && (
            <polyline
              points={draftPolygonPts.map((p) => `${p.x},${-p.y}`).join(" ")}
              fill="rgba(37,99,235,0.06)"
              stroke="#2563eb"
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </>
      }
      overlayChildren={
        <PeerCursors
          peers={peerCursors}
          viewport={viewport}
          peerCount={peerCount}
          showCounter={!contained}
        />
      }
    >
      {[...pageElements]
        .sort((a, b) => (a.transform.z ?? 0) - (b.transform.z ?? 0))
        .map(renderBoardElement)}

      {liveStroke && (
        <InkElement
          id="live-in-progress-stroke"
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

      {/* Ephemeral fading Laser Pointer strokes */}
      {laserStrokes.map((ls) => {
        const age = performance.now() - ls.createdAt;
        const opacity = Math.max(0, 1 - age / 1500);
        return (
          <g key={ls.id} style={{ opacity, pointerEvents: "none" }} data-laser-stroke="true">
            <InkElement
              id={ls.id}
              transform={{ x: 0, y: 0, scale: 1, rotation: 0, z: 99999 }}
              style={{
                stroke: "#ef4444",
                width: 4.5,
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
      selectedCount={selectedIds.length}
      onDeleteSelected={handleDeleteSelected}
      isFullscreen={isFullscreen}
      onToggleFullscreen={handleToggleFullscreen}
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
      onOpenRealWorldDrawer={() => setRealWorldDrawerOpen(true)}
      onPhysicsAction={handlePhysicsAction}
      onOpenPhysicsDrawer={() => setPhysicsDrawerOpen(true)}
      onSelectInstrument={handleSelectTeachingInstrument}
      onGoHome={onGoHome}
      onSaveFile={() => {
        if (!doc) return;
        const json = serializeState(doc, activeRoomId);
        downloadText(
          json,
          `${activeRoomId || "physboard"}.phys.json`,
          "application/json;charset=utf-8"
        );
        setStatusHint("✓ Đã lưu bài vẽ ra file (.phys.json)");
      }}
      onOpenFile={() => openFileInputRef.current?.click()}
      onOpenDecorHelp={() =>
        setStatusHint(
          "Chọn một đoạn thẳng trên bảng rồi dùng thanh Trang trí đoạn bên dưới."
        )
      }
      onShare={() => {
        const url = buildShareUrl(activeRoomId);
        navigator.clipboard?.writeText(url).catch(() => {});
        setShareCopied(true);
        setShareModalOpen(true);
      }}
      getBoardElement={() => containerRef.current}
      hasPaper={hasPaper}
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
      onOpenExam={() => setExamOpen(true)}
      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      onExportTikz={() => setExportModalMode("tikz")}
      onOpenJsonModal={() => setExportModalMode("json")}
      shortcutMap={shortcutMap}
      penOnlyMode={penOnlyMode}
      onTogglePenOnly={handleTogglePenOnly}
      inkToShape={inkToShape}
      onToggleInkToShape={handleToggleInkToShape}
    />
  );

  const selectedSegment =
    selectedElements.length === 1 && selectedElements[0].type === "GeomSegment"
      ? selectedElements[0]
      : null;

  return (
    <div
      data-wb-room={activeRoomId}
      data-room-id={activeRoomId}
      className="relative w-screen h-screen overflow-hidden select-none bg-[#FBFBFD]"
    >
      <input
        ref={openFileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file || !doc) return;
          const reader = new FileReader();
          reader.onload = () => {
            const text = typeof reader.result === "string" ? reader.result : "";
            if (!text) return;
            const res = loadState(doc, text);
            if (res.ok) {
              setStatusHint(`✓ Đã mở ${res.count} đối tượng từ file!`);
            } else {
              setStatusHint(`⚠ ${res.error ?? "File không hợp lệ"}`);
            }
          };
          reader.readAsText(file);
          e.target.value = "";
        }}
      />
      {/* Single-Tab Lock Screen */}
      {isTabLocked && <TabLockOverlay onRetry={releaseTabLock} />}

      {/* Offline Banner */}
      <OfflineBanner isOffline={!isConnected} />

      {/* Main Whiteboard View vs Exam Authoring Mode */}
      {examOpen ? (
        <ExamEditor
          open={examOpen}
          doc={doc}
          page={currentPage}
          whiteboardToolbarSlot={renderToolbar(true)}
          whiteboardSlot={renderCanvas(true)}
          onClose={() => setExamOpen(false)}
        />
      ) : (
        <>
          {renderToolbar(false)}
          {renderCanvas(false)}
        </>
      )}

      {/* Construction Status Hint Pill */}
      {statusHint && !examOpen && (
        <div
          data-wb-construct-hint="true"
          data-export-skip="true"
          style={{
            position: "fixed",
            top: 56,
            left: "50%",
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

      {/* Flood-Fill Name-Input Helper Strip */}
      {activeTool === "floodFill" && !examOpen && (
        <div
          data-export-skip="true"
          style={{
            position: "fixed",
            bottom: 14,
            left: "50%",
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
      {selectedSegment && !examOpen && (
        <div
          data-export-skip="true"
          style={{
            position: "fixed",
            bottom: 60,
            left: 12,
            zIndex: 62,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "5px 8px",
            display: "flex",
            gap: 6,
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
            fontSize: 12,
          }}
        >
          {(
            [
              { kind: "dim", label: "📏 Kích thước", text: "a" },
              { kind: "label", label: "🏷 Ghi chữ", text: "cạnh" },
              { kind: "ground", label: "▨ Mặt đất", text: "" },
              { kind: "water", label: "〰 Mặt nước", text: "" },
            ] as const
          ).map((d) => (
            <button
              key={d.kind}
              type="button"
              onClick={() => {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    type: "LineDecor",
                    props: {
                      target: selectedSegment.id,
                      kind: d.kind,
                      side: 1,
                      ...(d.text ? { text: d.text } : {}),
                    },
                  },
                });
              }}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#1e293b",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Floating Selection Bar */}
      {!examOpen && (
        <SelectionBar
          selectedCount={selectedIds.length}
          hiddenCount={hiddenCount}
          selectedAxes2D={selectedAxes2D}
          selectedPhysicsEl={selectedPhysicsEl}
          selectedPoints={selectedPoints}
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
          onAxesOpenConic={() => setConicDialogKind("ellipse")}
          onAxesOpenEquation={() => setCurve2dDialogMode("equation")}
          onAxesOpenInequality={() => setCurve2dDialogMode("inequality")}
          onAxesOpenParametric={() => setCurve2dDialogMode("parametric")}
          onAxesOpenSequence={() => setCurve2dDialogMode("sequence")}
          onPhysicsTogglePlay={() => {
            if (selectedPhysicsEl?.type !== "PhysicsSim") return;
            const p = selectedPhysicsEl.props as unknown as PhysicsSimProps;
            const eff = getEffectiveSimTime(p);
            handleUpdateElementProps(selectedPhysicsEl.id, {
              playing: !p.playing,
              simTime: eff,
              anchorEpoch: !p.playing ? Date.now() : undefined,
            });
          }}
          onPhysicsReset={() => {
            if (selectedPhysicsEl?.type !== "PhysicsSim") return;
            handleUpdateElementProps(selectedPhysicsEl.id, {
              playing: false,
              simTime: 0,
              anchorEpoch: undefined,
            });
          }}
          onPhysicsExportGraph={() => {
            if (selectedPhysicsEl?.type === "PhysicsSim") {
              handleExportPhysicsGraph(selectedPhysicsEl.id);
            }
          }}
          onPhysicsRecordData={() => {
            if (selectedPhysicsEl?.type !== "PhysicsSim") return;
            const p = selectedPhysicsEl.props as unknown as PhysicsSimProps;
            const ev = evaluatePhysicsSim(p.kind, getEffectiveSimTime(p), p.params ?? {}, p.mode);
            handleRecordPhysicsSample(selectedPhysicsEl.id, ev.recordPoint);
          }}
          onPhysicsRotateInstrument={(deltaDeg) => {
            if (selectedPhysicsEl?.type !== "PhysicsInstrument") return;
            dispatcher.dispatch({
              type: "object.update",
              params: {
                id: selectedPhysicsEl.id,
                transform: {
                  rotation: ((selectedPhysicsEl.transform.rotation || 0) + deltaDeg) % 360,
                },
              },
            });
          }}
          onPhysicsPlotRegression={() => {
            if (selectedPhysicsEl?.type === "PhysicsLabTable") {
              handlePlotLabRegression(selectedPhysicsEl.id);
            }
          }}
          onUpdateInstrumentProps={handleUpdateElementProps}
        />
      )}

      {/* 3D Orbital Controls Bar */}
      {activeOrbitElement && !examOpen && (
        <OrbitBar
          visible={true}
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
          }}
          onCancel={() => setMathSession(null)}
          onPlotFunction={(latex) => {
            const clean = latex.replace(/^[yY]\s*=\s*/, "").replace(/^f\(x\)\s*=\s*/, "").trim();
            handleSubmitPlot(clean || latex, []);
            setStatusHint("Đã vẽ đồ thị hàm số sang hệ trục Oxy");
          }}
          onBuildVarTable={(latex) => {
            const clean = latex.replace(/^[yY]\s*=\s*/, "").replace(/^f\(x\)\s*=\s*/, "").trim();
            const res = buildVarTableFromExpr(clean || latex);
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
                props: { table: res, formulaLatex: clean || latex },
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
        }}
        onCancel={() => setAxesVectorDialogOpen(false)}
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
        }}
        onCancel={() => setVarTableDialogMode(null)}
      />

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
        onInsertSim={handleInsertPhysicsSim}
        onInsertAction={handlePhysicsAction}
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
        }}
        onInsertLessonPreset={handleInsertLessonPreset}
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
        }}
      />

      {/* TikZ / JSON Export Modal */}
      <ExportModal
        open={exportModalMode !== null}
        mode={exportModalMode ?? "tikz"}
        doc={doc}
        page={currentPage}
        roomId={activeRoomId}
        onClose={() => setExportModalMode(null)}
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
      {!examOpen && (
        <div
          data-wb-hud="true"
          data-export-skip="true"
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(4px)",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#64748b",
            pointerEvents: "none",
            zIndex: 40,
          }}
        >
          {cursorWorld ? (
            <>
              X: {cursorWorld.x.toFixed(2)} | Y: {cursorWorld.y.toFixed(2)} |{" "}
            </>
          ) : null}
          Zoom: {Math.round(viewport.scale)}
        </div>
      )}
    </div>
  );
}
