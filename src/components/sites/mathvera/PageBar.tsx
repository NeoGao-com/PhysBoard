"use client";

import React, { useEffect, useState } from "react";
import * as Y from "yjs";

export interface PageState {
  current: number;
  count: number;
}

/**
 * Reads `{ current, count }` from Yjs `Y.Map("pages")` safely.
 */
export function getYjsPageState(doc: Y.Doc): PageState {
  const pagesMap = doc.getMap<number>("pages");
  const rawCount = pagesMap.get("count");
  const rawCur = pagesMap.get("cur");
  const count =
    typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount >= 1
      ? Math.floor(rawCount)
      : 1;
  const cur =
    typeof rawCur === "number" && Number.isFinite(rawCur) && rawCur >= 1
      ? Math.min(count, Math.floor(rawCur))
      : 1;
  return { current: cur, count };
}

/**
 * Updates `cur` inside `Y.Map("pages")` atomically.
 */
export function setYjsCurrentPage(doc: Y.Doc, nextPage: number): void {
  const pagesMap = doc.getMap<number>("pages");
  const { count } = getYjsPageState(doc);
  const clamped = Math.max(1, Math.min(count, Math.floor(nextPage)));
  doc.transact(() => {
    pagesMap.set("count", count);
    pagesMap.set("cur", clamped);
  });
}

/**
 * Appends a new page inside `Y.Map("pages")` (`count + 1`, `cur = count + 1`).
 */
export function addYjsPage(doc: Y.Doc): PageState {
  const pagesMap = doc.getMap<number>("pages");
  const { count } = getYjsPageState(doc);
  const nextCount = count + 1;
  doc.transact(() => {
    pagesMap.set("count", nextCount);
    pagesMap.set("cur", nextCount);
  });
  return { current: nextCount, count: nextCount };
}

/**
 * Deletes specified pages (1-based indices) and cleans up objects & boardConfigs cleanly.
 */
export function deleteYjsPages(doc: Y.Doc, pagesToDelete: number[]): PageState {
  const deleteSet = new Set(pagesToDelete.map((p) => Math.floor(p)).filter((p) => p >= 1));
  if (deleteSet.size === 0) return getYjsPageState(doc);

  const { count, current } = getYjsPageState(doc);
  if (count <= 1) return { count: 1, current: 1 };

  // Calculate new page mappings: for page k, what is its new index? (or 0 if deleted)
  const newPageMap = new Map<number, number>();
  let nextIdx = 1;
  for (let p = 1; p <= count; p++) {
    if (deleteSet.has(p)) {
      newPageMap.set(p, 0);
    } else {
      newPageMap.set(p, nextIdx);
      nextIdx++;
    }
  }

  const finalCount = Math.max(1, nextIdx - 1);

  // Compute what current page should become
  let finalCur = current;
  if (deleteSet.has(current)) {
    // Find closest surviving page
    let candidate = current - 1;
    while (candidate >= 1 && deleteSet.has(candidate)) candidate--;
    if (candidate < 1) {
      candidate = current + 1;
      while (candidate <= count && deleteSet.has(candidate)) candidate++;
    }
    const mapped = newPageMap.get(candidate);
    finalCur = mapped && mapped > 0 ? mapped : 1;
  } else {
    finalCur = newPageMap.get(current) ?? 1;
  }
  finalCur = Math.max(1, Math.min(finalCount, finalCur));

  doc.transact(() => {
    // 1. Process objects array: delete objects on deleted pages; shift meta.page on surviving pages
    const arr = doc.getArray<Y.Map<unknown>>("objects");
    for (let i = arr.length - 1; i >= 0; i--) {
      const yEl = arr.get(i);
      const metaMap = yEl.get("meta");
      let pageNum = 1;
      if (metaMap instanceof Y.Map) {
        const rawP = metaMap.get("page");
        if (typeof rawP === "number" && rawP >= 1) pageNum = Math.floor(rawP);
      } else if (metaMap && typeof metaMap === "object") {
        const rawP = (metaMap as Record<string, unknown>).page;
        if (typeof rawP === "number" && rawP >= 1) pageNum = Math.floor(rawP);
      }

      if (deleteSet.has(pageNum)) {
        arr.delete(i, 1);
      } else {
        const mappedP = newPageMap.get(pageNum);
        if (mappedP && mappedP !== pageNum) {
          if (metaMap instanceof Y.Map) {
            metaMap.set("page", mappedP);
          } else if (metaMap && typeof metaMap === "object") {
            const newMeta = { ...(metaMap as Record<string, unknown>), page: mappedP };
            yEl.set("meta", newMeta);
          }
        }
      }
    }

    // 2. Process boardPages YMap
    const boardPagesMap = doc.getMap<unknown>("boardPages");
    const survivingConfigs: Record<string, unknown> = {};
    for (let p = 1; p <= count; p++) {
      if (!deleteSet.has(p)) {
        const mapped = newPageMap.get(p);
        const existingCfg = boardPagesMap.get(String(p));
        if (mapped && existingCfg !== undefined) {
          survivingConfigs[String(mapped)] = existingCfg;
        }
      }
    }
    boardPagesMap.clear();
    for (const [k, v] of Object.entries(survivingConfigs)) {
      boardPagesMap.set(k, v);
    }

    // 3. Update pages map
    const pagesMap = doc.getMap<number>("pages");
    pagesMap.set("count", finalCount);
    pagesMap.set("cur", finalCur);
  });

  return { current: finalCur, count: finalCount };
}

/**
 * Hook subscribing to `Y.Map("pages")` changes in a Y.Doc.
 */
export function useYjsPages(doc?: Y.Doc | null): PageState {
  const [state, setState] = useState<PageState>(() =>
    doc ? getYjsPageState(doc) : { current: 1, count: 1 }
  );

  useEffect(() => {
    if (!doc) return;
    const pagesMap = doc.getMap<number>("pages");
    const sync = () => setState(getYjsPageState(doc));
    sync();
    pagesMap.observe(sync);
    return () => pagesMap.unobserve(sync);
  }, [doc]);

  return state;
}

export interface PageBarProps {
  current?: number;
  count?: number;
  doc?: Y.Doc | null;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onAddPage?: () => void;
  compact?: boolean;
}

export const PageBar: React.FC<PageBarProps> = ({
  current,
  count,
  doc,
  onPrevPage,
  onNextPage,
  onAddPage,
  compact = false,
}) => {
  const yState = useYjsPages(doc);
  const activeCur = current ?? yState.current;
  const activeCount = count ?? yState.count;

  const handlePrev = () => {
    if (activeCur <= 1) return;
    if (onPrevPage) {
      onPrevPage();
    } else if (doc) {
      setYjsCurrentPage(doc, activeCur - 1);
    }
  };

  const handleNext = () => {
    if (activeCur >= activeCount) return;
    if (onNextPage) {
      onNextPage();
    } else if (doc) {
      setYjsCurrentPage(doc, activeCur + 1);
    }
  };

  const handleAdd = () => {
    if (onAddPage) {
      onAddPage();
    } else if (doc) {
      addYjsPage(doc);
    }
  };

  const btnStyle: React.CSSProperties = {
    height: 26,
    minWidth: 24,
    padding: "0 5px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#334155",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <div
      data-wb-pagebar="true"
      className="wb-pagebar"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: 12.5,
        color: "#475569",
        userSelect: "none",
      }}
    >
      <button
        type="button"
        data-action="prev-page"
        onClick={handlePrev}
        disabled={activeCur <= 1}
        aria-label="Trang trước"
        title="Trang trước"
        style={{
          ...btnStyle,
          opacity: activeCur <= 1 ? 0.35 : 1,
          cursor: activeCur <= 1 ? "default" : "pointer",
        }}
      >
        ‹
      </button>

      <span
        data-wb-page-indicator="true"
        className="wb-page-indicator"
        style={{
          minWidth: 38,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
          color: "#334155",
        }}
      >
        {activeCur} / {activeCount}
      </span>

      <button
        type="button"
        data-action="next-page"
        onClick={handleNext}
        disabled={activeCur >= activeCount}
        aria-label="Trang sau"
        title="Trang sau"
        style={{
          ...btnStyle,
          opacity: activeCur >= activeCount ? 0.35 : 1,
          cursor: activeCur >= activeCount ? "default" : "pointer",
        }}
      >
        ›
      </button>

      <button
        type="button"
        data-action="add-page"
        onClick={handleAdd}
        aria-label="Thêm trang mới"
        title="Thêm trang mới"
        style={{
          ...btnStyle,
          padding: "0 7px",
          fontSize: 12.5,
          fontWeight: 500,
          color: "#1e293b",
          gap: 3,
        }}
      >
        {compact ? "+ " : "+ Trang"}
      </button>
    </div>
  );
};
