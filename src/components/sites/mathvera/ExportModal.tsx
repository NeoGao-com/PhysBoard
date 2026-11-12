"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import {
  exportTikZ,
  serializeState,
  loadState,
  downloadText,
} from "@/lib/export";

export interface ExportModalProps {
  open: boolean;
  mode: "tikz" | "json";
  doc: Y.Doc;
  page?: number;
  roomId?: string;
  onClose: () => void;
  onLoadedState?: (count: number) => void;
}

export const ExportModal: React.FC<ExportModalProps> = (props) => {
  if (!props.open) return null;
  return <ExportModalContent key={props.mode} {...props} />;
};

const ExportModalContent: React.FC<ExportModalProps> = ({
  open,
  mode,
  doc,
  page = 1,
  roomId,
  onClose,
  onLoadedState,
}) => {
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [includePreamble, setIncludePreamble] = useState(true);
  const [compactMacros, setCompactMacros] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState(() =>
    mode === "json" ? serializeState(doc, roomId) : ""
  );
  const [jsonStatus, setJsonStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  const tikzCode = useMemo(() => {
    if (!open || mode !== "tikz") return "";
    return exportTikZ(doc, page, {
      blackAndWhite,
      includePreamble,
      compactMacros,
    });
  }, [open, mode, doc, page, blackAndWhite, includePreamble, compactMacros]);

  if (!open) return null;

  const handleCopy = async () => {
    const text = mode === "tikz" ? tikzCode : jsonInput;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    if (mode === "tikz") {
      downloadText(tikzCode, "physboard-tikz.tex", "application/x-tex;charset=utf-8");
    } else {
      downloadText(
        jsonInput || serializeState(doc, roomId),
        "physboard-bai-ve.phys.json",
        "application/json;charset=utf-8"
      );
    }
  };

  const handleApplyJson = () => {
    const result = loadState(doc, jsonInput);
    if (result.ok) {
      setJsonStatus(`✓ Đã khôi phục ${result.count} đối tượng lên bảng.`);
      onLoadedState?.(result.count);
    } else {
      setJsonStatus(`⚠ ${result.error ?? "Dữ liệu JSON không hợp lệ."}`);
    }
  };

  const handleUploadJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    setJsonInput(text);
    const result = loadState(doc, text);
    if (result.ok) {
      setJsonStatus(`✓ Đã nạp ${result.count} đối tượng từ ${file.name}.`);
      onLoadedState?.(result.count);
    } else {
      setJsonStatus(`⚠ ${result.error ?? "File JSON không hợp lệ."}`);
    }
  };

  const secondaryBtnStyle: React.CSSProperties = {
    height: 32,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };

  const primaryBtnStyle: React.CSSProperties = {
    height: 32,
    padding: "0 14px",
    borderRadius: 8,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 6000,
        background: "rgba(15, 23, 42, 0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "tikz" ? "Xuất Code TikZ (LaTeX)" : "Lưu / Nạp trạng thái bảng (JSON)"}
        data-wb-export={mode}
        data-wb-tikz={mode === "tikz" ? "true" : undefined}
        className={mode === "tikz" ? "wb-tikz-modal" : "wb-json-modal"}
        style={{
          width: "min(760px, 100%)",
          maxHeight: "88vh",
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
            {mode === "tikz"
              ? `Code TikZ (LaTeX) — Trang ${page}`
              : "Lưu / Nạp trạng thái bảng (JSON v2)"}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "#64748b",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Options bar for TikZ */}
        {mode === "tikz" && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              fontSize: 12.5,
              color: "#334155",
            }}
          >
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includePreamble}
                onChange={(e) => setIncludePreamble(e.target.checked)}
              />
              Kèm preamble LaTeX
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={blackAndWhite}
                onChange={(e) => setBlackAndWhite(e.target.checked)}
              />
              Đen trắng (in ấn)
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={compactMacros}
                onChange={(e) => setCompactMacros(e.target.checked)}
              />
              Dùng macro tkz-euclide
            </label>
          </div>
        )}

        {/* Code Textarea */}
        <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            readOnly={mode === "tikz"}
            value={mode === "tikz" ? tikzCode : jsonInput}
            onChange={(e) => {
              if (mode === "json") setJsonInput(e.target.value);
            }}
            data-wb-json-code={mode === "json" ? "true" : undefined}
            className={mode === "tikz" ? "wb-tikz-code" : "wb-json-code"}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 320,
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: 12.5,
              lineHeight: 1.5,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          {jsonStatus && (
            <div style={{ fontSize: 12.5, color: jsonStatus.startsWith("✓") ? "#15803d" : "#b91c1c" }}>
              {jsonStatus}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 16px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          {mode === "json" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleUploadJsonFile}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={secondaryBtnStyle}
              >
                📂 Mở file .json
              </button>
              <button
                type="button"
                data-action="load-json"
                onClick={handleApplyJson}
                style={secondaryBtnStyle}
              >
                ↺ Khôi phục bảng
              </button>
            </>
          )}
          <button
            type="button"
            data-action={mode === "tikz" ? "download-tikz" : "download-json"}
            onClick={handleDownload}
            style={secondaryBtnStyle}
          >
            {mode === "tikz" ? "⬇ Tải file .tex" : "⬇ Tải file .json"}
          </button>
          <button
            type="button"
            data-wb-tikz-copy={mode === "tikz" ? "true" : undefined}
            onClick={handleCopy}
            style={primaryBtnStyle}
          >
            {copied ? "✓ Đã chép" : "📋 Chép code"}
          </button>
          <button type="button" onClick={onClose} style={secondaryBtnStyle}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
