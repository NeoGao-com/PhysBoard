"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import katex from "katex";
import { jsPDF } from "jspdf";
import { CanvasElement } from "@/types/whiteboard";
import { readElement } from "@/lib/dispatcher";
import { downloadBlob, downloadText } from "@/lib/export";
import { readImageFile } from "@/lib/pdf-import";
import {
  buildDefaultExamHtml,
  buildDefaultExamPaper,
  CognitiveLevel,
  ExamItemData,
  ExamPaperData,
  exportShuffledExamZip,
  generateExamDocx,
  generateExamTex,
  parseDocxFile,
  parseExamHtmlToItems,
  parseTexFile,
} from "@/lib/exam-export";
import { MatrixDrawer } from "./MatrixDrawer";

export interface ExamEditorProps {
  open: boolean;
  doc?: Y.Doc | null;
  page?: number;
  initialPaper?: Partial<ExamPaperData>;
  whiteboardSlot?: React.ReactNode;
  whiteboardToolbarSlot?: React.ReactNode;
  onClose: () => void;
  onSave?: (paper: ExamPaperData, items: ExamItemData[]) => void;
}

const RTE_COLORS = [
  "#0f172a",
  "#1e40af",
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#64748b",
];

const RTE_HIGHLIGHTS = [
  "transparent",
  "#fef08a",
  "#bbf7d0",
  "#bfdbfe",
  "#fecaca",
  "#e9d5ff",
];

const QUICK_MATH_SYMBOLS = [
  "±",
  "×",
  "÷",
  "≤",
  "≥",
  "≠",
  "≈",
  "∞",
  "∀",
  "∃",
  "∈",
  "∉",
  "⊂",
  "∪",
  "∩",
  "∅",
  "∠",
  "⊥",
  "∥",
  "△",
  "⇒",
  "⇔",
  "π",
  "α",
  "β",
  "Δ",
  "∑",
];

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readExistingExamFromYDoc(doc: Y.Doc): {
  paper: ExamPaperData;
  items: ExamItemData[];
} | null {
  const arr = doc.getArray<Y.Map<unknown>>("objects");
  let foundPaper: ExamPaperData | null = null;
  const foundItems: ExamItemData[] = [];

  for (let i = 0; i < arr.length; i++) {
    const el = readElement(arr.get(i));
    if (el.type === "ExamPaper") {
      const p = el.props as unknown as Partial<ExamPaperData>;
      foundPaper = {
        ...buildDefaultExamPaper(),
        ...p,
      };
    } else if (el.type === "ExamItem") {
      const it = el.props as unknown as Partial<ExamItemData>;
      if (it.id && it.kind) {
        foundItems.push({
          id: it.id,
          paper: it.paper ?? "exam-paper-1",
          kind: it.kind,
          html: it.html ?? "",
          text: it.text,
          options: it.options,
          answer: it.answer,
          answers: it.answers,
          answerText: it.answerText,
          points: it.points,
          level: it.level,
          topic: it.topic,
          lockOrder: it.lockOrder,
          lockOptions: it.lockOptions,
          h: it.h ?? 64,
          figIds: it.figIds,
          texIdCode: it.texIdCode,
          solution: it.solution,
        });
      }
    }
  }

  if (!foundPaper) return null;
  return { paper: foundPaper, items: foundItems };
}

function saveExamToYDoc(
  doc: Y.Doc,
  paper: ExamPaperData,
  items: ExamItemData[],
  pageNumber: number
): void {
  const arr = doc.getArray<Y.Map<unknown>>("objects");
  doc.transact(() => {
    // Remove previous ExamPaper / ExamItem entries
    for (let i = arr.length - 1; i >= 0; i--) {
      const t = arr.get(i).get("type");
      if (t === "ExamPaper" || t === "ExamItem") {
        arr.delete(i, 1);
      }
    }

    const createYElement = (
      id: string,
      type: string,
      propsObj: Record<string, unknown>
    ) => {
      const yEl = new Y.Map<unknown>();
      yEl.set("id", id);
      yEl.set("type", type);

      const tMap = new Y.Map<unknown>();
      tMap.set("x", 0);
      tMap.set("y", 0);
      tMap.set("scale", 1);
      tMap.set("rotation", 0);
      tMap.set("z", 0);
      yEl.set("transform", tMap);

      const sMap = new Y.Map<unknown>();
      sMap.set("hidden", true);
      yEl.set("style", sMap);

      const mMap = new Y.Map<unknown>();
      mMap.set("createdBy", "exam_editor");
      mMap.set("createdAtSeq", Date.now());
      mMap.set("page", pageNumber);
      yEl.set("meta", mMap);

      const pMap = new Y.Map<unknown>();
      for (const [k, v] of Object.entries(propsObj)) {
        if (v !== undefined) pMap.set(k, v);
      }
      yEl.set("props", pMap);
      return yEl;
    };

    const yPaper = createYElement("exam_paper_main", "ExamPaper", {
      ...paper,
      items: items.map((it) => it.id),
    });
    const yItems = items.map((it) =>
      createYElement(it.id, "ExamItem", it as unknown as Record<string, unknown>)
    );
    arr.push([yPaper, ...yItems]);
  });
}

function captureSplitBoardSvgSnapshot(): {
  svgMarkup: string;
  dataUri: string;
  objectIds: string[];
} | null {
  if (typeof document === "undefined") return null;
  const canvases = Array.from(
    document.querySelectorAll<SVGSVGElement>('svg[data-wb-canvas="true"], svg.wb-canvas')
  );
  const svg = canvases[canvases.length - 1];
  if (!svg) return null;

  const content = svg.querySelector<SVGGElement>('g[data-board-content="true"]');
  const objectIds: string[] = [];
  if (content) {
    for (const child of Array.from(content.children)) {
      const id = child.getAttribute("data-id") || child.getAttribute("data-oid");
      if (id) objectIds.push(id);
    }
  }

  let vbX = 0;
  let vbY = 0;
  let vbW = 480;
  let vbH = 300;
  try {
    const ctm = content?.getCTM();
    const bbox = content?.getBBox();
    if (bbox && bbox.width > 1 && bbox.height > 1 && ctm) {
      const pad = 24;
      vbX = bbox.x * ctm.a + ctm.e - pad;
      vbY = bbox.y * ctm.d + ctm.f - pad;
      vbW = Math.max(120, bbox.width * ctm.a + pad * 2);
      vbH = Math.max(90, bbox.height * ctm.d + pad * 2);
    } else {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        vbW = Math.min(540, rect.width);
        vbH = Math.min(340, rect.height);
      }
    }
  } catch {
    // Fallback default viewBox
  }

  const contentHtml = content ? content.outerHTML : "";
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="320" height="${Math.round((320 * vbH) / vbW)}" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;">${contentHtml}</svg>`;
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  return { svgMarkup, dataUri, objectIds };
}

export const ExamEditor: React.FC<ExamEditorProps> = (props) => {
  if (!props.open) return null;
  return <ExamEditorInner {...props} />;
};

const ExamEditorInner: React.FC<ExamEditorProps> = ({
  open,
  doc,
  page = 1,
  initialPaper,
  whiteboardSlot,
  whiteboardToolbarSlot,
  onClose,
  onSave,
}) => {
  const [initialState] = useState(() => {
    const fromDoc = doc ? readExistingExamFromYDoc(doc) : null;
    const basePaper: ExamPaperData = fromDoc
      ? fromDoc.paper
      : {
          ...buildDefaultExamPaper(),
          ...initialPaper,
        };
    const html = basePaper.docHtml || buildDefaultExamHtml();
    const parsedItems =
      fromDoc && fromDoc.items.length > 0
        ? fromDoc.items
        : parseExamHtmlToItems(html);
    return {
      paper: { ...basePaper, docHtml: html },
      items: parsedItems,
    };
  });

  const [paper, setPaper] = useState<ExamPaperData>(() => initialState.paper);
  const [items, setItems] = useState<ExamItemData[]>(() => initialState.items);
  const [dirty, setDirty] = useState(false);
  const [showStartBanner, setShowStartBanner] = useState(true);
  const [isSplitWhiteboard, setIsSplitWhiteboard] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [mixModalOpen, setMixModalOpen] = useState(false);
  const [mixCount, setMixCount] = useState(4);
  const [mixShuffleItems, setMixShuffleItems] = useState(true);
  const [mixShuffleOptions, setMixShuffleOptions] = useState(true);
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaLatex, setFormulaLatex] = useState("\\frac{a}{b}");
  const [rteInsertOpen, setRteInsertOpen] = useState(false);
  const [rteColorOpen, setRteColorOpen] = useState(false);
  const [rteHighlightOpen, setRteHighlightOpen] = useState(false);
  const [scopeAllPage, setScopeAllPage] = useState(false);
  const [qTagTargetId, setQTagTargetId] = useState<string | null>(null);
  const [docSyncKey, setDocSyncKey] = useState(0);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Built-in fallback drawing pad strokes when whiteboardSlot is omitted in split view
  const [fallbackStrokes, setFallbackStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const drawingFallbackRef = useRef(false);

  const rteRef = useRef<HTMLDivElement>(null);
  const headLeftRef = useRef<HTMLDivElement>(null);
  const headRightRef = useRef<HTMLDivElement>(null);
  const stuRef = useRef<HTMLDivElement>(null);
  const wordFileInputRef = useRef<HTMLInputElement>(null);
  const insertImageRef = useRef<HTMLInputElement>(null);

  // Populate contentEditable DOM on mount or explicit import/reload
  useEffect(() => {
    if (!open) return;
    if (rteRef.current) {
      rteRef.current.innerHTML = paper.docHtml || buildDefaultExamHtml();
    }
    if (headLeftRef.current) {
      headLeftRef.current.innerText = paper.headLeft;
    }
    if (headRightRef.current) {
      headRightRef.current.innerText = paper.headRight;
    }
    if (stuRef.current) {
      stuRef.current.innerText = paper.studentHtml || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, docSyncKey]);

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    window.setTimeout(() => setStatusToast(null), 2600);
  }, []);

  const syncItemsFromDom = useCallback(() => {
    const html = rteRef.current?.innerHTML ?? paper.docHtml ?? "";
    setDirty(true);
    setPaper((prev) => ({ ...prev, docHtml: html }));
    setItems((prevItems) => {
      const parsed = parseExamHtmlToItems(html);
      // Preserve manually tagged level/topic/locks if IDs or question text match
      const prevMap = new Map(prevItems.map((it) => [it.id, it]));
      return parsed.map((p) => {
        const old = prevMap.get(p.id);
        return {
          ...p,
          level: p.level ?? old?.level,
          topic: p.topic ?? old?.topic,
          lockOrder: p.lockOrder || old?.lockOrder,
          lockOptions: p.lockOptions || old?.lockOptions,
          figIds: p.figIds ?? old?.figIds,
        };
      });
    });
  }, [paper.docHtml]);

  const runExec = useCallback(
    (command: string, value?: string) => {
      rteRef.current?.focus();
      try {
        document.execCommand(command, false, value);
      } catch {
        // Ignore unsupported execCommand in synthetic environments
      }
      syncItemsFromDom();
    },
    [syncItemsFromDom]
  );

  const insertHtmlAtCursor = useCallback(
    (htmlSnippet: string) => {
      const el = rteRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const temp = document.createElement("div");
        temp.innerHTML = htmlSnippet;
        const frag = document.createDocumentFragment();
        let lastNode: Node | null = null;
        while (temp.firstChild) {
          lastNode = frag.appendChild(temp.firstChild);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        el.insertAdjacentHTML("beforeend", htmlSnippet);
      }
      syncItemsFromDom();
    },
    [syncItemsFromDom]
  );

  const handleInsertFormula = () => {
    const clean = formulaLatex.trim();
    if (!clean) {
      setFormulaModalOpen(false);
      return;
    }
    let rendered = escapeHtmlAttr(clean);
    try {
      rendered = katex.renderToString(clean, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      // Fallback to raw text
    }
    const chipHtml = `<span class="wb-mchip" contenteditable="false" data-latex="${escapeHtmlAttr(clean)}" style="display:inline-flex;align-items:center;padding:1px 6px;margin:0 2px;border-radius:4px;background:#eff6ff;border:1px solid #bfdbfe;">${rendered}</span>&#8203;`;
    insertHtmlAtCursor(chipHtml);
    setFormulaModalOpen(false);
  };

  const handleInsertFigureFromBoard = useCallback(() => {
    const snap = captureSplitBoardSvgSnapshot();
    if (!snap) {
      showToast("Chưa tìm thấy hình trên bảng vẽ.");
      return;
    }
    const idsAttr = escapeHtmlAttr(JSON.stringify(snap.objectIds));
    const figureHtml = `<figure class="wb-exam-fig" contenteditable="false" data-ids="${idsAttr}" style="margin:10px 0;text-align:center;"><img src="${snap.dataUri}" alt="Hình vẽ minh hoạ" style="max-width:340px;height:auto;border-radius:6px;border:1px solid #e2e8f0;" /></figure><p></p>`;
    insertHtmlAtCursor(figureHtml);
    showToast("✓ Đã chèn hình từ bảng vào đề thi.");
  }, [insertHtmlAtCursor, showToast]);

  const handleSaveAndReturn = () => {
    const latestPaper: ExamPaperData = {
      ...paper,
      headLeft: headLeftRef.current?.innerText ?? paper.headLeft,
      headRight: headRightRef.current?.innerText ?? paper.headRight,
      studentHtml: stuRef.current?.innerText ?? paper.studentHtml,
      docHtml: rteRef.current?.innerHTML ?? paper.docHtml,
    };
    if (doc) {
      saveExamToYDoc(doc, latestPaper, items, page);
    }
    onSave?.(latestPaper, items);
    setDirty(false);
    onClose();
  };

  const handleRequestDiscard = () => {
    if (!dirty) {
      onClose();
      return;
    }
    setDiscardDialogOpen(true);
  };

  const handleConfirmDiscard = () => {
    setDiscardDialogOpen(false);
    setDirty(false);
    onClose();
  };

  const handleImportWordOrTex = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".docx")) {
        const res = await parseDocxFile(file);
        const nextHtml = res.html;
        setPaper((prev) => ({
          ...prev,
          ...res.paper,
          docHtml: nextHtml,
        }));
        setItems(res.items);
        setDocSyncKey((k) => k + 1);
        setDirty(true);
        showToast(`✓ Đã mở file Word (${res.items.filter((i) => i.kind !== "section").length} câu).`);
      } else if (lower.endsWith(".tex")) {
        const txt = await file.text();
        const res = parseTexFile(txt);
        const nextHtml = res.html;
        setPaper((prev) => ({
          ...prev,
          ...res.paper,
          docHtml: nextHtml,
        }));
        setItems(res.items);
        setDocSyncKey((k) => k + 1);
        setDirty(true);
        showToast(`✓ Đã mở file LaTeX (${res.items.length} câu).`);
      } else if (file.type.startsWith("image/")) {
        const img = await readImageFile(file);
        insertHtmlAtCursor(
          `<p><img src="${img.src}" alt="${escapeHtmlAttr(file.name)}" style="max-width:360px;height:auto;" /></p>`
        );
      }
    } catch (err) {
      showToast(`⚠ ${err instanceof Error ? err.message : "Không thể đọc file đề."}`);
    }
  };

  const getBoardElementsForExport = (): CanvasElement[] => {
    if (!doc) return [];
    const arr = doc.getArray<Y.Map<unknown>>("objects");
    const out: CanvasElement[] = [];
    for (let i = 0; i < arr.length; i++) {
      out.push(readElement(arr.get(i)));
    }
    return out;
  };

  const handleDownloadExamPdf = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    const plainLines = [
      paper.headLeft.replace(/\n/g, " - "),
      paper.headRight.replace(/\n/g, " - "),
      paper.studentHtml ?? "",
      "",
      ...items.map((it) => it.text || it.html.replace(/<[^>]+>/g, "")),
    ];
    let y = 48;
    for (const rawLine of plainLines) {
      const wrapped = pdf.splitTextToSize(rawLine || " ", 500) as string[];
      for (const l of wrapped) {
        if (y > 790) {
          pdf.addPage();
          y = 48;
        }
        pdf.text(l, 48, y);
        y += 18;
      }
    }
    downloadBlob(pdf.output("blob"), "de-thi.pdf");
    setDownloadMenuOpen(false);
  };

  const handleDownloadWord = async (mathType: boolean) => {
    const blob = await generateExamDocx(paper, items, { mathType });
    downloadBlob(blob, mathType ? "de-thi-mathtype.docx" : "de-thi.docx");
    setDownloadMenuOpen(false);
  };

  const handleDownloadTex = () => {
    const tex = generateExamTex(paper, items, getBoardElementsForExport());
    downloadText(tex, "de-thi.tex", "application/x-tex;charset=utf-8");
    setDownloadMenuOpen(false);
  };

  const handleShuffleDownload = async () => {
    const zipBlob = await exportShuffledExamZip(paper, items, mixCount, {
      shuffleItems: mixShuffleItems,
      shuffleOptions: mixShuffleOptions,
    });
    downloadBlob(zipBlob, `de-thi-${mixCount}-ma.zip`);
    setMixModalOpen(false);
    setDownloadMenuOpen(false);
  };

  const updateQuestionTag = (
    itemId: string,
    patch: {
      level?: CognitiveLevel;
      topic?: string;
      lockOrder?: boolean;
      lockOptions?: boolean;
    }
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it))
    );
    setDirty(true);
  };

  const questionItems = useMemo(() => {
    let idx = 0;
    return items
      .filter((it) => it.kind !== "section" && it.kind !== "space")
      .map((it) => ({ item: it, num: ++idx }));
  }, [items]);

  const activeTagItem = useMemo(
    () => items.find((it) => it.id === qTagTargetId) ?? null,
    [items, qTagTargetId]
  );

  if (!open) return null;

  const toolBtnStyle: React.CSSProperties = {
    height: 28,
    minWidth: 28,
    padding: "0 7px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#334155",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  };

  const dividerV = (
    <div style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 3px" }} />
  );

  const fontPt = paper.fontPt || 12;

  return (
    <div
      data-wb-exam-editor="true"
      className={`wb-exam-editor exam-mode-container${matrixOpen ? " x-mx" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "#e9edf3",
        display: "flex",
        flexDirection: "column",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={wordFileInputRef}
        type="file"
        accept=".docx,.tex,image/*"
        onChange={handleImportWordOrTex}
        style={{ display: "none" }}
      />
      <input
        ref={insertImageRef}
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const img = await readImageFile(f);
          insertHtmlAtCursor(`<p><img src="${img.src}" alt="" style="max-width:340px;height:auto;" /></p>`);
        }}
        style={{ display: "none" }}
      />

      {/* Top Formatting Toolbar (or Split Whiteboard Toolbar Slot) */}
      {isSplitWhiteboard && whiteboardToolbarSlot ? (
        <div style={{ position: "relative", zIndex: 90, height: 48 }}>
          {whiteboardToolbarSlot}
        </div>
      ) : (
        <header
          data-wb-doc-toolbar="true"
          data-wb-rte-toolbar="true"
          className="wb-doc-toolbar"
          style={{
            height: 44,
            background: "#ffffff",
            borderBottom: "1px solid #cbd5e1",
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0 12px",
            overflowX: "auto",
            flexShrink: 0,
            zIndex: 85,
          }}
        >
          <button
            type="button"
            onClick={() => setScopeAllPage((v) => !v)}
            title="Phạm vi định dạng"
            style={{
              ...toolBtnStyle,
              color: "#2563eb",
              background: scopeAllPage ? "#eff6ff" : "transparent",
              fontWeight: 600,
              fontSize: 12.5,
            }}
          >
            {scopeAllPage ? "Cả trang" : "Chữ đang chọn"}
          </button>

          <button type="button" onClick={() => runExec("undo")} title="Hoàn tác" style={toolBtnStyle}>
            ↶
          </button>
          <button type="button" onClick={() => runExec("redo")} title="Làm lại" style={toolBtnStyle}>
            ↷
          </button>

          {dividerV}

          <select
            aria-label="Kiểu đoạn văn"
            defaultValue="P"
            onChange={(e) => runExec("formatBlock", e.target.value)}
            style={{
              height: 28,
              border: "none",
              background: "transparent",
              fontSize: 13,
              color: "#1e293b",
              cursor: "pointer",
            }}
          >
            <option value="P">Văn bản thường</option>
            <option value="H1">Tiêu đề 1</option>
            <option value="H2">Tiêu đề 2</option>
            <option value="H3">Tiêu đề 3</option>
          </select>

          {dividerV}

          <select
            aria-label="Phông chữ"
            value={paper.font || "Times New Roman"}
            onChange={(e) => {
              const f = e.target.value;
              setPaper((prev) => ({ ...prev, font: f }));
              runExec("fontName", f);
            }}
            style={{
              height: 28,
              border: "none",
              background: "transparent",
              fontSize: 13,
              color: "#1e293b",
              cursor: "pointer",
            }}
          >
            <option value="Times New Roman">Times New Roman</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Cambria">Cambria</option>
          </select>

          {dividerV}

          {/* Font size stepper */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <button
              type="button"
              aria-label="Giảm cỡ chữ"
              onClick={() =>
                setPaper((prev) => ({ ...prev, fontPt: Math.max(9, (prev.fontPt || 12) - 1) }))
              }
              style={toolBtnStyle}
            >
              −
            </button>
            <span
              style={{
                minWidth: 28,
                height: 24,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #cbd5e1",
                borderRadius: 5,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {fontPt}
            </span>
            <button
              type="button"
              aria-label="Tăng cỡ chữ"
              onClick={() =>
                setPaper((prev) => ({ ...prev, fontPt: Math.min(16, (prev.fontPt || 12) + 1) }))
              }
              style={toolBtnStyle}
            >
              +
            </button>
          </div>

          {dividerV}

          <button type="button" onClick={() => runExec("bold")} title="In đậm (Ctrl+B)" style={{ ...toolBtnStyle, fontWeight: 700 }}>
            B
          </button>
          <button type="button" onClick={() => runExec("italic")} title="In nghiêng (Ctrl+I)" style={{ ...toolBtnStyle, fontStyle: "italic", fontFamily: "Georgia, serif" }}>
            I
          </button>
          <button type="button" onClick={() => runExec("underline")} title="Gạch chân (Ctrl+U)" style={{ ...toolBtnStyle, textDecoration: "underline" }}>
            U
          </button>
          <button type="button" onClick={() => runExec("strikeThrough")} title="Gạch ngang" style={{ ...toolBtnStyle, textDecoration: "line-through" }}>
            S
          </button>
          <button type="button" onClick={() => runExec("superscript")} title="Chỉ số trên" style={toolBtnStyle}>
            x²
          </button>
          <button type="button" onClick={() => runExec("subscript")} title="Chỉ số dưới" style={toolBtnStyle}>
            x₂
          </button>

          {/* Text Color & Highlight */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setRteColorOpen((v) => !v);
                setRteHighlightOpen(false);
                setRteInsertOpen(false);
              }}
              title="Màu chữ"
              style={{ ...toolBtnStyle, textDecoration: "underline", textDecorationColor: "#dc2626", textDecorationThickness: 2 }}
            >
              A ▾
            </button>
            {rteColorOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 46,
                  left: 420,
                  zIndex: 5200,
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: 8,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 22px)",
                  gap: 6,
                }}
              >
                {RTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      runExec("foreColor", c);
                      setRteColorOpen(false);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      border: "1px solid #cbd5e1",
                      background: c,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setRteHighlightOpen((v) => !v);
                setRteColorOpen(false);
                setRteInsertOpen(false);
              }}
              title="Màu tô nền"
              style={toolBtnStyle}
            >
              🖍 ▾
            </button>
            {rteHighlightOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 46,
                  left: 460,
                  zIndex: 5200,
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: 8,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
                  display: "flex",
                  gap: 6,
                }}
              >
                {RTE_HIGHLIGHTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      runExec("hiliteColor", c);
                      setRteHighlightOpen(false);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      border: "1px solid #cbd5e1",
                      background: c === "transparent" ? "#ffffff" : c,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {dividerV}

          <button type="button" onClick={() => runExec("justifyLeft")} title="Căn trái" style={toolBtnStyle}>
            ≡
          </button>
          <button type="button" onClick={() => runExec("justifyCenter")} title="Căn giữa" style={toolBtnStyle}>
            ≣
          </button>
          <button type="button" onClick={() => runExec("insertUnorderedList")} title="Danh sách gạch đầu dòng" style={toolBtnStyle}>
            •≡
          </button>
          <button type="button" onClick={() => runExec("insertOrderedList")} title="Danh sách đánh số" style={toolBtnStyle}>
            1≡
          </button>
          <button type="button" onClick={() => runExec("outdent")} title="Giảm thụt lề" style={toolBtnStyle}>
            ⇤
          </button>
          <button type="button" onClick={() => runExec("indent")} title="Tăng thụt lề" style={toolBtnStyle}>
            ⇥
          </button>
          <button type="button" onClick={() => runExec("removeFormat")} title="Xoá định dạng" style={toolBtnStyle}>
            Tₓ
          </button>

          {dividerV}

          <button
            type="button"
            onClick={() => setFormulaModalOpen(true)}
            style={{ ...toolBtnStyle, color: "#2563eb", fontWeight: 600 }}
          >
            ƒ Công thức
          </button>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setRteInsertOpen((v) => !v);
                setRteColorOpen(false);
                setRteHighlightOpen(false);
              }}
              style={toolBtnStyle}
            >
              + Chèn ▾
            </button>
            {rteInsertOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 46,
                  right: 80,
                  zIndex: 5200,
                  width: 256,
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  padding: 10,
                  boxShadow: "0 10px 26px rgba(15,23,42,0.16)",
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
                  CHÈN NHANH
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      insertHtmlAtCursor(
                        `<table style="width:100%;border-collapse:collapse;margin:8px 0;"><tr><td style="border:1px solid #cbd5e1;padding:6px;"></td><td style="border:1px solid #cbd5e1;padding:6px;"></td></tr><tr><td style="border:1px solid #cbd5e1;padding:6px;"></td><td style="border:1px solid #cbd5e1;padding:6px;"></td></tr></table>`
                      );
                      setRteInsertOpen(false);
                    }}
                    style={{ ...toolBtnStyle, justifyContent: "flex-start" }}
                  >
                    ▦ Bảng 2 × 2
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertHtmlAtCursor(
                        `<div style="column-count:2;column-gap:20px;margin:6px 0;"><p>Cột 1…</p><p>Cột 2…</p></div>`
                      );
                      setRteInsertOpen(false);
                    }}
                    style={{ ...toolBtnStyle, justifyContent: "flex-start" }}
                  >
                    ▥ Chia 2 cột chữ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertHtmlAtCursor("<hr />");
                      setRteInsertOpen(false);
                    }}
                    style={{ ...toolBtnStyle, justifyContent: "flex-start" }}
                  >
                    ― Đường kẻ ngang
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRteInsertOpen(false);
                      insertImageRef.current?.click();
                    }}
                    style={{ ...toolBtnStyle, justifyContent: "flex-start" }}
                  >
                    🖼 Ảnh từ máy
                  </button>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
                  KÝ HIỆU TOÁN HỌC
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 2 }}>
                  {QUICK_MATH_SYMBOLS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => {
                        insertHtmlAtCursor(sym);
                        setRteInsertOpen(false);
                      }}
                      style={{
                        height: 24,
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        background: "#f8fafc",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Left Floating Action Card */}
      <aside
        data-wb-exam-bar="true"
        style={{
          position: "fixed",
          top: 64,
          left: 12,
          width: 154,
          zIndex: 88,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <button
          type="button"
          data-wb-exam-save="true"
          onClick={handleSaveAndReturn}
          style={{
            height: 34,
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span>💾</span>
          <span>Lưu, về bảng</span>
        </button>

        <button
          type="button"
          onClick={handleRequestDiscard}
          style={{
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "#fee2e2",
            color: "#b91c1c",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span>↩</span>
          <span>Bỏ thay đổi</span>
        </button>

        <button
          type="button"
          data-action="split-whiteboard"
          data-wb-exam-draw="true"
          onClick={() => setIsSplitWhiteboard((v) => !v)}
          style={{
            height: 32,
            borderRadius: 8,
            border: isSplitWhiteboard ? "1px solid #9333ea" : "1px solid #cbd5e1",
            background: isSplitWhiteboard ? "#f3e8ff" : "#ffffff",
            color: isSplitWhiteboard ? "#6b21a8" : "#1e293b",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span>{isSplitWhiteboard ? "✕" : "🖼"}</span>
          <span>{isSplitWhiteboard ? "Đóng bảng vẽ" : "Vẽ hình"}</span>
        </button>

        <button
          type="button"
          data-wb-exam-word="true"
          onClick={() => wordFileInputRef.current?.click()}
          style={{
            height: 32,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#1e293b",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <span>📂</span>
          <span>Mở Word / LaTeX</span>
        </button>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            data-wb-exam-download="true"
            onClick={() => setDownloadMenuOpen((v) => !v)}
            style={{
              width: "100%",
              height: 32,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#1e293b",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span>⬇</span>
            <span>Tải về ▸</span>
          </button>

          {downloadMenuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: 0,
                left: "calc(100% + 8px)",
                width: 230,
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                zIndex: 96,
              }}
            >
              <button
                type="button"
                role="menuitem"
                data-wb-exam-print="docx"
                onClick={() => handleDownloadWord(false)}
                style={{ ...toolBtnStyle, width: "100%", justifyContent: "flex-start", padding: "6px 8px" }}
              >
                📄 File Word (.docx)
              </button>
              <button
                type="button"
                role="menuitem"
                data-wb-exam-print="docx-mt"
                onClick={() => handleDownloadWord(true)}
                style={{ ...toolBtnStyle, width: "100%", justifyContent: "flex-start", padding: "6px 8px" }}
              >
                ∑ File Word, công thức MathType
              </button>
              <button
                type="button"
                role="menuitem"
                data-wb-exam-print="student"
                onClick={handleDownloadExamPdf}
                style={{ ...toolBtnStyle, width: "100%", justifyContent: "flex-start", padding: "6px 8px" }}
              >
                🖨 PDF (in / lưu PDF)
              </button>
              <button
                type="button"
                role="menuitem"
                data-wb-exam-print="tex"
                onClick={handleDownloadTex}
                style={{ ...toolBtnStyle, width: "100%", justifyContent: "flex-start", padding: "6px 8px" }}
              >
                📜 File LaTeX (.tex, ex_test)
              </button>
              <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
              <button
                type="button"
                role="menuitem"
                data-wb-exam-mix="true"
                onClick={() => {
                  setDownloadMenuOpen(false);
                  setMixModalOpen(true);
                }}
                style={{ ...toolBtnStyle, width: "100%", justifyContent: "flex-start", padding: "6px 8px", color: "#2563eb", fontWeight: 600 }}
              >
                🔀 Trộn mã đề…
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Top-Right Matrix Button */}
      {!isSplitWhiteboard && (
        <button
          type="button"
          data-action="open-matrix"
          data-wb-btn="matrix"
          data-wb-exam-matrix="true"
          onClick={() => setMatrixOpen((v) => !v)}
          style={{
            position: "fixed",
            top: 62,
            right: 16,
            zIndex: 88,
            height: 34,
            padding: "0 12px",
            borderRadius: 9,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
            color: "#1e293b",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>📊</span>
          <span>Ma trận</span>
        </button>
      )}

      {/* Main Content Area: Full A4 or 50/50 Split Screen */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Left/Center A4 Document Scroll Pane */}
        <div
          data-wb-exam-doc="true"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const payload = e.dataTransfer.getData("application/x-wb-figure");
            if (payload) {
              insertHtmlAtCursor(payload);
              showToast("✓ Đã thả hình vẽ vào trang đề.");
            } else {
              handleInsertFigureFromBoard();
            }
          }}
          style={{
            flex: isSplitWhiteboard ? "0 0 50%" : "1 1 auto",
            width: isSplitWhiteboard ? "50%" : "100%",
            overflowY: "auto",
            padding: "16px 24px 64px",
            paddingLeft: isSplitWhiteboard ? 180 : 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            borderRight: isSplitWhiteboard ? "2px solid #cbd5e1" : "none",
            boxSizing: "border-box",
          }}
        >
          {/* Startup Helper Banner */}
          {showStartBanner && (
            <div
              data-wb-exam-start="true"
              style={{
                width: "min(794px, 100%)",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 12,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 12.5,
                color: "#1e3a8a",
                boxSizing: "border-box",
              }}
            >
              <strong style={{ whiteSpace: "nowrap" }}>Đã có đề trong Word hoặc LaTeX?</strong>
              <button
                type="button"
                onClick={() => wordFileInputRef.current?.click()}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 7,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                📂 Mở file đề
              </button>
              <span style={{ flex: 1, color: "#475569", lineHeight: 1.4 }}>
                Bảng tự nhận câu hỏi và đáp án (phương án in đậm, tô màu, gạch chân). Hoặc gõ thẳng vào trang mẫu bên dưới.
              </span>
              <button
                type="button"
                onClick={() => setShowStartBanner(false)}
                aria-label="Ẩn gợi ý"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Question Cognitive-Level Tag Strip when Matrix Mode is Active */}
          {matrixOpen && questionItems.length > 0 && (
            <div
              style={{
                width: "min(794px, 100%)",
                background: "#ffffff",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "8px 12px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontWeight: 600, color: "#92400e" }}>Gắn mức độ (CV 7991):</span>
              {questionItems.map(({ item, num }) => {
                const lvLabel =
                  item.level === "nb"
                    ? "Biết"
                    : item.level === "th"
                    ? "Hiểu"
                    : item.level === "vd" || item.level === "vdc"
                    ? "VD"
                    : "? mức độ";
                const lvBg = item.level ? "#e0f2fe" : "#fef3c7";
                const lvColor = item.level ? "#0369a1" : "#92400e";
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="x-q"
                    data-question-id={item.id}
                    onClick={() => setQTagTargetId(item.id)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: lvBg,
                      color: lvColor,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Câu {num}. {lvLabel}
                    {item.topic ? ` · ${item.topic}` : ""}
                  </button>
                );
              })}
            </div>
          )}

          {/* Question Tagging Popover */}
          {activeTagItem && (
            <div
              data-wb-qtag="true"
              style={{
                width: "min(794px, 100%)",
                background: "#ffffff",
                border: "1px solid #93c5fd",
                borderRadius: 10,
                padding: "10px 14px",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 10,
                fontSize: 12.5,
                boxSizing: "border-box",
              }}
            >
              <strong>Phân loại câu:</strong>
              {(
                [
                  { id: "nb", label: "Biết" },
                  { id: "th", label: "Hiểu" },
                  { id: "vd", label: "Vận dụng" },
                ] as const
              ).map((lv) => (
                <button
                  key={lv.id}
                  type="button"
                  onClick={() => updateQuestionTag(activeTagItem.id, { level: lv.id })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border:
                      activeTagItem.level === lv.id
                        ? "1px solid #2563eb"
                        : "1px solid #cbd5e1",
                    background:
                      activeTagItem.level === lv.id ? "#dbeafe" : "#ffffff",
                    color: "#0f172a",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {lv.label}
                </button>
              ))}

              <input
                type="text"
                placeholder="Chủ đề…"
                value={activeTagItem.topic ?? ""}
                onChange={(e) =>
                  updateQuestionTag(activeTagItem.id, { topic: e.target.value })
                }
                style={{
                  height: 28,
                  padding: "0 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 12.5,
                }}
              />

              <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={Boolean(activeTagItem.lockOrder)}
                  onChange={(e) =>
                    updateQuestionTag(activeTagItem.id, { lockOrder: e.target.checked })
                  }
                />
                🔒 Giữ nguyên vị trí
              </label>

              <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={Boolean(activeTagItem.lockOptions)}
                  onChange={(e) =>
                    updateQuestionTag(activeTagItem.id, { lockOptions: e.target.checked })
                  }
                />
                Giữ thứ tự A,B,C,D
              </label>

              <button
                type="button"
                onClick={() => setQTagTargetId(null)}
                style={{
                  marginLeft: "auto",
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                }}
              >
                Xong
              </button>
            </div>
          )}

          {/* A4 Printable Sheet */}
          <div
            style={{
              width: "min(794px, 100%)",
              minHeight: 1080,
              background: "#ffffff",
              boxShadow: "0 3px 18px rgba(15, 23, 42, 0.1)",
              padding: "46px 56px",
              boxSizing: "border-box",
              fontFamily: `"${paper.font || "Times New Roman"}", Times, serif`,
              fontSize: `${fontPt}pt`,
              lineHeight: 1.5,
              color: "#0f172a",
            }}
          >
            {/* Standard MoET Header Template */}
            <div data-wb-exam-header="true" style={{ marginBottom: 14 }}>
              <table
                className="x-head"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: "48%",
                        padding: "8px 10px",
                        borderRight: "1px dashed #cbd5e1",
                        textAlign: "center",
                        verticalAlign: "top",
                        fontWeight: 700,
                      }}
                    >
                      <div
                        ref={headLeftRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={() => {
                          setDirty(true);
                          setPaper((prev) => ({
                            ...prev,
                            headLeft: headLeftRef.current?.innerText ?? prev.headLeft,
                          }));
                        }}
                        style={{ outline: "none", whiteSpace: "pre-wrap" }}
                      />
                    </td>
                    <td
                      style={{
                        width: "52%",
                        padding: "8px 10px",
                        textAlign: "center",
                        verticalAlign: "top",
                        fontWeight: 700,
                      }}
                    >
                      <div
                        ref={headRightRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={() => {
                          setDirty(true);
                          setPaper((prev) => ({
                            ...prev,
                            headRight: headRightRef.current?.innerText ?? prev.headRight,
                          }));
                        }}
                        style={{ outline: "none", whiteSpace: "pre-wrap" }}
                      />
                      <div style={{ fontSize: "0.9em", fontWeight: 700, marginTop: 2 }}>
                        MÃ ĐỀ: 101
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {paper.studentLine && (
                <div
                  ref={stuRef}
                  className="x-stu"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => {
                    setDirty(true);
                    setPaper((prev) => ({
                      ...prev,
                      studentHtml: stuRef.current?.innerText ?? prev.studentHtml,
                    }));
                  }}
                  style={{
                    border: "1px dashed #cbd5e1",
                    borderTop: "none",
                    padding: "6px 10px",
                    outline: "none",
                  }}
                />
              )}
            </div>

            {/* Editable A4 Document Body */}
            <div
              ref={rteRef}
              className="wb-rte"
              contentEditable
              suppressContentEditableWarning
              onInput={syncItemsFromDom}
              onBlur={syncItemsFromDom}
              style={{
                minHeight: 760,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Right 50% Live Whiteboard Split Pane */}
        {isSplitWhiteboard && (
          <div
            style={{
              flex: "0 0 50%",
              width: "50%",
              position: "relative",
              background: "#FBFBFD",
              overflow: "hidden",
            }}
          >
            {whiteboardSlot ? (
              whiteboardSlot
            ) : (
              <svg
                data-wb-canvas="true"
                className="wb-canvas"
                width="100%"
                height="100%"
                onPointerDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  drawingFallbackRef.current = true;
                  setFallbackStrokes((prev) => [
                    ...prev,
                    [{ x: e.clientX - rect.left, y: e.clientY - rect.top }],
                  ]);
                }}
                onPointerMove={(e) => {
                  if (!drawingFallbackRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                  setFallbackStrokes((prev) => {
                    if (prev.length === 0) return prev;
                    const copy = [...prev];
                    copy[copy.length - 1] = [...copy[copy.length - 1], pt];
                    return copy;
                  });
                }}
                onPointerUp={() => {
                  drawingFallbackRef.current = false;
                }}
                style={{ width: "100%", height: "100%", cursor: "crosshair" }}
              >
                <defs>
                  <pattern id="wb-dot-grid" width={24} height={24} patternUnits="userSpaceOnUse">
                    <path d="M24 0H0V24" fill="none" stroke="#e6e8ee" strokeWidth={1} />
                  </pattern>
                </defs>
                <rect x={0} y={0} width="100%" height="100%" fill="url(#wb-dot-grid)" />
                <g data-board-content="true" transform="translate(0 0) scale(1)">
                  {fallbackStrokes.map((pts, idx) => (
                    <polyline
                      key={idx}
                      data-id={`split_stroke_${idx}`}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                    />
                  ))}
                </g>
              </svg>
            )}

            {/* Bottom-right Dark Shot Dock */}
            <div
              data-wb-shot-dock="true"
              style={{
                position: "fixed",
                bottom: 16,
                right: 16,
                zIndex: 92,
                width: 300,
                background: "#0f172a",
                color: "#f8fafc",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.35)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              <div>
                Vẽ hình trên bảng bên phải, rồi <strong>kéo thẳng hình</strong> (hoặc ô dưới đây — lấy cả hình đang thấy) <strong>sang trang đề</strong>, thả đúng chỗ muốn đặt.
              </div>
              <button
                type="button"
                data-action="drag-to-doc"
                data-wb-shot-drag="true"
                draggable
                onDragStart={(e) => {
                  const snap = captureSplitBoardSvgSnapshot();
                  if (snap) {
                    const html = `<figure class="wb-exam-fig" contenteditable="false" data-ids="${escapeHtmlAttr(JSON.stringify(snap.objectIds))}"><img src="${snap.dataUri}" alt="Hình vẽ" style="max-width:340px;height:auto;" /></figure>`;
                    e.dataTransfer.setData("application/x-wb-figure", html);
                    e.dataTransfer.setData("text/html", html);
                  }
                }}
                onClick={handleInsertFigureFromBoard}
                style={{
                  height: 36,
                  borderRadius: 8,
                  border: "1.5px dashed #94a3b8",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>← 🖼</span>
                <span>Kéo hình sang trang</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CV 7991 Matrix Drawer */}
      <MatrixDrawer
        open={matrixOpen}
        paper={paper}
        items={items}
        onClose={() => setMatrixOpen(false)}
        onUpdatePaper={(updater) => {
          setPaper((prev) => updater(prev));
          setDirty(true);
        }}
        onFocusQuestion={(id) => setQTagTargetId(id)}
      />

      {/* Discard Confirmation Modal (05-exam-exit-modal.png) */}
      {discardDialogOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 6200,
            background: "rgba(15, 23, 42, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: "min(400px, 100%)",
              background: "#ffffff",
              borderRadius: 14,
              padding: 20,
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.28)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              Bỏ thay đổi?
            </div>
            <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, marginBottom: 18 }}>
              Đề trở về đúng như lúc mở trang này, rồi quay lại bảng. Hình đã vẽ trên bảng vẫn giữ.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setDiscardDialogOpen(false)}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#1e293b",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Bỏ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formula Input Modal */}
      {formulaModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 6200,
            background: "rgba(15, 23, 42, 0.4)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: "min(440px, 100%)",
              background: "#ffffff",
              borderRadius: 12,
              padding: 18,
              boxShadow: "0 18px 44px rgba(15, 23, 42, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>Chèn công thức toán (LaTeX)</div>
            <input
              type="text"
              value={formulaLatex}
              onChange={(e) => setFormulaLatex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleInsertFormula();
                }
              }}
              placeholder="Ví dụ: \frac{-b \pm \sqrt{\Delta}}{2a}"
              style={{
                height: 36,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontFamily: "monospace",
                fontSize: 13.5,
              }}
            />
            <div
              style={{
                minHeight: 44,
                padding: 8,
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(formulaLatex || " ", { throwOnError: false }),
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setFormulaModalOpen(false)}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 7,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleInsertFormula}
                style={{
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 7,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Chèn vào đề
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shuffle Exam Codes Modal (`Trộn mã đề`) */}
      {mixModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 6200,
            background: "rgba(15, 23, 42, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            data-wb-mix="true"
            style={{
              width: "min(420px, 100%)",
              background: "#ffffff",
              borderRadius: 14,
              padding: 20,
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>🔀 Trộn mã đề</div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13.5 }}>
              <span>Số lượng mã đề (1 – 24):</span>
              <input
                type="number"
                min={1}
                max={24}
                value={mixCount}
                onChange={(e) => setMixCount(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                style={{
                  width: 72,
                  height: 32,
                  textAlign: "center",
                  borderRadius: 7,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={mixShuffleItems}
                onChange={(e) => setMixShuffleItems(e.target.checked)}
              />
              Trộn thứ tự câu hỏi (trừ câu đã khoá 🔒)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={mixShuffleOptions}
                onChange={(e) => setMixShuffleOptions(e.target.checked)}
              />
              Trộn đáp án A, B, C, D
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setMixModalOpen(false)}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleShuffleDownload}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⬇ Tải ZIP ({mixCount} mã đề + đáp án)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast feedback */}
      {statusToast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 6300,
            background: "#0f172a",
            color: "#ffffff",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
          }}
        >
          {statusToast}
        </div>
      )}
    </div>
  );
};
