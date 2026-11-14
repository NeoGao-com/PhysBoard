"use client";

import React, { useState } from "react";
import { CanvasElement } from "@/types/whiteboard";

export interface HtmlSimElementProps {
  element: CanvasElement;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onUpdateProps?: (id: string, props: Record<string, unknown>) => void;
}

export const HtmlSimElement: React.FC<HtmlSimElementProps> = ({
  element,
  scale = 45,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
}) => {
  const htmlContent = typeof element.props?.htmlContent === "string" ? element.props.htmlContent : "";
  const title = typeof element.props?.title === "string" ? element.props.title : "Mô phỏng Thí nghiệm";
  const widthPx = typeof element.props?.widthPx === "number" ? element.props.widthPx : 860;
  const heightPx = typeof element.props?.heightPx === "number" ? element.props.heightPx : 560;
  
  // Interactive mode toggle: when interactive, iframe captures pointer events; when not, whiteboard handles moving/resizing
  const [interactive, setInteractive] = useState(false);

  const invScale = (element.transform.scale || 1) / (scale || 45);

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="HtmlSim"
      data-wb-type="HtmlSim"
      className="wb-html-sim"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${element.transform.x} ${-element.transform.y}) scale(${invScale})`}
      onPointerDown={onPointerDown}
    >
      <foreignObject
        x={0}
        y={0}
        width={widthPx}
        height={heightPx + 38}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            width: widthPx,
            height: heightPx + 38,
            borderRadius: 12,
            border: isSelected ? "2.5px solid #2563eb" : "1.5px solid #cbd5e1",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.18)",
            background: "#0b1120",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              height: 38,
              background: "#1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              color: "#f8fafc",
              fontSize: 13,
              fontWeight: 600,
              userSelect: "none",
              cursor: interactive ? "default" : "move",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
              <span style={{ fontSize: 16 }}>⚛</span>
              <span style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: 450 }}>
                {title}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInteractive((v) => !v);
                }}
                style={{
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: interactive ? "#16a34a" : "#3b82f6",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {interactive ? "✓ Đang tương tác (Thao tác TN)" : "✋ Kéo di chuyển / Thu phóng"}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const w = prompt("Chiều rộng (px):", String(widthPx));
                  const h = prompt("Chiều cao (px):", String(heightPx));
                  if (w && h) {
                    const nw = Number(w);
                    const nh = Number(h);
                    if (Number.isFinite(nw) && Number.isFinite(nh) && nw > 200 && nh > 200) {
                      onUpdateProps?.(element.id, { widthPx: nw, heightPx: nh });
                    }
                  }
                }}
                title="Đổi kích thước"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#cbd5e1",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ⛶ Kích thước
              </button>
            </div>
          </div>

          {/* Iframe hosting the self-contained HTML simulation */}
          <div style={{ flex: 1, position: "relative", background: "#000" }}>
            <iframe
              title={title}
              srcDoc={htmlContent}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              style={{
                width: "100%",
                height: heightPx,
                border: "none",
                display: "block",
                pointerEvents: interactive ? "auto" : "none",
              }}
            />
            {!interactive && (
              <div
                title="Bấm nút 'Đang tương tác' trên thanh tiêu đề để trượt thanh & bấm nút thí nghiệm"
                style={{
                  position: "absolute",
                  inset: 0,
                  cursor: "move",
                }}
              />
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};
