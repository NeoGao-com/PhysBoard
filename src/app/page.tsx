"use client";

import React, { Suspense, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Whiteboard } from "@/components/sites/mathvera/Whiteboard";
import { sanitizeRoomId } from "@/lib/room";

const ACTIVE_BOARD_STORAGE_KEY = "physboard_active_board";
const emptySubscribe = () => () => {};

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
  const rawRoom = searchParams.get("room");
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [localRoom] = useState<string>(() => {
    return readInitialLocalBoard() || "default";
  });

  if (!mounted) {
    return <div className="w-full h-full bg-[#FBFBFD]" />;
  }

  const activeRoomId = rawRoom
    ? sanitizeRoomId(rawRoom)
    : localRoom || "default";

  return (
    <Whiteboard
      key={activeRoomId}
      roomId={activeRoomId}
      initialRoomId={activeRoomId}
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
