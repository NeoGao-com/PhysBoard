"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  type BoardFolder,
  type BoardItem,
  loadBoards,
  loadFolders,
  saveBoards,
  saveFolders,
} from "./board-manager";
import { sanitizeRoomId } from "./room";

export interface PhysBoardBackupPayload {
  format: "physboard-backup-v1";
  exportedAt: number;
  boards: BoardItem[];
  folders: BoardFolder[];
  /** roomId -> base64-encoded Yjs state update */
  roomStates: Record<string, string>;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function exportRoomStateBase64(roomId: string): Promise<string | null> {
  const safeId = sanitizeRoomId(roomId);
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`whiteboard-v2-${safeId}`, ydoc);
  try {
    await persistence.whenSynced;
    const update = Y.encodeStateAsUpdate(ydoc);
    if (update.length <= 2) return null;
    return uint8ToBase64(update);
  } finally {
    await persistence.destroy().catch(() => {});
    ydoc.destroy();
  }
}

async function importRoomStateBase64(roomId: string, base64: string): Promise<void> {
  const safeId = sanitizeRoomId(roomId);
  const bytes = base64ToUint8(base64);
  if (bytes.length === 0) return;
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`whiteboard-v2-${safeId}`, ydoc);
  try {
    await persistence.whenSynced;
    Y.applyUpdate(ydoc, bytes);
    // Give IndexedDB a brief moment to commit the transaction before destroying
    await new Promise((r) => setTimeout(r, 80));
  } finally {
    await persistence.destroy().catch(() => {});
    ydoc.destroy();
  }
}

export async function exportAllNotebooksBackup(): Promise<{
  blob: Blob;
  fileName: string;
  boardCount: number;
}> {
  const boards = loadBoards();
  const folders = loadFolders();
  const roomStates: Record<string, string> = {};

  for (const board of boards) {
    try {
      const b64 = await exportRoomStateBase64(board.id);
      if (b64) {
        roomStates[board.id] = b64;
      }
    } catch {
      // Skip unreadable room without failing entire backup
    }
  }

  const payload: PhysBoardBackupPayload = {
    format: "physboard-backup-v1",
    exportedAt: Date.now(),
    boards,
    folders,
    roomStates,
  };

  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const dateStr = new Date().toISOString().slice(0, 10);
  return {
    blob,
    fileName: `PhysBoard-Backup-${dateStr}.physbackup.json`,
    boardCount: boards.length,
  };
}

export async function importNotebooksBackup(file: File): Promise<{
  importedBoards: number;
  importedFolders: number;
}> {
  const text = await file.text();
  let parsed: PhysBoardBackupPayload;
  try {
    parsed = JSON.parse(text) as PhysBoardBackupPayload;
  } catch {
    throw new Error("Tệp sao lưu không đúng định dạng JSON.");
  }

  if (parsed?.format !== "physboard-backup-v1" || !Array.isArray(parsed.boards)) {
    throw new Error("Tệp không phải bản sao lưu hợp lệ của PhysBoard (.physbackup.json).");
  }

  const existingFolders = loadFolders();
  const folderMap = new Map(existingFolders.map((f) => [f.id, f]));
  let importedFolders = 0;
  for (const f of parsed.folders ?? []) {
    if (f?.id && f?.name && !folderMap.has(f.id)) {
      folderMap.set(f.id, f);
      importedFolders++;
    }
  }
  saveFolders(Array.from(folderMap.values()));

  const existingBoards = loadBoards();
  const boardMap = new Map(existingBoards.map((b) => [b.id, b]));
  for (const b of parsed.boards) {
    if (b?.id && b?.name) {
      boardMap.set(b.id, { ...boardMap.get(b.id), ...b });
    }
  }
  saveBoards(Array.from(boardMap.values()));

  const states = parsed.roomStates ?? {};
  for (const [roomId, b64] of Object.entries(states)) {
    if (typeof b64 === "string" && b64.length > 0) {
      await importRoomStateBase64(roomId, b64);
    }
  }

  return {
    importedBoards: parsed.boards.length,
    importedFolders: importedFolders || (parsed.folders?.length ?? 0),
  };
}
