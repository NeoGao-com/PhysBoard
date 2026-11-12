"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  generateRoomId,
  sanitizeRoomId,
} from "@/lib/room";

export type AuthRole = "student" | "admin";

export interface AuthSession {
  token: string;
  role: AuthRole;
  name: string;
  code?: string;
  org?: string;
  email?: string;
}

export interface BoardSummary {
  id: string;
  name: string;
  createdAt: number;
}

export interface AuthDashboardProps {
  onOpenRoom?: (roomId: string) => void;
  onAuthChange?: (session: AuthSession | null) => void;
  initialRole?: AuthRole;
}

const BOARDS_STORAGE_KEY = "wb_boards";
const DEFAULT_BOARDS: BoardSummary[] = [
  { id: "trial920931", name: "trial920931", createdAt: 1731369600000 },
];

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) return null;
    const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as Partial<AuthSession>;
      return {
        token,
        role: parsed.role === "admin" ? "admin" : "student",
        name:
          typeof parsed.name === "string" && parsed.name.trim()
            ? parsed.name.trim()
            : "Học viên",
        code: typeof parsed.code === "string" ? parsed.code : undefined,
        org: typeof parsed.org === "string" ? parsed.org : undefined,
        email: typeof parsed.email === "string" ? parsed.email : undefined,
      };
    }
    return { token, role: "student", name: "Học viên" };
  } catch {
    return null;
  }
}

export function logoutAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

function loadStoredBoards(): BoardSummary[] {
  if (typeof window === "undefined") return DEFAULT_BOARDS;
  try {
    const raw = window.localStorage.getItem(BOARDS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        BOARDS_STORAGE_KEY,
        JSON.stringify(DEFAULT_BOARDS)
      );
      return DEFAULT_BOARDS;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_BOARDS;
    }
    const valid = parsed.filter(
      (item): item is BoardSummary =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as BoardSummary).id === "string" &&
        typeof (item as BoardSummary).name === "string"
    );
    return valid.length > 0 ? valid : DEFAULT_BOARDS;
  } catch {
    return DEFAULT_BOARDS;
  }
}

function saveStoredBoards(boards: BoardSummary[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
  } catch {
    // Ignore storage errors
  }
}

function persistAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
    window.localStorage.setItem(
      AUTH_USER_STORAGE_KEY,
      JSON.stringify({
        role: session.role,
        name: session.name,
        code: session.code,
        org: session.org,
        email: session.email,
      })
    );
  } catch {
    // Ignore storage errors
  }
}

function PhysBoardLogo() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 64 64"
      fill="none"
      aria-label="PhysBoard"
      style={{ display: "block" }}
    >
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0f172a" />
      <ellipse
        cx="32"
        cy="32"
        rx="20"
        ry="8.5"
        transform="rotate(32 32 32)"
        stroke="#38bdf8"
        strokeWidth="2.4"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="20"
        ry="8.5"
        transform="rotate(-32 32 32)"
        stroke="#2dd4bf"
        strokeWidth="2.4"
      />
      <circle cx="32" cy="32" r="4.5" fill="#f59e0b" />
    </svg>
  );
}

/**
 * PhysBoard Offline Workspace Home Dashboard (`Lớp của tôi`) & Demo Profile Card.
 */
export function AuthDashboard({
  onOpenRoom,
  onAuthChange,
  initialRole = "student",
}: AuthDashboardProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>(DEFAULT_BOARDS);
  const [role, setRole] = useState<AuthRole>(initialRole);
  const [studentCode, setStudentCode] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    const orgParam = params.get("org");
    const emailParam = params.get("email");
    const pwParam = params.get("pw");

    let initialSession = getStoredAuthSession();

    // Support 1-touch URL invite login params (`?code=...&pw=...` or `?org=...&email=...&pw=...`)
    if (!initialSession && codeParam && pwParam !== null) {
      initialSession = {
        token: `demo-student-${Date.now().toString(36)}`,
        role: "student",
        name: codeParam.trim() || "Học viên",
        code: codeParam.trim(),
      };
      persistAuthSession(initialSession);
    } else if (!initialSession && orgParam && emailParam && pwParam !== null) {
      initialSession = {
        token: `demo-admin-${Date.now().toString(36)}`,
        role: "admin",
        name: emailParam.trim() || orgParam.trim() || "Quản trị",
        org: orgParam.trim(),
        email: emailParam.trim(),
      };
      persistAuthSession(initialSession);
    }

    const storedBoards = loadStoredBoards();
    queueMicrotask(() => {
      setSession(initialSession);
      setBoards(storedBoards);
      if (initialSession) {
        onAuthChange?.(initialSession);
      }
    });
  }, [onAuthChange]);

  const navigateToRoom = (rawRoomId: string) => {
    const safeRoom = sanitizeRoomId(rawRoomId);
    if (onOpenRoom) {
      onOpenRoom(safeRoom);
      return;
    }
    router.push(`/?room=${encodeURIComponent(safeRoom)}`);
  };

  const handleCreateBoard = () => {
    const roomId = generateRoomId("board");
    const nextBoard: BoardSummary = {
      id: roomId,
      name: roomId,
      createdAt: Date.now(),
    };
    const nextBoards = [nextBoard, ...boards.filter((b) => b.id !== roomId)];
    setBoards(nextBoards);
    saveStoredBoards(nextBoards);
    navigateToRoom(roomId);
  };

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const nextSession: AuthSession =
      role === "student"
        ? {
            token: `demo-student-${Date.now().toString(36)}`,
            role: "student",
            name: studentCode.trim() || "acme-hs001",
            code: studentCode.trim() || "acme-hs001",
          }
        : {
            token: `demo-admin-${Date.now().toString(36)}`,
            role: "admin",
            name: adminEmail.trim() || orgCode.trim() || "Quản trị viên",
            org: orgCode.trim() || "physboard",
            email: adminEmail.trim() || "teacher@physboard.local",
          };

    persistAuthSession(nextSession);
    const loadedBoards = loadStoredBoards();
    setBoards(loadedBoards);
    setSession(nextSession);
    setSubmitting(false);
    onAuthChange?.(nextSession);
  };

  const handleLogout = () => {
    logoutAuthSession();
    setSession(null);
    setPassword("");
    onAuthChange?.(null);
  };

  if (session) {
    return (
      <div
        data-wb-dashboard="true"
        className="wb-dashboard"
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          padding: "36px 20px",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Lớp của tôi
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                data-action="new-room"
                onClick={handleCreateBoard}
                style={{
                  backgroundColor: "#1d63eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tạo bảng mới
              </button>

              <button
                type="button"
                data-action="logout"
                onClick={handleLogout}
                style={{
                  backgroundColor: "#e2e8f0",
                  color: "#334155",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Đăng xuất
              </button>
            </div>
          </header>

          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              padding: "20px 24px",
              boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                margin: "0 0 14px 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Bảng của tôi ({boards.length})
            </h2>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {boards.map((board, idx) => (
                <div
                  key={board.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom:
                      idx < boards.length - 1 ? "1px solid #f1f5f9" : "none",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0f172a",
                      wordBreak: "break-word",
                    }}
                  >
                    {board.name}
                  </span>

                  <a
                    href={`?room=${encodeURIComponent(board.id)}`}
                    onClick={(event) => {
                      if (onOpenRoom) {
                        event.preventDefault();
                        navigateToRoom(board.id);
                      }
                    }}
                    style={{
                      backgroundColor: "#1d63eb",
                      color: "#ffffff",
                      borderRadius: 8,
                      padding: "7px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mở bảng
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              padding: "20px 24px",
              boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2
              style={{
                margin: "0 0 10px 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Bài học của tôi (0)
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Chưa có bài học nào.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div
      data-wb-auth="true"
      className="wb-auth-page"
      style={{
        minHeight: "100vh",
        backgroundColor: "#eef2f6",
        display: "grid",
        placeItems: "center",
        padding: 16,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          padding: "30px 26px 24px",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <PhysBoardLogo />
        </div>

        <h1
          style={{
            margin: "0 0 4px 0",
            fontSize: 21,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          PhysBoard
        </h1>
        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: 13,
            color: "#64748b",
          }}
        >
          Bảng trắng Toán &amp; Vật lý Offline
        </p>

        <div
          role="tablist"
          aria-label="Loại tài khoản"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={role === "student"}
            onClick={() => setRole("student")}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: role === "student" ? "#1d63eb" : "#e2e8f0",
              color: role === "student" ? "#ffffff" : "#334155",
            }}
          >
            Học viên
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={role === "admin"}
            onClick={() => setRole("admin")}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: role === "admin" ? "#1d63eb" : "#e2e8f0",
              color: role === "admin" ? "#ffffff" : "#334155",
            }}
          >
            Quản trị
          </button>
        </div>

        <form
          onSubmit={handleLoginSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {role === "student" ? (
            <input
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              placeholder="Mã số học viên (vd: acme-hs001)"
              autoComplete="username"
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                color: "#0f172a",
                backgroundColor: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <>
              <input
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value)}
                placeholder="Mã tổ chức"
                autoComplete="organization"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  color: "#0f172a",
                  backgroundColor: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  color: "#0f172a",
                  backgroundColor: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            autoComplete="current-password"
            style={{
              width: "100%",
              height: 40,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              color: "#0f172a",
              backgroundColor: "#ffffff",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              height: 40,
              marginTop: 2,
              borderRadius: 8,
              border: "none",
              backgroundColor: "#1d63eb",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? "..." : "Đăng nhập"}
          </button>
        </form>

        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <button
            type="button"
            data-action="new-room"
            onClick={handleCreateBoard}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#1d63eb",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Bảng mới
          </button>

          <a
            href="?room=default"
            onClick={(event) => {
              if (onOpenRoom) {
                event.preventDefault();
                navigateToRoom("default");
              }
            }}
            style={{
              color: "#475569",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Bắt đầu ngay →
          </a>
        </div>
      </div>
    </div>
  );
}
