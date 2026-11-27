"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Link2,
  Loader2,
  Lock,
  Scissors,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import {
  openPdfDocument,
  readImageFile,
  type ImportedPdfPage,
  type LazyPdfHandle,
} from "@/lib/pdf-import";
import {
  detectQuestionsOnPageAsync,
  detectQuestionsWithContinuationAsync,
  stitchDataUrlsVertically,
  type DetectedQuestionBox,
} from "@/lib/question-detector";

export interface CroppedQuestionResult {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
  lockOnInsert: boolean;
}

export interface BatchCroppedQuestionsResult {
  items: Array<{
    dataUrl: string;
    widthPx: number;
    heightPx: number;
    label: string;
  }>;
  lockOnInsert: boolean;
  gapWorld: number;
}

export interface QuestionCropModalProps {
  open: boolean;
  onClose: () => void;
  onInsertCropped: (result: CroppedQuestionResult) => void;
  onInsertBatchCropped?: (batch: BatchCroppedQuestionsResult) => void;
}

const GAP_PRESETS: Array<{ label: string; value: number }> = [
  { label: "Sát", value: 1.2 },
  { label: "Hẹp", value: 2.5 },
  { label: "Vừa", value: 4.5 },
  { label: "Rộng", value: 7 },
  { label: "Rất rộng", value: 10 },
  { label: "Nửa trang", value: 13 },
];

const CROP_GAP_STORAGE_KEY = "physboard_crop_gap_world";

const BOX_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#db2777",
  "#0891b2",
];

interface CropRectNorm {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PendingStitchPart {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
  pageNumber: number;
}

interface MultiPageBatchItem {
  id: string;
  label: string;
  pageLabel: string;
  startPage: number;
  stitched: boolean;
  dataUrl: string;
  widthPx: number;
  heightPx: number;
  selected: boolean;
}

export const QuestionCropModal: React.FC<QuestionCropModalProps> = ({
  open,
  onClose,
  onInsertCropped,
  onInsertBatchCropped,
}) => {
  const [totalPages, setTotalPages] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [currentPage, setCurrentPage] = useState<ImportedPdfPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockOnInsert, setLockOnInsert] = useState(true);
  const [cropRect, setCropRect] = useState<CropRectNorm | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedQuestionBox[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState<string | null>(null);
  const [detectInfo, setDetectInfo] = useState<string | null>(null);
  const [gapWorld, setGapWorld] = useState<number>(() => {
    if (typeof window === "undefined") return 4.5;
    try {
      const saved = Number(window.localStorage.getItem(CROP_GAP_STORAGE_KEY));
      return Number.isFinite(saved) && saved >= 0.5 && saved <= 16 ? saved : 4.5;
    } catch {
      return 4.5;
    }
  });
  const handleChangeGapWorld = useCallback((val: number) => {
    const clamped = Math.max(0.5, Math.min(16, Math.round(val * 2) / 2));
    setGapWorld(clamped);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CROP_GAP_STORAGE_KEY, String(clamped));
      } catch {
        // ignore
      }
    }
  }, []);
  const [sourceName, setSourceName] = useState<string>("");
  const [scanFromPage, setScanFromPage] = useState<number>(1);
  const [scanToPage, setScanToPage] = useState<number>(2);
  const [pendingStitchParts, setPendingStitchParts] = useState<PendingStitchPart[]>([]);
  const [multiPageBatch, setMultiPageBatch] = useState<MultiPageBatchItem[]>([]);
  const [singlePageNextStitch, setSinglePageNextStitch] = useState<{
    targetBoxId: string;
    nextPageNumber: number;
    dataUrl: string;
    widthPx: number;
    heightPx: number;
  } | null>(null);

  const pdfHandleRef = useRef<LazyPdfHandle | null>(null);
  const pageCacheRef = useRef<Map<number, ImportedPdfPage>>(new Map());
  const imgRef = useRef<HTMLImageElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizingRef = useRef<{ id: string; edge: "top" | "bottom" } | null>(null);

  const goToPage = useCallback(async (zeroBasedIdx: number) => {
    const handle = pdfHandleRef.current;
    const cached = pageCacheRef.current.get(zeroBasedIdx);
    setPageIdx(zeroBasedIdx);
    setPageInput(String(zeroBasedIdx + 1));
    setCropRect(null);
    setDetectedBoxes([]);
    setMultiPageBatch([]);
    setSinglePageNextStitch(null);
    setDetectInfo(null);
    if (cached) {
      setCurrentPage(cached);
      return;
    }
    if (!handle) return;
    setLoading(true);
    setError(null);
    try {
      const rendered = await handle.renderPage(zeroBasedIdx + 1, { targetMaxSidePx: 2400 });
      pageCacheRef.current.set(zeroBasedIdx, rendered);
      setCurrentPage(rendered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hiển thị trang PDF này.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoadFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setCropRect(null);
    setDetectedBoxes([]);
    setMultiPageBatch([]);
    setPendingStitchParts([]);
    setSinglePageNextStitch(null);
    setDetectInfo(null);
    try {
      if (pdfHandleRef.current) {
        await pdfHandleRef.current.destroy();
        pdfHandleRef.current = null;
      }
      pageCacheRef.current.clear();

      const isPdf =
        file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      if (isPdf) {
        const handle = await openPdfDocument(file);
        if (handle.totalPages <= 0) {
          await handle.destroy();
          setError("File PDF không có trang nào hợp lệ.");
          return;
        }
        pdfHandleRef.current = handle;
        setTotalPages(handle.totalPages);
        setPageIdx(0);
        setPageInput("1");
        setScanFromPage(1);
        setScanToPage(Math.min(10, handle.totalPages));
        setSourceName(file.name);
        const firstPage = await handle.renderPage(1, { targetMaxSidePx: 2400 });
        pageCacheRef.current.set(0, firstPage);
        setCurrentPage(firstPage);
      } else if (file.type.startsWith("image/")) {
        const img = await readImageFile(file);
        const singlePage: ImportedPdfPage = {
          pageNumber: 1,
          src: img.src,
          w: img.w,
          h: img.h,
          pixelWidth: img.pixelWidth,
          pixelHeight: img.pixelHeight,
        };
        pageCacheRef.current.set(0, singlePage);
        setTotalPages(1);
        setPageIdx(0);
        setPageInput("1");
        setScanFromPage(1);
        setScanToPage(1);
        setCurrentPage(singlePage);
        setSourceName(file.name);
      } else {
        setError("Vui lòng chọn file ảnh (PNG/JPG/WebP) hoặc file PDF.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đọc tệp đã chọn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pdfHandleRef.current) {
        void pdfHandleRef.current.destroy();
        pdfHandleRef.current = null;
      }
    };
  }, []);

  // Support Ctrl+V pasting a screenshot directly into the cropper modal
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleLoadFile(file);
            return;
          }
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, handleLoadFile]);

  if (!open) return null;

  const getNormPos = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentPage) return;
    if (resizingRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getNormPos(e);
    dragStartRef.current = pt;
    setDetectedBoxes([]);
    setMultiPageBatch([]);
    setSinglePageNextStitch(null);
    setDetectInfo(null);
    setCropRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizingRef.current) {
      e.preventDefault();
      const pt = getNormPos(e);
      const { id, edge } = resizingRef.current;
      setDetectedBoxes((prev) =>
        prev.map((box) => {
          if (box.id !== id) return box;
          if (edge === "top") {
            const bottom = box.y + box.h;
            const nextTop = Math.max(0, Math.min(bottom - 0.02, pt.y));
            return { ...box, y: nextTop, h: bottom - nextTop };
          } else {
            const nextBottom = Math.min(1, Math.max(box.y + 0.02, pt.y));
            return { ...box, h: nextBottom - box.y };
          }
        })
      );
      return;
    }

    if (!dragStartRef.current) return;
    e.preventDefault();
    const pt = getNormPos(e);
    const start = dragStartRef.current;
    setCropRect({
      x: Math.min(start.x, pt.x),
      y: Math.min(start.y, pt.y),
      w: Math.abs(pt.x - start.x),
      h: Math.abs(pt.y - start.y),
    });
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
    resizingRef.current = null;
  };

  const cropBoxToDataUrl = (
    imgEl: HTMLImageElement,
    natW: number,
    natH: number,
    box: { x: number; y: number; w: number; h: number }
  ) => {
    const sx = Math.max(0, Math.round(box.x * natW));
    const sy = Math.max(0, Math.round(box.y * natH));
    const sw = Math.max(10, Math.min(natW - sx, Math.round(box.w * natW)));
    const sh = Math.max(10, Math.min(natH - sy, Math.round(box.h * natH)));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, sw, sh);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      widthPx: sw,
      heightPx: sh,
    };
  };

  const handleAutoDetect = async () => {
    const imgEl = imgRef.current;
    if (!currentPage || !imgEl) return;
    setError(null);
    setDetecting(true);
    setDetectProgress("Đang phân tích trang...");
    setDetectInfo(null);
    setMultiPageBatch([]);
    setSinglePageNextStitch(null);
    setCropRect(null);
    try {
      if (!imgEl.complete) {
        await new Promise<void>((resolve) => {
          imgEl.onload = () => resolve();
          imgEl.onerror = () => resolve();
        });
      }
      const handle = pdfHandleRef.current;
      const textLines = handle
        ? await handle.extractTextLines(pageIdx + 1).catch(() => undefined)
        : undefined;
      const found = await detectQuestionsOnPageAsync(imgEl, {
        textLines,
        onProgress: (status, prog) => {
          if (status === "loading-ai-model") {
            setDetectProgress(
              `Đang nạp AI phân tích bố cục đề Offline (${Math.round(prog * 100)}%)...`
            );
          } else if (status === "running-ai-layout") {
            setDetectProgress("Đang phân tích bố cục trang bằng AI...");
          } else if (status === "recognizing text") {
            setDetectProgress(
              `Đang đọc tiêu đề câu hỏi (OCR tiếng Việt ${Math.round(prog * 100)}%)...`
            );
          } else if (status === "loading language traineddata") {
            setDetectProgress(`Đang nạp từ điển OCR tiếng Việt (${Math.round(prog * 100)}%)...`);
          } else {
            setDetectProgress("Đang khởi tạo bộ đọc OCR...");
          }
        },
      });
      if (found.length === 0) {
        setDetectedBoxes([]);
        setDetectInfo(null);
        setError("Không tách được câu hỏi riêng lẻ trên trang này. Bạn có thể kéo chuột khoanh vùng thủ công.");
      } else {
        let nextStitchInfo: {
          targetBoxId: string;
          nextPageNumber: number;
          dataUrl: string;
          widthPx: number;
          heightPx: number;
        } | null = null;

        // Automatically peek at Page p+1 to see if the last question on Page p spills onto the top of Page p+1
        if (handle && pageIdx + 1 < totalPages) {
          const nextPageNum = pageIdx + 2;
          setDetectProgress(`Đang kiểm tra phần nối ở Trang ${nextPageNum}...`);
          try {
            let nextRendered = pageCacheRef.current.get(pageIdx + 1);
            if (!nextRendered) {
              nextRendered = await handle.renderPage(nextPageNum, { targetMaxSidePx: 2400 });
              pageCacheRef.current.set(pageIdx + 1, nextRendered);
            }
            const nextImg = await new Promise<HTMLImageElement>((resolve, reject) => {
              const im = new Image();
              im.onload = () => resolve(im);
              im.onerror = () => reject(new Error(`Không nạp được trang ${nextPageNum}`));
              im.src = nextRendered.src;
            });
            const nextTextLines = await handle.extractTextLines(nextPageNum).catch(() => undefined);
            const nextRes = await detectQuestionsWithContinuationAsync(nextImg, {
              textLines: nextTextLines,
            });
            if (nextRes.leadingContinuation) {
              const nextNatW = nextImg.naturalWidth || nextRendered.pixelWidth;
              const nextNatH = nextImg.naturalHeight || nextRendered.pixelHeight;
              const contCrop = cropBoxToDataUrl(
                nextImg,
                nextNatW,
                nextNatH,
                nextRes.leadingContinuation
              );
              if (contCrop) {
                nextStitchInfo = {
                  targetBoxId: found[found.length - 1].id,
                  nextPageNumber: nextPageNum,
                  ...contCrop,
                };
              }
            }
          } catch {
            // Non-fatal: keep current page boxes cleanly even if next-page peek fails
          }
        }

        setSinglePageNextStitch(nextStitchInfo);
        setDetectedBoxes(found);
        const src = found[0].source;
        const methodNote =
          src === "ai"
            ? "AI bố cục (PP-DocLayout-L) + OCR"
            : src === "text"
              ? "nhận diện tiêu đề chữ PDF"
              : src === "ocr"
                ? "OCR tiếng Việt (Tesseract.js)"
                : "tách khối hình ảnh";
        setDetectInfo(
          nextStitchInfo
            ? `Đã phát hiện ${found.length} câu hỏi (${methodNote}) — ${found[found.length - 1].label} vắt sang Trang ${nextStitchInfo.nextPageNumber} đã được tự động nối đủ hình & đáp án!`
            : `Đã phát hiện ${found.length} câu hỏi (${methodNote}) — bấm nhãn từng câu để bật/tắt hoặc kéo viền trên/dưới để chỉnh.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi tự nhận diện câu hỏi.");
    } finally {
      setDetecting(false);
      setDetectProgress(null);
    }
  };

  const handleMultiPageAutoDetect = async () => {
    const handle = pdfHandleRef.current;
    if (!handle || totalPages < 2) return;
    const fromP = Math.max(1, Math.min(totalPages, scanFromPage));
    const toP = Math.max(fromP, Math.min(totalPages, scanToPage));

    setError(null);
    setDetecting(true);
    setDetectedBoxes([]);
    setMultiPageBatch([]);
    setSinglePageNextStitch(null);
    setDetectInfo(null);
    setCropRect(null);

    try {
      const batch: MultiPageBatchItem[] = [];
      let stitchedCount = 0;

      for (let p = fromP; p <= toP; p++) {
        setDetectProgress(`Đang quét & nối câu trang ${p}/${toP}...`);
        let rendered = pageCacheRef.current.get(p - 1);
        if (!rendered) {
          rendered = await handle.renderPage(p, { targetMaxSidePx: 2400 });
          pageCacheRef.current.set(p - 1, rendered);
        }

        const pageImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => reject(new Error(`Không nạp được ảnh trang ${p}`));
          im.src = rendered.src;
        });

        const textLines = await handle.extractTextLines(p).catch(() => undefined);
        const res = await detectQuestionsWithContinuationAsync(pageImg, {
          textLines,
          onProgress: (status, prog) => {
            if (status === "loading-ai-model") {
              setDetectProgress(
                `Đang nạp AI Offline (${Math.round(prog * 100)}%)...`
              );
            } else if (status === "running-ai-layout") {
              setDetectProgress(`Trang ${p}/${toP}: AI đang phân tích bố cục...`);
            } else if (status === "recognizing text") {
              setDetectProgress(
                `Trang ${p}/${toP}: OCR tiếng Việt (${Math.round(prog * 100)}%)...`
              );
            }
          },
        });

        const natW = pageImg.naturalWidth || rendered.pixelWidth;
        const natH = pageImg.naturalHeight || rendered.pixelHeight;

        if (p > fromP && res.leadingContinuation && batch.length > 0) {
          const contCrop = cropBoxToDataUrl(pageImg, natW, natH, res.leadingContinuation);
          if (contCrop) {
            const last = batch[batch.length - 1];
            const stitched = await stitchDataUrlsVertically([last, contCrop], 10);
            last.dataUrl = stitched.dataUrl;
            last.widthPx = stitched.widthPx;
            last.heightPx = stitched.heightPx;
            last.stitched = true;
            last.pageLabel = `Tr. ${last.startPage}→${p}`;
            stitchedCount++;
          }
        }

        res.questions.forEach((box, idx) => {
          const cropped = cropBoxToDataUrl(pageImg, natW, natH, box);
          if (cropped) {
            batch.push({
              id: `mp-${p}-${idx + 1}-${Math.round(box.y * 1000)}`,
              label: box.label,
              pageLabel: `Tr. ${p}`,
              startPage: p,
              stitched: false,
              dataUrl: cropped.dataUrl,
              widthPx: cropped.widthPx,
              heightPx: cropped.heightPx,
              selected: true,
            });
          }
        });
      }

      if (batch.length === 0) {
        setError(`Không tách được câu hỏi nào từ trang ${fromP} đến trang ${toP}.`);
      } else {
        setMultiPageBatch(batch);
        setDetectInfo(
          stitchedCount > 0
            ? `Đã quét Trang ${fromP}→${toP}: ${batch.length} câu hỏi (tự động ghép ${stitchedCount} câu vắt trang!) — tích chọn câu muốn chèn bên dưới.`
            : `Đã quét Trang ${fromP}→${toP}: ${batch.length} câu hỏi — tích chọn câu muốn chèn bên dưới.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi quét nhiều trang.");
    } finally {
      setDetecting(false);
      setDetectProgress(null);
    }
  };

  const handleKeepForNextPage = () => {
    const imgEl = imgRef.current;
    if (!currentPage || !imgEl || !cropRect || cropRect.w < 0.02 || cropRect.h < 0.02) {
      setError("Hãy kéo chọn phần đầu câu hỏi trước khi nối tiếp trang sau.");
      return;
    }
    const natW = imgEl.naturalWidth || currentPage.pixelWidth;
    const natH = imgEl.naturalHeight || currentPage.pixelHeight;
    const cropped = cropBoxToDataUrl(imgEl, natW, natH, cropRect);
    if (!cropped) return;

    setPendingStitchParts((prev) => [...prev, { ...cropped, pageNumber: pageIdx + 1 }]);
    setCropRect(null);
    setError(null);
    if (pageIdx < totalPages - 1) {
      void goToPage(pageIdx + 1);
    }
  };

  const handleCommitCrop = async (closeAfter: boolean) => {
    const imgEl = imgRef.current;
    if (!currentPage || !imgEl || !cropRect || cropRect.w < 0.02 || cropRect.h < 0.02) {
      setError("Hãy kéo chọn một vùng câu hỏi đủ rộng trên trang trước khi cắt.");
      return;
    }

    const natW = imgEl.naturalWidth || currentPage.pixelWidth;
    const natH = imgEl.naturalHeight || currentPage.pixelHeight;
    const cropped = cropBoxToDataUrl(imgEl, natW, natH, cropRect);
    if (!cropped) return;

    const finalImage =
      pendingStitchParts.length > 0
        ? await stitchDataUrlsVertically([...pendingStitchParts, cropped], 10)
        : cropped;

    onInsertCropped({
      ...finalImage,
      lockOnInsert,
    });
    setPendingStitchParts([]);
    setCropRect(null);
    if (closeAfter) onClose();
  };

  const handleCommitBatch = async () => {
    if (multiPageBatch.length > 0) {
      const picked = multiPageBatch.filter((it) => it.selected);
      if (picked.length === 0) {
        setError("Hãy tích chọn ít nhất 1 câu hỏi trước khi chèn lên bảng.");
        return;
      }
      const items: BatchCroppedQuestionsResult["items"] = picked.map((it) => ({
        dataUrl: it.dataUrl,
        widthPx: it.widthPx,
        heightPx: it.heightPx,
        label: it.label,
      }));
      if (onInsertBatchCropped) {
        onInsertBatchCropped({ items, lockOnInsert, gapWorld });
      } else {
        for (const item of items) {
          onInsertCropped({
            dataUrl: item.dataUrl,
            widthPx: item.widthPx,
            heightPx: item.heightPx,
            lockOnInsert,
          });
        }
      }
      setMultiPageBatch([]);
      setSinglePageNextStitch(null);
      setDetectInfo(null);
      onClose();
      return;
    }

    const imgEl = imgRef.current;
    if (!currentPage || !imgEl) return;
    const picked = detectedBoxes.filter((b) => b.selected);
    if (picked.length === 0) {
      setError("Hãy tích chọn ít nhất 1 câu hỏi trước khi chèn lên bảng.");
      return;
    }

    const natW = imgEl.naturalWidth || currentPage.pixelWidth;
    const natH = imgEl.naturalHeight || currentPage.pixelHeight;
    const items: BatchCroppedQuestionsResult["items"] = [];
    for (const box of picked) {
      const cropped = cropBoxToDataUrl(imgEl, natW, natH, box);
      if (cropped) {
        if (singlePageNextStitch && box.id === singlePageNextStitch.targetBoxId) {
          const stitched = await stitchDataUrlsVertically([cropped, singlePageNextStitch], 10);
          items.push({ ...stitched, label: box.label });
        } else {
          items.push({ ...cropped, label: box.label });
        }
      }
    }
    if (items.length === 0) return;

    if (onInsertBatchCropped) {
      onInsertBatchCropped({
        items,
        lockOnInsert,
        gapWorld,
      });
    } else {
      for (const item of items) {
        onInsertCropped({
          dataUrl: item.dataUrl,
          widthPx: item.widthPx,
          heightPx: item.heightPx,
          lockOnInsert,
        });
      }
    }

    setDetectedBoxes([]);
    setSinglePageNextStitch(null);
    setDetectInfo(null);
    onClose();
  };

  const hasValidCrop = Boolean(cropRect && cropRect.w >= 0.02 && cropRect.h >= 0.02);
  const selectedDetectedCount =
    multiPageBatch.length > 0
      ? multiPageBatch.filter((b) => b.selected).length
      : detectedBoxes.filter((b) => b.selected).length;
  const hasBatchMode = multiPageBatch.length > 0 || detectedBoxes.length > 0;

  return (
    <div
      data-testid="question-crop-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        background: "rgba(15, 23, 42, 0.52)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily:
          "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          maxHeight: "91vh",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow:
            "0 24px 64px -12px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(15, 23, 42, 0.06)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modern 1-Row Header */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "#eff6ff",
                border: "1px solid #dbeafe",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Scissors size={17} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: "#0f172a",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Cắt câu hỏi từ PDF / Ảnh
                </span>
                {sourceName && (
                  <span
                    title={sourceName}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                      fontSize: 11.5,
                      fontWeight: 500,
                      maxWidth: 260,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FileText size={12} color="#64748b" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sourceName}
                    </span>
                  </span>
                )}
              </div>
              {!sourceName && (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                  Mở file PDF/Ảnh hoặc bấm Ctrl+V dán ảnh chụp, sau đó tách tự động hoặc khoanh tay
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              aria-pressed={lockOnInsert}
              onClick={() => setLockOnInsert((v) => !v)}
              title="Khoá vị trí câu hỏi sau khi chèn để không bị trượt tay khi viết"
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: 8,
                border: lockOnInsert ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                background: lockOnInsert ? "#eff6ff" : "#f8fafc",
                color: lockOnInsert ? "#1d4ed8" : "#64748b",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
              }}
            >
              {lockOnInsert ? <Lock size={13} /> : <Unlock size={13} />}
              <span>{lockOnInsert ? "Tự khoá đề" : "Không khoá"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#64748b",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sleek Single-Row Action Bar */}
        <div
          style={{
            padding: "8px 18px",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLoadFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} color="#2563eb" />}
              <span>{loading ? "Đang nạp..." : "Chọn PDF / Ảnh"}</span>
            </button>

            {totalPages > 1 && (
              <div
                style={{
                  height: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "0 2px",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                }}
              >
                <button
                  type="button"
                  data-testid="crop-prev-page-btn"
                  aria-label="Trang trước"
                  disabled={loading || pageIdx <= 0}
                  onClick={() => void goToPage(Math.max(0, pageIdx - 1))}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: loading || pageIdx <= 0 ? "#cbd5e1" : "#334155",
                    cursor: loading || pageIdx <= 0 ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronLeft size={15} />
                </button>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "0 6px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span>Trang</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = parseInt(pageInput, 10);
                        if (!Number.isNaN(n)) {
                          void goToPage(Math.max(0, Math.min(totalPages - 1, n - 1)));
                        }
                      }
                    }}
                    onBlur={() => {
                      const n = parseInt(pageInput, 10);
                      if (!Number.isNaN(n) && n - 1 !== pageIdx) {
                        void goToPage(Math.max(0, Math.min(totalPages - 1, n - 1)));
                      } else {
                        setPageInput(String(pageIdx + 1));
                      }
                    }}
                    style={{
                      width: 36,
                      height: 22,
                      borderRadius: 5,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  />
                  <span style={{ color: "#94a3b8" }}>/ {totalPages}</span>
                </span>
                <button
                  type="button"
                  data-testid="crop-next-page-btn"
                  aria-label="Trang sau"
                  disabled={loading || pageIdx >= totalPages - 1}
                  onClick={() => void goToPage(Math.min(totalPages - 1, pageIdx + 1))}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: loading || pageIdx >= totalPages - 1 ? "#cbd5e1" : "#334155",
                    cursor: loading || pageIdx >= totalPages - 1 ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          {currentPage && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
              <button
                type="button"
                data-testid="auto-detect-questions-btn"
                disabled={loading || detecting}
                onClick={() => void handleAutoDetect()}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #1d4ed8",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: loading || detecting ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 1px 2px rgba(37, 99, 235, 0.22)",
                  whiteSpace: "nowrap",
                  opacity: loading || detecting ? 0.85 : 1,
                }}
              >
                {detecting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{detecting ? "Đang nhận diện..." : "Tự nhận diện trang này"}</span>
              </button>

              {totalPages > 1 && (
                <div
                  style={{
                    height: 32,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 3px 2px 8px",
                    borderRadius: 8,
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>Tr.</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={scanFromPage}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isNaN(n)) setScanFromPage(Math.max(1, Math.min(totalPages, n)));
                    }}
                    style={{
                      width: 34,
                      height: 22,
                      borderRadius: 5,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  />
                  <span style={{ fontSize: 11.5, color: "#94a3b8" }}>–</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={scanToPage}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isNaN(n)) setScanToPage(Math.max(1, Math.min(totalPages, n)));
                    }}
                    style={{
                      width: 34,
                      height: 22,
                      borderRadius: 5,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  />
                  <button
                    type="button"
                    data-testid="multi-page-detect-btn"
                    disabled={loading || detecting}
                    onClick={() => void handleMultiPageAutoDetect()}
                    style={{
                      height: 26,
                      padding: "0 10px",
                      borderRadius: 6,
                      border: "none",
                      background: "#0f766e",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: loading || detecting ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Layers size={13} />
                    <span>Quét &amp; nối vắt trang</span>
                  </button>
                </div>
              )}

              {hasBatchMode && (
                <button
                  type="button"
                  title="Xoá các khung đã nhận diện"
                  onClick={() => {
                    setDetectedBoxes([]);
                    setMultiPageBatch([]);
                    setSinglePageNextStitch(null);
                    setDetectInfo(null);
                  }}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Trash2 size={13} />
                  <span>Xoá khung</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Workspace */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 18,
            backgroundColor: "#f1f5f9",
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: currentPage ? "flex-start" : "center",
            minHeight: 340,
          }}
        >
          {detecting && detectProgress && (
            <div
              style={{
                flexShrink: 0,
                marginBottom: 12,
                padding: "7px 14px",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#1d4ed8",
                fontSize: 12.5,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span>{detectProgress}</span>
            </div>
          )}

          {error && (
            <div
              style={{
                flexShrink: 0,
                marginBottom: 12,
                padding: "8px 13px",
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 12.5,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {detectInfo && !detecting && (
            <div
              data-testid="auto-detect-info"
              style={{
                flexShrink: 0,
                marginBottom: 12,
                padding: "7px 13px",
                borderRadius: 10,
                background: "#ffffff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontSize: 12.5,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
              }}
            >
              <Sparkles size={14} color="#2563eb" />
              <span>{detectInfo}</span>
            </div>
          )}

          {pendingStitchParts.length > 0 && (
            <div
              data-testid="pending-stitch-banner"
              style={{
                flexShrink: 0,
                marginBottom: 12,
                padding: "7px 13px",
                borderRadius: 10,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                fontSize: 12.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Link2 size={15} />
              <span>
                Đang giữ {pendingStitchParts.length} mảnh (Trang{" "}
                {pendingStitchParts.map((p) => p.pageNumber).join(", ")}) — kéo chọn phần tiếp nối
                trên trang hiện tại rồi bấm Ghép &amp; ghim để nối thành 1 câu.
              </span>
              <button
                type="button"
                onClick={() => setPendingStitchParts([])}
                style={{
                  padding: "3px 9px",
                  borderRadius: 6,
                  border: "1px solid #fcd34d",
                  background: "#ffffff",
                  color: "#92400e",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Huỷ nối
              </button>
            </div>
          )}

          {multiPageBatch.length > 0 ? (
            <div
              data-testid="multi-page-batch-list"
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
                gap: 12,
                alignItems: "start",
              }}
            >
              {multiPageBatch.map((item) => (
                <div
                  key={item.id}
                  data-testid="multi-page-item"
                  data-stitched={item.stitched ? "true" : "false"}
                  onClick={() =>
                    setMultiPageBatch((prev) =>
                      prev.map((it) =>
                        it.id === item.id ? { ...it, selected: !it.selected } : it
                      )
                    )
                  }
                  style={{
                    background: "#ffffff",
                    borderRadius: 12,
                    border: item.selected ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                    padding: 10,
                    cursor: "pointer",
                    opacity: item.selected ? 1 : 0.55,
                    boxShadow: item.selected
                      ? "0 4px 12px rgba(37, 99, 235, 0.1)"
                      : "0 1px 3px rgba(15, 23, 42, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    transition: "border-color 120ms ease, opacity 120ms ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: item.selected ? "#1d4ed8" : "#64748b",
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 5,
                          background: item.selected ? "#2563eb" : "#ffffff",
                          border: item.selected ? "none" : "1.5px solid #cbd5e1",
                          color: "#ffffff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.selected && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span>{item.label}</span>
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: item.stitched ? "#fef3c7" : "#f1f5f9",
                        color: item.stitched ? "#92400e" : "#475569",
                        border: item.stitched ? "1px solid #fde68a" : "1px solid transparent",
                      }}
                    >
                      {item.stitched && <Link2 size={11} />}
                      <span>{item.stitched ? `Nối ${item.pageLabel}` : item.pageLabel}</span>
                    </span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.dataUrl}
                    alt={item.label}
                    style={{
                      width: "100%",
                      maxHeight: 200,
                      objectFit: "contain",
                      background: "#ffffff",
                      borderRadius: 8,
                      border: "1px solid #f1f5f9",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : !currentPage ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleLoadFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "1.5px dashed #cbd5e1",
                borderRadius: 16,
                background: "#ffffff",
                padding: "40px 32px",
                textAlign: "center",
                maxWidth: 460,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Upload size={22} />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "#0f172a" }}>
                Kéo thả file PDF hoặc Ảnh đề thi vào đây
              </div>
              <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
                Hoặc bấm để chọn tệp từ máy, hay nhấn{" "}
                <kbd
                  style={{
                    padding: "2px 6px",
                    borderRadius: 5,
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Ctrl+V
                </kbd>{" "}
                dán ảnh chụp màn hình trực tiếp.
              </div>
            </div>
          ) : (
            <div
              ref={previewWrapRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: "relative",
                display: "inline-block",
                flexShrink: 0,
                maxWidth: "100%",
                cursor: "crosshair",
                touchAction: "none",
                userSelect: "none",
                boxShadow:
                  "0 10px 30px -5px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.06)",
                borderRadius: 8,
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={currentPage.src}
                alt={`Trang ${pageIdx + 1}`}
                draggable={false}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "61vh",
                  width: "auto",
                  height: "auto",
                  pointerEvents: "none",
                }}
              />

              {detectedBoxes.map((box, idx) => {
                const color = BOX_COLORS[idx % BOX_COLORS.length];
                const isStitchedNext =
                  Boolean(singlePageNextStitch && box.id === singlePageNextStitch.targetBoxId);
                return (
                  <div
                    key={box.id}
                    data-detected-box={box.id}
                    data-selected={box.selected ? "true" : "false"}
                    data-stitched={isStitchedNext ? "true" : "false"}
                    style={{
                      position: "absolute",
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.w * 100}%`,
                      height: `${box.h * 100}%`,
                      border: box.selected ? `1.5px solid ${color}` : `1.5px dashed #94a3b8`,
                      background: box.selected ? `${color}14` : "rgba(148, 163, 184, 0.1)",
                      boxSizing: "border-box",
                      pointerEvents: "none",
                      borderRadius: 6,
                    }}
                  >
                    {/* Top Resize Handle */}
                    <div
                      title="Kéo viền trên để chỉnh vùng câu hỏi"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        previewWrapRef.current?.setPointerCapture(e.pointerId);
                        resizingRef.current = { id: box.id, edge: "top" };
                      }}
                      style={{
                        position: "absolute",
                        top: -5,
                        left: "20%",
                        right: "20%",
                        height: 10,
                        cursor: "ns-resize",
                        pointerEvents: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 3.5,
                          borderRadius: 999,
                          background: box.selected ? color : "#94a3b8",
                        }}
                      />
                    </div>

                    {/* Toggle Selection Pill */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetectedBoxes((prev) =>
                          prev.map((b) =>
                            b.id === box.id ? { ...b, selected: !b.selected } : b
                          )
                        );
                      }}
                      style={{
                        position: "absolute",
                        top: 4,
                        left: 5,
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: "none",
                        background: box.selected ? color : "#64748b",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        pointerEvents: "auto",
                        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.2)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {box.selected && <Check size={11} strokeWidth={3} />}
                      <span>{box.label}</span>
                      {isStitchedNext && singlePageNextStitch && (
                        <span
                          style={{
                            marginLeft: 2,
                            padding: "0 4px",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.22)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Link2 size={10} />
                          +Tr.{singlePageNextStitch.nextPageNumber}
                        </span>
                      )}
                    </button>

                    {/* Remove Detected Box */}
                    <button
                      type="button"
                      title="Xoá khung này"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetectedBoxes((prev) => prev.filter((b) => b.id !== box.id));
                      }}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 5,
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: "none",
                        background: "rgba(15, 23, 42, 0.65)",
                        color: "#ffffff",
                        cursor: "pointer",
                        pointerEvents: "auto",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={12} />
                    </button>

                    {/* Bottom Resize Handle */}
                    <div
                      title="Kéo viền dưới để chỉnh vùng câu hỏi"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        previewWrapRef.current?.setPointerCapture(e.pointerId);
                        resizingRef.current = { id: box.id, edge: "bottom" };
                      }}
                      style={{
                        position: "absolute",
                        bottom: -5,
                        left: "20%",
                        right: "20%",
                        height: 10,
                        cursor: "ns-resize",
                        pointerEvents: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 3.5,
                          borderRadius: 999,
                          background: box.selected ? color : "#94a3b8",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {cropRect && (
                <div
                  style={{
                    position: "absolute",
                    left: `${cropRect.x * 100}%`,
                    top: `${cropRect.y * 100}%`,
                    width: `${cropRect.w * 100}%`,
                    height: `${cropRect.h * 100}%`,
                    border: "2px solid #2563eb",
                    background: "rgba(37, 99, 235, 0.14)",
                    boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.38)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Clean SaaS Footer */}
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {hasBatchMode ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                  Khoảng cách giữa các câu:
                </span>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: 2,
                    borderRadius: 8,
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  {GAP_PRESETS.map((preset) => {
                    const active = Math.abs(gapWorld - preset.value) < 0.05;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        data-testid={`crop-gap-preset-${preset.value}`}
                        onClick={() => handleChangeGapWorld(preset.value)}
                        style={{
                          padding: "4px 9px",
                          borderRadius: 6,
                          border: "none",
                          background: active ? "#ffffff" : "transparent",
                          color: active ? "#0f172a" : "#64748b",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: active ? "0 1px 2px rgba(15, 23, 42, 0.08)" : "none",
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="range"
                    data-testid="crop-gap-slider"
                    min={0.5}
                    max={16}
                    step={0.5}
                    value={gapWorld}
                    onChange={(e) => handleChangeGapWorld(Number(e.target.value))}
                    style={{ width: 88, accentColor: "#2563eb", cursor: "pointer" }}
                    title="Tùy chỉnh khoảng cách lời giải giữa các câu"
                  />
                  <span
                    data-testid="crop-gap-value"
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#1d4ed8",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: 6,
                      padding: "2px 7px",
                      minWidth: 44,
                      textAlign: "center",
                    }}
                  >
                    {gapWorld.toFixed(1)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                data-testid="commit-batch-crop-btn"
                disabled={selectedDetectedCount === 0}
                onClick={() => void handleCommitBatch()}
                style={{
                  height: 34,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: selectedDetectedCount > 0 ? "#059669" : "#cbd5e1",
                  color: "#ffffff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: selectedDetectedCount > 0 ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow:
                    selectedDetectedCount > 0
                      ? "0 1px 3px rgba(5, 150, 105, 0.3)"
                      : "none",
                  marginLeft: "auto",
                }}
              >
                <Check size={15} strokeWidth={2.5} />
                <span>Chèn {selectedDetectedCount} câu lên bảng (cách đều)</span>
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {hasValidCrop
                  ? pendingStitchParts.length > 0
                    ? `Đã chọn phần tiếp nối. Bấm Ghép & ghim để nối với ${pendingStitchParts.length} mảnh trước.`
                    : "Đã chọn vùng câu hỏi. Bấm nút bên phải để ghim hoặc nối tiếp sang trang sau."
                  : "Kéo chuột để khoanh tay 1 câu, hoặc dùng nút Tự nhận diện ở trên."}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {hasValidCrop && totalPages > 1 && pageIdx < totalPages - 1 && (
                  <button
                    type="button"
                    data-testid="keep-and-stitch-next-btn"
                    onClick={handleKeepForNextPage}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "1px solid #fcd34d",
                      background: "#fffbeb",
                      color: "#92400e",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Link2 size={13} />
                    <span>Giữ &amp; nối trang sau</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={!hasValidCrop}
                  onClick={() => void handleCommitCrop(false)}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: hasValidCrop ? "#0f172a" : "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: hasValidCrop ? "pointer" : "not-allowed",
                  }}
                >
                  {pendingStitchParts.length > 0 ? "Ghép & cắt tiếp" : "Cắt & cắt tiếp"}
                </button>
                <button
                  type="button"
                  disabled={!hasValidCrop}
                  onClick={() => void handleCommitCrop(true)}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "none",
                    background: hasValidCrop ? "#2563eb" : "#cbd5e1",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: hasValidCrop ? "pointer" : "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Scissors size={13} />
                  <span>{pendingStitchParts.length > 0 ? "Ghép & ghim lên bảng" : "Cắt & ghim lên bảng"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
