"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

const TOP = 5;

const toggleBtnStyle: CSSProperties = {
  marginTop: 8,
  border: "1px solid var(--accent)",
  background: "rgba(27,77,62,0.1)",
  color: "var(--accent)",
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  fontWeight: 800,
  cursor: "pointer",
  width: "min(100%, 320px)",
  boxSizing: "border-box",
};

type ArenaCollapsibleListProps<T> = {
  items: T[];
  getKey: (item: T, index: number) => string;
  renderRow: (item: T, index: number) => ReactNode;
};

export default function ArenaCollapsibleList<T>({ items, getKey, renderRow }: ArenaCollapsibleListProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > TOP;

  return (
    <>
      {items.slice(0, TOP).map((item, i) => (
        <div key={getKey(item, i)}>{renderRow(item, i)}</div>
      ))}
      {hasMore && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateRows: expanded ? "1fr" : "0fr",
              transition: "grid-template-rows 0.38s ease",
            }}
          >
            <div style={{ overflow: "hidden", minHeight: 0 }}>
              <div style={{ display: "grid", gap: 6 }}>
                {items.slice(TOP).map((item, j) => (
                  <div key={getKey(item, TOP + j)}>{renderRow(item, TOP + j)}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <button type="button" className="pressable" style={toggleBtnStyle} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show Less ↑" : "See All →"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
