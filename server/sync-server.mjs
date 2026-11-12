import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const PORT = Number(process.env.PORT) || 3001;

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_QUERY_AWARENESS = 3;
const ROOM_IDLE_TTL_MS = 10 * 60 * 1000;

/**
 * Safely decodes and sanitizes a room identifier from URL query or path.
 * Strips path-traversal and HTML/script characters while preserving valid UTF-8 room names.
 */
function sanitizeRoomId(raw) {
  if (!raw || typeof raw !== "string") return "default";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const cleaned = decoded
    .replace(/\.{2,}/g, "")
    .replace(/[/\\<>"'`;(){}[\]\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : "default";
}

/**
 * Extracts sanitized roomId from either `?room=<id>` or `/<roomId>`.
 */
function extractRoomId(reqUrl) {
  try {
    const parsed = new URL(reqUrl || "/", "http://localhost");
    const queryRoom = parsed.searchParams.get("room");
    if (queryRoom !== null && queryRoom.trim() !== "") {
      return sanitizeRoomId(queryRoom);
    }
    const rawPath = parsed.pathname.replace(/^\/+/, "");
    if (rawPath.length > 0) {
      return sanitizeRoomId(rawPath);
    }
  } catch {
    // Fallback below
  }
  return "default";
}

/**
 * Normalizes incoming WebSocket message payload into Uint8Array.
 */
function toUint8Array(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return new Uint8Array(Buffer.concat(data));
  return new Uint8Array(data);
}

/**
 * Room registry: roomId -> { name, doc, awareness, conns: Map<WebSocket, Set<number>>, cleanupTimer }
 */
const rooms = new Map();

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (room) {
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }
    return room;
  }

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  // Clear the server's own empty local state so clients never see a phantom server peer.
  awareness.setLocalState(null);

  const conns = new Map();

  doc.on("update", (update, origin) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const payload = encoding.toUint8Array(encoder);

    for (const conn of conns.keys()) {
      if (conn !== origin && conn.readyState === WebSocket.OPEN) {
        conn.send(payload);
      }
    }
  });

  awareness.on("update", ({ added, updated, removed }, origin) => {
    const changedClients = added.concat(updated, removed);
    if (origin instanceof WebSocket) {
      const controlled = conns.get(origin);
      if (controlled) {
        for (const id of added) controlled.add(id);
        for (const id of updated) controlled.add(id);
        for (const id of removed) controlled.delete(id);
      }
    }

    if (changedClients.length === 0) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    const payload = encoding.toUint8Array(encoder);

    for (const conn of conns.keys()) {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(payload);
      }
    }
  });

  room = {
    name: roomId,
    doc,
    awareness,
    conns,
    cleanupTimer: null,
  };
  rooms.set(roomId, room);
  return room;
}

function scheduleRoomCleanup(room) {
  if (room.conns.size > 0 || room.cleanupTimer) return;
  room.cleanupTimer = setTimeout(() => {
    if (room.conns.size === 0) {
      room.awareness.destroy();
      room.doc.destroy();
      rooms.delete(room.name);
    }
  }, ROOM_IDLE_TTL_MS);
  if (typeof room.cleanupTimer.unref === "function") {
    room.cleanupTimer.unref();
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(
    JSON.stringify({
      status: "ok",
      server: "mathvera-sync",
      rooms: rooms.size,
    })
  );
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const roomId = extractRoomId(req.url);
  const room = getOrCreateRoom(roomId);

  ws.binaryType = "arraybuffer";
  room.conns.set(ws, new Set());

  let closed = false;
  const closeConnection = () => {
    if (closed) return;
    closed = true;

    const controlledIds = room.conns.get(ws);
    room.conns.delete(ws);

    if (controlledIds && controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        Array.from(controlledIds),
        null
      );
    }

    if (room.conns.size === 0) {
      scheduleRoomCleanup(room);
    }
  };

  // Initiate Yjs sync step 1
  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(syncEncoder, room.doc);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(encoding.toUint8Array(syncEncoder));
  }

  // Send existing remote awareness states to newly joined peer
  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0 && ws.readyState === WebSocket.OPEN) {
    const awEncoder = encoding.createEncoder();
    encoding.writeVarUint(awEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(awarenessStates.keys())
      )
    );
    ws.send(encoding.toUint8Array(awEncoder));
  }

  ws.on("message", (raw) => {
    try {
      const buf = toUint8Array(raw);
      const decoder = decoding.createDecoder(buf);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
        if (encoding.length(encoder) > 1 && ws.readyState === WebSocket.OPEN) {
          ws.send(encoding.toUint8Array(encoder));
        }
      } else if (messageType === MESSAGE_AWARENESS) {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
      } else if (messageType === MESSAGE_QUERY_AWARENESS) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            room.awareness,
            Array.from(room.awareness.getStates().keys())
          )
        );
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(encoding.toUint8Array(encoder));
        }
      }
    } catch (err) {
      console.error("[sync-server] Failed to process message:", err);
    }
  });

  ws.on("close", closeConnection);
  ws.on("error", closeConnection);
});

server.listen(PORT, () => {
  console.log(`[sync-server] Listening on port ${PORT}`);
});
