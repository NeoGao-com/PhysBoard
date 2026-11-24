"use client";

import { useCallback, useEffect } from "react";
import { matchCommandForKeyEvent, type ShortcutMap } from "@/lib/commands";
import type { CanvasElement, WhiteboardTool } from "@/types/whiteboard";

function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "math-field" || tag === "select") {
    return true;
  }
  if ((el as HTMLElement).isContentEditable) return true;
  return Boolean(
    el.closest?.("math-field, [data-wb-inplace], [contenteditable='true'], input, textarea")
  );
}

export interface UseKeyboardShortcutsOptions {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  activeTool: WhiteboardTool;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  setOrbitActiveId: (id: string | null) => void;
  pageElements: CanvasElement[];
  hasDraftTwoPt: () => boolean;
  clearDraftTwoPt: () => void;
  draftPolygonLen: number;
  clearDraftPolygon: () => void;
  commitDraftPolygon: () => void;
  pickedItemsLen: number;
  clearPickedItems: () => void;
  setStatusHint: (msg: string | null) => void;
  // Overlay / Modal / Drawer dismissal hooks (shared by Escape & Android Back)
  mathSessionOpen: boolean;
  closeMathSession: () => void;
  shareModalOpen: boolean;
  closeShareModal: () => void;
  realWorldDrawerOpen: boolean;
  closeRealWorldDrawer: () => void;
  physicsDrawerOpen: boolean;
  closePhysicsDrawer: () => void;
  mathDrawerOpen: boolean;
  closeMathDrawer: () => void;
  chemistryDrawerOpen: boolean;
  closeChemistryDrawer: () => void;
  calculatorOpen: boolean;
  closeCalculator: () => void;
  classroomToolsOpen: boolean;
  closeClassroomTools: () => void;
  equationModalOpen: boolean;
  closeEquationModal: () => void;
  simLauncherOpen: boolean;
  closeSimLauncher: () => void;
  activeSimVisible: boolean;
  minimizeActiveSim: () => void;
  questionCropOpen: boolean;
  closeQuestionCrop: () => void;
  exportPdfModalOpen: boolean;
  closeExportPdfModal: () => void;
  settingsModalOpen: boolean;
  closeSettingsModal: () => void;
  boardManagerOpen: boolean;
  closeBoardManager: () => void;
  pageManagerOpen: boolean;
  closePageManager: () => void;
  laserSettingsOpen: boolean;
  closeLaserSettings: () => void;
  featureGuideOpen: boolean;
  closeFeatureGuide: () => void;
  // Actions
  shortcutMap: ShortcutMap;
  clearSolidSubSel?: () => void;
  undo: () => void;
  redo: () => void;
  handleDeleteSelected: () => void;
  handleCopySelected: () => void;
  handleCutSelected: () => void;
  handlePaste: () => void;
  handleSelectTool: (tool: WhiteboardTool) => void;
  executeCommand: (commandId: string) => void;
}

/**
 * Binds global whiteboard keyboard shortcuts and exposes `window.__physboardHandleBack`
 * for Android hardware/gesture Back dismissal of open modals, drawers, and drafts.
 */
export function useKeyboardShortcuts(opts: UseKeyboardShortcutsOptions): void {
  const handleDismissTopLayer = useCallback((): boolean => {
    if (opts.commandPaletteOpen) {
      opts.setCommandPaletteOpen(false);
      return true;
    }
    if (opts.settingsModalOpen) {
      opts.closeSettingsModal();
      return true;
    }
    if (opts.boardManagerOpen) {
      opts.closeBoardManager();
      return true;
    }
    if (opts.questionCropOpen) {
      opts.closeQuestionCrop();
      return true;
    }
    if (opts.exportPdfModalOpen) {
      opts.closeExportPdfModal();
      return true;
    }
    if (opts.pageManagerOpen) {
      opts.closePageManager();
      return true;
    }
    if (opts.laserSettingsOpen) {
      opts.closeLaserSettings();
      return true;
    }
    if (opts.featureGuideOpen) {
      opts.closeFeatureGuide();
      return true;
    }
    if (opts.simLauncherOpen) {
      opts.closeSimLauncher();
      return true;
    }
    if (opts.activeSimVisible) {
      opts.minimizeActiveSim();
      return true;
    }
    if (opts.equationModalOpen) {
      opts.closeEquationModal();
      return true;
    }
    if (opts.mathSessionOpen) {
      opts.closeMathSession();
      return true;
    }
    if (opts.shareModalOpen) {
      opts.closeShareModal();
      return true;
    }
    if (opts.realWorldDrawerOpen) {
      opts.closeRealWorldDrawer();
      return true;
    }
    if (opts.physicsDrawerOpen) {
      opts.closePhysicsDrawer();
      return true;
    }
    if (opts.mathDrawerOpen) {
      opts.closeMathDrawer();
      return true;
    }
    if (opts.chemistryDrawerOpen) {
      opts.closeChemistryDrawer();
      return true;
    }
    if (opts.calculatorOpen) {
      opts.closeCalculator();
      return true;
    }
    if (opts.classroomToolsOpen) {
      opts.closeClassroomTools();
      return true;
    }
    if (opts.hasDraftTwoPt() || opts.draftPolygonLen > 0 || opts.pickedItemsLen > 0) {
      opts.clearDraftTwoPt();
      opts.clearDraftPolygon();
      opts.clearPickedItems();
      opts.setStatusHint(null);
      return true;
    }
    if (opts.selectedIds.length > 0) {
      opts.setSelectedIds([]);
      opts.setOrbitActiveId(null);
      return true;
    }
    if (opts.activeTool && opts.activeTool !== "select") {
      opts.handleSelectTool("select");
      return true;
    }
    return false;
  }, [opts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as { __physboardHandleBack?: () => boolean };
    win.__physboardHandleBack = handleDismissTopLayer;
    return () => {
      if (win.__physboardHandleBack === handleDismissTopLayer) {
        delete win.__physboardHandleBack;
      }
    };
  }, [handleDismissTopLayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(document.activeElement)) return;
      if (opts.commandPaletteOpen) return;

      const isModifier = e.metaKey || e.ctrlKey;
      const lower = e.key.toLowerCase();

      if (isModifier && (lower === "z" || e.code === "KeyZ")) {
        e.preventDefault();
        if (e.shiftKey) opts.redo();
        else opts.undo();
        return;
      }
      if (isModifier && (lower === "y" || e.code === "KeyY")) {
        e.preventDefault();
        opts.redo();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (opts.selectedIds.length > 0) {
          e.preventDefault();
          opts.handleDeleteSelected();
        }
        return;
      }
      if (isModifier && lower === "c") {
        e.preventDefault();
        opts.handleCopySelected();
        return;
      }
      if (isModifier && lower === "x") {
        e.preventDefault();
        opts.handleCutSelected();
        return;
      }
      if (isModifier && lower === "v") {
        e.preventDefault();
        opts.handlePaste();
        return;
      }
      if (isModifier && lower === "a") {
        e.preventDefault();
        opts.clearSolidSubSel?.();
        opts.setOrbitActiveId(null);
        opts.setSelectedIds(
          opts.pageElements
            .filter((el) => !el.style?.hidden && !el.props?.locked && !el.style?.locked)
            .map((el) => el.id)
        );
        return;
      }
      if (e.key === "Enter" && opts.activeTool === "polygon" && opts.draftPolygonLen >= 3) {
        e.preventDefault();
        opts.commitDraftPolygon();
        return;
      }
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        handleDismissTopLayer();
        return;
      }

      if (
        (isModifier && lower === "k") ||
        (!isModifier && !e.altKey && (e.key === "?" || e.key === "/"))
      ) {
        e.preventDefault();
        opts.setCommandPaletteOpen(true);
        return;
      }

      const matchedCmd = matchCommandForKeyEvent(e, opts.shortcutMap);
      if (matchedCmd) {
        e.preventDefault();
        opts.executeCommand(matchedCmd.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opts, handleDismissTopLayer]);
}
