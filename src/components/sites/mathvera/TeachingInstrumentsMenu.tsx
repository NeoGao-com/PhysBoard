"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconRuler,
  IconSetSquare,
  IconProtractor,
  IconCompassTool,
} from "./ToolbarIcons";

export interface TeachingInstrumentsMenuProps {
  open: boolean;
  onClose: () => void;
  onSelectInstrument: (kind: "ruler" | "setsquare" | "setsquare-45" | "protractor" | "protractor-360" | "compass") => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.04em",
  padding: "6px 12px 3px",
  userSelect: "none",
};

const itemBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "7px 12px",
  border: "none",
  background: "transparent",
  color: "#1e293b",
  fontSize: 12.5,
  fontWeight: 500,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "system-ui, -apple-system, sans-serif",
  borderRadius: 6,
};

export const TeachingInstrumentsMenu: React.FC<TeachingInstrumentsMenuProps> = ({
  open,
  onClose,
  onSelectInstrument,
  anchorRef,
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const menuHeight = 320;
      const opensUpward =
        typeof window !== "undefined" &&
        rect.bottom + menuHeight > window.innerHeight &&
        rect.top > menuHeight;
      setPos({
        top: opensUpward
          ? Math.max(8, rect.top - menuHeight - 6)
          : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 1280) - 300)),
      });
    }
  }, [open, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  const trigger = (kind: "ruler" | "setsquare" | "setsquare-45" | "protractor" | "protractor-360" | "compass") => {
    onSelectInstrument(kind);
    onClose();
  };

  return createPortal(
    <div
      role="menu"
      aria-label="Dụng cụ dạy học"
      data-wb-instruments-menu="true"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: pos?.top ?? 50,
        left: pos?.left ?? 100,
        width: 290,
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.16)",
        padding: "6px 4px",
        zIndex: 5200,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={sectionHeaderStyle}>THƯỚC KẺ &amp; ĐO ĐẠC</div>
      <button
        type="button"
        role="menuitem"
        data-instrument-select="ruler"
        onClick={() => trigger("ruler")}
        style={itemBtnStyle}
      >
        <span style={{ color: "#d97706" }}><IconRuler size={17} /></span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>Thước thẳng chia vạch cm/mm</span>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>Có nam châm hút nét vẽ thẳng theo cạnh</span>
        </div>
      </button>

      <div style={{ height: 1, background: "#f1f5f9", margin: "4px 8px" }} />
      <div style={sectionHeaderStyle}>ÊKE VUÔNG (SET SQUARE)</div>
      <button
        type="button"
        role="menuitem"
        data-instrument-select="setsquare"
        onClick={() => trigger("setsquare")}
        style={itemBtnStyle}
      >
        <span style={{ color: "#ca8a04" }}><IconSetSquare size={17} /></span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>Êke 30°–60°–90°</span>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>Vẽ đường vuông góc &amp; góc 30°/60° chuẩn</span>
        </div>
      </button>
      <button
        type="button"
        role="menuitem"
        data-instrument-select="setsquare-45"
        onClick={() => trigger("setsquare-45")}
        style={itemBtnStyle}
      >
        <span style={{ color: "#ca8a04" }}><IconSetSquare size={17} /></span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>Êke 45°–45°–90° (Tam giác vuông cân)</span>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>Vẽ phân giác &amp; đường vuông góc</span>
        </div>
      </button>

      <div style={{ height: 1, background: "#f1f5f9", margin: "4px 8px" }} />
      <div style={sectionHeaderStyle}>THƯỚC ĐO GÓC &amp; COMPA</div>
      <button
        type="button"
        role="menuitem"
        data-instrument-select="protractor"
        onClick={() => trigger("protractor")}
        style={itemBtnStyle}
      >
        <span style={{ color: "#0284c7" }}><IconProtractor size={17} /></span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>Thước đo góc 180° (Nửa vòng)</span>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>Hiển thị số đo góc tức thời</span>
        </div>
      </button>
      <button
        type="button"
        role="menuitem"
        data-instrument-select="protractor-360"
        onClick={() => trigger("protractor-360")}
        style={itemBtnStyle}
      >
        <span style={{ color: "#0284c7" }}><IconProtractor size={17} /></span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>Thước đo góc 360° (Tròn toàn phần)</span>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>Đo góc lượng giác &amp; góc định hướng</span>
        </div>
      </button>
      <button
        type="button"
        role="menuitem"
        data-instrument-select="compass"
        onClick={() => trigger("compass")}
        style={itemBtnStyle}
      >
        <span style={{ color: "#dc2626" }}><IconCompassTool size={17} /></span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>Compa (Virtual Compass)</span>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>Chân kim, ngòi chì, đổi bán kính &amp; vẽ tròn</span>
        </div>
      </button>
    </div>,
    document.body
  );
};
