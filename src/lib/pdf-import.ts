export const MAX_PDF_PAGES = 10;

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

/**
 * Renders up to `maxPages` (default 10) pages of a PDF file into PNG Data URLs via `pdfjs-dist`.
 */
export async function importPdfPages(
  file: File,
  options: PdfImportOptions = {}
): Promise<ImportedPdfResult> {
  const maxPages = Math.min(MAX_PDF_PAGES, Math.max(1, options.maxPages ?? MAX_PDF_PAGES));
  const renderScale = options.renderScale ?? 1.5;
  const maxWorldWidth = options.maxWorldWidth ?? 11;

  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
  });

  const pdfDoc = await loadingTask.promise;
  try {
    const totalPages = pdfDoc.numPages;
    const count = Math.min(totalPages, maxPages);
    const pages: ImportedPdfPage[] = [];

    for (let pageNum = 1; pageNum <= count; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({
        canvas,
        viewport,
      }).promise;

      const src = canvas.toDataURL("image/png");
      const world = fitToWorldUnits(canvas.width, canvas.height, maxWorldWidth);

      pages.push({
        pageNumber: pageNum,
        src,
        w: world.w,
        h: world.h,
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
      });

      options.onProgress?.(pageNum, count);
      page.cleanup();
    }

    return {
      pages,
      totalPages,
      truncated: totalPages > maxPages,
    };
  } finally {
    await pdfDoc.cleanup().catch(() => {});
    await loadingTask.destroy().catch(() => {});
  }
}
