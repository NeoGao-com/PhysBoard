"use client";

export type SimSubject = "physics" | "chemistry" | "math" | "other";

export interface PhetCatalogItem {
  slug: string;
  title: string;
  enTitle: string;
  subject: SimSubject;
  topic: string;
  grade?: string;
}

export interface OfflineSimMeta {
  id: string;
  title: string;
  subject: SimSubject;
  fileName: string;
  sizeBytes: number;
  createdAt: number;
}

interface OfflineSimRecord extends OfflineSimMeta {
  blob: Blob;
}

export interface CustomOnlineSim {
  id: string;
  title: string;
  url: string;
  slug?: string;
  createdAt: number;
}

export interface ActiveSimSession {
  id: string;
  title: string;
  sourceKind: "phet-online" | "custom-online" | "offline-html";
  /** Online URL or Blob URL (for offline-html) */
  iframeSrc: string;
  /** True when iframeSrc was created via URL.createObjectURL and must be revoked on close */
  isBlobUrl: boolean;
  /** Original offline record id (for reload support) */
  offlineId?: string;
  /** Optional subtitle / topic */
  subtitle?: string;
}

export const SIM_SUBJECT_LABELS: Record<SimSubject | "all", string> = {
  all: "Tất cả",
  physics: "Vật lý",
  chemistry: "Hoá học",
  math: "Toán học",
  other: "Khác",
};

/**
 * Build PhET HTML5 URL using the `_all.html?locale=vi` bundle so PhET automatically
 * falls back to English if Vietnamese strings are missing for a simulation.
 */
export function buildPhetOnlineUrl(slug: string, locale = "vi"): string {
  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `https://phet.colorado.edu/sims/html/${clean}/latest/${clean}_all.html?locale=${encodeURIComponent(locale)}`;
}

/**
 * Parse a user-entered PhET URL, PhET slug, or arbitrary HTTPS simulation URL.
 */
export function parsePhetOrCustomUrl(rawInput: string): {
  url: string;
  title: string;
  slug?: string;
  isPhet: boolean;
} | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Case 1: Bare PhET slug like "pendulum-lab"
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(trimmed)) {
    const slug = trimmed.toLowerCase();
    const matched = PHET_CATALOG.find((item) => item.slug === slug);
    return {
      url: buildPhetOnlineUrl(slug, "vi"),
      title: matched ? matched.title : formatSlugTitle(slug),
      slug,
      isPhet: true,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  // Case 2: PhET domain URL -> extract slug and normalize to `_all.html?locale=vi`
  if (parsed.hostname.includes("phet.colorado.edu")) {
    const htmlMatch = parsed.pathname.match(/\/sims\/html\/([a-z0-9-]+)(?:\/|$)/i);
    const pageMatch = parsed.pathname.match(/\/simulations\/([a-z0-9-]+)(?:\/|$)/i);
    const slug = (htmlMatch?.[1] || pageMatch?.[1] || "").toLowerCase();
    if (slug && slug !== "filter" && slug !== "new" && slug !== "translated") {
      const matched = PHET_CATALOG.find((item) => item.slug === slug);
      return {
        url: buildPhetOnlineUrl(slug, "vi"),
        title: matched ? matched.title : formatSlugTitle(slug),
        slug,
        isPhet: true,
      };
    }
    return {
      url: parsed.toString(),
      title: "Mô phỏng PhET",
      isPhet: true,
    };
  }

  // Case 3: Other HTTPS simulation URL
  return {
    url: parsed.toString(),
    title: parsed.hostname.replace(/^www\./, ""),
    isPhet: false,
  };
}

function formatSlugTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const PHET_CATALOG: PhetCatalogItem[] = [
  // --- VẬT LÝ: Cơ học ---
  {
    slug: "projectile-motion",
    title: "Chuyển động ném xiên",
    enTitle: "Projectile Motion",
    subject: "physics",
    topic: "Cơ học",
    grade: "10",
  },
  {
    slug: "forces-and-motion-basics",
    title: "Lực và Chuyển động: Cơ bản",
    enTitle: "Forces and Motion: Basics",
    subject: "physics",
    topic: "Cơ học",
    grade: "10",
  },
  {
    slug: "energy-skate-park",
    title: "Bảo toàn cơ năng (Trượt ván)",
    enTitle: "Energy Skate Park",
    subject: "physics",
    topic: "Cơ học",
    grade: "10",
  },
  {
    slug: "hookes-law",
    title: "Định luật Hooke & Lực đàn hồi",
    enTitle: "Hooke's Law",
    subject: "physics",
    topic: "Cơ học",
    grade: "10",
  },
  {
    slug: "gravity-and-orbits",
    title: "Lực hấp dẫn và Quỹ đạo",
    enTitle: "Gravity and Orbits",
    subject: "physics",
    topic: "Cơ học",
    grade: "10",
  },
  {
    slug: "density",
    title: "Khối lượng riêng",
    enTitle: "Density",
    subject: "physics",
    topic: "Cơ học chất lưu",
    grade: "10",
  },
  // --- VẬT LÝ: Dao động & Sóng ---
  {
    slug: "pendulum-lab",
    title: "Thí nghiệm Con lắc đơn",
    enTitle: "Pendulum Lab",
    subject: "physics",
    topic: "Dao động",
    grade: "11",
  },
  {
    slug: "masses-and-springs",
    title: "Con lắc lò xo (Khối lượng & Lò xo)",
    enTitle: "Masses and Springs",
    subject: "physics",
    topic: "Dao động",
    grade: "11",
  },
  {
    slug: "wave-on-a-string",
    title: "Sóng trên dây",
    enTitle: "Wave on a String",
    subject: "physics",
    topic: "Sóng cơ",
    grade: "11",
  },
  {
    slug: "wave-interference",
    title: "Giao thoa sóng (Nước, Âm, Ánh sáng)",
    enTitle: "Wave Interference",
    subject: "physics",
    topic: "Sóng & Giao thoa",
    grade: "11",
  },
  // --- VẬT LÝ: Điện & Từ ---
  {
    slug: "circuit-construction-kit-dc",
    title: "Lắp ráp mạch điện một chiều (DC)",
    enTitle: "Circuit Construction Kit: DC",
    subject: "physics",
    topic: "Điện học",
    grade: "11",
  },
  {
    slug: "circuit-construction-kit-ac",
    title: "Lắp ráp mạch điện xoay chiều (AC)",
    enTitle: "Circuit Construction Kit: AC",
    subject: "physics",
    topic: "Điện xoay chiều",
    grade: "12",
  },
  {
    slug: "ohms-law",
    title: "Định luật Ôm",
    enTitle: "Ohm's Law",
    subject: "physics",
    topic: "Điện học",
    grade: "11",
  },
  {
    slug: "charges-and-fields",
    title: "Điện tích và Điện trường",
    enTitle: "Charges and Fields",
    subject: "physics",
    topic: "Tĩnh điện",
    grade: "11",
  },
  {
    slug: "capacitor-lab-basics",
    title: "Tụ điện cơ bản",
    enTitle: "Capacitor Lab: Basics",
    subject: "physics",
    topic: "Tĩnh điện",
    grade: "11",
  },
  {
    slug: "faradays-law",
    title: "Định luật cảm ứng điện từ Faraday",
    enTitle: "Faraday's Law",
    subject: "physics",
    topic: "Từ trường",
    grade: "12",
  },
  // --- VẬT LÝ: Quang học & Nhiệt học ---
  {
    slug: "geometric-optics",
    title: "Quang hình học (Thấu kính & Gương)",
    enTitle: "Geometric Optics",
    subject: "physics",
    topic: "Quang học",
    grade: "11",
  },
  {
    slug: "bending-light",
    title: "Khúc xạ & Phản xạ ánh sáng",
    enTitle: "Bending Light",
    subject: "physics",
    topic: "Quang học",
    grade: "11",
  },
  {
    slug: "gas-properties",
    title: "Tính chất của chất khí (Khí lý tưởng)",
    enTitle: "Gas Properties",
    subject: "physics",
    topic: "Nhiệt học",
    grade: "12",
  },
  {
    slug: "states-of-matter",
    title: "Các trạng thái của vật chất",
    enTitle: "States of Matter",
    subject: "physics",
    topic: "Nhiệt học",
    grade: "12",
  },
  // --- HOÁ HỌC ---
  {
    slug: "build-an-atom",
    title: "Xây dựng nguyên tử",
    enTitle: "Build an Atom",
    subject: "chemistry",
    topic: "Cấu tạo nguyên tử",
    grade: "10",
  },
  {
    slug: "balancing-chemical-equations",
    title: "Cân bằng phương trình hoá học",
    enTitle: "Balancing Chemical Equations",
    subject: "chemistry",
    topic: "Phản ứng hoá học",
    grade: "10",
  },
  {
    slug: "ph-scale",
    title: "Thang đo pH",
    enTitle: "pH Scale",
    subject: "chemistry",
    topic: "Axit - Bazơ",
    grade: "11",
  },
  {
    slug: "concentration",
    title: "Nồng độ dung dịch",
    enTitle: "Concentration",
    subject: "chemistry",
    topic: "Dung dịch",
    grade: "10",
  },
  // --- TOÁN HỌC ---
  {
    slug: "graphing-quadratics",
    title: "Đồ thị hàm số bậc hai",
    enTitle: "Graphing Quadratics",
    subject: "math",
    topic: "Hàm số",
    grade: "10",
  },
  {
    slug: "trig-tour",
    title: "Vòng tròn lượng giác",
    enTitle: "Trig Tour",
    subject: "math",
    topic: "Lượng giác",
    grade: "11",
  },
  {
    slug: "vector-addition",
    title: "Phép cộng vectơ",
    enTitle: "Vector Addition",
    subject: "math",
    topic: "Hình học",
    grade: "10",
  },
  {
    slug: "function-builder",
    title: "Xây dựng hàm số",
    enTitle: "Function Builder",
    subject: "math",
    topic: "Đại số",
    grade: "10",
  },
];

// --- IndexedDB Storage for Offline HTML Simulation Blobs ---
const IDB_NAME = "physboard_sim_lab_v1";
const IDB_VERSION = 1;
const IDB_STORE = "offline_sims";

function openSimDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB không khả dụng trên trình duyệt này."));
      return;
    }
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Không thể mở IndexedDB."));
  });
}

async function extractHtmlTitleFromFile(file: File): Promise<string> {
  const fallback = file.name.replace(/\.(html?|xhtml)$/i, "").replace(/[_-]+/g, " ").trim() || "Thí nghiệm HTML";
  try {
    // Only read the first 16 KB to find <title> without allocating the full file string in RAM
    const headChunk = await file.slice(0, 16384).text();
    const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(headChunk);
    if (match && match[1]) {
      const cleaned = match[1].replace(/\s+/g, " ").trim();
      if (cleaned.length > 0 && cleaned.length <= 120) {
        return cleaned;
      }
    }
  } catch {
    // Ignore parse errors and use filename fallback
  }
  return fallback;
}

export async function listOfflineSims(): Promise<OfflineSimMeta[]> {
  try {
    const db = await openSimDb();
    return await new Promise<OfflineSimMeta[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result as OfflineSimRecord[]) || [];
        const metas: OfflineSimMeta[] = records
          .map(({ id, title, subject, fileName, sizeBytes, createdAt }) => ({
            id,
            title,
            subject: subject || "physics",
            fileName,
            sizeBytes,
            createdAt,
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        resolve(metas);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      };
    });
  } catch {
    return [];
  }
}

export async function saveOfflineSimFile(
  file: File,
  subject: SimSubject = "physics"
): Promise<OfflineSimMeta> {
  const title = await extractHtmlTitleFromFile(file);
  const blob = new Blob([file], { type: "text/html;charset=utf-8" });
  const id = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: OfflineSimRecord = {
    id,
    title,
    subject,
    fileName: file.name,
    sizeBytes: file.size,
    createdAt: Date.now(),
    blob,
  };

  const db = await openSimDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });

  const { blob: _omitted, ...meta } = record;
  void _omitted;
  return meta;
}

export async function getOfflineSimBlob(id: string): Promise<Blob | null> {
  const db = await openSimDb();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const rec = req.result as OfflineSimRecord | undefined;
      if (!rec?.blob) {
        resolve(null);
        return;
      }
      // Ensure correct HTML MIME type so Android WebView renders the Blob URL as HTML
      const htmlBlob =
        rec.blob.type && rec.blob.type.includes("text/html")
          ? rec.blob
          : new Blob([rec.blob], { type: "text/html;charset=utf-8" });
      resolve(htmlBlob);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

export async function deleteOfflineSim(id: string): Promise<void> {
  const db = await openSimDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

export async function renameOfflineSim(id: string, nextTitle: string): Promise<void> {
  const cleanTitle = nextTitle.trim();
  if (!cleanTitle) return;
  const db = await openSimDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result as OfflineSimRecord | undefined;
      if (!rec) {
        resolve();
        return;
      }
      const putReq = store.put({ ...rec, title: cleanTitle });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

// --- Custom Online Bookmarks (lightweight metadata in localStorage) ---
const CUSTOM_ONLINE_KEY = "physboard_phet_bookmarks_v1";

export function listCustomOnlineSims(): CustomOnlineSim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_ONLINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomOnlineSim(item: Omit<CustomOnlineSim, "id" | "createdAt">): CustomOnlineSim[] {
  const current = listCustomOnlineSims();
  const deduped = current.filter((c) => c.url !== item.url);
  const next: CustomOnlineSim[] = [
    {
      id: `online_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      url: item.url,
      slug: item.slug,
      createdAt: Date.now(),
    },
    ...deduped,
  ].slice(0, 30);
  try {
    window.localStorage.setItem(CUSTOM_ONLINE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota issues
  }
  return next;
}

export function deleteCustomOnlineSim(id: string): CustomOnlineSim[] {
  const next = listCustomOnlineSims().filter((c) => c.id !== id);
  try {
    window.localStorage.setItem(CUSTOM_ONLINE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
