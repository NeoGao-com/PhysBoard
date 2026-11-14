"use client";

import React, { useRef, useState } from "react";

export interface OrbitBarProps {
  visible?: boolean;
  azimuth: number;
  elevation: number;
  isAutoSpin?: boolean;
  overlayActive?: boolean;
  onChangeAzimuth: (deg: number) => void;
  onChangeElevation: (deg: number) => void;
  onOrbitDrag?: (dx: number, dy: number) => void;
  onReset: () => void;
  onToggleSpin?: () => void;
  onDone?: () => void;
}

const PILL_BTN_STYLE: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "none",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const OrbitBar: React.FC<OrbitBarProps> = ({
  visible = true,
  azimuth,
  elevation,
  isAutoSpin = false,
  overlayActive = false,
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
      const nextAz = ((azimuth - dx * 0.6 + 180) % 360) - 180;
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
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 56,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 10,
          width: 140,
          padding: "12px 10px",
          borderRadius: 14,
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 12,
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.4)",
          userSelect: "none",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontWeight: 600,
            fontSize: 12,
            color: "#94a3b8",
            paddingBottom: 4,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <span>⟳ Xoay hình</span>
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
            padding: "8px 6px",
            background: draggingHandle ? "#2563eb" : "#1e293b",
            border: "1px solid #3b82f6",
            cursor: draggingHandle ? "grabbing" : "grab",
            touchAction: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontWeight: 600,
            boxShadow: draggingHandle ? "0 0 10px rgba(59, 130, 246, 0.5)" : "none",
          }}
        >
          <span>⟲</span>
          <span>Kéo xoay 3D</span>
        </button>

        {/* Azimuth range slider */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            fontSize: 11,
            color: "#cbd5e1",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Ngang (Azimuth)</span>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>{azimuth}°</span>
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
            style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
          />
        </div>

        {/* Elevation range slider */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            fontSize: 11,
            color: "#cbd5e1",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Nghiêng (Elevation)</span>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>{elevation}°</span>
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
            style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          style={{
            ...PILL_BTN_STYLE,
            width: "100%",
            background: "#334155",
            fontSize: 11.5,
            padding: "5px 6px",
          }}
        >
          Góc ban đầu
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
              background: isAutoSpin ? "#b45309" : "#334155",
              fontSize: 11.5,
              padding: "5px 6px",
            }}
          >
            {isAutoSpin ? "⏸ Dừng quay" : "▶ Tự xoay"}
          </button>
        )}

        {onDone && (
          <button
            type="button"
            onClick={onDone}
            style={{
              ...PILL_BTN_STYLE,
              width: "100%",
              background: "#2563eb",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 6px",
            }}
          >
            ✓ Xong
          </button>
        )}
      </div>
    </>
  );
};
