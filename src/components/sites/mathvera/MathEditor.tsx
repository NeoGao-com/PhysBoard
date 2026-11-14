"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import "mathlive/static.css";
import "mathlive/fonts.css";
import { worldToScreen, ViewportTransform } from "@/lib/coordinates";
import { VirtualKeyboard, VirtualKeyboardToggle } from "./VirtualKeyboard";

export interface MathfieldElementInstance extends HTMLElement {
  value: string;
  mode: "math" | "text" | "latex";
  mathVirtualKeyboardPolicy: "auto" | "manual" | "sandboxed";
  smartFence: boolean;
  smartSuperscript: boolean;
  getValue: (format?: string) => string;
  setValue: (value: string, options?: { silenceNotifications?: boolean }) => void;
  insert: (s: string, options?: { selectionMode?: string; focus?: boolean }) => boolean;
  executeCommand: (command: string | [string, ...unknown[]]) => boolean;
  queryStyle: (style: Record<string, string>) => string;
  applyStyle: (style: Record<string, string>, options?: { operation?: string }) => void;
}

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        ref?: React.Ref<MathfieldElementInstance>;
      };
    }
  }
}

export const KATEX_MACROS: Record<string, string> = {
  "\\differentialD": "\\mathrm{d}",
  "\\exponentialE": "\\mathrm{e}",
  "\\imaginaryI": "\\mathrm{i}",
  "\\imaginaryJ": "\\mathrm{j}",
  "\\differenceD": "\\mathrm{D}",
  "\\mleft": "\\left",
  "\\mright": "\\right",
  "\\placeholder": "\\square",
  "\\chiahet": "\\mathrel{\\smash{\\raisebox{-0.12em}{$\\vdots$}}}",
  "\\khongchiahet":
    "\\mathrel{\\smash{\\raisebox{-0.12em}{$\\vdots$}}\\mathllap{/\\mkern-2mu}}",
  "\\overgroup": "\\widehat{#1}",
};

const ESCAPED_MATH_CMDS = new Set([
  "int", "iint", "iiint", "oint", "sum", "prod", "lim",
  "frac", "dfrac", "tfrac", "sqrt",
  "sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan",
  "log", "ln", "exp", "pi", "alpha", "beta", "gamma", "delta", "epsilon",
  "theta", "lambda", "mu", "phi", "sigma", "omega", "Delta", "Omega",
  "infty", "le", "leq", "ge", "geq", "ne", "neq", "approx", "equiv",
  "pm", "mp", "cdot", "times", "div", "vec", "overrightarrow", "widehat",
  "bar", "overline", "underline", "hat", "tilde", "forall", "exists",
  "in", "notin", "subset", "subseteq", "cup", "cap", "emptyset",
  "to", "rightarrow", "leftarrow", "leftrightarrow", "Rightarrow", "Leftrightarrow",
  "mathbb", "mathrm", "mathbf", "left", "right", "begin", "end",
  "differentialD", "exponentialE", "imaginaryI",
]);

function unwrapSingleTextContainer(s: string): string {
  if (!s.startsWith("\\text{") || !s.endsWith("}")) return s;
  let depth = 0;
  for (let i = 5; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && i + 1 < s.length) {
      i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return i === s.length - 1 ? s.slice(6, -1) : s;
      }
    }
  }
  return s;
}

/**
 * Normalizes MathLive LaTeX output into clean KaTeX-compatible LaTeX.
 */
export function normalizeLatexForKaTeX(raw: string): string {
  let s = String(raw ?? "");
  let hasEscapedCmd = false;
  s = s.replace(
    /(?:\\textbackslash(?:\{\}|\s*)|\\backslash\s*)([a-zA-Z]+)/g,
    (full, cmd: string) => {
      if (ESCAPED_MATH_CMDS.has(cmd)) {
        hasEscapedCmd = true;
        return `\\${cmd}`;
      }
      return full;
    }
  );
  if (hasEscapedCmd) {
    s = s
      .replace(/\\textasciicircum\{\}|\\textasciicircum\s*/g, "^")
      .replace(/(?<!\\)\\_/g, "_")
      .replace(/(?<!\\)\\\^/g, "^")
      .replace(/(?<!\\)\\\{/g, "{")
      .replace(/(?<!\\)\\\}/g, "}");
    s = unwrapSingleTextContainer(s);
  }

  return s
    .replace(/\\mleft/g, "\\left")
    .replace(/\\mright/g, "\\right")
    .replace(/\\differentialD/g, "\\mathrm{d}")
    .replace(/\\exponentialE/g, "\\mathrm{e}")
    .replace(/\\imaginaryI/g, "\\mathrm{i}")
    .replace(/\\placeholder\{\}/g, "\\square")
    .replace(/\\placeholder\{([^}]*)\}/g, "$1")
    .replace(
      /\\not\s*(?:\{\s*\\vdots\s*\}|\\vdots(?![a-zA-Z]))/g,
      "\\khongchiahet "
    )
    .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
    .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
    .trim();
}

let mathLiveLoadPromise: Promise<void> | null = null;

/**
 * Loads MathLive in browser context only, suppresses network font/sound fetches
 * (static fonts are bundled via mathlive/fonts.css), and registers <math-field>.
 */
export function ensureMathLiveRegistered(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (customElements.get("math-field") !== undefined) {
    return Promise.resolve();
  }
  if (!mathLiveLoadPromise) {
    mathLiveLoadPromise = import("mathlive").then((mod) => {
      const MFE = mod.MathfieldElement;
      if (MFE) {
        MFE.fontsDirectory = null;
        MFE.soundsDirectory = null;
        const win = window as unknown as Record<string, unknown>;
        if (!win.MathfieldElement) {
          win.MathfieldElement = MFE;
        }
      }
      return customElements.whenDefined("math-field").then(() => undefined);
    });
  }
  return mathLiveLoadPromise;
}

if (typeof window !== "undefined") {
  void ensureMathLiveRegistered();
}

export interface MathEditorProps {
  initialLatex?: string;
  /** World coordinates (x, y) if positioning on whiteboard SVG */
  worldPos?: { x: number; y: number };
  viewport?: ViewportTransform;
  /** Direct screen coordinates (px), overrides worldPos if provided */
  screenPos?: { left: number; top: number };
  fontSize?: number;
  defaultKeyboardOpen?: boolean;
  onCommit: (latex: string) => void;
  onCancel: () => void;
  onChange?: (latex: string) => void;
  onPlotFunction?: (latex: string) => void;
  onBuildVarTable?: (latex: string) => void;
  onShadeIntegral?: (latex: string) => void;
  onSolveEquation?: (latex: string) => void;
}

/**
 * Interactive MathLive <math-field> editor positioned at math world coordinates
 * with strict keystroke isolation (Backspace/Delete edits formula only; Enter commits).
 */
export const MathEditor: React.FC<MathEditorProps> = ({
  initialLatex = "",
  worldPos,
  viewport,
  screenPos,
  fontSize = 20,
  defaultKeyboardOpen = true,
  onCommit,
  onCancel,
  onChange,
  onPlotFunction,
  onBuildVarTable,
  onShadeIntegral,
  onSolveEquation,
}) => {
  const mfRef = useRef<MathfieldElementInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState<boolean>(() =>
    typeof window !== "undefined" ? customElements.get("math-field") !== undefined : false
  );
  const [keyboardOpen, setKeyboardOpen] = useState<boolean>(defaultKeyboardOpen);
  const [isTextMode, setIsTextMode] = useState<boolean>(false);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);

  const committedRef = useRef<boolean>(false);
  const callbacksRef = useRef({ onCommit, onCancel, onChange });

  useEffect(() => {
    callbacksRef.current = { onCommit, onCancel, onChange };
  }, [onCommit, onCancel, onChange]);

  useEffect(() => {
    let active = true;
    void ensureMathLiveRegistered().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const readFieldValue = useCallback((): string => {
    const mf = mfRef.current;
    if (!mf) return "";
    if (typeof mf.getValue === "function") {
      return mf.getValue() ?? "";
    }
    return mf.value ?? "";
  }, []);

  const commitNow = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    const raw = readFieldValue();
    const cleaned = normalizeLatexForKaTeX(raw);
    if (!cleaned) {
      callbacksRef.current.onCancel();
      return;
    }
    callbacksRef.current.onCommit(cleaned);
  }, [readFieldValue]);

  const cancelNow = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    callbacksRef.current.onCancel();
  }, []);

  const syncModeFlags = useCallback(() => {
    const mf = mfRef.current;
    if (!mf) return;
    const textMode = mf.mode === "text";
    setIsTextMode(textMode);
    if (textMode && typeof mf.queryStyle === "function") {
      setIsBold(mf.queryStyle({ fontSeries: "b" }) === "all");
      setIsItalic(mf.queryStyle({ fontShape: "it" }) === "all");
    } else {
      setIsBold(false);
      setIsItalic(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const mf = mfRef.current;
    if (!mf) return;

    committedRef.current = false;
    mf.mathVirtualKeyboardPolicy = "manual";
    mf.smartFence = true;
    mf.smartSuperscript = true;

    if (initialLatex) {
      if (typeof mf.setValue === "function") {
        mf.setValue(initialLatex, { silenceNotifications: true });
      } else {
        mf.value = initialLatex;
      }
    }

    mf.focus();
    const focusTimer = window.setTimeout(() => {
      if (document.activeElement !== mf) {
        mf.focus();
      }
    }, 0);

    const handleInput = () => {
      callbacksRef.current.onChange?.(readFieldValue());
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Isolate all keystrokes inside math-field from global whiteboard shortcuts
      e.stopPropagation();

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const lower = e.key.toLowerCase();
        if (lower === "b" || lower === "i") {
          e.preventDefault();
          if (mf.mode !== "text" && typeof mf.executeCommand === "function") {
            mf.executeCommand(["switchMode", "text"]);
          }
          if (typeof mf.applyStyle === "function") {
            const curBold = mf.queryStyle?.({ fontSeries: "b" }) === "all";
            const curItal = mf.queryStyle?.({ fontShape: "it" }) === "all";
            mf.applyStyle(
              {
                fontSeries: (lower === "b" ? !curBold : curBold) ? "b" : "m",
                fontShape: (lower === "i" ? !curItal : curItal) ? "it" : "n",
              },
              { operation: "set" }
            );
          }
          syncModeFlags();
          return;
        }
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey && typeof mf.insert === "function") {
          mf.insert("\\\\");
        } else {
          commitNow();
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        cancelNow();
      }
    };

    const mountedAt = performance.now();
    const handleBlur = () => {
      if (performance.now() - mountedAt < 400) {
        return;
      }
      window.setTimeout(() => {
        if (committedRef.current) return;
        const container = containerRef.current;
        const activeEl = document.activeElement;
        if (
          container &&
          activeEl &&
          (container.contains(activeEl) || activeEl === mf)
        ) {
          return;
        }
        const val = readFieldValue().trim();
        if (val) {
          commitNow();
        } else {
          cancelNow();
        }
      }, 150);
    };

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (committedRef.current) return;
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        e.stopPropagation();
        commitNow();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancelNow();
      }
    };

    mf.addEventListener("input", handleInput);
    mf.addEventListener("keydown", handleKeyDown);
    mf.addEventListener("blur", handleBlur);
    mf.addEventListener("mode-change", syncModeFlags);
    mf.addEventListener("selection-change", syncModeFlags);
    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleWindowKeyDown);
      mf.removeEventListener("input", handleInput);
      mf.removeEventListener("keydown", handleKeyDown);
      mf.removeEventListener("blur", handleBlur);
      mf.removeEventListener("mode-change", syncModeFlags);
      mf.removeEventListener("selection-change", syncModeFlags);
    };
  }, [ready, initialLatex, readFieldValue, commitNow, cancelNow, syncModeFlags]);

  const handleToggleMode = (toText: boolean) => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.focus();
    if (typeof mf.executeCommand === "function") {
      mf.executeCommand(["switchMode", toText ? "text" : "math"]);
    }
    syncModeFlags();
  };

  const handleStyleToggle = (which: "bold" | "italic") => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.focus();
    if (mf.mode !== "text" && typeof mf.executeCommand === "function") {
      mf.executeCommand(["switchMode", "text"]);
    }
    if (typeof mf.applyStyle === "function") {
      const nextBold = which === "bold" ? !isBold : isBold;
      const nextItalic = which === "italic" ? !isItalic : isItalic;
      mf.applyStyle(
        {
          fontSeries: nextBold ? "b" : "m",
          fontShape: nextItalic ? "it" : "n",
        },
        { operation: "set" }
      );
    }
    syncModeFlags();
  };

  const handleVirtualInsert = (latex: string) => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.focus();
    if (typeof mf.insert === "function") {
      mf.insert(latex, { selectionMode: "placeholder", focus: true });
    } else {
      mf.value = (mf.value ?? "") + latex;
    }
    mf.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const handleBackspace = () => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.focus();
    if (typeof mf.executeCommand === "function") {
      mf.executeCommand("deleteBackward");
    }
  };

  const handleClearAll = () => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.focus();
    if (typeof mf.setValue === "function") {
      mf.setValue("");
    } else {
      mf.value = "";
    }
    mf.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // Resolve screen position from screenPos or worldPos + viewport
  let left = 240;
  let top = 160;
  if (screenPos) {
    left = screenPos.left;
    top = screenPos.top;
  } else if (worldPos && viewport) {
    const pt = worldToScreen(
      worldPos.x,
      worldPos.y,
      viewport.tx,
      viewport.ty,
      viewport.scale
    );
    left = pt.screenX;
    top = pt.screenY;
  }

  return (
    <div
      ref={containerRef}
      data-wb-inplace="true"
      className="wb-math-editor"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: Math.max(12, Math.min(left, typeof window !== "undefined" ? window.innerWidth - 360 : left)),
        top: Math.max(56, Math.min(top, typeof window !== "undefined" ? window.innerHeight - 240 : top)),
        zIndex: 85,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        pointerEvents: "auto",
      }}
    >
      {/* Inline Editor Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1.5px solid #2563eb",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.16)",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 280,
        }}
      >
        {/* Mode & Formatting Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: "wrap",
            fontSize: 12,
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleToggleMode(false)}
            style={{
              padding: "2px 7px",
              borderRadius: 5,
              border: "none",
              background: !isTextMode ? "#e8f0fe" : "#f1f5f9",
              color: !isTextMode ? "#1a56db" : "#475569",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ∑ Toán
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleToggleMode(true)}
            style={{
              padding: "2px 7px",
              borderRadius: 5,
              border: "none",
              background: isTextMode ? "#e8f0fe" : "#f1f5f9",
              color: isTextMode ? "#1a56db" : "#475569",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Aa Chữ
          </button>
          <button
            type="button"
            title="In đậm (Ctrl+B)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleStyleToggle("bold")}
            style={{
              padding: "2px 7px",
              borderRadius: 5,
              border: "1px solid #e2e8f0",
              background: isBold ? "#e8f0fe" : "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            B
          </button>
          <button
            type="button"
            title="In nghiêng (Ctrl+I)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleStyleToggle("italic")}
            style={{
              padding: "2px 7px",
              borderRadius: 5,
              border: "1px solid #e2e8f0",
              background: isItalic ? "#e8f0fe" : "#fff",
              fontStyle: "italic",
              cursor: "pointer",
            }}
          >
            I
          </button>
          <button
            type="button"
            title="Xoá ký tự trước"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleBackspace}
            style={{
              padding: "2px 7px",
              borderRadius: 5,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            ⌫ Xoá
          </button>
          <button
            type="button"
            title="Xoá hết công thức"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearAll}
            style={{
              padding: "2px 7px",
              borderRadius: 5,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#dc2626",
              cursor: "pointer",
            }}
          >
            Xoá hết
          </button>
          <VirtualKeyboardToggle
            open={keyboardOpen}
            onToggle={() => setKeyboardOpen((prev) => !prev)}
          />
        </div>

        {/* Real MathLive <math-field> Element */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {ready ? (
            <math-field
              ref={mfRef}
              style={{
                minWidth: 230,
                fontSize,
                flex: 1,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#0f172a",
                outline: "none",
              }}
            />
          ) : (
            <div style={{ minWidth: 230, height: 34, color: "#64748b", fontSize: 13 }}>
              Đang tải trình soạn công thức…
            </div>
          )}

          <button
            type="button"
            title="Hoàn thành (Enter)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commitNow}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 6,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✓
          </button>
          <button
            type="button"
            title="Huỷ (Esc)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelNow}
            style={{
              height: 30,
              padding: "0 8px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* 1-Click Quick Actions: Đồ thị hàm, Bảng biến thiên, Tô miền tích phân */}
        {(onPlotFunction || onBuildVarTable || onShadeIntegral) && (
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              flexWrap: "wrap",
              borderTop: "1px solid #f1f5f9",
              paddingTop: 6,
            }}
          >
            {onSolveEquation && (
              <button
                type="button"
                data-action="formula-quick-solve"
                title="Giải phương trình hoặc hệ phương trình vừa nhập"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const val = readFieldValue();
                  if (val.trim()) onSolveEquation(val);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #c7d2fe",
                  background: "#eef2ff",
                  color: "#4338ca",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                ⚡ Giải PT / Hệ PT
              </button>
            )}
            {onPlotFunction && (
              <button
                type="button"
                data-action="formula-quick-plot"
                title="Vẽ đồ thị hàm số này trên hệ trục Oxy"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const val = readFieldValue();
                  if (val.trim()) onPlotFunction(val);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                📈 Vẽ đồ thị hàm này
              </button>
            )}
            {onBuildVarTable && (
              <button
                type="button"
                data-action="formula-quick-vartable"
                title="Tạo bảng biến thiên tự động theo chuẩn SGK Việt Nam"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const val = readFieldValue();
                  onBuildVarTable(val);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #fed7aa",
                  background: "#fff7ed",
                  color: "#c2410c",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                📋 Tạo bảng biến thiên
              </button>
            )}
            {onShadeIntegral && (
              <button
                type="button"
                data-action="formula-quick-shade"
                title="Tô miền tích phân và tính diện tích hình phẳng"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const val = readFieldValue();
                  if (val.trim()) onShadeIntegral(val);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#15803d",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                ∫ Tô miền tích phân
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6-Category Virtual Math Keyboard */}
      <VirtualKeyboard
        visible={keyboardOpen}
        onInsert={handleVirtualInsert}
        onClose={() => setKeyboardOpen(false)}
      />
    </div>
  );
};
