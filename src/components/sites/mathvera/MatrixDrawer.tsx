"use client";

import React, { useMemo, useState } from "react";
import {
  CognitiveLevel,
  ExamItemData,
  ExamPaperData,
  ExamTopicSpec,
  generateMatrixDocx,
} from "@/lib/exam-export";
import { downloadBlob } from "@/lib/export";

export interface MatrixDrawerProps {
  open: boolean;
  paper: ExamPaperData;
  items: ExamItemData[];
  onClose: () => void;
  onUpdatePaper: (updater: (prev: ExamPaperData) => ExamPaperData) => void;
  onFocusQuestion?: (itemId: string) => void;
}

function formatViDecimal(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace(".", ",");
}

function normalizeLevel(lv?: CognitiveLevel): "nb" | "th" | "vd" | null {
  if (!lv) return null;
  if (lv === "nb") return "nb";
  if (lv === "th") return "th";
  return "vd";
}

export const MatrixDrawer: React.FC<MatrixDrawerProps> = ({
  open,
  paper,
  items,
  onClose,
  onUpdatePaper,
  onFocusQuestion,
}) => {
  const [goalMode, setGoalMode] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [downloading, setDownloading] = useState(false);

  const questions = useMemo(() => {
    let qIdx = 0;
    return items
      .filter((it) => it.kind !== "section" && it.kind !== "space")
      .map((it) => {
        qIdx += 1;
        return { item: it, number: qIdx };
      });
  }, [items]);

  const ptsCfg = paper.matrix?.pts ?? { mcq: 0.25, tf: 1, short: 0.5, essay: 1 };
  const mcqPts = ptsCfg.mcq ?? 0.25;
  const essayPts = ptsCfg.essay ?? 1;

  const stats = useMemo(() => {
    let totalPts = 0;
    let nb = 0;
    let th = 0;
    let vd = 0;
    const unassigned: Array<{ id: string; number: number }> = [];

    for (const { item, number } of questions) {
      const defaultPt = item.kind === "essay" ? essayPts : mcqPts;
      totalPts += item.points ?? defaultPt;
      const lv = normalizeLevel(item.level);
      if (lv === "nb") nb += 1;
      else if (lv === "th") th += 1;
      else if (lv === "vd") vd += 1;
      else unassigned.push({ id: item.id, number });
    }

    const total = questions.length;
    const pct = (c: number) => (total > 0 ? Math.round((c / total) * 100) : 0);

    return {
      total,
      totalPts,
      nb,
      th,
      vd,
      nbPct: pct(nb),
      thPct: pct(th),
      vdPct: pct(vd),
      unassigned,
    };
  }, [questions, mcqPts, essayPts]);

  const topics = useMemo<ExamTopicSpec[]>(() => {
    const existing = paper.matrix?.topics ?? [];
    if (existing.length > 0) return existing;
    return [{ key: "__all__", name: "Cả đề" }];
  }, [paper.matrix?.topics]);

  if (!open) return null;

  const handleAddTopic = () => {
    const trimmed = newTopicName.trim();
    if (!trimmed) return;
    const key = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    onUpdatePaper((prev) => ({
      ...prev,
      matrix: {
        topics: [...(prev.matrix?.topics ?? []), { key, name: trimmed }],
        target: prev.matrix?.target ?? {},
        pts: prev.matrix?.pts ?? { mcq: 0.25, tf: 1, short: 0.5, essay: 1 },
      },
    }));
    setNewTopicName("");
  };

  const handleSetTarget = (cellKey: string, value: number) => {
    const safeVal = Math.max(0, Math.floor(value));
    onUpdatePaper((prev) => ({
      ...prev,
      matrix: {
        topics: prev.matrix?.topics ?? [],
        target: {
          ...(prev.matrix?.target ?? {}),
          [cellKey]: safeVal,
        },
        pts: prev.matrix?.pts ?? { mcq: 0.25, tf: 1, short: 0.5, essay: 1 },
      },
    }));
  };

  const handleSetKindPts = (kind: "mcq" | "essay", val: number) => {
    const safeVal = Number.isFinite(val) && val >= 0 ? val : 0;
    onUpdatePaper((prev) => ({
      ...prev,
      matrix: {
        topics: prev.matrix?.topics ?? [],
        target: prev.matrix?.target ?? {},
        pts: {
          ...(prev.matrix?.pts ?? { mcq: 0.25, tf: 1, short: 0.5, essay: 1 }),
          [kind]: safeVal,
        },
      },
    }));
  };

  const handleDownloadWord = async () => {
    setDownloading(true);
    try {
      const blob = await generateMatrixDocx(paper, items);
      downloadBlob(blob, "ma-tran-de-cv7991.docx");
    } finally {
      setDownloading(false);
    }
  };

  const getCellActual = (
    topicName: string,
    kindGroup: "mcq" | "essay",
    lv: "nb" | "th" | "vd"
  ): number => {
    return questions.filter(({ item }) => {
      const itemTopic = item.topic || "Cả đề";
      const matchTopic =
        topicName === "Cả đề"
          ? !item.topic || item.topic === "Cả đề"
          : itemTopic === topicName;
      const matchKind =
        kindGroup === "essay" ? item.kind === "essay" : item.kind !== "essay";
      const matchLv = normalizeLevel(item.level) === lv;
      return matchTopic && matchKind && matchLv;
    }).length;
  };

  const renderCell = (
    topicKey: string,
    topicName: string,
    kindGroup: "mcq" | "essay",
    lv: "nb" | "th" | "vd"
  ) => {
    const actual = getCellActual(topicName, kindGroup, lv);
    const cellKey = `${topicKey}|${kindGroup}|${lv}`;
    const target = paper.matrix?.target?.[cellKey];

    let cellBg = "transparent";
    if (typeof target === "number" && target > 0) {
      if (actual === target) cellBg = "#dcfce7";
      else if (actual < target) cellBg = "#fef9c3";
      else cellBg = "#fee2e2";
    } else if (goalMode && actual > 0) {
      cellBg = "#f8fafc";
    }

    return (
      <td
        key={cellKey}
        style={{
          borderBottom: "1px solid #e2e8f0",
          borderRight: "1px solid #f1f5f9",
          padding: "5px 4px",
          textAlign: "center",
          fontSize: 12.5,
          background: cellBg,
          color: actual > 0 ? "#0f172a" : "#94a3b8",
          fontWeight: actual > 0 ? 600 : 400,
        }}
      >
        {goalMode ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <input
              type="number"
              min={0}
              max={99}
              aria-label={`Chỉ tiêu ${topicName} ${kindGroup} ${lv}`}
              value={target ?? ""}
              placeholder={String(actual)}
              onChange={(e) => handleSetTarget(cellKey, Number(e.target.value || 0))}
              style={{
                width: 36,
                height: 22,
                textAlign: "center",
                borderRadius: 4,
                border: "1px solid #cbd5e1",
                fontSize: 12,
                background: "#ffffff",
                color: "#0f172a",
              }}
            />
            {typeof target === "number" && target > 0 && (
              <span style={{ fontSize: 10, color: "#475569" }}>
                {actual}/{target}
              </span>
            )}
          </div>
        ) : actual > 0 ? (
          actual
        ) : (
          "·"
        )}
      </td>
    );
  };

  return (
    <aside
      data-wb-drawer="matrix"
      data-wb-matrix="true"
      className="wb-matrix-drawer"
      aria-label="Ma trận đề thi CV 7991"
      style={{
        position: "fixed",
        top: 46,
        right: 0,
        bottom: 0,
        width: "min(620px, calc(100vw - 40px))",
        zIndex: 95,
        background: "#ffffff",
        borderLeft: "1px solid #cbd5e1",
        boxShadow: "-8px 0 30px rgba(15, 23, 42, 0.14)",
        display: "flex",
        flexDirection: "column",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
          <span>📊</span>
          <span>Ma trận đề</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            data-wb-mx-goalmode="true"
            onClick={() => setGoalMode((prev) => !prev)}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 7,
              border: goalMode ? "1px solid #2563eb" : "1px solid #cbd5e1",
              background: goalMode ? "#eff6ff" : "#ffffff",
              color: goalMode ? "#1d4ed8" : "#334155",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🎯 Đặt chỉ tiêu
          </button>
          <button
            type="button"
            data-wb-mx-download="true"
            disabled={downloading}
            onClick={handleDownloadWord}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 7,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {downloading ? "Đang tạo…" : "⬇ Word"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ma trận"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "#475569",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Summary Bar */}
        <div
          data-wb-mx-sum="true"
          style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}
        >
          <strong>{stats.total}</strong> câu ·{" "}
          <strong>{formatViDecimal(stats.totalPts)}</strong> điểm · Biết{" "}
          <strong>{stats.nb}</strong> câu ({stats.nbPct}%) · Hiểu{" "}
          <strong>{stats.th}</strong> câu ({stats.thPct}%) · Vận dụng{" "}
          <strong>{stats.vd}</strong> câu ({stats.vdPct}%)
        </div>

        {/* Stacked Cognitive Progress Bar */}
        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: "#e2e8f0",
            overflow: "hidden",
            display: "flex",
          }}
        >
          {stats.nbPct > 0 && (
            <div style={{ width: `${stats.nbPct}%`, background: "#0ea5e9" }} />
          )}
          {stats.thPct > 0 && (
            <div style={{ width: `${stats.thPct}%`, background: "#8b5cf6" }} />
          )}
          {stats.vdPct > 0 && (
            <div style={{ width: `${stats.vdPct}%`, background: "#f97316" }} />
          )}
        </div>

        {/* Unassigned Questions Alert */}
        {stats.unassigned.length > 0 && (
          <div
            data-wb-mx-nolevel="true"
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12.5,
              color: "#92400e",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <span>{stats.unassigned.length} câu chưa xếp mức độ:</span>
              {stats.unassigned.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onFocusQuestion?.(u.id)}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    border: "1px solid #fcd34d",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Câu {u.number}
                </button>
              ))}
            </div>
            <div style={{ color: "#b45309", fontSize: 12 }}>
              Bấm nhãn &ldquo;Câu n.&rdquo; trên trang để chọn Biết / Hiểu / Vận dụng và chủ đề.
            </div>
          </div>
        )}

        {/* CV 7991 Matrix Table */}
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12.5,
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", color: "#1e293b" }}>
                <th
                  rowSpan={2}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderBottom: "1px solid #cbd5e1",
                    borderRight: "1px solid #e2e8f0",
                    fontWeight: 700,
                  }}
                >
                  Chủ đề
                </th>
                <th
                  colSpan={3}
                  style={{
                    padding: "6px 4px",
                    borderBottom: "1px solid #e2e8f0",
                    borderRight: "1px solid #e2e8f0",
                    fontWeight: 700,
                  }}
                >
                  Nhiều lựa chọn
                </th>
                <th
                  colSpan={3}
                  style={{
                    padding: "6px 4px",
                    borderBottom: "1px solid #e2e8f0",
                    borderRight: "1px solid #e2e8f0",
                    fontWeight: 700,
                  }}
                >
                  Tự luận
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "6px 8px",
                    borderBottom: "1px solid #cbd5e1",
                    fontWeight: 700,
                    width: 60,
                  }}
                >
                  Số câu
                </th>
              </tr>
              <tr style={{ background: "#f8fafc", fontSize: 12 }}>
                <th style={{ padding: "5px 4px", borderBottom: "1px solid #cbd5e1", color: "#0284c7" }}>Biết</th>
                <th style={{ padding: "5px 4px", borderBottom: "1px solid #cbd5e1", color: "#7c3aed" }}>Hiểu</th>
                <th style={{ padding: "5px 4px", borderBottom: "1px solid #cbd5e1", borderRight: "1px solid #e2e8f0", color: "#ea580c" }}>VD</th>
                <th style={{ padding: "5px 4px", borderBottom: "1px solid #cbd5e1", color: "#0284c7" }}>Biết</th>
                <th style={{ padding: "5px 4px", borderBottom: "1px solid #cbd5e1", color: "#7c3aed" }}>Hiểu</th>
                <th style={{ padding: "5px 4px", borderBottom: "1px solid #cbd5e1", borderRight: "1px solid #e2e8f0", color: "#ea580c" }}>VD</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => {
                const rowCount = questions.filter(({ item }) =>
                  topic.name === "Cả đề"
                    ? !item.topic || item.topic === "Cả đề"
                    : item.topic === topic.name
                ).length;

                return (
                  <tr key={topic.key}>
                    <td
                      style={{
                        padding: "6px 10px",
                        borderBottom: "1px solid #e2e8f0",
                        borderRight: "1px solid #e2e8f0",
                        fontStyle: topic.key === "__all__" ? "italic" : "normal",
                        color: topic.key === "__all__" ? "#64748b" : "#0f172a",
                      }}
                    >
                      {topic.name}
                    </td>
                    {renderCell(topic.key, topic.name, "mcq", "nb")}
                    {renderCell(topic.key, topic.name, "mcq", "th")}
                    {renderCell(topic.key, topic.name, "mcq", "vd")}
                    {renderCell(topic.key, topic.name, "essay", "nb")}
                    {renderCell(topic.key, topic.name, "essay", "th")}
                    {renderCell(topic.key, topic.name, "essay", "vd")}
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {rowCount}
                    </td>
                  </tr>
                );
              })}

              {/* Points per question footer row */}
              <tr style={{ background: "#f8fafc" }}>
                <td
                  style={{
                    padding: "7px 10px",
                    borderRight: "1px solid #e2e8f0",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  Điểm mỗi câu
                </td>
                <td colSpan={3} style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    aria-label="Điểm mỗi câu nhiều lựa chọn"
                    value={mcqPts}
                    onChange={(e) => handleSetKindPts("mcq", Number(e.target.value))}
                    style={{
                      width: 68,
                      height: 24,
                      textAlign: "center",
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      background: "#ffffff",
                      fontSize: 12.5,
                    }}
                  />
                </td>
                <td colSpan={3} style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
                  <input
                    type="number"
                    step={0.25}
                    min={0}
                    aria-label="Điểm mỗi câu tự luận"
                    value={essayPts}
                    onChange={(e) => handleSetKindPts("essay", Number(e.target.value))}
                    style={{
                      width: 68,
                      height: 24,
                      textAlign: "center",
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      background: "#ffffff",
                      fontSize: 12.5,
                    }}
                  />
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add Topic Bar */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={newTopicName}
            placeholder="Thêm chủ đề (vd: Hàm số bậc hai)"
            onChange={(e) => setNewTopicName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTopic();
              }
            }}
            style={{
              flex: 1,
              height: 34,
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              color: "#0f172a",
            }}
          />
          <button
            type="button"
            data-wb-mx-addtopic="true"
            onClick={handleAddTopic}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Thêm
          </button>
        </div>

        {/* Help Footnote */}
        <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>
          Mức độ theo CV 7991 (Biết · Hiểu · Vận dụng). Câu ghi &ldquo;(x điểm)&rdquo; sau nhãn thì tính đúng số điểm đó. Mở file LaTeX có mã ID (vd <code>%[2D1N2-3]</code>) thì mức độ và chủ đề tự điền.
        </div>
      </div>
    </aside>
  );
};
