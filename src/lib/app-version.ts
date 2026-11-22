export const APP_VERSION = "1.0.7";
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
