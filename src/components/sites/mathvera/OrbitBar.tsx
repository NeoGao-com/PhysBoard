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
          left: "50%",
          bottom: 12,
          transform: "translateX(-50%)",
          zIndex: 56,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          maxWidth: "calc(100vw - 24px)",
          padding: "8px 12px 8px 14px",
          borderRadius: 12,
          background: "#0f172a",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 13,
          boxShadow: "0 6px 20px rgba(15,23,42,0.35)",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>
          ⟳ Kéo để xoay hình · hình trên bảng không đổi
        </span>

        {/* Interactive orbital drag handle */}
        <button
          type="button"
          className="wb-orbit-handle"
          title="Kéo để xoay góc nhìn 3D"
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
            background: draggingHandle ? "#1d4ed8" : "#1e293b",
            border: "1px solid #475569",
            cursor: draggingHandle ? "grabbing" : "grab",
            touchAction: "none",
          }}
        >
          ⟲ Xoay
        </button>

        {/* Azimuth range slider */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#cbd5e1",
          }}
        >
          <span>Ngang</span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={azimuth}
            data-wb-orbit="azimuth"
            aria-label="Góc phương vị"
            onChange={(e) => onChangeAzimuth(Number(e.target.value))}
            style={{ width: 92, accentColor: "#38bdf8", cursor: "pointer" }}
          />
        </label>

        {/* Elevation range slider */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#cbd5e1",
          }}
        >
          <span>Nghiêng</span>
          <input
            type="range"
            min={-85}
            max={85}
            step={1}
            value={elevation}
            data-wb-orbit="elevation"
            aria-label="Góc nâng"
            onChange={(e) => onChangeElevation(Number(e.target.value))}
            style={{ width: 84, accentColor: "#38bdf8", cursor: "pointer" }}
          />
        </label>

        <button
          type="button"
          onClick={onReset}
          style={{ ...PILL_BTN_STYLE, background: "#334155" }}
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
              background: isAutoSpin ? "#b45309" : "#334155",
            }}
          >
            {isAutoSpin ? "⏸ Dừng" : "▶ Tự xoay"}
          </button>
        )}

        {onDone && (
          <button
            type="button"
            onClick={onDone}
            style={{ ...PILL_BTN_STYLE, background: "#2563eb" }}
          >
            Xong
          </button>
        )}
      </div>
    </>
  );
};
