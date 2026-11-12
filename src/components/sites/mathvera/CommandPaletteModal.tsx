"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  COMMAND_CATEGORY_LABELS,
  type CommandCategory,
  type CommandDescriptor,
  type ShortcutMap,
  eventToShortcutCombo,
  resetAllShortcuts,
  searchCommands,
  setCommandShortcut,
} from "@/lib/commands";

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcutMap: ShortcutMap;
  onShortcutMapChange: (next: ShortcutMap) => void;
  onExecuteCommand: (commandId: string) => void;
  selectedCount?: number;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  ...props
}) => {
  if (!isOpen) return null;
  return <CommandPaletteBody {...props} />;
};

const CommandPaletteBody: React.FC<Omit<CommandPaletteModalProps, "isOpen">> = ({
  onClose,
  shortcutMap,
  onShortcutMapChange,
  onExecuteCommand,
  selectedCount = 0,
}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CommandCategory | "all">("all");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => searchCommands(query, category, shortcutMap),
    [query, category, shortcutMap]
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Shortcut key recording listener
  useEffect(() => {
    if (!recordingId) return;

    const handleCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecordingId(null);
        setNotice("Đã huỷ gán phím tắt.");
        return;
      }

      const combo = eventToShortcutCombo(e);
      if (!combo) return;

      // Guard reserved clipboard/history chords
      if (
        combo === "Ctrl+Z" ||
        combo === "Ctrl+Shift+Z" ||
        combo === "Ctrl+Y" ||
        combo === "Ctrl+C" ||
        combo === "Ctrl+X" ||
        combo === "Ctrl+V" ||
        combo === "Ctrl+A"
      ) {
        setNotice(`Phím ${combo} được dành riêng cho hệ thống.`);
        setRecordingId(null);
        return;
      }

      const { nextMap, replacedCommand } = setCommandShortcut(
        shortcutMap,
        recordingId,
        combo
      );
      onShortcutMapChange(nextMap);
      setRecordingId(null);
      if (replacedCommand) {
        setNotice(
          `Đã gán ${combo} (đã gỡ khỏi "${replacedCommand.label}").`
        );
      } else {
        setNotice(`Đã gán phím tắt ${combo}.`);
      }
      requestAnimationFrame(() => searchInputRef.current?.focus());
    };

    window.addEventListener("keydown", handleCapture, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleCapture, { capture: true });
  }, [recordingId, shortcutMap, onShortcutMapChange]);

  // Modal keyboard navigation when not recording
  useEffect(() => {
    if (recordingId) return;

    const handleNav = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) =>
          filtered.length > 0 ? (i + 1) % filtered.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) =>
          filtered.length > 0 ? (i - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === "Enter") {
        // Only trigger Enter if search input or body is focused (not a clear/bind button)
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === "button") return;
        const target = filtered[highlightIdx];
        if (target) {
          e.preventDefault();
          onExecuteCommand(target.id);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleNav, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleNav, { capture: true });
  }, [
    recordingId,
    filtered,
    highlightIdx,
    onExecuteCommand,
    onClose,
  ]);

  // Keep active row scrolled into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(
      `[data-cmd-index="${highlightIdx}"]`
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  const handleClearShortcut = (
    e: React.MouseEvent,
    cmd: CommandDescriptor
  ) => {
    e.stopPropagation();
    const { nextMap } = setCommandShortcut(shortcutMap, cmd.id, null);
    onShortcutMapChange(nextMap);
    setNotice(`Đã xoá phím tắt của "${cmd.label}".`);
  };

  const handleResetAll = () => {
    const defaults = resetAllShortcuts();
    onShortcutMapChange(defaults);
    setRecordingId(null);
    setNotice("Đã khôi phục toàn bộ phím tắt về mặc định.");
  };

  const categoryBadgeColor: Record<CommandCategory, { bg: string; fg: string }> = {
    tools: { bg: "#eff6ff", fg: "#1d4ed8" },
    plane: { bg: "#ecfdf5", fg: "#047857" },
    space: { bg: "#f5f3ff", fg: "#6d28d9" },
    functions: { bg: "#fff7ed", fg: "#c2410c" },
    physics: { bg: "#ecfeff", fg: "#0e7490" },
    actions: { bg: "#f1f5f9", fg: "#475569" },
  };

  return (
    <div
      data-wb-command-palette="true"
      className="wb-command-palette-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "rgba(15, 23, 42, 0.36)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "56px 16px 24px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cửa sổ lệnh và quản lý phím tắt"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "calc(100vh - 96px)",
          background: "#ffffff",
          borderRadius: 14,
          boxShadow:
            "0 24px 60px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(148, 163, 184, 0.22)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px 8px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "#e8f0fe",
                color: "#1a73e8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ⌘
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              Cửa sổ lệnh & Quản lý phím tắt
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleResetAll}
              title="Đưa tất cả phím tắt về mặc định"
              style={{
                height: 26,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#475569",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              ↺ Khôi phục mặc định
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
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
        </div>

        {/* Search Input */}
        <div style={{ padding: "10px 16px 8px" }}>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIdx(0);
            }}
            placeholder="Tìm chức năng, công cụ hoặc phím tắt (vd: tam giac vuong, duong cao, trong tam, Alt+1)..."
            style={{
              width: "100%",
              height: 38,
              padding: "0 12px",
              borderRadius: 8,
              border: "1.5px solid #cbd5e1",
              outline: "none",
              fontSize: 13.5,
              color: "#0f172a",
              background: "#f8fafc",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category Filter Tabs */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "0 16px 10px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {COMMAND_CATEGORY_LABELS.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id);
                  setHighlightIdx(0);
                }}
                style={{
                  height: 25,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: active ? "#eff6ff" : "#ffffff",
                  color: active ? "#1d4ed8" : "#475569",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Context / Status Banner */}
        {(selectedCount > 0 || notice) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "6px 16px",
              background: notice ? "#f0fdf4" : "#fffbeb",
              borderBottom: "1px solid #e2e8f0",
              fontSize: 12,
              color: notice ? "#166534" : "#92400e",
            }}
          >
            <span>
              {notice ??
                `Đang chọn ${selectedCount} đối tượng — các lệnh Hình phẳng tương ứng sẽ áp dụng trực tiếp.`}
            </span>
            {notice && (
              <button
                type="button"
                onClick={() => setNotice(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#166534",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Command Rows */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "6px 8px",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              Không tìm thấy lệnh nào khớp với &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isHighlighted = idx === highlightIdx;
              const isRecording = recordingId === cmd.id;
              const combo = shortcutMap[cmd.id] ?? null;
              const badge = categoryBadgeColor[cmd.category];

              return (
                <div
                  key={cmd.id}
                  data-cmd-index={idx}
                  data-command-id={cmd.id}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  onClick={() => {
                    if (isRecording) return;
                    onExecuteCommand(cmd.id);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: isRecording
                      ? "#eff6ff"
                      : isHighlighted
                        ? "#f1f5f9"
                        : "transparent",
                    cursor: "pointer",
                    border: isRecording
                      ? "1px solid #60a5fa"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: badge.bg,
                        color: badge.fg,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {cmd.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cmd.label}
                      </div>
                      {cmd.description && (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {cmd.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Shortcut display + Edit / Clear controls */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isRecording ? (
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        Nhấn tổ hợp phím... (Esc huỷ)
                      </span>
                    ) : (
                      <>
                        {combo ? (
                          <kbd
                            style={{
                              padding: "2px 7px",
                              borderRadius: 5,
                              background: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              boxShadow: "0 1px 0 #cbd5e1",
                              color: "#1e293b",
                              fontSize: 11.5,
                              fontWeight: 600,
                              fontFamily: "ui-monospace, monospace",
                            }}
                          >
                            {combo}
                          </kbd>
                        ) : (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            Chưa gán
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecordingId(cmd.id);
                            setNotice(
                              `Đang chờ nhấn phím mới cho "${cmd.label}"...`
                            );
                          }}
                          title="Gán / đổi phím tắt"
                          style={{
                            height: 24,
                            padding: "0 7px",
                            borderRadius: 5,
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            color: "#475569",
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          ✎ Gán
                        </button>

                        {combo && (
                          <button
                            type="button"
                            onClick={(e) => handleClearShortcut(e, cmd)}
                            title="Gỡ phím tắt này"
                            aria-label={`Gỡ phím tắt ${cmd.label}`}
                            style={{
                              width: 22,
                              height: 24,
                              borderRadius: 5,
                              border: "1px solid #fee2e2",
                              background: "#fff5f5",
                              color: "#dc2626",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 16px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            fontSize: 11.5,
            color: "#64748b",
          }}
        >
          <span>
            <strong>↑↓</strong> Chọn · <strong>Enter</strong> Chạy lệnh ·{" "}
            <strong>Ctrl+K</strong> hoặc <strong>?</strong> Mở nhanh
          </span>
          <span>
            Mặc định: <strong>Ctrl+Z/Y</strong> Hoàn tác ·{" "}
            <strong>Ctrl+C/X/V</strong> Chép/Cắt/Dán · <strong>Space+Kéo</strong>{" "}
            Di chuyển
          </span>
        </div>
      </div>
    </div>
  );
};
