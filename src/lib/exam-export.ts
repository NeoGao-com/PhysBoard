import JSZip from "jszip";
import { CanvasElement } from "@/types/whiteboard";

export type CognitiveLevel = "nb" | "th" | "vd" | "vdc";
export type ExamItemKind = "mcq" | "tf" | "short" | "essay" | "section" | "space";

export interface ExamTopicSpec {
  key: string;
  name: string;
}

export interface ExamMatrixConfig {
  topics: ExamTopicSpec[];
  target?: Record<string, number>;
  pts?: Record<string, number>;
}

export interface ExamCodeVariant {
  code: string;
  params: Record<string, number>;
  seed: number;
  items?: ExamItemData[];
  answerKey?: Array<{ index: number; answer: string }>;
}

export interface ExamPageMargins {
  wMm: number;
  hMm: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  tabPt?: number;
}

export interface ExamPaperData {
  headLeft: string;
  headRight: string;
  studentLine: boolean;
  studentHtml?: string;
  docHtml?: string;
  marginMm: number;
  fontPt: number;
  font?: string;
  items: string[];
  headH?: number;
  codes?: ExamCodeVariant[];
  shuffleItems?: boolean;
  shuffleOptions?: boolean;
  page?: ExamPageMargins;
  fromWord?: string;
  texPreamble?: string;
  texTikzPre?: string;
  matrix?: ExamMatrixConfig;
}

export interface ExamItemData {
  id: string;
  paper: string;
  kind: ExamItemKind;
  html: string;
  text?: string;
  options?: string[];
  answer?: number | null;
  answers?: Array<boolean | null>;
  answerText?: string;
  answerExpr?: string;
  points?: number;
  level?: CognitiveLevel;
  topic?: string;
  lockOrder?: boolean;
  lockOptions?: boolean;
  h: number;
  contentH?: number;
  figW?: number;
  figSvg?: string;
  figIds?: string[];
  optLayout?: "auto" | "1" | "2" | "4";
  space?: "lines" | "grid" | "blank";
  solution?: string;
  texIdCode?: string;
}

export interface ParsedTexIdTag {
  raw: string;
  grade?: string;
  subject?: string;
  chapter?: string;
  level?: CognitiveLevel;
  topicHint?: string;
}

export interface ShuffledExamResult {
  variants: ExamCodeVariant[];
  csvAnswerKey: string;
}

const DEFAULT_HEAD_LEFT = "SỞ GIÁO DỤC VÀ ĐÀO TẠO …\nTRƯỜNG …";
const DEFAULT_HEAD_RIGHT =
  "ĐỀ KIỂM TRA …\nMôn: Toán – Lớp …\nThời gian làm bài: … phút";
const DEFAULT_STUDENT_LINE =
  "Họ và tên: ........................................................... Lớp: ............. Số báo danh: .............";

export function buildDefaultExamHtml(): string {
  return [
    `<p><strong>PHẦN I. TRẮC NGHIỆM</strong></p>`,
    `<p><strong>Câu 1.</strong> </p>`,
    `<p><strong>A.</strong> </p>`,
    `<p><strong>B.</strong> </p>`,
    `<p><strong>C.</strong> </p>`,
    `<p><strong>D.</strong> </p>`,
    `<p><strong>PHẦN II. TỰ LUẬN</strong></p>`,
    `<p><strong>Câu 2.</strong> (1 điểm) </p>`,
  ].join("\n");
}

export function buildDefaultExamPaper(): ExamPaperData {
  return {
    headLeft: DEFAULT_HEAD_LEFT,
    headRight: DEFAULT_HEAD_RIGHT,
    studentLine: true,
    studentHtml: DEFAULT_STUDENT_LINE,
    docHtml: buildDefaultExamHtml(),
    marginMm: 18,
    fontPt: 12,
    font: "Times New Roman",
    items: [],
    page: { wMm: 210, hMm: 297, top: 18, right: 18, bottom: 18, left: 20 },
    matrix: {
      topics: [],
      target: {},
      pts: { mcq: 0.25, tf: 1, short: 0.5, essay: 1 },
    },
  };
}

/**
 * Parses Vietnamese LaTeX `ex_test` ID code such as `%[2D1N2-3]` or `2H3V1-4`.
 */
export function parseTexIdTag(rawInput: string): ParsedTexIdTag | null {
  const match = rawInput.match(/([0-9])([A-Za-z])([0-9])([NHVCB])([0-9]+)-([0-9]+)/i);
  if (!match) return null;

  const [, grade, subjectRaw, chapter, lvlRaw] = match;
  const subject = subjectRaw.toUpperCase();
  const lvlChar = lvlRaw.toUpperCase();

  let level: CognitiveLevel = "nb";
  if (lvlChar === "H") level = "th";
  else if (lvlChar === "V") level = "vd";
  else if (lvlChar === "C") level = "vdc";
  else if (lvlChar === "N" || lvlChar === "B") level = "nb";

  const topicMap: Record<string, string> = {
    "2D1": "Ứng dụng đạo hàm",
    "2D2": "Hàm số mũ và Lôgarit",
    "2D3": "Nguyên hàm - Tích phân",
    "2D4": "Số phức",
    "2H1": "Khối đa diện",
    "2H2": "Khối tròn xoay",
    "2H3": "Tọa độ trong không gian Oxyz",
    "1D1": "Hàm số lượng giác",
    "1D2": "Tổ hợp - Xác suất",
    "1D3": "Dãy số - Cấp số",
    "1H1": "Phép biến hình",
    "1H2": "Đường thẳng và mặt phẳng",
    "1H3": "Vectơ trong không gian",
    "0D1": "Mệnh đề - Tập hợp",
    "0D2": "Hàm số bậc hai",
    "0D3": "Phương trình - Bất phương trình",
    "0H1": "Vectơ",
    "0H2": "Tích vô hướng",
    "0H3": "Phương pháp tọa độ Oxy",
  };

  const key = `${grade}${subject}${chapter}`;
  const topicHint =
    topicMap[key] ??
    `Chương ${chapter} (${subject === "D" ? "Đại số/Giải tích" : subject === "H" ? "Hình học" : "Toán"} ${grade === "2" ? "12" : grade === "1" ? "11" : grade === "0" ? "10" : grade})`;

  return {
    raw: match[0],
    grade,
    subject,
    chapter,
    level,
    topicHint,
  };
}

function normalizeLevelTag(raw: string | null | undefined): CognitiveLevel | undefined {
  if (!raw) return undefined;
  const lower = raw.trim().toLowerCase();
  if (lower === "b" || lower === "nb" || lower === "biết" || lower === "nhận biết") return "nb";
  if (lower === "h" || lower === "th" || lower === "hiểu" || lower === "thông hiểu") return "th";
  if (lower === "v" || lower === "vd" || lower === "vận dụng") return "vd";
  if (lower === "c" || lower === "vdc" || lower === "vận dụng cao") return "vdc";
  return undefined;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<span[^>]*data-latex="([^"]+)"[^>]*>.*?<\/span>/gi, "$$$1$$")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parsePointsFromLine(text: string): number | undefined {
  const m = text.match(/\(\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|đ)\s*\)/i);
  if (!m) return undefined;
  const num = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Parses editable HTML from the A4 Exam Editor into structured `ExamItemData` records.
 */
export function parseExamHtmlToItems(
  html: string,
  paperId = "exam-paper-1"
): ExamItemData[] {
  const blocks: Array<{ html: string; text: string }> = [];

  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    if (root) {
      for (const child of Array.from(root.children)) {
        blocks.push({
          html: child.outerHTML,
          text: (child.textContent ?? "").replace(/\s+/g, " ").trim(),
        });
      }
    }
  }

  if (blocks.length === 0) {
    const lines = stripHtmlTags(html).split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        blocks.push({ html: `<p>${escapeXml(trimmed)}</p>`, text: trimmed });
      }
    }
  }

  const items: ExamItemData[] = [];
  let currentSectionKind: ExamItemKind = "mcq";
  let activeItem: ExamItemData | null = null;
  let qCounter = 0;

  const pushActive = () => {
    if (!activeItem) return;
    if (activeItem.kind === "mcq" && (!activeItem.options || activeItem.options.length === 0)) {
      if (currentSectionKind === "essay") {
        activeItem.kind = "essay";
      }
    }
    items.push(activeItem);
    activeItem = null;
  };

  for (const blk of blocks) {
    const text = blk.text;
    if (!text) continue;

    // Section detection
    if (/^(PHẦN|Phần)\s+[IVX0-9]+/i.test(text)) {
      pushActive();
      const upper = text.toUpperCase();
      if (upper.includes("TỰ LUẬN")) currentSectionKind = "essay";
      else if (upper.includes("ĐÚNG") && upper.includes("SAI")) currentSectionKind = "tf";
      else if (upper.includes("TRẢ LỜI NGẮN")) currentSectionKind = "short";
      else currentSectionKind = "mcq";

      items.push({
        id: `sec_${items.length + 1}`,
        paper: paperId,
        kind: "section",
        html: blk.html,
        text,
        h: 28,
      });
      continue;
    }

    // Question header detection: Câu 1. / Bài 2.
    const qMatch = text.match(/^(Câu|Bài)\s+(\d+)[.:]?\s*(.*)$/i);
    if (qMatch) {
      pushActive();
      qCounter += 1;

      const dataLvMatch = blk.html.match(/data-lv="([^"]+)"/i);
      const dataTopicMatch = blk.html.match(/data-topic="([^"]+)"/i);
      const inlineLvMatch = text.match(/\((NB|TH|VD|VDC)\)/i);
      const texTag = parseTexIdTag(text);

      const level =
        normalizeLevelTag(dataLvMatch?.[1]) ??
        normalizeLevelTag(inlineLvMatch?.[1]) ??
        texTag?.level;
      const topic = dataTopicMatch?.[1] ?? texTag?.topicHint;
      const points = parsePointsFromLine(text);

      activeItem = {
        id: `q_${qCounter}`,
        paper: paperId,
        kind: currentSectionKind,
        html: blk.html,
        text,
        options: currentSectionKind === "mcq" || currentSectionKind === "tf" ? [] : undefined,
        answer: null,
        points,
        level,
        topic,
        texIdCode: texTag?.raw,
        lockOrder: /data-lock-order="true"/i.test(blk.html),
        lockOptions: /data-lock-options="true"/i.test(blk.html),
        h: 64,
      };
      continue;
    }

    // Option detection (A., B., C., D. or a), b), c), d))
    if (activeItem) {
      const optMatch = text.match(/^([A-D])\.\s*(.*)$/);
      const tfMatch = text.match(/^([a-d])\)\s*(.*)$/);
      if (optMatch) {
        activeItem.kind = "mcq";
        if (!activeItem.options) activeItem.options = [];
        const optIdx = optMatch[1].charCodeAt(0) - 65;
        const optText = optMatch[2].trim();
        activeItem.options[optIdx] = optText;
        if (
          /text-decoration:\s*underline|color:\s*(?:#dc2626|red|rgb\(220,\s*38,\s*38\))|<mark|background(?:-color)?:\s*(?:#fef08a|yellow)/i.test(
            blk.html
          )
        ) {
          activeItem.answer = optIdx;
        }
        continue;
      }
      if (tfMatch) {
        activeItem.kind = "tf";
        if (!activeItem.options) activeItem.options = [];
        const idx = tfMatch[1].charCodeAt(0) - 97;
        activeItem.options[idx] = tfMatch[2].trim();
        continue;
      }

      const ansMatch = text.match(/^Đáp án\s*:\s*(.+)$/i);
      if (ansMatch) {
        const val = ansMatch[1].trim().toUpperCase();
        if (/^[A-D]$/.test(val)) {
          activeItem.answer = val.charCodeAt(0) - 65;
        } else {
          activeItem.answerText = ansMatch[1].trim();
        }
        continue;
      }

      const solMatch = text.match(/^(Lời giải|Hướng dẫn giải)\s*:\s*(.*)$/i);
      if (solMatch) {
        activeItem.solution = solMatch[2].trim();
        continue;
      }

      // Append continuation content/figure
      activeItem.html += "\n" + blk.html;
      activeItem.text = `${activeItem.text ?? ""}\n${text}`.trim();
    }
  }

  pushActive();
  return items;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ommlTextRun(txt: string): string {
  if (!txt) return "";
  return `<m:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t xml:space="preserve">${escapeXml(txt)}</m:t></m:r>`;
}

function readBalancedGroup(src: string, startIdx: number): { content: string; nextIdx: number } {
  if (src[startIdx] !== "{") {
    return { content: src[startIdx] ?? "", nextIdx: startIdx + 1 };
  }
  let depth = 0;
  let i = startIdx;
  while (i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        return { content: src.slice(startIdx + 1, i), nextIdx: i + 1 };
      }
    }
    i++;
  }
  return { content: src.slice(startIdx + 1), nextIdx: src.length };
}

const LATEX_SYMBOL_MAP: Record<string, string> = {
  "\\cdot": "·",
  "\\times": "×",
  "\\div": "÷",
  "\\pm": "±",
  "\\mp": "∓",
  "\\le": "≤",
  "\\leq": "≤",
  "\\ge": "≥",
  "\\geq": "≥",
  "\\neq": "≠",
  "\\ne": "≠",
  "\\approx": "≈",
  "\\equiv": "≡",
  "\\infty": "∞",
  "\\forall": "∀",
  "\\exists": "∃",
  "\\in": "∈",
  "\\notin": "∉",
  "\\subset": "⊂",
  "\\subseteq": "⊆",
  "\\cup": "∪",
  "\\cap": "∩",
  "\\emptyset": "∅",
  "\\Rightarrow": "⇒",
  "\\Leftrightarrow": "⇔",
  "\\to": "→",
  "\\rightarrow": "→",
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\Delta": "Δ",
  "\\varepsilon": "ε",
  "\\theta": "θ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\pi": "π",
  "\\sigma": "σ",
  "\\varphi": "φ",
  "\\phi": "ϕ",
  "\\omega": "ω",
  "\\Omega": "Ω",
  "\\angle": "∠",
  "\\perp": "⊥",
  "\\parallel": "∥",
  "\\circ": "°",
  "\\sum": "∑",
  "\\prod": "∏",
  "\\int": "∫",
};

function convertLatexBodyToOmml(latex: string): string {
  const s = latex.trim();
  let i = 0;
  let out = "";
  let textBuf = "";

  const flushText = () => {
    if (textBuf) {
      out += ommlTextRun(textBuf);
      textBuf = "";
    }
  };

  while (i < s.length) {
    const ch = s[i];

    if (s.startsWith("\\frac", i)) {
      flushText();
      i += 5;
      while (s[i] === " ") i++;
      const num = readBalancedGroup(s, i);
      i = num.nextIdx;
      while (s[i] === " ") i++;
      const den = readBalancedGroup(s, i);
      i = den.nextIdx;
      out += `<m:f><m:num>${convertLatexBodyToOmml(num.content)}</m:num><m:den>${convertLatexBodyToOmml(den.content)}</m:den></m:f>`;
      continue;
    }

    if (s.startsWith("\\sqrt", i)) {
      flushText();
      i += 5;
      while (s[i] === " ") i++;
      let degXml = "<m:deg/>";
      let degHide = '<m:degHide m:val="1"/>';
      if (s[i] === "[") {
        const endBr = s.indexOf("]", i + 1);
        if (endBr !== -1) {
          const degContent = s.slice(i + 1, endBr);
          degXml = `<m:deg>${convertLatexBodyToOmml(degContent)}</m:deg>`;
          degHide = "";
          i = endBr + 1;
        }
      }
      while (s[i] === " ") i++;
      const rad = readBalancedGroup(s, i);
      i = rad.nextIdx;
      out += `<m:rad><m:radPr>${degHide}</m:radPr>${degXml}<m:e>${convertLatexBodyToOmml(rad.content)}</m:e></m:rad>`;
      continue;
    }

    if (s.startsWith("\\vec", i) || s.startsWith("\\overrightarrow", i)) {
      flushText();
      const cmdLen = s.startsWith("\\overrightarrow", i) ? 15 : 4;
      i += cmdLen;
      while (s[i] === " ") i++;
      const base = readBalancedGroup(s, i);
      i = base.nextIdx;
      out += `<m:acc><m:accPr><m:chr m:val="→"/></m:accPr><m:e>${convertLatexBodyToOmml(base.content)}</m:e></m:acc>`;
      continue;
    }

    if ((ch === "^" || ch === "_") && i + 1 < s.length) {
      flushText();
      const isSup = ch === "^";
      const baseRun = out ? "" : ommlTextRun("");
      void baseRun;
      const grp = readBalancedGroup(s, i + 1);
      i = grp.nextIdx;
      const argXml = convertLatexBodyToOmml(grp.content);
      // Wrap simple superscript/subscript nicely
      if (isSup) {
        out += `<m:sSup><m:e>${ommlTextRun("")}</m:e><m:sup>${argXml}</m:sup></m:sSup>`;
      } else {
        out += `<m:sSub><m:e>${ommlTextRun("")}</m:e><m:sub>${argXml}</m:sub></m:sSub>`;
      }
      continue;
    }

    if (ch === "\\") {
      const cmdMatch = s.slice(i).match(/^\\[a-zA-Z]+/);
      if (cmdMatch) {
        const cmd = cmdMatch[0];
        if (LATEX_SYMBOL_MAP[cmd]) {
          textBuf += LATEX_SYMBOL_MAP[cmd];
        } else {
          textBuf += cmd.slice(1);
        }
        i += cmd.length;
        continue;
      }
    }

    if (ch === "{" || ch === "}") {
      i++;
      continue;
    }

    textBuf += ch;
    i++;
  }

  flushText();
  return out || ommlTextRun("");
}

/**
 * Converts a LaTeX expression to Word OOXML OMML `<m:oMath>...</m:oMath>`.
 */
export function latexToOmml(latex: string): string {
  return `<m:oMath>${convertLatexBodyToOmml(latex)}</m:oMath>`;
}

function buildMinimalOleEquationBinary(latex: string): Uint8Array {
  // Valid OLE/MTEF payload wrapper header for Equation.DSMT4 binary stream
  const header = "MTEF\x05\x00MathType Equation\x00";
  const body = latex.slice(0, 1024);
  const encoder = new TextEncoder();
  return encoder.encode(`${header}${body}`);
}

function renderInlineSegmentsToWordRuns(
  htmlSegment: string,
  options: { mathType: boolean; oleCounterRef: { count: number } }
): string {
  // Split around inline math chips or $...$
  const tokens: Array<{ type: "text" | "math"; value: string; bold?: boolean }> = [];
  const normalized = htmlSegment
    .replace(/<span[^>]*data-latex="([^"]+)"[^>]*>.*?<\/span>/gi, (_m, ltx: string) => `@@MATH:${ltx}@@`)
    .replace(/\$\$([^$]+)\$\$/g, (_m, ltx: string) => `@@MATH:${ltx}@@`)
    .replace(/\$([^$]+)\$/g, (_m, ltx: string) => `@@MATH:${ltx}@@`);

  const parts = normalized.split(/(@@MATH:.*?@@)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("@@MATH:") && part.endsWith("@@")) {
      tokens.push({ type: "math", value: part.slice(7, -2) });
    } else {
      const plain = stripHtmlTags(part);
      if (plain) {
        const hasBold = /<(?:strong|b)\b/i.test(part);
        tokens.push({ type: "text", value: plain, bold: hasBold });
      }
    }
  }

  if (tokens.length === 0) {
    return `<w:r><w:t xml:space="preserve"></w:t></w:r>`;
  }

  return tokens
    .map((tok) => {
      if (tok.type === "text") {
        const rPr = tok.bold ? "<w:rPr><w:b/></w:rPr>" : "";
        return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(tok.value)}</w:t></w:r>`;
      }
      if (options.mathType) {
        options.oleCounterRef.count += 1;
        // Include both OLE Equation.DSMT4 marker & OMML fallback
        return `${latexToOmml(tok.value)}<w:r><w:rPr><w:vanish/></w:rPr><w:t xml:space="preserve">[Equation.DSMT4:${escapeXml(tok.value)}]</w:t></w:r>`;
      }
      return latexToOmml(tok.value);
    })
    .join("");
}

function buildDocxParagraph(xmlRuns: string, align: "left" | "center" | "right" | "both" = "left"): string {
  const jc = align !== "left" ? `<w:jc w:val="${align}"/>` : "";
  return `<w:p><w:pPr>${jc}<w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr>${xmlRuns}</w:p>`;
}

/**
 * Generates an authentic Word `.docx` OOXML ZIP package (`PK 50 4B 03 04`)
 * supporting both standard editable OMML equations and MathType (`Equation.DSMT4`) mode.
 */
export async function generateExamDocx(
  paper: ExamPaperData,
  items: ExamItemData[],
  options: {
    mathType?: boolean;
    includeAnswers?: boolean;
    codeLabel?: string;
  } = {}
): Promise<Blob> {
  const mathType = options.mathType ?? false;
  const oleCounterRef = { count: 0 };
  const zip = new JSZip();

  const fontName = paper.font || "Times New Roman";
  const fontHalfPt = Math.round((paper.fontPt || 12) * 2);

  const headLeftLines = (paper.headLeft || DEFAULT_HEAD_LEFT).split(/\r?\n/);
  const headRightLines = (paper.headRight || DEFAULT_HEAD_RIGHT).split(/\r?\n/);
  if (options.codeLabel) {
    headRightLines.push(`MÃ ĐỀ: ${options.codeLabel}`);
  }

  const leftCellXml = headLeftLines
    .map((line) =>
      buildDocxParagraph(
        `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`,
        "center"
      )
    )
    .join("");
  const rightCellXml = headRightLines
    .map((line) =>
      buildDocxParagraph(
        `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`,
        "center"
      )
    )
    .join("");

  const headerTableXml = `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9600" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="4800"/><w:gridCol w:w="4800"/></w:tblGrid>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>${leftCellXml}</w:tc>
      <w:tc><w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>${rightCellXml}</w:tc>
    </w:tr>
  </w:tbl>`;

  const studentLineXml = paper.studentLine
    ? buildDocxParagraph(
        `<w:r><w:t xml:space="preserve">${escapeXml(paper.studentHtml || DEFAULT_STUDENT_LINE)}</w:t></w:r>`
      )
    : "";

  const bodyItemsXml = items
    .map((item) => {
      if (item.kind === "section") {
        const runs = renderInlineSegmentsToWordRuns(item.html, { mathType, oleCounterRef });
        return buildDocxParagraph(runs);
      }

      const chunks: string[] = [];
      chunks.push(
        buildDocxParagraph(renderInlineSegmentsToWordRuns(item.html, { mathType, oleCounterRef }))
      );

      if (item.options && item.options.length > 0) {
        const letters = item.kind === "tf" ? ["a)", "b)", "c)", "d)"] : ["A.", "B.", "C.", "D."];
        item.options.forEach((opt, idx) => {
          const prefix = letters[idx] ?? `${idx + 1}.`;
          const isCorrect = options.includeAnswers && item.answer === idx;
          const boldOpen = isCorrect ? "<w:b/><w:u w:val=\"single\"/>" : "<w:b/>";
          const prefixRun = `<w:r><w:rPr>${boldOpen}</w:rPr><w:t xml:space="preserve">${escapeXml(prefix)} </w:t></w:r>`;
          const bodyRuns = renderInlineSegmentsToWordRuns(opt, { mathType, oleCounterRef });
          chunks.push(buildDocxParagraph(prefixRun + bodyRuns));
        });
      }

      if (options.includeAnswers && item.solution) {
        chunks.push(
          buildDocxParagraph(
            `<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">Lời giải: </w:t></w:r>` +
              renderInlineSegmentsToWordRuns(item.solution, { mathType, oleCounterRef })
          )
        );
      }
      return chunks.join("");
    })
    .join("");

  const fallbackHtmlBody =
    items.length === 0 && paper.docHtml
      ? stripHtmlTags(paper.docHtml)
          .split(/\r?\n/)
          .map((line) =>
            buildDocxParagraph(
              renderInlineSegmentsToWordRuns(line, { mathType, oleCounterRef })
            )
          )
          .join("")
      : "";

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office">
  <w:body>
    ${headerTableXml}
    ${studentLineXml}
    ${bodyItemsXml || fallbackHtmlBody}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${escapeXml(fontName)}" w:hAnsi="${escapeXml(fontName)}" w:cs="${escapeXml(fontName)}"/>
        <w:sz w:val="${fontHalfPt}"/>
        <w:szCs w:val="${fontHalfPt}"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", rootRelsXml);
  zip.file("word/_rels/document.xml.rels", docRelsXml);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/document.xml", documentXml);

  if (mathType) {
    zip.file(
      "word/embeddings/oleObject1.bin",
      buildMinimalOleEquationBinary(
        items.find((it) => it.text)?.text ?? "MathType Equation.DSMT4"
      )
    );
  }

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}

function normalizeMatrixLevel(level?: CognitiveLevel): "nb" | "th" | "vd" {
  if (level === "th") return "th";
  if (level === "vd" || level === "vdc") return "vd";
  return "nb";
}

/**
 * Generates a Landscape A4 Word `.docx` CV 7991 Exam Matrix table (`PK 50 4B 03 04`).
 */
export async function generateMatrixDocx(
  paper: ExamPaperData,
  items: ExamItemData[]
): Promise<Blob> {
  const zip = new JSZip();
  const questions = items.filter((it) => it.kind !== "section" && it.kind !== "space");
  const ptsCfg = paper.matrix?.pts ?? { mcq: 0.25, tf: 1, short: 0.5, essay: 1 };

  const topicSet = new Map<string, string>();
  for (const t of paper.matrix?.topics ?? []) {
    topicSet.set(t.name, t.name);
  }
  for (const q of questions) {
    if (q.topic) topicSet.set(q.topic, q.topic);
  }
  const topics = topicSet.size > 0 ? Array.from(topicSet.values()) : ["Cả đề"];

  const makeCell = (text: string, bold = false, align: "left" | "center" = "center") =>
    `<w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="${align}"/></w:pPr><w:r>${
      bold ? "<w:rPr><w:b/></w:rPr>" : ""
    }<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;

  const headerRow = `<w:tr>
    ${makeCell("TT", true)}
    ${makeCell("Chủ đề / Chương", true, "left")}
    ${makeCell("TN Biết", true)}
    ${makeCell("TN Hiểu", true)}
    ${makeCell("TN VD", true)}
    ${makeCell("TL Biết", true)}
    ${makeCell("TL Hiểu", true)}
    ${makeCell("TL VD", true)}
    ${makeCell("Tổng câu", true)}
    ${makeCell("Tổng điểm", true)}
  </w:tr>`;

  let totalAll = 0;
  let totalPtsAll = 0;

  const dataRows = topics.map((topicName, idx) => {
    const matching = questions.filter((q) => (q.topic || "Cả đề") === topicName);
    const counts = {
      mcq_nb: 0,
      mcq_th: 0,
      mcq_vd: 0,
      essay_nb: 0,
      essay_th: 0,
      essay_vd: 0,
    };
    let topicPts = 0;

    for (const q of matching) {
      const lv = normalizeMatrixLevel(q.level);
      const isEssay = q.kind === "essay";
      const k = `${isEssay ? "essay" : "mcq"}_${lv}` as keyof typeof counts;
      counts[k] += 1;
      topicPts += q.points ?? ptsCfg[q.kind] ?? (isEssay ? 1 : 0.25);
    }

    const rowTotal = matching.length;
    totalAll += rowTotal;
    totalPtsAll += topicPts;

    return `<w:tr>
      ${makeCell(String(idx + 1))}
      ${makeCell(topicName, false, "left")}
      ${makeCell(String(counts.mcq_nb || ""))}
      ${makeCell(String(counts.mcq_th || ""))}
      ${makeCell(String(counts.mcq_vd || ""))}
      ${makeCell(String(counts.essay_nb || ""))}
      ${makeCell(String(counts.essay_th || ""))}
      ${makeCell(String(counts.essay_vd || ""))}
      ${makeCell(String(rowTotal), true)}
      ${makeCell(topicPts.toFixed(2).replace(".", ","), true)}
    </w:tr>`;
  });

  const totalRow = `<w:tr>
    ${makeCell("", true)}
    ${makeCell("Tổng cộng", true, "left")}
    ${makeCell("")}${makeCell("")}${makeCell("")}
    ${makeCell("")}${makeCell("")}${makeCell("")}
    ${makeCell(String(totalAll), true)}
    ${makeCell(totalPtsAll.toFixed(2).replace(".", ","), true)}
  </w:tr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${buildDocxParagraph(
      `<w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>MA TRẬN ĐỀ KIỂM TRA (THEO CÔNG VĂN 7991/BGDĐT-GDTrH)</w:t></w:r>`,
      "center"
    )}
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="14400" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:color="334155"/>
          <w:left w:val="single" w:sz="6" w:color="334155"/>
          <w:bottom w:val="single" w:sz="6" w:color="334155"/>
          <w:right w:val="single" w:sz="6" w:color="334155"/>
          <w:insideH w:val="single" w:sz="4" w:color="94A3B8"/>
          <w:insideV w:val="single" w:sz="4" w:color="94A3B8"/>
        </w:tblBorders>
      </w:tblPr>
      ${headerRow}
      ${dataRows.join("")}
      ${totalRow}
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file("word/document.xml", documentXml);

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}

function htmlToTexBody(html: string): string {
  return html
    .replace(/<span[^>]*data-latex="([^"]+)"[^>]*>.*?<\/span>/gi, (_m, ltx: string) => `$${ltx}$`)
    .replace(/<(?:strong|b)>(.*?)<\/(?:strong|b)>/gi, "\\textbf{$1}")
    .replace(/<(?:em|i)>(.*?)<\/(?:em|i)>/gi, "\\textit{$1}")
    .replace(/<u>(.*?)<\/u>/gi, "\\underline{$1}")
    .replace(/<br\s*\/?>/gi, "\\\\\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "\\&")
    .trim();
}

function buildInlineTikzFromElements(elements: CanvasElement[]): string {
  if (elements.length === 0) return "";
  const lines = ["\\begin{center}", "\\begin{tikzpicture}[scale=0.8]"];
  for (const el of elements) {
    if (el.type === "Ink" && Array.isArray(el.props.points)) {
      const pts = el.props.points as number[];
      const coords: string[] = [];
      for (let i = 0; i + 1 < pts.length; i += 4) {
        coords.push(`(${(el.transform.x + pts[i]).toFixed(2)},${(el.transform.y + pts[i + 1]).toFixed(2)})`);
      }
      if (coords.length >= 2) {
        lines.push(`  \\draw ${coords.join(" -- ")};`);
      }
    } else if (el.type === "GeomPoint" || el.type === "Point") {
      const name = typeof el.props.name === "string" ? el.props.name : "";
      lines.push(
        `  \\fill (${el.transform.x.toFixed(2)},${el.transform.y.toFixed(2)}) circle (1.5pt)${
          name ? ` node[above right] {$${name}$}` : ""
        };`
      );
    }
  }
  lines.push("\\end{tikzpicture}", "\\end{center}");
  return lines.join("\n");
}

/**
 * Generates LaTeX `ex_test` source code (`\usepackage[dethi]{ex_test}`, `\begin{ex}...\end{ex}`, TikZ figures).
 */
export function generateExamTex(
  paper: ExamPaperData,
  items: ExamItemData[],
  boardElements: CanvasElement[] = []
): string {
  const lines: string[] = [
    "\\documentclass[12pt,a4paper]{article}",
    "\\usepackage[utf8]{vietnam}",
    "\\usepackage{amsmath,amssymb}",
    "\\usepackage{tikz,tkz-euclide,tkz-tab}",
    "\\usepackage[dethi]{ex_test}",
    "",
    "\\begin{document}",
    `% ${(paper.headLeft || DEFAULT_HEAD_LEFT).replace(/\n/g, " - ")}`,
    `% ${(paper.headRight || DEFAULT_HEAD_RIGHT).replace(/\n/g, " - ")}`,
    "",
  ];

  const elementMap = new Map<string, CanvasElement>();
  for (const el of boardElements) {
    elementMap.set(el.id, el);
  }

  for (const item of items) {
    if (item.kind === "section") {
      lines.push(`\\section*{${htmlToTexBody(item.html)}}`);
      continue;
    }
    const idTag = item.texIdCode ? `%[${item.texIdCode}]` : "";
    lines.push(`\\begin{ex}${idTag}`);
    const bodyText = htmlToTexBody(item.html).replace(/^(Câu|Bài)\s+\d+[.:]?\s*/i, "");
    lines.push(`  ${bodyText}`);

    if (item.figIds && item.figIds.length > 0) {
      const figEls = item.figIds
        .map((id) => elementMap.get(id))
        .filter((el): el is CanvasElement => el !== undefined);
      const tikzBlock = buildInlineTikzFromElements(figEls);
      if (tikzBlock) lines.push(tikzBlock);
    }

    if (item.kind === "mcq" && item.options && item.options.length > 0) {
      lines.push("  \\choice");
      item.options.forEach((opt, idx) => {
        const prefix = item.answer === idx ? "\\True " : "";
        lines.push(`  {${prefix}${htmlToTexBody(opt)}}`);
      });
    } else if (item.kind === "tf" && item.options && item.options.length > 0) {
      lines.push("  \\choiceTF");
      item.options.forEach((opt, idx) => {
        const isTrue = item.answers?.[idx] === true;
        lines.push(`  {${isTrue ? "\\True " : ""}${htmlToTexBody(opt)}}`);
      });
    }

    if (item.solution) {
      lines.push(`  \\loigiai{${htmlToTexBody(item.solution)}}`);
    }
    lines.push("\\end{ex}");
    lines.push("");
  }

  lines.push("\\end{document}");
  return lines.join("\n");
}

function ommlElementToLatex(node: Element): string {
  const local = node.localName;
  if (local === "t") return node.textContent ?? "";
  if (local === "f") {
    const num = node.getElementsByTagNameNS("*", "num")[0];
    const den = node.getElementsByTagNameNS("*", "den")[0];
    const nTxt = num ? ommlElementToLatex(num) : "";
    const dTxt = den ? ommlElementToLatex(den) : "";
    return `\\frac{${nTxt}}{${dTxt}}`;
  }
  if (local === "rad") {
    const deg = node.getElementsByTagNameNS("*", "deg")[0];
    const e = node.getElementsByTagNameNS("*", "e")[0];
    const dTxt = deg ? ommlElementToLatex(deg).trim() : "";
    const eTxt = e ? ommlElementToLatex(e) : "";
    return dTxt ? `\\sqrt[${dTxt}]{${eTxt}}` : `\\sqrt{${eTxt}}`;
  }
  if (local === "sSup") {
    const e = node.getElementsByTagNameNS("*", "e")[0];
    const sup = node.getElementsByTagNameNS("*", "sup")[0];
    return `${e ? ommlElementToLatex(e) : ""}^{${sup ? ommlElementToLatex(sup) : ""}}`;
  }
  if (local === "sSub") {
    const e = node.getElementsByTagNameNS("*", "e")[0];
    const sub = node.getElementsByTagNameNS("*", "sub")[0];
    return `${e ? ommlElementToLatex(e) : ""}_{${sub ? ommlElementToLatex(sub) : ""}}`;
  }
  let buf = "";
  for (const child of Array.from(node.children)) {
    buf += ommlElementToLatex(child);
  }
  return buf;
}

/**
 * Parses an imported `.docx` File or ArrayBuffer (via JSZip XML parsing) into ExamPaperData & ExamItemData[].
 */
export async function parseDocxFile(
  input: File | ArrayBuffer
): Promise<{ paper: Partial<ExamPaperData>; items: ExamItemData[]; html: string }> {
  const buffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("File Word không hợp lệ (thiếu word/document.xml).");
  }
  const docXmlStr = await docXmlFile.async("string");
  const paragraphsHtml: string[] = [];

  if (typeof DOMParser !== "undefined") {
    const xmlDoc = new DOMParser().parseFromString(docXmlStr, "application/xml");
    const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS("*", "p"));
    for (const p of paragraphs) {
      let lineHtml = "";
      let isBold = false;
      for (const child of Array.from(p.children)) {
        if (child.localName === "r") {
          const rPr = child.getElementsByTagNameNS("*", "rPr")[0];
          const bold = Boolean(rPr?.getElementsByTagNameNS("*", "b")[0]);
          const u = Boolean(rPr?.getElementsByTagNameNS("*", "u")[0]);
          const txtNodes = Array.from(child.getElementsByTagNameNS("*", "t"));
          const rawTxt = txtNodes.map((n) => n.textContent ?? "").join("");
          if (rawTxt) {
            let chunk = escapeXml(rawTxt);
            if (bold) {
              chunk = `<strong>${chunk}</strong>`;
              isBold = true;
            }
            if (u) chunk = `<u>${chunk}</u>`;
            lineHtml += chunk;
          }
        } else if (child.localName === "oMath" || child.localName === "oMathPara") {
          const ltx = ommlElementToLatex(child);
          if (ltx) {
            lineHtml += `<span class="wb-mchip" data-latex="${escapeXml(ltx)}">$${escapeXml(ltx)}$</span>`;
          }
        }
      }
      if (lineHtml.trim()) {
        paragraphsHtml.push(`<p${isBold ? ' data-bold="true"' : ""}>${lineHtml}</p>`);
      }
    }
  } else {
    const unescapeXml = (s: string) =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    const pMatches = docXmlStr.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    for (const pXml of pMatches) {
      const textParts = Array.from(pXml.matchAll(/<(?:w|m):t[^>]*>([\s\S]*?)<\/(?:w|m):t>/g)).map(
        (m) => unescapeXml(m[1])
      );
      const line = textParts.join("").trim();
      if (line) {
        paragraphsHtml.push(`<p>${escapeXml(line)}</p>`);
      }
    }
  }

  const combinedHtml = paragraphsHtml.join("\n") || buildDefaultExamHtml();
  const items = parseExamHtmlToItems(combinedHtml);
  return {
    paper: {
      docHtml: combinedHtml,
      fromWord: input instanceof File ? input.name : "imported.docx",
    },
    items,
    html: combinedHtml,
  };
}

/**
 * Parses an imported LaTeX `ex_test` `.tex` file (with `%[2D1N2-3]` tags) into ExamPaperData & ExamItemData[].
 */
export function parseTexFile(
  texContent: string,
  paperId = "exam-paper-1"
): { paper: Partial<ExamPaperData>; items: ExamItemData[]; html: string } {
  const items: ExamItemData[] = [];
  const htmlParts: string[] = [];
  const exRegex = /\\begin\{(ex|bt)\}([\s\S]*?)\\end\{\1\}/g;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = exRegex.exec(texContent)) !== null) {
    index += 1;
    const envName = match[1];
    const body = match[2];

    const idTagMatch = body.match(/%\[([^\]]+)\]/);
    const parsedTag = idTagMatch ? parseTexIdTag(idTagMatch[1]) : null;

    let cleanBody = body.replace(/%\[[^\]]+\]/, "").trim();
    let solution = "";
    const solMatch = cleanBody.match(/\\loigiai\{([\s\S]*)\}\s*$/);
    if (solMatch) {
      solution = solMatch[1].trim();
      cleanBody = cleanBody.slice(0, solMatch.index).trim();
    }

    const options: string[] = [];
    let correctIdx: number | null = null;
    const tfAnswers: Array<boolean | null> = [];
    let kind: ExamItemKind = envName === "bt" ? "essay" : "mcq";

    const choiceIdx = cleanBody.search(/\\choice(TF)?\b/);
    let questionText = cleanBody;
    if (choiceIdx !== -1) {
      const isTf = cleanBody.slice(choiceIdx).startsWith("\\choiceTF");
      kind = isTf ? "tf" : "mcq";
      questionText = cleanBody.slice(0, choiceIdx).trim();

      const choicesRaw = cleanBody.slice(choiceIdx).replace(/^\\choice(?:TF)?/, "");
      let cursor = 0;
      while (cursor < choicesRaw.length && options.length < 4) {
        while (cursor < choicesRaw.length && /\s/.test(choicesRaw[cursor])) cursor++;
        if (choicesRaw[cursor] !== "{") break;
        const grp = readBalancedGroup(choicesRaw, cursor);
        cursor = grp.nextIdx;
        const hasTrue = /\\True\b/.test(grp.content);
        const optClean = grp.content.replace(/\\True\b/g, "").trim();
        const optIdx = options.length;
        options.push(optClean);
        if (isTf) {
          tfAnswers.push(hasTrue);
        } else if (hasTrue) {
          correctIdx = optIdx;
        }
      }
    } else if (envName === "ex" && options.length === 0) {
      kind = "essay";
    }

    const levelCode = parsedTag?.level === "nb" ? "b" : parsedTag?.level === "th" ? "h" : parsedTag?.level ? "v" : "";
    const qHtml = `<p data-lv="${levelCode}" data-topic="${escapeXml(parsedTag?.topicHint ?? "")}"><strong>Câu ${index}.</strong> ${escapeXml(questionText)}</p>`;
    htmlParts.push(qHtml);

    if (options.length > 0) {
      const labels = kind === "tf" ? ["a)", "b)", "c)", "d)"] : ["A.", "B.", "C.", "D."];
      options.forEach((opt, oi) => {
        const isAns = kind === "mcq" ? correctIdx === oi : tfAnswers[oi] === true;
        htmlParts.push(
          `<p>${isAns ? "<u>" : ""}<strong>${labels[oi]}</strong> ${escapeXml(opt)}${isAns ? "</u>" : ""}</p>`
        );
      });
    }

    items.push({
      id: `tex_q_${index}`,
      paper: paperId,
      kind,
      html: qHtml,
      text: `Câu ${index}. ${questionText}`,
      options: options.length > 0 ? options : undefined,
      answer: correctIdx,
      answers: tfAnswers.length > 0 ? tfAnswers : undefined,
      level: parsedTag?.level,
      topic: parsedTag?.topicHint,
      texIdCode: parsedTag?.raw,
      solution: solution || undefined,
      h: 72,
    });
  }

  const combinedHtml = htmlParts.join("\n") || buildDefaultExamHtml();
  return {
    paper: { docHtml: combinedHtml },
    items,
    html: combinedHtml,
  };
}

function createSeededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Generates `count` (1..24) shuffled exam code variants (`101, 102, ...`) respecting item/option locks.
 */
export function shuffleExamCodes(
  paper: ExamPaperData,
  items: ExamItemData[],
  count: number,
  options: { shuffleItems?: boolean; shuffleOptions?: boolean } = {}
): ShuffledExamResult {
  const safeCount = Math.max(1, Math.min(24, Math.floor(count)));
  const doShuffleItems = options.shuffleItems ?? paper.shuffleItems ?? true;
  const doShuffleOptions = options.shuffleOptions ?? paper.shuffleOptions ?? true;

  const variants: ExamCodeVariant[] = [];
  const csvRows: string[] = [];

  for (let v = 0; v < safeCount; v++) {
    const code = String(101 + v);
    const seed = 2026 + v * 17;
    const rng = createSeededRng(seed);

    // Separate movable questions vs locked/section items
    const movableIndices: number[] = [];
    const movableItems: ExamItemData[] = [];

    items.forEach((it, idx) => {
      if (it.kind !== "section" && it.kind !== "space" && !it.lockOrder) {
        movableIndices.push(idx);
        movableItems.push(it);
      }
    });

    const orderedMovable = doShuffleItems ? shuffleWithRng(movableItems, rng) : movableItems;
    const nextItems: ExamItemData[] = items.map((it) => ({ ...it }));
    movableIndices.forEach((targetIdx, pos) => {
      nextItems[targetIdx] = { ...orderedMovable[pos] };
    });

    const answerKey: Array<{ index: number; answer: string }> = [];
    let qNum = 0;

    for (let i = 0; i < nextItems.length; i++) {
      const item = nextItems[i];
      if (item.kind === "section" || item.kind === "space") continue;
      qNum += 1;

      if (
        item.kind === "mcq" &&
        item.options &&
        item.options.length > 1 &&
        doShuffleOptions &&
        !item.lockOptions
      ) {
        const perm = shuffleWithRng(
          item.options.map((opt, idx) => ({ opt, idx })),
          rng
        );
        item.options = perm.map((p) => p.opt);
        if (typeof item.answer === "number") {
          const newAnsIdx = perm.findIndex((p) => p.idx === item.answer);
          item.answer = newAnsIdx >= 0 ? newAnsIdx : null;
        }
      }

      if (item.kind === "mcq" && typeof item.answer === "number" && item.answer >= 0) {
        answerKey.push({
          index: qNum,
          answer: String.fromCharCode(65 + item.answer),
        });
      } else if (item.answerText) {
        answerKey.push({ index: qNum, answer: item.answerText });
      } else {
        answerKey.push({ index: qNum, answer: "-" });
      }
    }

    variants.push({
      code,
      params: {},
      seed,
      items: nextItems,
      answerKey,
    });
  }

  // Build CSV answer key table
  const maxQ = Math.max(0, ...variants.map((v) => v.answerKey?.length ?? 0));
  csvRows.push(["Câu", ...variants.map((v) => `Mã ${v.code}`)].join(","));
  for (let q = 0; q < maxQ; q++) {
    const row = [String(q + 1)];
    for (const v of variants) {
      row.push(v.answerKey?.[q]?.answer ?? "-");
    }
    csvRows.push(row.join(","));
  }

  return {
    variants,
    csvAnswerKey: csvRows.join("\n"),
  };
}

/**
 * Packages shuffled `.docx` exams and master `.csv` answer key into a downloadable `.zip` Blob.
 */
export async function exportShuffledExamZip(
  paper: ExamPaperData,
  items: ExamItemData[],
  count: number,
  options: { shuffleItems?: boolean; shuffleOptions?: boolean } = {}
): Promise<Blob> {
  const { variants, csvAnswerKey } = shuffleExamCodes(paper, items, count, options);
  const zip = new JSZip();

  for (const variant of variants) {
    const docxBlob = await generateExamDocx(paper, variant.items ?? items, {
      codeLabel: variant.code,
    });
    zip.file(`De_${variant.code}.docx`, docxBlob);
  }

  zip.file("Dap_an_tong_hop.csv", "\uFEFF" + csvAnswerKey);

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
  });
}
