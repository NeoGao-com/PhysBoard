"use client";

import { useSyncExternalStore, useCallback } from "react";
import { WhiteboardCommandDispatcher } from "@/lib/dispatcher";

export interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => boolean;
  redo: () => boolean;
}

export function useHistory(
  dispatcher: WhiteboardCommandDispatcher | null
): UseHistoryReturn {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!dispatcher) return () => {};
      const um = dispatcher.undoManager;
      um.on("stack-item-added", onStoreChange);
      um.on("stack-item-popped", onStoreChange);
      return () => {
        um.off("stack-item-added", onStoreChange);
        um.off("stack-item-popped", onStoreChange);
      };
    },
    [dispatcher]
  );

  const getSnapshot = useCallback(() => {
    if (!dispatcher) return 0;
    return (
      dispatcher.undoManager.undoStack.length * 1000 +
      dispatcher.undoManager.redoStack.length
    );
  }, [dispatcher]);

  useSyncExternalStore(subscribe, getSnapshot, () => 0);

  const canUndo = dispatcher ? dispatcher.canUndo() : false;
  const canRedo = dispatcher ? dispatcher.canRedo() : false;

  const undo = useCallback(() => {
    if (!dispatcher) return false;
    return dispatcher.undo();
  }, [dispatcher]);

  const redo = useCallback(() => {
    if (!dispatcher) return false;
    return dispatcher.redo();
  }, [dispatcher]);

  return { canUndo, canRedo, undo, redo };
}
