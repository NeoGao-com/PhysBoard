"use client";

export interface BoardItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  folderId?: string | null;
  trashed?: boolean;
}

export interface BoardFolder {
  id: string;
  name: string;
  createdAt: number;
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
