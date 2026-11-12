/**
 * Safe mathematical expression parser, symbolic-parameter evaluator, calculus analyzer,
 * combinatorics engine, descriptive statistics calculator, and interval set parser.
 * Zero usage of eval() or new Function().
 */

// ---------------------------------------------------------------------------
// 1. Safe Math Tokenizer, Recursive-Descent AST Parser & Evaluator
// ---------------------------------------------------------------------------

export type ExprNode =
  | { type: "number"; value: number }
  | { type: "var"; name: string }
  | { type: "unary"; op: "+" | "-"; arg: ExprNode }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: ExprNode; right: ExprNode }
  | { type: "call"; name: string; args: ExprNode[] }
  | { type: "compare"; op: "<" | "<=" | ">" | ">=" | "=" | "!="; left: ExprNode; right: ExprNode }
  | { type: "piecewise"; branches: Array<{ expr: ExprNode; cond: ExprNode | null }> };

type TokenKind =
  | "number"
  | "ident"
  | "op"
  | "lparen"
  | "rparen"
  | "comma"
  | "semi"
  | "bar"
  | "cmp";

interface Token {
  kind: TokenKind;
  value: string;
}

const KNOWN_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
  infty: Infinity,
  inf: Infinity,
};

const KNOWN_FUNCTIONS = new Set<string>([
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "asin",
  "acos",
  "atan",
  "acot",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "sqrt",
  "cbrt",
  "abs",
  "ln",
  "log",
  "log10",
  "log2",
  "exp",
  "floor",
  "ceil",
  "round",
  "sign",
  "sgn",
  "min",
  "max",
]);

/**
 * Normalizes LaTeX or plain Vietnamese math notation into clean standard algebraic syntax.
 */
export function normalizeLatexToExpr(raw: string): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";

  // Strip common outer wrappers & MathLive tokens
  s = s
    .replace(/\\mleft/g, "\\left")
    .replace(/\\mright/g, "\\right")
    .replace(/\\differentialD\s*/g, "d")
    .replace(/\\exponentialE/g, "e")
    .replace(/\\imaginaryI/g, "i")
    .replace(/\\left\s*\|/g, "abs(")
    .replace(/\\right\s*\|/g, ")")
    .replace(/\\left\s*([(\[{])/g, "$1")
    .replace(/\\right\s*([)\]}])/g, "$1")
    .replace(/\\left\s*\./g, "")
    .replace(/\\right\s*\./g, "")
    .replace(/\{,\}/g, ".")
    .replace(/[−–—]/g, "-")
    .replace(/×|\\times|\\cdot/g, "*")
    .replace(/÷|\\div/g, "/")
    .replace(/\\le(?:q)?(?![a-zA-Z])/g, "<=")
    .replace(/\\ge(?:q)?(?![a-zA-Z])/g, ">=")
    .replace(/\\ne(?:q)?(?![a-zA-Z])/g, "!=")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=")
    .replace(/π|\\pi(?![a-zA-Z])/g, "pi")
    .replace(/∞|\\infty(?![a-zA-Z])/g, "infty")
    .replace(/\\mathrm\{([a-zA-Z]+)\}/g, "$1")
    .replace(/\\operatorname\{([a-zA-Z]+)\}/g, "$1")
    .replace(/\\text\{[^}]*\}/g, "")
    .replace(/\\[,;:! ]/g, " ");

  // Vietnamese decimal comma between digits (e.g. 1,5 -> 1.5), avoid breaking comma-separated arg lists
  s = s.replace(/(\d),(\d)/g, "$1.$2");

  // Strip leading "y =" or "f(x) =" if user typed an explicit function definition
  s = s.replace(/^(?:y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\))\s*=\s*/i, "");

  // Convert \sqrt[n]{expr} -> (expr)^(1/(n)) and \sqrt{expr} -> sqrt(expr)
  s = replaceLatexCommandWithOptionalArg(s, "sqrt", (opt, body) =>
    opt ? `((${body})^(1/(${opt})))` : `sqrt(${body})`
  );

  // Convert \frac{num}{den} and \dfrac{num}{den} iteratively (handles nested fractions)
  s = replaceTwoArgCommand(s, "dfrac", (a, b) => `((${a})/(${b}))`);
  s = replaceTwoArgCommand(s, "tfrac", (a, b) => `((${a})/(${b}))`);
  s = replaceTwoArgCommand(s, "frac", (a, b) => `((${a})/(${b}))`);

  // Convert \log_{base}{arg} -> (ln(arg)/ln(base))
  s = replaceSubscriptedCommand(s, "log", (sub, arg) =>
    sub ? `(ln(${arg})/ln(${sub}))` : `log10(${arg})`
  );

  // Replace trig power notation like \sin^2(x) or sin^2 x -> (sin(x))^2
  s = s.replace(
    /\\?(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|ln|log)\s*\^\s*(\{[^}]+\}|[0-9]+)\s*(\([^)]*\)|[a-zA-Z0-9_]+)/g,
    (_m, fn: string, exp: string, arg: string) => {
      const cleanExp = exp.startsWith("{") ? exp.slice(1, -1) : exp;
      const cleanArg = arg.startsWith("(") ? arg : `(${arg})`;
      return `((${fn}${cleanArg})^(${cleanExp}))`;
    }
  );

  // Strip remaining backslash prefixes on known math functions
  s = s.replace(/\\([a-zA-Z]+)/g, "$1");

  // Convert braced exponents/subscripts x^{n+1} -> x^(n+1), u_{n} -> u_n
  s = s.replace(/\^\{([^}]*)\}/g, "^($1)");
  s = s.replace(/_\{([^}]*)\}/g, "$1");

  // Clean leftover braces as parens
  s = s.replace(/\{/g, "(").replace(/\}/g, ")");

  // Support trig/log shorthand like "sin x" or "ln x" -> "sin(x)"
  s = s.replace(
    /\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|arcsin|arccos|arctan|sinh|cosh|tanh|sqrt|cbrt|abs|ln|log|log10|log2|exp|floor|ceil|round)\s+([a-zA-Z0-9_.]+)/g,
    "$1($2)"
  );

  return s.trim();
}

function readBraceGroup(str: string, start: number): { content: string; end: number } | null {
  let i = start;
  while (i < str.length && /\s/.test(str[i])) i++;
  if (str[i] !== "{") {
    if (i < str.length && /[a-zA-Z0-9.]/.test(str[i])) {
      return { content: str[i], end: i + 1 };
    }
    return null;
  }
  let depth = 0;
  const open = i;
  for (; i < str.length; i++) {
    if (str[i] === "{") depth++;
    else if (str[i] === "}") {
      depth--;
      if (depth === 0) {
        return { content: str.slice(open + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

function replaceTwoArgCommand(
  input: string,
  cmd: string,
  replacer: (a: string, b: string) => string
): string {
  let out = input;
  const needle = `\\${cmd}`;
  let guard = 0;
  while (guard++ < 64) {
    const idx = out.indexOf(needle);
    if (idx === -1) break;
    const g1 = readBraceGroup(out, idx + needle.length);
    if (!g1) break;
    const g2 = readBraceGroup(out, g1.end);
    if (!g2) break;
    const innerA = replaceTwoArgCommand(g1.content, cmd, replacer);
    const innerB = replaceTwoArgCommand(g2.content, cmd, replacer);
    out = out.slice(0, idx) + replacer(innerA, innerB) + out.slice(g2.end);
  }
  return out;
}

function replaceLatexCommandWithOptionalArg(
  input: string,
  cmd: string,
  replacer: (opt: string | null, body: string) => string
): string {
  let out = input;
  const needle = `\\${cmd}`;
  let guard = 0;
  while (guard++ < 64) {
    const idx = out.indexOf(needle);
    if (idx === -1) break;
    let cursor = idx + needle.length;
    while (cursor < out.length && /\s/.test(out[cursor])) cursor++;
    let opt: string | null = null;
    if (out[cursor] === "[") {
      const closeBracket = out.indexOf("]", cursor + 1);
      if (closeBracket !== -1) {
        opt = out.slice(cursor + 1, closeBracket);
        cursor = closeBracket + 1;
      }
    }
    const g = readBraceGroup(out, cursor);
    if (!g) break;
    const inner = replaceLatexCommandWithOptionalArg(g.content, cmd, replacer);
    out = out.slice(0, idx) + replacer(opt, inner) + out.slice(g.end);
  }
  return out;
}

function replaceSubscriptedCommand(
  input: string,
  cmd: string,
  replacer: (sub: string | null, arg: string) => string
): string {
  let out = input;
  const needle = `\\${cmd}`;
  let guard = 0;
  while (guard++ < 64) {
    const idx = out.indexOf(needle);
    if (idx === -1) break;
    let cursor = idx + needle.length;
    while (cursor < out.length && /\s/.test(out[cursor])) cursor++;
    if (out[cursor] !== "_") {
      out = out.slice(0, idx) + cmd + out.slice(idx + needle.length);
      continue;
    }
    cursor++;
    const subGroup = readBraceGroup(out, cursor);
    if (!subGroup) break;
    let argCursor = subGroup.end;
    while (argCursor < out.length && /\s/.test(out[argCursor])) argCursor++;
    let argContent = "";
    let endIdx = argCursor;
    if (out[argCursor] === "{") {
      const g = readBraceGroup(out, argCursor);
      if (g) {
        argContent = g.content;
        endIdx = g.end;
      }
    } else if (out[argCursor] === "(") {
      let depth = 0;
      let j = argCursor;
      for (; j < out.length; j++) {
        if (out[j] === "(") depth++;
        else if (out[j] === ")") {
          depth--;
          if (depth === 0) {
            argContent = out.slice(argCursor + 1, j);
            endIdx = j + 1;
            break;
          }
        }
      }
    } else {
      const m = /^[a-zA-Z0-9_.]+/.exec(out.slice(argCursor));
      if (m) {
        argContent = m[0];
        endIdx = argCursor + m[0].length;
      }
    }
    if (!argContent) break;
    out = out.slice(0, idx) + replacer(subGroup.content, argContent) + out.slice(endIdx);
  }
  return out;
}

function tokenizeMath(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && i + 1 < expr.length && /[0-9]/.test(expr[i + 1]))) {
      let j = i;
      let seenDot = false;
      while (j < expr.length) {
        if (/[0-9]/.test(expr[j])) j++;
        else if (expr[j] === "." && !seenDot) {
          seenDot = true;
          j++;
        } else break;
      }
      // Scientific notation e.g. 1.5e-4
      if ((expr[j] === "e" || expr[j] === "E") && /[+\-0-9]/.test(expr[j + 1] ?? "")) {
        let k = j + 1;
        if (expr[k] === "+" || expr[k] === "-") k++;
        if (/[0-9]/.test(expr[k] ?? "")) {
          while (k < expr.length && /[0-9]/.test(expr[k])) k++;
          j = k;
        }
      }
      tokens.push({ kind: "number", value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) j++;
      const ident = expr.slice(i, j);
      // Split implicit multiplication for unknown multi-char tokens like "mx" or "ax"
      if (
        !KNOWN_FUNCTIONS.has(ident.toLowerCase()) &&
        !(ident.toLowerCase() in KNOWN_CONSTANTS) &&
        ident.length > 1 &&
        !/^[a-zA-Z]_[a-zA-Z0-9]+$/.test(ident) &&
        !/^u_?[0-9n]$/.test(ident)
      ) {
        for (const letter of ident) {
          if (letter !== "_") {
            tokens.push({ kind: "ident", value: letter });
          }
        }
      } else {
        tokens.push({ kind: "ident", value: ident });
      }
      i = j;
      continue;
    }
    if (ch === "<" || ch === ">" || ch === "!" || ch === "=") {
      if (expr[i + 1] === "=") {
        tokens.push({ kind: "cmp", value: expr.slice(i, i + 2) });
        i += 2;
      } else if (ch !== "!") {
        tokens.push({ kind: "cmp", value: ch });
        i++;
      } else {
        throw new Error(`Ký tự không hợp lệ: '${ch}'`);
      }
      continue;
    }
    if ("+-*/^".includes(ch)) {
      tokens.push({ kind: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "(" || ch === "[") {
      tokens.push({ kind: "lparen", value: "(" });
      i++;
      continue;
    }
    if (ch === ")" || ch === "]") {
      tokens.push({ kind: "rparen", value: ")" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ kind: "comma", value: "," });
      i++;
      continue;
    }
    if (ch === ";") {
      tokens.push({ kind: "semi", value: ";" });
      i++;
      continue;
    }
    if (ch === "|") {
      tokens.push({ kind: "bar", value: "|" });
      i++;
      continue;
    }
    throw new Error(`Ký tự không nhận diện được trong biểu thức: '${ch}'`);
  }

  // Insert implicit multiplication tokens where appropriate:
  // number|ident|rparen followed by ident|lparen|number (for ident->lparen only if not function call)
  const withImplicit: Token[] = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const curr = tokens[idx];
    const prev = withImplicit[withImplicit.length - 1];
    if (prev) {
      const prevEndsAtom =
        prev.kind === "number" ||
        prev.kind === "rparen" ||
        prev.kind === "ident";
      const currStartsAtom =
        curr.kind === "number" ||
        curr.kind === "lparen" ||
        curr.kind === "ident";
      const prevIsFunctionBeforeParen =
        prev.kind === "ident" &&
        curr.kind === "lparen" &&
        KNOWN_FUNCTIONS.has(prev.value.toLowerCase());
      if (prevEndsAtom && currStartsAtom && !prevIsFunctionBeforeParen) {
        withImplicit.push({ kind: "op", value: "*" });
      }
    }
    withImplicit.push(curr);
  }
  return withImplicit;
}

class Parser {
  private pos = 0;
  private readonly tokens: Token[];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const tok = this.tokens[this.pos];
    this.pos += 1;
    return tok;
  }

  parseExpression(): ExprNode {
    const node = this.parseComparison();
    if (this.pos < this.tokens.length) {
      throw new Error(`Cú pháp không hợp lệ gần '${this.tokens[this.pos].value}'`);
    }
    return node;
  }

  private parseComparison(): ExprNode {
    let left = this.parseAddSub();
    const tok = this.peek();
    if (tok && tok.kind === "cmp") {
      this.consume();
      const right = this.parseAddSub();
      left = {
        type: "compare",
        op: tok.value as "<" | "<=" | ">" | ">=" | "=" | "!=",
        left,
        right,
      };
    }
    return left;
  }

  private parseAddSub(): ExprNode {
    let left = this.parseMulDiv();
    while (true) {
      const tok = this.peek();
      if (tok && tok.kind === "op" && (tok.value === "+" || tok.value === "-")) {
        this.consume();
        const right = this.parseMulDiv();
        left = { type: "binary", op: tok.value, left, right };
      } else break;
    }
    return left;
  }

  private parseMulDiv(): ExprNode {
    let left = this.parseUnary();
    while (true) {
      const tok = this.peek();
      if (tok && tok.kind === "op" && (tok.value === "*" || tok.value === "/")) {
        this.consume();
        const right = this.parseUnary();
        left = { type: "binary", op: tok.value, left, right };
      } else break;
    }
    return left;
  }

  private parseUnary(): ExprNode {
    const tok = this.peek();
    if (tok && tok.kind === "op" && (tok.value === "+" || tok.value === "-")) {
      this.consume();
      return { type: "unary", op: tok.value, arg: this.parseUnary() };
    }
    return this.parsePower();
  }

  private parsePower(): ExprNode {
    const base = this.parsePrimary();
    const tok = this.peek();
    if (tok && tok.kind === "op" && tok.value === "^") {
      this.consume();
      const exp = this.parseUnary();
      return { type: "binary", op: "^", left: base, right: exp };
    }
    return base;
  }

  private parsePrimary(): ExprNode {
    const tok = this.peek();
    if (!tok) {
      throw new Error("Biểu thức chưa hoàn chỉnh");
    }
    if (tok.kind === "number") {
      this.consume();
      const value = Number(tok.value);
      if (!Number.isFinite(value)) {
        throw new Error(`Số không hợp lệ: ${tok.value}`);
      }
      return { type: "number", value };
    }
    if (tok.kind === "ident") {
      this.consume();
      const next = this.peek();
      const lower = tok.value.toLowerCase();
      if (next && next.kind === "lparen" && KNOWN_FUNCTIONS.has(lower)) {
        this.consume(); // '('
        const args: ExprNode[] = [];
        if (this.peek()?.kind !== "rparen") {
          args.push(this.parseComparison());
          while (this.peek()?.kind === "comma" || this.peek()?.kind === "semi") {
            this.consume();
            args.push(this.parseComparison());
          }
        }
        const close = this.peek();
        if (!close || close.kind !== "rparen") {
          throw new Error(`Thiếu ngoặc đóng ')' cho hàm ${tok.value}`);
        }
        this.consume();
        return { type: "call", name: lower, args };
      }
      if (lower in KNOWN_CONSTANTS) {
        return { type: "number", value: KNOWN_CONSTANTS[lower] };
      }
      return { type: "var", name: tok.value };
    }
    if (tok.kind === "lparen") {
      this.consume();
      const inner = this.parseComparison();
      const close = this.peek();
      if (!close || close.kind !== "rparen") {
        throw new Error("Thiếu ngoặc đóng ')'");
      }
      this.consume();
      return inner;
    }
    if (tok.kind === "bar") {
      this.consume();
      const inner = this.parseComparison();
      const close = this.peek();
      if (!close || close.kind !== "bar") {
        throw new Error("Thiếu dấu '|' đóng trị tuyệt đối");
      }
      this.consume();
      return { type: "call", name: "abs", args: [inner] };
    }
    throw new Error(`Không mong đợi '${tok.value}' trong biểu thức`);
  }
}

/**
 * Parses a LaTeX or plain expression (including piecewise `\begin{cases}...\end{cases}`) into an AST.
 */
export function parseMathExpression(rawLatex: string): ExprNode {
  const trimmed = String(rawLatex ?? "").trim();
  const casesMatch = /\\begin\{cases\}([\s\S]*?)\\end\{cases\}/.exec(trimmed);
  if (casesMatch) {
    const lines = casesMatch[1]
      .split(/\\\\/)
      .map((l) => l.trim())
      .filter(Boolean);
    const branches: Array<{ expr: ExprNode; cond: ExprNode | null }> = [];
    for (const line of lines) {
      const parts = line.split("&");
      const exprText = normalizeLatexToExpr(parts[0] ?? "");
      if (!exprText) continue;
      const exprAst = new Parser(tokenizeMath(exprText)).parseExpression();
      const rawCond = (parts[1] ?? "").replace(/\\text\{[^}]*\}/g, "").trim();
      let condAst: ExprNode | null = null;
      if (rawCond && !/còn lại|otherwise|else/i.test(rawCond)) {
        const condNorm = normalizeLatexToExpr(rawCond);
        if (condNorm) {
          condAst = new Parser(tokenizeMath(condNorm)).parseExpression();
        }
      }
      branches.push({ expr: exprAst, cond: condAst });
    }
    if (branches.length === 0) {
      throw new Error("Hàm chia nhánh rỗng");
    }
    return { type: "piecewise", branches };
  }

  const normalized = normalizeLatexToExpr(trimmed);
  if (!normalized) {
    throw new Error("Biểu thức rỗng");
  }
  const tokens = tokenizeMath(normalized);
  return new Parser(tokens).parseExpression();
}

/**
 * Evaluates a parsed ExprNode against a variable/parameter scope.
 */
export function evalAst(node: ExprNode, scope: Record<string, number>): number {
  switch (node.type) {
    case "number":
      return node.value;
    case "var": {
      if (node.name in scope) return scope[node.name];
      const lower = node.name.toLowerCase();
      if (lower in scope) return scope[lower];
      if (lower in KNOWN_CONSTANTS) return KNOWN_CONSTANTS[lower];
      return NaN;
    }
    case "unary": {
      const v = evalAst(node.arg, scope);
      return node.op === "-" ? -v : v;
    }
    case "binary": {
      const l = evalAst(node.left, scope);
      const r = evalAst(node.right, scope);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return r === 0 ? NaN : l / r;
        case "^": {
          // Support real odd roots of negative numbers e.g. x^(1/3)
          if (l < 0 && !Number.isInteger(r)) {
            const denom = Math.round(1 / r);
            if (Math.abs(r - 1 / denom) < 1e-9 && Math.abs(denom % 2) === 1) {
              return -Math.pow(-l, r);
            }
          }
          return Math.pow(l, r);
        }
      }
    }
    case "call": {
      const args = node.args.map((a) => evalAst(a, scope));
      const a0 = args[0] ?? NaN;
      switch (node.name) {
        case "sin":
          return Math.sin(a0);
        case "cos":
          return Math.cos(a0);
        case "tan": {
          const c = Math.cos(a0);
          return Math.abs(c) < 1e-12 ? NaN : Math.sin(a0) / c;
        }
        case "cot": {
          const s = Math.sin(a0);
          return Math.abs(s) < 1e-12 ? NaN : Math.cos(a0) / s;
        }
        case "sec": {
          const c = Math.cos(a0);
          return Math.abs(c) < 1e-12 ? NaN : 1 / c;
        }
        case "csc": {
          const s = Math.sin(a0);
          return Math.abs(s) < 1e-12 ? NaN : 1 / s;
        }
        case "asin":
        case "arcsin":
          return Math.asin(a0);
        case "acos":
        case "arccos":
          return Math.acos(a0);
        case "atan":
        case "arctan":
          return Math.atan(a0);
        case "acot":
          return Math.PI / 2 - Math.atan(a0);
        case "sinh":
          return Math.sinh(a0);
        case "cosh":
          return Math.cosh(a0);
        case "tanh":
          return Math.tanh(a0);
        case "sqrt":
          return a0 < 0 ? NaN : Math.sqrt(a0);
        case "cbrt":
          return Math.cbrt(a0);
        case "abs":
          return Math.abs(a0);
        case "ln":
          return a0 <= 0 ? NaN : Math.log(a0);
        case "log":
          if (args.length >= 2) {
            return a0 <= 0 || args[1] <= 0 || args[1] === 1
              ? NaN
              : Math.log(args[1]) / Math.log(a0);
          }
          return a0 <= 0 ? NaN : Math.log10(a0);
        case "log10":
          return a0 <= 0 ? NaN : Math.log10(a0);
        case "log2":
          return a0 <= 0 ? NaN : Math.log2(a0);
        case "exp":
          return Math.exp(a0);
        case "floor":
          return Math.floor(a0);
        case "ceil":
          return Math.ceil(a0);
        case "round":
          return Math.round(a0);
        case "sign":
        case "sgn":
          return Math.sign(a0);
        case "min":
          return Math.min(...args);
        case "max":
          return Math.max(...args);
        default:
          return NaN;
      }
    }
    case "compare": {
      const l = evalAst(node.left, scope);
      const r = evalAst(node.right, scope);
      if (!Number.isFinite(l) || !Number.isFinite(r)) return 0;
      switch (node.op) {
        case "<":
          return l < r ? 1 : 0;
        case "<=":
          return l <= r ? 1 : 0;
        case ">":
          return l > r ? 1 : 0;
        case ">=":
          return l >= r ? 1 : 0;
        case "=":
          return Math.abs(l - r) < 1e-9 ? 1 : 0;
        case "!=":
          return Math.abs(l - r) >= 1e-9 ? 1 : 0;
      }
    }
    case "piecewise": {
      for (const branch of node.branches) {
        if (!branch.cond || evalAst(branch.cond, scope) > 0.5) {
          return evalAst(branch.expr, scope);
        }
      }
      return NaN;
    }
  }
}

/**
 * Compiles a LaTeX expression into a fast, safe evaluator function `(scope) => number`.
 */
export function compileMathExpr(
  rawLatex: string
): ((scope: Record<string, number>) => number) | null {
  try {
    const ast = parseMathExpression(rawLatex);
    return (scope: Record<string, number>) => evalAst(ast, scope);
  } catch {
    return null;
  }
}

/**
 * Safely evaluates an expression at a variable scope, returning NaN on parse/domain error.
 */
export function evalMathExpr(rawLatex: string, scope: Record<string, number> = {}): number {
  const fn = compileMathExpr(rawLatex);
  return fn ? fn(scope) : NaN;
}

const RESERVED_PARAM_NAMES = new Set<string>([
  "x",
  "y",
  "t",
  "n",
  "e",
  "i",
  "pi",
  "tau",
  "phi",
  "inf",
  "infty",
]);

function collectVars(node: ExprNode, out: Set<string>): void {
  switch (node.type) {
    case "number":
      return;
    case "var":
      out.add(node.name);
      return;
    case "unary":
      collectVars(node.arg, out);
      return;
    case "binary":
      collectVars(node.left, out);
      collectVars(node.right, out);
      return;
    case "call":
      node.args.forEach((a) => collectVars(a, out));
      return;
    case "compare":
      collectVars(node.left, out);
      collectVars(node.right, out);
      return;
    case "piecewise":
      for (const b of node.branches) {
        collectVars(b.expr, out);
        if (b.cond) collectVars(b.cond, out);
      }
  }
}

/**
 * Extracts free single-letter symbolic parameters (e.g. m, a, k) from a LaTeX expression.
 */
export function extractFreeParameters(rawLatex: string): string[] {
  try {
    const ast = parseMathExpression(rawLatex);
    const vars = new Set<string>();
    collectVars(ast, vars);
    return Array.from(vars).filter(
      (v) => /^[a-zA-Z]$/.test(v) && !RESERVED_PARAM_NAMES.has(v.toLowerCase())
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 2. Calculus Analysis: Derivatives, Roots, Extrema, Asymptotes, Tangents, Integrals
// ---------------------------------------------------------------------------

export function numericalDerivative(fn: (x: number) => number, x: number): number {
  const h = 1e-5 * (1 + Math.abs(x));
  const f1 = fn(x + h);
  const f2 = fn(x - h);
  if (!Number.isFinite(f1) || !Number.isFinite(f2)) return NaN;
  return (f1 - f2) / (2 * h);
}

export function numericalSecondDerivative(fn: (x: number) => number, x: number): number {
  const h = 1e-4 * (1 + Math.abs(x));
  const fp = fn(x + h);
  const f0 = fn(x);
  const fm = fn(x - h);
  if (!Number.isFinite(fp) || !Number.isFinite(f0) || !Number.isFinite(fm)) return NaN;
  return (fp - 2 * f0 + fm) / (h * h);
}

function bisectRoot(fn: (x: number) => number, a: number, b: number, iters = 36): number {
  let lo = a;
  let hi = b;
  let flo = fn(lo);
  if (!Number.isFinite(flo)) return NaN;
  if (Math.abs(flo) < 1e-11) return lo;
  for (let i = 0; i < iters; i++) {
    const mid = 0.5 * (lo + hi);
    const fmid = fn(mid);
    if (!Number.isFinite(fmid)) return NaN;
    if (Math.abs(fmid) < 1e-11) return mid;
    if ((flo > 0 && fmid > 0) || (flo < 0 && fmid < 0)) {
      lo = mid;
      flo = fmid;
    } else {
      hi = mid;
    }
  }
  const root = 0.5 * (lo + hi);
  const val = fn(root);
  return Number.isFinite(val) && Math.abs(val) < 1e-3 ? root : NaN;
}

function dedupeSorted(vals: number[], eps = 1e-4): number[] {
  const sorted = [...vals].filter(Number.isFinite).sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) {
    const clean = Math.abs(v) < 1e-9 ? 0 : v;
    if (out.length === 0 || Math.abs(clean - out[out.length - 1]) > eps) {
      out.push(clean);
    }
  }
  return out;
}

export function findRoots(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  steps = 240
): number[] {
  const roots: number[] = [];
  const dx = (xMax - xMin) / steps;
  let prevX = xMin;
  let prevY = fn(prevX);

  for (let i = 1; i <= steps; i++) {
    const x = xMin + i * dx;
    const y = fn(x);
    if (Number.isFinite(prevY) && Math.abs(prevY) < 1e-7) {
      roots.push(prevX);
    }
    if (
      Number.isFinite(prevY) &&
      Number.isFinite(y) &&
      prevY * y < 0 &&
      Math.abs(y - prevY) < 50 * Math.max(1, dx)
    ) {
      const r = bisectRoot(fn, prevX, x);
      if (Number.isFinite(r)) roots.push(r);
    }
    prevX = x;
    prevY = y;
  }

  // Catch tangent (double) roots where |f(x)| dips close to 0 without sign change
  for (let i = 1; i < steps; i++) {
    const x0 = xMin + (i - 1) * dx;
    const x1 = xMin + i * dx;
    const x2 = xMin + (i + 1) * dx;
    const y0 = Math.abs(fn(x0));
    const y1 = Math.abs(fn(x1));
    const y2 = Math.abs(fn(x2));
    if (Number.isFinite(y0) && Number.isFinite(y1) && Number.isFinite(y2)) {
      if (y1 < y0 && y1 < y2 && y1 < 0.05) {
        const refined = bisectRoot((t) => numericalDerivative(fn, t), x0, x2);
        if (Number.isFinite(refined) && Math.abs(fn(refined)) < 1e-4) {
          roots.push(refined);
        }
      }
    }
  }

  return dedupeSorted(roots, 1e-3);
}

export interface ExtremumPoint {
  x: number;
  y: number;
  kind: "max" | "min";
}

export function findExtrema(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  steps = 260
): ExtremumPoint[] {
  const df = (x: number) => numericalDerivative(fn, x);
  const candidates = findRoots(df, xMin, xMax, steps);
  const extrema: ExtremumPoint[] = [];
  for (const x of candidates) {
    const y = fn(x);
    if (!Number.isFinite(y)) continue;
    const eps = 1e-3;
    const dl = df(x - eps);
    const dr = df(x + eps);
    if (!Number.isFinite(dl) || !Number.isFinite(dr)) continue;
    if (dl > 1e-5 && dr < -1e-5) {
      extrema.push({ x, y, kind: "max" });
    } else if (dl < -1e-5 && dr > 1e-5) {
      extrema.push({ x, y, kind: "min" });
    }
  }
  return extrema;
}

export function findVerticalAsymptotes(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  steps = 320
): number[] {
  const poles: number[] = [];
  const dx = (xMax - xMin) / steps;
  for (let i = 0; i < steps; i++) {
    const a = xMin + i * dx;
    const b = a + dx;
    const fa = fn(a);
    const fb = fn(b);
    const mid = 0.5 * (a + b);
    const fmid = fn(mid);

    const inv = (t: number) => {
      const v = fn(t);
      return Number.isFinite(v) && Math.abs(v) > 1e-9 ? 1 / v : 0;
    };

    const signFlipPole =
      Number.isFinite(fa) &&
      Number.isFinite(fb) &&
      fa * fb < 0 &&
      (!Number.isFinite(fmid) || Math.abs(fmid) > Math.max(Math.abs(fa), Math.abs(fb)));

    const hitNaN =
      (Number.isFinite(fa) && !Number.isFinite(fb) && Math.abs(fa) > 2) ||
      (!Number.isFinite(fa) && Number.isFinite(fb) && Math.abs(fb) > 2);

    // Also catch even-order poles like 1/(x-1)^2 where f doesn't change sign
    const sameSignSpike =
      Number.isFinite(fa) &&
      Number.isFinite(fb) &&
      fa * fb > 0 &&
      (!Number.isFinite(fmid) ||
        Math.abs(fmid) > 3 * Math.max(Math.abs(fa), Math.abs(fb), 2));

    if (signFlipPole || hitNaN) {
      let lo = a;
      let hi = b;
      for (let k = 0; k < 32; k++) {
        const m = 0.5 * (lo + hi);
        const im = inv(m);
        const il = inv(lo);
        if (il * im <= 0) hi = m;
        else lo = m;
      }
      const p = 0.5 * (lo + hi);
      const valNear = fn(p + 1e-5);
      if (!Number.isFinite(valNear) || Math.abs(valNear) > 25) {
        poles.push(p);
      }
    } else if (sameSignSpike) {
      // Golden-section / ternary search for pole maximizing |f|
      let lo = a;
      let hi = b;
      for (let k = 0; k < 30; k++) {
        const m1 = lo + (hi - lo) / 3;
        const m2 = hi - (hi - lo) / 3;
        const v1 = Math.abs(inv(m1));
        const v2 = Math.abs(inv(m2));
        if (v1 < v2) hi = m2;
        else lo = m1;
      }
      const p = 0.5 * (lo + hi);
      const valNear = fn(p + 1e-5);
      if (!Number.isFinite(valNear) || Math.abs(valNear) > 25) {
        poles.push(p);
      }
    }
  }
  return dedupeSorted(poles, 1e-2);
}

export interface PlotAnalysis {
  roots: Array<{ x: number; y: number }>;
  extrema: ExtremumPoint[];
  yIntercept: { x: number; y: number } | null;
  verticalAsymptotes: number[];
  horizontalAsymptote: number | null;
}

export function analyzeFunctionForPlot(
  exprLatex: string,
  params: Record<string, number> = {},
  domain: [number, number] = [-8, 8]
): PlotAnalysis {
  const compiled = compileMathExpr(exprLatex);
  if (!compiled) {
    return {
      roots: [],
      extrema: [],
      yIntercept: null,
      verticalAsymptotes: [],
      horizontalAsymptote: null,
    };
  }
  const fn = (x: number) => compiled({ ...params, x });
  const [xMin, xMax] = domain;
  const verticalAsymptotes = findVerticalAsymptotes(fn, xMin, xMax);
  const rootsRaw = findRoots(fn, xMin, xMax).filter(
    (r) => !verticalAsymptotes.some((p) => Math.abs(p - r) < 0.05)
  );
  const extrema = findExtrema(fn, xMin, xMax).filter(
    (e) => !verticalAsymptotes.some((p) => Math.abs(p - e.x) < 0.05)
  );
  const y0 = fn(0);
  const yIntercept = Number.isFinite(y0) ? { x: 0, y: y0 } : null;

  let horizontalAsymptote: number | null = null;
  const fPos = fn(1e4);
  const fPos2 = fn(2e4);
  const fNeg = fn(-1e4);
  if (Number.isFinite(fPos) && Number.isFinite(fPos2) && Math.abs(fPos - fPos2) < 1e-3 && Math.abs(fPos) < 1e4) {
    horizontalAsymptote = Math.abs(fPos) < 1e-6 ? 0 : Number(fPos.toFixed(4));
  } else if (Number.isFinite(fNeg) && Number.isFinite(fn(-2e4)) && Math.abs(fNeg - fn(-2e4)) < 1e-3 && Math.abs(fNeg) < 1e4) {
    horizontalAsymptote = Math.abs(fNeg) < 1e-6 ? 0 : Number(fNeg.toFixed(4));
  }

  return {
    roots: rootsRaw.map((x) => ({ x, y: 0 })),
    extrema,
    yIntercept,
    verticalAsymptotes,
    horizontalAsymptote,
  };
}

/**
 * Samples continuous segments for plotting `y = f(x)` in Cartesian world coordinates.
 * Automatically breaks across asymptotes and out-of-range vertical jumps.
 */
export function samplePlotCurve(
  exprLatex: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  params: Record<string, number> = {},
  samples = 360
): Array<Array<{ x: number; y: number }>> {
  const compiled = compileMathExpr(exprLatex);
  if (!compiled || xMax <= xMin) return [];
  const fn = (x: number) => compiled({ ...params, x });

  const segments: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];
  const yPad = (yMax - yMin) * 0.5 + 2;
  const clipLo = yMin - yPad;
  const clipHi = yMax + yPad;
  const maxJump = (yMax - yMin) * 1.1;

  let prevX = NaN;
  let prevY = NaN;

  for (let i = 0; i <= samples; i++) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    const y = fn(x);
    const valid = Number.isFinite(y) && y >= clipLo && y <= clipHi;
    if (!valid) {
      if (current.length >= 2) segments.push(current);
      current = [];
      prevX = NaN;
      prevY = NaN;
      continue;
    }

    if (
      current.length > 0 &&
      Number.isFinite(prevY) &&
      Math.abs(y - prevY) > maxJump
    ) {
      // Check midpoint to tell steep smooth curve vs pole jump
      const midY = fn(0.5 * (prevX + x));
      if (!Number.isFinite(midY) || Math.abs(midY - prevY) > maxJump) {
        if (current.length >= 2) segments.push(current);
        current = [{ x, y }];
        prevX = x;
        prevY = y;
        continue;
      }
    }

    current.push({ x, y });
    prevX = x;
    prevY = y;
  }

  if (current.length >= 2) segments.push(current);
  return segments;
}

export function computeTangentLine(
  exprLatex: string,
  x0: number,
  params: Record<string, number> = {}
): { x0: number; y0: number; slope: number; equationLatex: string } | null {
  const compiled = compileMathExpr(exprLatex);
  if (!compiled) return null;
  const fn = (x: number) => compiled({ ...params, x });
  const y0 = fn(x0);
  const slope = numericalDerivative(fn, x0);
  if (!Number.isFinite(y0) || !Number.isFinite(slope)) return null;
  const b = y0 - slope * x0;
  const mStr = formatCleanNumber(slope);
  const bAbs = formatCleanNumber(Math.abs(b));
  let eq = `y = ${mStr}x`;
  if (Math.abs(slope) < 1e-6) {
    eq = `y = ${formatCleanNumber(y0)}`;
  } else if (Math.abs(b) >= 1e-6) {
    eq = `y = ${mStr}x ${b >= 0 ? "+" : "-"} ${bAbs}`;
  }
  return { x0, y0, slope, equationLatex: eq };
}

/**
 * Adaptive Simpson / composite Simpson integration + Riemann trapezoid data.
 */
export function computeDefiniteIntegral(
  fLatex: string,
  gLatex: string | undefined,
  a: number,
  b: number,
  params: Record<string, number> = {},
  trapezoids?: number
): {
  area: number;
  signedIntegral: number;
  trapezoidShapes: Array<Array<{ x: number; y: number }>>;
} {
  const fFn = compileMathExpr(fLatex);
  const gFn = gLatex ? compileMathExpr(gLatex) : null;
  if (!fFn || a === b) {
    return { area: 0, signedIntegral: 0, trapezoidShapes: [] };
  }
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const n = 200; // even for composite Simpson
  const h = (hi - lo) / n;

  const evalF = (x: number) => {
    const v = fFn({ ...params, x });
    return Number.isFinite(v) ? v : 0;
  };
  const evalG = (x: number) => {
    if (!gFn) return 0;
    const v = gFn({ ...params, x });
    return Number.isFinite(v) ? v : 0;
  };

  let signedSum = 0;
  let absSum = 0;
  for (let i = 0; i <= n; i++) {
    const x = lo + i * h;
    const w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
    const diff = evalF(x) - evalG(x);
    signedSum += w * diff;
    absSum += w * Math.abs(diff);
  }
  const signedIntegral = (signedSum * h) / 3;
  const area = (absSum * h) / 3;

  const trapezoidShapes: Array<Array<{ x: number; y: number }>> = [];
  if (trapezoids && trapezoids >= 1) {
    const tN = Math.min(200, Math.max(1, Math.round(trapezoids)));
    const dt = (hi - lo) / tN;
    for (let i = 0; i < tN; i++) {
      const x0 = lo + i * dt;
      const x1 = lo + (i + 1) * dt;
      trapezoidShapes.push([
        { x: x0, y: evalG(x0) },
        { x: x0, y: evalF(x0) },
        { x: x1, y: evalF(x1) },
        { x: x1, y: evalG(x1) },
      ]);
    }
  }

  return { area, signedIntegral, trapezoidShapes };
}

export function computeRevolutionVolume(
  fLatex: string,
  a: number,
  b: number,
  params: Record<string, number> = {}
): number {
  const fFn = compileMathExpr(fLatex);
  if (!fFn || a === b) return 0;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const n = 200;
  const h = (hi - lo) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const x = lo + i * h;
    const y = fFn({ ...params, x });
    const sq = Number.isFinite(y) ? y * y : 0;
    const w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
    sum += w * sq;
  }
  return (Math.PI * sum * h) / 3;
}

// ---------------------------------------------------------------------------
// 3. Variation Table (Bảng biến thiên) & Sign Table (Bảng xét dấu) Builder
// ---------------------------------------------------------------------------

export interface VarTableCellValue {
  latex: string;
  level: "top" | "mid" | "bottom";
}

export type VarTableRow =
  | { kind: "sign"; label: string; cells: string[] }
  | {
      kind: "variation";
      label: string;
      cells: Array<{ v: VarTableCellValue[]; bar?: boolean }>;
    };

export interface VarTableData {
  xs: string[];
  rows: VarTableRow[];
  source?: string;
}

export function formatCleanNumber(val: number): string {
  if (!Number.isFinite(val)) return val > 0 ? "+\\infty" : "-\\infty";
  if (Math.abs(val) < 1e-7) return "0";
  const roundedInt = Math.round(val);
  if (Math.abs(val - roundedInt) < 1e-5) return String(roundedInt);

  // Check simple fractions p/q with small denominator
  for (let q = 2; q <= 12; q++) {
    const p = Math.round(val * q);
    if (Math.abs(val - p / q) < 1e-5) {
      return p < 0 ? `-\\frac{${Math.abs(p)}}{${q}}` : `\\frac{${p}}{${q}}`;
    }
  }

  // Check sqrt(k) multiples (e.g. \sqrt{2}, -\sqrt{3})
  const sq = val * val;
  const sqInt = Math.round(sq);
  if (sqInt > 1 && sqInt <= 50 && Math.abs(sq - sqInt) < 1e-5) {
    const sign = val < 0 ? "-" : "";
    return `${sign}\\sqrt{${sqInt}}`;
  }

  const fixed = Number(val.toFixed(2));
  return String(fixed);
}

function classifyLimitSign(fn: (x: number) => number, xProbe: number): "+\\infty" | "-\\infty" {
  const v = fn(xProbe);
  return v >= 0 ? "+\\infty" : "-\\infty";
}

function classifyInfinityBehavior(
  fn: (x: number) => number,
  side: "neg" | "pos"
): { latex: string; numeric: number } {
  const x1 = side === "pos" ? 500 : -500;
  const x2 = side === "pos" ? 2000 : -2000;
  const y1 = fn(x1);
  const y2 = fn(x2);
  if (!Number.isFinite(y1) || !Number.isFinite(y2)) {
    const near = fn(side === "pos" ? 100 : -100);
    return Number.isFinite(near)
      ? { latex: formatCleanNumber(near), numeric: near }
      : { latex: "+\\infty", numeric: 1e9 };
  }
  if (Math.abs(y2) > 1e4 && Math.abs(y2) > Math.abs(y1) * 1.5) {
    return y2 > 0
      ? { latex: "+\\infty", numeric: 1e9 }
      : { latex: "-\\infty", numeric: -1e9 };
  }
  if (Math.abs(y2 - y1) < 1e-2 && Math.abs(y2) < 1e3) {
    const lim = Math.abs(y2) < 1e-5 ? 0 : Number(y2.toFixed(2));
    return { latex: formatCleanNumber(lim), numeric: lim };
  }
  return y2 > 0
    ? { latex: "+\\infty", numeric: 1e9 }
    : { latex: "-\\infty", numeric: -1e9 };
}

/**
 * Automatically builds a Vietnamese SGK Bảng biến thiên from `y = f(x)`.
 */
export function buildVarTableFromExpr(
  exprLatex: string,
  params: Record<string, number> = {}
): VarTableData | { error: string } {
  const compiled = compileMathExpr(exprLatex);
  if (!compiled) {
    return { error: "Không thể phân tích biểu thức hàm số." };
  }
  const fn = (x: number) => compiled({ ...params, x });
  const analysis = analyzeFunctionForPlot(exprLatex, params, [-25, 25]);

  interface CriticalNode {
    x: number;
    latex: string;
    isPole: boolean;
  }

  const nodes: CriticalNode[] = [];
  for (const p of analysis.verticalAsymptotes) {
    nodes.push({ x: p, latex: formatCleanNumber(p), isPole: true });
  }
  for (const e of analysis.extrema) {
    if (!nodes.some((n) => Math.abs(n.x - e.x) < 1e-2)) {
      nodes.push({ x: e.x, latex: formatCleanNumber(e.x), isPole: false });
    }
  }
  nodes.sort((a, b) => a.x - b.x);

  const xs: string[] = ["-\\infty", ...nodes.map((n) => n.latex), "+\\infty"];
  const nCols = xs.length;
  const signCells: string[] = new Array<string>(2 * nCols - 1).fill("");

  // Critical point markers in y' row
  for (let i = 0; i < nodes.length; i++) {
    signCells[(i + 1) * 2] = nodes[i].isPole ? "||" : "0";
  }

  // Sample intervals for y' sign
  const boundaries = [-25, ...nodes.map((n) => n.x), 25];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const a = boundaries[i];
    const b = boundaries[i + 1];
    const probe =
      i === 0 && nodes.length > 0
        ? nodes[0].x - 1
        : i === boundaries.length - 2 && nodes.length > 0
          ? nodes[nodes.length - 1].x + 1
          : 0.5 * (a + b);
    const d = numericalDerivative(fn, probe);
    signCells[i * 2 + 1] = Number.isFinite(d) ? (d >= 0 ? "+" : "-") : "";
  }

  // Build variation row cells
  const leftEnd = classifyInfinityBehavior(fn, "neg");
  const rightEnd = classifyInfinityBehavior(fn, "pos");

  const varCells: Array<{ v: VarTableCellValue[]; bar?: boolean }> = [];
  const rawLevels: Array<{ numeric: number; cellIdx: number; subIdx: number }> = [];

  for (let i = 0; i < nCols; i++) {
    if (i === 0) {
      varCells.push({ v: [{ latex: leftEnd.latex, level: "mid" }] });
      rawLevels.push({ numeric: leftEnd.numeric, cellIdx: i, subIdx: 0 });
    } else if (i === nCols - 1) {
      varCells.push({ v: [{ latex: rightEnd.latex, level: "mid" }] });
      rawLevels.push({ numeric: rightEnd.numeric, cellIdx: i, subIdx: 0 });
    } else {
      const node = nodes[i - 1];
      if (node.isPole) {
        const lSign = classifyLimitSign(fn, node.x - 1e-3);
        const rSign = classifyLimitSign(fn, node.x + 1e-3);
        varCells.push({
          v: [
            { latex: lSign, level: lSign === "+\\infty" ? "top" : "bottom" },
            { latex: rSign, level: rSign === "+\\infty" ? "top" : "bottom" },
          ],
          bar: true,
        });
      } else {
        const yVal = fn(node.x);
        const prevSign = signCells[(i - 1) * 2 + 1];
        const nextSign = signCells[i * 2 + 1];
        const level: "top" | "mid" | "bottom" =
          prevSign === "+" && nextSign === "-"
            ? "top"
            : prevSign === "-" && nextSign === "+"
              ? "bottom"
              : "mid";
        varCells.push({
          v: [{ latex: formatCleanNumber(yVal), level }],
        });
        rawLevels.push({ numeric: yVal, cellIdx: i, subIdx: 0 });
      }
    }
  }

  // Align boundary levels cleanly with neighboring extrema/signs
  if (nCols >= 2) {
    const firstSign = signCells[1];
    if (firstSign === "+") varCells[0].v[0].level = "bottom";
    else if (firstSign === "-") varCells[0].v[0].level = "top";

    const lastSign = signCells[signCells.length - 2];
    const lastIdx = nCols - 1;
    if (lastSign === "+") varCells[lastIdx].v[0].level = "top";
    else if (lastSign === "-") varCells[lastIdx].v[0].level = "bottom";
  }

  return {
    xs,
    rows: [
      { kind: "sign", label: "y'", cells: signCells },
      { kind: "variation", label: "y", cells: varCells },
    ],
  };
}

/**
 * Automatically builds a Vietnamese SGK Bảng xét dấu from `f(x)`.
 */
export function buildSignTableFromExpr(
  exprLatex: string,
  params: Record<string, number> = {}
): VarTableData | { error: string } {
  const compiled = compileMathExpr(exprLatex);
  if (!compiled) {
    return { error: "Không thể phân tích biểu thức xét dấu." };
  }
  const fn = (x: number) => compiled({ ...params, x });
  const poles = findVerticalAsymptotes(fn, -25, 25);
  const roots = findRoots(fn, -25, 25).filter(
    (r) => !poles.some((p) => Math.abs(p - r) < 1e-2)
  );

  const nodes = [
    ...poles.map((x) => ({ x, isPole: true })),
    ...roots.map((x) => ({ x, isPole: false })),
  ].sort((a, b) => a.x - b.x);

  const xs = ["-\\infty", ...nodes.map((n) => formatCleanNumber(n.x)), "+\\infty"];
  const cells = new Array<string>(2 * xs.length - 1).fill("");

  for (let i = 0; i < nodes.length; i++) {
    cells[(i + 1) * 2] = nodes[i].isPole ? "||" : "0";
  }

  const bounds = [-25, ...nodes.map((n) => n.x), 25];
  for (let i = 0; i < bounds.length - 1; i++) {
    const probe =
      i === 0 && nodes.length > 0
        ? nodes[0].x - 1
        : i === bounds.length - 2 && nodes.length > 0
          ? nodes[nodes.length - 1].x + 1
          : 0.5 * (bounds[i] + bounds[i + 1]);
    const val = fn(probe);
    cells[i * 2 + 1] = Number.isFinite(val) ? (val >= 0 ? "+" : "-") : "";
  }

  return {
    xs,
    rows: [{ kind: "sign", label: "f(x)", cells }],
  };
}

// ---------------------------------------------------------------------------
// 4. Conics & Implicit Curve2D Helpers
// ---------------------------------------------------------------------------

export function sampleConicPoints(
  kind: "ellipse" | "parabola" | "hyperbola",
  a: number,
  b?: number
): Array<Array<{ x: number; y: number }>> {
  const safeA = Math.max(0.1, a);
  const safeB = Math.max(0.1, b ?? safeA);
  if (kind === "ellipse") {
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 96; i++) {
      const t = (2 * Math.PI * i) / 96;
      pts.push({ x: safeA * Math.cos(t), y: safeB * Math.sin(t) });
    }
    return [pts];
  }
  if (kind === "parabola") {
    // Standard SGK y^2 = 2*a*x or y = (a/2)x^2 — use classic y^2 = 2px opening right OR y = ax^2
    // Wait: let's match standard Vietnamese SGK conic y^2 = 2px: x = t^2/(2a), y = t for t in [-4, 4]
    const pts: Array<{ x: number; y: number }> = [];
    const tMax = Math.sqrt(Math.max(4, 8 * safeA));
    for (let i = 0; i <= 96; i++) {
      const t = -tMax + (2 * tMax * i) / 96;
      pts.push({ x: (t * t) / (2 * safeA), y: t });
    }
    return [pts];
  }
  // Hyperbola: x^2/a^2 - y^2/b^2 = 1
  const right: Array<{ x: number; y: number }> = [];
  const left: Array<{ x: number; y: number }> = [];
  const uMax = 1.4;
  for (let i = 0; i <= 96; i++) {
    const u = -uMax + (2 * uMax * i) / 96;
    right.push({ x: safeA * Math.cosh(u), y: safeB * Math.sinh(u) });
    left.push({ x: -safeA * Math.cosh(u), y: safeB * Math.sinh(u) });
  }
  return [right, left];
}

/**
 * Samples an implicit equation F(x, y) = 0 using cell marching squares.
 */
export function sampleImplicitEquation(
  equationLatex: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  params: Record<string, number> = {},
  gridN = 64
): Array<[{ x: number; y: number }, { x: number; y: number }]> {
  const parts = equationLatex.split("=");
  const diffExpr = parts.length === 2 ? `(${parts[0]}) - (${parts[1]})` : equationLatex;
  const fn = compileMathExpr(diffExpr);
  if (!fn) return [];

  const dx = (xMax - xMin) / gridN;
  const dy = (yMax - yMin) / gridN;
  const vals: number[][] = [];
  for (let iy = 0; iy <= gridN; iy++) {
    const row: number[] = [];
    const y = yMin + iy * dy;
    for (let ix = 0; ix <= gridN; ix++) {
      const x = xMin + ix * dx;
      row.push(fn({ ...params, x, y }));
    }
    vals.push(row);
  }

  const segs: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
  const interp = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    v1: number,
    v2: number
  ) => {
    const d = v2 - v1;
    const t = Math.abs(d) < 1e-12 ? 0.5 : -v1 / d;
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    };
  };

  for (let iy = 0; iy < gridN; iy++) {
    for (let ix = 0; ix < gridN; ix++) {
      const x0 = xMin + ix * dx;
      const x1 = x0 + dx;
      const y0 = yMin + iy * dy;
      const y1 = y0 + dy;
      const v00 = vals[iy][ix];
      const v10 = vals[iy][ix + 1];
      const v11 = vals[iy + 1][ix + 1];
      const v01 = vals[iy + 1][ix];
      if (![v00, v10, v11, v01].every(Number.isFinite)) continue;

      const pts: Array<{ x: number; y: number }> = [];
      const p00 = { x: x0, y: y0 };
      const p10 = { x: x1, y: y0 };
      const p11 = { x: x1, y: y1 };
      const p01 = { x: x0, y: y1 };

      if ((v00 >= 0 && v10 < 0) || (v00 < 0 && v10 >= 0)) pts.push(interp(p00, p10, v00, v10));
      if ((v10 >= 0 && v11 < 0) || (v10 < 0 && v11 >= 0)) pts.push(interp(p10, p11, v10, v11));
      if ((v11 >= 0 && v01 < 0) || (v11 < 0 && v01 >= 0)) pts.push(interp(p11, p01, v11, v01));
      if ((v01 >= 0 && v00 < 0) || (v01 < 0 && v00 >= 0)) pts.push(interp(p01, p00, v01, v00));

      if (pts.length === 2) {
        segs.push([pts[0], pts[1]]);
      } else if (pts.length === 4) {
        segs.push([pts[0], pts[1]]);
        segs.push([pts[2], pts[3]]);
      }
    }
  }
  return segs;
}

// ---------------------------------------------------------------------------
// 5. TrigCircle Special Angle Snapping & Exact Values
// ---------------------------------------------------------------------------

const SPECIAL_TRIG_ANGLES: Array<{
  rad: number;
  radLatex: string;
  deg: number;
  cosLatex: string;
  sinLatex: string;
  tanLatex: string | null;
  cotLatex: string | null;
}> = [
  { rad: 0, radLatex: "0", deg: 0, cosLatex: "1", sinLatex: "0", tanLatex: "0", cotLatex: null },
  { rad: Math.PI / 6, radLatex: "\\frac{\\pi}{6}", deg: 30, cosLatex: "\\frac{\\sqrt{3}}{2}", sinLatex: "\\frac{1}{2}", tanLatex: "\\frac{\\sqrt{3}}{3}", cotLatex: "\\sqrt{3}" },
  { rad: Math.PI / 4, radLatex: "\\frac{\\pi}{4}", deg: 45, cosLatex: "\\frac{\\sqrt{2}}{2}", sinLatex: "\\frac{\\sqrt{2}}{2}", tanLatex: "1", cotLatex: "1" },
  { rad: Math.PI / 3, radLatex: "\\frac{\\pi}{3}", deg: 60, cosLatex: "\\frac{1}{2}", sinLatex: "\\frac{\\sqrt{3}}{2}", tanLatex: "\\sqrt{3}", cotLatex: "\\frac{\\sqrt{3}}{3}" },
  { rad: Math.PI / 2, radLatex: "\\frac{\\pi}{2}", deg: 90, cosLatex: "0", sinLatex: "1", tanLatex: null, cotLatex: "0" },
  { rad: (2 * Math.PI) / 3, radLatex: "\\frac{2\\pi}{3}", deg: 120, cosLatex: "-\\frac{1}{2}", sinLatex: "\\frac{\\sqrt{3}}{2}", tanLatex: "-\\sqrt{3}", cotLatex: "-\\frac{\\sqrt{3}}{3}" },
  { rad: (3 * Math.PI) / 4, radLatex: "\\frac{3\\pi}{4}", deg: 135, cosLatex: "-\\frac{\\sqrt{2}}{2}", sinLatex: "\\frac{\\sqrt{2}}{2}", tanLatex: "-1", cotLatex: "-1" },
  { rad: (5 * Math.PI) / 6, radLatex: "\\frac{5\\pi}{6}", deg: 150, cosLatex: "-\\frac{\\sqrt{3}}{2}", sinLatex: "\\frac{1}{2}", tanLatex: "-\\frac{\\sqrt{3}}{3}", cotLatex: "-\\sqrt{3}" },
  { rad: Math.PI, radLatex: "\\pi", deg: 180, cosLatex: "-1", sinLatex: "0", tanLatex: "0", cotLatex: null },
  { rad: (-5 * Math.PI) / 6, radLatex: "-\\frac{5\\pi}{6}", deg: -150, cosLatex: "-\\frac{\\sqrt{3}}{2}", sinLatex: "-\\frac{1}{2}", tanLatex: "\\frac{\\sqrt{3}}{3}", cotLatex: "\\sqrt{3}" },
  { rad: (-3 * Math.PI) / 4, radLatex: "-\\frac{3\\pi}{4}", deg: -135, cosLatex: "-\\frac{\\sqrt{2}}{2}", sinLatex: "-\\frac{\\sqrt{2}}{2}", tanLatex: "1", cotLatex: "1" },
  { rad: (-2 * Math.PI) / 3, radLatex: "-\\frac{2\\pi}{3}", deg: -120, cosLatex: "-\\frac{1}{2}", sinLatex: "-\\frac{\\sqrt{3}}{2}", tanLatex: "\\sqrt{3}", cotLatex: "\\frac{\\sqrt{3}}{3}" },
  { rad: -Math.PI / 2, radLatex: "-\\frac{\\pi}{2}", deg: -90, cosLatex: "0", sinLatex: "-1", tanLatex: null, cotLatex: "0" },
  { rad: -Math.PI / 3, radLatex: "-\\frac{\\pi}{3}", deg: -60, cosLatex: "\\frac{1}{2}", sinLatex: "-\\frac{\\sqrt{3}}{2}", tanLatex: "-\\sqrt{3}", cotLatex: "-\\frac{\\sqrt{3}}{3}" },
  { rad: -Math.PI / 4, radLatex: "-\\frac{\\pi}{4}", deg: -45, cosLatex: "\\frac{\\sqrt{2}}{2}", sinLatex: "-\\frac{\\sqrt{2}}{2}", tanLatex: "-1", cotLatex: "-1" },
  { rad: -Math.PI / 6, radLatex: "-\\frac{\\pi}{6}", deg: -30, cosLatex: "\\frac{\\sqrt{3}}{2}", sinLatex: "-\\frac{1}{2}", tanLatex: "-\\frac{\\sqrt{3}}{3}", cotLatex: "-\\sqrt{3}" },
];

export function normalizeAngle(rad: number): number {
  let a = rad % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

export function snapTrigAngle(rad: number, snapThreshold = 0.06): number {
  const norm = normalizeAngle(rad);
  for (const s of SPECIAL_TRIG_ANGLES) {
    if (Math.abs(norm - s.rad) < snapThreshold) {
      return s.rad;
    }
    if (s.rad === Math.PI && Math.abs(Math.abs(norm) - Math.PI) < snapThreshold) {
      return Math.PI;
    }
  }
  return norm;
}

export interface TrigReadout {
  angleRad: number;
  angleDeg: number;
  angleLatex: string;
  cos: number;
  sin: number;
  tan: number | null;
  cot: number | null;
  cosLatex: string;
  sinLatex: string;
  tanLatex: string | null;
  cotLatex: string | null;
}

export function computeTrigValues(angleRad: number, unit: "rad" | "deg" = "rad"): TrigReadout {
  const norm = normalizeAngle(angleRad);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const tan = Math.abs(cos) < 1e-6 ? null : sin / cos;
  const cot = Math.abs(sin) < 1e-6 ? null : cos / sin;
  const deg = (angleRad * 180) / Math.PI;

  const special = SPECIAL_TRIG_ANGLES.find(
    (s) => Math.abs(norm - s.rad) < 1e-4 || (s.rad === Math.PI && Math.abs(Math.abs(norm) - Math.PI) < 1e-4)
  );

  if (special) {
    return {
      angleRad,
      angleDeg: special.deg,
      angleLatex: unit === "deg" ? `${special.deg}^{\\circ}` : special.radLatex,
      cos: Math.abs(cos) < 1e-10 ? 0 : cos,
      sin: Math.abs(sin) < 1e-10 ? 0 : sin,
      tan,
      cot,
      cosLatex: special.cosLatex,
      sinLatex: special.sinLatex,
      tanLatex: special.tanLatex,
      cotLatex: special.cotLatex,
    };
  }

  return {
    angleRad,
    angleDeg: deg,
    angleLatex:
      unit === "deg"
        ? `${deg.toFixed(1).replace(/\.0$/, "")}^{\\circ}`
        : `${angleRad.toFixed(2)}`,
    cos,
    sin,
    tan,
    cot,
    cosLatex: cos.toFixed(3),
    sinLatex: sin.toFixed(3),
    tanLatex: tan === null ? null : tan.toFixed(3),
    cotLatex: cot === null ? null : cot.toFixed(3),
  };
}

// ---------------------------------------------------------------------------
// 6. Combinatorics (Hoán vị / Chỉnh hợp / Tổ hợp) & Exact Rationals
// ---------------------------------------------------------------------------

export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function permutationCount(n: number): number {
  return factorial(n);
}

export function arrangementCount(n: number, k: number): number {
  if (k < 0 || k > n || !Number.isInteger(n) || !Number.isInteger(k)) return 0;
  let res = 1;
  for (let i = 0; i < k; i++) res *= n - i;
  return res;
}

export function combinationCount(n: number, k: number): number {
  if (k < 0 || k > n || !Number.isInteger(n) || !Number.isInteger(k)) return 0;
  const kk = Math.min(k, n - k);
  let num = 1;
  let den = 1;
  for (let i = 0; i < kk; i++) {
    num *= n - i;
    den *= i + 1;
  }
  return Math.round(num / den);
}

export function enumerateCountingOutcomes(
  kind: "perm" | "arr" | "comb",
  items: string[],
  k: number,
  maxItems = 120
): { outcomes: string[][]; total: number; truncated: boolean } {
  const n = items.length;
  const effectiveK = kind === "perm" ? n : Math.min(k, n);
  const total =
    kind === "perm"
      ? permutationCount(n)
      : kind === "arr"
        ? arrangementCount(n, effectiveK)
        : combinationCount(n, effectiveK);

  const outcomes: string[][] = [];
  let truncated = false;

  if (kind === "comb") {
    const dfs = (start: number, cur: string[]) => {
      if (outcomes.length >= maxItems) {
        truncated = true;
        return;
      }
      if (cur.length === effectiveK) {
        outcomes.push([...cur]);
        return;
      }
      for (let i = start; i < n; i++) {
        cur.push(items[i]);
        dfs(i + 1, cur);
        cur.pop();
        if (truncated) return;
      }
    };
    dfs(0, []);
  } else {
    const used = new Array<boolean>(n).fill(false);
    const dfs = (cur: string[]) => {
      if (outcomes.length >= maxItems) {
        truncated = true;
        return;
      }
      if (cur.length === effectiveK) {
        outcomes.push([...cur]);
        return;
      }
      for (let i = 0; i < n; i++) {
        if (used[i]) continue;
        used[i] = true;
        cur.push(items[i]);
        dfs(cur);
        cur.pop();
        used[i] = false;
        if (truncated) return;
      }
    };
    dfs([]);
  }

  return { outcomes, total, truncated };
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function simplifyFraction(num: number, den: number): { n: number; d: number } {
  if (den === 0) return { n: num, d: 0 };
  const sign = (num < 0) !== (den < 0) ? -1 : 1;
  const absN = Math.abs(num);
  const absD = Math.abs(den);
  const g = gcd(absN, absD);
  return { n: (sign * absN) / g, d: absD / g };
}

export function parseRational(raw: string): { value: number; latex: string } | null {
  const s = raw.trim().replace(/,/g, ".");
  if (!s) return null;
  const fracMatch = /^(-?\d+)\s*\/\s*(\d+)$/.exec(s);
  if (fracMatch) {
    const n = Number(fracMatch[1]);
    const d = Number(fracMatch[2]);
    if (d === 0) return null;
    const simp = simplifyFraction(n, d);
    return {
      value: simp.n / simp.d,
      latex: simp.d === 1 ? String(simp.n) : `\\frac{${simp.n}}{${simp.d}}`,
    };
  }
  const num = Number(s);
  if (!Number.isFinite(num)) return null;
  return { value: num, latex: s };
}

// ---------------------------------------------------------------------------
// 7. Descriptive Statistics (Mean, Median, Quartiles, Mode, Variance, Box Plot)
// ---------------------------------------------------------------------------

export interface DescriptiveStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  modes: number[];
  variance: number;
  stdDev: number;
}

function quantileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

export function computeDescriptiveStats(values: number[]): DescriptiveStats {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  const n = clean.length;
  if (n === 0) {
    return {
      count: 0,
      sum: 0,
      min: 0,
      max: 0,
      mean: 0,
      q1: 0,
      median: 0,
      q3: 0,
      iqr: 0,
      modes: [],
      variance: 0,
      stdDev: 0,
    };
  }

  const sum = clean.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const min = clean[0];
  const max = clean[n - 1];
  const median = quantileSorted(clean, 0.5);
  const mid = Math.floor(n / 2);
  const lowerHalf = clean.slice(0, mid);
  const upperHalf = n % 2 === 0 ? clean.slice(mid) : clean.slice(mid + 1);
  const q1 = lowerHalf.length > 0 ? quantileSorted(lowerHalf, 0.5) : min;
  const q3 = upperHalf.length > 0 ? quantileSorted(upperHalf, 0.5) : max;
  const iqr = q3 - q1;

  // Mode
  const freq = new Map<number, number>();
  let maxFreq = 0;
  for (const v of clean) {
    const f = (freq.get(v) ?? 0) + 1;
    freq.set(v, f);
    if (f > maxFreq) maxFreq = f;
  }
  const modes =
    maxFreq > 1
      ? Array.from(freq.entries())
          .filter(([, f]) => f === maxFreq)
          .map(([v]) => v)
      : [];

  const sqDiff = clean.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
  const variance = sqDiff / n;
  const stdDev = Math.sqrt(variance);

  return {
    count: n,
    sum,
    min,
    max,
    mean,
    q1,
    median,
    q3,
    iqr,
    modes,
    variance,
    stdDev,
  };
}

export function computeGroupedStats(
  edges: number[],
  counts: number[]
): DescriptiveStats {
  const expanded: number[] = [];
  let totalCount = 0;
  let weightedSum = 0;
  for (let i = 0; i < counts.length && i + 1 < edges.length; i++) {
    const mid = 0.5 * (edges[i] + edges[i + 1]);
    const c = Math.max(0, Math.round(counts[i]));
    totalCount += c;
    weightedSum += mid * c;
    for (let k = 0; k < c; k++) expanded.push(mid);
  }
  if (totalCount === 0) return computeDescriptiveStats([]);

  const mean = weightedSum / totalCount;
  const groupedQuantile = (p: number): number => {
    const target = p * totalCount;
    let cum = 0;
    for (let i = 0; i < counts.length && i + 1 < edges.length; i++) {
      const c = Math.max(0, counts[i]);
      if (cum + c >= target && c > 0) {
        const frac = (target - cum) / c;
        return edges[i] + frac * (edges[i + 1] - edges[i]);
      }
      cum += c;
    }
    return edges[edges.length - 1];
  };

  let sqSum = 0;
  for (let i = 0; i < counts.length && i + 1 < edges.length; i++) {
    const mid = 0.5 * (edges[i] + edges[i + 1]);
    sqSum += Math.max(0, counts[i]) * (mid - mean) * (mid - mean);
  }
  const variance = sqSum / totalCount;
  const q1 = groupedQuantile(0.25);
  const median = groupedQuantile(0.5);
  const q3 = groupedQuantile(0.75);

  return {
    count: totalCount,
    sum: weightedSum,
    min: edges[0],
    max: edges[edges.length - 1],
    mean,
    q1,
    median,
    q3,
    iqr: q3 - q1,
    modes: [],
    variance,
    stdDev: Math.sqrt(variance),
  };
}

// ---------------------------------------------------------------------------
// 8. NumberLine Set Parser (SGK Vietnamese Set Notation)
// ---------------------------------------------------------------------------

export interface NumberInterval {
  lo: number; // -Infinity allowed
  hi: number; // +Infinity allowed
  loOpen: boolean;
  hiOpen: boolean;
}

export interface ParsedNumberSet {
  intervals: NumberInterval[];
  points: number[];
}

function parseBoundValue(raw: string): number {
  const s = raw
    .trim()
    .replace(/\\infty/g, "infty")
    .replace(/∞/g, "infty")
    .replace(/\\pi/g, "pi")
    .replace(/\{,\}/g, ".")
    .replace(/,/g, ".");
  if (s === "+infty" || s === "infty") return Infinity;
  if (s === "-infty") return -Infinity;
  const val = evalMathExpr(s);
  if (!Number.isFinite(val)) {
    throw new Error(`Giá trị cận không hợp lệ: "${raw}"`);
  }
  return val;
}

function parseSingleSetAtom(rawAtom: string): ParsedNumberSet {
  const s = rawAtom.trim();
  if (!s) throw new Error("Tập hợp rỗng");
  if (/^(\\emptyset|∅)$/i.test(s)) {
    return { intervals: [], points: [] };
  }
  if (/^(\\mathbb\{R\}|ℝ|R)$/i.test(s)) {
    return { intervals: [{ lo: -Infinity, hi: Infinity, loOpen: true, hiOpen: true }], points: [] };
  }

  // Discrete set \{a; b; c\} or {a; b; c}
  const setMatch = /^(?:\\\{|\{)([\s\S]*?)(?:\\\}|\})$/.exec(s);
  if (setMatch) {
    const inner = setMatch[1].trim();
    if (!inner) return { intervals: [], points: [] };
    const pts = inner
      .split(/[;,]/)
      .map((p) => parseBoundValue(p))
      .filter(Number.isFinite);
    return { intervals: [], points: dedupeSorted(pts) };
  }

  // Interval [a; b], (a; b], [a; b), (a; b)
  const intMatch = /^([(\[])([\s\S]*)[;]([\s\S]*)([)\]])$/.exec(s);
  if (intMatch) {
    const loOpen = intMatch[1] === "(";
    const hiOpen = intMatch[4] === ")";
    const lo = parseBoundValue(intMatch[2]);
    const hi = parseBoundValue(intMatch[3]);
    if (lo > hi || (lo === hi && (loOpen || hiOpen))) {
      return { intervals: [], points: [] };
    }
    if (lo === hi) {
      return { intervals: [], points: [lo] };
    }
    return { intervals: [{ lo, hi, loOpen, hiOpen }], points: [] };
  }

  throw new Error(`Không hiểu ký hiệu tập hợp: "${rawAtom}"`);
}

function normalizeIntervals(set: ParsedNumberSet): ParsedNumberSet {
  const sorted = [...set.intervals].sort((a, b) => a.lo - b.lo || (a.loOpen ? 1 : 0) - (b.loOpen ? 1 : 0));
  const merged: NumberInterval[] = [];
  for (const iv of sorted) {
    if (iv.lo > iv.hi || (iv.lo === iv.hi && (iv.loOpen || iv.hiOpen))) continue;
    if (merged.length === 0) {
      merged.push({ ...iv });
      continue;
    }
    const last = merged[merged.length - 1];
    const overlaps =
      iv.lo < last.hi || (iv.lo === last.hi && (!iv.loOpen || !last.hiOpen));
    if (overlaps) {
      if (iv.hi > last.hi) {
        last.hi = iv.hi;
        last.hiOpen = iv.hiOpen;
      } else if (iv.hi === last.hi) {
        last.hiOpen = last.hiOpen && iv.hiOpen;
      }
    } else {
      merged.push({ ...iv });
    }
  }

  const pointSet = dedupeSorted(set.points).filter(
    (p) =>
      !merged.some(
        (iv) =>
          (p > iv.lo || (p === iv.lo && !iv.loOpen)) &&
          (p < iv.hi || (p === iv.hi && !iv.hiOpen))
      )
  );
  return { intervals: merged, points: pointSet };
}

function unionSets(a: ParsedNumberSet, b: ParsedNumberSet): ParsedNumberSet {
  return normalizeIntervals({
    intervals: [...a.intervals, ...b.intervals],
    points: [...a.points, ...b.points],
  });
}

function intersectSets(a: ParsedNumberSet, b: ParsedNumberSet): ParsedNumberSet {
  const intervals: NumberInterval[] = [];
  for (const ia of a.intervals) {
    for (const ib of b.intervals) {
      let lo = ia.lo;
      let loOpen = ia.loOpen;
      if (ib.lo > lo) {
        lo = ib.lo;
        loOpen = ib.loOpen;
      } else if (ib.lo === lo) {
        loOpen = ia.loOpen || ib.loOpen;
      }

      let hi = ia.hi;
      let hiOpen = ia.hiOpen;
      if (ib.hi < hi) {
        hi = ib.hi;
        hiOpen = ib.hiOpen;
      } else if (ib.hi === hi) {
        hiOpen = ia.hiOpen || ib.hiOpen;
      }

      if (lo < hi) {
        intervals.push({ lo, hi, loOpen, hiOpen });
      }
    }
  }
  const inSet = (x: number, s: ParsedNumberSet) =>
    s.points.some((p) => Math.abs(p - x) < 1e-9) ||
    s.intervals.some(
      (iv) =>
        (x > iv.lo || (x === iv.lo && !iv.loOpen)) &&
        (x < iv.hi || (x === iv.hi && !iv.hiOpen))
    );
  const points = [...a.points, ...b.points].filter((p) => inSet(p, a) && inSet(p, b));
  // Also single-point touching intervals [a,b] \cap [b,c] -> {b}
  for (const ia of a.intervals) {
    for (const ib of b.intervals) {
      if (ia.hi === ib.lo && !ia.hiOpen && !ib.loOpen) points.push(ia.hi);
      if (ib.hi === ia.lo && !ib.hiOpen && !ia.loOpen) points.push(ib.hi);
    }
  }
  return normalizeIntervals({ intervals, points });
}

function subtractSets(a: ParsedNumberSet, b: ParsedNumberSet): ParsedNumberSet {
  // Complement of b on R
  const compIntervals: NumberInterval[] = [];
  let cursor = -Infinity;
  let cursorOpen = true;
  const normB = normalizeIntervals(b);

  for (const iv of normB.intervals) {
    if (iv.lo > cursor || (iv.lo === cursor && !cursorOpen && iv.loOpen)) {
      if (iv.lo > cursor) {
        compIntervals.push({
          lo: cursor,
          hi: iv.lo,
          loOpen: cursorOpen,
          hiOpen: !iv.loOpen,
        });
      }
    }
    cursor = iv.hi;
    cursorOpen = !iv.hiOpen;
  }
  if (cursor < Infinity) {
    compIntervals.push({ lo: cursor, hi: Infinity, loOpen: cursorOpen, hiOpen: true });
  }

  // Also punch holes for discrete points in b
  let res = intersectSets(a, { intervals: compIntervals, points: [] });
  for (const pt of normB.points) {
    const split: NumberInterval[] = [];
    for (const iv of res.intervals) {
      if (pt > iv.lo && pt < iv.hi) {
        split.push({ lo: iv.lo, hi: pt, loOpen: iv.loOpen, hiOpen: true });
        split.push({ lo: pt, hi: iv.hi, loOpen: true, hiOpen: iv.hiOpen });
      } else if (pt === iv.lo) {
        split.push({ lo: iv.lo, hi: iv.hi, loOpen: true, hiOpen: iv.hiOpen });
      } else if (pt === iv.hi) {
        split.push({ lo: iv.lo, hi: iv.hi, loOpen: iv.loOpen, hiOpen: true });
      } else {
        split.push(iv);
      }
    }
    res = {
      intervals: split,
      points: res.points.filter((p) => Math.abs(p - pt) > 1e-9),
    };
  }
  return normalizeIntervals(res);
}

/**
 * Parses SGK Vietnamese number-line set expressions like
 * `[-2;3)\cup(5;+\infty)`, `\mathbb{R}\setminus\{2\}`, `(-5;2]\cap[0;4)`.
 */
export function parseNumberLineSet(
  rawSet: string
): ParsedNumberSet | { error: string } {
  try {
    const s = String(rawSet ?? "")
      .replace(/\\left/g, "")
      .replace(/\\right/g, "")
      .replace(/\{,\}/g, ".")
      .replace(/\s+/g, " ")
      .trim();

    if (!s) return { error: "Vui lòng nhập biểu thức tập hợp." };

    // Split on \cup / \cap / \setminus / unicode equivalents while keeping \infty and \{...\} intact
    const opRegex = /(\\cup|\\cap|\\setminus|∪|∩|(?<=\s)\\(?=\s))/g;
    const parts = s.split(opRegex).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return { error: "Biểu thức tập hợp rỗng." };

    let acc = parseSingleSetAtom(parts[0]);
    for (let i = 1; i + 1 < parts.length; i += 2) {
      const op = parts[i];
      const rhs = parseSingleSetAtom(parts[i + 1]);
      if (op === "\\cup" || op === "∪") {
        acc = unionSets(acc, rhs);
      } else if (op === "\\cap" || op === "∩") {
        acc = intersectSets(acc, rhs);
      } else {
        acc = subtractSets(acc, rhs);
      }
    }
    return normalizeIntervals(acc);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Tập hợp không hợp lệ.",
    };
  }
}
