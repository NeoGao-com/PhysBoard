"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { IconCalculator } from "./ToolbarIcons";
import { parseMathExpression, evalAst } from "@/lib/math-eval";

export interface CalculatorWidgetProps {
  open: boolean;
  onClose: () => void;
  onInsertLatex?: (latex: string) => void;
}

// Factorial helper
function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity; // JS Number overflow
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export const CalculatorWidget: React.FC<CalculatorWidgetProps> = ({
  open,
  onClose,
  onInsertLatex,
}) => {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string>("");
  const [history, setHistory] = useState<Array<{ expr: string; res: string }>>([]);
  const [angleMode, setAngleMode] = useState<"deg" | "rad">("deg");
  const [isMinimized, setIsMinimized] = useState(false);

  // Floating draggable state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== "undefined") {
      return {
        x: Math.max(20, window.innerWidth - 380),
        y: Math.max(60, 100),
      };
    }
    return { x: 500, y: 100 };
  });

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Evaluate the expression safely
  const calculateResult = useCallback(
    (exprToEval?: string) => {
      const expr = (exprToEval !== undefined ? exprToEval : expression).trim();
      if (!expr) {
        setResult("");
        return "";
      }

      try {
        // Pre-process for angle mode if deg:
        // Replace sin(x), cos(x), tan(x) with sin(x * pi / 180) if in deg mode
        let processed = expr;

        // Support factorial n!
        processed = processed.replace(/(\d+(?:\.\d+)?|\bpi\b|\be\b)\s*!/g, (_, num) => {
          const val = Number(num);
          if (!isNaN(val)) {
            return String(factorial(val));
          }
          return _;
        });

        if (angleMode === "deg") {
          // Wrap arguments of sin, cos, tan, cot, sec, csc with (* pi / 180)
          // Simple regex for function calls with simple or paren arguments
          processed = processed.replace(
            /\b(sin|cos|tan|cot|sec|csc)\s*\(([^)]+)\)/g,
            (_, fn, inner) => `${fn}((${inner}) * pi / 180)`
          );
        }

        // Parse and eval AST
        const ast = parseMathExpression(processed);
        const val = evalAst(ast, {});

        if (val === undefined || isNaN(val)) {
          setResult("Lỗi tính toán");
          return "";
        }

        // Format nicely
        let resStr = "";
        if (Math.abs(val) < 1e-12 && Math.abs(val) > 0) {
          resStr = "0";
        } else if (Number.isInteger(val)) {
          resStr = val.toString();
        } else {
          // Round to max 10 decimal places to eliminate floating point quirks like 0.30000000000000004
          const rounded = Number(val.toPrecision(12));
          resStr = String(parseFloat(rounded.toFixed(10)));
        }

        setResult(resStr);
        return resStr;
      } catch (err: any) {
        setResult("Lỗi cú pháp");
        return "";
      }
    },
    [expression, angleMode]
  );

  // Auto evaluate as user types or changes angle mode
  useEffect(() => {
    if (!expression.trim()) {
      setResult("");
      return;
    }
    calculateResult();
  }, [expression, angleMode, calculateResult]);

  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const res = calculateResult();
      if (res && res !== "Lỗi tính toán" && res !== "Lỗi cú pháp") {
        setHistory((prev) => [{ expr: expression, res }, ...prev.slice(0, 9)]);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleAppend = (token: string) => {
    setExpression((prev) => prev + token);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setExpression("");
    setResult("");
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleEquals = () => {
    const res = calculateResult();
    if (res && res !== "Lỗi tính toán" && res !== "Lỗi cú pháp") {
      setHistory((prev) => [{ expr: expression, res }, ...prev.slice(0, 9)]);
    }
    inputRef.current?.focus();
  };

  const handleInsertResult = () => {
    if (!result || result.startsWith("Lỗi")) return;
    onInsertLatex?.(result);
  };

  const handleInsertFormulaAndResult = () => {
    if (!expression) return;
    // Format e.g. "2 + 3 \times 4 = 14"
    const latexExpr = expression
      .replace(/\*/g, " \\times ")
      .replace(/\//g, " \\div ");
    const latex = result && !result.startsWith("Lỗi")
      ? `${latexExpr} = ${result}`
      : latexExpr;
    onInsertLatex?.(latex);
  };

  // Drag handlers
  const handleTitlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  const handleTitlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: Math.max(10, Math.min(window.innerWidth - 80, dragRef.current.origX + dx)),
      y: Math.max(10, Math.min(window.innerHeight - 60, dragRef.current.origY + dy)),
    });
  };

  const handleTitlePointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
  };

  if (!open) return null;

  return (
    <div
      data-testid="calculator-widget"
      data-calculator-open="true"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: isMinimized ? 220 : 350,
        zIndex: 5200,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 12px 36px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        userSelect: "none",
      }}
    >
      {/* Title Bar (Draggable) */}
      <div
        data-testid="calculator-titlebar"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          handleTitlePointerDown(e);
        }}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onPointerCancel={handleTitlePointerUp}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: "#1e293b",
          color: "#f8fafc",
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
          <IconCalculator size={16} color="#38bdf8" />
          <span>Máy tính học tập</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Deg/Rad Toggle in Titlebar if not minimized */}
          {!isMinimized && (
            <button
              type="button"
              data-testid="calc-deg-rad-toggle"
              onClick={() => setAngleMode((m) => (m === "deg" ? "rad" : "deg"))}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
                border: "none",
                backgroundColor: angleMode === "deg" ? "#0284c7" : "#475569",
                color: "#ffffff",
                cursor: "pointer",
              }}
              title="Chuyển đổi Độ (DEG) / Radian (RAD)"
            >
              {angleMode.toUpperCase()}
            </button>
          )}

          {/* Minimize Button */}
          <button
            type="button"
            data-testid="calc-minimize-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized((prev) => !prev);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px 6px",
              fontSize: 14,
              lineHeight: 1,
              borderRadius: 4,
            }}
            title={isMinimized ? "Mở rộng" : "Thu nhỏ"}
          >
            {isMinimized ? "□" : "—"}
          </button>

          {/* Close Button */}
          <button
            type="button"
            data-testid="calc-close-btn"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              padding: "2px 6px",
              fontSize: 14,
              lineHeight: 1,
              fontWeight: 700,
              borderRadius: 4,
            }}
            title="Đóng máy tính"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Calculator Body (hidden if minimized) */}
      {!isMinimized && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Display screen */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <input
              ref={inputRef}
              data-testid="calculator-input"
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập phép tính (vd: 2+3*4, sin(30))..."
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                fontSize: 15,
                color: "#1e293b",
                outline: "none",
                textAlign: "right",
                fontFamily: "monospace",
              }}
              autoFocus
            />
            <div
              data-testid="calculator-result"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: result.startsWith("Lỗi") ? "#ef4444" : "#0284c7",
                textAlign: "right",
                minHeight: 24,
                fontFamily: "monospace",
              }}
            >
              {result ? `= ${result}` : ""}
            </div>
          </div>

          {/* Insert onto Canvas Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              type="button"
              data-testid="calc-insert-result"
              onClick={handleInsertResult}
              disabled={!result || result.startsWith("Lỗi")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #bfdbfe",
                backgroundColor: result && !result.startsWith("Lỗi") ? "#eff6ff" : "#f1f5f9",
                color: result && !result.startsWith("Lỗi") ? "#1d4ed8" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: result && !result.startsWith("Lỗi") ? "pointer" : "not-allowed",
              }}
              title="Chèn kết quả tính toán vào bảng dưới dạng công thức toán"
            >
              <span>📥 Chèn kết quả</span>
            </button>
            <button
              type="button"
              data-testid="calc-insert-formula"
              onClick={handleInsertFormulaAndResult}
              disabled={!expression}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                backgroundColor: expression ? "#f8fafc" : "#f1f5f9",
                color: expression ? "#334155" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: expression ? "pointer" : "not-allowed",
              }}
              title="Chèn biểu thức và kết quả (ví dụ: 2 + 3 * 4 = 14) vào bảng"
            >
              <span>📋 Chèn biểu thức</span>
            </button>
          </div>

          {/* Keypad Buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 5,
            }}
          >
            {/* Row 1: Scientific functions */}
            <button
              type="button"
              data-testid="calc-btn-sin"
              onClick={() => handleAppend("sin(")}
              style={fnKeyStyle}
              title="Sin"
            >
              sin
            </button>
            <button
              type="button"
              data-testid="calc-btn-cos"
              onClick={() => handleAppend("cos(")}
              style={fnKeyStyle}
              title="Cos"
            >
              cos
            </button>
            <button
              type="button"
              data-testid="calc-btn-tan"
              onClick={() => handleAppend("tan(")}
              style={fnKeyStyle}
              title="Tan"
            >
              tan
            </button>
            <button
              type="button"
              data-testid="calc-btn-sqrt"
              onClick={() => handleAppend("sqrt(")}
              style={fnKeyStyle}
              title="Căn bậc hai"
            >
              √
            </button>
            <button
              type="button"
              data-testid="calc-btn-pow"
              onClick={() => handleAppend("^")}
              style={fnKeyStyle}
              title="Lũy thừa (^)"
            >
              xʸ
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => handleAppend("log(")}
              style={fnKeyStyle}
              title="Logarit cơ số 10"
            >
              log
            </button>
            <button
              type="button"
              onClick={() => handleAppend("ln(")}
              style={fnKeyStyle}
              title="Logarit tự nhiên (ln)"
            >
              ln
            </button>
            <button
              type="button"
              onClick={() => handleAppend("pi")}
              style={fnKeyStyle}
              title="Số Pi (π)"
            >
              π
            </button>
            <button
              type="button"
              onClick={() => handleAppend("e")}
              style={fnKeyStyle}
              title="Hằng số e"
            >
              e
            </button>
            <button
              type="button"
              onClick={() => handleAppend("!")}
              style={fnKeyStyle}
              title="Giai thừa (n!)"
            >
              n!
            </button>

            {/* Row 3 */}
            <button
              type="button"
              data-testid="calc-btn-lparen"
              onClick={() => handleAppend("(")}
              style={opKeyStyle}
            >
              (
            </button>
            <button
              type="button"
              data-testid="calc-btn-rparen"
              onClick={() => handleAppend(")")}
              style={opKeyStyle}
            >
              )
            </button>
            <button
              type="button"
              data-testid="calc-btn-clear"
              onClick={handleClear}
              style={{ ...opKeyStyle, color: "#dc2626", fontWeight: 700 }}
              title="Xoá tất cả (C)"
            >
              C
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              style={opKeyStyle}
              title="Xoá ký tự (Backspace)"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={() => handleAppend("/")}
              style={opKeyStyle}
            >
              ÷
            </button>

            {/* Row 4: 7, 8, 9, * */}
            <button
              type="button"
              data-testid="calc-btn-7"
              onClick={() => handleAppend("7")}
              style={numKeyStyle}
            >
              7
            </button>
            <button
              type="button"
              data-testid="calc-btn-8"
              onClick={() => handleAppend("8")}
              style={numKeyStyle}
            >
              8
            </button>
            <button
              type="button"
              data-testid="calc-btn-9"
              onClick={() => handleAppend("9")}
              style={numKeyStyle}
            >
              9
            </button>
            <button
              type="button"
              data-testid="calc-btn-mult"
              onClick={() => handleAppend("*")}
              style={opKeyStyle}
            >
              ×
            </button>
            <button
              type="button"
              onClick={() => handleAppend("%")}
              style={opKeyStyle}
              title="Phần trăm (%)"
            >
              %
            </button>

            {/* Row 5: 4, 5, 6, - */}
            <button
              type="button"
              data-testid="calc-btn-4"
              onClick={() => handleAppend("4")}
              style={numKeyStyle}
            >
              4
            </button>
            <button
              type="button"
              data-testid="calc-btn-5"
              onClick={() => handleAppend("5")}
              style={numKeyStyle}
            >
              5
            </button>
            <button
              type="button"
              data-testid="calc-btn-6"
              onClick={() => handleAppend("6")}
              style={numKeyStyle}
            >
              6
            </button>
            <button
              type="button"
              data-testid="calc-btn-sub"
              onClick={() => handleAppend("-")}
              style={opKeyStyle}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => handleAppend("abs(")}
              style={fnKeyStyle}
              title="Giá trị tuyệt đối"
            >
              |x|
            </button>

            {/* Row 6: 1, 2, 3, + */}
            <button
              type="button"
              data-testid="calc-btn-1"
              onClick={() => handleAppend("1")}
              style={numKeyStyle}
            >
              1
            </button>
            <button
              type="button"
              data-testid="calc-btn-2"
              onClick={() => handleAppend("2")}
              style={numKeyStyle}
            >
              2
            </button>
            <button
              type="button"
              data-testid="calc-btn-3"
              onClick={() => handleAppend("3")}
              style={numKeyStyle}
            >
              3
            </button>
            <button
              type="button"
              data-testid="calc-btn-add"
              onClick={() => handleAppend("+")}
              style={opKeyStyle}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => handleAppend("1/(")}
              style={fnKeyStyle}
              title="1/x"
            >
              1/x
            </button>

            {/* Row 7: 0, ., = */}
            <button
              type="button"
              data-testid="calc-btn-0"
              onClick={() => handleAppend("0")}
              style={{ ...numKeyStyle, gridColumn: "span 2" }}
            >
              0
            </button>
            <button
              type="button"
              data-testid="calc-btn-dot"
              onClick={() => handleAppend(".")}
              style={numKeyStyle}
            >
              .
            </button>
            <button
              type="button"
              data-testid="calc-btn-equals"
              onClick={handleEquals}
              style={{
                ...opKeyStyle,
                gridColumn: "span 2",
                backgroundColor: "#0284c7",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              =
            </button>
          </div>

          {/* Quick History List */}
          {history.length > 0 && (
            <div
              style={{
                marginTop: 4,
                borderTop: "1px solid #f1f5f9",
                paddingTop: 6,
                maxHeight: 70,
                overflowY: "auto",
                fontSize: 11,
                color: "#64748b",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Lịch sử tính gần đây:</div>
              {history.map((h, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setExpression(h.expr);
                    setResult(h.res);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "2px 4px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                  title="Bấm để lấy lại phép tính"
                >
                  <span style={{ fontFamily: "monospace" }}>{h.expr}</span>
                  <span style={{ fontWeight: 600, color: "#0284c7", fontFamily: "monospace" }}>
                    = {h.res}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const baseKeyStyle: React.CSSProperties = {
  height: 32,
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.08s ease",
};

const numKeyStyle: React.CSSProperties = {
  ...baseKeyStyle,
  backgroundColor: "#ffffff",
  color: "#0f172a",
};

const opKeyStyle: React.CSSProperties = {
  ...baseKeyStyle,
  backgroundColor: "#f1f5f9",
  color: "#334155",
};

const fnKeyStyle: React.CSSProperties = {
  ...baseKeyStyle,
  backgroundColor: "#f8fafc",
  color: "#4f46e5",
  fontSize: 12,
};
