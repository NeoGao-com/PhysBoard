"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import * as Y from "yjs";
import {
  Camera,
  Copy,
  Download,
  ImagePlus,
  X as CloseSmallIcon,
} from "lucide-react";
import {
  ToolbarVisibilityConfig,
  DEFAULT_TOOLBAR_VISIBILITY,
} from "@/lib/toolbar-config";
import { LaserConfig, DEFAULT_LASER_CONFIG } from "@/lib/laser-config";
import {
  BOARD_FORMAT_OPTIONS,
  BOARD_GRID_SIZE_OPTIONS,
  BOARD_PATTERN_OPTIONS,
  BOARD_SURFACE_PRESETS,
  DEFAULT_PAGE_BOARD_CONFIG,
  type PageBoardConfig,
} from "@/lib/board-themes";
import { exportPNG, downloadBlob } from "@/lib/export";
import { SPenConfig, DEFAULT_SPEN_CONFIG, SPenButtonAction } from "@/types/whiteboard";
import {
  APP_VERSION,
  type AppReleaseInfo,
  downloadAndInstallUpdate,
  fetchLatestRelease,
  getRuntimeUpdatePlatform,
  GITHUB_RELEASES_URL,
} from "@/lib/app-version";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  // Toolbar Visibility Config
  toolbarConfig: ToolbarVisibilityConfig;
  onChangeToolbarConfig: (cfg: ToolbarVisibilityConfig) => void;
  // Auto return config
  autoSwitchTarget: "select" | "ink" | "off";
  onChangeAutoSwitchTarget: (target: "select" | "ink" | "off") => void;
  // Ink recognizer & Pen only
  inkToShape: boolean;
  onChangeInkToShape: (val: boolean) => void;
  penOnlyMode: boolean;
  onChangePenOnlyMode: (val: boolean) => void;
  // SPen / Stylus Button Config
  spenConfig?: SPenConfig;
  onChangeSPenConfig?: (cfg: SPenConfig) => void;
  // Laser Config
  laserConfig: LaserConfig;
  onChangeLaserConfig: (cfg: LaserConfig) => void;
  // Grid
  onChangeGridEnabled: (val: boolean) => void;
  // Tool Instruction Guide
  isGuideEnabled?: boolean;
  onToggleGuide?: () => void;

  // Board settings (from MoreMenu)
  doc?: Y.Doc | null;
  page?: number;
  totalPages?: number;
  getBoardElement?: () => SVGSVGElement | HTMLElement | null;
  boardConfig?: PageBoardConfig;
  onChangeBoardConfig?: (next: PageBoardConfig) => void;
  onApplyBoardAllPages?: (cfg: PageBoardConfig) => void;

  // Geometry & Point scaling
  onScaleGeometry?: (factor: number) => void;
  labelScale?: number;
  onChangeLabelScale?: (nextScale: number) => void;
  dotScale?: number;
  onChangeDotScale?: (nextScale: number) => void;

  // Utilities & Export
  onOpenCommandPalette?: () => void;
  onExportPdf?: () => void;
  onOpenFeatureGuide?: () => void;
  onOpenPdfManual?: () => void;
  initialTab?: SettingsTab;
}

export type SettingsTab =
  | "general"
  | "board"
  | "scale"
  | "toolbar"
  | "laser"
  | "export"
  | "update"
  | "feedback";

interface FeedbackAttachment {
  id: string;
  name: string;
  dataUrl: string;
  sizeBytes: number;
}

const MAX_FEEDBACK_IMAGES = 4;

interface TabMeta {
  id: SettingsTab;
  label: string;
  icon: string;
  subtitle: string;
}

const TAB_DEFS: TabMeta[] = [
  {
    id: "general",
    label: "Chung & Thao tác",
    icon: "⚙️",
    subtitle: "Tự động đổi công cụ, bút Stylus, dòng chỉ dẫn",
  },
  {
    id: "board",
    label: "Khổ & Nền bảng",
    icon: "🎨",
    subtitle: "Màu nền, lưới, dòng kẻ và khổ A4 / Vô hạn",
  },
  {
    id: "scale",
    label: "Tỉ lệ & Cỡ chữ",
    icon: "📏",
    subtitle: "Thu phóng hình học, cỡ tên điểm và chấm điểm",
  },
  {
    id: "toolbar",
    label: "Ẩn/Hiện Công cụ",
    icon: "👁️",
    subtitle: "Bật hoặc ẩn các nút tính năng trên thanh công cụ",
  },
  {
    id: "laser",
    label: "Bút Laser",
    icon: "🎯",
    subtitle: "Hiệu ứng tia sáng, dấu chấm, độ rộng và màu laser",
  },
  {
    id: "export",
    label: "Xuất file PDF & PNG",
    icon: "💾",
    subtitle: "Xuất tài liệu PDF chuẩn in ấn và xuất hình ảnh PNG sắc nét",
  },
  {
    id: "update",
    label: "Cập nhật ứng dụng",
    icon: "🔄",
    subtitle: "Kiểm tra phiên bản mới, lịch sử cập nhật & tải về",
  },
  {
    id: "feedback",
    label: "Báo lỗi & Phản hồi",
    icon: "🐛",
    subtitle: "Gửi báo cáo lỗi hoặc góp ý tính năng trực tiếp cho tác giả",
  },
];

const CARD_BOX_STYLE: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
};

const CARD_TITLE_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  toolbarConfig,
  onChangeToolbarConfig,
  autoSwitchTarget,
  onChangeAutoSwitchTarget,
  inkToShape,
  onChangeInkToShape,
  penOnlyMode,
  onChangePenOnlyMode,
  spenConfig = DEFAULT_SPEN_CONFIG,
  onChangeSPenConfig,
  laserConfig,
  onChangeLaserConfig,
  onChangeGridEnabled,
  isGuideEnabled = true,
  onToggleGuide,
  doc,
  page = 1,
  getBoardElement,
  boardConfig = DEFAULT_PAGE_BOARD_CONFIG,
  onChangeBoardConfig,
  onApplyBoardAllPages,
  onScaleGeometry,
  labelScale = 1,
  onChangeLabelScale,
  dotScale = 1.5,
  onChangeDotScale,
  onOpenCommandPalette,
  onExportPdf,
  onOpenFeatureGuide,
  onOpenPdfManual,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? "general");

  useEffect(() => {
    if (open && initialTab) {
      const id = requestAnimationFrame(() => setActiveTab(initialTab));
      return () => cancelAnimationFrame(id);
    }
  }, [open, initialTab]);

  // Feedback / Bug report state
  const [fbCategory, setFbCategory] = useState<"bug" | "feature" | "ui">("bug");
  const [fbTitle, setFbTitle] = useState("");
  const [fbDesc, setFbDesc] = useState("");
  const [fbIncludeDiag, setFbIncludeDiag] = useState(true);
  const [fbCopied, setFbCopied] = useState(false);
  const [fbImages, setFbImages] = useState<FeedbackAttachment[]>([]);
  const [fbCapturingBoard, setFbCapturingBoard] = useState(false);
  const [fbNotice, setFbNotice] = useState<string | null>(null);
  const fbFileInputRef = useRef<HTMLInputElement | null>(null);
  const fbNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [busyPng, setBusyPng] = useState(false);

  const showFbNotice = useCallback((msg: string) => {
    setFbNotice(msg);
    if (fbNoticeTimerRef.current) {
      clearTimeout(fbNoticeTimerRef.current);
    }
    fbNoticeTimerRef.current = setTimeout(() => {
      setFbNotice(null);
      fbNoticeTimerRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (fbNoticeTimerRef.current) clearTimeout(fbNoticeTimerRef.current);
    };
  }, []);

  const addFeedbackImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) {
        showFbNotice("Vui lòng chọn file ảnh (PNG, JPG, WebP...).");
        return;
      }

      const loaded: FeedbackAttachment[] = await Promise.all(
        list.slice(0, MAX_FEEDBACK_IMAGES).map(
          (file) =>
            new Promise<FeedbackAttachment>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: `fb_img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
                  name: file.name || `anh-loi-${Date.now()}.png`,
                  dataUrl: String(reader.result || ""),
                  sizeBytes: file.size,
                });
              reader.onerror = () => reject(new Error("Không đọc được file ảnh"));
              reader.readAsDataURL(file);
            })
        )
      ).catch(() => []);

      if (loaded.length === 0) return;

      let dropped = false;
      setFbImages((prev) => {
        const room = Math.max(0, MAX_FEEDBACK_IMAGES - prev.length);
        if (loaded.length > room) dropped = true;
        return [...prev, ...loaded.slice(0, room)];
      });

      if (dropped) {
        showFbNotice(`Chỉ đính kèm tối đa ${MAX_FEEDBACK_IMAGES} ảnh cho mỗi báo lỗi.`);
      } else {
        showFbNotice(`✓ Đã đính kèm ${loaded.length} ảnh minh hoạ.`);
      }
    },
    [showFbNotice]
  );

  const handleCaptureBoardForFeedback = async () => {
    const el = getBoardElement ? getBoardElement() : null;
    if (!el || !doc) {
      showFbNotice("Không tìm thấy bảng vẽ để chụp ảnh màn hình.");
      return;
    }
    if (fbImages.length >= MAX_FEEDBACK_IMAGES) {
      showFbNotice(`Đã đủ tối đa ${MAX_FEEDBACK_IMAGES} ảnh đính kèm.`);
      return;
    }
    setFbCapturingBoard(true);
    try {
      const blob = await exportPNG(el, doc, page);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Lỗi chuyển đổi ảnh PNG"));
        reader.readAsDataURL(blob);
      });
      setFbImages((prev) => [
        ...prev.slice(0, MAX_FEEDBACK_IMAGES - 1),
        {
          id: `fb_board_${Date.now().toString(36)}`,
          name: `bang-trang-t${page}.png`,
          dataUrl,
          sizeBytes: blob.size,
        },
      ]);
      showFbNotice(`✓ Đã chụp ảnh Trang ${page} đính kèm vào báo lỗi.`);
    } catch (err) {
      showFbNotice(
        err instanceof Error ? `Không thể chụp bảng: ${err.message}` : "Không thể chụp bảng."
      );
    } finally {
      setFbCapturingBoard(false);
    }
  };

  const copyDataUrlImageToClipboard = useCallback(async (dataUrl: string): Promise<boolean> => {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("Không nạp được ảnh"));
        im.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, img.naturalWidth || 800);
      canvas.height = Math.max(1, img.naturalHeight || 600);
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.drawImage(img, 0, 0);
      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!pngBlob || typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        return false;
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const downloadFeedbackImage = (item: FeedbackAttachment) => {
    try {
      const [header, b64] = item.dataUrl.split(",");
      const mime = header?.match(/:(.*?);/)?.[1] || "image/png";
      const bin = atob(b64 || "");
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      downloadBlob(new Blob([arr], { type: mime }), item.name);
    } catch {
      showFbNotice("Không thể tải ảnh này.");
    }
  };

  // Check for updates state
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppReleaseInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [installProgress, setInstallProgress] = useState<number | null>(null);
  const [installStatus, setInstallStatus] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const runtimePlatform = getRuntimeUpdatePlatform();

  const handleInstallUpdate = async (release: AppReleaseInfo) => {
    setInstallingUpdate(true);
    setInstallError(null);
    setInstallProgress(runtimePlatform === "capacitor-android" ? 0 : null);
    setInstallStatus("Đang chuẩn bị tải bản cập nhật...");
    try {
      await downloadAndInstallUpdate(release, (pct, status) => {
        setInstallProgress(pct);
        setInstallStatus(status);
      });
    } catch (err: unknown) {
      setInstallError(err instanceof Error ? err.message : String(err));
      setInstallStatus(null);
    } finally {
      setInstallingUpdate(false);
    }
  };

  const autoCheckedUpdateRef = useRef(false);

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    try {
      const info = await fetchLatestRelease(APP_VERSION);
      setUpdateInfo(info);
      setLastCheckedTime(
        new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "update" && !autoCheckedUpdateRef.current) {
      autoCheckedUpdateRef.current = true;
      queueMicrotask(() => {
        void handleCheckUpdate();
      });
    }
  }, [activeTab, handleCheckUpdate]);

  // Accordion state for toolbar config groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    selection: false,
    drawing: false,
    plane: false,
    space: false,
    physics: false,
  });

  // Responsive screen listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard dismiss (Escape)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose]);

  // Support Ctrl+V image paste directly into the Feedback / Bug Report tab
  useEffect(() => {
    if (!open || activeTab !== "feedback") return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedImages: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) pastedImages.push(f);
        }
      }
      if (pastedImages.length > 0) {
        e.preventDefault();
        void addFeedbackImageFiles(pastedImages);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, activeTab, addFeedbackImageFiles]);

  if (!open) return null;

  const currentTabDef = TAB_DEFS.find((t) => t.id === activeTab) || TAB_DEFS[0];

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetDefaults = () => {
    if (window.confirm("Khôi phục toàn bộ cài đặt thanh công cụ và giao diện về mặc định?")) {
      onChangeToolbarConfig(DEFAULT_TOOLBAR_VISIBILITY);
      onChangeAutoSwitchTarget("select");
      onChangeInkToShape(true);
      onChangePenOnlyMode(false);
      onChangeLaserConfig(DEFAULT_LASER_CONFIG);
      onChangeLabelScale?.(1);
      onChangeDotScale?.(1.5);
    }
  };

  const updateToolbarItem = (key: keyof ToolbarVisibilityConfig, val: boolean) => {
    onChangeToolbarConfig({ ...toolbarConfig, [key]: val });
  };

  const handlePngExport = async () => {
    const el = getBoardElement ? getBoardElement() : null;
    if (!el || !doc) {
      alert("Không tìm thấy bảng vẽ hoặc tài liệu để xuất ảnh!");
      return;
    }
    setBusyPng(true);
    try {
      const blob = await exportPNG(el, doc, page);
      downloadBlob(blob, `physboard-trang-${page}.png`);
    } catch (err) {
      console.error(err);
      alert("Xuất ảnh PNG thất bại: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusyPng(false);
    }
  };

  const labelPercent = Math.round(labelScale * 100);
  const dotPercent = Math.round(dotScale * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Scoped CSS for sleek scrollbars and pill transitions */}
      <style>{`
        .phys-settings-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .phys-settings-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .phys-settings-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .phys-settings-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .phys-settings-no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .phys-settings-no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .phys-tab-item {
          transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }
        .phys-tab-item:active {
          transform: scale(0.98);
        }
      `}</style>

      <div
        data-testid="settings-modal"
        style={{
          background: "#ffffff",
          borderRadius: isMobile ? 0 : 16,
          boxShadow: isMobile
            ? "none"
            : "0 25px 50px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.05)",
          width: isMobile ? "100%" : "95vw",
          maxWidth: isMobile ? "100%" : 960,
          height: isMobile ? "100%" : "min(720px, 88vh)",
          maxHeight: isMobile ? "100%" : "88vh",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
          fontFamily: 'var(--font-sans, "Be Vietnam Pro", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)',
          border: isMobile ? "none" : "1px solid #e2e8f0",
        }}
      >
        {/* ===================== DESKTOP LEFT SIDEBAR ===================== */}
        {!isMobile && (
          <aside
            style={{
              width: 240,
              flexShrink: 0,
              background: "#f8fafc",
              borderRight: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Sidebar App Title */}
            <div
              style={{
                padding: "18px 16px 14px 18px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "#eff6ff",
                  border: "1px solid #dbeafe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                ⚙️
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: "#0f172a", lineHeight: 1.2 }}>
                  Cài Đặt Hệ Thống
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  PhysBoard Whiteboard
                </div>
              </div>
            </div>

            {/* Vertical Sidebar Tab Buttons */}
            <nav
              className="phys-settings-scrollbar"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {TAB_DEFS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="phys-tab-item"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: isActive ? "1px solid #cbd5e1" : "1px solid transparent",
                      background: isActive ? "#ffffff" : "transparent",
                      boxShadow: isActive ? "0 2px 5px rgba(15, 23, 42, 0.05)" : "none",
                      color: isActive ? "#1d4ed8" : "#334155",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{tab.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tab.label}
                      </div>
                    </div>
                    {isActive && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#2563eb",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Bottom Reset Button */}
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid #f1f5f9",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={handleResetDefaults}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  background: "#fff5f5",
                  color: "#dc2626",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff5f5")}
              >
                <span>↺</span>
                <span>Khôi phục mặc định</span>
              </button>
            </div>
          </aside>
        )}

        {/* ===================== MOBILE HEADER & PILL TABS ===================== */}
        {isMobile && (
          <>
            {/* Top Bar */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#ffffff",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚙️</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                  Cài Đặt Hệ Thống
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng cài đặt"
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  fontSize: 16,
                  color: "#475569",
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Horizontal Pill Tab Bar (No scrollbars, touch-scrollable) */}
            <div
              className="phys-settings-no-scrollbar"
              style={{
                display: "flex",
                gap: 6,
                padding: "8px 12px",
                overflowX: "auto",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                flexShrink: 0,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {TAB_DEFS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="phys-tab-item"
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      border: isActive ? "1px solid #2563eb" : "1px solid #cbd5e1",
                      background: isActive ? "#2563eb" : "#ffffff",
                      color: isActive ? "#ffffff" : "#475569",
                      fontWeight: isActive ? 600 : 500,
                      fontSize: 12.5,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: isActive ? "0 2px 6px rgba(37,99,235,0.25)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ===================== MAIN CONTENT PANEL ===================== */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {/* Header on Desktop */}
          {!isMobile && (
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#ffffff",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{currentTabDef.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
                    {currentTabDef.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {currentTabDef.subtitle}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng cài đặt"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: 16,
                  color: "#64748b",
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fee2e2";
                  e.currentTarget.style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Scrollable Content Body */}
          <div
            className="phys-settings-scrollbar"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? "14px 14px" : "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* ==================== TAB 1: CHUNG & THAO TÁC ==================== */}
            {activeTab === "general" && (
              <>
                {/* Thông tin phiên bản & Cập nhật nhanh */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={CARD_TITLE_STYLE}>
                      <span>🔄</span>
                      <span>Phiên bản: PhysBoard v{APP_VERSION}</span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          fontWeight: 600,
                        }}
                      >
                        Chính thức
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("update");
                          handleCheckUpdate();
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid #2563eb",
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>🔄</span>
                        <span>Kiểm tra cập nhật</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    PhysBoard hỗ trợ kiểm tra và cập nhật tự động cho bản cài đặt Windows (.exe) và Android (.apk).
                  </div>
                </div>

                {/* Tự động quay lại công cụ */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>🔄</span>
                    <span>Tự động quay lại công cụ sau khi tạo hình hoặc tẩy</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.4 }}>
                    Khi bạn vẽ xong một hình hoặc tẩy xong nét vẽ, hệ thống sẽ tự động chuyển về công cụ mong muốn:
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        val: "select",
                        label: "Con trỏ chọn (Mặc định)",
                        desc: "Chuyển về chuột để chọn & chỉnh sửa",
                        icon: "↖",
                      },
                      {
                        val: "ink",
                        label: "Quay lại Bút vẽ",
                        desc: "Tiếp tục viết nét bút không ngắt quãng",
                        icon: "✏️",
                      },
                      {
                        val: "off",
                        label: "Không tự chuyển",
                        desc: "Giữ nguyên công cụ vừa vẽ",
                        icon: "🔒",
                      },
                    ].map((opt) => {
                      const selected = autoSwitchTarget === opt.val;
                      return (
                        <label
                          key={opt.val}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: selected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            background: selected ? "#eff6ff" : "#f8fafc",
                            cursor: "pointer",
                            userSelect: "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <input
                            type="radio"
                            name="autoSwitch"
                            checked={selected}
                            onChange={() => onChangeAutoSwitchTarget(opt.val as "select" | "ink" | "off")}
                            style={{ accentColor: "#2563eb", marginTop: 3 }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: selected ? "#1d4ed8" : "#0f172a" }}>
                              {opt.label}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              {opt.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Chế độ cảm ứng bút / tay */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>✍️</span>
                    <span>Chế độ bút Stylus & Vẽ tay</span>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>
                        Chế độ chỉ viết bằng bút Stylus (Pen-Only Mode)
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Khi bật, ngón tay chỉ dùng để cuộn, di chuyển bảng và chọn hình; chỉ có bút cảm ứng mới để lại nét mực.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={penOnlyMode}
                      onChange={(e) => onChangePenOnlyMode(e.target.checked)}
                      style={{
                        accentColor: "#2563eb",
                        width: 20,
                        height: 20,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    />
                  </label>
                </div>

                {/* Chỉ dẫn sử dụng chức năng */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>💡</span>
                    <span>Chỉ dẫn sử dụng chức năng (Tool Guide)</span>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>
                        Hiển thị dòng chỉ dẫn từng bước khi chọn công cụ
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Mỗi khi bạn chọn một công cụ (bút, thước, hình học, 3D, vật lý...), hệ thống sẽ hiển thị một dòng hướng dẫn chi tiết cách vẽ và phím tắt tương ứng.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      data-setting="tool-guides"
                      checked={isGuideEnabled}
                      onChange={() => onToggleGuide?.()}
                      style={{
                        accentColor: "#2563eb",
                        width: 20,
                        height: 20,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    />
                  </label>
                </div>

                {/* Cài đặt nút bấm S Pen / Stylus */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>🖊️</span>
                    <span>Nút bấm trên bút S Pen / Stylus (Samsung Tab & Wacom)</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 2 }}>
                    <div style={{ fontSize: 12.5, color: "#64748b" }}>
                      Tùy chỉnh hành vi khi ấn nút bên hông thân bút S Pen trên màn hình:
                    </div>

                    {/* 1. Chọn chức năng */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>
                        Chức năng gán cho nút bút:
                      </label>
                      <select
                        value={spenConfig.action}
                        onChange={(e) =>
                          onChangeSPenConfig?.({
                            ...spenConfig,
                            action: e.target.value as SPenButtonAction,
                          })
                        }
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: 13,
                          background: "#fff",
                          color: "#0f172a",
                          cursor: "pointer",
                          maxWidth: isMobile ? "100%" : 320,
                        }}
                      >
                        <option value="erase">Tẩy xoá (Gôm nhanh)</option>
                        <option value="select">Công cụ Chọn / Di chuyển (Select)</option>
                        <option value="ink:laser">Bút Laze chỉ điểm (Laser Pointer)</option>
                        <option value="ink:highlighter">Bút Dạ quang (Highlighter)</option>
                        <option value="pan">Kéo trượt bảng (Pan Canvas)</option>
                        <option value="none">Không làm gì (Tắt phím bút)</option>
                      </select>
                    </div>

                    {/* 2. Cách thức hoạt động */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>
                        Cơ chế kích hoạt nút bấm:
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 13,
                            cursor: "pointer",
                            padding: "6px 8px",
                            borderRadius: 6,
                            background: spenConfig.behavior === "hold" ? "#eff6ff" : "transparent",
                          }}
                        >
                          <input
                            type="radio"
                            name="spenBehavior"
                            value="hold"
                            checked={spenConfig.behavior === "hold"}
                            onChange={() =>
                              onChangeSPenConfig?.({
                                ...spenConfig,
                                behavior: "hold",
                              })
                            }
                            style={{ accentColor: "#2563eb" }}
                          />
                          <div>
                            <span style={{ fontWeight: 600 }}>Giữ nút để dùng, nhả nút tự quay về</span>
                            <div style={{ fontSize: 11.5, color: "#64748b" }}>
                              Vừa giữ nút bấm vừa chấm bút để tẩy/chọn, nhả nút ra sẽ lập tức trở lại cây bút bạn đang vẽ.
                            </div>
                          </div>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 13,
                            cursor: "pointer",
                            padding: "6px 8px",
                            borderRadius: 6,
                            background: spenConfig.behavior === "toggle" ? "#eff6ff" : "transparent",
                          }}
                        >
                          <input
                            type="radio"
                            name="spenBehavior"
                            value="toggle"
                            checked={spenConfig.behavior === "toggle"}
                            onChange={() =>
                              onChangeSPenConfig?.({
                                ...spenConfig,
                                behavior: "toggle",
                              })
                            }
                            style={{ accentColor: "#2563eb" }}
                          />
                          <div>
                            <span style={{ fontWeight: 600 }}>Bấm 1 lần để chuyển công cụ</span>
                            <div style={{ fontSize: 11.5, color: "#64748b" }}>
                              Bấm nút 1 lần là đổi sang công cụ được gán mà không cần phải giữ tay liên tục.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* 3. Tùy chọn quay lại */}
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        padding: "8px 0",
                        borderTop: "1px solid #f1f5f9",
                        marginTop: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={spenConfig.returnAfterAction}
                        onChange={(e) =>
                          onChangeSPenConfig?.({
                            ...spenConfig,
                            returnAfterAction: e.target.checked,
                          })
                        }
                        style={{ accentColor: "#2563eb", width: 18, height: 18 }}
                      />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1e293b" }}>
                          Tự động quay lại công cụ vẽ cũ sau khi thao tác xong
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>
                          Sau khi nhấc bút tẩy xong hoặc vẽ xong 1 nét laze/dạ quang, ứng dụng tự động trả về loại bút trước đó.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Nhận diện hình học tay */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>📐</span>
                    <span>Nhận diện hình vẽ tay (Ink-to-Shape)</span>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>
                        Tự động nắn thẳng nét vẽ hình học
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Tự động chuyển nét vẽ tự do thành hình tròn, đoạn thẳng, tam giác hoặc hình chữ nhật chuẩn mực.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={inkToShape}
                      onChange={(e) => onChangeInkToShape(e.target.checked)}
                      style={{
                        accentColor: "#2563eb",
                        width: 20,
                        height: 20,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    />
                  </label>
                </div>

                {/* Phím tắt */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>⌘</span>
                    <span>Bảng lệnh & Phím tắt hệ thống</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 12.5, color: "#64748b" }}>
                      Mở nhanh danh sách mọi lệnh, thao tác vẽ và phím tắt phím cứng (Ctrl + K)
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCommandPalette?.();
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#1e293b",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      Xem phím tắt (Ctrl+K)
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ==================== TAB 3: KHỔ & NỀN BẢNG VẼ ==================== */}
            {activeTab === "board" && (
              <>
                {/* Nền bảng & Màu sắc */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={CARD_TITLE_STYLE}>
                      <span>🎨</span>
                      <span>Màu nền bảng · Trang {page}</span>
                    </div>
                    {onApplyBoardAllPages && (
                      <button
                        type="button"
                        data-action="board-apply-all"
                        onClick={() => onApplyBoardAllPages(boardConfig)}
                        style={{
                          padding: "5px 10px",
                          fontSize: 11.5,
                          background: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Áp dụng cho mọi trang
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {BOARD_SURFACE_PRESETS.map((preset) => {
                      const selected = boardConfig.surface === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          data-board-surface-option={preset.id}
                          title={preset.label}
                          onClick={() =>
                            onChangeBoardConfig?.({
                              ...boardConfig,
                              surface: preset.id,
                            })
                          }
                          style={{
                            width: 36,
                            height: 32,
                            borderRadius: 8,
                            background: preset.bg,
                            borderWidth: selected ? 2 : 1,
                            borderStyle: "solid",
                            borderColor: selected ? "#2563eb" : "#cbd5e1",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: preset.isDark ? "#f8fafc" : "#1e293b",
                            fontSize: 13,
                            fontWeight: 700,
                            boxShadow: selected ? "0 0 0 2px rgba(37, 99, 235, 0.25)" : "none",
                          }}
                        >
                          {selected ? "✓" : ""}
                        </button>
                      );
                    })}

                    <label
                      title="Chọn màu nền bảng tuỳ ý"
                      style={{
                        position: "relative",
                        width: 36,
                        height: 32,
                        borderRadius: 8,
                        background:
                          "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                        borderWidth: boardConfig.surface === "custom" ? 2 : 1,
                        borderStyle: "solid",
                        borderColor: boardConfig.surface === "custom" ? "#2563eb" : "#cbd5e1",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontSize: 14,
                        fontWeight: 700,
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                      }}
                    >
                      +
                      <input
                        type="color"
                        data-testid="board-custom-bg"
                        aria-label="Màu nền bảng tuỳ ý"
                        value={boardConfig.customBg ?? "#f0fdf4"}
                        onChange={(e) =>
                          onChangeBoardConfig?.({
                            ...boardConfig,
                            surface: "custom",
                            customBg: e.target.value,
                          })
                        }
                        style={{
                          position: "absolute",
                          inset: 0,
                          opacity: 0,
                          width: "100%",
                          height: "100%",
                          cursor: "pointer",
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Kiểu kẻ bảng & Lưới */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>📏</span>
                    <span>Kiểu lưới / Dòng kẻ bảng</span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                      gap: 8,
                    }}
                  >
                    {BOARD_PATTERN_OPTIONS.map((pat) => {
                      const selected = boardConfig.pattern === pat.id;
                      return (
                        <button
                          key={pat.id}
                          type="button"
                          data-board-pattern-option={pat.id}
                          onClick={() => {
                            onChangeBoardConfig?.({
                              ...boardConfig,
                              pattern: pat.id,
                            });
                            if (pat.id !== "none") onChangeGridEnabled(true);
                          }}
                          style={{
                            height: 34,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: selected ? "#2563eb" : "#e2e8f0",
                            background: selected ? "#eff6ff" : "#ffffff",
                            color: selected ? "#1d4ed8" : "#334155",
                            fontSize: 12.5,
                            fontWeight: selected ? 600 : 500,
                            cursor: "pointer",
                          }}
                        >
                          {pat.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Grid size */}
                  {boardConfig.pattern !== "none" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 12.5, color: "#64748b" }}>Cỡ ô:</span>
                      {BOARD_GRID_SIZE_OPTIONS.map((sz) => {
                        const selected = boardConfig.gridSize === sz.id;
                        return (
                          <button
                            key={sz.id}
                            type="button"
                            data-board-size-option={sz.id}
                            onClick={() =>
                              onChangeBoardConfig?.({
                                ...boardConfig,
                                gridSize: sz.id,
                              })
                            }
                            style={{
                              flex: 1,
                              height: 28,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor: selected ? "#2563eb" : "#e2e8f0",
                              background: selected ? "#eff6ff" : "#ffffff",
                              color: selected ? "#1d4ed8" : "#475569",
                              fontSize: 12,
                              fontWeight: selected ? 600 : 500,
                              cursor: "pointer",
                            }}
                          >
                            {sz.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Khổ bảng */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>📄</span>
                    <span>Khổ bảng / Khổ giấy</span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                      gap: 8,
                    }}
                  >
                    {BOARD_FORMAT_OPTIONS.map((fmt) => {
                      const currentFormat = boardConfig.format ?? "infinite";
                      const selected = currentFormat === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          data-board-format-option={fmt.id}
                          title={fmt.desc}
                          onClick={() =>
                            onChangeBoardConfig?.({
                              ...boardConfig,
                              format: fmt.id,
                            })
                          }
                          style={{
                            padding: "8px 10px",
                            minHeight: 40,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: selected ? "#2563eb" : "#e2e8f0",
                            background: selected ? "#eff6ff" : "#ffffff",
                            color: selected ? "#1d4ed8" : "#334155",
                            fontSize: 12.5,
                            fontWeight: selected ? 600 : 500,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <span>{selected ? "✓" : ""}</span>
                          <span>{fmt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ==================== TAB 4: TỈ LỆ & CỠ CHỮ ==================== */}
            {activeTab === "scale" && (
              <>
                {/* Giãn / Thu toàn bộ hình */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>⤢</span>
                    <span>Thu phóng toàn bộ hình vẽ trên trang</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      data-action="scale-up"
                      onClick={() => onScaleGeometry?.(1.2)}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>⤢</span>
                      <span>Giãn hình to (+20%)</span>
                    </button>
                    <button
                      type="button"
                      data-action="scale-down"
                      onClick={() => onScaleGeometry?.(1 / 1.2)}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>⤡</span>
                      <span>Thu hình nhỏ (-20%)</span>
                    </button>
                  </div>
                </div>

                {/* Cỡ tên mọi điểm */}
                <div data-setting="label-size" style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={CARD_TITLE_STYLE}>
                      <span>🔤</span>
                      <span>Cỡ tên mọi điểm (Label Scale)</span>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#2563eb",
                        background: "#eff6ff",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {labelPercent}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      data-action="label-size-down"
                      onClick={() =>
                        onChangeLabelScale?.(
                          Math.max(0.5, Number((labelScale - 0.15).toFixed(2)))
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      A− Nhỏ hơn
                    </button>
                    <button
                      type="button"
                      data-action="label-size-reset"
                      onClick={() => onChangeLabelScale?.(1)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ↺ 100%
                    </button>
                    <button
                      type="button"
                      data-action="label-size-up"
                      onClick={() =>
                        onChangeLabelScale?.(
                          Math.min(2.5, Number((labelScale + 0.15).toFixed(2)))
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      A+ To hơn
                    </button>
                  </div>
                </div>

                {/* Cỡ chấm mọi điểm */}
                <div data-setting="dot-size" style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={CARD_TITLE_STYLE}>
                      <span>●</span>
                      <span>Cỡ chấm mọi điểm (Dot Scale)</span>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#2563eb",
                        background: "#eff6ff",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {dotPercent}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      data-action="dot-size-down"
                      onClick={() =>
                        onChangeDotScale?.(
                          Math.max(0.5, Number((dotScale - 0.2).toFixed(2)))
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      · Chấm nhỏ
                    </button>
                    <button
                      type="button"
                      data-action="dot-size-reset"
                      onClick={() => onChangeDotScale?.(1.5)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ↺ 150% (Gốc)
                    </button>
                    <button
                      type="button"
                      data-action="dot-size-up"
                      onClick={() =>
                        onChangeDotScale?.(
                          Math.min(3.0, Number((dotScale + 0.2).toFixed(2)))
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ● Chấm to
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ==================== TAB 5: ẨN / HIỆN THANH CÔNG CỤ ==================== */}
            {activeTab === "toolbar" && (
              <>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>
                  Đánh dấu các tính năng bạn muốn xuất hiện trên thanh công cụ chính:
                </div>

                {/* Nhóm 1: Chọn, Tẩy, Hoàn tác */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.groupSelection}
                        onChange={(e) => updateToolbarItem("groupSelection", e.target.checked)}
                        style={{ accentColor: "#2563eb", width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                        Nhóm Chọn, Tẩy & Hoàn tác
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand("selection")}
                      style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}
                    >
                      {expandedGroups.selection ? "▲ Thu gọn" : "▼ Chi tiết"}
                    </button>
                  </div>

                  {expandedGroups.selection && (
                    <div style={{ paddingLeft: 28, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolSelect}
                          onChange={(e) => updateToolbarItem("toolSelect", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Con trỏ chọn & Di chuyển (Select)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolMarquee}
                          onChange={(e) => updateToolbarItem("toolMarquee", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Quét vùng chọn (Marquee)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolEraser}
                          onChange={(e) => updateToolbarItem("toolEraser", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Tẩy xoá nét vẽ (Eraser)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolTrash}
                          onChange={(e) => updateToolbarItem("toolTrash", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Nút Xoá hình đã chọn (Delete)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolUndoRedo}
                          onChange={(e) => updateToolbarItem("toolUndoRedo", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Nút Hoàn tác & Làm lại (Undo / Redo)</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Nhóm 2: Bút vẽ & Công thức & PDF */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.groupDrawing}
                        onChange={(e) => updateToolbarItem("groupDrawing", e.target.checked)}
                        style={{ accentColor: "#2563eb", width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                        Nhóm Bút vẽ, Công thức & Chèn PDF
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand("drawing")}
                      style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}
                    >
                      {expandedGroups.drawing ? "▲ Thu gọn" : "▼ Chi tiết"}
                    </button>
                  </div>

                  {expandedGroups.drawing && (
                    <div style={{ paddingLeft: 28, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolPen}
                          onChange={(e) => updateToolbarItem("toolPen", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Menu Bút vẽ (Bút kim, Bút chì, Bút dạ quang, Bút lông...)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolFormula}
                          onChange={(e) => updateToolbarItem("toolFormula", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Soạn Công thức Toán học (MathLive)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolInsertPdf}
                          onChange={(e) => updateToolbarItem("toolInsertPdf", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Nút Chèn file PDF</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Nhóm 3: Hình học phẳng & Tô màu */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.groupPlaneGeometry}
                        onChange={(e) => updateToolbarItem("groupPlaneGeometry", e.target.checked)}
                        style={{ accentColor: "#2563eb", width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                        Nhóm Hình học phẳng (Điểm, Đoạn, Tam giác, Đa giác...)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand("plane")}
                      style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}
                    >
                      {expandedGroups.plane ? "▲ Thu gọn" : "▼ Chi tiết"}
                    </button>
                  </div>

                  {expandedGroups.plane && (
                    <div style={{ paddingLeft: 28, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolPoint}
                          onChange={(e) => updateToolbarItem("toolPoint", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Điểm (Point)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolSegment}
                          onChange={(e) => updateToolbarItem("toolSegment", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Đoạn thẳng / Đường thẳng / Vectơ</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolCircle}
                          onChange={(e) => updateToolbarItem("toolCircle", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Đường tròn (Circle)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolPolygon}
                          onChange={(e) => updateToolbarItem("toolPolygon", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Đa giác (Polygon)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolPlaneMenu}
                          onChange={(e) => updateToolbarItem("toolPlaneMenu", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Menu dựng hình phẳng nâng cao (Trọng tâm, Trực tâm, Tiếp tuyến...)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolFill}
                          onChange={(e) => updateToolbarItem("toolFill", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Tô màu diện tích (Flood Fill)</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Nhóm 4: Hình không gian & Đồ thị */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.groupSpaceGeometry}
                        onChange={(e) => updateToolbarItem("groupSpaceGeometry", e.target.checked)}
                        style={{ accentColor: "#2563eb", width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                        Nhóm Hình không gian & Hàm số
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand("space")}
                      style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}
                    >
                      {expandedGroups.space ? "▲ Thu gọn" : "▼ Chi tiết"}
                    </button>
                  </div>

                  {expandedGroups.space && (
                    <div style={{ paddingLeft: 28, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolSpaceMenu}
                          onChange={(e) => updateToolbarItem("toolSpaceMenu", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Hình không gian 3D (Chóp, Lăng trụ, Cầu, Nón, Trục Oxyz, Trải hình...)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolFunctionsMenu}
                          onChange={(e) => updateToolbarItem("toolFunctionsMenu", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Hàm số & Bảng biến thiên & Thanh trượt Slider</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolStatsMenu}
                          onChange={(e) => updateToolbarItem("toolStatsMenu", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Thống kê & Xác suất Bayes</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Nhóm 5: Vật lý & Dụng cụ */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={toolbarConfig.groupPhysics}
                        onChange={(e) => updateToolbarItem("groupPhysics", e.target.checked)}
                        style={{ accentColor: "#2563eb", width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                        Nhóm Vật lý & Dụng cụ & Máy tính
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand("physics")}
                      style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}
                    >
                      {expandedGroups.physics ? "▲ Thu gọn" : "▼ Chi tiết"}
                    </button>
                  </div>

                  {expandedGroups.physics && (
                    <div style={{ paddingLeft: 28, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolPhysics}
                          onChange={(e) => updateToolbarItem("toolPhysics", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Bảng công thức, hằng số Vật lý &amp; Đổi đơn vị</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolMathFormulas}
                          onChange={(e) => updateToolbarItem("toolMathFormulas", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Bảng công thức Toán 10–11–12 theo chủ đề</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolChemistryFormulas}
                          onChange={(e) => updateToolbarItem("toolChemistryFormulas", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Bảng công thức Hoá học 10–11–12 theo chủ đề</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolSimLauncher}
                          onChange={(e) => updateToolbarItem("toolSimLauncher", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Thí nghiệm mô phỏng PhET Online &amp; HTML Offline</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolRealWorld}
                          onChange={(e) => updateToolbarItem("toolRealWorld", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Hình minh hoạ thực tế (Cây, Tàu xe, Tháp ngọn hải đăng...)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={toolbarConfig.toolCalculator}
                          onChange={(e) => updateToolbarItem("toolCalculator", e.target.checked)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        <span>Máy tính cầm tay bỏ túi (fx-580VN X)</span>
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ==================== TAB 6: BÚT LASER ==================== */}
            {activeTab === "laser" && (
              <>
                {/* Chế độ vệt / chấm */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>🎯</span>
                    <span>Chế độ hiển thị Laser</span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        mode: "trail",
                        title: "Vệt sáng laser lướt qua",
                        desc: "Vẽ đường sáng nổi bật mờ dần sau 1.5s",
                      },
                      {
                        mode: "dot",
                        title: "Chấm laser cố định",
                        desc: "Chấm tròn đỏ tập trung chú ý theo đầu bút",
                      },
                    ].map((m) => {
                      const selected = laserConfig.mode === m.mode;
                      return (
                        <label
                          key={m.mode}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: selected ? "2px solid #ef4444" : "1px solid #e2e8f0",
                            background: selected ? "#fef2f2" : "#f8fafc",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="laserMode"
                            checked={selected}
                            onChange={() =>
                              onChangeLaserConfig({ ...laserConfig, mode: m.mode as "trail" | "dot" })
                            }
                            style={{ accentColor: "#ef4444", marginTop: 3 }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: selected ? "#b91c1c" : "#0f172a" }}>
                              {m.title}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                              {m.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Kích thước */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>📏</span>
                    <span>Kích thước Laser</span>
                  </div>
                  {laserConfig.mode === "dot" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>Kích thước dấu chấm:</span>
                        <span style={{ fontWeight: 700, color: "#2563eb" }}>{laserConfig.dotSize} px</span>
                      </div>
                      <input
                        type="range"
                        min={6}
                        max={48}
                        step={2}
                        value={laserConfig.dotSize}
                        onChange={(e) =>
                          onChangeLaserConfig({ ...laserConfig, dotSize: Number(e.target.value) })
                        }
                        style={{ accentColor: "#2563eb", width: "100%" }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>Độ rộng vệt laser:</span>
                        <span style={{ fontWeight: 700, color: "#2563eb" }}>{laserConfig.trailWidth} px</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={16}
                        step={1}
                        value={laserConfig.trailWidth}
                        onChange={(e) =>
                          onChangeLaserConfig({ ...laserConfig, trailWidth: Number(e.target.value) })
                        }
                        style={{ accentColor: "#2563eb", width: "100%" }}
                      />
                    </div>
                  )}
                </div>

                {/* Màu sắc */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>🎨</span>
                    <span>Màu sắc Laser</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#a855f7"].map((color) => {
                      const selected = laserConfig.color === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => onChangeLaserConfig({ ...laserConfig, color })}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: color,
                            border: selected ? "3px solid #0f172a" : "2px solid #ffffff",
                            boxShadow: selected
                              ? "0 0 0 2px #94a3b8, 0 2px 6px rgba(0,0,0,0.2)"
                              : "0 2px 5px rgba(0,0,0,0.15)",
                            cursor: "pointer",
                            transition: "transform 0.1s ease",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ==================== TAB 7: XUẤT FILE PDF & PNG ==================== */}
            {activeTab === "export" && (
              <>
                {/* Xuất file */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>💾</span>
                    <span>Tải về & Xuất dữ liệu</span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      data-action="export-pdf"
                      onClick={() => {
                        onClose();
                        onExportPdf?.();
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#1e293b",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>📑</span>
                      <span>Xuất file PDF (Chọn trang)</span>
                    </button>

                    <button
                      type="button"
                      data-action="export-png"
                      disabled={busyPng}
                      onClick={handlePngExport}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#1e293b",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>🖼️</span>
                      <span>{busyPng ? "Đang xuất PNG…" : "Xuất ảnh PNG trang này"}</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ==================== TAB 8: CẬP NHẬT ỨNG DỤNG ==================== */}
            {activeTab === "update" && (
              <>
                {/* Trạng thái phiên bản hiện tại */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={CARD_TITLE_STYLE}>
                      <span style={{ fontSize: 18 }}>🚀</span>
                      <div>
                        <div>PhysBoard v{APP_VERSION}</div>
                        <div style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>
                          Phiên bản hiện tại đang được sử dụng
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-action="check-update"
                      onClick={handleCheckUpdate}
                      disabled={checkingUpdate}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: checkingUpdate ? "#93c5fd" : "#2563eb",
                        color: "#ffffff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: checkingUpdate ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
                      }}
                    >
                      <span>🔄</span>
                      <span>{checkingUpdate ? "Đang kiểm tra..." : "Kiểm tra cập nhật ngay"}</span>
                    </button>
                  </div>

                  {lastCheckedTime && (
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      Lần kiểm tra gần nhất: {lastCheckedTime}
                    </div>
                  )}
                </div>

                {/* Kết quả kiểm tra cập nhật */}
                {updateError && (
                  <div
                    style={{
                      ...CARD_BOX_STYLE,
                      background: "#fef2f2",
                      borderColor: "#fecaca",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#991b1b", fontWeight: 600, fontSize: 13.5 }}>
                      <span>⚠️</span>
                      <span>Không thể kiểm tra bản cập nhật</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#b91c1c" }}>
                      {updateError}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={handleCheckUpdate}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "#ffffff",
                          border: "1px solid #f87171",
                          color: "#991b1b",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Thử lại
                      </button>
                      <a
                        href={GITHUB_RELEASES_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          color: "#475569",
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Xem trực tiếp trên GitHub
                      </a>
                    </div>
                  </div>
                )}

                {updateInfo && !updateError && (
                  <>
                    {updateInfo.isNewer ? (
                      /* Có bản cập nhật mới */
                      <div
                        style={{
                          ...CARD_BOX_STYLE,
                          background: "#eff6ff",
                          borderColor: "#bfdbfe",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1e40af", fontWeight: 700, fontSize: 15 }}>
                          <span>🎉</span>
                          <span>Đã có phiên bản mới: v{updateInfo.version}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#1e3a8a", lineHeight: 1.5 }}>
                          Phiên bản mới nhất mang đến các nâng cấp về hiệu năng vẽ, sửa lỗi và tính năng mới.
                        </div>

                        {/* Direct In-App Auto Download & Install (Tauri Windows / Capacitor Android) */}
                        {runtimePlatform !== "web" &&
                        ((runtimePlatform === "tauri-windows" && updateInfo.windowsSetupUrl) ||
                          (runtimePlatform === "capacitor-android" && updateInfo.androidApkUrl)) ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                            <button
                              type="button"
                              disabled={installingUpdate}
                              onClick={() => handleInstallUpdate(updateInfo)}
                              style={{
                                width: "100%",
                                padding: "11px 16px",
                                borderRadius: 10,
                                border: "none",
                                background: installingUpdate
                                  ? "#94a3b8"
                                  : runtimePlatform === "tauri-windows"
                                  ? "linear-gradient(135deg, #2563eb, #4f46e5)"
                                  : "linear-gradient(135deg, #059669, #0d9488)",
                                color: "#ffffff",
                                fontSize: 13.5,
                                fontWeight: 700,
                                cursor: installingUpdate ? "wait" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.28)",
                              }}
                            >
                              <span>{installingUpdate ? "⏳" : "⬇"}</span>
                              <span>
                                {installingUpdate
                                  ? installStatus || "Đang tải ngầm & chuẩn bị cài đặt..."
                                  : `Cập nhật & Cài đặt ngay v${updateInfo.version}`}
                              </span>
                            </button>

                            {installingUpdate && (
                              <div
                                style={{
                                  width: "100%",
                                  height: 8,
                                  borderRadius: 999,
                                  background: "#dbeafe",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: installProgress !== null ? `${installProgress}%` : "65%",
                                    height: "100%",
                                    background:
                                      runtimePlatform === "tauri-windows"
                                        ? "linear-gradient(90deg, #2563eb, #6366f1)"
                                        : "linear-gradient(90deg, #059669, #14b8a6)",
                                    transition: "width 0.2s ease",
                                  }}
                                />
                              </div>
                            )}

                            {!installingUpdate && installStatus && !installError && (
                              <div style={{ fontSize: 12, color: "#047857", fontWeight: 600 }}>
                                {installStatus}
                              </div>
                            )}

                            {installError && (
                              <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                                ⚠ {installError}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Web browser fallback download buttons */
                          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginTop: 6 }}>
                            {updateInfo.windowsSetupUrl && (
                              <a
                                href={updateInfo.windowsSetupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                style={{
                                  flex: 1,
                                  padding: "10px 14px",
                                  borderRadius: 8,
                                  background: "#2563eb",
                                  color: "#ffffff",
                                  textDecoration: "none",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  textAlign: "center",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 8,
                                  boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
                                }}
                              >
                                <span>🪟</span>
                                <span>Tải bản cài đặt Windows (Setup .exe)</span>
                              </a>
                            )}

                            {updateInfo.androidApkUrl && (
                              <a
                                href={updateInfo.androidApkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                style={{
                                  flex: 1,
                                  padding: "10px 14px",
                                  borderRadius: 8,
                                  background: "#059669",
                                  color: "#ffffff",
                                  textDecoration: "none",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  textAlign: "center",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 8,
                                  boxShadow: "0 2px 6px rgba(5,150,105,0.25)",
                                }}
                              >
                                <span>🤖</span>
                                <span>Tải bản Android (.apk)</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Release body preview */}
                        {updateInfo.body && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: "10px 14px",
                              background: "#ffffff",
                              borderRadius: 8,
                              border: "1px solid #dbeafe",
                              fontSize: 12,
                              color: "#334155",
                              lineHeight: 1.6,
                              maxHeight: 160,
                              overflowY: "auto",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: 4, color: "#1e40af" }}>
                              Nội dung cập nhật:
                            </div>
                            {updateInfo.body}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Đã ở bản mới nhất */
                      <div
                        style={{
                          ...CARD_BOX_STYLE,
                          background: "#f0fdf4",
                          borderColor: "#bbf7d0",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#166534", fontWeight: 700, fontSize: 14 }}>
                          <span>✅</span>
                          <span>Bạn đang sử dụng phiên bản mới nhất (v{APP_VERSION})</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#15803d", lineHeight: 1.5 }}>
                          Ứng dụng của bạn đã được cập nhật tất cả tính năng tối ưu hoá mượt mà và sửa lỗi mới nhất từ nhà phát triển.
                        </div>
                        {/* Download links anyway for reinstalling */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                          {updateInfo.windowsSetupUrl && (
                            <a
                              href={updateInfo.windowsSetupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                background: "#ffffff",
                                border: "1px solid #86efac",
                                color: "#166534",
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              🪟 Tải lại Setup Windows (.exe)
                            </a>
                          )}
                          {updateInfo.androidApkUrl && (
                            <a
                              href={updateInfo.androidApkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                background: "#ffffff",
                                border: "1px solid #86efac",
                                color: "#166534",
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              🤖 Tải lại Android (.apk)
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Hướng dẫn cài đặt & cập nhật */}
                <div style={CARD_BOX_STYLE}>
                  <div style={CARD_TITLE_STYLE}>
                    <span>💡</span>
                    <span>Hướng dẫn cài đặt & cập nhật không bị lỗi</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <strong>🪟 Trên máy tính Windows:</strong>
                      <br />
                      Tải file <code>PhysBoard-Setup-*.exe</code> và mở file để cài đặt. Bộ cài đặt NSIS sẽ tự động cập nhật đè lên bản cũ, tạo lối tắt (shortcut) ngoài màn hình Desktop và trong menu Start để bạn mở app trực tiếp từ icon mà không cần chạy lại file setup.
                    </div>
                    <div>
                      <strong>🤖 Trên điện thoại / máy tính bảng Android:</strong>
                      <br />
                      Tải file <code>PhysBoard-Android.apk</code> về máy và bấm cài đặt để nâng cấp trực tiếp.
                      <br />
                      <span style={{ color: "#d97706", fontWeight: 600 }}>
                        ⚠️ Lưu ý quan trọng khi nâng cấp từ bản cũ v1.0.4 trở xuống:
                      </span>{" "}
                      Do các bản thử nghiệm trước dùng chữ ký tự sinh ngẫu nhiên của CI dẫn đến lỗi <em>&ldquo;Gói không tương thích&rdquo;</em>, bạn chỉ cần gỡ bỏ bản cũ một lần duy nhất trước khi cài đặt v1.0.5. Từ bản v1.0.5 trở đi, ứng dụng đã được khóa cố định chứng chỉ bảo mật, mọi bản cập nhật sau này sẽ được cài đè trực tiếp mượt mà.
                    </div>
                  </div>
                </div>

                {/* Liên kết GitHub */}
                <div style={CARD_BOX_STYLE}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 12.5, color: "#64748b" }}>
                      Mã nguồn mở và các bản phát hành được lưu trữ công khai tại GitHub:
                    </div>
                    <a
                      href={GITHUB_RELEASES_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#1e293b",
                        fontSize: 12.5,
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>🌐</span>
                      <span>Trang GitHub Releases</span>
                    </a>
                  </div>
                </div>
              </>
            )}

            {/* ==================== TAB 9: BÁO LỖI & PHẢN HỒI ==================== */}
            {activeTab === "feedback" && (() => {
              const catMeta = {
                bug: { prefix: "[Bug]", label: "🐛 Báo lỗi (Bug)" },
                feature: { prefix: "[Góp ý]", label: "💡 Góp ý tính năng" },
                ui: { prefix: "[Giao diện]", label: "🎨 Giao diện / Hiển thị" },
              }[fbCategory];

              const platformLabel =
                runtimePlatform === "tauri-windows"
                  ? "Windows Desktop (Tauri)"
                  : runtimePlatform === "capacitor-android"
                  ? "Android App (Capacitor)"
                  : "Web Browser";

              const diagText =
                typeof window !== "undefined"
                  ? [
                      `- Phiên bản: v${APP_VERSION}`,
                      `- Nền tảng: ${platformLabel}`,
                      `- Màn hình: ${window.innerWidth}×${window.innerHeight} (DPR ${window.devicePixelRatio || 1})`,
                      `- Trình duyệt: ${navigator.userAgent}`,
                    ].join("\n")
                  : `- Phiên bản: v${APP_VERSION}`;

              const issueTitle = `${catMeta.prefix} ${fbTitle.trim() || "Phản hồi từ người dùng PhysBoard"}`;
              const attachSection =
                fbImages.length > 0
                  ? [
                      "",
                      `### Ảnh chụp minh hoạ (${fbImages.length} ảnh)`,
                      ...fbImages.map(
                        (img, idx) =>
                          `- ${idx + 1}. \`${img.name}\` (${Math.max(1, Math.round(img.sizeBytes / 1024))} KB)`
                      ),
                      "*(Dán Ctrl+V hoặc kéo thả ảnh từ máy / Clipboard vào khung bên dưới)*",
                    ]
                  : [];

              const issueBody = [
                "### Mô tả chi tiết",
                fbDesc.trim() || "(Người dùng chưa nhập mô tả)",
                ...attachSection,
                ...(fbIncludeDiag ? ["", "### Thông tin thiết bị", diagText] : []),
              ].join("\n");

              const githubIssueUrl = `https://github.com/NeoGao-com/PhysBoard/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
              const mailtoUrl = `mailto:u.gao.com@gmail.com?subject=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
              const zaloUrl = "https://zalo.me/0853769246";

              return (
                <>
                  {/* Quick Zalo Contact Banner for non-technical users */}
                  <div
                    style={{
                      ...CARD_BOX_STYLE,
                      background: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)",
                      border: "1px solid #bae6fd",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: "#0068ff",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: 13,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          Zalo
                        </span>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                            Gửi nhanh qua Zalo: 0853.769.246
                          </div>
                          <div style={{ fontSize: 12, color: "#475569" }}>
                            Không cần tài khoản GitHub hay Email — nhắn &amp; gửi ảnh chụp màn hình trực tiếp qua Zalo.
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText("0853769246").then(() => {
                              showFbNotice("Đã sao chép số Zalo 0853769246 vào bộ nhớ tạm.");
                            }).catch(() => {});
                          }}
                          style={{
                            padding: "7px 11px",
                            borderRadius: 8,
                            border: "1px solid #93c5fd",
                            background: "#ffffff",
                            color: "#1d4ed8",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          📋 Copy SĐT
                        </button>
                        <a
                          data-testid="feedback-zalo-link"
                          href={zaloUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            const fullText = `${issueTitle}\n\n${issueBody}`;
                            navigator.clipboard?.writeText(fullText).catch(() => {});
                            showFbNotice(
                              "Đã mở Zalo (0853769246) & tự động copy sẵn nội dung báo lỗi — sang Zalo bạn chỉ cần Dán rồi gửi nhé!"
                            );
                          }}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 8,
                            background: "#0068ff",
                            color: "#ffffff",
                            fontSize: 12.5,
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          💬 Nhắn Zalo ngay
                        </a>
                      </div>
                    </div>
                  </div>

                  <div style={CARD_BOX_STYLE}>
                    <div style={CARD_TITLE_STYLE}>
                      <span>🐛</span>
                      <span>Gửi báo lỗi hoặc góp ý cải thiện PhysBoard</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
                      Nếu bạn gặp lỗi trong lúc giảng dạy hoặc muốn đề xuất tính năng mới, hãy điền nhanh bên dưới và đính kèm ảnh chụp nếu có.
                    </div>

                    {/* Category pills */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(["bug", "feature", "ui"] as const).map((cat) => {
                        const active = fbCategory === cat;
                        const label =
                          cat === "bug"
                            ? "🐛 Báo lỗi (Bug)"
                            : cat === "feature"
                            ? "💡 Góp ý tính năng"
                            : "🎨 Giao diện / Hiển thị";
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFbCategory(cat)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 999,
                              border: active ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                              background: active ? "#eff6ff" : "#f8fafc",
                              color: active ? "#1d4ed8" : "#475569",
                              fontSize: 12.5,
                              fontWeight: active ? 700 : 600,
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Title input */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>
                        Tiêu đề ngắn gọn
                      </label>
                      <input
                        type="text"
                        value={fbTitle}
                        onChange={(e) => setFbTitle(e.target.value)}
                        placeholder="Ví dụ: Lỗi không phóng to được hình 3D trên máy tính bảng..."
                        style={{
                          padding: "8px 11px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: 13,
                          color: "#0f172a",
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* Description textarea */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>
                        Mô tả chi tiết &amp; cách làm xuất hiện lỗi
                      </label>
                      <textarea
                        value={fbDesc}
                        onChange={(e) => setFbDesc(e.target.value)}
                        rows={3}
                        placeholder="Bạn đang thao tác gì trước khi gặp lỗi? Kết quả mong muốn là gì?"
                        style={{
                          padding: "8px 11px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: 13,
                          color: "#0f172a",
                          resize: "vertical",
                          outline: "none",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>

                    {/* Image Attachments Section */}
                    <div
                      data-testid="feedback-attachments-section"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files?.length) {
                          void addFeedbackImageFiles(e.dataTransfer.files);
                        }
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: 10,
                        borderRadius: 10,
                        border: "1.5px dashed #cbd5e1",
                        background: "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>
                          Ảnh chụp minh hoạ lỗi ({fbImages.length}/{MAX_FEEDBACK_IMAGES})
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <input
                            ref={fbFileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            data-testid="feedback-file-input"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                void addFeedbackImageFiles(e.target.files);
                              }
                              e.target.value = "";
                            }}
                          />
                          <button
                            type="button"
                            data-testid="feedback-upload-btn"
                            disabled={fbImages.length >= MAX_FEEDBACK_IMAGES}
                            onClick={() => fbFileInputRef.current?.click()}
                            style={{
                              height: 30,
                              padding: "0 10px",
                              borderRadius: 7,
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: fbImages.length >= MAX_FEEDBACK_IMAGES ? "#94a3b8" : "#0f172a",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: fbImages.length >= MAX_FEEDBACK_IMAGES ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <ImagePlus size={14} color="#2563eb" />
                            <span>Chọn ảnh từ máy</span>
                          </button>

                          {getBoardElement && (
                            <button
                              type="button"
                              data-testid="feedback-capture-board-btn"
                              disabled={fbCapturingBoard || fbImages.length >= MAX_FEEDBACK_IMAGES}
                              onClick={() => void handleCaptureBoardForFeedback()}
                              style={{
                                height: 30,
                                padding: "0 10px",
                                borderRadius: 7,
                                border: "1px solid #bfdbfe",
                                background: "#eff6ff",
                                color:
                                  fbCapturingBoard || fbImages.length >= MAX_FEEDBACK_IMAGES
                                    ? "#94a3b8"
                                    : "#1d4ed8",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor:
                                  fbCapturingBoard || fbImages.length >= MAX_FEEDBACK_IMAGES
                                    ? "not-allowed"
                                    : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <Camera size={14} />
                              <span>{fbCapturingBoard ? "Đang chụp..." : "Chụp bảng hiện tại"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {fbImages.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Bấm <strong>Chọn ảnh từ máy</strong>, chụp nhanh bảng vẽ, kéo thả ảnh vào đây, hoặc nhấn{" "}
                          <kbd
                            style={{
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              fontSize: 11,
                            }}
                          >
                            Ctrl+V
                          </kbd>{" "}
                          để dán ảnh chụp màn hình.
                        </div>
                      ) : (
                        <div
                          data-testid="feedback-attachments-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                            gap: 8,
                          }}
                        >
                          {fbImages.map((imgItem) => (
                            <div
                              key={imgItem.id}
                              data-testid="feedback-attachment-item"
                              style={{
                                position: "relative",
                                borderRadius: 8,
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                padding: 6,
                                display: "flex",
                                flexDirection: "column",
                                gap: 5,
                              }}
                            >
                              <button
                                type="button"
                                data-testid="feedback-remove-img-btn"
                                title="Xoá ảnh này"
                                onClick={() =>
                                  setFbImages((prev) => prev.filter((it) => it.id !== imgItem.id))
                                }
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  width: 20,
                                  height: 20,
                                  borderRadius: 6,
                                  border: "none",
                                  background: "rgba(15, 23, 42, 0.72)",
                                  color: "#ffffff",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <CloseSmallIcon size={12} />
                              </button>

                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgItem.dataUrl}
                                alt={imgItem.name}
                                style={{
                                  width: "100%",
                                  height: 76,
                                  objectFit: "cover",
                                  borderRadius: 6,
                                  background: "#f1f5f9",
                                  border: "1px solid #e2e8f0",
                                }}
                              />

                              <div
                                title={imgItem.name}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "#334155",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {imgItem.name} ({Math.max(1, Math.round(imgItem.sizeBytes / 1024))} KB)
                              </div>

                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  type="button"
                                  data-testid="feedback-copy-img-btn"
                                  onClick={() => {
                                    void copyDataUrlImageToClipboard(imgItem.dataUrl).then((ok) => {
                                      showFbNotice(
                                        ok
                                          ? `✓ Đã copy "${imgItem.name}" vào Clipboard — nhấn Ctrl+V để dán vào GitHub / Email.`
                                          : "Trình duyệt chưa cấp quyền copy ảnh — hãy dùng nút Tải về bên cạnh."
                                      );
                                    });
                                  }}
                                  style={{
                                    flex: 1,
                                    height: 24,
                                    borderRadius: 5,
                                    border: "1px solid #cbd5e1",
                                    background: "#f8fafc",
                                    color: "#1e293b",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Copy size={11} />
                                  <span>Copy ảnh</span>
                                </button>
                                <button
                                  type="button"
                                  title="Tải ảnh về máy"
                                  onClick={() => downloadFeedbackImage(imgItem)}
                                  style={{
                                    width: 26,
                                    height: 24,
                                    borderRadius: 5,
                                    border: "1px solid #cbd5e1",
                                    background: "#f8fafc",
                                    color: "#334155",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Download size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {fbNotice && (
                        <div
                          data-testid="feedback-notice"
                          style={{
                            padding: "6px 10px",
                            borderRadius: 7,
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {fbNotice}
                        </div>
                      )}
                    </div>

                    {/* Diagnostics checkbox */}
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#334155", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={fbIncludeDiag}
                        onChange={(e) => setFbIncludeDiag(e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span>Tự động đính kèm phiên bản (v{APP_VERSION}) &amp; thông số thiết bị để sửa lỗi nhanh hơn</span>
                    </label>

                    {/* Action buttons */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      <a
                        href={zaloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          const fullText = `${issueTitle}\n\n${issueBody}`;
                          navigator.clipboard?.writeText(fullText).catch(() => {});
                          showFbNotice(
                            "Đã copy nội dung báo lỗi — qua Zalo (0853769246) bạn chỉ cần Dán và gửi kèm ảnh nếu có!"
                          );
                        }}
                        style={{
                          flex: "1 1 170px",
                          padding: "9px 14px",
                          borderRadius: 9,
                          background: "#0068ff",
                          color: "#ffffff",
                          fontSize: 12.5,
                          fontWeight: 700,
                          textDecoration: "none",
                          textAlign: "center",
                          boxShadow: "0 2px 8px rgba(0,104,255,0.22)",
                        }}
                      >
                        💬 Gửi qua Zalo (0853769246)
                      </a>

                      <a
                        data-testid="feedback-github-link"
                        href={githubIssueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (fbImages.length > 0) {
                            void copyDataUrlImageToClipboard(fbImages[0].dataUrl).then((ok) => {
                              showFbNotice(
                                ok
                                  ? "Đã tự động copy ảnh đầu tiên vào Clipboard — sang trang GitHub Issues bạn chỉ cần nhấn Ctrl+V để dán ảnh!"
                                  : "Sang trang GitHub Issues hãy kéo thả hoặc dùng nút Tải về ảnh ở trên để đính kèm."
                              );
                            });
                          }
                        }}
                        style={{
                          flex: "1 1 180px",
                          padding: "9px 14px",
                          borderRadius: 9,
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: 12.5,
                          fontWeight: 700,
                          textDecoration: "none",
                          textAlign: "center",
                          boxShadow: "0 2px 8px rgba(37,99,235,0.22)",
                        }}
                      >
                        🚀 Gửi qua GitHub Issues
                      </a>

                      <a
                        href={mailtoUrl}
                        onClick={() => {
                          if (fbImages.length > 0) {
                            showFbNotice(
                              "Email không tự đính kèm file qua liên kết — hãy dùng nút Tải về hoặc Copy ảnh ở trên để dán vào thư."
                            );
                          }
                        }}
                        style={{
                          flex: "1 1 150px",
                          padding: "9px 14px",
                          borderRadius: 9,
                          background: "#ecfdf5",
                          border: "1px solid #6ee7b7",
                          color: "#047857",
                          fontSize: 12.5,
                          fontWeight: 700,
                          textDecoration: "none",
                          textAlign: "center",
                        }}
                      >
                        ✉ Gửi qua Email
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          const fullText = `${issueTitle}\n\n${issueBody}`;
                          navigator.clipboard?.writeText(fullText).then(() => {
                            setFbCopied(true);
                            setTimeout(() => setFbCopied(false), 2200);
                          }).catch(() => {});
                        }}
                        style={{
                          padding: "9px 14px",
                          borderRadius: 9,
                          border: "1px solid #cbd5e1",
                          background: fbCopied ? "#dcfce7" : "#f8fafc",
                          color: fbCopied ? "#15803d" : "#1e293b",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {fbCopied ? "✓ Đã copy báo cáo" : "📋 Copy báo cáo"}
                      </button>
                    </div>

                    {(onOpenPdfManual || onOpenFeatureGuide) && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: "11px 13px",
                          borderRadius: 10,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontSize: 12.5, color: "#1e3a8a" }}>
                          <strong>📖 Cần xem hướng dẫn chi tiết từng công cụ?</strong>
                          <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
                            Mở sách PDF Cẩm nang toàn tập (100% tính năng + ảnh ①②③) hoặc 20 bài thực hành ngay.
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {onOpenFeatureGuide && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenFeatureGuide();
                              }}
                              style={{
                                padding: "7px 11px",
                                borderRadius: 8,
                                border: "1px solid #93c5fd",
                                background: "#ffffff",
                                color: "#1d4ed8",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              🎓 Mở Hướng dẫn
                            </button>
                          )}
                          {onOpenPdfManual && (
                            <button
                              type="button"
                              data-testid="settings-open-pdf-manual-btn"
                              onClick={() => {
                                onClose();
                                onOpenPdfManual();
                              }}
                              style={{
                                padding: "7px 12px",
                                borderRadius: 8,
                                border: "none",
                                background: "#dc2626",
                                color: "#ffffff",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              📄 Đọc / Tải Sách PDF
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* ===================== FOOTER ===================== */}
          <footer
            style={{
              padding: isMobile ? "10px 14px" : "12px 24px",
              background: "#f8fafc",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: isMobile ? "stretch" : "flex-end",
              gap: 10,
              flexShrink: 0,
            }}
          >
            {isMobile && (
              <button
                type="button"
                onClick={handleResetDefaults}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#dc2626",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ↺ Mặc định
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: isMobile ? 2 : undefined,
                padding: "9px 24px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
              }}
            >
              Hoàn tất
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
};
