/**
 * Room routing, sanitization, persistent client identity, per-tab session IDs,
 * deterministic peer HSL colors, and share URL helpers for Mathvera.
 */

export const CLIENT_ID_STORAGE_KEY = "wb-client-id";
export const TAB_ID_STORAGE_KEY = "wb-tab";
export const AUTH_TOKEN_STORAGE_KEY = "wb_token";
export const AUTH_USER_STORAGE_KEY = "wb_user";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Sanitizes a raw room identifier by stripping dangerous XSS / path traversal
 * characters while preserving valid URL-encoded UTF-8 room names.
 */
export function sanitizeRoomId(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") {
    return "default";
  }

  const decoded = safeDecodeURIComponent(raw);
  const cleaned = decoded
    .replace(/\.{2,}/g, "")
    .replace(/[/\\<>"'`;(){}[\]\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 128);

  if (!cleaned || cleaned === "undefined" || cleaned === "null") {
    return "default";
  }

  return cleaned;
}

/**
 * Parses and sanitizes the `?room=` query parameter from a URL or search string.
 */
export function parseRoomFromUrl(urlOrSearch?: string): string {
  let search = "";

  if (typeof urlOrSearch === "string") {
    const qIdx = urlOrSearch.indexOf("?");
    if (qIdx !== -1) {
      search = urlOrSearch.slice(qIdx);
    } else if (urlOrSearch.includes("=")) {
      search = urlOrSearch;
    } else {
      return sanitizeRoomId(urlOrSearch);
    }
  } else if (typeof window !== "undefined") {
    search = window.location.search;
  }

  const params = new URLSearchParams(search);
  return sanitizeRoomId(params.get("room"));
}

/**
 * Generates a fresh URL-safe room identifier.
 */
export function generateRoomId(prefix = "room"): string {
  const safePrefix = sanitizeRoomId(prefix).replace(/\s+/g, "-") || "room";
  const timePart = Date.now().toString(36);
  const randPart = Math.random().toString(36).slice(2, 7);
  return `${safePrefix}-${timePart}-${randPart}`;
}

function randomAlphaNum(length: number): string {
  let out = "";
  while (out.length < length) {
    out += Math.random().toString(36).slice(2);
  }
  return out.slice(0, length);
}

/**
 * Returns a persistent client ID stored in `localStorage["wb-client-id"]`.
 */
export function getClientId(): string {
  if (typeof window === "undefined") {
    return "c-ssr00000";
  }

  try {
    const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing && /^c-[a-z0-9]{4,32}$/i.test(existing)) {
      return existing;
    }
    const created = `c-${randomAlphaNum(8)}`;
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return `c-${randomAlphaNum(8)}`;
  }
}

/**
 * Returns a per-tab session ID (12 chars) stored in `sessionStorage["wb-tab"]`.
 */
export function getTabId(): string {
  if (typeof window === "undefined") {
    return "tab000000000";
  }

  try {
    const existing = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY);
    if (existing && existing.length >= 8) {
      return existing;
    }
    const created = randomAlphaNum(12);
    window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return randomAlphaNum(12);
  }
}

/**
 * Computes a deterministic HSL color string for a peer client ID.
 */
export function getPeerColor(clientId: number | string): string {
  let numericId = 0;
  if (typeof clientId === "number" && Number.isFinite(clientId)) {
    numericId = Math.abs(Math.trunc(clientId));
  } else {
    const str = String(clientId);
    for (let i = 0; i < str.length; i++) {
      numericId = (numericId * 31 + str.charCodeAt(i)) >>> 0;
    }
  }
  const hue = (numericId * 47) % 360;
  return `hsl(${hue} 70% 45%)`;
}

/**
 * Resolves a human-readable peer display name from stored user profile or client ID.
 */
export function getPeerDisplayName(clientId?: number): string {
  if (typeof window !== "undefined") {
    try {
      const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (rawUser) {
        const parsed = JSON.parse(rawUser) as { name?: unknown; code?: unknown };
        if (typeof parsed.name === "string" && parsed.name.trim()) {
          return parsed.name.trim();
        }
        if (typeof parsed.code === "string" && parsed.code.trim()) {
          return parsed.code.trim();
        }
      }
    } catch {
      // Ignore storage parse error
    }
  }

  if (typeof clientId === "number" && Number.isFinite(clientId)) {
    const suffix = String(Math.abs(clientId)).slice(-4).padStart(4, "0");
    return `Bạn #${suffix}`;
  }
  return "Bạn";
}

/**
 * Builds a shareable URL containing `?room=<sanitizedRoomId>`.
 */
export function buildShareUrl(roomId: string, origin?: string): string {
  const safeRoom = sanitizeRoomId(roomId);
  const resolvedOrigin =
    origin ??
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "http://localhost:3000");
  const normalizedOrigin = resolvedOrigin.replace(/\/+$/, "");
  return `${normalizedOrigin}/?room=${encodeURIComponent(safeRoom)}`;
}
