"use client";

import React from "react";
import {
  DEFAULT_SCALE,
  DEFAULT_TX,
  DEFAULT_TY,
  type ViewportTransform,
  worldToScreen,
} from "@/lib/coordinates";
import type { PeerCursor } from "@/hooks/useWhiteboardSync";

export interface PeerCursorsProps {
  peers: PeerCursor[];
  viewport?: ViewportTransform;
  peerCount?: number;
  showCounter?: boolean;
}

const DEFAULT_VIEWPORT: ViewportTransform = {
  tx: DEFAULT_TX,
  ty: DEFAULT_TY,
  scale: DEFAULT_SCALE,
};

/**
 * Renders live remote peer cursors in aligned screen-space coordinates
 * along with an optional active participant counter pill.
 */
export function PeerCursors({
  peers,
  viewport = DEFAULT_VIEWPORT,
  peerCount,
  showCounter = true,
}: PeerCursorsProps) {
  const totalParticipants =
    typeof peerCount === "number" ? peerCount : peers.length + 1;
  const visibleCursors = peers.filter(
    (peer): peer is PeerCursor & { cursor: { x: number; y: number } } =>
      peer.cursor !== null &&
      Number.isFinite(peer.cursor.x) &&
      Number.isFinite(peer.cursor.y)
  );

  return (
    <>
      {showCounter && (
        <div
          data-wb-peer-count="true"
          data-export-skip="true"
          className="wb-peer-counter"
          title={`${totalParticipants} người tham gia`}
          style={{
            position: "fixed",
            bottom: 46,
            right: 12,
            zIndex: 55,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 9999,
            background: "rgba(255, 255, 255, 0.92)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.08)",
            fontSize: 12,
            fontWeight: 600,
            color: "#334155",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#16a34a",
              display: "inline-block",
            }}
          />
          <span>{totalParticipants} người tham gia</span>
        </div>
      )}

      {visibleCursors.map((peer) => {
        const screenPos = worldToScreen(
          peer.cursor.x,
          peer.cursor.y,
          viewport.tx,
          viewport.ty,
          viewport.scale
        );

        return (
          <div
            key={peer.clientId}
            data-wb-peer-cursor="true"
            data-client-id={peer.clientId}
            data-color={peer.color}
            data-export-skip="true"
            className="wb-peer-cursor"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate3d(${screenPos.screenX}px, ${screenPos.screenY}px, 0)`,
              color: peer.color,
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 45,
              transition: "transform 60ms linear",
              willChange: "transform",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
              style={{
                display: "block",
                filter: "drop-shadow(0 1px 2px rgba(15, 23, 42, 0.25))",
              }}
            >
              <path
                d="M2.2 1.8L7.1 15.2L9.5 9.6L15.1 7.2L2.2 1.8Z"
                fill={peer.color}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span
              data-wb-peer-label="true"
              className="wb-peer-label"
              style={{
                display: "inline-block",
                marginLeft: 12,
                marginTop: -2,
                padding: "2px 7px",
                borderRadius: 9999,
                backgroundColor: peer.color,
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 600,
                lineHeight: "15px",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.16)",
              }}
            >
              {peer.name}
            </span>
          </div>
        );
      })}
    </>
  );
}
