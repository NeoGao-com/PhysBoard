export const APP_VERSION = "1.4.4";
export const GITHUB_REPO = "NeoGao-com/PhysBoard";
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export function normalizeVersion(v: string): string {
  return v.replace(/^v/i, "").trim();
}

export function isNewerVersion(remote: string, current: string): boolean {
  const rParts = normalizeVersion(remote).split(".").map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  const cParts = normalizeVersion(current).split(".").map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export interface AppReleaseInfo {
  version: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  isNewer: boolean;
  windowsSetupUrl?: string;
  windowsPortableUrl?: string;
  androidApkUrl?: string;
}

export async function fetchLatestRelease(currentVersion = APP_VERSION): Promise<AppReleaseInfo> {
  const resp = await fetch(GITHUB_API_LATEST_RELEASE, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error("Chưa có phiên bản phát hành chính thức nào trên GitHub.");
    }
    throw new Error(`Không thể kết nối đến máy chủ cập nhật (HTTP ${resp.status})`);
  }
  const data = await resp.json();
  const remoteVersion = normalizeVersion(data.tag_name || data.name || "");
  const isNewer = isNewerVersion(remoteVersion, currentVersion);

  let windowsSetupUrl: string | undefined;
  let windowsPortableUrl: string | undefined;
  let androidApkUrl: string | undefined;

  if (Array.isArray(data.assets)) {
    for (const asset of data.assets) {
      const name = (asset.name || "").toLowerCase();
      const url: string = asset.browser_download_url;
      if (name.endsWith(".exe")) {
        if (name.includes("setup")) {
          windowsSetupUrl = url;
        } else {
          windowsPortableUrl = url;
        }
      } else if (name.endsWith(".apk")) {
        androidApkUrl = url;
      }
    }
  }

  if (!windowsSetupUrl && windowsPortableUrl) {
    windowsSetupUrl = windowsPortableUrl;
  }

  return {
    version: remoteVersion,
    name: data.name || data.tag_name || remoteVersion,
    body: data.body || "",
    publishedAt: data.published_at || "",
    htmlUrl: data.html_url || GITHUB_RELEASES_URL,
    isNewer,
    windowsSetupUrl,
    windowsPortableUrl,
    androidApkUrl,
  };
}

export type RuntimeUpdatePlatform = "tauri-windows" | "capacitor-android" | "web";

interface TauriInternalsLike {
  invoke?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

interface CapacitorAppUpdaterLike {
  downloadAndInstallApk?: (opts: { url: string }) => Promise<{
    needsPermission?: boolean;
    installedPrompted?: boolean;
  }>;
  addListener?: (
    event: string,
    cb: (data: { percent?: number; downloaded?: number; total?: number }) => void
  ) => Promise<{ remove?: () => Promise<void> | void }> | { remove?: () => void };
}

interface CapacitorLike {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    AppUpdater?: CapacitorAppUpdaterLike;
  };
}

export function getRuntimeUpdatePlatform(): RuntimeUpdatePlatform {
  if (typeof window === "undefined") return "web";
  const win = window as unknown as {
    __TAURI_INTERNALS__?: TauriInternalsLike;
    Capacitor?: CapacitorLike;
  };
  if (win.__TAURI_INTERNALS__?.invoke) {
    return "tauri-windows";
  }
  if (win.Capacitor?.isNativePlatform?.() && win.Capacitor?.getPlatform?.() === "android") {
    return "capacitor-android";
  }
  return "web";
}

export async function downloadAndInstallUpdate(
  release: AppReleaseInfo,
  onProgress?: (percent: number | null, status: string) => void
): Promise<{ needsPermission?: boolean }> {
  const platform = getRuntimeUpdatePlatform();
  const win = window as unknown as {
    __TAURI_INTERNALS__?: TauriInternalsLike;
    Capacitor?: CapacitorLike;
  };

  if (platform === "tauri-windows") {
    if (!release.windowsSetupUrl) {
      throw new Error("Không tìm thấy file cài đặt Windows (.exe) trong bản phát hành này.");
    }
    onProgress?.(0, "Đang tải ngầm bộ cài đặt Windows (.exe)... 0%");
    const onProgressEvent = (ev: Event) => {
      const detail = (ev as CustomEvent<{ percent?: number; downloaded?: number; total?: number }>).detail;
      const pct = typeof detail?.percent === "number" && detail.percent >= 0 ? detail.percent : null;
      onProgress?.(
        pct,
        pct !== null
          ? `Đang tải ngầm bộ cài đặt Windows... ${pct}%`
          : "Đang tải ngầm bộ cài đặt Windows (.exe)..."
      );
    };
    window.addEventListener("physboard:update-progress", onProgressEvent);
    try {
      await win.__TAURI_INTERNALS__!.invoke!("download_and_install_windows", {
        url: release.windowsSetupUrl,
      });
      onProgress?.(100, "Đang mở trình cài đặt...");
      return {};
    } finally {
      window.removeEventListener("physboard:update-progress", onProgressEvent);
    }
  }

  if (platform === "capacitor-android") {
    if (!release.androidApkUrl) {
      throw new Error("Không tìm thấy file cài đặt Android (.apk) trong bản phát hành này.");
    }
    const updater = win.Capacitor?.Plugins?.AppUpdater;
    if (!updater?.downloadAndInstallApk) {
      throw new Error("Plugin cập nhật Android chưa sẵn sàng. Vui lòng thử cài đặt lại từ GitHub.");
    }

    onProgress?.(0, "Đang tải ngầm bản cập nhật Android (.apk)...");
    let handle: { remove?: () => Promise<void> | void } | undefined;
    try {
      if (updater.addListener) {
        handle = await updater.addListener("downloadProgress", (ev) => {
          const pct = typeof ev.percent === "number" && ev.percent >= 0 ? ev.percent : null;
          onProgress?.(
            pct,
            pct !== null
              ? `Đang tải ngầm bản cập nhật Android... ${pct}%`
              : "Đang tải ngầm bản cập nhật Android..."
          );
        });
      }
      const res = await updater.downloadAndInstallApk({ url: release.androidApkUrl });
      if (res?.needsPermission) {
        onProgress?.(100, "Đã tải xong! Vui lòng bật quyền 'Cho phép từ nguồn này' rồi bấm cập nhật lại.");
        return { needsPermission: true };
      }
      onProgress?.(100, "Đã tải xong! Đang mở trình cài đặt Android...");
      return {};
    } finally {
      try {
        await handle?.remove?.();
      } catch {
        // Ignore cleanup error
      }
    }
  }

  throw new Error("Trình duyệt web không hỗ trợ tự cài đặt trực tiếp. Vui lòng mở bản cài đặt Desktop/Android.");
}
