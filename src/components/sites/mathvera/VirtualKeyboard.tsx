"use client";

import React, { useState } from "react";

export type VirtualKeyboardCategory =
  | "templates"
  | "relations"
  | "logic"
  | "analysis"
  | "geometry"
  | "greek";

export interface VirtualKeyItem {
  label: string;
  keyId: string; // data-insert & data-key attribute value
  latex: string; // payload inserted into MathLive field
  title: string;
}

export interface VirtualKeyboardTab {
  id: VirtualKeyboardCategory;
  label: string;
  shortLabel: string;
  items: VirtualKeyItem[];
}

export const VIRTUAL_KEYBOARD_TABS: ReadonlyArray<VirtualKeyboardTab> = [
  {
    id: "templates",
    label: "Mẫu",
    shortLabel: "Cơ bản",
    items: [
      { label: "a/b", keyId: "\\frac", latex: "\\frac{a}{b}", title: "Phân số" },
      { label: "xⁿ", keyId: "^", latex: "{#?}^{#?}", title: "Mũ" },
      { label: "x▾", keyId: "_", latex: "{#?}_{#?}", title: "Chỉ số dưới" },
      { label: "√", keyId: "\\sqrt", latex: "\\sqrt{#?}", title: "Căn bậc hai" },
      { label: "ⁿ√", keyId: "\\sqrt[n]", latex: "\\sqrt[#?]{#?}", title: "Căn bậc n" },
      { label: "|x|", keyId: "\\left|", latex: "\\left|#?\\right|", title: "Trị tuyệt đối" },
      { label: "(ⁿₖ)", keyId: "\\binom", latex: "\\binom{#?}{#?}", title: "Tổ hợp" },
      { label: "⎰hệ2", keyId: "\\begin{cases}", latex: "\\begin{cases}#?\\\\#?\\end{cases}", title: "Hệ 2 phương trình" },
      { label: "⎰hệ3", keyId: "cases3", latex: "\\begin{cases}#?\\\\#?\\\\#?\\end{cases}", title: "Hệ 3 phương trình" },
      { label: "log", keyId: "\\log", latex: "\\log_{#?}{#?}", title: "Logarit cơ số" },
      { label: "x̄", keyId: "\\overline", latex: "\\overline{#?}", title: "Gạch trên / đoạn" },
      { label: "→a", keyId: "\\vec", latex: "\\vec{#?}", title: "Vectơ" },
      { label: "→AB", keyId: "\\overrightarrow", latex: "\\overrightarrow{#?}", title: "Vectơ AB" },
      { label: "⌢", keyId: "\\overgroup", latex: "\\overgroup{#?}", title: "Cung" },
      { label: "Â", keyId: "\\widehat", latex: "\\widehat{#?}", title: "Góc (mũ trên tên)" },
    ],
  },
  {
    id: "relations",
    label: "Quan hệ",
    shortLabel: "Quan hệ",
    items: [
      { label: "±", keyId: "\\pm", latex: "\\pm ", title: "Cộng trừ" },
      { label: "=", keyId: "=", latex: "=", title: "Bằng" },
      { label: "≥", keyId: "\\geq", latex: "\\geq ", title: "Lớn hơn hoặc bằng" },
      { label: "≤", keyId: "\\leq", latex: "\\leq ", title: "Nhỏ hơn hoặc bằng" },
      { label: "≠", keyId: "\\neq", latex: "\\neq ", title: "Khác" },
      { label: "≈", keyId: "\\approx", latex: "\\approx ", title: "Xấp xỉ" },
      { label: "≡", keyId: "\\equiv", latex: "\\equiv ", title: "Đồng dư" },
      { label: "≢", keyId: "\\not\\equiv", latex: "\\not\\equiv ", title: "Không đồng dư" },
      { label: "⋮", keyId: "\\chiahet", latex: "\\chiahet ", title: "Chia hết" },
      { label: "⋮̸", keyId: "\\khongchiahet", latex: "\\khongchiahet ", title: "Không chia hết" },
      { label: "∼", keyId: "\\sim", latex: "\\sim ", title: "Dấu ngã" },
      { label: "∽", keyId: "\\backsim", latex: "\\backsim ", title: "Đồng dạng" },
      { label: "≅", keyId: "\\cong", latex: "\\cong ", title: "Bằng / đồng dạng" },
      { label: "⇒", keyId: "\\Rightarrow", latex: "\\Rightarrow ", title: "Suy ra" },
      { label: "⇔", keyId: "\\Leftrightarrow", latex: "\\Leftrightarrow ", title: "Tương đương" },
    ],
  },
  {
    id: "logic",
    label: "Logic & Tập hợp",
    shortLabel: "Logic",
    items: [
      { label: "∀", keyId: "\\forall", latex: "\\forall ", title: "Với mọi" },
      { label: "∃", keyId: "\\exists", latex: "\\exists ", title: "Tồn tại" },
      { label: "∄", keyId: "\\nexists", latex: "\\nexists ", title: "Không tồn tại" },
      { label: "∈", keyId: "\\in", latex: "\\in ", title: "Thuộc" },
      { label: "∉", keyId: "\\notin", latex: "\\notin ", title: "Không thuộc" },
      { label: "⊂", keyId: "\\subset", latex: "\\subset ", title: "Tập con" },
      { label: "⊆", keyId: "\\subseteq", latex: "\\subseteq ", title: "Tập con hoặc bằng" },
      { label: "⊃", keyId: "\\supset", latex: "\\supset ", title: "Chứa" },
      { label: "∩", keyId: "\\cap", latex: "\\cap ", title: "Giao" },
      { label: "∪", keyId: "\\cup", latex: "\\cup ", title: "Hợp" },
      { label: "∖", keyId: "\\setminus", latex: "\\setminus ", title: "Hiệu tập" },
      { label: "∅", keyId: "\\emptyset", latex: "\\emptyset ", title: "Tập rỗng" },
      { label: "ℝ", keyId: "\\mathbb{R}", latex: "\\mathbb{R}", title: "Tập số thực" },
      { label: "ℕ", keyId: "\\mathbb{N}", latex: "\\mathbb{N}", title: "Tập số tự nhiên" },
      { label: "ℤ", keyId: "\\mathbb{Z}", latex: "\\mathbb{Z}", title: "Tập số nguyên" },
    ],
  },
  {
    id: "analysis",
    label: "Giải tích",
    shortLabel: "Giải tích",
    items: [
      { label: "∫", keyId: "\\int", latex: "\\int_{#?}^{#?}", title: "Tích phân" },
      { label: "Σ", keyId: "\\sum", latex: "\\sum_{#?}^{#?}", title: "Tổng có cận" },
      { label: "∏", keyId: "\\prod", latex: "\\prod_{#?}^{#?}", title: "Tích có cận" },
      { label: "lim", keyId: "\\lim", latex: "\\lim_{#?}", title: "Giới hạn" },
      { label: "∞", keyId: "\\infty", latex: "\\infty ", title: "Vô cùng" },
      { label: "∂", keyId: "\\partial", latex: "\\partial ", title: "Đạo hàm riêng" },
      { label: "⋯", keyId: "\\cdots", latex: "\\cdots ", title: "Ba chấm giữa" },
      { label: "ln", keyId: "\\ln", latex: "\\ln ", title: "Logarit tự nhiên" },
      { label: "sin", keyId: "\\sin", latex: "\\sin ", title: "Sin" },
      { label: "cos", keyId: "\\cos", latex: "\\cos ", title: "Cos" },
      { label: "tan", keyId: "\\tan", latex: "\\tan ", title: "Tan" },
      { label: "cot", keyId: "\\cot", latex: "\\cot ", title: "Cot" },
    ],
  },
  {
    id: "geometry",
    label: "Hình học",
    shortLabel: "Hình học",
    items: [
      { label: "∠", keyId: "\\angle", latex: "\\angle ", title: "Góc" },
      { label: "∡", keyId: "\\measuredangle", latex: "\\measuredangle ", title: "Góc đo" },
      { label: "△", keyId: "\\triangle", latex: "\\triangle ", title: "Tam giác" },
      { label: "□", keyId: "\\square", latex: "\\square ", title: "Hình vuông / góc vuông" },
      { label: "⊙", keyId: "\\odot", latex: "\\odot ", title: "Đường tròn" },
      { label: "∥", keyId: "\\parallel", latex: "\\parallel ", title: "Song song" },
      { label: "⊥", keyId: "\\perp", latex: "\\perp ", title: "Vuông góc" },
      { label: "°", keyId: "^{\\circ}", latex: "^{\\circ}", title: "Độ" },
    ],
  },
  {
    id: "greek",
    label: "Ký tự Hy Lạp",
    shortLabel: "Hy Lạp",
    items: [
      { label: "α", keyId: "\\alpha", latex: "\\alpha ", title: "alpha" },
      { label: "β", keyId: "\\beta", latex: "\\beta ", title: "beta" },
      { label: "γ", keyId: "\\gamma", latex: "\\gamma ", title: "gamma" },
      { label: "δ", keyId: "\\delta", latex: "\\delta ", title: "delta" },
      { label: "ε", keyId: "\\varepsilon", latex: "\\varepsilon ", title: "epsilon" },
      { label: "ζ", keyId: "\\zeta", latex: "\\zeta ", title: "zeta" },
      { label: "η", keyId: "\\eta", latex: "\\eta ", title: "eta" },
      { label: "θ", keyId: "\\theta", latex: "\\theta ", title: "theta" },
      { label: "κ", keyId: "\\kappa", latex: "\\kappa ", title: "kappa" },
      { label: "λ", keyId: "\\lambda", latex: "\\lambda ", title: "lambda" },
      { label: "μ", keyId: "\\mu", latex: "\\mu ", title: "mu" },
      { label: "ν", keyId: "\\nu", latex: "\\nu ", title: "nu" },
      { label: "ξ", keyId: "\\xi", latex: "\\xi ", title: "xi" },
      { label: "π", keyId: "\\pi", latex: "\\pi ", title: "pi" },
      { label: "ρ", keyId: "\\rho", latex: "\\rho ", title: "rho" },
      { label: "σ", keyId: "\\sigma", latex: "\\sigma ", title: "sigma" },
      { label: "τ", keyId: "\\tau", latex: "\\tau ", title: "tau" },
      { label: "φ", keyId: "\\varphi", latex: "\\varphi ", title: "phi" },
      { label: "χ", keyId: "\\chi", latex: "\\chi ", title: "chi" },
      { label: "ψ", keyId: "\\psi", latex: "\\psi ", title: "psi" },
      { label: "ω", keyId: "\\omega", latex: "\\omega ", title: "omega" },
      { label: "Γ", keyId: "\\Gamma", latex: "\\Gamma ", title: "Gamma" },
      { label: "Δ", keyId: "\\Delta", latex: "\\Delta ", title: "Delta" },
      { label: "Θ", keyId: "\\Theta", latex: "\\Theta ", title: "Theta" },
      { label: "Λ", keyId: "\\Lambda", latex: "\\Lambda ", title: "Lambda" },
      { label: "Ξ", keyId: "\\Xi", latex: "\\Xi ", title: "Xi" },
      { label: "Π", keyId: "\\Pi", latex: "\\Pi ", title: "Pi" },
      { label: "Σ", keyId: "\\Sigma", latex: "\\Sigma ", title: "Sigma" },
      { label: "Φ", keyId: "\\Phi", latex: "\\Phi ", title: "Phi" },
      { label: "Ψ", keyId: "\\Psi", latex: "\\Psi ", title: "Psi" },
      { label: "Ω", keyId: "\\Omega", latex: "\\Omega ", title: "Omega" },
    ],
  },
];

export interface VirtualKeyboardProps {
  visible?: boolean;
  onInsert: (latex: string) => void;
  onClose?: () => void;
  defaultTab?: VirtualKeyboardCategory;
  className?: string;
}

export interface VirtualKeyboardToggleProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Toggle button matching Playwright selector `button[data-action="toggle-keyboard"]`, `.wb-keyboard-toggle`, `[title*="Bàn phím"]`.
 */
export const VirtualKeyboardToggle: React.FC<VirtualKeyboardToggleProps> = ({
  open,
  onToggle,
}) => (
  <button
    type="button"
    data-action="toggle-keyboard"
    className="wb-keyboard-toggle"
    title={open ? "Ẩn bàn phím toán học" : "Hiện bàn phím toán học"}
    aria-pressed={open}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onToggle}
    style={{
      height: 26,
      padding: "0 8px",
      borderRadius: 6,
      border: "1px solid #cbd5e1",
      background: open ? "#e8f0fe" : "#f8fafc",
      color: open ? "#1a56db" : "#334155",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    }}
  >
    ⌨ Bàn phím
  </button>
);

/**
 * 6-category virtual math keyboard palette (`[data-wb-keyboard="true"]`, `.wb-virtual-keyboard`).
 */
export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  visible = true,
  onInsert,
  onClose,
  defaultTab = "templates",
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<VirtualKeyboardCategory>(defaultTab);

  if (!visible) return null;

  const currentTab =
    VIRTUAL_KEYBOARD_TABS.find((t) => t.id === activeTab) ??
    VIRTUAL_KEYBOARD_TABS[0];

  return (
    <div
      data-wb-keyboard="true"
      className={`wb-virtual-keyboard ${className}`.trim()}
      onMouseDown={(e) => {
        // Prevent stealing focus from <math-field>
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.14)",
        padding: 8,
        width: 440,
        maxWidth: "calc(100vw - 24px)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        userSelect: "none",
        zIndex: 80,
      }}
    >
      {/* Category Tabs */}
      <div
        role="tablist"
        aria-label="Danh mục ký hiệu toán học"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexWrap: "wrap",
          paddingBottom: 6,
          marginBottom: 6,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {VIRTUAL_KEYBOARD_TABS.map((tab) => {
          const isActive = tab.id === currentTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab={tab.id}
              aria-selected={isActive}
              title={tab.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                border: "none",
                background: isActive ? "#e8f0fe" : "#f1f5f9",
                color: isActive ? "#1a56db" : "#475569",
                fontSize: 11.5,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
        {onClose && (
          <button
            type="button"
            title="Đóng bàn phím"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClose}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              color: "#64748b",
              fontSize: 13,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Symbol Grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {currentTab.items.map((item) => (
          <button
            key={`${currentTab.id}-${item.keyId}-${item.label}`}
            type="button"
            data-insert={item.keyId}
            data-key={item.keyId}
            title={item.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(item.latex)}
            style={{
              minWidth: 34,
              height: 30,
              padding: "0 7px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
