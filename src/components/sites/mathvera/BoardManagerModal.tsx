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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBoards(loadBoards());
      setFolders(loadFolders());
      setSearchQuery("");
      setShowNewFolderInput(false);
      setRenamingId(null);
    }
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
      // unassign folder from boards
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
      const next = boards.filter((b) => b.id !== id);
      setBoards(next);
      saveBoards(next);
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

      // If onInsertPdfIntoCurrentBoard is provided, insert directly into current board
      if (onInsertPdfIntoCurrentBoard) {
        onInsertPdfIntoCurrentBoard(res.pages);
        onClose();
        return;
      }

      // Fallback: create a new board with PDF pages
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

      // Store initial PDF pages in IndexedDB & sessionStorage for Whiteboard to import upon load
      await storePendingPdfPages(newId, res.pages);

      onSelectBoard(newId);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Không thể đọc file PDF này: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (!open) return null;

  return (
    <div
      data-testid="board-manager-modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#0d0f12",
        color: "#f1f5f9",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid #1e242c",
          backgroundColor: "#0d0f12",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Đóng / mở menu bên trái"
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: 18,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ☰
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: "#e2e8f0" }}>
            PhysBoard
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Create Note Button */}
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
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            <span>📝</span>
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
              background: "transparent",
              border: "1px solid #334155",
              color: "#cbd5e1",
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <span>📄</span>
            <span>Chèn PDF</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
            onChange={handleImportPdf}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Quay lại bảng vẽ (Esc)"
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              marginLeft: 4,
            }}
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar & Content Area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Navigation Sidebar */}
        {!isSidebarCollapsed && (
          <aside
            style={{
              width: 220,
              backgroundColor: "#13171d",
              borderRight: "1px solid #1e242c",
              display: "flex",
              flexDirection: "column",
              padding: "16px 8px",
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
                  gap: 10,
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: activeSection === "all" ? "#222a36" : "transparent",
                  color: activeSection === "all" ? "#ffffff" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: activeSection === "all" ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>📋</span>
                <span>Tất cả bảng ({boards.filter((b) => !b.trashed).length})</span>
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
                  gap: 10,
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: activeSection === "trash" ? "#222a36" : "transparent",
                  color: activeSection === "trash" ? "#ffffff" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: activeSection === "trash" ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>🗑️</span>
                <span>Thùng rác ({boards.filter((b) => b.trashed).length})</span>
              </button>

              <div style={{ height: 1, backgroundColor: "#1e242c", margin: "10px 4px" }} />

              {/* Folders Section Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 8px 6px 8px",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
                    fontSize: 15,
                    cursor: "pointer",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>

              {/* Add folder input */}
              {showNewFolderInput && (
                <div style={{ padding: "4px 8px", display: "flex", gap: 4 }}>
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
                      height: 26,
                      background: "#1e242c",
                      border: "1px solid #3b82f6",
                      borderRadius: 4,
                      color: "#ffffff",
                      fontSize: 12,
                      padding: "0 6px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    style={{
                      background: "#2563eb",
                      border: "none",
                      borderRadius: 4,
                      color: "#ffffff",
                      fontSize: 11,
                      padding: "0 6px",
                      cursor: "pointer",
                    }}
                  >
                    ✓
                  </button>
                </div>
              )}

              {/* Folders list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
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
                        padding: "7px 10px",
                        borderRadius: 6,
                        backgroundColor: isSelected ? "#222a36" : "transparent",
                        color: isSelected ? "#ffffff" : "#94a3b8",
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                        <span>📁</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {folder.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{count}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          title="Xóa thư mục"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            padding: 0,
                            fontSize: 11,
                          }}
                        >
                          ✕
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
                  onClose();
                  onOpenSettings();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#94a3b8",
                  fontSize: 12.5,
                  cursor: "pointer",
                  borderTop: "1px solid #1e242c",
                  marginTop: "auto",
                }}
              >
                <span>⚙️</span>
                <span>Cài đặt hệ thống</span>
              </button>
            )}
          </aside>
        )}

        {/* Right Content Area: Board list */}
        <main
          style={{
            flex: 1,
            backgroundColor: "#0d0f12",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding: "20px 28px",
          }}
        >
          {/* Main Title & Search Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f8fafc" }}>
                {activeSection === "all"
                  ? "Tất cả bảng vẽ"
                  : activeSection === "trash"
                  ? "Thùng rác"
                  : folders.find((f) => f.id === selectedFolderId)?.name || "Thư mục"}
              </h2>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {filteredBoards.length} bảng
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", minWidth: 220 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bảng..."
                style={{
                  width: "100%",
                  height: 34,
                  backgroundColor: "#161b22",
                  border: "1px solid #28303d",
                  borderRadius: 6,
                  padding: "0 10px 0 30px",
                  color: "#e2e8f0",
                  fontSize: 12.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ position: "absolute", left: 9, top: 8, fontSize: 13, color: "#64748b" }}>🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  ✕
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
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
              alignContent: "start",
            }}
          >
            {/* Create new card shortcut */}
            {activeSection !== "trash" && (
              <div
                onClick={handleCreateNewBoard}
                style={{
                  height: 140,
                  backgroundColor: "#13171d",
                  border: "1px dashed #334155",
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#38bdf8";
                  e.currentTarget.style.backgroundColor = "#1a202c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#334155";
                  e.currentTarget.style.backgroundColor = "#13171d";
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    backgroundColor: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: "#38bdf8",
                  }}
                >
                  +
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#94a3b8" }}>
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
                    height: 140,
                    backgroundColor: "#161b22",
                    border: isCurrent ? "1.5px solid #2563eb" : "1px solid #262e3b",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: activeSection === "trash" ? "default" : "pointer",
                    position: "relative",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== "trash") {
                      e.currentTarget.style.backgroundColor = "#1c232d";
                      e.currentTarget.style.borderColor = isCurrent ? "#3b82f6" : "#475569";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== "trash") {
                      e.currentTarget.style.backgroundColor = "#161b22";
                      e.currentTarget.style.borderColor = isCurrent ? "#2563eb" : "#262e3b";
                    }
                  }}
                >
                  {/* Top card indicator */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 16 }}>📋</span>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            backgroundColor: "#1d4ed8",
                            color: "#ffffff",
                            borderRadius: 4,
                            fontWeight: 700,
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
                              color: "#64748b",
                              cursor: "pointer",
                              padding: 2,
                              fontSize: 12,
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleTrashBoard(board.id, e)}
                            title="Chuyển vào thùng rác"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#64748b",
                              cursor: "pointer",
                              padding: 2,
                              fontSize: 12,
                            }}
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleRestoreBoard(board.id, e)}
                            title="Khôi phục lại bảng"
                            style={{
                              background: "#1e293b",
                              border: "1px solid #334155",
                              color: "#38bdf8",
                              cursor: "pointer",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 11,
                            }}
                          >
                            Khôi phục
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handlePermanentDelete(board.id, e)}
                            title="Xóa vĩnh viễn"
                            style={{
                              background: "#450a0a",
                              border: "1px solid #991b1b",
                              color: "#f87171",
                              cursor: "pointer",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 11,
                            }}
                          >
                            Xóa hẳn
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
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        onBlur={() => handleSaveRename(board.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(board.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        style={{
                          width: "100%",
                          background: "#0d0f12",
                          border: "1px solid #3b82f6",
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 4,
                          padding: "2px 6px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "#f1f5f9",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {board.name}
                      </div>
                    )}
                  </div>

                  {/* Bottom details: date */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                    <span>{dateStr}</span>
                    <span style={{ fontSize: 10 }}>{board.id.slice(0, 8)}</span>
                  </div>
                </div>
              );
            })}

            {filteredBoards.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "48px 0",
                  color: "#64748b",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>Không có bảng nào</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {activeSection === "trash"
                    ? "Thùng rác trống"
                    : "Bấm 'Tạo bảng mới' hoặc 'Chèn PDF' ở trên để bắt đầu"}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
