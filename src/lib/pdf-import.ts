export const MAX_PDF_PAGES = 100;

export interface ImportedImageResult {
  src: string;
  w: number;
  h: number;
  pixelWidth: number;
  pixelHeight: number;
}

export interface ImportedPdfPage {
  pageNumber: number;
  src: string;
  w: number;
  h: number;
  pixelWidth: number;
  pixelHeight: number;
}

export interface ImportedPdfResult {
  pages: ImportedPdfPage[];
  totalPages: number;
  truncated: boolean;
}

export interface PdfImportOptions {
  maxPages?: number;
  renderScale?: number;
  maxWorldWidth?: number;
  onProgress?: (current: number, total: number) => void;
}

function fitToWorldUnits(
  pixelW: number,
  pixelH: number,
  maxWorldWidth = 10,
  pixelsPerWorldUnit = 45
): { w: number; h: number } {
  const safeW = Math.max(1, pixelW);
  const safeH = Math.max(1, pixelH);
  const rawW = safeW / pixelsPerWorldUnit;
  const rawH = safeH / pixelsPerWorldUnit;
  if (rawW <= maxWorldWidth) {
    return {
      w: Number(rawW.toFixed(3)),
      h: Number(rawH.toFixed(3)),
    };
  }
  const ratio = maxWorldWidth / rawW;
  return {
    w: Number((rawW * ratio).toFixed(3)),
    h: Number((rawH * ratio).toFixed(3)),
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Không thể đọc dữ liệu ảnh."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Lỗi đọc file."));
    reader.readAsDataURL(file);
  });
}

function measureImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 400,
        height: img.naturalHeight || 300,
      });
    };
    img.onerror = () => {
      resolve({ width: 400, height: 300 });
    };
    img.src = src;
  });
}

/**
 * Reads an image File into a PNG/original Data URL along with fitted math-world dimensions `{ src, w, h }`.
 */
export async function readImageFile(
  file: File,
  maxWorldWidth = 10
): Promise<ImportedImageResult> {
  const src = await readFileAsDataUrl(file);
  const { width, height } = await measureImageDimensions(src);
  const world = fitToWorldUnits(width, height, maxWorldWidth);
  return {
    src,
    w: world.w,
    h: world.h,
    pixelWidth: width,
    pixelHeight: height,
  };
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  const g = globalThis as { pdfjsWorker?: unknown };
  if (!g.pdfjsWorker) {
    try {
      // Populate mainThreadWorkerMessageHandler locally so no external worker CDN is required
      // @ts-expect-error pdfjs-dist worker module does not ship separate d.ts declarations
      const workerMod: unknown = await import("pdfjs-dist/build/pdf.worker.mjs");
      if (workerMod && !g.pdfjsWorker) {
        g.pdfjsWorker = workerMod;
      }
    } catch {
      // Fallback to module URL if bundler handles worker asset URL
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
      } catch {
        // Ignore if environment forbids import.meta.url resolution
      }
    }
  }
  return pdfjs;
}

function resolvePdfAssetBaseUrl(subpath: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return new URL(`./pdfjs/${subpath}/`, window.location.href).href;
  } catch {
    return `/pdfjs/${subpath}/`;
  }
}

function buildPdfDocumentParams(data: Uint8Array) {
  const wasmUrl = resolvePdfAssetBaseUrl("wasm");
  const cMapUrl = resolvePdfAssetBaseUrl("cmaps");
  const standardFontDataUrl = resolvePdfAssetBaseUrl("standard_fonts");
  const iccUrl = resolvePdfAssetBaseUrl("iccs");

  return {
    data,
    ...(wasmUrl ? { wasmUrl } : {}),
    ...(cMapUrl ? { cMapUrl, cMapPacked: true } : {}),
    ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
    ...(iccUrl ? { iccUrl } : {}),
    useSystemFonts: true,
    isEvalSupported: false,
  };
}

export interface PdfTextLine {
  text: string;
  normTop: number;
  normBottom: number;
  normLeft: number;
  normRight: number;
}

export interface LazyPdfHandle {
  totalPages: number;
  renderPage: (
    pageNum: number,
    options?: { targetMaxSidePx?: number; maxWorldWidth?: number; renderScale?: number }
  ) => Promise<ImportedPdfPage>;
  extractTextLines: (pageNum: number) => Promise<PdfTextLine[]>;
  destroy: () => Promise<void>;
}

/**
 * Opens a PDF file with full offline WASM (JBIG2/OpenJPEG/QCMS), CMap, and Standard Font support
 * and renders pages lazily on demand (fast & memory-safe for large 100+ page scanned books).
 */
export async function openPdfDocument(file: File): Promise<LazyPdfHandle> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument(buildPdfDocumentParams(new Uint8Array(buffer)));
  const pdfDoc = await loadingTask.promise;

  return {
    totalPages: pdfDoc.numPages,
    renderPage: async (pageNum, opts = {}) => {
      const clampedPage = Math.max(1, Math.min(pdfDoc.numPages, pageNum));
      const page = await pdfDoc.getPage(clampedPage);
      try {
        const baseViewport = page.getViewport({ scale: 1 });
        const maxBaseSide = Math.max(1, baseViewport.width, baseViewport.height);
        const targetMaxSide = opts.targetMaxSidePx ?? 2400;
        const autoScale = Math.min(4.0, Math.max(2.0, targetMaxSide / maxBaseSide));
        const renderScale = opts.renderScale ?? autoScale;
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({
          canvas,
          viewport,
        }).promise;

        const src = canvas.toDataURL("image/png");
        const world = fitToWorldUnits(canvas.width, canvas.height, opts.maxWorldWidth ?? 11);

        return {
          pageNumber: clampedPage,
          src,
          w: world.w,
          h: world.h,
          pixelWidth: canvas.width,
          pixelHeight: canvas.height,
        };
      } finally {
        page.cleanup();
      }
    },
    extractTextLines: async (pageNum) => {
      const clampedPage = Math.max(1, Math.min(pdfDoc.numPages, pageNum));
      const page = await pdfDoc.getPage(clampedPage);
      try {
        const viewport = page.getViewport({ scale: 1 });
        const vpW = Math.max(1, viewport.width);
        const vpH = Math.max(1, viewport.height);
        const textContent = await page.getTextContent();

        interface RawSpan {
          str: string;
          normTop: number;
          normBottom: number;
          normLeft: number;
          normRight: number;
        }

        const spans: RawSpan[] = [];
        for (const item of textContent.items) {
          if (!("str" in item) || !item.str || !item.str.trim()) continue;
          const tr = item.transform;
          const [vx, vy] = viewport.convertToViewportPoint(tr[4], tr[5]);
          const fontH = Math.max(4, Math.hypot(tr[2], tr[3]) || item.height || 10);
          const spanW = Math.max(2, item.width || 0);
          const normBottom = Math.max(0, Math.min(1, vy / vpH));
          const normTop = Math.max(0, Math.min(normBottom, (vy - fontH) / vpH));
          const normLeft = Math.max(0, Math.min(1, vx / vpW));
          const normRight = Math.max(normLeft, Math.min(1, (vx + spanW) / vpW));
          spans.push({
            str: item.str,
            normTop,
            normBottom,
            normLeft,
            normRight,
          });
        }

        // Group spans onto baselines (within 0.009 normalized height)
        spans.sort((a, b) => a.normTop - b.normTop || a.normLeft - b.normLeft);
        const groups: RawSpan[][] = [];
        for (const sp of spans) {
          const prev = groups[groups.length - 1];
          if (
            prev &&
            Math.abs(sp.normTop - prev[0].normTop) <= 0.009 &&
            Math.abs(sp.normBottom - prev[0].normBottom) <= 0.012
          ) {
            prev.push(sp);
          } else {
            groups.push([sp]);
          }
        }

        const lines: PdfTextLine[] = groups.map((g) => {
          g.sort((a, b) => a.normLeft - b.normLeft);
          let text = "";
          let lastRight = g[0].normLeft;
          for (let i = 0; i < g.length; i++) {
            const cur = g[i];
            if (i > 0 && cur.normLeft - lastRight > 0.003 && !text.endsWith(" ") && !cur.str.startsWith(" ")) {
              text += " ";
            }
            text += cur.str;
            lastRight = Math.max(lastRight, cur.normRight);
          }
          return {
            text: text.replace(/\s+/g, " ").trim(),
            normTop: Math.min(...g.map((x) => x.normTop)),
            normBottom: Math.max(...g.map((x) => x.normBottom)),
            normLeft: Math.min(...g.map((x) => x.normLeft)),
            normRight: Math.max(...g.map((x) => x.normRight)),
          };
        });

        return lines.filter((l) => l.text.length > 0);
      } finally {
        page.cleanup();
      }
    },
    destroy: async () => {
      await pdfDoc.cleanup().catch(() => {});
      await loadingTask.destroy().catch(() => {});
    },
  };
}

/**
 * Renders up to `maxPages` (default 100) pages of a PDF file into PNG Data URLs via `pdfjs-dist`.
 */
export async function importPdfPages(
  file: File,
  options: PdfImportOptions = {}
): Promise<ImportedPdfResult> {
  const maxPages = Math.min(MAX_PDF_PAGES, Math.max(1, options.maxPages ?? MAX_PDF_PAGES));
  const maxWorldWidth = options.maxWorldWidth ?? 11;

  const handle = await openPdfDocument(file);
  try {
    const totalPages = handle.totalPages;
    const count = Math.min(totalPages, maxPages);
    const pages: ImportedPdfPage[] = [];

    for (let pageNum = 1; pageNum <= count; pageNum++) {
      const rendered = await handle.renderPage(pageNum, {
        targetMaxSidePx: 3200,
        maxWorldWidth,
        renderScale: options.renderScale,
      });
      pages.push(rendered);
      options.onProgress?.(pageNum, count);
    }

    return {
      pages,
      totalPages,
      truncated: totalPages > maxPages,
    };
  } finally {
    await handle.destroy();
  }
}
