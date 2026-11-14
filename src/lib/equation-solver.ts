/**
 * Equation and System of Equations solver for PhysBoard.
 * Supports:
 * - Linear equations in 1 variable: ax + b = c
 * - Quadratic equations in 1 variable: ax^2 + bx + c = 0
 * - Cubic equations in 1 variable: ax^3 + bx^2 + cx + d = 0
 * - General numerical root-finding using interval bisection & Newton-Raphson
 * - Systems of 2 linear equations in 2 variables (x, y)
 * - Systems of 3 linear equations in 3 variables (x, y, z)
 */

import {
  evalMathExpr,
  compileMathExpr,
  findRoots,
  simplifyFraction,
  formatCleanNumber,
} from "./math-eval";

export interface EquationSolution {
  title: string;
  type: "single" | "system" | "none" | "infinite" | "error";
  solutions: Array<{ variable: string; value: string; approximate?: number }>;
  steps?: string[];
  latexSummary: string;
}

/**
 * Normalizes raw LaTeX string to a clean expression for parsing.
 */
function cleanLatex(raw: string): string {
  let s = raw.trim();
  // Remove wrapping \left, \right
  s = s.replace(/\\left|\\right/g, "");
  // Replace \times or \cdot with *
  s = s.replace(/\\times|\\cdot/g, "*");
  // Normalize \frac{a}{b} to ((a)/(b))
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))");
  // Normalize nested or remaining braces
  s = s.replace(/\{([^{}]+)\}/g, "($1)");
  return s;
}

/**
 * Solves a 2x2 linear system using Cramer's rule:
 * a1*x + b1*y = c1
 * a2*x + b2*y = c2
 */
function solveLinear2x2(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number
): EquationSolution {
  const D = a1 * b2 - a2 * b1;
  const Dx = c1 * b2 - c2 * b1;
  const Dy = a1 * c2 - a2 * c1;

  if (Math.abs(D) < 1e-12) {
    if (Math.abs(Dx) < 1e-12 && Math.abs(Dy) < 1e-12) {
      return {
        title: "Hệ phương trình bậc nhất 2 ẩn",
        type: "infinite",
        solutions: [],
        steps: ["Định thức D = 0 và Dx = Dy = 0", "Hệ có vô số nghiệm."],
        latexSummary: "\\text{Hệ phương trình có vô số nghiệm}",
      };
    } else {
      return {
        title: "Hệ phương trình bậc nhất 2 ẩn",
        type: "none",
        solutions: [],
        steps: ["Định thức D = 0 nhưng Dx hoặc Dy khác 0", "Hệ vô nghiệm."],
        latexSummary: "\\text{Hệ phương trình vô nghiệm}",
      };
    }
  }

  const x = Dx / D;
  const y = Dy / D;

  const strX = formatCleanNumber(x);
  const strY = formatCleanNumber(y);

  return {
    title: "Hệ phương trình bậc nhất 2 ẩn",
    type: "system",
    solutions: [
      { variable: "x", value: strX, approximate: x },
      { variable: "y", value: strY, approximate: y },
    ],
    steps: [
      `D = ${formatCleanNumber(D)}, D_x = ${formatCleanNumber(Dx)}, D_y = ${formatCleanNumber(Dy)}`,
      `x = \\frac{D_x}{D} = ${strX}`,
      `y = \\frac{D_y}{D} = ${strY}`,
    ],
    latexSummary: `\\begin{cases} x = ${strX} \\\\ y = ${strY} \\end{cases}`,
  };
}

/**
 * Solves a 3x3 linear system using Gaussian elimination:
 */
function solveLinear3x3(A: number[][], B: number[]): EquationSolution {
  const n = 3;
  const M = A.map((row, i) => [...row, B[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) {
      return {
        title: "Hệ phương trình bậc nhất 3 ẩn",
        type: "none",
        solutions: [],
        steps: ["Định thức hệ bằng 0 (hệ vô nghiệm hoặc vô số nghiệm)"],
        latexSummary: "\\text{Hệ vô nghiệm hoặc vô số nghiệm}",
      };
    }
    if (pivot !== col) {
      const tmp = M[col];
      M[col] = M[pivot];
      M[pivot] = tmp;
    }
    const div = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (Math.abs(factor) < 1e-14) continue;
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
    }
  }

  const x = M[0][3];
  const y = M[1][3];
  const z = M[2][3];

  const strX = formatCleanNumber(x);
  const strY = formatCleanNumber(y);
  const strZ = formatCleanNumber(z);

  return {
    title: "Hệ phương trình bậc nhất 3 ẩn",
    type: "system",
    solutions: [
      { variable: "x", value: strX, approximate: x },
      { variable: "y", value: strY, approximate: y },
      { variable: "z", value: strZ, approximate: z },
    ],
    latexSummary: `\\begin{cases} x = ${strX} \\\\ y = ${strY} \\\\ z = ${strZ} \\end{cases}`,
  };
}

/**
 * Attempts to parse an equation line of form:
 * a*x + b*y + c*z = d  or  ax + by = c
 */
function parseLinearEqRow(
  raw: string,
  variables: string[]
): { coeffs: number[]; constTerm: number } | null {
  const parts = raw.split("=");
  if (parts.length !== 2) return null;

  // Let lhs - rhs = 0. We evaluate coeffs by evaluating with unit vectors
  const lhs = parts[0];
  const rhs = parts[1];
  const expr = `(${cleanLatex(lhs)}) - (${cleanLatex(rhs)})`;

  // Constant term c0 when all variables are 0
  const scope0: Record<string, number> = {};
  variables.forEach((v) => (scope0[v] = 0));
  const c0 = evalMathExpr(expr, scope0);
  if (!Number.isFinite(c0)) return null;

  const coeffs: number[] = [];
  for (const v of variables) {
    const scope1: Record<string, number> = { ...scope0, [v]: 1 };
    const c1 = evalMathExpr(expr, scope1);
    if (!Number.isFinite(c1)) return null;
    coeffs.push(c1 - c0);
  }

  // The equation is sum(coeffs[i]*v[i]) + c0 = 0 ==> sum(...) = -c0
  return { coeffs, constTerm: -c0 };
}

/**
 * Main Solver function: Takes any LaTeX formula or equation and produces solutions.
 */
export function solveEquationOrSystem(latex: string): EquationSolution {
  const trimmed = latex.trim();
  if (!trimmed) {
    return {
      title: "Phương trình trống",
      type: "error",
      solutions: [],
      latexSummary: "\\text{Vui lòng nhập phương trình}",
    };
  }

  // 1. Check for System of Equations:
  // e.g., \begin{cases} ... \end{cases} OR separated by "\\", ";", or newlines
  const uncases = trimmed
    .replace(/\\begin\{cases\}|\\end\{cases\}|\\cases/g, "")
    .trim();

  // Split lines by \\ or newline or semicolon
  const lines = uncases
    .split(/\\\\|\n|;/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length >= 2) {
    // Determine variable set
    const hasZ = lines.some((l) => l.includes("z") || l.includes("Z"));
    const vars = hasZ ? ["x", "y", "z"] : ["x", "y"];

    if (lines.length === 2 && !hasZ) {
      const row1 = parseLinearEqRow(lines[0], vars);
      const row2 = parseLinearEqRow(lines[1], vars);
      if (row1 && row2) {
        return solveLinear2x2(
          row1.coeffs[0],
          row1.coeffs[1],
          row1.constTerm,
          row2.coeffs[0],
          row2.coeffs[1],
          row2.constTerm
        );
      }
    } else if (lines.length === 3 && hasZ) {
      const row1 = parseLinearEqRow(lines[0], vars);
      const row2 = parseLinearEqRow(lines[1], vars);
      const row3 = parseLinearEqRow(lines[2], vars);
      if (row1 && row2 && row3) {
        return solveLinear3x3(
          [row1.coeffs, row2.coeffs, row3.coeffs],
          [row1.constTerm, row2.constTerm, row3.constTerm]
        );
      }
    }
  }

  // 2. Single Equation in 1 variable:
  let singleExpr = cleanLatex(trimmed);
  if (singleExpr.includes("=")) {
    const parts = singleExpr.split("=");
    singleExpr = `(${parts[0]}) - (${parts[1]})`;
  }

  // Pre-compile expression AST once for high-performance root-finding (100x faster)
  const compiled = compileMathExpr(singleExpr);
  const evalFn = (x: number): number => {
    try {
      return compiled ? compiled({ x }) : evalMathExpr(singleExpr, { x });
    } catch {
      return NaN;
    }
  };

  const roots = findRoots(evalFn, -30, 30, 360);

  if (roots.length === 0) {
    // Try wider range [-100, 100]
    const wideRoots = findRoots(evalFn, -100, 100, 400);
    if (wideRoots.length === 0) {
      return {
        title: "Phương trình 1 ẩn",
        type: "none",
        solutions: [],
        latexSummary: "\\text{Phương trình vô nghiệm (trong miền khảo sát)}",
      };
    }
    const sols = wideRoots.map((r, i) => ({
      variable: `x_${i + 1}`,
      value: formatCleanNumber(r),
      approximate: r,
    }));
    return {
      title: "Phương trình 1 ẩn",
      type: "single",
      solutions: sols,
      latexSummary: sols.map((s) => `${s.variable} = ${s.value}`).join("\\quad \\text{hoặc} \\quad "),
    };
  }

  const sols = roots.map((r, i) => ({
    variable: roots.length === 1 ? "x" : `x_${i + 1}`,
    value: formatCleanNumber(r),
    approximate: r,
  }));

  return {
    title: "Phương trình 1 ẩn",
    type: "single",
    solutions: sols,
    latexSummary: sols.map((s) => `${s.variable} = ${s.value}`).join("\\quad \\text{hoặc} \\quad "),
  };
}
