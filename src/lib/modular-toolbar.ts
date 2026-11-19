export type ModularBlockId = "ink" | "geometry2d" | "space3d" | "physics";

export interface ModularBlockState {
  id: ModularBlockId;
  name: string;
  isFloating: boolean;
  position: { x: number; y: number };
}

export interface ModularLayoutConfig {
  blocks: Record<ModularBlockId, ModularBlockState>;
}

export const MODULAR_BLOCK_DEFS: Record<ModularBlockId, { id: ModularBlockId; name: string; defaultPos: { x: number; y: number } }> = {
  ink: { id: "ink", name: "Thao tác & Viết vẽ", defaultPos: { x: 160, y: 110 } },
  geometry2d: { id: "geometry2d", name: "Hình học phẳng", defaultPos: { x: 160, y: 170 } },
  space3d: { id: "space3d", name: "Không gian & Hàm số", defaultPos: { x: 160, y: 230 } },
  physics: { id: "physics", name: "Vật lý & Dụng cụ", defaultPos: { x: 160, y: 290 } },
};

export const DEFAULT_MODULAR_LAYOUT: ModularLayoutConfig = {
  blocks: {
    ink: { id: "ink", name: MODULAR_BLOCK_DEFS.ink.name, isFloating: false, position: MODULAR_BLOCK_DEFS.ink.defaultPos },
    geometry2d: { id: "geometry2d", name: MODULAR_BLOCK_DEFS.geometry2d.name, isFloating: false, position: MODULAR_BLOCK_DEFS.geometry2d.defaultPos },
    space3d: { id: "space3d", name: MODULAR_BLOCK_DEFS.space3d.name, isFloating: false, position: MODULAR_BLOCK_DEFS.space3d.defaultPos },
    physics: { id: "physics", name: MODULAR_BLOCK_DEFS.physics.name, isFloating: false, position: MODULAR_BLOCK_DEFS.physics.defaultPos },
  },
};

export const MODULAR_LAYOUT_STORAGE_KEY = "physboard_modular_toolbar_layout";

export function loadModularLayoutConfig(): ModularLayoutConfig {
  if (typeof window === "undefined") return DEFAULT_MODULAR_LAYOUT;
  try {
    const raw = window.localStorage.getItem(MODULAR_LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_MODULAR_LAYOUT;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.blocks) return DEFAULT_MODULAR_LAYOUT;
    return {
      blocks: {
        ink: { ...DEFAULT_MODULAR_LAYOUT.blocks.ink, ...parsed.blocks.ink },
        geometry2d: { ...DEFAULT_MODULAR_LAYOUT.blocks.geometry2d, ...parsed.blocks.geometry2d },
        space3d: { ...DEFAULT_MODULAR_LAYOUT.blocks.space3d, ...parsed.blocks.space3d },
        physics: { ...DEFAULT_MODULAR_LAYOUT.blocks.physics, ...parsed.blocks.physics },
      },
    };
  } catch {
    return DEFAULT_MODULAR_LAYOUT;
  }
}

export function saveModularLayoutConfig(cfg: ModularLayoutConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODULAR_LAYOUT_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}
