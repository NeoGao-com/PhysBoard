"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BoardItem,
  BoardFolder,
  loadBoards,
  saveBoards,
  loadFolders,
  saveFolders,
  DEFAULT_BOARD_ID,
  storePendingPdfPages,
} from "@/lib/board-manager";
import { generateRoomId, sanitizeRoomId } from "@/lib/room";
import { importPdfPages } from "@/lib/pdf-import";
import { exportAllNotebooksBackup, importNotebooksBackup } from "@/lib/board-backup";
import { downloadBlob } from "@/lib/export";
import {
  Menu,
  Plus,
  FileUp,
  X,
  FileText,
  Trash2,
  Folder,
  FolderPlus,
  Search,
  Settings,
  Edit2,
  RotateCcw,
  Sun,
  Moon,
  Clock,
} from "lucide-react";

export interface BoardManagerModalProps {
  open: boolean;
  onClose: () => void;
  currentRoomId: string;
  onSelectBoard: (boardId: string) => void;
  onInsertPdfIntoCurrentBoard?: (pages: import("@/lib/pdf-import").ImportedPdfPage[]) => void;
  onOpenSettings?: () => void;
}

type NavSection = "all" | "trash" | "folder";

export const BoardManagerModal: React.FC<BoardManagerModalProps> = ({
  open,
  onClose,
  currentRoomId,
  onSelectBoard,
  onInsertPdfIntoCurrentBoard,
  onOpenSettings,
}) => {
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [folders, setFolders] = useState<BoardFolder[]>([]);
  const [activeSection, setActiveSection] = useState<NavSection>("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    setBackupBusy(true);
    setBackupMsg(null);
    try {
      const res = await exportAllNotebooksBackup();
      downloadBlob(res.blob, res.fileName);
      setBackupMsg(`✓ Đã sao lưu ${res.boardCount} bảng thành file ${res.fileName}`);
    } catch (err) {
      setBackupMsg(err instanceof Error ? `⚠ ${err.message}` : "⚠ Sao lưu thất bại");
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportBackup = async (file: File) => {
    setBackupBusy(true);
    setBackupMsg(null);
    try {
      const res = await importNotebooksBackup(file);
      setBoards(loadBoards());
      setFolders(loadFolders());
      setBackupMsg(`✓ Đã khôi phục ${res.importedBoards} bảng & ${res.importedFolders} thư mục!`);
    } catch (err) {
      setBackupMsg(err instanceof Error ? `⚠ ${err.message}` : "⚠ Khôi phục thất bại");
    } finally {
      setBackupBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      setBoards(loadBoards());
      setFolders(loadFolders());
      setSearchQuery("");
      setShowNewFolderInput(false);
      setRenamingId(null);
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filteredBoards = useMemo(() => {
    let list = boards;
    if (activeSection === "trash") {
      list = list.filter((b) => b.trashed);
    } else {
      list = list.filter((b) => !b.trashed);
      if (activeSection === "folder" && selectedFolderId) {
        list = list.filter((b) => b.folderId === selectedFolderId);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }

    return list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [boards, activeSection, selectedFolderId, searchQuery]);

  const handleCreateNewBoard = () => {
    const newId = generateRoomId("board");
    const newBoard: BoardItem = {
      id: newId,
      name: `Bảng ${boards.filter((b) => !b.trashed).length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderId: activeSection === "folder" ? selectedFolderId : null,
    };
    const next = [newBoard, ...boards];
    setBoards(next);
    saveBoards(next);
    onSelectBoard(newId);
    onClose();
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: BoardFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      createdAt: Date.now(),
    };
    const next = [...folders, newFolder];
    setFolders(next);
    saveFolders(next);
    setNewFolderName("");
    setShowNewFolderInput(false);
    setSelectedFolderId(newFolder.id);
    setActiveSection("folder");
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa thư mục này? (Các bảng bên trong sẽ chuyển về Tất cả bảng)")) {
      const nextFolders = folders.filter((f) => f.id !== folderId);
      setFolders(nextFolders);
      saveFolders(nextFolders);
      const nextBoards = boards.map((b) => (b.folderId === folderId ? { ...b, folderId: null } : b));
      setBoards(nextBoards);
      saveBoards(nextBoards);
      if (selectedFolderId === folderId) {
        setActiveSection("all");
        setSelectedFolderId(null);
      }
    }
  };

  const handleTrashBoard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = boards.map((b) => (b.id === id ? { ...b, trashed: true, updatedAt: Date.now() } : b));
    setBoards(next);
    saveBoards(next);
  };

  const handleRestoreBoard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = boards.map((b) => (b.id === id ? { ...b, trashed: false, updatedAt: Date.now() } : b));
    setBoards(next);
    saveBoards(next);
  };

  const handlePermanentDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Xóa vĩnh viễn bảng này? Hành động này không thể hoàn tác.")) {
      let next = boards.filter((b) => b.id !== id);
      if (next.length === 0) {
        next = [
          {
            id: DEFAULT_BOARD_ID,
            name: "Bảng mặc định",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];
      }
      setBoards(next);
      saveBoards(next);
      if (typeof indexedDB !== "undefined") {
        try {
          indexedDB.deleteDatabase(`whiteboard-v2-${sanitizeRoomId(id)}`);
        } catch {
          // Ignore IDB cleanup error
        }
      }
      if (sanitizeRoomId(id) === sanitizeRoomId(currentRoomId)) {
        const fallbackId = next.find((b) => !b.trashed)?.id ?? DEFAULT_BOARD_ID;
        onSelectBoard(fallbackId);
        onClose();
      }
    }
  };

  const handleStartRename = (board: BoardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(board.id);
    setRenameValue(board.name);
  };

  const handleSaveRename = (id: string) => {
    if (renameValue.trim()) {
      const next = boards.map((b) => (b.id === id ? { ...b, name: renameValue.trim(), updatedAt: Date.now() } : b));
      setBoards(next);
      saveBoards(next);
    }
    setRenamingId(null);
  };

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const res = await importPdfPages(file);
      if (!res.pages || res.pages.length === 0) {
        alert("File PDF không có trang nào hoặc không thể hiển thị.");
        return;
      }

      if (onInsertPdfIntoCurrentBoard) {
        onInsertPdfIntoCurrentBoard(res.pages);
        onClose();
        return;
      }

      const newId = generateRoomId("pdf");
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const newBoard: BoardItem = {
        id: newId,
        name: baseName || `PDF ${res.pages.length} trang`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        folderId: activeSection === "folder" ? selectedFolderId : null,
      };
      const next = [newBoard, ...boards];
      setBoards(next);
      saveBoards(next);

      await storePendingPdfPages(newId, res.pages);
      onSelectBoard(newId);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Không thể đọc file PDF này: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (!open) return null;

  // Theme tokens
  const bgMain = isDarkTheme ? "#0d0f12" : "#f8fafc";
  const bgSidebar = isDarkTheme ? "#13171d" : "#ffffff";
  const bgCard = isDarkTheme ? "#171c24" : "#ffffff";
  const bgCardHover = isDarkTheme ? "#1d232e" : "#f1f5f9";
  const borderCol = isDarkTheme ? "#1e242c" : "#e2e8f0";
  const borderCardCol = isDarkTheme ? "#242c38" : "#e2e8f0";
  const textPrimary = isDarkTheme ? "#f1f5f9" : "#0f172a";
  const textSecondary = isDarkTheme ? "#94a3b8" : "#64748b";
  const activeNavBg = isDarkTheme ? "#222a36" : "#eff6ff";
  const activeNavText = isDarkTheme ? "#38bdf8" : "#2563eb";

  return (
    <div
      data-testid="board-manager-modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: bgMain,
        color: textPrimary,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Be Vietnam Pro', 'Inter', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: `1px solid ${borderCol}`,
          backgroundColor: bgSidebar,
          flexShrink: 0,
          boxShadow: isDarkTheme ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Đóng / mở menu bên trái"
            style={{
              background: "none",
              border: "none",
              color: textSecondary,
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="./logo.png"
              alt="PhysBoard"
              width={28}
              height={28}
              style={{
                borderRadius: 8,
                display: "block",
                objectFit: "cover",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.25)",
              }}
            />
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: textPrimary }}>
              PhysBoard Notes
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {backupMsg && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: backupMsg.startsWith("⚠") ? "#ef4444" : "#10b981",
                maxWidth: 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={backupMsg}
            >
              {backupMsg}
            </span>
          )}
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,.physbackup.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportBackup(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={backupBusy}
            onClick={handleExportBackup}
            title="Sao lưu toàn bộ bảng & thư mục thành 1 file .physbackup.json"
            style={{
              background: isDarkTheme ? "#1e242c" : "#f1f5f9",
              border: `1px solid ${borderCol}`,
              color: textSecondary,
              padding: "6px 10px",
              borderRadius: 8,
              cursor: backupBusy ? "wait" : "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            💾 Sao lưu
          </button>
          <button
            type="button"
            disabled={backupBusy}
            onClick={() => backupInputRef.current?.click()}
            title="Khôi phục sổ tay từ file .physbackup.json"
            style={{
              background: isDarkTheme ? "#1e242c" : "#f1f5f9",
              border: `1px solid ${borderCol}`,
              color: textSecondary,
              padding: "6px 10px",
              borderRadius: 8,
              cursor: backupBusy ? "wait" : "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            📥 Khôi phục
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            title={isDarkTheme ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
            style={{
              background: isDarkTheme ? "#1e242c" : "#f1f5f9",
              border: `1px solid ${borderCol}`,
              color: textSecondary,
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {isDarkTheme ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
            <span>{isDarkTheme ? "Sáng" : "Tối"}</span>
          </button>

          {/* Create Board Button */}
          <button
            type="button"
            onClick={handleCreateNewBoard}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#2563eb",
              border: "none",
              color: "#ffffff",
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(37,99,235,0.28)",
              transition: "all 0.15s ease",
            }}
          >
            <Plus size={15} strokeWidth={2} />
            <span>Tạo bảng mới</span>
          </button>

          {/* Import PDF Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: isDarkTheme ? "#1a2028" : "#ffffff",
              border: `1px solid ${isDarkTheme ? "#334155" : "#cbd5e1"}`,
              color: textPrimary,
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <FileUp size={15} strokeWidth={1.75} />
            <span>Chèn PDF</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
            onChange={handleImportPdf}
          />

          <div style={{ width: 1, height: 20, backgroundColor: borderCol, margin: "0 4px" }} />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Quay lại bảng vẽ (Esc)"
            style={{
              background: "none",
              border: "none",
              color: textSecondary,
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar & Content Area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Navigation Sidebar */}
        {!isSidebarCollapsed && (
          <aside
            style={{
              width: 240,
              backgroundColor: bgSidebar,
              borderRight: `1px solid ${borderCol}`,
              display: "flex",
              flexDirection: "column",
              padding: "16px 12px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              {/* All Notes */}
              <button
                type="button"
                onClick={() => {
                  setActiveSection("all");
                  setSelectedFolderId(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: activeSection === "all" ? activeNavBg : "transparent",
                  color: activeSection === "all" ? activeNavText : textSecondary,
                  fontSize: 13.5,
                  fontWeight: activeSection === "all" ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileText size={16} strokeWidth={1.75} />
                  <span>Tất cả bảng</span>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 7px",
                    borderRadius: 999,
                    backgroundColor: isDarkTheme ? "#1e242c" : "#e2e8f0",
                    color: textSecondary,
                    fontWeight: 600,
                  }}
                >
                  {boards.filter((b) => !b.trashed).length}
                </span>
              </button>

              {/* Trash */}
              <button
                type="button"
                onClick={() => {
                  setActiveSection("trash");
                  setSelectedFolderId(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: activeSection === "trash" ? activeNavBg : "transparent",
                  color: activeSection === "trash" ? activeNavText : textSecondary,
                  fontSize: 13.5,
                  fontWeight: activeSection === "trash" ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Trash2 size={16} strokeWidth={1.75} />
                  <span>Thùng rác</span>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 7px",
                    borderRadius: 999,
                    backgroundColor: isDarkTheme ? "#1e242c" : "#e2e8f0",
                    color: textSecondary,
                    fontWeight: 600,
                  }}
                >
                  {boards.filter((b) => b.trashed).length}
                </span>
              </button>

              <div style={{ height: 1, backgroundColor: borderCol, margin: "10px 4px" }} />

              {/* Folders Section Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 8px 6px 8px",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Thư mục ({folders.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewFolderInput(true)}
                  title="Thêm thư mục mới"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#38bdf8",
                    cursor: "pointer",
                    padding: 3,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <FolderPlus size={15} strokeWidth={1.75} />
                </button>
              </div>

              {/* Add folder input */}
              {showNewFolderInput && (
                <div style={{ padding: "4px 8px", display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Tên thư mục..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") setShowNewFolderInput(false);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: isDarkTheme ? "#0d0f12" : "#ffffff",
                      border: "1px solid #38bdf8",
                      borderRadius: 6,
                      padding: "4px 8px",
                      color: textPrimary,
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    style={{
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Lưu
                  </button>
                </div>
              )}

              {/* Folder List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
                {folders.map((folder) => {
                  const isSelected = activeSection === "folder" && selectedFolderId === folder.id;
                  const count = boards.filter((b) => !b.trashed && b.folderId === folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => {
                        setActiveSection("folder");
                        setSelectedFolderId(folder.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 8,
                        backgroundColor: isSelected ? activeNavBg : "transparent",
                        color: isSelected ? activeNavText : textSecondary,
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                        <Folder size={15} strokeWidth={1.75} color={isSelected ? "#38bdf8" : "#f59e0b"} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {folder.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "1px 6px",
                            borderRadius: 999,
                            backgroundColor: isDarkTheme ? "#1e242c" : "#e2e8f0",
                            color: textSecondary,
                          }}
                        >
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          title="Xóa thư mục"
                          style={{
                            background: "none",
                            border: "none",
                            color: textSecondary,
                            cursor: "pointer",
                            padding: 2,
                            display: "flex",
                          }}
                        >
                          <X size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar bottom: Settings link */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "transparent",
                  color: textSecondary,
                  fontSize: 13,
                  cursor: "pointer",
                  borderTop: `1px solid ${borderCol}`,
                  marginTop: "auto",
                  transition: "all 0.15s ease",
                }}
              >
                <Settings size={16} strokeWidth={1.75} />
                <span>Cài đặt hệ thống</span>
              </button>
            )}
          </aside>
        )}

        {/* Right Content Area: Board list */}
        <main
          style={{
            flex: 1,
            backgroundColor: bgMain,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding: "24px 32px",
          }}
        >
          {/* Main Title & Search Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>
                {activeSection === "all"
                  ? "Tất cả bảng vẽ"
                  : activeSection === "trash"
                  ? "Thùng rác"
                  : folders.find((f) => f.id === selectedFolderId)?.name || "Thư mục"}
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: textSecondary }}>
                {activeSection === "trash"
                  ? "Các bảng vẽ đã xóa. Bạn có thể khôi phục hoặc xóa hẳn."
                  : `Tổng cộng ${filteredBoards.length} bảng ghi chú & bài giảng.`}
              </p>
            </div>

            {/* Search bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: bgSidebar,
                border: `1px solid ${borderCol}`,
                borderRadius: 10,
                padding: "8px 14px",
                width: 260,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Search size={15} strokeWidth={1.75} color={textSecondary} />
              <input
                type="text"
                placeholder="Tìm kiếm bảng vẽ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: textPrimary,
                  fontSize: 13,
                  width: "100%",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: textSecondary,
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Boards Grid View */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 18,
              alignContent: "start",
              padding: "6px 4px 20px 4px",
            }}
          >
            {/* Create new card shortcut */}
            {activeSection !== "trash" && (
              <div
                onClick={handleCreateNewBoard}
                style={{
                  height: 150,
                  backgroundColor: isDarkTheme ? "#13171d" : "#ffffff",
                  border: `1.5px dashed ${isDarkTheme ? "#334155" : "#cbd5e1"}`,
                  borderRadius: 14,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#38bdf8";
                  e.currentTarget.style.backgroundColor = isDarkTheme ? "#1a222d" : "#f0f9ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDarkTheme ? "#334155" : "#cbd5e1";
                  e.currentTarget.style.backgroundColor = isDarkTheme ? "#13171d" : "#ffffff";
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    backgroundColor: isDarkTheme ? "#1e293b" : "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0284c7",
                  }}
                >
                  <Plus size={22} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
                  Tạo bảng mới
                </span>
              </div>
            )}

            {filteredBoards.map((board) => {
              const isCurrent = board.id === currentRoomId;
              const isRenaming = renamingId === board.id;
              const dateStr = new Date(board.updatedAt || board.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              return (
                <div
                  key={board.id}
                  onClick={() => {
                    if (activeSection === "trash") return;
                    onSelectBoard(board.id);
                    onClose();
                  }}
                  style={{
                    height: 150,
                    backgroundColor: bgCard,
                    border: isCurrent
                      ? "2px solid #2563eb"
                      : `1px solid ${borderCardCol}`,
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: activeSection === "trash" ? "default" : "pointer",
                    position: "relative",
                    boxShadow: isDarkTheme ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== "trash") {
                      e.currentTarget.style.backgroundColor = bgCardHover;
                      e.currentTarget.style.borderColor = isCurrent ? "#3b82f6" : "#64748b";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = isDarkTheme
                        ? "0 8px 20px rgba(0,0,0,0.35)"
                        : "0 8px 20px rgba(0,0,0,0.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== "trash") {
                      e.currentTarget.style.backgroundColor = bgCard;
                      e.currentTarget.style.borderColor = isCurrent ? "#2563eb" : borderCardCol;
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = isDarkTheme
                        ? "0 2px 8px rgba(0,0,0,0.2)"
                        : "0 2px 8px rgba(0,0,0,0.04)";
                    }
                  }}
                >
                  {/* Top card indicator */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={16} strokeWidth={1.75} color={isCurrent ? "#3b82f6" : textSecondary} />
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: "2px 7px",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            borderRadius: 6,
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                          }}
                        >
                          Đang mở
                        </span>
                      )}
                    </div>

                    {/* Action buttons on card */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      {activeSection !== "trash" ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(board, e)}
                            title="Đổi tên bảng"
                            style={{
                              background: "none",
                              border: "none",
                              color: textSecondary,
                              cursor: "pointer",
                              padding: 4,
                              borderRadius: 6,
                              display: "flex",
                            }}
                          >
                            <Edit2 size={13} strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleTrashBoard(board.id, e)}
                            title="Chuyển vào thùng rác"
                            style={{
                              background: "none",
                              border: "none",
                              color: textSecondary,
                              cursor: "pointer",
                              padding: 4,
                              borderRadius: 6,
                              display: "flex",
                            }}
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleRestoreBoard(board.id, e)}
                            title="Khôi phục lại bảng"
                            style={{
                              background: isDarkTheme ? "#1e293b" : "#f1f5f9",
                              border: `1px solid ${borderCol}`,
                              color: "#0284c7",
                              cursor: "pointer",
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <RotateCcw size={12} strokeWidth={2} />
                            <span>Khôi phục</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handlePermanentDelete(board.id, e)}
                            title="Xóa vĩnh viễn"
                            style={{
                              background: isDarkTheme ? "#450a0a" : "#fee2e2",
                              border: "1px solid #ef4444",
                              color: "#dc2626",
                              cursor: "pointer",
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Trash2 size={12} strokeWidth={2} />
                            <span>Xóa hẳn</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Board Title */}
                  <div style={{ marginTop: 8 }}>
                    {isRenaming ? (
                      <input
                        type="text"
                        value={renameValue}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleSaveRename(board.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(board.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        style={{
                          width: "100%",
                          backgroundColor: isDarkTheme ? "#0d0f12" : "#ffffff",
                          border: "1.5px solid #2563eb",
                          borderRadius: 6,
                          color: textPrimary,
                          fontSize: 14,
                          fontWeight: 600,
                          padding: "4px 8px",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 14.5,
                          fontWeight: 600,
                          color: textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={board.name}
                      >
                        {board.name}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 11.5,
                        color: textSecondary,
                        marginTop: 4,
                        fontFamily: "monospace",
                        opacity: 0.8,
                      }}
                    >
                      ID: {board.id}
                    </div>
                  </div>

                  {/* Card Footer: Folder badge & Date */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11.5,
                      color: textSecondary,
                      borderTop: `1px solid ${borderCol}`,
                      paddingTop: 8,
                      marginTop: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {board.folderId ? (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            backgroundColor: isDarkTheme ? "#1e293b" : "#f1f5f9",
                            fontSize: 10.5,
                            color: textSecondary,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Folder size={11} strokeWidth={2} />
                          {folders.find((f) => f.id === board.folderId)?.name || "Thư mục"}
                        </span>
                      ) : (
                        <span>Mặc định</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} strokeWidth={1.75} />
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};
