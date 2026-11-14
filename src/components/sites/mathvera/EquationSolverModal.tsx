"use client";

import React, { useState } from "react";
import type { EquationSolution } from "@/lib/equation-solver";

export interface EquationSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  solution: EquationSolution | null;
  onInsertToCanvas?: (latex: string) => void;
}

export const EquationSolverModal: React.FC<EquationSolverModalProps> = ({
  isOpen,
  onClose,
  solution,
  onInsertToCanvas,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !solution) return null;

  const handleCopy = () => {
    if (solution.latexSummary) {
      navigator.clipboard?.writeText(solution.latexSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInsert = () => {
    if (solution.latexSummary && onInsertToCanvas) {
      onInsertToCanvas(solution.latexSummary);
      onClose();
    }
  };

  return (
    <div
      data-export-skip="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 11000,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: 480,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 20,
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#e0f2fe",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ⚡
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                {solution.title || "Kết quả giải phương trình"}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                Nghiệm chính xác & xấp xỉ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 18,
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {solution.type === "none" ? (
            <div
              style={{
                padding: "16px",
                borderRadius: 12,
                background: "#fef2f2",
                border: "1px solid #fee2e2",
                color: "#991b1b",
                fontSize: 14,
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              ❌ Phương trình vô nghiệm hoặc không tìm thấy nghiệm trong miền khảo sát!
            </div>
          ) : solution.type === "infinite" ? (
            <div
              style={{
                padding: "16px",
                borderRadius: 12,
                background: "#f0fdf4",
                border: "1px solid #dcfce7",
                color: "#166534",
                fontSize: 14,
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              ♾️ Hệ phương trình có vô số nghiệm!
            </div>
          ) : solution.type === "error" ? (
            <div
              style={{
                padding: "16px",
                borderRadius: 12,
                background: "#fffbeb",
                border: "1px solid #fef3c7",
                color: "#92400e",
                fontSize: 14,
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              ⚠️ Không thể phân tích công thức này dưới dạng phương trình / hệ phương trình hợp lệ. Hãy kiểm tra lại cú pháp!
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 8,
                }}
              >
                Các nghiệm tìm được:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {solution.solutions.map((sol, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "math, serif",
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      {sol.variable}
                    </span>
                    <span
                      style={{
                        fontFamily: "math, serif",
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#2563eb",
                        background: "#eff6ff",
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      = {sol.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {solution.steps && solution.steps.length > 0 && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 13,
                color: "#475569",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#1e293b" }}>Các bước:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {solution.steps.map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            background: "#fafafa",
          }}
        >
          {solution.latexSummary && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copied ? "✓ Đã chép" : "📋 Chép LaTeX"}
              </button>
              {onInsertToCanvas && (
                <button
                  type="button"
                  onClick={handleInsert}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                  }}
                >
                  ➕ Chèn nghiệm lên bảng
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#64748b",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
