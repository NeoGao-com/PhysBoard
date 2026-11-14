"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  SavedHtmlSim,
  getAllSimsFromDB,
  saveSimToDB,
  deleteSimFromDB,
  clearAllSimsFromDB,
} from "@/lib/sim-storage";

export interface HtmlSimModalProps {
  open: boolean;
  onClose: () => void;
  onInsertToCanvas: (sim: { title: string; htmlContent: string; widthPx: number; heightPx: number }) => void;
}

export const HtmlSimModal: React.FC<HtmlSimModalProps> = ({
  open,
  onClose,
  onInsertToCanvas,
}) => {
  const [sims, setSims] = useState<SavedHtmlSim[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSim, setSelectedSim] = useState<SavedHtmlSim | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSims = async () => {
    setLoading(true);
    try {
      const list = await getAllSimsFromDB();
      setSims(list);
      if (list.length > 0 && !selectedSim) {
        setSelectedSim(list[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSims();
    }
  }, [open]);

  if (!open) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text) return;

      // Extract title from <title> tag if present
      const titleMatch = /<title>(.*?)<\/title>/i.exec(text);
      const title = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.[^/.]+$/, "");

      const newSim: SavedHtmlSim = {
        id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        filename: file.name,
        htmlContent: text,
        size: file.size,
        createdAt: Date.now(),
      };

      await saveSimToDB(newSim);
      await loadSims();
      setSelectedSim(newSim);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa bài mô phỏng này khỏi thư viện?")) {
      await deleteSimFromDB(id);
      if (selectedSim?.id === id) {
        setSelectedSim(null);
      }
      await loadSims();
    }
  };

  const handleClearAll = async () => {
    if (sims.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa tất cả ${sims.length} thí nghiệm HTML cũ khỏi thư viện không?`)) {
      await clearAllSimsFromDB();
      setSelectedSim(null);
      await loadSims();
    }
  };

  const handleInsert = (sim: SavedHtmlSim) => {
    onInsertToCanvas({
      title: sim.title,
      htmlContent: sim.htmlContent,
      widthPx: 860,
      heightPx: 560,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-wb-html-sim-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 6500,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(1080px, 96vw)",
          height: "min(720px, 92vh)",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 25px 60px rgba(15, 23, 42, 0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              ⚛ Thư viện Mô phỏng Thí nghiệm HTML Độc lập
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#64748b" }}>
              Nạp bất kỳ file HTML thí nghiệm nào (RK4, Canvas, 3D...) để nhúng trực tiếp lên bảng giảng dạy.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>+ Nạp file HTML từ máy</span>
            </button>

            {sims.length > 0 && (
              <button
                type="button"
                data-action="clear-all-sims"
                onClick={handleClearAll}
                title="Xóa toàn bộ các thí nghiệm HTML đã lưu"
                style={{
                  background: "#fee2e2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>🗑 Xóa hết ({sims.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 20,
                color: "#64748b",
                cursor: "pointer",
                padding: 4,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left: Sim List */}
          <div
            style={{
              width: 340,
              borderRight: "1px solid #e2e8f0",
              overflowY: "auto",
              padding: 12,
              background: "#ffffff",
            }}
          >
            {sims.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 16px",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div>Chưa có bài mô phỏng nào.</div>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Bấm <b>&quot;+ Nạp file HTML từ máy&quot;</b> để thêm file thí nghiệm của bạn.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sims.map((sim) => {
                  const isCur = selectedSim?.id === sim.id;
                  return (
                    <div
                      key={sim.id}
                      onClick={() => setSelectedSim(sim)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: isCur ? "#eff6ff" : "#f8fafc",
                        border: isCur ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 120ms ease",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: isCur ? "#1d4ed8" : "#1e293b",
                          paddingRight: 20,
                          wordBreak: "break-word",
                        }}
                      >
                        {sim.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#64748b",
                          marginTop: 4,
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{(sim.size / 1024).toFixed(1)} KB</span>
                        <span>{new Date(sim.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(sim.id, e)}
                        title="Xóa mô phỏng này"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          border: "none",
                          background: "transparent",
                          color: "#94a3b8",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Preview & Action */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "#0b1120",
              overflow: "hidden",
            }}
          >
            {selectedSim ? (
              <>
                <div
                  style={{
                    padding: "8px 16px",
                    background: "#1e293b",
                    color: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Xem trước trực tiếp: {selectedSim.title}</span>
                  <button
                    type="button"
                    onClick={() => handleInsert(selectedSim)}
                    style={{
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>✓ Thêm vào Bảng</span>
                  </button>
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <iframe
                    title={selectedSim.title}
                    srcDoc={selectedSim.htmlContent}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                  />
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                Chọn một bài mô phỏng bên trái hoặc nạp file mới để xem trước.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
