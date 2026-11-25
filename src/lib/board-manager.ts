"use client";

export interface BoardCoverConfig {
  kind: "pattern" | "illustration" | "solid";
  presetId: string;
  color?: string;
  layout?: "full" | "split" | "header" | "band";
  sticker?: string;
}

export interface BoardItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  folderId?: string | null;
  trashed?: boolean;
  favorite?: boolean;
  locked?: boolean;
  cover?: BoardCoverConfig | null;
}

export interface BoardFolder {
  id: string;
  name: string;
  createdAt: number;
  parentId?: string | null;
  color?: string;
}

export const BOARDS_STORAGE_KEY = "physboard_boards_catalog";
export const FOLDERS_STORAGE_KEY = "physboard_folders_catalog";
export const ACTIVE_BOARD_KEY = "physboard_active_board";

export const DEFAULT_BOARD_ID = "default";

export function loadBoards(): BoardItem[] {
  if (typeof window === "undefined") {
    return [{ id: DEFAULT_BOARD_ID, name: "Bảng mặc định", createdAt: Date.now(), updatedAt: Date.now() }];
  }
  try {
    const raw = window.localStorage.getItem(BOARDS_STORAGE_KEY);
    if (!raw) {
      const initial: BoardItem[] = [
        { id: DEFAULT_BOARD_ID, name: "Bảng mặc định", createdAt: Date.now(), updatedAt: Date.now() }
      ];
      window.localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [{ id: DEFAULT_BOARD_ID, name: "Bảng mặc định", createdAt: Date.now(), updatedAt: Date.now() }];
  } catch {
    return [{ id: DEFAULT_BOARD_ID, name: "Bảng mặc định", createdAt: Date.now(), updatedAt: Date.now() }];
  }
}

export function saveBoards(boards: BoardItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
  } catch {}
}

export function loadFolders(): BoardFolder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFolders(folders: BoardFolder[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {}
}

const PDF_STORE_DB = "physboard_pdf_import_db";
const PDF_STORE_TABLE = "pending_imports";

function openPdfImportDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(PDF_STORE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PDF_STORE_TABLE)) {
        db.createObjectStore(PDF_STORE_TABLE, { keyPath: "boardId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePendingPdfPages(boardId: string, pages: unknown[]): Promise<void> {
  try {
    const db = await openPdfImportDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_STORE_TABLE, "readwrite");
      const store = tx.objectStore(PDF_STORE_TABLE);
      store.put({ boardId, pages, timestamp: Date.now() });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      };
    });
  } catch (err) {
    console.error("storePendingPdfPages IndexedDB fallback:", err);
    // Fallback to sessionStorage if small enough
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(`pending_pdf_import_${boardId}`, JSON.stringify(pages));
      } catch (sessErr) {
        console.error("sessionStorage also failed:", sessErr);
      }
    }
  }
}

export async function retrievePendingPdfPages(boardId: string): Promise<unknown[] | null> {
  try {
    const db = await openPdfImportDb();
    const result = await new Promise<{ boardId: string; pages: unknown[] } | undefined>((resolve, reject) => {
      const tx = db.transaction(PDF_STORE_TABLE, "readwrite");
      const store = tx.objectStore(PDF_STORE_TABLE);
      const req = store.get(boardId);
      req.onsuccess = () => {
        if (req.result) {
          store.delete(boardId);
        }
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      };
    });

    if (result && Array.isArray(result.pages) && result.pages.length > 0) {
      return result.pages;
    }
  } catch (err) {
    console.error("retrievePendingPdfPages error:", err);
  }

  // Fallback to sessionStorage
  if (typeof window !== "undefined") {
    try {
      const key = `pending_pdf_import_${boardId}`;
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        window.sessionStorage.removeItem(key);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

