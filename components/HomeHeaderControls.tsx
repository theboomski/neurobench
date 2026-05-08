"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type HomeTypeFilter = "all" | "brain" | "game" | "personality";
type HomeSort = "popular" | "latest";

const TAB_COLOR: Record<HomeTypeFilter, string> = {
  all: "var(--text-1)",
  brain: "var(--accent-secondary)",
  game: "var(--accent)",
  personality: "#6c4f3d",
};
const BRACKET_MUSTARD = "#b8860b";
const ARENA_GREEN = "#1B4D3E";

const CATEGORY_TABS: Array<{ id: HomeTypeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "brain", label: "Brain Tests" },
  { id: "game", label: "Games" },
  { id: "personality", label: "Personality" },
];

export default function HomeHeaderControls() {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [mobileBracketOpen, setMobileBracketOpen] = useState(false);
  const [mobileArenaOpen, setMobileArenaOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  const mobileToggleRef = useRef<HTMLDivElement | null>(null);
  const mobileBracketToggleRef = useRef<HTMLDivElement | null>(null);
  const mobileArenaToggleRef = useRef<HTMLDivElement | null>(null);
  const sortToggleRef = useRef<HTMLDivElement | null>(null);
  const isHome = pathname === "/";
  const categoryRaw = sp.get("category");
  const sortRaw = sp.get("sort");
  const category: HomeTypeFilter =
    categoryRaw === "brain" || categoryRaw === "game" || categoryRaw === "personality" ? categoryRaw : "all";
  const sort: HomeSort = sortRaw === "latest" ? "latest" : "popular";
  const selectedCategoryLabel = CATEGORY_TABS.find((x) => x.id === category)?.label ?? "All";

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (mobileToggleRef.current?.contains(target)) return;
      if (mobileBracketToggleRef.current?.contains(target)) return;
      if (mobileArenaToggleRef.current?.contains(target)) return;
      if (sortToggleRef.current?.contains(target)) return;
      setMobileCategoryOpen(false);
      setMobileBracketOpen(false);
      setMobileArenaOpen(false);
      setSortOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  useEffect(() => {
    setMobileCategoryOpen(false);
    setMobileBracketOpen(false);
    setMobileArenaOpen(false);
    setSortOpen(false);
  }, [category, sort]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsCompactHeader(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setQuery = (nextCategory: HomeTypeFilter, nextSort: HomeSort) => {
    const query = new URLSearchParams();
    if (nextCategory !== "all") query.set("category", nextCategory);
    if (nextSort !== "popular") query.set("sort", nextSort);
    const q = query.toString();
    router.replace(q ? `/?${q}` : "/", { scroll: false });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("zazaza-home-query-change", {
          detail: { category: nextCategory, sort: nextSort },
        }),
      );
    }
  };

  return (
    <>
      <div className="home-header-controls" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
      {!isCompactHeader ? (
        <div className="home-header-tabs home-header-tabs-desktop" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.id;
            const accent = TAB_COLOR[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQuery(tab.id, sort)}
                className="pressable home-tab-pill"
                style={{
                  border: "1px solid transparent",
                  borderBottom: active ? `2px solid ${accent}` : "1px solid var(--border)",
                  background: "transparent",
                  color: active ? accent : "var(--text-2)",
                  borderRadius: 0,
                  padding: "7px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            );
          })}
          <Link
            href="/bracket"
            className="pressable"
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: `1px solid ${BRACKET_MUSTARD}`,
              background: "rgba(184,134,11,0.08)",
              color: BRACKET_MUSTARD,
              borderRadius: 999,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Bracket
          </Link>
          <Link
            href="/arena"
            className="pressable"
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: `1px solid ${ARENA_GREEN}`,
              background: "rgba(27,77,62,0.08)",
              color: ARENA_GREEN,
              borderRadius: 999,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Arena
          </Link>
          <Link
            href="/blog"
            className="pressable"
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid var(--border-md)",
              background: "#fff",
              color: "var(--text-2)",
              borderRadius: 999,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Blog
          </Link>
          <Link
            href="/send"
            className="pressable"
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid var(--border-md)",
              background: "#fff",
              color: "var(--text-2)",
              borderRadius: 999,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Fun Sends
          </Link>
        </div>
      ) : (
        <div
          className="home-header-tabs home-header-tabs-mobile"
          style={{
            display: "flex",
            flex: 1,
            minWidth: 0,
            maxWidth: "calc(100% - 220px)",
            gap: 4,
            flexWrap: "nowrap",
            alignItems: "center",
          }}
        >
          {/* Toggle + menu must NOT sit inside an overflow-x container — it clips `position:absolute` dropdowns. */}
          <div ref={mobileToggleRef} style={{ position: "relative", flexShrink: 0, zIndex: 50 }}>
            <button
              type="button"
              onClick={() => setMobileCategoryOpen((v) => !v)}
              className="pressable home-tab-pill"
              style={{
                border: "1px solid var(--border-md)",
                background: "#fff",
                color: TAB_COLOR[category],
                borderRadius: 999,
                padding: "6px 8px",
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              All
              <span aria-hidden style={{ fontSize: 10, opacity: 0.9 }}>{mobileCategoryOpen ? "▲" : "▼"}</span>
            </button>
            {mobileCategoryOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 60,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 156,
                  background: "#fff",
                  border: "1px solid var(--border-md)",
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: "0 12px 24px rgba(26,26,26,0.12)",
                }}
              >
                {CATEGORY_TABS.map((tab) => {
                  const active = category === tab.id;
                  const accent = TAB_COLOR[tab.id];
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setQuery(tab.id, sort)}
                      className="pressable"
                      style={{
                        textAlign: "left",
                        border: active ? `1px solid ${accent}` : "1px solid var(--border)",
                        background: active ? "rgba(27,77,62,0.08)" : "#fff",
                        color: active ? accent : "var(--text-2)",
                        borderRadius: 9,
                        padding: "7px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        fontFamily: "var(--font-body)",
                        cursor: "pointer",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div ref={mobileBracketToggleRef} style={{ position: "relative", flexShrink: 0, zIndex: 50 }}>
            <button
              type="button"
              onClick={() => setMobileBracketOpen((v) => !v)}
              className="pressable home-tab-pill"
              style={{
                border: `1px solid ${BRACKET_MUSTARD}`,
                background: "rgba(184,134,11,0.08)",
                color: BRACKET_MUSTARD,
                borderRadius: 999,
                padding: "6px 8px",
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Bracket
              <span aria-hidden style={{ fontSize: 10, opacity: 0.9 }}>{mobileBracketOpen ? "▲" : "▼"}</span>
            </button>
            {mobileBracketOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 60,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 112,
                  background: "#fff",
                  border: "1px solid var(--border-md)",
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: "0 12px 24px rgba(26,26,26,0.12)",
                }}
              >
                <Link
                  href="/bracket"
                  className="pressable"
                  style={{
                    textAlign: "left",
                    border: `1px solid ${BRACKET_MUSTARD}`,
                    background: "rgba(184,134,11,0.08)",
                    color: BRACKET_MUSTARD,
                    borderRadius: 9,
                    padding: "7px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-body)",
                    textDecoration: "none",
                  }}
                >
                  Bracket
                </Link>
                <Link
                  href="/send"
                  className="pressable"
                  style={{
                    textAlign: "left",
                    border: "1px solid var(--border-md)",
                    background: "#fff",
                    color: "var(--text-2)",
                    borderRadius: 9,
                    padding: "7px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-body)",
                    textDecoration: "none",
                  }}
                >
                  Fun Sends
                </Link>
              </div>
            )}
          </div>
          <div ref={mobileArenaToggleRef} style={{ position: "relative", flexShrink: 0, zIndex: 50 }}>
            <button
              type="button"
              onClick={() => setMobileArenaOpen((v) => !v)}
              className="pressable home-tab-pill"
              style={{
                border: `1px solid ${ARENA_GREEN}`,
                background: "rgba(27,77,62,0.08)",
                color: ARENA_GREEN,
                borderRadius: 999,
                padding: "6px 8px",
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Arena
              <span aria-hidden style={{ fontSize: 10, opacity: 0.9 }}>{mobileArenaOpen ? "▲" : "▼"}</span>
            </button>
            {mobileArenaOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 60,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 112,
                  background: "#fff",
                  border: "1px solid var(--border-md)",
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: "0 12px 24px rgba(26,26,26,0.12)",
                }}
              >
                <Link
                  href="/arena"
                  className="pressable"
                  style={{
                    textAlign: "left",
                    border: `1px solid ${ARENA_GREEN}`,
                    background: "rgba(27,77,62,0.08)",
                    color: ARENA_GREEN,
                    borderRadius: 9,
                    padding: "7px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-body)",
                    textDecoration: "none",
                  }}
                >
                  Arena
                </Link>
                <Link
                  href="/blog"
                  className="pressable"
                  style={{
                    textAlign: "left",
                    border: "1px solid var(--border-md)",
                    background: "#fff",
                    color: "var(--text-2)",
                    borderRadius: 9,
                    padding: "7px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-body)",
                    textDecoration: "none",
                  }}
                >
                  Blog
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={sortToggleRef} style={{ position: "relative", flexShrink: 0, marginLeft: isCompactHeader ? 0 : "auto", zIndex: 50 }}>
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="pressable home-tab-pill"
          style={{
            border: "1px solid var(--border)",
            background: "#fff",
            color: "var(--text-1)",
            borderRadius: 999,
            padding: isCompactHeader ? "6px 8px" : "7px 10px",
            fontSize: isCompactHeader ? 10 : 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {sort === "popular" ? "Popular" : "Latest"}
          <span aria-hidden style={{ fontSize: 10, opacity: 0.9 }}>{sortOpen ? "▲" : "▼"}</span>
        </button>
        {sortOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 60,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 110,
              background: "#fff",
              border: "1px solid var(--border-md)",
              borderRadius: 12,
              padding: 6,
              boxShadow: "0 12px 24px rgba(26,26,26,0.12)",
            }}
          >
            <button
              type="button"
              onClick={() => setQuery(category, "popular")}
              className="pressable"
              style={{
                textAlign: "left",
                border: sort === "popular" ? "1px solid var(--text-1)" : "1px solid var(--border)",
                background: "#fff",
                color: "var(--text-2)",
                borderRadius: 9,
                padding: "7px 10px",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
            >
              Popular
            </button>
            <button
              type="button"
              onClick={() => setQuery(category, "latest")}
              className="pressable"
              style={{
                textAlign: "left",
                border: sort === "latest" ? "1px solid var(--text-1)" : "1px solid var(--border)",
                background: "#fff",
                color: "var(--text-2)",
                borderRadius: 9,
                padding: "7px 10px",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
            >
              Latest
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
