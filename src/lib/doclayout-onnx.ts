export interface LayoutRegion {
  label: string;
  classId: number;
  score: number;
  /** Normalized 0..1 coordinates relative to source image dimensions */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Layout classes that represent page headers, footers, page numbers, stamps or margin notes */
export const NOISE_LAYOUT_LABELS = new Set<string>([
  "header",
  "footer",
  "number",
  "footnote",
  "header_image",
  "footer_image",
  "seal",
  "aside_text",
]);

/** Non-prose visual blocks (figures, geometry diagrams, tables, display formulas) attached to questions */
export const VISUAL_ATTACHMENT_LABELS = new Set<string>([
  "image",
  "table",
  "formula",
  "chart",
  "figure_title",
  "table_title",
  "chart_title",
  "algorithm",
]);

/** Primary text-bearing content blocks detected by PP-DocLayout-L */
export const TEXT_BLOCK_LABELS = new Set<string>([
  "text",
  "paragraph_title",
  "abstract",
  "content",
  "reference",
  "doc_title",
]);

// Must match public/models/labels.json exact class index order (PP-DocLayout-L)
const PP_DOCLAYOUT_LABELS = [
  "paragraph_title",
  "image",
  "text",
  "number",
  "abstract",
  "content",
  "figure_title",
  "formula",
  "table",
  "table_title",
  "reference",
  "doc_title",
  "footnote",
  "header",
  "algorithm",
  "footer",
  "seal",
  "chart_title",
  "chart",
  "formula_number",
  "header_image",
  "footer_image",
  "aside_text",
] as const;

const MODEL_INPUT_SIZE = 640;

type OrtModule = typeof import("onnxruntime-web/wasm");
type OrtSession = import("onnxruntime-web/wasm").InferenceSession;

let cachedOrtPromise: Promise<OrtModule> | null = null;
let cachedSessionPromise: Promise<OrtSession> | null = null;

function resolveAssetHref(subpath: string, ensureTrailingSlash = false): string {
  if (typeof window === "undefined") return subpath;
  try {
    const url = new URL(subpath, window.location.href).href;
    if (ensureTrailingSlash) {
      return url.endsWith("/") ? url : `${url}/`;
    }
    return url.replace(/\/$/, "");
  } catch {
    return subpath;
  }
}

async function getOrt(): Promise<OrtModule> {
  if (!cachedOrtPromise) {
    cachedOrtPromise = import("onnxruntime-web/wasm").then((ort) => {
      ort.env.wasm.wasmPaths = resolveAssetHref("./onnx/", true);
      // Single-threaded WASM avoids COOP/COEP SharedArrayBuffer restrictions in static web & Android WebView
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
      return ort;
    });
  }
  return cachedOrtPromise;
}

async function getDocLayoutSession(
  onProgress?: (status: string, progress: number) => void
): Promise<{ ort: OrtModule; session: OrtSession }> {
  const ort = await getOrt();
  if (!cachedSessionPromise) {
    cachedSessionPromise = (async () => {
      onProgress?.("loading-ai-model", 0.15);
      const modelUrl = resolveAssetHref("./models/pp-doclayout-l.onnx");
      const resp = await fetch(modelUrl);
      if (!resp.ok) {
        throw new Error(`Không thể tải mô hình AI offline (${resp.status})`);
      }
      onProgress?.("loading-ai-model", 0.55);
      const modelBytes = new Uint8Array(await resp.arrayBuffer());
      onProgress?.("loading-ai-model", 0.75);
      const session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: ["wasm"],
      });
      onProgress?.("loading-ai-model", 1);
      return session;
    })().catch((err) => {
      cachedSessionPromise = null;
      throw err;
    });
  }
  const session = await cachedSessionPromise;
  return { ort, session };
}

function buildInputTensorData(imgEl: HTMLImageElement): Float32Array | null {
  const w = MODEL_INPUT_SIZE;
  const h = MODEL_INPUT_SIZE;
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

  const rgba = ctx.getImageData(0, 0, w, h).data;
  const planeSize = w * h;
  const chw = new Float32Array(3 * planeSize);
  const inv255 = 1 / 255;

  for (let i = 0; i < planeSize; i++) {
    const p = i * 4;
    chw[i] = rgba[p] * inv255;
    chw[planeSize + i] = rgba[p + 1] * inv255;
    chw[2 * planeSize + i] = rgba[p + 2] * inv255;
  }

  return chw;
}

function computeIoU(a: LayoutRegion, b: LayoutRegion): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;

  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);

  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const inter = (ix2 - ix1) * (iy2 - iy1);
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  return inter / Math.max(1e-6, areaA + areaB - inter);
}

function applyNms(regions: LayoutRegion[]): LayoutRegion[] {
  const sorted = [...regions].sort((a, b) => b.score - a.score);
  const kept: LayoutRegion[] = [];

  for (const cand of sorted) {
    let suppressed = false;
    for (const prev of kept) {
      const iou = computeIoU(cand, prev);
      // Drop duplicate same-class detections (>0.55 IoU) or identical cross-class boxes (>0.82 IoU)
      if ((cand.classId === prev.classId && iou > 0.55) || iou > 0.82) {
        suppressed = true;
        break;
      }
    }
    if (!suppressed) {
      kept.push(cand);
    }
  }

  return kept.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Runs 100% offline ONNX PP-DocLayout-L inference on the page image and returns
 * normalized layout regions (headers, footers, prose blocks, formulas, figures, tables).
 */
export async function detectLayoutWithOnnx(
  imgEl: HTMLImageElement,
  onProgress?: (status: string, progress: number) => void,
  scoreThreshold = 0.35
): Promise<LayoutRegion[]> {
  const inputData = buildInputTensorData(imgEl);
  if (!inputData) return [];

  const { ort, session } = await getDocLayoutSession(onProgress);
  onProgress?.("running-ai-layout", 0.5);

  const feeds: Record<string, import("onnxruntime-web/wasm").Tensor> = {};
  for (const name of session.inputNames) {
    if (name === "im_shape") {
      feeds[name] = new ort.Tensor(
        "float32",
        new Float32Array([MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]),
        [1, 2]
      );
    } else if (name === "image") {
      feeds[name] = new ort.Tensor("float32", inputData, [
        1,
        3,
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE,
      ]);
    } else if (name === "scale_factor") {
      // With scale_factor=[1,1], output x1,y1,x2,y2 are directly in 0..640 canvas coordinates
      feeds[name] = new ort.Tensor("float32", new Float32Array([1, 1]), [1, 2]);
    }
  }

  const outputs = await session.run(feeds);
  const boxTensor = outputs[session.outputNames[0]];
  if (!boxTensor || !boxTensor.data) return [];

  const countTensor = session.outputNames[1] ? outputs[session.outputNames[1]] : undefined;
  const declaredCount =
    countTensor && countTensor.data && countTensor.data.length > 0
      ? Number(countTensor.data[0])
      : Math.floor(boxTensor.data.length / 6);

  const raw = boxTensor.data as Float32Array | number[];
  const maxRows = Math.min(
    Math.floor(raw.length / 6),
    Number.isFinite(declaredCount) && declaredCount > 0 ? declaredCount : Math.floor(raw.length / 6)
  );

  const candidates: LayoutRegion[] = [];
  for (let i = 0; i < maxRows; i++) {
    const off = i * 6;
    const classId = Math.round(Number(raw[off]));
    const score = Number(raw[off + 1]);
    if (classId < 0 || classId >= PP_DOCLAYOUT_LABELS.length) continue;
    const label = PP_DOCLAYOUT_LABELS[classId];
    // Sparse vector physics/geometry diagrams often score slightly lower (0.28..0.35) than dense prose
    const effThreshold = VISUAL_ATTACHMENT_LABELS.has(label)
      ? Math.min(scoreThreshold, 0.28)
      : scoreThreshold;
    if (!Number.isFinite(score) || score < effThreshold) continue;

    const x1 = Math.max(0, Math.min(1, Number(raw[off + 2]) / MODEL_INPUT_SIZE));
    const y1 = Math.max(0, Math.min(1, Number(raw[off + 3]) / MODEL_INPUT_SIZE));
    const x2 = Math.max(0, Math.min(1, Number(raw[off + 4]) / MODEL_INPUT_SIZE));
    const y2 = Math.max(0, Math.min(1, Number(raw[off + 5]) / MODEL_INPUT_SIZE));
    const w = x2 - x1;
    const h = y2 - y1;
    if (w < 0.015 || h < 0.008) continue;

    candidates.push({
      label,
      classId,
      score,
      x: x1,
      y: y1,
      w,
      h,
    });
  }

  onProgress?.("running-ai-layout", 1);
  return applyNms(candidates);
}
