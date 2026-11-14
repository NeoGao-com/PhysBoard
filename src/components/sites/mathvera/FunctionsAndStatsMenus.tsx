"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildSignTableFromExpr,
  buildVarTableFromExpr,
  extractFreeParameters,
  parseNumberLineSet,
  parseRational,
} from "@/lib/math-eval";
import {
  getRealWorldItem,
  REALWORLD_QUICK_ITEMS,
  RealWorldArtItem,
  recordRecentRealWorldId,
} from "@/lib/realworld-art";
import { KaTeXFormula } from "./elements/MathElement";

export type M3MenuAction =
  | { kind: "tool"; toolId: string; hint?: string }
  | { kind: "open-plot-dialog" }
  | { kind: "open-conic-dialog"; conicKind: "ellipse" | "parabola" | "hyperbola" }
  | { kind: "open-vartable-dialog"; mode: "variation" | "sign" }
  | { kind: "open-chart-dialog" }
  | { kind: "open-bayes-dialog" }
  | { kind: "open-numberline-dialog" }
  | { kind: "open-realworld-drawer" }
  | { kind: "open-decor-help" };

const dropdownPanelStyle: React.CSSProperties = {
  position: "fixed",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
  padding: "8px 6px",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  zIndex: 5200,
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.05em",
  padding: "6px 10px 2px",
  textTransform: "uppercase",
};

const menuItemBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "6px 10px",
  borderRadius: 7,
  border: "none",
  background: "transparent",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 500,
  textAlign: "left",
  cursor: "pointer",
};

const pillBtnStyle: React.CSSProperties = {
  padding: "2px 9px",
  borderRadius: 999,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#1e293b",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

// ---------------------------------------------------------------------------
// 1. ƒ Hàm số ▾ Dropdown
// ---------------------------------------------------------------------------

export interface FunctionsMenuProps {
  open: boolean;
  onClose: () => void;
  onAction: (action: M3MenuAction) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const FunctionsMenu: React.FC<FunctionsMenuProps> = ({
  open,
  onClose,
  onAction,
  anchorRef,
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const menuHeight = 360;
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

  const fire = (action: M3MenuAction) => {
    onAction(action);
    onClose();
  };

  return createPortal(
    <div
      role="menu"
      aria-label="Hàm số"
      data-wb-menu="functions"
      style={{
        ...dropdownPanelStyle,
        minWidth: 288,
        top: pos?.top ?? 50,
        left: pos?.left ?? 100,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={sectionHeadingStyle}>HỆ TRỤC TOẠ ĐỘ</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="p3:oxy"
        onClick={() => fire({ kind: "tool", toolId: "p3:oxy", hint: "Bấm lên bảng để đặt hệ trục Oxy" })}
        style={menuItemBtnStyle}
      >
        <span>+</span>
        <span>Hệ trục Oxy</span>
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "5px 10px",
          fontSize: 13,
          color: "#0f172a",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span>◐</span>
          <span>Cônic</span>
        </span>
        <div style={{ display: "inline-flex", gap: 4 }}>
          <button
            type="button"
            role="menuitem"
            data-menu-item="conic-ellipse"
            onClick={() => fire({ kind: "open-conic-dialog", conicKind: "ellipse" })}
            style={pillBtnStyle}
          >
            Elip
          </button>
          <button
            type="button"
            role="menuitem"
            data-menu-item="conic-parabola"
            onClick={() => fire({ kind: "open-conic-dialog", conicKind: "parabola" })}
            style={pillBtnStyle}
          >
            Parabol
          </button>
          <button
            type="button"
            role="menuitem"
            data-menu-item="conic-hyperbola"
            onClick={() => fire({ kind: "open-conic-dialog", conicKind: "hyperbola" })}
            style={pillBtnStyle}
          >
            Hypebol
          </button>
        </div>
      </div>

      <div style={sectionHeadingStyle}>ĐỒ THỊ</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="p3:plot"
        onClick={() => fire({ kind: "open-plot-dialog" })}
        style={menuItemBtnStyle}
      >
        <span>ƒ</span>
        <span>Vẽ đồ thị trên hệ trục Oxy</span>
      </button>

      <div style={sectionHeadingStyle}>BẢNG</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="bang-bien-thien"
        onClick={() => fire({ kind: "tool", toolId: "bang-bien-thien", hint: "Bấm lên bảng để đặt bảng biến thiên" })}
        style={menuItemBtnStyle}
      >
        <span>↗</span>
        <span>Bảng biến thiên (lập từ hàm số)</span>
      </button>
      <button
        type="button"
        role="menuitem"
        data-menu-item="bang-xet-dau"
        onClick={() => fire({ kind: "tool", toolId: "bang-xet-dau", hint: "Bấm lên bảng để đặt bảng xét dấu" })}
        style={menuItemBtnStyle}
      >
        <span>±</span>
        <span>Bảng xét dấu (lập từ biểu thức)</span>
      </button>
      <button
        type="button"
        role="menuitem"
        data-menu-item="bang-trong"
        onClick={() => fire({ kind: "tool", toolId: "bang-trong", hint: "Bấm lên bảng để đặt bảng biến thiên trống" })}
        style={menuItemBtnStyle}
      >
        <span>▦</span>
        <span>Bảng biến thiên trống (tự điền)</span>
      </button>

      <div style={sectionHeadingStyle}>LƯỢNG GIÁC</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="trig-circle"
        onClick={() => fire({ kind: "tool", toolId: "trig-circle", hint: "Bấm lên bảng để đặt đường tròn lượng giác" })}
        style={menuItemBtnStyle}
      >
        <span>◯</span>
        <span>Đường tròn lượng giác</span>
      </button>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// 2. 📊 Thống kê ▾ Dropdown
// ---------------------------------------------------------------------------

export interface StatsMenuProps {
  open: boolean;
  onClose: () => void;
  onAction: (action: M3MenuAction) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const StatsMenu: React.FC<StatsMenuProps> = ({
  open,
  onClose,
  onAction,
  anchorRef,
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const menuHeight = 440;
      const opensUpward =
        typeof window !== "undefined" &&
        rect.bottom + menuHeight > window.innerHeight &&
        rect.top > menuHeight;
      setPos({
        top: opensUpward
          ? Math.max(8, rect.top - menuHeight - 6)
          : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 1280) - 290)),
      });
    }
  }, [open, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  const fire = (action: M3MenuAction) => {
    onAction(action);
    onClose();
  };

  return createPortal(
    <div
      role="menu"
      aria-label="Thống kê"
      data-wb-menu="statistics"
      style={{
        ...dropdownPanelStyle,
        minWidth: 278,
        top: pos?.top ?? 50,
        left: pos?.left ?? 100,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={sectionHeadingStyle}>THỐNG KÊ</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="chart"
        onClick={() => fire({ kind: "open-chart-dialog" })}
        style={menuItemBtnStyle}
      >
        <span>📊</span>
        <span>Biểu đồ</span>
      </button>

      <div style={sectionHeadingStyle}>ĐẾM: HOÁN VỊ, CHỈNH HỢP, TỔ HỢP</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="count-perm"
        onClick={() => fire({ kind: "tool", toolId: "count-perm", hint: "Bấm lên bảng để đặt mô hình hoán vị" })}
        style={menuItemBtnStyle}
      >
        <span>🔢</span>
        <span>Hoán vị</span>
      </button>
      <button
        type="button"
        role="menuitem"
        data-menu-item="count-arr"
        onClick={() => fire({ kind: "tool", toolId: "count-arr", hint: "Bấm lên bảng để đặt mô hình chỉnh hợp" })}
        style={menuItemBtnStyle}
      >
        <span>🔢</span>
        <span>Chỉnh hợp</span>
      </button>
      <button
        type="button"
        role="menuitem"
        data-menu-item="count-comb"
        onClick={() => fire({ kind: "tool", toolId: "count-comb", hint: "Bấm lên bảng để đặt mô hình tổ hợp" })}
        style={menuItemBtnStyle}
      >
        <span>🔢</span>
        <span>Tổ hợp</span>
      </button>

      <div style={sectionHeadingStyle}>XÁC SUẤT</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="tree"
        onClick={() => fire({ kind: "tool", toolId: "tree", hint: "Bấm lên bảng để đặt sơ đồ hình cây" })}
        style={menuItemBtnStyle}
      >
        <span>🌳</span>
        <span>Sơ đồ hình cây</span>
      </button>
      <button
        type="button"
        role="menuitem"
        data-menu-item="bayes"
        onClick={() => fire({ kind: "open-bayes-dialog" })}
        style={menuItemBtnStyle}
      >
        <span>P(B), P(A|B) — Xác suất toàn phần / Bayes</span>
      </button>

      <div style={sectionHeadingStyle}>TẬP HỢP</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="venn"
        onClick={() => fire({ kind: "tool", toolId: "venn", hint: "Bấm lên bảng để đặt biểu đồ Ven" })}
        style={menuItemBtnStyle}
      >
        <span>◎</span>
        <span>Biểu đồ Ven</span>
      </button>
      <button
        type="button"
        role="menuitem"
        data-menu-item="numberline"
        onClick={() => fire({ kind: "open-numberline-dialog" })}
        style={menuItemBtnStyle}
      >
        <span>↔</span>
        <span>Trục số (biểu diễn tập hợp)</span>
      </button>

      <div style={sectionHeadingStyle}>CHUYÊN ĐỀ</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="network"
        onClick={() => fire({ kind: "tool", toolId: "network", hint: "Bấm lên bảng để đặt đồ thị (đỉnh – cạnh)" })}
        style={menuItemBtnStyle}
      >
        <span>⬡</span>
        <span>Đồ thị (đỉnh – cạnh)</span>
      </button>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// 3. 🏞 Thực tế ▾ Dropdown
// ---------------------------------------------------------------------------

export interface RealWorldMenuProps {
  open: boolean;
  onClose: () => void;
  onSelectQuickItem: (item: RealWorldArtItem) => void;
  onOpenDrawer: () => void;
  onOpenDecorHelp: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const RealWorldMenu: React.FC<RealWorldMenuProps> = ({
  open,
  onClose,
  onSelectQuickItem,
  onOpenDrawer,
  onOpenDecorHelp,
  anchorRef,
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const menuHeight = 420;
      const opensUpward =
        typeof window !== "undefined" &&
        rect.bottom + menuHeight > window.innerHeight &&
        rect.top > menuHeight;
      setPos({
        top: opensUpward
          ? Math.max(8, rect.top - menuHeight - 6)
          : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 1280) - 280)),
      });
    }
  }, [open, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="menu"
      aria-label="Thực tế"
      data-wb-menu="realworld"
      style={{
        ...dropdownPanelStyle,
        minWidth: 270,
        top: pos?.top ?? 50,
        left: pos?.left ?? 100,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={sectionHeadingStyle}>VẬT</div>
      {REALWORLD_QUICK_ITEMS.map((q) => (
        <button
          key={q.id}
          type="button"
          role="menuitem"
          data-menu-item={`realworld-${q.id}`}
          onClick={() => {
            const art = getRealWorldItem(q.id);
            recordRecentRealWorldId(art.id);
            onSelectQuickItem(art);
            onClose();
          }}
          style={menuItemBtnStyle}
        >
          <span>{q.emoji}</span>
          <span>{q.name}</span>
        </button>
      ))}
      <button
        type="button"
        role="menuitem"
        data-menu-item="realworld-drawer"
        onClick={() => {
          onOpenDrawer();
          onClose();
        }}
        style={menuItemBtnStyle}
      >
        <span>🔎</span>
        <span>Tìm vật khác…</span>
      </button>

      <div style={sectionHeadingStyle}>TRANG TRÍ ĐOẠN</div>
      <button
        type="button"
        role="menuitem"
        data-menu-item="line-decor"
        onClick={() => {
          onOpenDecorHelp();
          onClose();
        }}
        style={menuItemBtnStyle}
      >
        <span>📏</span>
        <span>Kích thước, mặt đất, mặt nước, chữ…</span>
      </button>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// 4. Config Popover Dialogs (Plot, Conic, VarTable, Chart, Bayes, NumberLine)
// ---------------------------------------------------------------------------

export interface PlotConfigDialogProps {
  open: boolean;
  initialExpr?: string;
  onSubmit: (exprLatex: string, params: Array<{ name: string; min: number; max: number; step: number; value: number }>, domain?: [number, number]) => void;
  onCancel: () => void;
}

export const PlotConfigDialog: React.FC<PlotConfigDialogProps> = (props) => {
  if (!props.open) return null;
  return <PlotConfigDialogInner {...props} />;
};

const PlotConfigDialogInner: React.FC<PlotConfigDialogProps> = ({
  initialExpr = "x^2 - 2x",
  onSubmit,
  onCancel,
}) => {
  const [expr, setExpr] = useState(initialExpr);
  const [domA, setDomA] = useState("");
  const [domB, setDomB] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = () => {
    const clean = expr.trim();
    if (!clean) return;
    const paramNames = extractFreeParameters(clean);
    const params = paramNames.map((name) => ({
      name,
      min: -5,
      max: 5,
      step: 0.1,
      value: 1,
    }));
    let domain: [number, number] | undefined;
    if (domA.trim() && domB.trim()) {
      const a = Number(domA.replace(",", "."));
      const b = Number(domB.replace(",", "."));
      if (Number.isFinite(a) && Number.isFinite(b) && a < b) {
        domain = [a, b];
      }
    }
    onSubmit(clean, params, domain);
  };

  return (
    <div
      data-wb-plot-dialog="true"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15,23,42,0.16)",
        padding: 14,
        zIndex: 90,
        width: 380,
        maxWidth: "calc(100vw - 24px)",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
        Vẽ đồ thị hàm số y = f(x)
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {[
          { label: "Bậc 3", v: "x^3 - 3*x + m" },
          { label: "Phân thức", v: "(2*x + 1)/(x - 1)" },
          { label: "sin(x)", v: "sin(x)" },
          { label: "Parabol", v: "x^2 - 2*x" },
        ].map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => setExpr(ex.v)}
            style={{
              padding: "2px 8px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 15 }}>y =</span>
        <input
          ref={inputRef}
          data-wb-plot="formula"
          data-testid="plot-input"
          placeholder="Nhập f(x), vd: x^3 - 3*x + m"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          style={{
            flex: 1,
            height: 34,
            border: "1.5px solid #2563eb",
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
        <span>Miền xác định (tùy chọn):</span>
        <input
          data-wb-plot-domain="a"
          placeholder="a"
          value={domA}
          onChange={(e) => setDomA(e.target.value)}
          style={{ width: 52, border: "1px solid #cbd5e1", borderRadius: 5, padding: "2px 6px" }}
        />
        <span>→</span>
        <input
          data-wb-plot-domain="b"
          placeholder="b"
          value={domB}
          onChange={(e) => setDomB(e.target.value)}
          style={{ width: 52, border: "1px solid #cbd5e1", borderRadius: 5, padding: "2px 6px" }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "6px 12px",
            borderRadius: 7,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={submit}
          style={{
            padding: "6px 14px",
            borderRadius: 7,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Vẽ đồ thị
        </button>
      </div>
    </div>
  );
};

export interface ConicConfigDialogProps {
  open: boolean;
  kind: "ellipse" | "parabola" | "hyperbola";
  onSubmit: (kind: "ellipse" | "parabola" | "hyperbola", a: number, b?: number) => void;
  onCancel: () => void;
}

export const ConicConfigDialog: React.FC<ConicConfigDialogProps> = (props) => {
  if (!props.open) return null;
  return <ConicConfigDialogInner key={props.kind} {...props} />;
};

const ConicConfigDialogInner: React.FC<ConicConfigDialogProps> = ({
  kind,
  onSubmit,
  onCancel,
}) => {
  const [selectedKind, setSelectedKind] = useState<"ellipse" | "parabola" | "hyperbola">(kind);
  const [a, setA] = useState("3");
  const [b, setB] = useState("2");

  const title =
    selectedKind === "ellipse"
      ? "Dựng Elip (x²/a² + y²/b² = 1)"
      : selectedKind === "parabola"
        ? "Dựng Parabol (y² = 2px)"
        : "Dựng Hypebol (x²/a² − y²/b² = 1)";

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15,23,42,0.16)",
        padding: 14,
        zIndex: 90,
        width: 350,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{title}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {(
          [
            { k: "ellipse", lbl: "Elip" },
            { k: "parabola", lbl: "Parabol" },
            { k: "hyperbola", lbl: "Hypebol" },
          ] as const
        ).map((item) => (
          <button
            key={item.k}
            type="button"
            onClick={() => setSelectedKind(item.k)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: selectedKind === item.k ? "1px solid #9333ea" : "1px solid #cbd5e1",
              background: selectedKind === item.k ? "#faf5ff" : "#fff",
              color: selectedKind === item.k ? "#7e22ce" : "#475569",
              fontSize: 12,
              fontWeight: selectedKind === item.k ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {item.lbl}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <span>{selectedKind === "parabola" ? "p =" : "a ="}</span>
          <input
            value={a}
            onChange={(e) => setA(e.target.value)}
            style={{ width: 64, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
          />
        </label>
        {selectedKind !== "parabola" && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span>b =</span>
            <input
              value={b}
              onChange={(e) => setB(e.target.value)}
              style={{ width: 64, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
            />
          </label>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={() => {
            const numA = Math.max(0.2, Number(a) || 3);
            const numB = selectedKind === "parabola" ? undefined : Math.max(0.2, Number(b) || 2);
            onSubmit(selectedKind, numA, numB);
          }}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#9333ea", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Dựng
        </button>
      </div>
    </div>
  );
};

export interface VarTableConfigDialogProps {
  open: boolean;
  mode: "variation" | "sign";
  onSubmit: (props: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const VarTableConfigDialog: React.FC<VarTableConfigDialogProps> = (props) => {
  if (!props.open) return null;
  return <VarTableConfigDialogInner key={props.mode} {...props} />;
};

const VarTableConfigDialogInner: React.FC<VarTableConfigDialogProps> = ({
  mode,
  onSubmit,
  onCancel,
}) => {
  const [expr, setExpr] = useState(
    mode === "variation" ? "x^3 - 3x + 1" : "x^2 - 4"
  );
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const res =
      mode === "variation"
        ? buildVarTableFromExpr(expr)
        : buildSignTableFromExpr(expr);
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    onSubmit({ ...res });
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15,23,42,0.16)",
        padding: 14,
        zIndex: 90,
        width: 380,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
        {mode === "variation" ? "Lập Bảng biến thiên" : "Lập Bảng xét dấu"}
      </div>
      <input
        autoFocus
        value={expr}
        onChange={(e) => {
          setExpr(e.target.value);
          setErr(null);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") submit();
        }}
        placeholder="vd: x^3 - 3x + 1 hoặc (2x+1)/(x-1)"
        style={{
          height: 34,
          border: "1.5px solid #2563eb",
          borderRadius: 8,
          padding: "0 10px",
          fontSize: 14,
        }}
      />
      {err && <div style={{ fontSize: 12, color: "#dc2626" }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={submit}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Tạo bảng
        </button>
      </div>
    </div>
  );
};

export interface ChartConfigDialogProps {
  open: boolean;
  onSubmit: (props: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const ChartConfigDialog: React.FC<ChartConfigDialogProps> = ({
  open,
  onSubmit,
  onCancel,
}) => {
  const [kind, setKind] = useState<"bar" | "line" | "pie" | "histogram" | "box">("bar");
  const [title, setTitle] = useState("Biểu đồ thống kê");
  const [labelsStr, setLabelsStr] = useState("A, B, C, D");
  const [valuesStr, setValuesStr] = useState("5, 8, 3, 6");
  const [showStats, setShowStats] = useState(true);

  if (!open) return null;

  const submit = () => {
    const vals = valuesStr
      .split(/[,;\s]+/)
      .map(Number)
      .filter(Number.isFinite);
    const lbls = labelsStr
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const data =
      kind === "box"
        ? { kind: "sample", values: vals.length ? vals : [4, 6, 7, 8, 10, 12] }
        : {
            kind: "categories",
            labels: lbls.length ? lbls : ["A", "B", "C", "D"],
            values: vals.length ? vals : [5, 8, 3, 6],
          };
    onSubmit({ kind, title, data, showStats });
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15,23,42,0.16)",
        padding: 14,
        zIndex: 90,
        width: 390,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
        📊 Biểu đồ & Số liệu thống kê
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {(
          [
            ["bar", "Cột"],
            ["line", "Đoạn thẳng"],
            ["pie", "Quạt tròn"],
            ["histogram", "Tần số"],
            ["box", "Hộp (Box)"],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: kind === k ? "#e8f0fe" : "#f8fafc",
              color: kind === k ? "#1a56db" : "#334155",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {lbl}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tiêu đề biểu đồ"
        style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 8px", fontSize: 13 }}
      />
      {kind !== "box" && (
        <input
          value={labelsStr}
          onChange={(e) => setLabelsStr(e.target.value)}
          placeholder="Nhãn (cách nhau bởi dấu phẩy)"
          style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 8px", fontSize: 13 }}
        />
      )}
      <input
        value={valuesStr}
        onChange={(e) => setValuesStr(e.target.value)}
        placeholder="Giá trị số (vd: 5, 8, 3, 6)"
        style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 8px", fontSize: 13 }}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
        <input
          type="checkbox"
          checked={showStats}
          onChange={(e) => setShowStats(e.target.checked)}
        />
        <span>Hiện số đặc trưng (x̄, Me, Q₁, Q₃, s², s)</span>
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={submit}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Đặt biểu đồ
        </button>
      </div>
    </div>
  );
};

export interface BayesConfigDialogProps {
  open: boolean;
  onSubmit: (treeRoot: Record<string, unknown>, formulaLatex: string) => void;
  onCancel: () => void;
}

export const BayesConfigDialog: React.FC<BayesConfigDialogProps> = ({
  open,
  onSubmit,
  onCancel,
}) => {
  const [pA, setPA] = useState("0.4");
  const [pBA, setPBA] = useState("0.7");
  const [pBnA, setPBnA] = useState("0.2");

  if (!open) return null;

  const rA = parseRational(pA);
  const rBA = parseRational(pBA);
  const rBnA = parseRational(pBnA);
  const valid =
    rA &&
    rBA &&
    rBnA &&
    rA.value >= 0 &&
    rA.value <= 1 &&
    rBA.value >= 0 &&
    rBA.value <= 1 &&
    rBnA.value >= 0 &&
    rBnA.value <= 1;

  const pB = valid ? rA.value * rBA.value + (1 - rA.value) * rBnA.value : 0;
  const pAB = valid && pB > 0 ? (rA.value * rBA.value) / pB : 0;

  return (
    <div
      data-wb-bayes="true"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15,23,42,0.16)",
        padding: 14,
        zIndex: 90,
        width: 380,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
        Xác suất toàn phần & Công thức Bayes
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <KaTeXFormula latex="P(A)" />
          <input value={pA} onChange={(e) => setPA(e.target.value)} style={{ width: 90, border: "1px solid #cbd5e1", borderRadius: 5, padding: "3px 6px" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <KaTeXFormula latex="P(B|A)" />
          <input value={pBA} onChange={(e) => setPBA(e.target.value)} style={{ width: 90, border: "1px solid #cbd5e1", borderRadius: 5, padding: "3px 6px" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <KaTeXFormula latex="P(B|\overline{A})" />
          <input value={pBnA} onChange={(e) => setPBnA(e.target.value)} style={{ width: 90, border: "1px solid #cbd5e1", borderRadius: 5, padding: "3px 6px" }} />
        </label>
      </div>
      {valid && (
        <div style={{ background: "#f8fafc", padding: 8, borderRadius: 8, fontSize: 13 }}>
          <KaTeXFormula
            latex={`P(B) = ${pB.toFixed(4)}, \\quad P(A|B) = ${pAB.toFixed(4)}`}
          />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => {
            if (!valid || !rA || !rBA || !rBnA) return;
            const compA = (1 - rA.value).toFixed(2).replace(/\.?0+$/, "");
            const compBA = (1 - rBA.value).toFixed(2).replace(/\.?0+$/, "");
            const compBnA = (1 - rBnA.value).toFixed(2).replace(/\.?0+$/, "");
            const root = {
              label: "Ω",
              children: [
                {
                  label: "A",
                  p: pA,
                  children: [
                    { label: "B", p: pBA },
                    { label: "B̄", p: compBA },
                  ],
                },
                {
                  label: "Ā",
                  p: compA,
                  children: [
                    { label: "B", p: pBnA },
                    { label: "B̄", p: compBnA },
                  ],
                },
              ],
            };
            const latex = `P(B) = ${pB.toFixed(4)},\\; P(A|B) = ${pAB.toFixed(4)}`;
            onSubmit(root, latex);
          }}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Chèn sơ đồ & công thức
        </button>
      </div>
    </div>
  );
};

export interface NumberLineConfigDialogProps {
  open: boolean;
  initialSet?: string;
  onSubmit: (setExpr: string) => void;
  onCancel: () => void;
}

const NUMBERLINE_CHIPS = [
  { label: "[ ; ]", insert: "[0; 3]" },
  { label: "( ; )", insert: "(-2; 4)" },
  { label: "[ ; )", insert: "[-2; 3)" },
  { label: "( ; ]", insert: "(1; 5]" },
  { label: "{ ; }", insert: "\\{1; 4\\}" },
  { label: "∪", insert: " \\cup " },
  { label: "∩", insert: " \\cap " },
  { label: "\\", insert: " \\setminus " },
  { label: "+∞", insert: "+\\infty" },
  { label: "-∞", insert: "-\\infty" },
  { label: "ℝ", insert: "\\mathbb{R}" },
];

export const NumberLineConfigDialog: React.FC<NumberLineConfigDialogProps> = ({
  open,
  initialSet = "[-2; 3) \\cup (5; +\\infty)",
  onSubmit,
  onCancel,
}) => {
  const [setExpr, setSetExpr] = useState(initialSet);
  const parsed = parseNumberLineSet(setExpr);

  if (!open) return null;

  return (
    <div
      data-wb-numberline-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15,23,42,0.16)",
        padding: 14,
        zIndex: 90,
        width: 420,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
        Trục số – biểu diễn tập hợp
      </div>
      <input
        autoFocus
        value={setExpr}
        onChange={(e) => setSetExpr(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && !("error" in parsed)) {
            onSubmit(setExpr.trim());
          }
        }}
        style={{
          height: 34,
          border: "1.5px solid #2563eb",
          borderRadius: 8,
          padding: "0 10px",
          fontSize: 14,
        }}
      />
      <div data-numberline-chips="true" style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {NUMBERLINE_CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setSetExpr((prev) => prev + c.insert)}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {"error" in parsed && (
        <div style={{ fontSize: 12, color: "#dc2626" }}>{parsed.error}</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={"error" in parsed}
          onClick={() => onSubmit(setExpr.trim())}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Đặt trục số
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 7. AxesPointDialog — Đặt điểm theo toạ độ (x; y) trên hệ trục Oxy
// ---------------------------------------------------------------------------

export interface AxesPointDialogProps {
  open: boolean;
  defaultName?: string;
  onSubmit: (name: string, x: number, y: number) => void;
  onCancel: () => void;
}

export const AxesPointDialog: React.FC<AxesPointDialogProps> = (props) => {
  if (!props.open) return null;
  return <AxesPointDialogInner key={props.defaultName ?? "M"} {...props} />;
};

const AxesPointDialogInner: React.FC<AxesPointDialogProps> = ({
  defaultName = "M",
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState(defaultName);
  const [xStr, setXStr] = useState("2");
  const [yStr, setYStr] = useState("3");

  const handleSubmit = () => {
    const x = Number(xStr.replace(",", ".")) || 0;
    const y = Number(yStr.replace(",", ".")) || 0;
    onSubmit(name.trim() || "M", x, y);
  };

  return (
    <div
      data-wb-axes-point-dialog="true"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") handleSubmit();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
        padding: 14,
        zIndex: 95,
        width: 340,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
        Đặt điểm (x; y) trên hệ trục Oxy
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
          <span>Tên</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: 50, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
          <span>x =</span>
          <input
            value={xStr}
            onChange={(e) => setXStr(e.target.value)}
            style={{ width: 64, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
          <span>y =</span>
          <input
            value={yStr}
            onChange={(e) => setYStr(e.target.value)}
            style={{ width: 64, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
          />
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Đặt điểm
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 8. AxesVectorDialog — Đặt vectơ toạ độ (vx; vy) từ gốc hoặc điểm (x0; y0)
// ---------------------------------------------------------------------------

export interface AxesVectorDialogProps {
  open: boolean;
  onSubmit: (vx: number, vy: number, x0: number, y0: number) => void;
  onCancel: () => void;
}

export const AxesVectorDialog: React.FC<AxesVectorDialogProps> = (props) => {
  if (!props.open) return null;
  return <AxesVectorDialogInner {...props} />;
};

const AxesVectorDialogInner: React.FC<AxesVectorDialogProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [vxStr, setVxStr] = useState("3");
  const [vyStr, setVyStr] = useState("2");
  const [x0Str, setX0Str] = useState("0");
  const [y0Str, setY0Str] = useState("0");

  const handleSubmit = () => {
    const vx = Number(vxStr.replace(",", ".")) || 0;
    const vy = Number(vyStr.replace(",", ".")) || 0;
    const x0 = Number(x0Str.replace(",", ".")) || 0;
    const y0 = Number(y0Str.replace(",", ".")) || 0;
    onSubmit(vx, vy, x0, y0);
  };

  return (
    <div
      data-wb-axes-vector-dialog="true"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") handleSubmit();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
        padding: 14,
        zIndex: 95,
        width: 360,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
        Vẽ Vectơ toạ độ (x; y) trên hệ trục
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12.5, color: "#475569", minWidth: 74 }}>Toạ độ u⃗:</span>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <span>x =</span>
          <input
            autoFocus
            value={vxStr}
            onChange={(e) => setVxStr(e.target.value)}
            style={{ width: 64, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <span>y =</span>
          <input
            value={vyStr}
            onChange={(e) => setVyStr(e.target.value)}
            style={{ width: 64, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
          />
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12.5, color: "#475569", minWidth: 74 }}>Điểm gốc:</span>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <span>x₀ =</span>
          <input
            value={x0Str}
            onChange={(e) => setX0Str(e.target.value)}
            style={{ width: 58, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <span>y₀ =</span>
          <input
            value={y0Str}
            onChange={(e) => setY0Str(e.target.value)}
            style={{ width: 58, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
          />
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Vẽ vectơ
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 9. Curve2DConfigDialog — Phương trình, Bất phương trình, Tham số, Dãy số
// ---------------------------------------------------------------------------

export type Curve2DDialogMode = "equation" | "inequality" | "parametric" | "sequence";

export interface Curve2DConfigDialogProps {
  open: boolean;
  mode: Curve2DDialogMode;
  onSubmit: (def: Record<string, unknown>, color: string) => void;
  onCancel: () => void;
}

export const Curve2DConfigDialog: React.FC<Curve2DConfigDialogProps> = (props) => {
  if (!props.open) return null;
  return <Curve2DConfigDialogInner key={props.mode} {...props} />;
};

const CURVE2D_COLORS = ["#dc2626", "#2563eb", "#0f766e", "#9333ea", "#ea580c"];

const Curve2DConfigDialogInner: React.FC<Curve2DConfigDialogProps> = ({
  mode,
  onSubmit,
  onCancel,
}) => {
  const [eqExpr, setEqExpr] = useState(
    mode === "inequality"
      ? "x + y <= 4\nx >= 0"
      : mode === "sequence"
        ? "1/n"
        : "x^2 + y^2 = 9"
  );
  const [pxExpr, setPxExpr] = useState("3*cos(t)");
  const [pyExpr, setPyExpr] = useState("2*sin(t)");
  const [t0Str, setT0Str] = useState("0");
  const [t1Str, setT1Str] = useState("6.283");
  const [nMaxStr, setNMaxStr] = useState("10");
  const [color, setColor] = useState(mode === "inequality" ? "#dc2626" : "#0f766e");

  const title =
    mode === "equation"
      ? "Phương trình ẩn F(x, y) = 0"
      : mode === "inequality"
        ? "Bất phương trình / Hệ bất phương trình"
        : mode === "parametric"
          ? "Đường cong tham số (x(t); y(t))"
          : "Dãy số (uₙ)";

  const submit = () => {
    if (mode === "parametric") {
      onSubmit(
        {
          kind: "parametric",
          x: pxExpr.trim() || "2*cos(t)",
          y: pyExpr.trim() || "2*sin(t)",
          t0: Number(t0Str) || 0,
          t1: Number(t1Str) || Math.PI * 2,
        },
        color
      );
      return;
    }
    if (mode === "sequence") {
      onSubmit(
        {
          kind: "sequence",
          expr: eqExpr.trim() || "1/n",
          nMax: Math.max(1, Math.min(200, Math.round(Number(nMaxStr) || 10))),
        },
        color
      );
      return;
    }
    onSubmit(
      {
        kind: mode,
        expr: eqExpr.trim() || (mode === "inequality" ? "x + y <= 4" : "x^2 + y^2 = 9"),
      },
      color
    );
  };

  return (
    <div
      data-wb-curve2d-dialog={mode}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: "0 14px 36px rgba(15,23,42,0.2)",
        padding: 14,
        zIndex: 95,
        width: 410,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{title}</div>

      {mode === "inequality" && (
        <>
          <textarea
            autoFocus
            rows={3}
            value={eqExpr}
            onChange={(e) => setEqExpr(e.target.value)}
            placeholder={"Mỗi dòng một BPT, vd:\nx + y <= 4\nx >= 0\ny >= 0"}
            style={{
              width: "100%",
              border: "1.5px solid #2563eb",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 13.5,
              fontFamily: "ui-monospace, monospace",
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 11.5, color: "#64748b" }}>
            Miền không thuộc tập nghiệm sẽ được gạch chéo chuẩn SGK; miền nghiệm giữ nguyên màu nền.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[
              { label: "x + y ≤ 4; x ≥ 0", expr: "x + y <= 4\nx >= 0" },
              { label: "Tam giác miền nghiệm", expr: "x + y <= 4\nx >= 0\ny >= 0" },
              { label: "Hình tròn x²+y² ≤ 9", expr: "x^2 + y^2 <= 9" },
              { label: "Parabol y ≥ x²−2", expr: "y >= x^2 - 2" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setEqExpr(p.expr)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "equation" && (
        <>
          <input
            autoFocus
            value={eqExpr}
            onChange={(e) => setEqExpr(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") submit();
            }}
            placeholder="vd: x^2 + y^2 = 9 hoặc 2*x + y = 4"
            style={{
              height: 36,
              border: "1.5px solid #2563eb",
              borderRadius: 8,
              padding: "0 10px",
              fontSize: 14,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[
              { label: "x²+y² = 9", expr: "x^2 + y^2 = 9" },
              { label: "2x + y = 4", expr: "2*x + y = 4" },
              { label: "(x-1)²+(y+1)²=4", expr: "(x-1)^2 + (y+1)^2 = 4" },
              { label: "x²/9 - y²/4 = 1", expr: "x^2/9 - y^2/4 = 1" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setEqExpr(p.expr)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "parametric" && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1, fontSize: 12.5 }}>
              <div>x(t) =</div>
              <input
                autoFocus
                value={pxExpr}
                onChange={(e) => setPxExpr(e.target.value)}
                style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ flex: 1, fontSize: 12.5 }}>
              <div>y(t) =</div>
              <input
                value={pyExpr}
                onChange={(e) => setPyExpr(e.target.value)}
                style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", boxSizing: "border-box" }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1, fontSize: 12.5 }}>
              <div>t từ:</div>
              <input
                value={t0Str}
                onChange={(e) => setT0Str(e.target.value)}
                style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 8px", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ flex: 1, fontSize: 12.5 }}>
              <div>t đến:</div>
              <input
                value={t1Str}
                onChange={(e) => setT1Str(e.target.value)}
                style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 8px", boxSizing: "border-box" }}
              />
            </label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[
              { label: "Elip", x: "3*cos(t)", y: "2*sin(t)", t0: "0", t1: "6.283" },
              { label: "Xoắn ốc", x: "0.4*t*cos(t)", y: "0.4*t*sin(t)", t0: "0", t1: "12.56" },
              { label: "Lissajous", x: "3*sin(2*t)", y: "3*sin(3*t)", t0: "0", t1: "6.283" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setPxExpr(p.x);
                  setPyExpr(p.y);
                  setT0Str(p.t0);
                  setT1Str(p.t1);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "sequence" && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ flex: 1, fontSize: 13 }}>
              <span>uₙ = </span>
              <input
                autoFocus
                value={eqExpr}
                onChange={(e) => setEqExpr(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") submit();
                }}
                placeholder="vd: 1/n hoặc (-1)^n / n"
                style={{ width: "calc(100% - 36px)", border: "1.5px solid #2563eb", borderRadius: 7, padding: "5px 8px" }}
              />
            </label>
            <label style={{ fontSize: 12.5 }}>
              <span>n ≤ </span>
              <input
                value={nMaxStr}
                onChange={(e) => setNMaxStr(e.target.value)}
                style={{ width: 46, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
              />
            </label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[
              { label: "1/n", expr: "1/n" },
              { label: "(-1)^n / n", expr: "(-1)^n / n" },
              { label: "√n", expr: "sqrt(n)" },
              { label: "0.8^n", expr: "0.8^n" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setEqExpr(p.expr)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Color Swatches */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>Màu:</span>
        {CURVE2D_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Chọn màu ${c}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: color === c ? "2px solid #0f172a" : "1px solid #cbd5e1",
              background: c,
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={submit}
          style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Vẽ lên hệ trục
        </button>
      </div>
    </div>
  );
};

