export type LaserMode = "trail" | "dot";

export interface LaserConfig {
  mode: LaserMode;
  /** Dot radius in screen pixels (e.g., 6px to 48px) */
  dotSize: number;
  /** Trail stroke width (e.g. 2 to 16) */
  trailWidth: number;
  /** Color of the laser dot/trail */
  color: string;
}

export const LASER_STORAGE_KEY = "physboard_laser_config";

export const DEFAULT_LASER_CONFIG: LaserConfig = {
  mode: "trail",
  dotSize: 14,
  trailWidth: 4.5,
  color: "#ef4444",
};

export function loadLaserConfig(): LaserConfig {
  if (typeof window === "undefined") return DEFAULT_LASER_CONFIG;
  try {
    const raw = window.localStorage.getItem(LASER_STORAGE_KEY);
    if (!raw) return DEFAULT_LASER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === "dot" ? "dot" : "trail",
      dotSize: typeof parsed.dotSize === "number" ? Math.max(4, Math.min(64, parsed.dotSize)) : DEFAULT_LASER_CONFIG.dotSize,
      trailWidth: typeof parsed.trailWidth === "number" ? Math.max(1, Math.min(24, parsed.trailWidth)) : DEFAULT_LASER_CONFIG.trailWidth,
      color: typeof parsed.color === "string" ? parsed.color : DEFAULT_LASER_CONFIG.color,
    };
  } catch {
    return DEFAULT_LASER_CONFIG;
  }
}

export function saveLaserConfig(cfg: LaserConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LASER_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}
