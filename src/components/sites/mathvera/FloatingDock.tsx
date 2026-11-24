"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ModularBlockId } from "@/lib/modular-toolbar";

export interface FloatingDockProps {
  id: ModularBlockId;
  title: string;
  position: { x: number; y: number };
  onMove: (pos: { x: number; y: number }) => void;
  onDock: () => void;
  children: React.ReactNode;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  id,
  title,
  position,
  onMove,
  onDock,
  children,
}) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCleanupRef.current?.();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = position.x;
    const initY = position.y;
    let latestPos = { x: initX, y: initY };

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const maxX = Math.max(10, window.innerWidth - (dockRef.current?.offsetWidth || 200) - 10);
      const maxY = Math.max(10, window.innerHeight - 50);
      const nextX = Math.round(Math.max(10, Math.min(maxX, initX + dx)));
      const nextY = Math.round(Math.max(10, Math.min(maxY, initY + dy)));
      latestPos = { x: nextX, y: nextY };
      if (dockRef.current) {
        dockRef.current.style.left = `${nextX}px`;
        dockRef.current.style.top = `${nextY}px`;
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (dragCleanupRef.current === cleanup) {
        dragCleanupRef.current = null;
      }
    };

    const onPointerUp = () => {
      cleanup();
      onMove(latestPos);
    };

    dragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dockRef}
      data-wb-floating-dock={id}
      data-export-skip="true"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 68,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 6px",
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(203, 213, 225, 0.9)",
        borderRadius: 14,
        boxShadow:
          "0 12px 32px rgba(99, 102, 241, 0.16), 0 3px 12px rgba(15, 23, 42, 0.08)",
        fontFamily:
          'var(--font-anime, "Comfortaa", "Nunito", "Quicksand", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)',
        userSelect: "none",
      }}
    >
      {/* Drag & Header */}
      <div
        onPointerDown={handlePointerDown}
        title="Kéo di chuyển mô-đun nổi"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          cursor: "grab",
          padding: "2px 4px",
          background: "#f1f5f9",
          borderRadius: 6,
          color: "#475569",
          fontSize: 11,
          fontWeight: 700,
          marginRight: 2,
        }}
      >
        <span style={{ fontSize: 11, color: "#94a3b8" }}>⋮⋮</span>
        <span>{title}</span>
      </div>

      {/* Children Tools */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        {children}
      </div>

      {/* Dock Back Button */}
      <button
        type="button"
        onClick={onDock}
        title="Ghim lại vào thanh công cụ chính"
        style={{
          height: 24,
          padding: "0 6px",
          border: "none",
          background: "#e0f2fe",
          color: "#0284c7",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          marginLeft: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <span>⤓</span>
        <span>Ghim</span>
      </button>
    </div>,
    document.body
  );
};
