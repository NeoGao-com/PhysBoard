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
