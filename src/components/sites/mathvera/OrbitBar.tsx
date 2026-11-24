"use client";

import React, { useRef, useState } from "react";
import { IconCube3D } from "./ToolbarIcons";

export interface OrbitBarProps {
  visible?: boolean;
  azimuth: number;
  elevation: number;
  isAutoSpin?: boolean;
  overlayActive?: boolean;
  isPortrait?: boolean;
  onChangeAzimuth: (deg: number) => void;
  onChangeElevation: (deg: number) => void;
  onOrbitDrag?: (dx: number, dy: number) => void;
  onReset: () => void;
  onToggleSpin?: () => void;
  onDone?: () => void;
}

const PILL_BTN_STYLE: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 11,
  border: "1px solid #e0e7ff",
  background: "#f8fafc",
  color: "#312e81",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontFamily: 'var(--font-anime, "Comfortaa", "Nunito", "Quicksand", system-ui, sans-serif)',
  transition: "transform 0.16s ease, background 0.15s ease, box-shadow 0.16s ease, border-color 0.15s ease",
};

export const OrbitBar: React.FC<OrbitBarProps> = ({
  visible = true,
  azimuth,
  elevation,
  isAutoSpin = false,
  overlayActive = false,
  isPortrait = false,
  onChangeAzimuth,
  onChangeElevation,
  onOrbitDrag,
  onReset,
  onToggleSpin,
  onDone,
}) => {
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [draggingHandle, setDraggingHandle] = useState(false);

  if (!visible) return null;

  const handleDragStep = (dx: number, dy: number) => {
    if (onOrbitDrag) {
      onOrbitDrag(dx, dy);
    } else {
      const nextAz = ((((azimuth - dx * 0.6 + 180) % 360) + 360) % 360) - 180;
      const nextEl = Math.max(-85, Math.min(85, elevation + dy * 0.5));
      onChangeAzimuth(Math.round(nextAz));
      onChangeElevation(Math.round(nextEl));
    }
  };

  return (
    <>
      {overlayActive && (
        <div
          data-wb-orbit="true"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            const dx = e.clientX - dragRef.current.x;
            const dy = e.clientY - dragRef.current.y;
            dragRef.current = { x: e.clientX, y: e.clientY };
            handleDragStep(dx, dy);
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 35,
            cursor: "grab",
            touchAction: "none",
          }}
        />
      )}

      <div
        data-export-skip="true"
        data-wb-orbit-bar="true"
        className="wb-orbit-bar"
        style={{
          position: "fixed",
          right: isPortrait ? 8 : 14,
          top: isPortrait ? "42%" : "50%",
          transform: "translateY(-50%)",
          zIndex: 56,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: isPortrait ? 7 : 9,
          width: isPortrait ? 148 : 168,
          padding: isPortrait ? "10px 9px" : "13px 12px",
          borderRadius: 18,
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1.5px solid #e0e7ff",
          color: "#1e293b",
          fontFamily: 'var(--font-anime, "Comfortaa", "Nunito", "Quicksand", system-ui, sans-serif)',
          fontSize: 12,
          boxShadow:
            "0 14px 34px rgba(99, 102, 241, 0.16), 0 4px 12px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          userSelect: "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            fontWeight: 800,
            fontSize: 13,
            color: "#312e81",
            paddingBottom: 7,
            borderBottom: "1px dashed #e0e7ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            letterSpacing: "-0.2px",
          }}
        >
          <IconCube3D size={16} />
          <span>Xoay hình 3D</span>
        </div>

        {/* Interactive orbital drag handle */}
        <button
          type="button"
          className="wb-orbit-handle"
          title="Kéo chuột / ngón tay để xoay góc nhìn 3D"
          aria-label="Kéo xoay góc nhìn 3D"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = { x: e.clientX, y: e.clientY };
            setDraggingHandle(true);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            const dx = e.clientX - dragRef.current.x;
            const dy = e.clientY - dragRef.current.y;
            dragRef.current = { x: e.clientX, y: e.clientY };
            handleDragStep(dx, dy);
          }}
          onPointerUp={() => {
            dragRef.current = null;
            setDraggingHandle(false);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            setDraggingHandle(false);
          }}
          style={{
            ...PILL_BTN_STYLE,
            width: "100%",
            padding: "8px 8px",
            background: draggingHandle
              ? "linear-gradient(135deg, #38bdf8, #6366f1)"
              : "linear-gradient(135deg, #eff6ff, #eef2ff)",
            color: draggingHandle ? "#ffffff" : "#3730a3",
            border: draggingHandle ? "1.5px solid #6366f1" : "1.5px solid #c7d2fe",
            cursor: draggingHandle ? "grabbing" : "grab",
            touchAction: "none",
            borderRadius: 12,
            boxShadow: draggingHandle
              ? "0 6px 16px rgba(99, 102, 241, 0.35)"
              : "0 2px 6px rgba(99, 102, 241, 0.1)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          <span>Kéo xoay 3D</span>
        </button>

        {/* Azimuth range slider */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 11,
            color: "#475569",
            background: "#f8fafc",
            border: "1px solid #f1f5f9",
            borderRadius: 10,
            padding: "6px 8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>Ngang</span>
            <span
              style={{
                background: "#e0f2fe",
                color: "#0369a1",
                fontWeight: 700,
                fontSize: 10.5,
                padding: "1px 6px",
                borderRadius: 999,
              }}
            >
              {azimuth}°
            </span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={azimuth}
            data-wb-orbit="azimuth"
            aria-label="Góc phương vị"
            onChange={(e) => onChangeAzimuth(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#0284c7", cursor: "pointer" }}
          />
        </div>

        {/* Elevation range slider */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 11,
            color: "#475569",
            background: "#f8fafc",
            border: "1px solid #f1f5f9",
            borderRadius: 10,
            padding: "6px 8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>Nghiêng</span>
            <span
              style={{
                background: "#ede9fe",
                color: "#6d28d9",
                fontWeight: 700,
                fontSize: 10.5,
                padding: "1px 6px",
                borderRadius: 999,
              }}
            >
              {elevation}°
            </span>
          </div>
          <input
            type="range"
            min={-85}
            max={85}
            step={1}
            value={elevation}
            data-wb-orbit="elevation"
            aria-label="Góc nâng"
            onChange={(e) => onChangeElevation(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }}
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          style={{
            ...PILL_BTN_STYLE,
            width: "100%",
            background: "#ffffff",
            borderColor: "#cbd5e1",
            color: "#334155",
            fontSize: 11.5,
            padding: "6px 8px",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Góc ban đầu</span>
        </button>

        {onToggleSpin && (
          <button
            type="button"
            data-wb-orbit-spin="true"
            onClick={onToggleSpin}
            title="Hình tự quay chậm quanh trục đứng, kéo tay thì dừng"
            style={{
              ...PILL_BTN_STYLE,
              width: "100%",
              background: isAutoSpin
                ? "linear-gradient(135deg, #fef3c7, #fde68a)"
                : "#fdf2f8",
              borderColor: isAutoSpin ? "#f59e0b" : "#fbcfe8",
              color: isAutoSpin ? "#b45309" : "#be185d",
              fontSize: 11.5,
              padding: "6px 8px",
              boxShadow: isAutoSpin ? "0 3px 10px rgba(245, 158, 11, 0.25)" : "none",
            }}
          >
            {isAutoSpin ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                <span>Dừng quay</span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5-11-6.5z" />
                </svg>
                <span>Tự xoay 3D</span>
              </>
            )}
          </button>
        )}

        {onDone && (
          <button
            type="button"
            onClick={onDone}
            style={{
              ...PILL_BTN_STYLE,
              width: "100%",
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              border: "none",
              color: "#ffffff",
              fontSize: 12.5,
              fontWeight: 700,
              padding: "8px 8px",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Hoàn tất</span>
          </button>
        )}
      </div>
    </>
  );
};
