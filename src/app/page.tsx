"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthDashboard } from "@/components/sites/mathvera/AuthDashboard";
import { Whiteboard } from "@/components/sites/mathvera/Whiteboard";
import { parseRoomFromUrl, sanitizeRoomId } from "@/lib/room";

const ACTIVE_BOARD_STORAGE_KEY = "physboard_active_board";

function readInitialLocalBoard(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(ACTIVE_BOARD_STORAGE_KEY);
    return saved && saved.trim() ? sanitizeRoomId(saved) : null;
  } catch {
    return null;
  }
}

function HomeRouter() {
  const searchParams = useSearchParams();
  const hasUrlRoom = searchParams.has("room");
  const [mounted, setMounted] = useState(false);
  const [localRoom, setLocalRoom] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setLocalRoom(readInitialLocalBoard());
  }, []);

  if (hasUrlRoom) {
    const rawRoom = searchParams.get("room");
    const safeRoomId = rawRoom
      ? sanitizeRoomId(rawRoom)
      : parseRoomFromUrl(
          typeof window !== "undefined" ? window.location.search : ""
        );
    return (
      <Whiteboard
        key={safeRoomId}
        roomId={safeRoomId}
        initialRoomId={safeRoomId}
        onGoHome={() => {
          setLocalRoom(null);
          try {
            window.localStorage.removeItem(ACTIVE_BOARD_STORAGE_KEY);
          } catch {
            // ignore
          }
          if (typeof window !== "undefined" && window.location.search) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        }}
      />
    );
  }

  if (!mounted) {
    return <div className="w-full h-full bg-[#FBFBFD]" />;
  }

  if (localRoom) {
    return (
      <Whiteboard
        key={localRoom}
        roomId={localRoom}
        initialRoomId={localRoom}
        onGoHome={() => {
          setLocalRoom(null);
          try {
            window.localStorage.removeItem(ACTIVE_BOARD_STORAGE_KEY);
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  return (
    <AuthDashboard
      onOpenRoom={(roomId) => {
        const safe = sanitizeRoomId(roomId);
        setLocalRoom(safe);
        try {
          window.localStorage.setItem(ACTIVE_BOARD_STORAGE_KEY, safe);
        } catch {
          // ignore
        }
      }}
    />
  );
}

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <Suspense fallback={<div className="w-full h-full bg-[#FBFBFD]" />}>
        <HomeRouter />
      </Suspense>
    </main>
  );
}
