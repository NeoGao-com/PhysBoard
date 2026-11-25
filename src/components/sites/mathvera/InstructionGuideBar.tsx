"use client";

import React, { useState } from "react";
import { ToolGuideInfo } from "@/lib/tool-guides";

export interface InstructionGuideBarProps {
  guide: ToolGuideInfo;
  enabled: boolean;
  onToggleEnabled: () => void;
  isSidebarOpen?: boolean;
  isPortrait?: boolean;
  hasActiveStatusHint?: boolean;
  onClearStatusHint?: () => void;
}

export const InstructionGuideBar: React.FC<InstructionGuideBarProps> = ({
  guide,
  enabled,
  onToggleEnabled,
  isSidebarOpen = false,
  isPortrait = false,
  hasActiveStatusHint = false,
  onClearStatusHint,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!enabled && !hasActiveStatusHint) return null;

  return (
    <aside
      data-wb-instruction-guide="true"
      data-export-skip="true"
      role="region"
      aria-label="Chỉ dẫn sử dụng chức năng"
      style={{
        position: "fixed",
        top: 52,
        left: isPortrait ? "50%" : isSidebarOpen ? "calc(50% + 70px)" : "50%",
        transform: "translateX(-50%)",
        zIndex: 65,
        display: "inline-flex",
        alignItems: "center",
        maxWidth: "min(92vw, 840px)",
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(203, 213, 225, 0.9)",
        borderRadius: 999,
        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.09), 0 1px 3px rgba(0, 0, 0, 0.04)",
        padding: isCollapsed ? "4px 8px 4px 10px" : "5px 10px 5px 12px",
        gap: 8,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 12.5,
        color: "#1e293b",
        userSelect: "none",
        pointerEvents: "auto",
        transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Bulb Indicator */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "#fef3c7",
          color: "#d97706",
          fontSize: 12,
          flexShrink: 0,
          boxShadow: "0 0 6px rgba(245, 158, 11, 0.3)",
        }}
        title="Chỉ dẫn sử dụng chức năng"
      >
        💡
      </div>

      {/* Tool Badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "#eff6ff",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
          borderRadius: 999,
          padding: "1.5px 8px",
          fontWeight: 700,
          fontSize: 11.5,
          flexShrink: 0,
          letterSpacing: "0.02em",
        }}
      >
        <span>{guide.icon}</span>
        <span>{guide.badge || guide.title}</span>
      </span>

      {/* Instruction Text */}
      {!isCollapsed && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontWeight: 500,
              color: "#334155",
              lineHeight: 1.3,
            }}
          >
            {guide.desc}
          </span>

          {guide.shortcut && (
            <span
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 10.5,
                fontWeight: 600,
                color: "#64748b",
                fontFamily: "monospace",
                flexShrink: 0,
              }}
              title="Phím tắt kích hoạt nhanh"
            >
              {guide.shortcut}
            </span>
          )}
        </div>
      )}

      {/* Collapse / Expand Toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        title={isCollapsed ? "Mở rộng nội dung chỉ dẫn" : "Thu gọn bớt dòng chỉ dẫn"}
        style={{
          border: "none",
          background: "transparent",
          color: "#94a3b8",
          cursor: "pointer",
          padding: "2px 4px",
          borderRadius: 4,
          fontSize: 11,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isCollapsed ? "▾" : "▴"}
      </button>

      {/* Abort Active Construction Step Button */}
      {hasActiveStatusHint && onClearStatusHint && (
        <button
          type="button"
          onClick={onClearStatusHint}
          title="Hủy thao tác dựng hình đang thực hiện"
          style={{
            border: "none",
            background: "#fee2e2",
            color: "#b91c1c",
            cursor: "pointer",
            padding: "2px 7px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
        >
          <span>✕</span>
          <span style={{ fontSize: 10.5 }}>Hủy bước</span>
        </button>
      )}

      {/* Close / Turn Off Button */}
      {enabled && (
        <button
          type="button"
          onClick={onToggleEnabled}
          title="Tắt dòng chỉ dẫn (bạn có thể bật lại trong Cài đặt hệ thống bất cứ lúc nào)"
          style={{
            border: "none",
            background: "#f1f5f9",
            color: "#64748b",
            cursor: "pointer",
            padding: "2px 7px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
        >
          <span>✕</span>
          <span style={{ fontSize: 10.5 }}>Tắt</span>
        </button>
      )}
    </aside>
  );
};
