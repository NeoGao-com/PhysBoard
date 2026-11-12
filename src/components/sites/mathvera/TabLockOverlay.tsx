"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from "@/lib/room";

export interface TabLockOverlayProps {
  onRetry?: () => void;
  onLogout?: () => void;
}

/**
 * Fullscreen single-tab lock overlay matching Mathvera design reference 23-single-tab-lock.png.
 */
export function TabLockOverlay({ onRetry, onLogout }: TabLockOverlayProps) {
  const router = useRouter();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      } catch {
        // Ignore storage cleanup error
      }
      router.push("/");
    }
  };

  return (
    <div
      data-wb-lock-screen="true"
      data-testid="tab-lock"
      className="wb-tab-lock"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wb-tab-lock-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: "#f8fafc",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            fontSize: 40,
            lineHeight: 1,
            marginBottom: 14,
          }}
        >
          🔒
        </div>

        <h2
          id="wb-tab-lock-title"
          style={{
            margin: "0 0 8px 0",
            fontSize: 20,
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          Bảng đang mở ở nơi khác
        </h2>

        <p
          style={{
            margin: "0 0 22px 0",
            fontSize: 14,
            lineHeight: 1.55,
            color: "#475569",
          }}
        >
          Mỗi tài khoản chỉ mở được bảng này trên 1 tab/thiết bị. Đóng tab/thiết bị kia rồi bấm “Thử lại”.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            data-action="retry-lock"
            onClick={handleRetry}
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>

          <button
            type="button"
            data-action="logout"
            onClick={handleLogout}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
