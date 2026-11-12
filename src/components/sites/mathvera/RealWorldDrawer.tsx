"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  getRealWorldItem,
  getRecentRealWorldIds,
  REALWORLD_CATEGORIES,
  RealWorldArtItem,
  RealWorldCategory,
  recordRecentRealWorldId,
  searchRealWorldCatalog,
} from "@/lib/realworld-art";

export interface RealWorldDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectIcon: (item: RealWorldArtItem) => void;
  onSelectPicture?: (picture: { src: string; ratio: number }) => void;
}

/**
 * Searchable 100-item Real-World SVG Object Drawer (`[data-wb-drawer="realworld"]`, `.wb-realworld-drawer`, `data-testid="realworld-drawer"`).
 */
export const RealWorldDrawer: React.FC<RealWorldDrawerProps> = (props) => {
  if (!props.open) return null;
  return <RealWorldDrawerContent {...props} />;
};

const RealWorldDrawerContent: React.FC<RealWorldDrawerProps> = ({
  onClose,
  onSelectIcon,
  onSelectPicture,
}) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<RealWorldCategory | "all">("all");
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentRealWorldIds());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredItems = useMemo(
    () => searchRealWorldCatalog(query, activeCategory),
    [query, activeCategory]
  );

  const groupedSections = useMemo(() => {
    return REALWORLD_CATEGORIES.map((cat) => ({
      ...cat,
      items: filteredItems.filter((item) => item.group === cat.id),
    })).filter((sec) => sec.items.length > 0);
  }, [filteredItems]);

  const recentItems = useMemo(
    () => recentIds.map((id) => getRealWorldItem(id)),
    [recentIds]
  );

  const handleChooseItem = (item: RealWorldArtItem) => {
    const nextRecent = recordRecentRealWorldId(item.id);
    setRecentIds(nextRecent);
    onSelectIcon(item);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSelectPicture) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const ratio =
          img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
        onSelectPicture({ src, ratio });
        onClose();
      };
      img.onerror = () => {
        onSelectPicture({ src, ratio: 1 });
        onClose();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <aside
      data-wb-drawer="realworld"
      data-wb-thing-library="true"
      data-testid="realworld-drawer"
      className="wb-realworld-drawer"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        top: 56,
        right: 12,
        bottom: 16,
        width: 420,
        maxWidth: "calc(100vw - 24px)",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 14,
        boxShadow: "0 14px 36px rgba(15, 23, 42, 0.16)",
        zIndex: 75,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 8px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          Chọn vật
        </h2>
        <button
          type="button"
          title="Đóng"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 16,
            color: "#64748b",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: 6,
          }}
        >
          ✕
        </button>
      </div>

      {/* Search + Custom Image Upload */}
      <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm: cây, tháp, thuyền, người..."
          style={{
            width: "100%",
            height: 36,
            padding: "0 12px",
            borderRadius: 8,
            border: "1.5px solid #1e293b",
            fontSize: 13.5,
            outline: "none",
            color: "#0f172a",
            background: "#ffffff",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📷 Tải ảnh của mình
          </button>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            khi không có vật cần dùng
          </span>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Danh mục vật thể thực tế"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            paddingTop: 2,
          }}
        >
          <button
            type="button"
            role="tab"
            className="wb-category-tab"
            aria-selected={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              background: activeCategory === "all" ? "#e8f0fe" : "#f8fafc",
              color: activeCategory === "all" ? "#1a56db" : "#475569",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tất cả
          </button>
          {REALWORLD_CATEGORIES.map((cat) => {
            const selected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                className="wb-category-tab"
                aria-selected={selected}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: selected ? "#e8f0fe" : "#f8fafc",
                  color: selected ? "#1a56db" : "#475569",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Catalog */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Recent Strip */}
        {!query && activeCategory === "all" && recentItems.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                letterSpacing: "0.04em",
                marginBottom: 6,
              }}
            >
              DÙNG GẦN ĐÂY
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {recentItems.map((item) => (
                <ArtTile key={`rec-${item.id}`} item={item} onClick={() => handleChooseItem(item)} />
              ))}
            </div>
          </div>
        )}

        {/* Category Groups */}
        {groupedSections.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13 }}>
            Không tìm thấy vật nào khớp với “{query}”.
          </div>
        ) : (
          groupedSections.map((sec) => (
            <div key={sec.id}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: "0.04em",
                  marginBottom: 6,
                }}
              >
                {sec.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {sec.items.map((item) => (
                  <ArtTile key={item.id} item={item} onClick={() => handleChooseItem(item)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

interface ArtTileProps {
  item: RealWorldArtItem;
  onClick: () => void;
}

const ArtTile: React.FC<ArtTileProps> = ({ item, onClick }) => (
  <button
    type="button"
    data-wb-art-id={item.id}
    title={item.name}
    onClick={onClick}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      padding: "8px 4px",
      borderRadius: 10,
      border: "1px solid #e2e8f0",
      background: "#ffffff",
      cursor: "pointer",
      minHeight: 68,
    }}
  >
    <svg
      width={30}
      height={30}
      viewBox="0 0 32 32"
      style={{ flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: item.svg }}
    />
    <span
      style={{
        fontSize: 11.5,
        color: "#1e293b",
        fontWeight: 500,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {item.name}
    </span>
  </button>
);
