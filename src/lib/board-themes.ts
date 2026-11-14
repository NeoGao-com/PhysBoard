import * as Y from "yjs";
import type { CanvasElement } from "@/types/whiteboard";

export type BoardSurfaceId =
  | "white"
  | "greenboard"
  | "blackboard"
  | "cream"
  | "dark"
  | "custom";

export type BoardPatternId = "none" | "grid" | "dots" | "ruled" | "graph";

export type BoardGridSize = "sm" | "md" | "lg";

export type BoardFormatId = "infinite" | "a4_portrait" | "a4_landscape";

export interface PageBoardConfig {
  surface: BoardSurfaceId;
  customBg?: string;
  pattern: BoardPatternId;
  gridSize: BoardGridSize;
  format?: BoardFormatId;
}

export const DEFAULT_PAGE_BOARD_CONFIG: PageBoardConfig = {
  surface: "white",
  pattern: "ruled",
  gridSize: "md",
  format: "a4_portrait",
};

export interface BoardSurfacePreset {
  id: Exclude<BoardSurfaceId, "custom">;
  label: string;
  bg: string;
  isDark: boolean;
  previewBorder: string;
}

export const BOARD_SURFACE_PRESETS: readonly BoardSurfacePreset[] = [
  {
    id: "white",
    label: "Bảng trắng",
    bg: "#FBFBFD",
    isDark: false,
    previewBorder: "#CBD5E1",
  },
  {
    id: "greenboard",
    label: "Bảng xanh phấn",
    bg: "#13422E",
    isDark: true,
    previewBorder: "#0D2F20",
  },
  {
    id: "blackboard",
    label: "Bảng đen",
    bg: "#18181B",
    isDark: true,
    previewBorder: "#09090B",
  },
  {
    id: "cream",
    label: "Giấy kem",
    bg: "#FFFDF5",
    isDark: false,
    previewBorder: "#E7DEC8",
  },
  {
    id: "dark",
    label: "Chế độ tối",
    bg: "#0F172A",
    isDark: true,
    previewBorder: "#020617",
  },
] as const;

export const BOARD_PATTERN_OPTIONS: ReadonlyArray<{
  id: BoardPatternId;
  label: string;
}> = [
  { id: "none", label: "Trơn" },
  { id: "grid", label: "Ô vuông" },
  { id: "dots", label: "Chấm bi" },
  { id: "ruled", label: "Dòng kẻ" },
  { id: "graph", label: "Đồ thị" },
];

export const BOARD_GRID_SIZE_OPTIONS: ReadonlyArray<{
  id: BoardGridSize;
  label: string;
  px: number;
}> = [
  { id: "sm", label: "Nhỏ", px: 18 },
  { id: "md", label: "Vừa", px: 24 },
  { id: "lg", label: "Lớn", px: 36 },
];

export const BOARD_FORMAT_OPTIONS: ReadonlyArray<{
  id: BoardFormatId;
  label: string;
  desc: string;
  // A4 dimensions in world units (assuming standard world scale)
  // A4 standard ratio = 1 : √2 (210mm x 297mm ≈ 1 : 1.414)
  // In world units (at ~45px/unit): portrait width = 16, height = 22.6; landscape: width = 22.6, height = 16
  widthWorld: number;
  heightWorld: number;
}> = [
  { id: "infinite", label: "Vô tận", desc: "Không giới hạn khung trang", widthWorld: 0, heightWorld: 0 },
  { id: "a4_portrait", label: "A4 Dọc", desc: "Khổ giấy A4 chuẩn dọc (210 × 297mm)", widthWorld: 17, heightWorld: 24.04 },
  { id: "a4_landscape", label: "A4 Ngang", desc: "Khổ giấy A4 chuẩn ngang (297 × 210mm)", widthWorld: 24.04, heightWorld: 17 },
];

export interface ResolvedBoardTheme {
  bg: string;
  isDark: boolean;
  spacingPx: number;
  gridStroke: string;
  subGridStroke: string;
  ruledStroke: string;
  marginStroke: string;
  dotFill: string;
  defaultInkColor: string;
}

export function isDarkColor(hex: string): boolean {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.48;
}

export function normalizePageBoardConfig(raw: unknown): PageBoardConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PAGE_BOARD_CONFIG };
  }
  const r = raw as Record<string, unknown>;
  const validSurfaces: BoardSurfaceId[] = [
    "white",
    "greenboard",
    "blackboard",
    "cream",
    "dark",
    "custom",
  ];
  const validPatterns: BoardPatternId[] = [
    "none",
    "grid",
    "dots",
    "ruled",
    "graph",
  ];
  const validSizes: BoardGridSize[] = ["sm", "md", "lg"];
  const validFormats: BoardFormatId[] = ["infinite", "a4_portrait", "a4_landscape"];

  const surface = validSurfaces.includes(r.surface as BoardSurfaceId)
    ? (r.surface as BoardSurfaceId)
    : DEFAULT_PAGE_BOARD_CONFIG.surface;
  const pattern = validPatterns.includes(r.pattern as BoardPatternId)
    ? (r.pattern as BoardPatternId)
    : DEFAULT_PAGE_BOARD_CONFIG.pattern;
  const gridSize = validSizes.includes(r.gridSize as BoardGridSize)
    ? (r.gridSize as BoardGridSize)
    : DEFAULT_PAGE_BOARD_CONFIG.gridSize;
  const format = validFormats.includes(r.format as BoardFormatId)
    ? (r.format as BoardFormatId)
    : DEFAULT_PAGE_BOARD_CONFIG.format;
  const customBg =
    typeof r.customBg === "string" && /^#[0-9a-fA-F]{6}$/.test(r.customBg.trim())
      ? r.customBg.trim()
      : undefined;

  return {
    surface,
    ...(customBg ? { customBg } : {}),
    pattern,
    gridSize,
    format,
  };
}

export function resolveBoardColors(cfg?: PageBoardConfig | null): ResolvedBoardTheme {
  const effective = cfg ?? DEFAULT_PAGE_BOARD_CONFIG;
  const spacingPx =
    BOARD_GRID_SIZE_OPTIONS.find((s) => s.id === effective.gridSize)?.px ?? 24;

  let bg = "#FBFBFD";
  if (effective.surface === "custom" && effective.customBg) {
    bg = effective.customBg;
  } else {
    const preset = BOARD_SURFACE_PRESETS.find((p) => p.id === effective.surface);
    if (preset) bg = preset.bg;
  }

  const dark = isDarkColor(bg);

  if (dark) {
    const isGreen = effective.surface === "greenboard";
    return {
      bg,
      isDark: true,
      spacingPx,
      gridStroke: isGreen ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.12)",
      subGridStroke: isGreen ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.05)",
      ruledStroke: "rgba(255,255,255,0.18)",
      marginStroke: "rgba(248,113,113,0.45)",
      dotFill: "rgba(255,255,255,0.28)",
      defaultInkColor: "#F8FAFC",
    };
  }

  const isCream = effective.surface === "cream";
  return {
    bg,
    isDark: false,
    spacingPx,
    gridStroke: isCream ? "#EDE4CE" : "#E6E8EE",
    subGridStroke: isCream ? "#F5EFE0" : "#F1F3F7",
    ruledStroke: isCream ? "#DFD4BA" : "#DCE3EE",
    marginStroke: "rgba(239,68,68,0.26)",
    dotFill: isCream ? "#C9BC9C" : "#CBD5E1",
    defaultInkColor: "#111827",
  };
}

const DARK_DEFAULT_INK_HEXES = new Set([
  "#111827",
  "#0f172a",
  "#1e293b",
  "#000000",
  "#000",
  "#1e3a5f",
  "#334155",
]);

/**
 * Visually maps dark-default ink/label colors onto chalk-white when displayed on dark boards,
 * keeping stored element hex colors unchanged for round-trip compatibility.
 */
export function adaptStrokeForBoard(
  color: string | null | undefined,
  isDarkBoard: boolean
): string | undefined {
  if (!isDarkBoard) return color ?? undefined;
  if (!color) return "#F8FAFC";
  if (DARK_DEFAULT_INK_HEXES.has(color.trim().toLowerCase())) {
    return "#F8FAFC";
  }
  return color;
}

export function adaptElementForBoard<T extends CanvasElement>(
  el: T,
  isDarkBoard: boolean
): T {
  if (!isDarkBoard) return el;
  const origStroke = el.style?.stroke;
  const adapted = adaptStrokeForBoard(origStroke, true);
  if (adapted === origStroke) return el;
  return {
    ...el,
    style: {
      ...el.style,
      stroke: adapted,
    },
  };
}

export const BOARD_PAGES_YMAP = "boardPages";

export function readPageBoardConfig(
  doc: Y.Doc | null | undefined,
  page: number
): PageBoardConfig {
  if (!doc) return { ...DEFAULT_PAGE_BOARD_CONFIG };
  const map = doc.getMap<unknown>(BOARD_PAGES_YMAP);
  return normalizePageBoardConfig(map.get(String(page)));
}

export function readAllPageBoardConfigs(
  doc: Y.Doc | null | undefined
): Record<string, PageBoardConfig> {
  if (!doc) return {};
  const map = doc.getMap<unknown>(BOARD_PAGES_YMAP);
  const out: Record<string, PageBoardConfig> = {};
  map.forEach((value, key) => {
    out[key] = normalizePageBoardConfig(value);
  });
  return out;
}

export function writePageBoardConfig(
  doc: Y.Doc,
  page: number,
  config: PageBoardConfig
): void {
  const normalized = normalizePageBoardConfig(config);
  const map = doc.getMap<unknown>(BOARD_PAGES_YMAP);
  doc.transact(() => {
    map.set(String(page), normalized);
  });
}

export function applyBoardConfigToAllPages(
  doc: Y.Doc,
  pageCount: number,
  config: PageBoardConfig
): void {
  const normalized = normalizePageBoardConfig(config);
  const map = doc.getMap<unknown>(BOARD_PAGES_YMAP);
  doc.transact(() => {
    const count = Math.max(1, pageCount);
    for (let p = 1; p <= count; p++) {
      map.set(String(p), normalized);
    }
  });
}

export function writeAllPageBoardConfigs(
  doc: Y.Doc,
  configs: Record<string, unknown> | undefined
): void {
  const map = doc.getMap<unknown>(BOARD_PAGES_YMAP);
  map.clear();
  if (!configs || typeof configs !== "object") return;
  for (const [k, v] of Object.entries(configs)) {
    map.set(String(k), normalizePageBoardConfig(v));
  }
}
