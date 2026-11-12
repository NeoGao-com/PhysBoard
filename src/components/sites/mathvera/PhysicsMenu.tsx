"use client";

import React from "react";

export interface PhysicsMenuProps {
  open: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  onOpenDrawer: () => void;
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.04em",
  padding: "5px 12px 2px",
  userSelect: "none",
};

const itemBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "5px 12px",
  border: "none",
  background: "transparent",
  color: "#1e293b",
  fontSize: 12.5,
  fontWeight: 500,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

export const PhysicsMenu: React.FC<PhysicsMenuProps> = ({
  open,
  onClose,
  onAction,
  onOpenDrawer,
}) => {
  if (!open) return null;

  const trigger = (action: string) => {
    onAction(action);
    onClose();
  };

  return (
    <div
      role="menu"
      data-wb-physics-menu="true"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 4,
        width: 310,
        maxHeight: "calc(100vh - 64px)",
        overflowY: "auto",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.16)",
        padding: "6px 0",
        zIndex: 110,
      }}
    >
      <div style={sectionHeaderStyle}>THÍ NGHIỆM NHANH (10–11–12)</div>
      {[
        { id: "phys:sim:projectile", label: "🎯 Ném xiên / Ném ngang (L10)" },
        { id: "phys:sim:incline_newton", label: "📐 Mặt nghiêng & Ma sát (L10)" },
        { id: "phys:sim:spring_pendulum", label: "🌀 Con lắc lò xo & Cơ năng (L11)" },
        { id: "phys:sim:simple_pendulum", label: "🕰 Con lắc đơn (L11)" },
        { id: "phys:sim:young_double_slit", label: "🌈 Giao thoa ánh sáng Y-âng (L11)" },
        { id: "phys:sim:ideal_gas", label: "🌡 Khí lý tưởng p–V–T (L12)" },
        { id: "phys:sim:rlc_ac_osc", label: "〰 Mạch RLC & Dao động ký (L12)" },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          data-physics-action={item.id}
          onClick={() => trigger(item.id)}
          style={itemBtnStyle}
        >
          {item.label}
        </button>
      ))}

      <div style={{ height: 1, background: "#e2e8f0", margin: "4px 10px" }} />
      <div style={sectionHeaderStyle}>SƠ ĐỒ THÔNG MINH</div>
      {[
        { id: "phys:diag:circuit", label: "⚡ Mạch điện DC (Khóa K, A, V, Biến trở)" },
        { id: "phys:diag:circuit_parallel", label: "⚡ Mạch song song R₁ // R₂" },
        { id: "phys:diag:fbd", label: "↗ Phân tích lực & Chiếu Ox/Oy" },
        { id: "phys:diag:optics", label: "🔍 Quang hình học (Thấu kính 3 tia)" },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          data-physics-action={item.id}
          onClick={() => trigger(item.id)}
          style={itemBtnStyle}
        >
          {item.label}
        </button>
      ))}

      <div style={{ height: 1, background: "#e2e8f0", margin: "4px 10px" }} />
      <div style={sectionHeaderStyle}>ĐO ĐẠC &amp; THỰC HÀNH</div>
      {[
        { id: "phys:inst:ruler", label: "📏 Thước tỉ lệ cm/mm" },
        { id: "phys:inst:protractor", label: "📐 Thước đo góc 0°–180°" },
        { id: "phys:inst:stopwatch", label: "⏱ Đồng hồ bấm giây" },
        { id: "phys:labtable", label: "📝 Bảng số liệu & Vẽ hồi quy Oxy" },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          data-physics-action={item.id}
          onClick={() => trigger(item.id)}
          style={itemBtnStyle}
        >
          {item.label}
        </button>
      ))}

      <div style={{ padding: "6px 10px 4px" }}>
        <button
          type="button"
          data-physics-open-drawer="true"
          onClick={() => {
            onClose();
            onOpenDrawer();
          }}
          style={{
            width: "100%",
            padding: "7px 10px",
            borderRadius: 8,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⚛ Thư viện Vật lý (15 TN, Công thức, Bài giảng)...
        </button>
      </div>
    </div>
  );
};
