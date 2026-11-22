"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActiveSimSession,
  CustomOnlineSim,
  OfflineSimMeta,
  PHET_CATALOG,
  PhetCatalogItem,
  SIM_SUBJECT_LABELS,
  SimSubject,
  buildPhetOnlineUrl,
  deleteCustomOnlineSim,
  deleteOfflineSim,
  formatBytes,
  getOfflineSimBlob,
  listCustomOnlineSims,
  listOfflineSims,
  parsePhetOrCustomUrl,
  renameOfflineSim,
  saveCustomOnlineSim,
  saveOfflineSimFile,
} from "@/lib/sim-library";

export interface SimLauncherModalProps {
  open: boolean;
  onClose: () => void;
  activeSim: ActiveSimSession | null;
  onResumeActive: () => void;
  onLaunchSession: (session: ActiveSimSession) => void;
}

type TabId = "phet" | "offline";

export const SimLauncherModal: React.FC<SimLauncherModalProps> = ({
  open,
  onClose,
  activeSim,
  onResumeActive,
  onLaunchSession,
}) => {
  const [tab, setTab] = useState<TabId>("phet");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<SimSubject | "all">("all");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [customBookmarks, setCustomBookmarks] = useState<CustomOnlineSim[]>([]);

  const [offlineSims, setOfflineSims] = useState<OfflineSimMeta[]>([]);
  const [loadingOffline, setLoadingOffline] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSubject, setImportSubject] = useState<SimSubject>("physics");
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = useCallback(async () => {
    setCustomBookmarks(listCustomOnlineSims());
    setLoadingOffline(true);
    try {
      const metas = await listOfflineSims();
      setOfflineSims(metas);
    } finally {
      setLoadingOffline(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setUrlError(null);
      setOfflineError(null);
      refreshData();
    }
  }, [open, refreshData]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PHET_CATALOG.filter((item) => {
      if (subjectFilter !== "all" && item.subject !== subjectFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.enTitle.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q)
      );
    });
  }, [search, subjectFilter]);

  const filteredOffline = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offlineSims.filter((item) => {
      if (subjectFilter !== "all" && item.subject !== subjectFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q)
      );
    });
  }, [offlineSims, search, subjectFilter]);

  const handleLaunchPhetPreset = (item: PhetCatalogItem) => {
    onLaunchSession({
      id: `phet_${item.slug}_${Date.now()}`,
      title: item.title,
      subtitle: `${item.topic}${item.grade ? ` • Lớp ${item.grade}` : ""} • PhET Online`,
      sourceKind: "phet-online",
      iframeSrc: buildPhetOnlineUrl(item.slug, "vi"),
      isBlobUrl: false,
    });
    onClose();
  };

  const handleLaunchCustomUrl = (e?: React.FormEvent) => {
    e?.preventDefault();
    setUrlError(null);
    const parsed = parsePhetOrCustomUrl(customUrlInput);
    if (!parsed) {
      setUrlError("Vui lòng nhập link PhET hợp lệ (ví dụ: https://phet.colorado.edu/vi/simulations/pendulum-lab hoặc slug pendulum-lab).");
      return;
    }
    const updated = saveCustomOnlineSim({
      title: parsed.title,
      url: parsed.url,
      slug: parsed.slug,
    });
    setCustomBookmarks(updated);
    setCustomUrlInput("");
    onLaunchSession({
      id: `online_${Date.now()}`,
      title: parsed.title,
      subtitle: parsed.isPhet ? "PhET Online" : "Web Mô phỏng Online",
      sourceKind: parsed.isPhet ? "phet-online" : "custom-online",
      iframeSrc: parsed.url,
      isBlobUrl: false,
    });
    onClose();
  };

  const handleLaunchBookmark = (bm: CustomOnlineSim) => {
    onLaunchSession({
      id: `bm_${bm.id}_${Date.now()}`,
      title: bm.title,
      subtitle: bm.slug ? "PhET Online" : "Link Online đã lưu",
      sourceKind: bm.slug ? "phet-online" : "custom-online",
      iframeSrc: bm.url,
      isBlobUrl: false,
    });
    onClose();
  };

  const handleImportFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) =>
        f.name.toLowerCase().endsWith(".html") ||
        f.name.toLowerCase().endsWith(".htm") ||
        f.type === "text/html"
    );
    if (files.length === 0) {
      setOfflineError("Vui lòng chọn file định dạng .html hoặc .htm (ví dụ file tải từ PhET).");
      return;
    }
    setOfflineError(null);
    setImporting(true);
    try {
      for (const file of files) {
        await saveOfflineSimFile(file, importSubject);
      }
      const metas = await listOfflineSims();
      setOfflineSims(metas);
    } catch (err) {
      setOfflineError(
        err instanceof Error ? err.message : "Không thể lưu file HTML vào bộ nhớ IndexedDB."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleLaunchOffline = async (meta: OfflineSimMeta) => {
    setOfflineError(null);
    setLaunchingId(meta.id);
    try {
      const blob = await getOfflineSimBlob(meta.id);
      if (!blob) {
        setOfflineError("Không tìm thấy dữ liệu file trong bộ nhớ. Vui lòng nạp lại file.");
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      onLaunchSession({
        id: `offline_${meta.id}_${Date.now()}`,
        title: meta.title,
        subtitle: `Offline HTML • ${formatBytes(meta.sizeBytes)}`,
        sourceKind: "offline-html",
        iframeSrc: blobUrl,
        isBlobUrl: true,
        offlineId: meta.id,
      });
      onClose();
    } catch (err) {
      setOfflineError(
        err instanceof Error ? err.message : "Không thể khởi chạy file HTML offline."
      );
    } finally {
      setLaunchingId(null);
    }
  };

  const handleDeleteOffline = async (id: string) => {
    await deleteOfflineSim(id);
    setOfflineSims((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCommitRename = async (id: string) => {
    const trimmed = renameDraft.trim();
    if (trimmed) {
      await renameOfflineSim(id, trimmed);
      setOfflineSims((prev) =>
        prev.map((item) => (item.id === id ? { ...item, title: trimmed } : item))
      );
    }
    setRenamingId(null);
    setRenameDraft("");
  };

  if (!open) return null;

  return (
    <div
      data-testid="sim-launcher-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9995,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(920px, 100%)",
          maxHeight: "min(88vh, 760px)",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              ⚗
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: "#0f172a" }}>
                Thí nghiệm Mô phỏng PhET &amp; HTML
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                Chạy toàn màn hình như cửa sổ độc lập • Hỗ trợ PhET Online &amp; file .html Offline
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Active kept-alive session banner */}
        {activeSim && (
          <div
            style={{
              padding: "9px 18px",
              background: "#ecfdf5",
              borderBottom: "1px solid #a7f3d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 12.5, color: "#065f46" }}>
              <strong>Đang chạy ngầm:</strong> {activeSim.title}{" "}
              <span style={{ color: "#047857" }}>
                (mở thí nghiệm mới sẽ đóng thí nghiệm này để tối ưu RAM)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onResumeActive();
              }}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "none",
                background: "#059669",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mở lại ngay
            </button>
          </div>
        )}

        {/* Tabs + Search + Subject Filter */}
        <div
          style={{
            padding: "12px 18px 10px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                background: "#f1f5f9",
                padding: 3,
                borderRadius: 10,
                gap: 4,
              }}
            >
              <button
                type="button"
                data-sim-tab="phet"
                onClick={() => setTab("phet")}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: tab === "phet" ? "#ffffff" : "transparent",
                  color: tab === "phet" ? "#1d4ed8" : "#475569",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: tab === "phet" ? "0 1px 3px rgba(15,23,42,0.12)" : "none",
                }}
              >
                🌐 Kho PhET Online ({PHET_CATALOG.length})
              </button>
              <button
                type="button"
                data-sim-tab="offline"
                onClick={() => setTab("offline")}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: tab === "offline" ? "#ffffff" : "transparent",
                  color: tab === "offline" ? "#0f766e" : "#475569",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: tab === "offline" ? "0 1px 3px rgba(15,23,42,0.12)" : "none",
                }}
              >
                💾 File HTML Offline ({offlineSims.length})
              </button>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên thí nghiệm, chủ đề..."
              style={{
                flex: "1 1 220px",
                maxWidth: 320,
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                color: "#0f172a",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {(["all", "physics", "chemistry", "math", "other"] as const).map((subj) => {
              if (tab === "phet" && subj === "other") return null;
              const active = subjectFilter === subj;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSubjectFilter(subj)}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 999,
                    border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
                    background: active ? "#eff6ff" : "#f8fafc",
                    color: active ? "#1d4ed8" : "#475569",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {SIM_SUBJECT_LABELS[subj]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 18px" }}>
          {tab === "phet" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Direct PhET URL / slug launcher */}
              <form
                onSubmit={handleLaunchCustomUrl}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>
                  Mở trực tiếp từ link PhET bất kỳ (tự động dùng bản <code>_all.html?locale=vi</code>)
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="Dán link phet.colorado.edu/... hoặc tên slug (vd: pendulum-lab)"
                    style={{
                      flex: "1 1 280px",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      color: "#0f172a",
                      background: "#ffffff",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "#2563eb",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mở toàn màn hình →
                  </button>
                </div>
                {urlError && (
                  <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>{urlError}</div>
                )}

                {customBookmarks.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                    {customBookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 999,
                          padding: "3px 8px 3px 10px",
                          fontSize: 12,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleLaunchBookmark(bm)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#1d4ed8",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0,
                          }}
                          title={bm.url}
                        >
                          {bm.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomBookmarks(deleteCustomOnlineSim(bm.id))}
                          aria-label="Xoá bookmark"
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "0 2px",
                            fontSize: 11,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </form>

              {/* Curated PhET Catalog Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(245px, 1fr))",
                  gap: 10,
                }}
              >
                {filteredCatalog.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    data-phet-slug={item.slug}
                    onClick={() => handleLaunchPhetPreset(item)}
                    style={{
                      textAlign: "left",
                      padding: "12px 13px",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#93c5fd";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 999,
                          background:
                            item.subject === "physics"
                              ? "#ede9fe"
                              : item.subject === "chemistry"
                              ? "#dcfce7"
                              : "#dbeafe",
                          color:
                            item.subject === "physics"
                              ? "#6d28d9"
                              : item.subject === "chemistry"
                              ? "#15803d"
                              : "#1d4ed8",
                        }}
                      >
                        {item.topic}
                      </span>
                      {item.grade && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b" }}>
                          Lớp {item.grade}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>{item.enTitle}</div>
                  </button>
                ))}
              </div>

              {filteredCatalog.length === 0 && (
                <div style={{ textAlign: "center", padding: 28, color: "#64748b", fontSize: 13 }}>
                  Không tìm thấy thí nghiệm phù hợp. Bạn có thể dán trực tiếp link PhET vào ô phía trên.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Offline HTML Upload / Drag-and-drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.length) {
                    handleImportFiles(e.dataTransfer.files);
                  }
                }}
                style={{
                  border: `2px dashed ${isDragging ? "#0d9488" : "#cbd5e1"}`,
                  background: isDragging ? "#f0fdfa" : "#f8fafc",
                  borderRadius: 12,
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                  Kéo thả hoặc chọn file <code>.html</code> tải từ PhET (chạy 100% Offline)
                </div>
                <div style={{ fontSize: 12, color: "#64748b", maxWidth: 520 }}>
                  File được lưu dạng Blob trong IndexedDB và chạy bằng Blob URL để tiết kiệm RAM trên Android WebView.
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  <select
                    value={importSubject}
                    onChange={(e) => setImportSubject(e.target.value as SimSubject)}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: 12.5,
                      color: "#0f172a",
                      fontWeight: 600,
                    }}
                  >
                    <option value="physics">Môn: Vật lý</option>
                    <option value="chemistry">Môn: Hoá học</option>
                    <option value="math">Môn: Toán học</option>
                    <option value="other">Môn: Khác</option>
                  </select>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,text/html"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleImportFiles(e.target.files);
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "#0f766e",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: importing ? "wait" : "pointer",
                      opacity: importing ? 0.7 : 1,
                    }}
                  >
                    {importing ? "Đang lưu vào IndexedDB..." : "+ Chọn file .html từ máy"}
                  </button>
                </div>

                {offlineError && (
                  <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>
                    {offlineError}
                  </div>
                )}
              </div>

              {/* Saved Offline HTML List */}
              {loadingOffline ? (
                <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 13 }}>
                  Đang tải danh sách file offline...
                </div>
              ) : filteredOffline.length === 0 ? (
                <div style={{ textAlign: "center", padding: 28, color: "#64748b", fontSize: 13 }}>
                  Chưa có file thí nghiệm HTML nào trong kho offline. Hãy chọn các file <code>.html</code> bạn đã tải từ PhET ở khung trên.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredOffline.map((meta) => (
                    <div
                      key={meta.id}
                      style={{
                        padding: "11px 13px",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                        {renamingId === meta.id ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              type="text"
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCommitRename(meta.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              autoFocus
                              style={{
                                flex: 1,
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px solid #2563eb",
                                fontSize: 13,
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleCommitRename(meta.id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                background: "#2563eb",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Lưu
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                            {meta.title}
                          </div>
                        )}
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                          {SIM_SUBJECT_LABELS[meta.subject]} • {meta.fileName} •{" "}
                          {formatBytes(meta.sizeBytes)}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          disabled={launchingId === meta.id}
                          onClick={() => handleLaunchOffline(meta)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 8,
                            border: "none",
                            background: "#0f766e",
                            color: "#ffffff",
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: launchingId === meta.id ? "wait" : "pointer",
                          }}
                        >
                          {launchingId === meta.id ? "Đang mở..." : "▶ Mở toàn màn hình"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(meta.id);
                            setRenameDraft(meta.title);
                          }}
                          title="Đổi tên"
                          style={{
                            padding: "6px 9px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            color: "#334155",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOffline(meta.id)}
                          title="Xoá khỏi kho offline"
                          style={{
                            padding: "6px 9px",
                            borderRadius: 8,
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#dc2626",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
