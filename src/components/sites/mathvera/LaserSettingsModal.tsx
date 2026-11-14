"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { LaserConfig, LaserMode } from "@/lib/laser-config";

export interface LaserSettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: LaserConfig;
  onChangeConfig: (newCfg: LaserConfig) => void;
}

const PRESET_COLORS = [
  { label: "Đỏ", hex: "#ef4444" },
  { label: "Vàng", hex: "#eab308" },
  { label: "Xanh lá", hex: "#10b981" },
  { label: "Xanh dương", hex: "#3b82f6" },
  { label: "Tím", hex: "#a855f7" },
];

export const LaserSettingsModal: React.FC<LaserSettingsModalProps> = ({
  open,
  onClose,
  config,
  onChangeConfig,
}) => {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cài đặt con trỏ Laser"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: "92vw",
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          padding: 20,
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔴</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Cài đặt Bút chỉ Laser
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Chế độ hiển thị: Dấu chấm hay Vệt sáng */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
            Chế độ hoạt động
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, mode: "dot" })}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: config.mode === "dot" ? "2px solid #ef4444" : "1px solid #cbd5e1",
                background: config.mode === "dot" ? "#fef2f2" : "#f8fafc",
                color: config.mode === "dot" ? "#b91c1c" : "#475569",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 18 }}>•</span>
              <span>1 Dấu chấm (Spot)</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, mode: "trail" })}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: config.mode === "trail" ? "2px solid #ef4444" : "1px solid #cbd5e1",
                background: config.mode === "trail" ? "#fef2f2" : "#f8fafc",
                color: config.mode === "trail" ? "#b91c1c" : "#475569",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 18 }}>〰️</span>
              <span>Vệt sáng tự mờ (Trail)</span>
            </button>
          </div>
        </div>

        {/* Thanh trượt kích thước */}
        {config.mode === "dot" ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                Kích thước dấu chấm:
              </label>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                {config.dotSize}px
              </span>
            </div>
            <input
              type="range"
              min={6}
              max={42}
              step={2}
              value={config.dotSize}
              onChange={(e) => onChangeConfig({ ...config, dotSize: Number(e.target.value) })}
              style={{ width: "100%", accentColor: config.color, cursor: "pointer" }}
            />
            {/* Live preview */}
            <div
              style={{
                marginTop: 10,
                height: 52,
                background: "#0f172a",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: config.dotSize,
                  height: config.dotSize,
                  borderRadius: "50%",
                  background: config.color,
                  boxShadow: `0 0 8px ${config.color}, 0 0 16px ${config.color}`,
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                Độ dày nét laser:
              </label>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                {config.trailWidth}px
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={16}
              step={1}
              value={config.trailWidth}
              onChange={(e) => onChangeConfig({ ...config, trailWidth: Number(e.target.value) })}
              style={{ width: "100%", accentColor: config.color, cursor: "pointer" }}
            />
            {/* Live preview */}
            <div
              style={{
                marginTop: 10,
                height: 52,
                background: "#0f172a",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 140,
                  height: config.trailWidth,
                  borderRadius: config.trailWidth / 2,
                  background: config.color,
                  boxShadow: `0 0 8px ${config.color}, 0 0 16px ${config.color}`,
                }}
              />
            </div>
          </div>
        )}

        {/* Màu sắc Laser */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
            Màu sắc Laser
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {PRESET_COLORS.map((c) => {
              const active = config.color === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => onChangeConfig({ ...config, color: c.hex })}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: c.hex,
                    border: active ? "3px solid #0f172a" : "2px solid transparent",
                    cursor: "pointer",
                    boxShadow: active ? `0 0 8px ${c.hex}` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 18px",
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
