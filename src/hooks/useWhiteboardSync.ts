"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import { Awareness } from "y-protocols/awareness";
import { WhiteboardCommandDispatcher } from "@/lib/dispatcher";
import {
  getClientId,
  getPeerColor,
  getPeerDisplayName,
  getTabId,
  sanitizeRoomId,
} from "@/lib/room";

export interface PeerCursor {
  clientId: number;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

export interface UseWhiteboardSyncOptions {
  userName?: string;
  actorId?: string;
  wsUrl?: string;
  enableTabLock?: boolean;
  onSync?: (synced: boolean) => void;
}

export interface UseWhiteboardSyncReturn {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  awareness: Awareness | null;
  dispatcher: WhiteboardCommandDispatcher;
  isConnected: boolean;
  isSynced: boolean;
  isTabLocked: boolean;
  releaseTabLock: () => void;
  peerCursors: PeerCursor[];
  peerCount: number;
  updateLocalCursor: (worldPos: { x: number; y: number } | null) => void;
}

type TabLockMessage =
  | {
      type: "probe";
      tabId: string;
      startedAt: number;
    }
  | {
      type: "alive";
      ownerTabId: string;
      ownerStartedAt: number;
      targetTabId?: string;
    }
  | {
      type: "takeover";
      tabId: string;
      startedAt: number;
    }
  | {
      type: "release";
      tabId: string;
    };

const CURSOR_THROTTLE_MS = 45;

function parseAwarenessPeers(awareness: Awareness): {
  remotePeers: PeerCursor[];
  peerCount: number;
} {
  const states = awareness.getStates();
  const remotePeers: PeerCursor[] = [];
  let peerCount = 0;

  states.forEach((rawState, clientId) => {
    if (!rawState || typeof rawState !== "object") return;
    const state = rawState as Record<string, unknown>;
    const rawUser = state.user as Record<string, unknown> | undefined;
    const rawCursor = state.cursor as Record<string, unknown> | undefined;

    const hasUser = Boolean(
      rawUser &&
        (typeof rawUser.name === "string" || typeof rawUser.color === "string")
    );
    if (!hasUser && !rawCursor) return;

    peerCount += 1;

    if (clientId === awareness.clientID) {
      return;
    }

    const name =
      rawUser && typeof rawUser.name === "string" && rawUser.name.trim()
        ? rawUser.name.trim()
        : getPeerDisplayName(clientId);
    const color =
      rawUser && typeof rawUser.color === "string" && rawUser.color.trim()
        ? rawUser.color.trim()
        : getPeerColor(clientId);

    let cursor: { x: number; y: number } | null = null;
    if (
      rawCursor &&
      typeof rawCursor.x === "number" &&
      Number.isFinite(rawCursor.x) &&
      typeof rawCursor.y === "number" &&
      Number.isFinite(rawCursor.y)
    ) {
      cursor = { x: rawCursor.x, y: rawCursor.y };
    }

    remotePeers.push({
      clientId,
      name,
      color,
      cursor,
    });
  });

  return {
    remotePeers,
    peerCount: Math.max(1, peerCount),
  };
}

export function useWhiteboardSync(
  roomId: string,
  options: UseWhiteboardSyncOptions = {}
): UseWhiteboardSyncReturn {
  const safeRoomId = useMemo(() => sanitizeRoomId(roomId), [roomId]);
  const enableTabLock = options.enableTabLock ?? true;
  const resolvedWsUrl =
    options.wsUrl ??
    process.env.NEXT_PUBLIC_WS_URL ??
    "ws://localhost:3001";

  const { doc, dispatcher } = useMemo(() => {
    const ydoc = new Y.Doc();
    const disp = new WhiteboardCommandDispatcher({
      doc: ydoc,
      actor: {
        id: options.actorId ?? "c-pending",
        name: options.userName ?? "Bạn",
      },
    });
    return { doc: ydoc, dispatcher: disp };
    // Intentionally keyed only by safeRoomId so Y.Doc & UndoManager stay stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRoomId]);

  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [wsSynced, setWsSynced] = useState(false);
  const [idbSynced, setIdbSynced] = useState(false);
  const [isTabLocked, setIsTabLocked] = useState(false);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([]);
  const [peerCount, setPeerCount] = useState(1);

  const awarenessRef = useRef<Awareness | null>(null);
  const lockChannelRef = useRef<BroadcastChannel | null>(null);
  const isLockedRef = useRef(false);
  const tabIdRef = useRef<string>("");
  const startedAtRef = useRef<number>(0);
  const lastCursorSentRef = useRef<number>(0);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSyncRef = useRef(options.onSync);

  useEffect(() => {
    onSyncRef.current = options.onSync;
  }, [options.onSync]);

  // Keep actor identity up to date on client without recreating Y.Doc
  useEffect(() => {
    const actorId = options.actorId ?? getClientId();
    const actorName = options.userName ?? getPeerDisplayName();
    dispatcher.actor = {
      id: actorId,
      name: actorName,
    };
  }, [dispatcher, options.actorId, options.userName]);

  // 1. Offline IndexedDB persistence ("whiteboard-v2-<safeRoomId>")
  useEffect(() => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return;
    }

    let disposed = false;
    const persistence = new IndexeddbPersistence(
      `whiteboard-v2-${safeRoomId}`,
      doc
    );

    persistence.whenSynced
      .then(() => {
        if (!disposed) {
          setIdbSynced(true);
        }
      })
      .catch(() => {
        // Ignore IndexedDB quota/private-mode errors gracefully
      });

    return () => {
      disposed = true;
      setIdbSynced(false);
      void persistence.destroy().catch(() => {});
    };
  }, [doc, safeRoomId]);

  // 2. Single-Tab Lock across same-origin tabs via BroadcastChannel + sessionStorage["wb-tab"]
  useEffect(() => {
    if (
      !enableTabLock ||
      typeof window === "undefined" ||
      typeof BroadcastChannel === "undefined"
    ) {
      isLockedRef.current = false;
      return;
    }

    const tabId = getTabId();
    tabIdRef.current = tabId;
    const startedAt = performance.timeOrigin + performance.now();
    startedAtRef.current = startedAt;
    isLockedRef.current = false;

    const channel = new BroadcastChannel(`wb-lock-${safeRoomId}`);
    lockChannelRef.current = channel;

    const setLockedState = (locked: boolean) => {
      isLockedRef.current = locked;
      setIsTabLocked(locked);
    };

    const handleMessage = (event: MessageEvent<TabLockMessage>) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if ("tabId" in msg && msg.tabId === tabId) return;

      if (msg.type === "probe") {
        if (!isLockedRef.current) {
          const reply: TabLockMessage = {
            type: "alive",
            ownerTabId: tabId,
            ownerStartedAt: startedAtRef.current,
            targetTabId: msg.tabId,
          };
          channel.postMessage(reply);
        }
        return;
      }

      if (msg.type === "alive") {
        if (msg.ownerTabId === tabId) return;
        const otherIsOlder =
          msg.ownerStartedAt < startedAtRef.current ||
          (msg.ownerStartedAt === startedAtRef.current &&
            msg.ownerTabId < tabId);
        if (otherIsOlder) {
          setLockedState(true);
        } else if (!isLockedRef.current) {
          const reply: TabLockMessage = {
            type: "alive",
            ownerTabId: tabId,
            ownerStartedAt: startedAtRef.current,
            targetTabId: msg.ownerTabId,
          };
          channel.postMessage(reply);
        }
        return;
      }

      if (msg.type === "takeover") {
        if (msg.tabId !== tabId) {
          setLockedState(true);
        }
      }
    };

    channel.addEventListener("message", handleMessage);

    const probeMsg: TabLockMessage = {
      type: "probe",
      tabId,
      startedAt,
    };
    channel.postMessage(probeMsg);

    const releaseOnUnload = () => {
      if (!isLockedRef.current) {
        try {
          channel.postMessage({ type: "release", tabId } satisfies TabLockMessage);
        } catch {
          // Ignore closed channel
        }
      }
    };

    window.addEventListener("pagehide", releaseOnUnload);
    window.addEventListener("beforeunload", releaseOnUnload);

    return () => {
      releaseOnUnload();
      window.removeEventListener("pagehide", releaseOnUnload);
      window.removeEventListener("beforeunload", releaseOnUnload);
      channel.removeEventListener("message", handleMessage);
      channel.close();
      if (lockChannelRef.current === channel) {
        lockChannelRef.current = null;
      }
    };
  }, [safeRoomId, enableTabLock]);

  const releaseTabLock = useCallback(() => {
    const tabId = tabIdRef.current || getTabId();
    const nowTs = performance.timeOrigin + performance.now();
    startedAtRef.current = nowTs;
    isLockedRef.current = false;
    setIsTabLocked(false);

    if (lockChannelRef.current) {
      try {
        lockChannelRef.current.postMessage({
          type: "takeover",
          tabId,
          startedAt: nowTs,
        } satisfies TabLockMessage);
      } catch {
        // Ignore closed channel
      }
    }
  }, []);

  // 3. WebSocket Sync Provider & Awareness (Disabled by default in 100% Offline PhysBoard mode;
  // opt-in only when NEXT_PUBLIC_ENABLE_SYNC === "1" or an explicit wsUrl is provided)
  useEffect(() => {
    const syncEnabled =
      process.env.NEXT_PUBLIC_ENABLE_SYNC === "1" ||
      Boolean(options.wsUrl);
    if (typeof window === "undefined" || isTabLocked || !syncEnabled) {
      queueMicrotask(() => {
        setProvider(null);
        setAwareness(null);
        setWsConnected(false);
        setWsSynced(syncEnabled ? false : true);
        setPeerCursors([]);
        setPeerCount(1);
      });
      awarenessRef.current = null;
      return;
    }

    let disposed = false;
    const localAwareness = new Awareness(doc);
    awarenessRef.current = localAwareness;

    const localColor = getPeerColor(localAwareness.clientID);
    const localName =
      options.userName ?? getPeerDisplayName(localAwareness.clientID);

    localAwareness.setLocalStateField("user", {
      name: localName,
      color: localColor,
    });

    const initialOnline =
      typeof navigator === "undefined" ? true : navigator.onLine;

    const wsProvider = new WebsocketProvider(
      resolvedWsUrl,
      encodeURIComponent(safeRoomId),
      doc,
      {
        awareness: localAwareness,
        connect: initialOnline,
        disableBc: true,
      }
    );

    queueMicrotask(() => {
      if (disposed) return;
      setIsOnline(initialOnline);
      setProvider(wsProvider);
      setAwareness(localAwareness);
      setWsConnected(wsProvider.wsconnected);
      setWsSynced(wsProvider.synced);
    });

    const handleStatus = (event: {
      status: "connected" | "disconnected" | "connecting";
    }) => {
      if (disposed) return;
      const connected = event.status === "connected";
      setWsConnected(connected);
      if (event.status === "disconnected") {
        setWsSynced(false);
      }
    };

    const handleSync = (synced: boolean) => {
      if (disposed) return;
      setWsSynced(synced);
      onSyncRef.current?.(synced);
    };

    const handleAwarenessChange = () => {
      if (disposed) return;
      const { remotePeers, peerCount: nextCount } =
        parseAwarenessPeers(localAwareness);
      setPeerCursors(remotePeers);
      setPeerCount(nextCount);
    };

    const handleOnline = () => {
      if (disposed) return;
      setIsOnline(true);
      wsProvider.connect();
    };

    const handleOffline = () => {
      if (disposed) return;
      setIsOnline(false);
      setWsConnected(false);
      setWsSynced(false);
      wsProvider.disconnect();
    };

    const handleBeforeUnload = () => {
      localAwareness.setLocalState(null);
    };

    wsProvider.on("status", handleStatus);
    wsProvider.on("sync", handleSync);
    localAwareness.on("change", handleAwarenessChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Sync initial local awareness snapshot asynchronously
    queueMicrotask(handleAwarenessChange);

    return () => {
      disposed = true;
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
      wsProvider.off("status", handleStatus);
      wsProvider.off("sync", handleSync);
      localAwareness.off("change", handleAwarenessChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      localAwareness.setLocalState(null);
      wsProvider.destroy();
      localAwareness.destroy();
      awarenessRef.current = null;
    };
  }, [doc, safeRoomId, resolvedWsUrl, isTabLocked, options.userName, options.wsUrl]);

  // 4. Throttled local cursor awareness updater (~45ms with trailing flush)
  const updateLocalCursor = useCallback(
    (worldPos: { x: number; y: number } | null) => {
      const activeAwareness = awarenessRef.current;
      if (!activeAwareness || isLockedRef.current) return;

      if (worldPos === null) {
        pendingCursorRef.current = null;
        if (cursorTimerRef.current) {
          clearTimeout(cursorTimerRef.current);
          cursorTimerRef.current = null;
        }
        activeAwareness.setLocalStateField("cursor", null);
        return;
      }

      if (!Number.isFinite(worldPos.x) || !Number.isFinite(worldPos.y)) {
        return;
      }

      const now = performance.now();
      const elapsed = now - lastCursorSentRef.current;

      if (elapsed >= CURSOR_THROTTLE_MS) {
        lastCursorSentRef.current = now;
        pendingCursorRef.current = null;
        if (cursorTimerRef.current) {
          clearTimeout(cursorTimerRef.current);
          cursorTimerRef.current = null;
        }
        activeAwareness.setLocalStateField("cursor", {
          x: worldPos.x,
          y: worldPos.y,
        });
        return;
      }

      pendingCursorRef.current = worldPos;
      if (!cursorTimerRef.current) {
        cursorTimerRef.current = setTimeout(() => {
          cursorTimerRef.current = null;
          const target = pendingCursorRef.current;
          pendingCursorRef.current = null;
          if (target && awarenessRef.current && !isLockedRef.current) {
            lastCursorSentRef.current = performance.now();
            awarenessRef.current.setLocalStateField("cursor", {
              x: target.x,
              y: target.y,
            });
          }
        }, CURSOR_THROTTLE_MS - elapsed);
      }
    },
    []
  );

  const isConnected = isOnline && wsConnected && !isTabLocked;
  const isSynced = wsSynced || (idbSynced && !isOnline);

  return {
    doc,
    provider,
    awareness,
    dispatcher,
    isConnected,
    isSynced,
    isTabLocked,
    releaseTabLock,
    peerCursors,
    peerCount,
    updateLocalCursor,
  };
}
