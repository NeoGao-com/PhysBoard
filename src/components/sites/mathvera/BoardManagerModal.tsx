"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  FileText,
  FileUp,
  Folder,
  FolderInput,
  FolderPlus,
  Home,
  LayoutGrid,
  List,
  Lock,
  Menu,
  Moon,
  MoreVertical,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Star,
  Sun,
  Trash2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import {
  DEFAULT_BOARD_ID,
  loadBoards,
  loadFolders,
  saveBoards,
  saveFolders,
  storePendingPdfPages,
  type BoardCoverConfig,
  type BoardFolder,
  type BoardItem,
} from "@/lib/board-manager";
import {
  ensureTutorialNotebooksSeeded,
  restoreTutorialNotebooks,
} from "@/lib/tutorial-notebooks";
import { exportAllNotebooksBackup, importNotebooksBackup } from "@/lib/board-backup";
import { downloadBlob } from "@/lib/export";
import { importPdfPages, type ImportedPdfPage } from "@/lib/pdf-import";
import { generateRoomId } from "@/lib/room";
import {
  BoardCoverPreview,
  EditCoverDialog,
  FOLDER_COLORS,
} from "./BoardCoverArt";

export interface BoardManagerModalProps {
  open: boolean;
  onClose: () => void;
  currentRoomId: string;
  onSelectBoard: (boardId: string) => void;
  onInsertPdfIntoCurrentBoard?: (pages: ImportedPdfPage[]) => void;
  onOpenSettings?: () => void;
}

type NavSection = "all" | "trash" | "folder";
type ViewMode = "grid" | "list";
type SortMode = "updated" | "name";

const HOME_THEME_KEY = "physboard_home_theme";

function formatShortViDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  ) {
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return `${d.getDate()} Th${d.getMonth() + 1}, ${d.getFullYear()}`;
}

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
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Default Light Theme per user request
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(HOME_THEME_KEY) === "dark";
    } catch {
      return false;
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [pinFavoritesFirst, setPinFavoritesFirst] = useState(true);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);

  const [coverEditTargetId, setCoverEditTargetId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderColor, setNewFolderColor] = useState<string>(FOLDER_COLORS[5]);

  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      setBoards(loadBoards());
      setFolders(loadFolders());
      setSearchQuery("");
      setSearchOpen(false);
      setMoreMenuOpen(false);
      setSelectMode(false);
      setSelectedIds([]);
      setRenamingId(null);
      setMoveDialogOpen(false);
      setFolderManagerOpen(false);
      setNewFolderOpen(false);
    });
    void ensureTutorialNotebooksSeeded().then((didSeed) => {
      if (didSeed) {
        setBoards(loadBoards());
        setFolders(loadFolders());
      }
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (coverEditTargetId) setCoverEditTargetId(null);
        else if (moveDialogOpen) setMoveDialogOpen(false);
        else if (newFolderOpen) setNewFolderOpen(false);
        else if (folderManagerOpen) setFolderManagerOpen(false);
        else if (moreMenuOpen) setMoreMenuOpen(false);
        else if (selectMode) {
          setSelectMode(false);
          setSelectedIds([]);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    open,
    coverEditTargetId,
    moveDialogOpen,
    newFolderOpen,
    folderManagerOpen,
    moreMenuOpen,
    selectMode,
    onClose,
  ]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!moreMenuRef.current?.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [moreMenuOpen]);

  const toggleTheme = () => {
    setIsDarkTheme((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(HOME_THEME_KEY, next ? "dark" : "light");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const activeBoardsCount = useMemo(
    () => boards.filter((b) => !b.trashed).length,
    [boards]
  );
  const trashedBoardsCount = useMemo(
    () => boards.filter((b) => b.trashed).length,
    [boards]
  );

  // Count boards inside a folder + all nested descendants
  const getFolderTotalCount = (folderId: string): number => {
    const childIds = folders.filter((f) => f.parentId === folderId).map((f) => f.id);
    const direct = boards.filter((b) => !b.trashed && b.folderId === folderId).length;
    return direct + childIds.reduce((sum, cid) => sum + getFolderTotalCount(cid), 0);
  };

  // Breadcrumb path for current folder
  const folderBreadcrumbs = useMemo(() => {
    if (activeSection !== "folder" || !selectedFolderId) return [];
    const chain: BoardFolder[] = [];
    let cur: string | null | undefined = selectedFolderId;
    let guard = 0;
    while (cur && guard++ < 15) {
      const found = folders.find((f) => f.id === cur);
      if (!found) break;
      chain.unshift(found);
      cur = found.parentId;
    }
    return chain;
  }, [activeSection, selectedFolderId, folders]);

  // Direct child folders in the main grid when browsing folders
  const visibleSubfolders = useMemo(() => {
    if (activeSection !== "folder") return [];
    const parentTarget = selectedFolderId || null;
    return folders.filter((f) => (f.parentId || null) === parentTarget);
  }, [activeSection, selectedFolderId, folders]);

  const filteredBoards = useMemo(() => {
    let list = boards;
    if (activeSection === "trash") {
      list = list.filter((b) => b.trashed);
    } else {
      list = list.filter((b) => !b.trashed);
      if (activeSection === "folder") {
        if (selectedFolderId) {
          list = list.filter((b) => b.folderId === selectedFolderId);
        } else {
          list = list.filter((b) => !b.folderId);
        }
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      if (pinFavoritesFirst && Boolean(a.favorite) !== Boolean(b.favorite)) {
        return a.favorite ? -1 : 1;
      }
      if (sortMode === "name") {
        return a.name.localeCompare(b.name, "vi");
      }
      return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
    });
  }, [boards, activeSection, selectedFolderId, searchQuery, pinFavoritesFirst, sortMode]);

  const updateBoards = (next: BoardItem[]) => {
    setBoards(next);
    saveBoards(next);
  };

  const updateFolders = (next: BoardFolder[]) => {
    setFolders(next);
    saveFolders(next);
  };

  const handleCreateNewBoard = () => {
    const newId = generateRoomId("board");
    const newBoard: BoardItem = {
      id: newId,
      name: `Bảng ${activeBoardsCount + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderId: activeSection === "folder" ? selectedFolderId : null,
    };
    updateBoards([newBoard, ...boards]);
    onSelectBoard(newId);
    onClose();
  };

  const handleCreateFolderSubmit = () => {
    const name = newFolderName.trim();
    if (!name) return;
    const f: BoardFolder = {
      id: `folder_${Date.now().toString(36)}`,
      name,
      createdAt: Date.now(),
      parentId: newFolderParentId,
      color: newFolderColor,
    };
    const next = [...folders, f];
    updateFolders(next);
    if (newFolderParentId) {
      setExpandedFolders((prev) => ({ ...prev, [newFolderParentId]: true }));
    }
    setNewFolderName("");
    setNewFolderOpen(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    // Re-parent child folders and boards safely to root
    const nextFolders = folders
      .filter((f) => f.id !== folderId)
      .map((f) => (f.parentId === folderId ? { ...f, parentId: null } : f));
    const nextBoards = boards.map((b) =>
      b.folderId === folderId ? { ...b, folderId: null } : b
    );
    updateFolders(nextFolders);
    updateBoards(nextBoards);
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
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
      updateBoards([newBoard, ...boards]);
      await storePendingPdfPages(newId, res.pages);
      onSelectBoard(newId);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Không thể đọc file PDF này: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleExportBackup = async () => {
    setBackupBusy(true);
    setBackupMsg(null);
    try {
      const res = await exportAllNotebooksBackup();
      downloadBlob(res.blob, res.fileName);
      setBackupMsg(`✓ Đã sao lưu ${res.boardCount} bảng`);
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
      setBackupMsg(`✓ Đã khôi phục ${res.importedBoards} bảng & ${res.importedFolders} thư mục`);
    } catch (err) {
      setBackupMsg(err instanceof Error ? `⚠ ${err.message}` : "⚠ Khôi phục thất bại");
    } finally {
      setBackupBusy(false);
    }
  };

  // Multi-select batch actions
  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (activeSection === "trash") {
      const filtered = boards.filter(
        (b) => !selectedIds.includes(b.id) || b.id === DEFAULT_BOARD_ID
      );
      updateBoards(filtered);
    } else {
      updateBoards(
        boards.map((b) =>
          selectedIds.includes(b.id) && !b.locked
            ? { ...b, trashed: true, updatedAt: Date.now() }
            : b
        )
      );
    }
    setSelectedIds([]);
    setSelectMode(false);
  };

  const handleBatchRestore = () => {
    updateBoards(
      boards.map((b) =>
        selectedIds.includes(b.id) ? { ...b, trashed: false, updatedAt: Date.now() } : b
      )
    );
    setSelectedIds([]);
    setSelectMode(false);
  };

  const handleBatchToggleLock = () => {
    const allLocked = selectedIds.every((id) => boards.find((b) => b.id === id)?.locked);
    updateBoards(
      boards.map((b) =>
        selectedIds.includes(b.id) ? { ...b, locked: !allLocked } : b
      )
    );
  };

  const handleBatchToggleFavorite = () => {
    const allFav = selectedIds.every((id) => boards.find((b) => b.id === id)?.favorite);
    updateBoards(
      boards.map((b) =>
        selectedIds.includes(b.id) ? { ...b, favorite: !allFav } : b
      )
    );
  };

  const handleBatchDuplicate = () => {
    const clones: BoardItem[] = [];
    for (const id of selectedIds) {
      const orig = boards.find((b) => b.id === id);
      if (!orig) continue;
      clones.push({
        ...orig,
        id: generateRoomId("board"),
        name: `${orig.name} (Bản sao)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        locked: false,
      });
    }
    updateBoards([...clones, ...boards]);
    setSelectedIds([]);
    setSelectMode(false);
  };

  const handleBatchMoveToFolder = (targetFolderId: string | null) => {
    updateBoards(
      boards.map((b) =>
        selectedIds.includes(b.id)
          ? { ...b, folderId: targetFolderId, trashed: false, updatedAt: Date.now() }
          : b
      )
    );
    setMoveDialogOpen(false);
    setSelectedIds([]);
    setSelectMode(false);
  };

  if (!open) return null;

  // Light Theme (Default) & Dark Theme tokens inspired by Samsung Notes One UI
  const bgApp = isDarkTheme ? "#0d0f12" : "#ffffff";
  const bgSidebar = isDarkTheme ? "#1a1e24" : "#f1f5f9";
  const bgPill = isDarkTheme ? "#1f242c" : "#f1f5f9";
  const bgCard = isDarkTheme ? "#181c23" : "#ffffff";
  const borderCol = isDarkTheme ? "#2b323d" : "#e2e8f0";
  const textPrimary = isDarkTheme ? "#f1f5f9" : "#0f172a";
  const textSecondary = isDarkTheme ? "#94a3b8" : "#64748b";
  const activeNavBg = isDarkTheme ? "#2c3442" : "#ffffff";
  const activeNavColor = isDarkTheme ? "#38bdf8" : "#2563eb";
  const accentBlue = "#2563eb";

  const renderFolderTree = (parentId: string | null = null, depth = 0): React.ReactNode => {
    const children = folders.filter((f) => (f.parentId || null) === parentId);
    if (children.length === 0) return null;

    return children.map((f) => {
      const hasSub = folders.some((sub) => sub.parentId === f.id);
      const isExpanded = Boolean(expandedFolders[f.id]);
      const isSelected = activeSection === "folder" && selectedFolderId === f.id;
      const count = getFolderTotalCount(f.id);
      const fColor = f.color || "#64748b";

      return (
        <div key={f.id}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              paddingLeft: 8 + depth * 14,
              paddingRight: 10,
              height: 36,
              borderRadius: 10,
              background: isSelected ? activeNavBg : "transparent",
              color: isSelected ? textPrimary : textSecondary,
              fontWeight: isSelected ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: isSelected ? "0 1px 3px rgba(15,23,42,0.06)" : "none",
            }}
            onClick={() => {
              setActiveSection("folder");
              setSelectedFolderId(f.id);
              if (hasSub) {
                setExpandedFolders((prev) => ({ ...prev, [f.id]: true }));
              }
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedFolders((prev) => ({ ...prev, [f.id]: !isExpanded }));
              }}
              style={{
                width: 18,
                height: 18,
                border: "none",
                background: "transparent",
                color: textSecondary,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                visibility: hasSub ? "visible" : "hidden",
                cursor: "pointer",
              }}
            >
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <Folder size={15} color={fColor} fill={isSelected ? fColor : "none"} />
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {f.name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNewFolderParentId(f.id);
                setNewFolderOpen(true);
              }}
              title={`Tạo thư mục con trong "${f.name}"`}
              aria-label={`Tạo thư mục con trong ${f.name}`}
              style={{
                width: 20,
                height: 20,
                border: "none",
                borderRadius: 6,
                background: "transparent",
                color: textSecondary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <FolderPlus size={12} />
            </button>
            <span style={{ fontSize: 11.5, color: textSecondary }}>{count}</span>
          </div>
          {hasSub && isExpanded && renderFolderTree(f.id, depth + 1)}
        </div>
      );
    });
  };

  const coverEditTarget = coverEditTargetId
    ? boards.find((b) => b.id === coverEditTargetId) || null
    : null;

  return (
    <div
      data-testid="board-manager-modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: bgApp,
        color: textPrimary,
        zIndex: 9999,
        display: "flex",
        padding: 8,
        gap: 8,
        fontFamily:
          'var(--font-sans, "Be Vietnam Pro", "Inter", -apple-system, BlinkMacSystemFont, Roboto, sans-serif)',
      }}
    >
      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={handleImportPdf}
      />
      <input
        ref={backupInputRef}
        type="file"
        accept=".physbackup.json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleImportBackup(f);
        }}
      />

      {/* Left Samsung Notes Style Rounded Sidebar */}
      <aside
        style={{
          width: isSidebarCollapsed ? 56 : 232,
          flexShrink: 0,
          backgroundColor: bgSidebar,
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          padding: isSidebarCollapsed ? "10px 6px" : "10px 10px",
          gap: 6,
          transition: "width 0.18s ease",
          overflow: "hidden",
        }}
      >
        {/* Top Row: Menu + Settings + Theme */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "space-between",
            padding: "2px 4px 8px",
          }}
        >
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Thu gọn / Mở rộng danh mục"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: textPrimary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Menu size={19} />
          </button>

          {!isSidebarCollapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                onClick={toggleTheme}
                title={isDarkTheme ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  color: textSecondary,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="Cài đặt hệ thống"
                  aria-label="Cài đặt hệ thống"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "none",
                    background: "transparent",
                    color: textSecondary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Settings size={17} />
                  <span className="sr-only">Cài đặt hệ thống</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Nav: Tất cả bảng */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("all");
            setSelectedFolderId(null);
            setFolderManagerOpen(false);
          }}
          title="Tất cả bảng"
          style={{
            height: 38,
            padding: isSidebarCollapsed ? "0" : "0 10px",
            borderRadius: 10,
            border: "none",
            background: activeSection === "all" && !folderManagerOpen ? activeNavBg : "transparent",
            color: activeSection === "all" && !folderManagerOpen ? activeNavColor : textPrimary,
            fontWeight: activeSection === "all" ? 700 : 500,
            fontSize: 13.5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "space-between",
            boxShadow:
              activeSection === "all" && !folderManagerOpen
                ? "0 1px 3px rgba(15,23,42,0.06)"
                : "none",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <FileText size={16} />
            {!isSidebarCollapsed && <span>Tất cả bảng</span>}
          </span>
          {!isSidebarCollapsed && (
            <span style={{ fontSize: 12, color: textSecondary }}>{activeBoardsCount}</span>
          )}
        </button>

        {/* Nav: Thùng rác */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("trash");
            setSelectedFolderId(null);
            setFolderManagerOpen(false);
          }}
          title="Thùng rác"
          style={{
            height: 38,
            padding: isSidebarCollapsed ? "0" : "0 10px",
            borderRadius: 10,
            border: "none",
            background: activeSection === "trash" && !folderManagerOpen ? activeNavBg : "transparent",
            color: activeSection === "trash" && !folderManagerOpen ? "#dc2626" : textPrimary,
            fontWeight: activeSection === "trash" ? 700 : 500,
            fontSize: 13.5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "space-between",
            boxShadow:
              activeSection === "trash" && !folderManagerOpen
                ? "0 1px 3px rgba(15,23,42,0.06)"
                : "none",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Trash2 size={16} />
            {!isSidebarCollapsed && <span>Thùng rác</span>}
          </span>
          {!isSidebarCollapsed && trashedBoardsCount > 0 && (
            <span style={{ fontSize: 12, color: textSecondary }}>{trashedBoardsCount}</span>
          )}
        </button>

        <div style={{ height: 1, background: borderCol, margin: "4px 6px" }} />

        {/* Nav: Thư mục root */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("folder");
            setSelectedFolderId(null);
            setFolderManagerOpen(false);
          }}
          title="Thư mục"
          style={{
            height: 38,
            padding: isSidebarCollapsed ? "0" : "0 10px",
            borderRadius: 10,
            border: "none",
            background:
              activeSection === "folder" && !selectedFolderId && !folderManagerOpen
                ? activeNavBg
                : "transparent",
            color:
              activeSection === "folder" && !selectedFolderId && !folderManagerOpen
                ? activeNavColor
                : textPrimary,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "space-between",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Folder size={16} />
            {!isSidebarCollapsed && <span>Thư mục</span>}
          </span>
          {!isSidebarCollapsed && (
            <span style={{ fontSize: 12, color: textSecondary }}>{folders.length}</span>
          )}
        </button>

        {/* Hierarchical Folder Tree */}
        {!isSidebarCollapsed && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {renderFolderTree(null, 0)}
          </div>
        )}

        {/* Bottom Pill Button: Quản lý thư mục */}
        {!isSidebarCollapsed && (
          <div style={{ paddingTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              type="button"
              onClick={() => setFolderManagerOpen(true)}
              style={{
                width: "100%",
                height: 36,
                borderRadius: 999,
                border: `1px solid ${borderCol}`,
                background: isDarkTheme ? "#2c3442" : "#ffffff",
                color: textPrimary,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Quản lý thư mục
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {folderManagerOpen ? (
          /* Folder Manager Full Sub-view (Image 2 style) */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "6px 12px" }}>
            <div
              style={{
                height: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setFolderManagerOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: textPrimary,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>‹</span>
                <span>Quản lý thư mục</span>
              </button>
              <button
                type="button"
                onClick={() => setFolderManagerOpen(false)}
                style={{
                  border: "none",
                  background: bgPill,
                  color: textPrimary,
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Xong
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                background: bgSidebar,
                borderRadius: 16,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {folders.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: textSecondary, fontSize: 13 }}>
                  Chưa có thư mục nào. Bấm &quot;+ Tạo thư mục&quot; bên dưới để tạo mới.
                </div>
              ) : (
                (() => {
                  const ordered: Array<{ folder: BoardFolder; depth: number }> = [];
                  const walk = (pid: string | null, depth: number) => {
                    for (const item of folders) {
                      if ((item.parentId || null) === pid) {
                        ordered.push({ folder: item, depth });
                        walk(item.id, depth + 1);
                      }
                    }
                  };
                  walk(null, 0);
                  return ordered.map(({ folder: f, depth }) => {
                    const fColor = f.color || "#64748b";
                    const count = getFolderTotalCount(f.id);
                    return (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          marginLeft: depth * 20,
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: bgCard,
                          border: `1px solid ${borderCol}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <Folder size={17} color={fColor} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: textPrimary }}>
                              {f.name}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, color: textSecondary, marginRight: 4 }}>
                            {count} bảng
                          </span>
                          {FOLDER_COLORS.slice(0, 5).map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() =>
                                updateFolders(
                                  folders.map((item) =>
                                    item.id === f.id ? { ...item, color: col } : item
                                  )
                                )
                              }
                              title="Đổi màu thư mục"
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 999,
                                background: col,
                                border: fColor === col ? "2px solid #0f172a" : "1px solid transparent",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setNewFolderParentId(f.id);
                              setNewFolderOpen(true);
                            }}
                            title={`Tạo thư mục con trong "${f.name}"`}
                            style={{
                              border: "none",
                              background: "#eff6ff",
                              color: "#2563eb",
                              borderRadius: 8,
                              padding: "5px 8px",
                              fontSize: 11.5,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              cursor: "pointer",
                            }}
                          >
                            <FolderPlus size={13} />
                            <span>+ Con</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextName = window.prompt("Đổi tên thư mục:", f.name);
                              if (nextName && nextName.trim()) {
                                updateFolders(
                                  folders.map((item) =>
                                    item.id === f.id ? { ...item, name: nextName.trim() } : item
                                  )
                                );
                              }
                            }}
                            title="Đổi tên thư mục"
                            style={{
                              border: "none",
                              background: bgPill,
                              color: textPrimary,
                              borderRadius: 8,
                              padding: "5px 8px",
                              cursor: "pointer",
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Xoá thư mục "${f.name}"? (Các bảng bên trong vẫn được giữ lại)`)) {
                                handleDeleteFolder(f.id);
                              }
                            }}
                            title="Xoá thư mục"
                            style={{
                              border: "none",
                              background: "#fee2e2",
                              color: "#dc2626",
                              borderRadius: 8,
                              padding: "5px 8px",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}

              <button
                type="button"
                onClick={() => {
                  setNewFolderParentId(null);
                  setNewFolderOpen(true);
                }}
                style={{
                  marginTop: 6,
                  height: 40,
                  borderRadius: 12,
                  border: `1px dashed ${borderCol}`,
                  background: "transparent",
                  color: "#16a34a",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus size={16} />
                <span>Tạo thư mục</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Main Header Bar (Breadcrumb Pill + Quick Actions + 3-Dots Menu) */}
            <header
              style={{
                minHeight: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "4px 6px",
                flexWrap: "wrap",
              }}
            >
              {selectMode ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: bgPill,
                    borderRadius: 999,
                    padding: "6px 14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIds.length === filteredBoards.length) setSelectedIds([]);
                      else setSelectedIds(filteredBoards.map((b) => b.id));
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: textPrimary,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {selectedIds.length === filteredBoards.length && filteredBoards.length > 0
                      ? "☑ Bỏ chọn tất cả"
                      : "○ Tất cả"}
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>
                    Đã chọn {selectedIds.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectMode(false);
                      setSelectedIds([]);
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: accentBlue,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Thoát
                  </button>
                </div>
              ) : (
                <>
                  {/* Breadcrumb Pill */}
                  <div
                    style={{
                      flex: "1 1 200px",
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: bgPill,
                      borderRadius: 999,
                      padding: "6px 14px",
                      overflowX: "auto",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("all");
                        setSelectedFolderId(null);
                      }}
                      title="Tất cả bảng"
                      style={{
                        border: "none",
                        background: "transparent",
                        color: textSecondary,
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Home size={15} />
                    </button>
                    {activeSection === "all" && (
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: textPrimary }}>
                        › Tất cả bảng
                      </span>
                    )}
                    {activeSection === "trash" && (
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#dc2626" }}>
                        › Thùng rác
                      </span>
                    )}
                    {activeSection === "folder" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedFolderId(null)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: selectedFolderId ? textSecondary : textPrimary,
                            fontWeight: selectedFolderId ? 500 : 700,
                            fontSize: 13.5,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          › Thư mục
                        </button>
                        {folderBreadcrumbs.map((f, idx) => {
                          const isLast = idx === folderBreadcrumbs.length - 1;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setSelectedFolderId(f.id)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: isLast ? textPrimary : textSecondary,
                                fontWeight: isLast ? 700 : 500,
                                fontSize: 13.5,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: 0,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span>›</span>
                              <Folder size={13} color={f.color || "#64748b"} />
                              <span>{f.name}</span>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {backupMsg && (
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: backupMsg.startsWith("⚠") ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {backupMsg}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        height: 34,
                        padding: "0 12px",
                        borderRadius: 999,
                        border: `1px solid ${borderCol}`,
                        background: bgCard,
                        color: textPrimary,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FileUp size={15} color="#0284c7" />
                      <span>Chèn PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateNewBoard}
                      style={{
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 999,
                        border: "none",
                        background: accentBlue,
                        color: "#ffffff",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Plus size={15} />
                      <span>Tạo bảng mới</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSearchOpen((v) => !v)}
                      title="Tìm kiếm"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        border: "none",
                        background: searchOpen ? "#dbeafe" : bgPill,
                        color: searchOpen ? accentBlue : textPrimary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Search size={16} />
                    </button>

                    {/* 3-Dots Samsung Notes More Menu */}
                    <div ref={moreMenuRef} style={{ position: "relative" }}>
                      <button
                        type="button"
                        onClick={() => setMoreMenuOpen((v) => !v)}
                        title="Tuỳ chọn"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          border: "none",
                          background: bgPill,
                          color: textPrimary,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {moreMenuOpen && (
                        <div
                          style={{
                            position: "absolute",
                            top: 40,
                            right: 0,
                            width: 230,
                            background: bgCard,
                            border: `1px solid ${borderCol}`,
                            borderRadius: 16,
                            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
                            padding: 6,
                            zIndex: 50,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {[
                            {
                              label: "Chọn nhiều",
                              icon: <Check size={14} />,
                              onClick: () => {
                                setSelectMode(true);
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label:
                                viewMode === "grid"
                                  ? "Xem: Dạng danh sách"
                                  : "Xem: Dạng lưới",
                              icon:
                                viewMode === "grid" ? (
                                  <List size={14} />
                                ) : (
                                  <LayoutGrid size={14} />
                                ),
                              onClick: () => {
                                setViewMode((v) => (v === "grid" ? "list" : "grid"));
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label:
                                sortMode === "updated"
                                  ? "Sắp xếp: Theo tên A–Z"
                                  : "Sắp xếp: Mới nhất",
                              icon: <RotateCcw size={14} />,
                              onClick: () => {
                                setSortMode((s) => (s === "updated" ? "name" : "updated"));
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label: "Tạo thư mục",
                              icon: <FolderPlus size={14} />,
                              onClick: () => {
                                setNewFolderParentId(
                                  activeSection === "folder" ? selectedFolderId : null
                                );
                                setNewFolderOpen(true);
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label: "Quản lý thư mục",
                              icon: <Folder size={14} />,
                              onClick: () => {
                                setFolderManagerOpen(true);
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label: pinFavoritesFirst
                                ? "✓ Ghim mục yêu thích lên đầu"
                                : "Ghim mục yêu thích lên đầu",
                              icon: <Star size={14} />,
                              onClick: () => {
                                setPinFavoritesFirst((v) => !v);
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label: backupBusy ? "Đang sao lưu..." : "Sao lưu (.physbackup.json)",
                              icon: <Download size={14} />,
                              onClick: () => {
                                setMoreMenuOpen(false);
                                void handleExportBackup();
                              },
                            },
                            {
                              label: "Khôi phục từ file",
                              icon: <Upload size={14} />,
                              onClick: () => {
                                setMoreMenuOpen(false);
                                backupInputRef.current?.click();
                              },
                            },
                            {
                              label: "↺ Khôi phục 9 Sổ tay mẫu",
                              icon: <RotateCcw size={14} />,
                              testId: "restore-tutorial-boards-btn",
                              onClick: async () => {
                                setMoreMenuOpen(false);
                                setBackupMsg("⏳ Đang khôi phục 9 Sổ tay Hướng dẫn mẫu...");
                                await restoreTutorialNotebooks();
                                setBoards(loadBoards());
                                setFolders(loadFolders());
                                setBackupMsg("✓ Đã khôi phục xong 9 Sổ tay Hướng dẫn mẫu!");
                                setTimeout(() => setBackupMsg(null), 3500);
                              },
                            },
                          ].map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              data-testid={"testId" in item ? item.testId : undefined}
                              onClick={item.onClick}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 12px",
                                borderRadius: 10,
                                border: "none",
                                background: "transparent",
                                color: textPrimary,
                                fontSize: 13,
                                fontWeight: 500,
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              {item.icon}
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      title="Quay lại bảng vẽ"
                      aria-label="Đóng"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        border: "none",
                        background: bgPill,
                        color: textPrimary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={17} />
                    </button>
                  </div>
                </>
              )}
            </header>

            {/* Expandable Search Input */}
            {searchOpen && (
              <div style={{ padding: "4px 8px 8px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: bgPill,
                    borderRadius: 12,
                    padding: "0 12px",
                    height: 38,
                  }}
                >
                  <Search size={15} color={textSecondary} />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Tìm tên bảng hoặc ghi chú..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      color: textPrimary,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: textSecondary,
                        cursor: "pointer",
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Main Scrollable Grid / List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 84px" }}>
              {/* Subfolder Strip (Samsung Notes style colored folder cards) */}
              {visibleSubfolders.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  {visibleSubfolders.map((sub) => {
                    const col = sub.color || "#64748b";
                    const cnt = getFolderTotalCount(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setActiveSection("folder");
                          setSelectedFolderId(sub.id);
                        }}
                        style={{
                          width: 92,
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 82,
                            height: 62,
                            borderRadius: 12,
                            background: isDarkTheme ? "#232832" : "#f8fafc",
                            border: `1px solid ${borderCol}`,
                            borderTop: `8px solid ${col}`,
                            position: "relative",
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "flex-start",
                            padding: "6px 8px",
                            boxSizing: "border-box",
                            boxShadow: "0 2px 6px rgba(15,23,42,0.06)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: textSecondary,
                            }}
                          >
                            {cnt}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: textPrimary,
                            maxWidth: 88,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sub.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {filteredBoards.length === 0 && visibleSubfolders.length === 0 ? (
                <div
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    color: textSecondary,
                    fontSize: 14,
                  }}
                >
                  {activeSection === "trash"
                    ? "Thùng rác đang trống."
                    : "Chưa có bảng nào. Bấm \"Tạo bảng mới\" để bắt đầu."}
                </div>
              ) : viewMode === "list" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredBoards.map((b) => {
                    const isSelected = selectedIds.includes(b.id);
                    const isCurrent = b.id === currentRoomId;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          if (selectMode) toggleSelectItem(b.id);
                          else if (!b.trashed) {
                            onSelectBoard(b.id);
                            onClose();
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: bgCard,
                          border: isSelected
                            ? `2px solid ${accentBlue}`
                            : isCurrent
                            ? `1.5px solid ${accentBlue}`
                            : `1px solid ${borderCol}`,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 54,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: `1px solid ${borderCol}`,
                            flexShrink: 0,
                          }}
                        >
                          <BoardCoverPreview
                            cover={b.cover}
                            isCurrent={isCurrent}
                            isDarkTheme={isDarkTheme}
                            compact
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: textPrimary,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {b.name}
                          </div>
                          <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                            {formatShortViDate(b.updatedAt || b.createdAt)}
                          </div>
                        </div>
                        {b.favorite && <Star size={14} color="#eab308" fill="#eab308" />}
                        {b.locked && <Lock size={14} color={textSecondary} />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Samsung Notes Portrait 3:4 Card Grid */
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))",
                    gap: 16,
                  }}
                >
                  {filteredBoards.map((b) => {
                    const isSelected = selectedIds.includes(b.id);
                    const isCurrent = b.id === currentRoomId;
                    return (
                      <div
                        key={b.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          if (selectMode) {
                            toggleSelectItem(b.id);
                          } else if (!b.trashed) {
                            onSelectBoard(b.id);
                            onClose();
                          }
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "3 / 4",
                            borderRadius: 14,
                            overflow: "hidden",
                            position: "relative",
                            background: bgCard,
                            border: isSelected
                              ? `2.5px solid ${accentBlue}`
                              : isCurrent
                              ? `2px solid ${accentBlue}`
                              : `1px solid ${borderCol}`,
                            boxShadow: "0 3px 10px rgba(15, 23, 42, 0.08)",
                          }}
                        >
                          <BoardCoverPreview
                            cover={b.cover}
                            isCurrent={isCurrent}
                            isDarkTheme={isDarkTheme}
                          />

                          {/* Multi-select checkbox */}
                          {selectMode && (
                            <div
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 8,
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                background: isSelected ? accentBlue : "rgba(255,255,255,0.88)",
                                border: isSelected ? "none" : "1.5px solid #94a3b8",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {isSelected && <Check size={13} />}
                            </div>
                          )}

                          {/* Status badges top-right */}
                          <div
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              display: "flex",
                              gap: 4,
                            }}
                          >
                            {b.favorite && <Star size={13} color="#eab308" fill="#eab308" />}
                            {b.locked && <Lock size={13} color="#475569" />}
                          </div>

                          {/* Quick card actions when not in select mode */}
                          {!selectMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectMode(true);
                                setSelectedIds([b.id]);
                              }}
                              title="Tuỳ chọn bảng này"
                              style={{
                                position: "absolute",
                                bottom: 6,
                                right: 6,
                                width: 24,
                                height: 24,
                                borderRadius: 999,
                                border: "1px solid rgba(203,213,225,0.8)",
                                background: "rgba(255,255,255,0.9)",
                                color: "#475569",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                              }}
                            >
                              <MoreVertical size={13} />
                            </button>
                          )}
                        </div>

                        {/* Title (inline rename or display) */}
                        {renamingId === b.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => {
                              const t = renameValue.trim();
                              if (t) {
                                updateBoards(
                                  boards.map((item) =>
                                    item.id === b.id ? { ...item, name: t } : item
                                  )
                                );
                              }
                              setRenamingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            style={{
                              width: "100%",
                              fontSize: 12.5,
                              textAlign: "center",
                              borderRadius: 6,
                              border: `1px solid ${accentBlue}`,
                              padding: "2px 4px",
                            }}
                          />
                        ) : (
                          <div
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setRenamingId(b.id);
                              setRenameValue(b.name);
                            }}
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: textPrimary,
                              textAlign: "center",
                              lineHeight: 1.3,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                            }}
                          >
                            {b.name}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: textSecondary }}>
                          {formatShortViDate(b.updatedAt || b.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Multi-Select Action Bar (Image 8 style) OR Floating Create New FAB */}
            {selectMode && selectedIds.length > 0 ? (
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: isDarkTheme ? "#222731" : "#ffffff",
                  border: `1px solid ${borderCol}`,
                  borderRadius: 999,
                  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.2)",
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  zIndex: 40,
                }}
              >
                {activeSection === "trash" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleBatchRestore}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: accentBlue,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <RotateCcw size={16} />
                      <span>Khôi phục</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchDelete}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#dc2626",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Xoá vĩnh viễn</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setMoveDialogOpen(true)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: textPrimary,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <FolderInput size={16} />
                      <span>Di chuyển</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchToggleLock}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: textPrimary,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      {selectedIds.every((id) => boards.find((b) => b.id === id)?.locked) ? (
                        <Unlock size={16} />
                      ) : (
                        <Lock size={16} />
                      )}
                      <span>Khoá</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchToggleFavorite}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: textPrimary,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Star size={16} />
                      <span>Yêu thích</span>
                    </button>
                    {selectedIds.length === 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCoverEditTargetId(selectedIds[0])}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: textPrimary,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Palette size={16} />
                          <span>Sửa bìa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const b = boards.find((x) => x.id === selectedIds[0]);
                            if (b) {
                              setRenamingId(b.id);
                              setRenameValue(b.name);
                              setSelectMode(false);
                              setSelectedIds([]);
                            }
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: textPrimary,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Edit2 size={16} />
                          <span>Đổi tên</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleBatchDuplicate}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: textPrimary,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Copy size={16} />
                      <span>Nhân đôi</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchDelete}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#dc2626",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Xoá</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCreateNewBoard}
                title="Tạo bảng mới"
                style={{
                  position: "absolute",
                  bottom: 18,
                  right: 18,
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  border: "none",
                  background: accentBlue,
                  color: "#ffffff",
                  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.35)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={24} />
              </button>
            )}
          </>
        )}
      </main>

      {/* Edit Cover Dialog (Sửa bìa) */}
      <EditCoverDialog
        key={coverEditTarget?.id || "cover"}
        open={Boolean(coverEditTarget)}
        initialCover={coverEditTarget?.cover}
        isDarkTheme={isDarkTheme}
        onClose={() => setCoverEditTargetId(null)}
        onApply={(newCover: BoardCoverConfig | null) => {
          if (!coverEditTarget) return;
          updateBoards(
            boards.map((b) =>
              b.id === coverEditTarget.id
                ? { ...b, cover: newCover, updatedAt: Date.now() }
                : b
            )
          );
          setSelectMode(false);
          setSelectedIds([]);
        }}
      />

      {/* Move to Folder Dialog */}
      {moveDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoveDialogOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10020,
            background: "rgba(15,23,42,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(340px, 100%)",
              background: bgCard,
              color: textPrimary,
              borderRadius: 18,
              border: `1px solid ${borderCol}`,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              Di chuyển đến thư mục
            </div>
            <button
              type="button"
              onClick={() => handleBatchMoveToFolder(null)}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: `1px solid ${borderCol}`,
                background: bgPill,
                color: textPrimary,
                textAlign: "left",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              🏠 Thư mục gốc (Không phân loại)
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleBatchMoveToFolder(f.id)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1px solid ${borderCol}`,
                  background: "transparent",
                  color: textPrimary,
                  textAlign: "left",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <Folder size={15} color={f.color || "#64748b"} />
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create New Folder Dialog */}
      {newFolderOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewFolderOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10025,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(340px, 100%)",
              background: bgCard,
              color: textPrimary,
              borderRadius: 18,
              border: `1px solid ${borderCol}`,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15.5, fontWeight: 700 }}>Tạo thư mục mới</div>
            <input
              type="text"
              autoFocus
              placeholder="Tên thư mục (vd: Năm 1, Toán đại cương)..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolderSubmit();
              }}
              style={{
                height: 38,
                padding: "0 12px",
                borderRadius: 10,
                border: `1px solid ${borderCol}`,
                background: bgPill,
                color: textPrimary,
                fontSize: 13.5,
              }}
            />
            <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>
              Thư mục cha
            </div>
            <select
              value={newFolderParentId || ""}
              onChange={(e) => setNewFolderParentId(e.target.value || null)}
              style={{
                height: 36,
                borderRadius: 10,
                border: `1px solid ${borderCol}`,
                background: bgPill,
                color: textPrimary,
                padding: "0 10px",
                fontSize: 13,
              }}
            >
              <option value="">Thư mục gốc</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>
              Màu biểu tượng
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {FOLDER_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNewFolderColor(col)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: col,
                    border: newFolderColor === col ? "2.5px solid #0f172a" : "2px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setNewFolderOpen(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1px solid ${borderCol}`,
                  background: "transparent",
                  color: textPrimary,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleCreateFolderSubmit}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: accentBlue,
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
