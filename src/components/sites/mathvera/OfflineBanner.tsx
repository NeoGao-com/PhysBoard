"use client";

import React, { useEffect, useState } from "react";

export interface OfflineBannerProps {
  isOffline: boolean;
  immediate?: boolean;
  graceDelayMs?: number;
  className?: string;
}

/**
 * Displays a non-intrusive offline indicator pill whenever connectivity is lost.
 * Avoids initial-mount flicker while WebSocket completes its first handshake,
 * unless the browser itself is already offline (`navigator.onLine === false`) or `immediate` is set.
 */
export function OfflineBanner({
  isOffline,
  immediate = false,
  graceDelayMs = 1200,
  className = "",
}: OfflineBannerProps) {
  const [graceElapsed, setGraceElapsed] = useState(false);

  const syncEnabled = process.env.NEXT_PUBLIC_ENABLE_SYNC === "1";

  const browserOffline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  useEffect(() => {
    if (!syncEnabled || !isOffline) {
      const resetTimer = setTimeout(() => setGraceElapsed(false), 0);
      return () => clearTimeout(resetTimer);
    }

    if (immediate || browserOffline) {
      return;
    }

    const timer = setTimeout(() => {
      setGraceElapsed(true);
    }, graceDelayMs);

    return () => clearTimeout(timer);
  }, [syncEnabled, isOffline, immediate, browserOffline, graceDelayMs]);

  const shouldShow =
    syncEnabled && isOffline && (immediate || browserOffline || graceElapsed);

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      data-wb-status="offline"
      data-testid="offline-status"
      data-export-skip="true"
      className={`wb-offline-banner ${className}`.trim()}
      title="Mất kết nối — Đang lưu ngoại tuyến"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 58,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 120,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 9999,
        backgroundColor: "#fef3c7",
        border: "1px solid #f59e0b",
        color: "#92400e",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.10)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#d97706",
          display: "inline-block",
        }}
      />
      <span>Mất kết nối — Đang lưu cục bộ</span>
    </div>
  );
}
