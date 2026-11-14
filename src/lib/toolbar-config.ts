export interface ToolbarVisibilityConfig {
  // Nhóm 1: Chọn, Xoá, Thao tác
  groupSelection: boolean;
  toolSelect: boolean;
  toolMarquee: boolean;
  toolEraser: boolean;
  toolTrash: boolean;
  toolUndoRedo: boolean;

  // Nhóm 2: Bút vẽ & Công thức & PDF
  groupDrawing: boolean;
  toolPen: boolean;
  toolFormula: boolean;
  toolInsertPdf: boolean;

  // Nhóm 3: Hình học phẳng & Tô màu
  groupPlaneGeometry: boolean;
  toolPoint: boolean;
  toolSegment: boolean;
  toolCircle: boolean;
  toolPolygon: boolean;
  toolPlaneMenu: boolean;
  toolFill: boolean;

  // Nhóm 4: Hình không gian & Đồ thị
  groupSpaceGeometry: boolean;
  toolSpaceMenu: boolean;
  toolFunctionsMenu: boolean;
  toolStatsMenu: boolean;

  // Nhóm 5: Vật lý & Máy tính
  groupPhysics: boolean;
  toolPhysics: boolean;
  toolRealWorld: boolean;
  toolCalculator: boolean;
}

export const DEFAULT_TOOLBAR_VISIBILITY: ToolbarVisibilityConfig = {
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

export const TOOLBAR_VISIBILITY_STORAGE_KEY = "physboard_toolbar_visibility_config";

export function loadToolbarVisibilityConfig(): ToolbarVisibilityConfig {
  if (typeof window === "undefined") return DEFAULT_TOOLBAR_VISIBILITY;
  try {
    const raw = window.localStorage.getItem(TOOLBAR_VISIBILITY_STORAGE_KEY);
    if (!raw) return DEFAULT_TOOLBAR_VISIBILITY;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_TOOLBAR_VISIBILITY,
      ...parsed,
    };
  } catch {
    return DEFAULT_TOOLBAR_VISIBILITY;
  }
}

export function saveToolbarVisibilityConfig(cfg: ToolbarVisibilityConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOOLBAR_VISIBILITY_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}
