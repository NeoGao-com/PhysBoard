import type Tesseract from "tesseract.js";
import type { PdfTextLine } from "./pdf-import";
import {
  detectLayoutWithOnnx,
  NOISE_LAYOUT_LABELS,
  TEXT_BLOCK_LABELS,
  VISUAL_ATTACHMENT_LABELS,
  type LayoutRegion,
} from "./doclayout-onnx";

export interface DetectedQuestionBox {
  id: string;
  label: string;
  /** Normalized 0..1 coordinates relative to image width & height */
  x: number;
  y: number;
  w: number;
  h: number;
  selected: boolean;
  source: "ai" | "text" | "ocr" | "visual";
}

interface NormBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Primary question header matcher ("Câu 1", "Cdu 2", "Câu hỏi 3", "Ví dụ 4", "VD 5", "Question 6")
const HEADER_QUESTION_RE =
  /^(?:(?:(?:c|ch|g)[aâăáàảãạấầẩẫậ]|cd)[uưúùủũụứừửữựn](?:\s*h[oỏóòõọ]i)?|c[aâăáàảãạấầẩẫậ]u(?:\s*h[oỏóòõọ]i)?|v[iíìỉĩị]\s*d[uụủũúù]|vd|question|problem|ex)\s*([0-9Il|]{1,3})\s*(?:[:.)\-–—]|$|\s)/i;
// Secondary header matcher ("Bài 1", "Bài tập 2") — used ONLY when no "Câu/VD" exists on page & not a doc footer/title
const HEADER_EXERCISE_RE = /^(?:b[aàáảãạ]i(?:\s*t[aâậ]p)?)\s*([0-9Il|]{1,3})\s*(?:[:.)\-–—]|$|\s)/i;
const HEADER_NUMBERED_RE = /^(\d{1,2})\s*[.)]\s+\S/;
const CHOICE_LINE_RE = /^[A-D]\s*[.),]\s*\S/;
const LAST_CHOICE_RE = /(?:^|\s)[CD]\s*[.),]\s*\S/;
const MULTI_CHOICE_INLINE_RE = /(?:^|\s)[A-D]\s*[.)].*\s+[A-D]\s*[.)]/;
const FOOTER_NOISE_RE =
  /(?:page\s*\d+\s*(?:of|\/)\s*\d+|trang\s*\d+(?:\s*(?:\/|trên)\s*\d+)?|https?:\/\/\S+|[\w.-]+\.(?:com|vn|net|org|edu)|thuvienhoclieu|taisachonthi|toanmath|phi[eế]u\s*c[aâ]u\s*h[oỏ]i|^\s*\d{1,3}\s*$)/i;
const SECTION_BANNER_RE =
  /^(?:ph[aầ]n\s*(?:[ivx]+|\d+)|tr[aắ]c\s*nghi[eệ]m|t[uự]\s*lu[aậ]n|đ[eề]\s*(?:thi|ki[eể]m\s*tra|[oô]n\s*t[aậ]p)|s[oở]\s*gi[aá]o\s*d[uụ]c|m[aã]\s*đ[eề]|h[oọ]\s*v[aà]\s*t[eê]n|l[oớ]p\s*[:.]|b[aà]i\s*\d+\s*[:.\-–—]\s*[A-ZÀ-Ỹ\s]{6,}|v[aậ]t\s*l[yý]\s*\d+|to[aá]n\s*\d+|h[oó]a\s*h[oọ]c\s*\d+)/i;

interface InkAnalysis {
  width: number;
  height: number;
  inkThreshold: number;
  rowInk: Float32Array;
  luma: Uint8Array;
}

function analyzeImageInk(imgEl: HTMLImageElement): InkAnalysis | null {
  const natW = imgEl.naturalWidth || imgEl.width;
  const natH = imgEl.naturalHeight || imgEl.height;
  if (!natW || !natH) return null;

  const targetW = Math.min(720, natW);
  const scale = targetW / natW;
  const w = Math.max(1, Math.round(targetW));
  const h = Math.max(1, Math.round(natH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(imgEl, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const luma = new Uint8Array(w * h);
  const hist = new Uint32Array(256);

  const xStart = Math.floor(w * 0.03);
  const xEnd = Math.ceil(w * 0.97);
  const yStart = Math.floor(h * 0.03);
  const yEnd = Math.ceil(h * 0.97);
  let sampleCount = 0;

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      const pIdx = (rowOff + x) * 4;
      const lum = Math.round(
        0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2]
      );
      luma[rowOff + x] = lum;
      if (x >= xStart && x < xEnd && y >= yStart && y < yEnd) {
        hist[lum]++;
        sampleCount++;
      }
    }
  }

  // Estimate dominant paper background brightness at ~72nd percentile (handles gray/cream scans)
  let bgLuma = 250;
  if (sampleCount > 0) {
    const targetRank = Math.floor(sampleCount * 0.72);
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= targetRank) {
        bgLuma = v;
        break;
      }
    }
  }

  // Ink must be noticeably darker than paper background (filters gray paper & faint watermarks)
  const inkThreshold = Math.min(224, Math.max(92, bgLuma - 36));
  const rowInk = new Float32Array(h);
  const scanSpan = Math.max(1, xEnd - xStart);

  for (let y = 0; y < h; y++) {
    let dark = 0;
    const rowOff = y * w;
    for (let x = xStart; x < xEnd; x++) {
      if (luma[rowOff + x] < inkThreshold) {
        dark++;
      }
    }
    rowInk[y] = dark / scanSpan;
  }

  return { width: w, height: h, inkThreshold, rowInk, luma };
}

/**
 * Produces a crisp black-on-white binarized canvas for Tesseract OCR so gray paper
 * backgrounds and light diagonal watermarks disappear before recognition.
 */
function buildOcrCanvas(
  imgEl: HTMLImageElement,
  analysis: InkAnalysis | null
): HTMLCanvasElement | null {
  const natW = imgEl.naturalWidth || imgEl.width;
  const natH = imgEl.naturalHeight || imgEl.height;
  if (!natW || !natH) return null;

  const targetW = Math.min(1320, Math.max(800, natW));
  const scale = targetW / natW;
  const w = Math.max(1, Math.round(targetW));
  const h = Math.max(1, Math.round(natH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imgEl, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const thresh = analysis?.inkThreshold ?? 190;
  const softCut = Math.min(242, thresh + 24);

  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (lum <= thresh) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 255;
    } else if (lum >= softCut) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = 255;
    } else {
      const gray = Math.round(((lum - thresh) / Math.max(1, softCut - thresh)) * 255);
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Finds the exact horizontal blank valley between upperNormY and lowerNormY using the pixel
 * row-ink histogram. Prevents adjacent question boxes from ever clipping the previous
 * question's A./B./C./D. answer row.
 */
function findValleySplitY(
  analysis: InkAnalysis | null,
  upperNormY: number,
  lowerNormY: number
): number {
  const safeUpper = Math.max(0, Math.min(1, upperNormY));
  const safeLower = Math.max(safeUpper, Math.min(1, lowerNormY));
  if (!analysis || safeLower - safeUpper <= 0.002) {
    return (safeUpper + safeLower) * 0.5;
  }

  const { height: h, rowInk } = analysis;
  const yMin = Math.max(0, Math.min(h - 1, Math.floor(safeUpper * h)));
  const yMax = Math.max(yMin, Math.min(h - 1, Math.ceil(safeLower * h)));
  if (yMax <= yMin) return (safeUpper + safeLower) * 0.5;

  // Locate the widest contiguous blank band (rowInk <= 0.004)
  let bestStart = -1;
  let bestEnd = -1;
  let curStart = -1;

  for (let y = yMin; y <= yMax; y++) {
    if (rowInk[y] <= 0.004) {
      if (curStart === -1) curStart = y;
    } else if (curStart !== -1) {
      const len = y - 1 - curStart;
      if (bestStart === -1 || len > bestEnd - bestStart) {
        bestStart = curStart;
        bestEnd = y - 1;
      }
      curStart = -1;
    }
  }
  if (curStart !== -1) {
    const len = yMax - curStart;
    if (bestStart === -1 || len > bestEnd - bestStart) {
      bestStart = curStart;
      bestEnd = yMax;
    }
  }

  if (bestStart !== -1 && bestEnd >= bestStart) {
    return ((bestStart + bestEnd) * 0.5 + 0.5) / h;
  }

  // No purely blank row found (very tight spacing or faint scan noise): pick global minimum ink
  let minVal = Infinity;
  let minY = Math.round((yMin + yMax) * 0.5);
  for (let y = yMin; y <= yMax; y++) {
    if (rowInk[y] < minVal) {
      minVal = rowInk[y];
      minY = y;
    }
  }
  return (minY + 0.5) / h;
}

function trimBoxToInk(
  analysis: InkAnalysis,
  normBox: NormBox,
  clampBounds?: { minNormY?: number; maxNormY?: number }
): NormBox {
  const { width: w, height: h, luma, inkThreshold } = analysis;
  const minBoundY = clampBounds?.minNormY ?? 0;
  const maxBoundY = clampBounds?.maxNormY ?? 1;

  const clampedTop = Math.max(minBoundY, normBox.y);
  const clampedBottom = Math.min(maxBoundY, normBox.y + normBox.h);

  const x0 = Math.max(Math.floor(w * 0.015), Math.floor(normBox.x * w));
  const y0 = Math.max(0, Math.min(h - 1, Math.ceil(clampedTop * h)));
  const x1 = Math.min(Math.ceil(w * 0.985) - 1, Math.ceil((normBox.x + normBox.w) * w));
  const y1 = Math.max(y0, Math.min(h - 1, Math.floor(clampedBottom * h)));

  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;

  for (let y = y0; y <= y1; y++) {
    const rowOff = y * w;
    let darkInRow = 0;
    let rowMinX = w;
    let rowMaxX = -1;
    for (let x = x0; x <= x1; x++) {
      if (luma[rowOff + x] < inkThreshold) {
        darkInRow++;
        if (x < rowMinX) rowMinX = x;
        if (x > rowMaxX) rowMaxX = x;
      }
    }
    if (darkInRow >= 2) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (rowMinX < minX) minX = rowMinX;
      if (rowMaxX > maxX) maxX = rowMaxX;
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: normBox.x,
      y: clampedTop,
      w: normBox.w,
      h: Math.max(0.02, clampedBottom - clampedTop),
    };
  }

  const padX = Math.max(5, Math.round(w * 0.014));
  const padY = Math.max(4, Math.round(h * 0.008));

  const nx0 = Math.max(0, (minX - padX) / w);
  const ny0 = Math.max(minBoundY, (minY - padY) / h);
  const nx1 = Math.min(1, (maxX + padX) / w);
  const ny1 = Math.min(maxBoundY, (maxY + padY) / h);

  return {
    x: nx0,
    y: ny0,
    w: Math.max(0.05, nx1 - nx0),
    h: Math.max(0.02, ny1 - ny0),
  };
}

function normalizeQuestionNumberToken(rawNum: string): string {
  return rawNum.replace(/[Il|]/g, "1");
}

function isInsideNoiseRegion(line: PdfTextLine, noiseRegions: LayoutRegion[]): boolean {
  const cx = (line.normLeft + line.normRight) * 0.5;
  const cy = (line.normTop + line.normBottom) * 0.5;
  for (const r of noiseRegions) {
    if (cx >= r.x - 0.02 && cx <= r.x + r.w + 0.02 && cy >= r.y - 0.008 && cy <= r.y + r.h + 0.008) {
      return true;
    }
  }
  return false;
}

function findRegionForLine(line: PdfTextLine, regions: LayoutRegion[]): LayoutRegion | null {
  const cy = (line.normTop + line.normBottom) * 0.5;
  const cx = (line.normLeft + line.normRight) * 0.5;
  let best: LayoutRegion | null = null;
  let bestScore = -1;
  for (const r of regions) {
    if (
      TEXT_BLOCK_LABELS.has(r.label) &&
      cy >= r.y - 0.008 &&
      cy <= r.y + r.h + 0.008 &&
      cx >= r.x - 0.03 &&
      cx <= r.x + r.w + 0.03
    ) {
      if (r.score > bestScore) {
        bestScore = r.score;
        best = r;
      }
    }
  }
  return best;
}

interface AnchorCandidate {
  lineIdx: number;
  qNum: number | null;
  normTop: number;
  explicit: boolean;
}

function collectQuestionAnchors(
  usable: PdfTextLine[],
  contentRegions: LayoutRegion[]
): AnchorCandidate[] {
  const sortedLefts = usable.map((l) => l.normLeft).sort((a, b) => a - b);
  const primaryLeft = sortedLefts[Math.floor(sortedLefts.length * 0.15)] ?? 0.05;

  const anchorByLine = new Map<number, AnchorCandidate>();

  // Pass 1: Primary explicit question headers ("Câu 1", "Cdu 2", "Ví dụ 3", ...)
  for (let i = 0; i < usable.length; i++) {
    const line = usable[i];
    const cleanText = line.text.trim();
    if (SECTION_BANNER_RE.test(cleanText)) continue;
    const explicitMatch = HEADER_QUESTION_RE.exec(cleanText);
    if (explicitMatch) {
      const qNum = parseInt(normalizeQuestionNumberToken(explicitMatch[1]), 10);
      if (!Number.isNaN(qNum) && qNum >= 1) {
        anchorByLine.set(i, {
          lineIdx: i,
          qNum,
          normTop: line.normTop,
          explicit: true,
        });
      }
    }
  }

  // Pass 1b: Exercise headers ("Bài 1", "Bài tập 2") ONLY if no primary "Câu/VD" exists on page
  // and not in document header/footer strips or ALL-CAPS lesson banners
  if (anchorByLine.size === 0) {
    for (let i = 0; i < usable.length; i++) {
      const line = usable[i];
      const cleanText = line.text.trim();
      if (line.normTop > 0.9 || line.normBottom < 0.08) continue;
      if (SECTION_BANNER_RE.test(cleanText)) continue;
      if (FOOTER_NOISE_RE.test(cleanText)) continue;
      const exMatch = HEADER_EXERCISE_RE.exec(cleanText);
      if (exMatch) {
        const qNum = parseInt(normalizeQuestionNumberToken(exMatch[1]), 10);
        if (!Number.isNaN(qNum) && qNum >= 1) {
          anchorByLine.set(i, {
            lineIdx: i,
            qNum,
            normTop: line.normTop,
            explicit: true,
          });
        }
      }
    }
  }

  // Pass 2: If no explicit "Câu/Bài/VD" headers exist on this page, look for clean left-margin "1. ", "2. "
  if (anchorByLine.size === 0) {
    for (let i = 0; i < usable.length; i++) {
      const line = usable[i];
      const cleanText = line.text.trim();
      if (CHOICE_LINE_RE.test(cleanText)) continue;
      if (SECTION_BANNER_RE.test(cleanText)) continue;

      const numMatch = HEADER_NUMBERED_RE.exec(cleanText);
      if (numMatch && Math.abs(line.normLeft - primaryLeft) <= 0.065) {
        const qNum = parseInt(numMatch[1], 10);
        if (!Number.isNaN(qNum) && qNum >= 1 && qNum <= 60) {
          anchorByLine.set(i, {
            lineIdx: i,
            qNum,
            normTop: line.normTop,
            explicit: true,
          });
        }
      }
    }
  }

  // Pass 3: Missed-Header Recovery via A/B/C/D answer-end + PP-DocLayout-L block transitions
  // Prevents merging 2 questions into 1 when OCR drops or corrupts a "Câu X" header
  let sawChoiceEnd = false;
  let lastChoiceRegion: LayoutRegion | null = null;
  let lastChoiceBottom = 0;

  for (let i = 0; i < usable.length; i++) {
    if (anchorByLine.has(i)) {
      sawChoiceEnd = false;
      lastChoiceRegion = null;
      continue;
    }

    const line = usable[i];
    const cleanText = line.text.trim();
    const isChoiceLine =
      CHOICE_LINE_RE.test(cleanText) || MULTI_CHOICE_INLINE_RE.test(cleanText);
    const hasChoiceEnd =
      LAST_CHOICE_RE.test(cleanText) ||
      (MULTI_CHOICE_INLINE_RE.test(cleanText) && /\b[C-D]\s*[.)]/.test(cleanText));

    if (hasChoiceEnd) {
      sawChoiceEnd = true;
      lastChoiceRegion = findRegionForLine(line, contentRegions);
      lastChoiceBottom = line.normBottom;
      continue;
    }

    if (sawChoiceEnd && !isChoiceLine) {
      if (
        line.normTop > 0.91 ||
        SECTION_BANNER_RE.test(cleanText) ||
        FOOTER_NOISE_RE.test(cleanText)
      ) {
        continue;
      }
      const nearLeftMargin = line.normLeft <= primaryLeft + 0.085;
      const curRegion = findRegionForLine(line, contentRegions);
      const enteredNewAiBlock =
        curRegion !== null && lastChoiceRegion !== null && curRegion !== lastChoiceRegion;
      const verticalGap = line.normTop - Math.max(usable[i - 1].normBottom, lastChoiceBottom);
      const substantialText = cleanText.length >= 6;

      if (nearLeftMargin && substantialText && (enteredNewAiBlock || verticalGap >= 0.005)) {
        anchorByLine.set(i, {
          lineIdx: i,
          qNum: null,
          normTop: line.normTop,
          explicit: false,
        });
        sawChoiceEnd = false;
        lastChoiceRegion = null;
      }
    }
  }

  // Pass 4: If essay/short-answer page still has an isolated PP-DocLayout-L paragraph_title below
  // the first question header, split ONLY if it isn't a section/document banner
  const anchors = Array.from(anchorByLine.values()).sort((a, b) => a.lineIdx - b.lineIdx);
  const firstAnchorLineIdx = anchors.length > 0 ? anchors[0].lineIdx : 0;
  if (anchors.length > 0 && contentRegions.length > 0) {
    for (const region of contentRegions) {
      if (region.label !== "paragraph_title") continue;
      if (region.x > primaryLeft + 0.08 || region.h < 0.015) continue;
      if (region.y > 0.91) continue;
      const hasAnchorInside = anchors.some(
        (a) => a.normTop >= region.y - 0.015 && a.normTop <= region.y + region.h + 0.015
      );
      if (hasAnchorInside) continue;
      const firstLineIdx = usable.findIndex(
        (l) =>
          l.normTop >= region.y - 0.006 &&
          l.normBottom <= region.y + region.h + 0.01 &&
          !CHOICE_LINE_RE.test(l.text.trim())
      );
      if (firstLineIdx > firstAnchorLineIdx && !anchorByLine.has(firstLineIdx)) {
        const lineText = usable[firstLineIdx].text.trim();
        const isAllCaps =
          lineText.length >= 6 &&
          lineText === lineText.toUpperCase() &&
          /[A-ZÀ-Ỹ]{4,}/.test(lineText);
        if (
          !isAllCaps &&
          !SECTION_BANNER_RE.test(lineText) &&
          !FOOTER_NOISE_RE.test(lineText)
        ) {
          anchorByLine.set(firstLineIdx, {
            lineIdx: firstLineIdx,
            qNum: null,
            normTop: usable[firstLineIdx].normTop,
            explicit: false,
          });
        }
      }
    }
  }

  return Array.from(anchorByLine.values()).sort((a, b) => a.lineIdx - b.lineIdx);
}

function assignQuestionLabels(anchors: AnchorCandidate[]): string[] {
  const labels: string[] = new Array(anchors.length);
  for (let i = 0; i < anchors.length; i++) {
    const q = anchors[i].qNum;
    if (q !== null) {
      labels[i] = `Câu ${q}`;
      continue;
    }

    // Check if an explicit question follows so we can interpolate exact number (e.g. Câu 1 -> [Câu 2] -> Câu 3)
    let prevExplicitIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (anchors[j].qNum !== null) {
        prevExplicitIdx = j;
        break;
      }
    }
    let nextExplicitIdx = -1;
    for (let j = i + 1; j < anchors.length; j++) {
      if (anchors[j].qNum !== null) {
        nextExplicitIdx = j;
        break;
      }
    }

    if (prevExplicitIdx !== -1 && nextExplicitIdx !== -1) {
      const prevNum = anchors[prevExplicitIdx].qNum!;
      const nextNum = anchors[nextExplicitIdx].qNum!;
      if (nextNum - prevNum === nextExplicitIdx - prevExplicitIdx) {
        labels[i] = `Câu ${prevNum + (i - prevExplicitIdx)}`;
        continue;
      }
    }

    if (prevExplicitIdx !== -1) {
      labels[i] = `Câu ${anchors[prevExplicitIdx].qNum! + (i - prevExplicitIdx)}`;
    } else if (nextExplicitIdx !== -1 && anchors[nextExplicitIdx].qNum! > nextExplicitIdx - i) {
      labels[i] = `Câu ${anchors[nextExplicitIdx].qNum! - (nextExplicitIdx - i)}`;
    } else {
      labels[i] = `Câu ${i + 1}`;
    }
  }
  return labels;
}

function buildBoxesFromLines(
  lines: PdfTextLine[],
  analysis: InkAnalysis | null,
  layoutRegions: LayoutRegion[],
  source: DetectedQuestionBox["source"]
): DetectedQuestionBox[] {
  const noiseRegions = layoutRegions.filter((r) => NOISE_LAYOUT_LABELS.has(r.label));
  const contentRegions = layoutRegions.filter((r) => !NOISE_LAYOUT_LABELS.has(r.label));
  const visualAttachments = contentRegions.filter((r) => VISUAL_ATTACHMENT_LABELS.has(r.label));

  // Detect header/footer Y-bands: if any line in the top/bottom edge matches FOOTER_NOISE_RE
  // or HEADER_EXERCISE_RE (e.g. "Page 3 of 5" on right + "Bài 3:..." on left), drop the entire row
  const edgeNoiseBands: Array<{ top: number; bottom: number; isFooter: boolean }> = [];
  for (const l of lines) {
    const trimmed = l.text.trim();
    if (!trimmed) continue;
    const isTopEdge = l.normBottom < 0.08;
    const isBottomEdge = l.normTop > 0.90;
    if (!isTopEdge && !isBottomEdge) continue;
    if (
      FOOTER_NOISE_RE.test(trimmed) ||
      HEADER_EXERCISE_RE.test(trimmed) ||
      SECTION_BANNER_RE.test(trimmed)
    ) {
      edgeNoiseBands.push({
        top: l.normTop - 0.012,
        bottom: l.normBottom + 0.012,
        isFooter: isBottomEdge,
      });
    }
  }
  const inEdgeNoiseBand = (l: PdfTextLine) => {
    const cy = (l.normTop + l.normBottom) * 0.5;
    return edgeNoiseBands.some((b) => cy >= b.top && cy <= b.bottom);
  };

  const edgeFooterTops = lines
    .filter((l) => l.normTop > 0.90 && inEdgeNoiseBand(l))
    .map((l) => l.normTop - 0.004);
  const edgeHeaderBottoms = lines
    .filter((l) => l.normBottom < 0.08 && inEdgeNoiseBand(l))
    .map((l) => l.normBottom + 0.004);

  const usable = lines.filter((l) => {
    const trimmed = l.text.trim();
    if (!trimmed) return false;
    const inExtremeEdge = l.normBottom < 0.08 || l.normTop > 0.90;
    if (inExtremeEdge && inEdgeNoiseBand(l)) return false;
    if (noiseRegions.length > 0 && isInsideNoiseRegion(l, noiseRegions)) return false;
    return true;
  });
  if (usable.length === 0) return [];

  const anchors = collectQuestionAnchors(usable, contentRegions);
  if (anchors.length === 0) return [];
  const labels = assignQuestionLabels(anchors);

  const maxLineBottom = Math.max(...usable.map((l) => l.normBottom));
  const firstMinNormY = Math.max(
    0,
    ...edgeHeaderBottoms.filter((y) => y < anchors[0].normTop),
    ...noiseRegions
      .filter((r) => r.y + r.h < anchors[0].normTop)
      .map((r) => r.y + r.h + 0.002)
  );
  const lastAnchorTop = anchors[anchors.length - 1].normTop;
  const lastFooterTop = Math.min(
    1,
    ...edgeFooterTops.filter((y) => y > lastAnchorTop + 0.015),
    ...noiseRegions
      .filter((r) => r.y > lastAnchorTop + 0.02)
      .map((r) => r.y - 0.002)
  );
  const lastVisualBottom = Math.max(
    maxLineBottom,
    ...visualAttachments
      .filter((v) => v.y >= lastAnchorTop - 0.005 && v.y + v.h < lastFooterTop - 0.004)
      .map((v) => v.y + v.h)
  );
  const lastContentBottom = Math.min(
    lastFooterTop,
    Math.min(0.985, lastVisualBottom + 0.014)
  );

  // Compute non-overlapping minimum-ink valley split points between every adjacent question pair
  const splitBoundaries: number[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const curStart = anchors[i].lineIdx;
    const nextStart = anchors[i + 1].lineIdx;
    const curHeaderTop = anchors[i].normTop;
    const nextHeaderTop = anchors[i + 1].normTop;

    let prevContentBottom = usable[curStart].normBottom;
    let lastPrevMid = (usable[curStart].normTop + usable[curStart].normBottom) * 0.5;
    let bannerTopBeforeNext: number | null = null;
    for (let li = curStart; li < nextStart; li++) {
      if (li > curStart && SECTION_BANNER_RE.test(usable[li].text.trim())) {
        bannerTopBeforeNext = Math.min(bannerTopBeforeNext ?? 1, usable[li].normTop);
        break;
      }
      if (usable[li].normBottom > prevContentBottom) {
        prevContentBottom = usable[li].normBottom;
        lastPrevMid = (usable[li].normTop + usable[li].normBottom) * 0.5;
      }
    }

    const effectiveNextTop = bannerTopBeforeNext ?? nextHeaderTop;

    // Include any AI-detected diagram/formula/table strictly belonging to question i below its text
    for (const vis of visualAttachments) {
      const visBottom = vis.y + vis.h;
      if (
        vis.y >= curHeaderTop - 0.005 &&
        visBottom <= effectiveNextTop - 0.002 &&
        visBottom > prevContentBottom
      ) {
        prevContentBottom = visBottom;
        lastPrevMid = Math.max(lastPrevMid, visBottom - 0.006);
      }
    }

    const nextMid =
      bannerTopBeforeNext !== null
        ? bannerTopBeforeNext - 0.002
        : (usable[nextStart].normTop + usable[nextStart].normBottom) * 0.5;
    const safeLowerBound = Math.max(curHeaderTop + 0.012, nextMid - 0.003);
    const searchUpper = Math.min(
      safeLowerBound - 0.001,
      Math.max(lastPrevMid + 0.002, prevContentBottom - 0.008)
    );
    const searchLower = Math.max(
      searchUpper + 0.002,
      Math.min(safeLowerBound, effectiveNextTop + 0.005)
    );
    const valleyY = findValleySplitY(analysis, searchUpper, searchLower);
    splitBoundaries.push(valleyY);
  }

  const boxes: DetectedQuestionBox[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const minNormY = i === 0 ? firstMinNormY : splitBoundaries[i - 1];
    const maxNormY = i === anchors.length - 1 ? lastContentBottom : splitBoundaries[i];

    const rawTop = Math.max(minNormY, anchors[i].normTop - 0.012);
    const rawBottom = Math.min(maxNormY, maxNormY);

    let rawX0 = 0.015;
    let rawX1 = 0.985;
    // Expand horizontal span if an AI attachment overlaps vertically inside [minNormY, maxNormY]
    for (const vis of visualAttachments) {
      const cy = vis.y + vis.h * 0.5;
      if (cy >= minNormY && cy <= maxNormY) {
        rawX0 = Math.min(rawX0, Math.max(0.01, vis.x - 0.01));
        rawX1 = Math.max(rawX1, Math.min(0.99, vis.x + vis.w + 0.01));
      }
    }

    const rawBox: NormBox = {
      x: rawX0,
      y: rawTop,
      w: Math.max(0.1, rawX1 - rawX0),
      h: Math.max(0.022, rawBottom - rawTop),
    };

    const trimmed = analysis
      ? trimBoxToInk(analysis, rawBox, { minNormY, maxNormY })
      : rawBox;
    if (trimmed.h < 0.018 || trimmed.w < 0.08) continue;

    boxes.push({
      id: `q-${source}-${i + 1}-${Math.round(trimmed.y * 1000)}`,
      label: labels[i],
      x: trimmed.x,
      y: trimmed.y,
      w: trimmed.w,
      h: trimmed.h,
      selected: true,
      source,
    });
  }

  return boxes;
}

function buildBoxesFromLayoutRegionsOnly(
  layoutRegions: LayoutRegion[],
  analysis: InkAnalysis | null
): DetectedQuestionBox[] {
  const contentRegions = layoutRegions
    .filter((r) => !NOISE_LAYOUT_LABELS.has(r.label))
    .sort((a, b) => a.y - b.y);
  if (contentRegions.length === 0) return [];

  // Group horizontally aligned or closely stacked layout blocks separated by clear gaps
  const groups: LayoutRegion[][] = [[contentRegions[0]]];
  for (let i = 1; i < contentRegions.length; i++) {
    const r = contentRegions[i];
    const curGroup = groups[groups.length - 1];
    const groupBottom = Math.max(...curGroup.map((g) => g.y + g.h));
    const isAttachment = VISUAL_ATTACHMENT_LABELS.has(r.label);
    const gap = r.y - groupBottom;
    if (gap <= 0.012 || (isAttachment && gap <= 0.028)) {
      curGroup.push(r);
    } else {
      groups.push([r]);
    }
  }

  const splitBoundaries: number[] = [];
  for (let i = 0; i < groups.length - 1; i++) {
    const b1 = Math.max(...groups[i].map((g) => g.y + g.h));
    const t2 = Math.min(...groups[i + 1].map((g) => g.y));
    splitBoundaries.push(findValleySplitY(analysis, b1 - 0.002, t2 + 0.002));
  }

  const results: DetectedQuestionBox[] = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const minNormY = i === 0 ? 0 : splitBoundaries[i - 1];
    const maxNormY = i === groups.length - 1 ? 1 : splitBoundaries[i];

    const rawBox: NormBox = {
      x: Math.max(0.01, Math.min(...g.map((r) => r.x)) - 0.01),
      y: Math.max(minNormY, Math.min(...g.map((r) => r.y)) - 0.006),
      w: 0,
      h: 0,
    };
    const rawX1 = Math.min(0.99, Math.max(...g.map((r) => r.x + r.w)) + 0.01);
    const rawY1 = Math.min(maxNormY, Math.max(...g.map((r) => r.y + r.h)) + 0.006);
    rawBox.w = Math.max(0.1, rawX1 - rawBox.x);
    rawBox.h = Math.max(0.022, rawY1 - rawBox.y);

    const trimmed = analysis
      ? trimBoxToInk(analysis, rawBox, { minNormY, maxNormY })
      : rawBox;
    if (trimmed.h < 0.02 || trimmed.w < 0.08) continue;

    results.push({
      id: `q-ai-${i + 1}-${Math.round(trimmed.y * 1000)}`,
      label: `Câu ${results.length + 1}`,
      x: trimmed.x,
      y: trimmed.y,
      w: trimmed.w,
      h: trimmed.h,
      selected: true,
      source: "ai",
    });
  }

  return results;
}

function detectVisuallyFromInk(analysis: InkAnalysis): DetectedQuestionBox[] {
  const { height: h, rowInk } = analysis;

  interface Band {
    y0: number;
    y1: number;
  }
  const rawBands: Band[] = [];
  let inBand = false;
  let bandStart = 0;
  let blankStreak = 0;
  const maxIntraLineBlank = Math.max(1, Math.round(h * 0.004));

  for (let y = 0; y < h; y++) {
    const hasInk = rowInk[y] > 0.006;
    if (hasInk) {
      if (!inBand) {
        inBand = true;
        bandStart = y;
      }
      blankStreak = 0;
    } else if (inBand) {
      blankStreak++;
      if (blankStreak > maxIntraLineBlank) {
        rawBands.push({ y0: bandStart, y1: y - blankStreak });
        inBand = false;
      }
    }
  }
  if (inBand) {
    rawBands.push({ y0: bandStart, y1: h - 1 });
  }

  if (rawBands.length === 0) return [];

  const bands = [...rawBands];
  while (bands.length >= 2) {
    const first = bands[0];
    const second = bands[1];
    const firstH = (first.y1 - first.y0) / h;
    const gap = (second.y0 - first.y1) / h;
    if (first.y1 / h < 0.05 && firstH < 0.025 && gap > 0.02) {
      bands.shift();
    } else {
      break;
    }
  }
  while (bands.length >= 2) {
    const last = bands[bands.length - 1];
    const prev = bands[bands.length - 2];
    const lastH = (last.y1 - last.y0) / h;
    const gap = (last.y0 - prev.y1) / h;
    if (last.y0 / h > 0.92 && lastH < 0.035 && gap > 0.025) {
      bands.pop();
    } else {
      break;
    }
  }

  if (bands.length === 0) return [];
  if (bands.length === 1) {
    const single = trimBoxToInk(analysis, {
      x: 0.015,
      y: Math.max(0, bands[0].y0 / h - 0.01),
      w: 0.97,
      h: Math.min(1, (bands[0].y1 - bands[0].y0) / h + 0.02),
    });
    return single.h >= 0.022 && single.w >= 0.08
      ? [
          {
            id: "q-vis-1",
            label: "Câu 1",
            ...single,
            selected: true,
            source: "visual",
          },
        ]
      : [];
  }

  const gaps: number[] = [];
  for (let i = 1; i < bands.length; i++) {
    gaps.push(Math.max(0, (bands[i].y0 - bands[i - 1].y1) / h));
  }
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length * 0.45)] ?? 0.008;
  const maxGap = sortedGaps[sortedGaps.length - 1] ?? 0.02;

  const splitThreshold = Math.max(
    0.014,
    Math.min(0.052, Math.max(medianGap * 1.6, maxGap * 0.42))
  );

  const blocks: Band[] = [{ ...bands[0] }];
  for (let i = 1; i < bands.length; i++) {
    const gap = (bands[i].y0 - bands[i - 1].y1) / h;
    if (gap >= splitThreshold) {
      blocks.push({ ...bands[i] });
    } else {
      blocks[blocks.length - 1].y1 = bands[i].y1;
    }
  }

  const merged: Band[] = [];
  for (const blk of blocks) {
    const normH = (blk.y1 - blk.y0) / h;
    const prev = merged[merged.length - 1];
    if (prev && normH < 0.032 && (blk.y0 - prev.y1) / h < 0.06) {
      prev.y1 = blk.y1;
    } else {
      merged.push({ ...blk });
    }
  }

  const results: DetectedQuestionBox[] = [];
  for (let i = 0; i < merged.length; i++) {
    const prevMid =
      i === 0 ? 0 : (merged[i - 1].y1 + merged[i].y0) * 0.5 / h;
    const nextMid =
      i === merged.length - 1 ? 1 : (merged[i].y1 + merged[i + 1].y0) * 0.5 / h;
    const ny0 = Math.max(prevMid, merged[i].y0 / h - 0.008);
    const ny1 = Math.min(nextMid, merged[i].y1 / h + 0.008);
    const trimmed = trimBoxToInk(
      analysis,
      {
        x: 0.015,
        y: ny0,
        w: 0.97,
        h: Math.max(0.02, ny1 - ny0),
      },
      { minNormY: prevMid, maxNormY: nextMid }
    );
    if (trimmed.h < 0.022 || trimmed.w < 0.08) continue;

    results.push({
      id: `q-vis-${results.length + 1}-${Math.round(trimmed.y * 1000)}`,
      label: `Câu ${results.length + 1}`,
      x: trimmed.x,
      y: trimmed.y,
      w: trimmed.w,
      h: trimmed.h,
      selected: true,
      source: "visual",
    });
  }

  return results;
}

// Cached Tesseract OCR worker + active progress callback ref
let cachedOcrWorkerPromise: Promise<Tesseract.Worker> | null = null;
let activeProgressCb: ((status: string, progress: number) => void) | null = null;

function resolvePublicAssetUrl(subpath: string): string {
  if (typeof window === "undefined") return subpath;
  try {
    return new URL(subpath, window.location.href).href.replace(/\/$/, "");
  } catch {
    return subpath;
  }
}

async function getOcrWorker(): Promise<Tesseract.Worker> {
  if (cachedOcrWorkerPromise) {
    return cachedOcrWorkerPromise;
  }

  cachedOcrWorkerPromise = (async () => {
    const mod = await import("tesseract.js");
    const workerPath = resolvePublicAssetUrl("./tesseract/worker.min.js");
    const corePath = resolvePublicAssetUrl("./tesseract");
    const langPath = resolvePublicAssetUrl("./tesseract/lang");

    const worker = await mod.createWorker("vie", mod.OEM.LSTM_ONLY, {
      workerPath,
      corePath,
      langPath,
      workerBlobURL: false,
      gzip: true,
      logger: (m) => {
        activeProgressCb?.(m.status, typeof m.progress === "number" ? m.progress : 0);
      },
    });
    await worker.setParameters({
      tessedit_pageseg_mode: mod.PSM.AUTO,
    });
    return worker;
  })().catch((err) => {
    cachedOcrWorkerPromise = null;
    throw err;
  });

  return cachedOcrWorkerPromise;
}

async function extractOcrLines(
  imgEl: HTMLImageElement,
  analysis: InkAnalysis | null,
  onProgress?: (status: string, progress: number) => void
): Promise<PdfTextLine[]> {
  const ocrCanvas = buildOcrCanvas(imgEl, analysis);
  if (!ocrCanvas) return [];

  activeProgressCb = onProgress ?? null;
  try {
    const worker = await getOcrWorker();
    const res = await worker.recognize(ocrCanvas, {}, { blocks: true });
    const cw = Math.max(1, ocrCanvas.width);
    const ch = Math.max(1, ocrCanvas.height);

    const ocrLines: PdfTextLine[] = [];
    for (const block of res.data.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          const text = line.text.replace(/\s+/g, " ").trim();
          if (!text) continue;
          ocrLines.push({
            text,
            normLeft: Math.max(0, Math.min(1, line.bbox.x0 / cw)),
            normTop: Math.max(0, Math.min(1, line.bbox.y0 / ch)),
            normRight: Math.max(0, Math.min(1, line.bbox.x1 / cw)),
            normBottom: Math.max(0, Math.min(1, line.bbox.y1 / ch)),
          });
        }
      }
    }

    ocrLines.sort((a, b) => a.normTop - b.normTop || a.normLeft - b.normLeft);
    return ocrLines;
  } finally {
    activeProgressCb = null;
  }
}

export interface DetectQuestionsOptions {
  textLines?: PdfTextLine[];
  onProgress?: (status: string, progress: number) => void;
}

/**
 * Synchronous helper for digital text PDFs or fast visual fallback (includes valley cut protection).
 */
export function detectQuestionsOnPage(
  imgEl: HTMLImageElement,
  textLines?: PdfTextLine[]
): DetectedQuestionBox[] {
  const analysis = analyzeImageInk(imgEl);
  if (textLines && textLines.length >= 3) {
    const byText = buildBoxesFromLines(textLines, analysis, [], "text");
    if (byText.length > 0) return byText;
  }
  if (!analysis) return [];
  return detectVisuallyFromInk(analysis);
}

/**
 * Full Hybrid Offline AI Exam Question Detector:
 * 1. Offline ONNX Document Layout AI (PP-DocLayout-L INT8) removes headers/footers/page numbers
 *    and locates semantic text, formula, image, and table blocks.
 * 2. PDF native text layer or offline Tesseract.js Vietnamese OCR + fuzzy/post-choice recovery
 *    splits adjacent questions even when headers are corrupted or missed.
 * 3. Pixel-level Minimum-Ink Valley Cutter snaps every horizontal cut strictly inside blank
 *    paper gaps so adjacent A./B./C./D. answer lines never overlap.
 */
export async function detectQuestionsOnPageAsync(
  imgEl: HTMLImageElement,
  options: DetectQuestionsOptions = {}
): Promise<DetectedQuestionBox[]> {
  const analysis = analyzeImageInk(imgEl);
  const hasDigitalText = Boolean(options.textLines && options.textLines.length >= 3);

  // Step 1: Run 100% offline PP-DocLayout-L ONNX AI layout analysis in parallel or upfront
  let layoutRegions: LayoutRegion[] = [];
  try {
    layoutRegions = await detectLayoutWithOnnx(imgEl, options.onProgress);
  } catch {
    // Gracefully degrade if WebAssembly ONNX initialization fails in a restricted runtime
    layoutRegions = [];
  }

  const aiActive = layoutRegions.length > 0;

  // Step 2: Obtain text lines (native PDF text layer for digital PDFs, else offline Vietnamese OCR)
  let lines: PdfTextLine[] = hasDigitalText ? options.textLines! : [];
  if (!hasDigitalText) {
    try {
      lines = await extractOcrLines(imgEl, analysis, options.onProgress);
    } catch {
      lines = [];
    }
  }

  if (lines.length > 0) {
    const source: DetectedQuestionBox["source"] = aiActive
      ? "ai"
      : hasDigitalText
        ? "text"
        : "ocr";
    const byLines = buildBoxesFromLines(lines, analysis, layoutRegions, source);
    if (byLines.length > 0) {
      return byLines;
    }
  }

  // Step 3: Pure AI Layout grouping when OCR produced no recognizable question headers
  if (aiActive) {
    const byAiLayout = buildBoxesFromLayoutRegionsOnly(layoutRegions, analysis);
    if (byAiLayout.length > 0) {
      return byAiLayout;
    }
  }

  // Step 4: Adaptive Otsu visual layout projection fallback
  if (!analysis) return [];
  return detectVisuallyFromInk(analysis);
}

export interface PageDetectionWithContinuation {
  questions: DetectedQuestionBox[];
  leadingContinuation: DetectedQuestionBox | null;
}

function detectLeadingContinuation(
  lines: PdfTextLine[],
  analysis: InkAnalysis | null,
  layoutRegions: LayoutRegion[],
  firstQuestionTop: number | null,
  source: DetectedQuestionBox["source"]
): DetectedQuestionBox | null {
  const noiseRegions = layoutRegions.filter((r) => NOISE_LAYOUT_LABELS.has(r.label));
  const contentRegions = layoutRegions.filter((r) => !NOISE_LAYOUT_LABELS.has(r.label));
  const visualAttachments = contentRegions.filter((r) => VISUAL_ATTACHMENT_LABELS.has(r.label));

  const cutoffY = firstQuestionTop !== null ? firstQuestionTop - 0.005 : 0.90;
  const candidateLines: PdfTextLine[] = [];
  let minNoiseBottom = 0;

  for (const l of lines) {
    const trimmed = l.text.trim();
    if (!trimmed) continue;
    if (l.normTop >= cutoffY) break;

    const isNoise =
      ((l.normBottom < 0.085 || l.normTop > 0.90) &&
        (FOOTER_NOISE_RE.test(trimmed) || SECTION_BANNER_RE.test(trimmed))) ||
      (noiseRegions.length > 0 && isInsideNoiseRegion(l, noiseRegions)) ||
      SECTION_BANNER_RE.test(trimmed);

    if (isNoise) {
      if (l.normBottom < 0.16) {
        minNoiseBottom = Math.max(minNoiseBottom, l.normBottom + 0.002);
      }
      continue;
    }
    candidateLines.push(l);
  }

  for (const r of noiseRegions) {
    if (r.y + r.h < 0.16) {
      minNoiseBottom = Math.max(minNoiseBottom, r.y + r.h + 0.002);
    }
  }

  const candidateVisuals = visualAttachments.filter(
    (v) => v.y + v.h <= cutoffY + 0.002 && v.y >= minNoiseBottom - 0.01
  );

  // Also scan raw dark pixel rows between page header and first question so minimalist
  // vector physics diagrams (e.g. wire arrows, circular loops) without text are always included
  let inkMinContTop = Infinity;
  let inkMaxContBottom = -Infinity;
  let inkRowCount = 0;
  if (analysis && cutoffY > minNoiseBottom + 0.012) {
    const { height: h, rowInk } = analysis;
    const y0 = Math.max(0, Math.floor((minNoiseBottom + 0.002) * h));
    const y1 = Math.min(h - 1, Math.floor(cutoffY * h));
    for (let y = y0; y <= y1; y++) {
      if (rowInk[y] > 0.005) {
        inkRowCount++;
        const ny = y / h;
        if (ny < inkMinContTop) inkMinContTop = ny;
        if ((y + 1) / h > inkMaxContBottom) inkMaxContBottom = (y + 1) / h;
      }
    }
  }

  if (candidateLines.length === 0 && candidateVisuals.length === 0 && inkRowCount < 10) {
    return null;
  }

  const tops = [
    ...candidateLines.map((l) => l.normTop),
    ...candidateVisuals.map((v) => v.y),
    ...(inkRowCount >= 10 ? [inkMinContTop] : []),
  ];
  const bottoms = [
    ...candidateLines.map((l) => l.normBottom),
    ...candidateVisuals.map((v) => v.y + v.h),
    ...(inkRowCount >= 10 ? [inkMaxContBottom] : []),
  ];
  const minContTop = Math.min(...tops);
  const maxContBottom = Math.max(...bottoms);

  // If this page had no question headers at all, only treat top-of-page content as continuation
  if (firstQuestionTop === null && minContTop > 0.42) {
    return null;
  }

  const minNormY =
    minNoiseBottom > 0
      ? findValleySplitY(analysis, Math.max(0, minNoiseBottom - 0.004), minContTop + 0.002)
      : 0;
  const maxNormY =
    firstQuestionTop !== null
      ? findValleySplitY(analysis, maxContBottom - 0.004, firstQuestionTop + 0.002)
      : Math.min(0.985, maxContBottom + 0.015);

  let rawX0 = 0.015;
  let rawX1 = 0.985;
  for (const vis of candidateVisuals) {
    rawX0 = Math.min(rawX0, Math.max(0.01, vis.x - 0.01));
    rawX1 = Math.max(rawX1, Math.min(0.99, vis.x + vis.w + 0.01));
  }

  const rawBox: NormBox = {
    x: rawX0,
    y: Math.max(minNormY, minContTop - 0.01),
    w: Math.max(0.1, rawX1 - rawX0),
    h: Math.max(0.015, Math.min(maxNormY, maxContBottom + 0.01) - Math.max(minNormY, minContTop - 0.01)),
  };

  const trimmed = analysis ? trimBoxToInk(analysis, rawBox, { minNormY, maxNormY }) : rawBox;
  if (trimmed.h < 0.015 || trimmed.w < 0.08) return null;

  return {
    id: `q-cont-${Math.round(trimmed.y * 1000)}`,
    label: "Phần tiếp nối",
    x: trimmed.x,
    y: trimmed.y,
    w: trimmed.w,
    h: trimmed.h,
    selected: true,
    source,
  };
}

/**
 * Runs Hybrid AI + OCR question detection and ALSO extracts any orphan continuation
 * fragment sitting at the very top of the page above the first question header, so
 * multi-page exam scanners can stitch questions split across a page boundary.
 */
export async function detectQuestionsWithContinuationAsync(
  imgEl: HTMLImageElement,
  options: DetectQuestionsOptions = {}
): Promise<PageDetectionWithContinuation> {
  const analysis = analyzeImageInk(imgEl);
  const hasDigitalText = Boolean(options.textLines && options.textLines.length >= 3);

  let layoutRegions: LayoutRegion[] = [];
  try {
    layoutRegions = await detectLayoutWithOnnx(imgEl, options.onProgress);
  } catch {
    layoutRegions = [];
  }

  const aiActive = layoutRegions.length > 0;
  let lines: PdfTextLine[] = hasDigitalText ? options.textLines! : [];
  if (!hasDigitalText) {
    try {
      lines = await extractOcrLines(imgEl, analysis, options.onProgress);
    } catch {
      lines = [];
    }
  }

  if (lines.length > 0) {
    const source: DetectedQuestionBox["source"] = aiActive
      ? "ai"
      : hasDigitalText
        ? "text"
        : "ocr";
    const questions = buildBoxesFromLines(lines, analysis, layoutRegions, source);
    const firstQTop = questions.length > 0 ? questions[0].y : null;
    const leadingContinuation = detectLeadingContinuation(
      lines,
      analysis,
      layoutRegions,
      firstQTop,
      source
    );
    if (questions.length > 0 || leadingContinuation) {
      return { questions, leadingContinuation };
    }
  }

  if (aiActive) {
    const byAi = buildBoxesFromLayoutRegionsOnly(layoutRegions, analysis);
    if (byAi.length > 0) {
      return { questions: byAi, leadingContinuation: null };
    }
  }

  if (!analysis) return { questions: [], leadingContinuation: null };
  return { questions: detectVisuallyFromInk(analysis), leadingContinuation: null };
}

/**
 * Vertically stitches 2+ cropped image fragments (e.g., stem on page N + choices/diagram
 * on page N+1) into a single crisp PNG image before pinning to the whiteboard.
 */
export async function stitchDataUrlsVertically(
  parts: Array<{ dataUrl: string; widthPx: number; heightPx: number }>,
  gapPx = 10
): Promise<{ dataUrl: string; widthPx: number; heightPx: number }> {
  if (parts.length === 0) {
    throw new Error("Không có mảnh ảnh nào để ghép.");
  }
  if (parts.length === 1) {
    return { ...parts[0] };
  }

  const loaded = await Promise.all(
    parts.map(
      (part) =>
        new Promise<{ img: HTMLImageElement; w: number; h: number }>((resolve, reject) => {
          const im = new Image();
          im.onload = () =>
            resolve({
              img: im,
              w: Math.max(1, im.naturalWidth || part.widthPx),
              h: Math.max(1, im.naturalHeight || part.heightPx),
            });
          im.onerror = () => reject(new Error("Không thể nạp ảnh để ghép vắt trang."));
          im.src = part.dataUrl;
        })
    )
  );

  const widthPx = Math.max(...loaded.map((l) => l.w));
  const heightPx =
    loaded.reduce((acc, l) => acc + l.h, 0) + Math.max(0, loaded.length - 1) * gapPx;

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { ...parts[0] };
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);

  let y = 0;
  for (const item of loaded) {
    ctx.drawImage(item.img, 0, y, item.w, item.h);
    y += item.h + gapPx;
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthPx,
    heightPx,
  };
}
