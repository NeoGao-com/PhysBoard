"use client";

import React, { useState } from "react";
import * as Y from "yjs";
import { deleteYjsPages, addYjsPage, setYjsCurrentPage } from "./PageBar";

export interface PageManagerModalProps {
  open: boolean;
  onClose: () => void;
  doc: Y.Doc;
  currentPage: number;
  totalPages: number;
}

export const PageManagerModal: React.FC<PageManagerModalProps> = ({
  open,
  onClose,
  doc,
  currentPage,
  totalPages,
}) => {
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!open) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const toggleSelectPage = (p: number) => {
    setSelectedPages((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const selectAll = () => {
    setSelectedPages(pages);
  };

  const deselectAll = () => {
    setSelectedPages([]);
  };

  const handleDeleteSelected = () => {
    if (selectedPages.length === 0) return;
    if (selectedPages.length >= totalPages) {
      window.alert("Không thể xóa toàn bộ trang. Phải giữ lại ít nhất 1 trang!");
      return;
    }
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa ${selectedPages.length} trang đã chọn? Các đối tượng trên những trang này sẽ bị xóa.`
      )
    ) {
      deleteYjsPages(doc, selectedPages);
      setSelectedPages([]);
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedPages.length === 0) return;
    // Duplicate pages by adding new pages and cloning elements
    const arr = doc.getArray<Y.Map<unknown>>("objects");
    doc.transact(() => {
      for (const p of selectedPages) {
        const added = addYjsPage(doc);
        const newPageNum = added.count;
        // Clone elements
        for (let i = 0; i < arr.length; i++) {
          const elMap = arr.get(i);
          const metaMap = elMap.get("meta");
          let pNum = 1;
          if (metaMap instanceof Y.Map) {
            pNum = (metaMap.get("page") as number) || 1;
          } else if (metaMap && typeof metaMap === "object") {
            pNum = ((metaMap as Record<string, unknown>).page as number) || 1;
          }
          if (pNum === p) {
            const clone = elMap.clone();
            const cloneMeta = clone.get("meta");
            const newId = `${clone.get("id")}_dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            clone.set("id", newId);
            if (cloneMeta instanceof Y.Map) {
              cloneMeta.set("page", newPageNum);
            }
            arr.push([clone]);
          }
        }
      }
    });
    setSelectedPages([]);
  };

  if (isMinimized) {
    return (
      <div
        data-export-skip="true"
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          zIndex: 100,
          background: "#0f172a",
          color: "#ffffff",
          borderRadius: 30,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          cursor: "pointer",
        }}
        onClick={() => setIsMinimized(false)}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>📑 Quản lý trang ({totalPages})</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            color: "#fff",
            borderRadius: "50%",
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          ▲
        </button>
      </div>
    );
  }

  return (
    <div
      data-export-skip="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 95,
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 20px 45px rgba(15,23,42,0.22)",
          width: "90%",
          maxWidth: 780,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #cbd5e1",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>📑</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              Trình quản lý trang sổ tay
            </span>
            <span
              style={{
                fontSize: 12,
                color: "#64748b",
                background: "#e2e8f0",
                padding: "2px 8px",
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              {totalPages} trang
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Thu nhỏ cửa sổ"
              style={{
                background: "transparent",
                border: "none",
                fontSize: 14,
                color: "#64748b",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              ➖
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Đóng"
              style={{
                background: "transparent",
                border: "none",
                fontSize: 16,
                color: "#64748b",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar Bar */}
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={selectAll}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={deselectAll}
              disabled={selectedPages.length === 0}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: selectedPages.length === 0 ? "#94a3b8" : "#334155",
                cursor: selectedPages.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Bỏ chọn
            </button>
            {selectedPages.length > 0 && (
              <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
                Đã chọn: {selectedPages.length} trang
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleDuplicateSelected}
              disabled={selectedPages.length === 0}
              style={{
                background: selectedPages.length === 0 ? "#f1f5f9" : "#0284c7",
                border: "none",
                color: selectedPages.length === 0 ? "#94a3b8" : "#ffffff",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: selectedPages.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>📋</span>
              <span>Nhân đôi ({selectedPages.length})</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedPages.length === 0}
              style={{
                background: selectedPages.length === 0 ? "#f1f5f9" : "#ef4444",
                border: "none",
                color: selectedPages.length === 0 ? "#94a3b8" : "#ffffff",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: selectedPages.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>🗑️</span>
              <span>Xóa các trang đã chọn ({selectedPages.length})</span>
            </button>

            <button
              type="button"
              onClick={() => addYjsPage(doc)}
              style={{
                background: "#2563eb",
                border: "none",
                color: "#ffffff",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>+</span>
              <span>Thêm trang mới</span>
            </button>
          </div>
        </div>

        {/* Pages Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 16,
            background: "#f1f5f9",
          }}
        >
          {pages.map((p) => {
            const isCur = p === currentPage;
            const isSel = selectedPages.includes(p);
            return (
              <div
                key={p}
                onClick={() => toggleSelectPage(p)}
                style={{
                  background: "#ffffff",
                  borderRadius: 8,
                  border: isSel
                    ? "2.5px solid #2563eb"
                    : isCur
                      ? "2px solid #0284c7"
                      : "1px solid #cbd5e1",
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  position: "relative",
                  boxShadow: isSel
                    ? "0 0 0 3px rgba(37,99,235,0.2), 0 4px 12px rgba(15,23,42,0.12)"
                    : "0 2px 6px rgba(15,23,42,0.06)",
                  transition: "all 140ms ease",
                }}
              >
                {/* Top bar on card: Checkbox & Page Number */}
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectPage(p);
                    }}
                    style={{ cursor: "pointer", width: 15, height: 15 }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isCur ? "#0284c7" : "#475569",
                    }}
                  >
                    Trang {p} {isCur ? "★" : ""}
                  </span>
                </div>

                {/* Sheet preview representation */}
                <div
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 4,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      height: 12,
                      borderBottom: "1px dashed #bfdbfe",
                      margin: "4px 6px 0",
                    }}
                  />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: 1,
                        background: "#f1f5f9",
                        marginTop: 12,
                        marginLeft: 12,
                        marginRight: 6,
                      }}
                    />
                  ))}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 10,
                      width: 1,
                      background: "rgba(239,68,68,0.3)",
                    }}
                  />

                  {/* Open Page Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setYjsCurrentPage(doc, p);
                      onClose();
                    }}
                    title="Chuyển đến trang này"
                    style={{
                      position: "absolute",
                      bottom: 4,
                      left: 4,
                      right: 4,
                      background: isCur ? "#0284c7" : "rgba(15,23,42,0.85)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 0",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {isCur ? "Đang mở" : "Mở trang"}
                  </button>
                </div>

                {/* Delete single page button */}
                {totalPages > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Xoá trang ${p}?`)) {
                        deleteYjsPages(doc, [p]);
                      }
                    }}
                    title={`Xóa trang ${p}`}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "rgba(239,68,68,0.15)",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: 999,
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Mẹo: Nhấn chọn nhiều trang để xóa hoặc nhân đôi cùng một lúc.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
