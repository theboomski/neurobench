"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type HomeTypeFilter = "all" | "brain" | "game" | "personality";
type HomeSort = "popular" | "latest";

const TAB_COLOR: Record<HomeTypeFilter, string> = {
  all: "#ffffff",
  brain: "#10b981",
  game: "#f97316",
  personality: "#8b5cf6",
};

export default function HomeHeaderControls() {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLDivElement | null>(null);
  const isHome = pathname === "/";

  const categoryRaw = sp.get("category");
  const sortRaw = sp.get("sort");
  const category: HomeTypeFilter =
    categoryRaw === "brain" || categoryRaw === "game" || categoryRaw === "personality" ? categoryRaw : "all";
  const sort: HomeSort = sortRaw === "latest" ? "latest" : "popular";
  const selectedCategoryLabel =
    category === "all" ? "All" : category === "brain" ? "Brain Tests" : category === "game" ? "Games" : "Personality";

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!mobileToggleRef.current) return;
      if (mobileToggleRef.current.contains(e.target as Node)) return;
      setMobileCategoryOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setMobileCategoryOpen(false);
  }, [category, sort]);

  if (!isHome) return null;

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
      <div className="home-header-tabs home-header-tabs-desktop" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {([
          { id: "all", label: "All" },
          { id: "brain", label: "Brain Tests" },
          { id: "game", label: "Games" },
          { id: "personality", label: "Personality" },
        ] as const).map((tab) => {
          const active = category === tab.id;
          const accent = TAB_COLOR[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQuery(tab.id, sort)}
              className="pressable home-tab-pill"
              style={{
                border: active ? `2px solid ${accent}` : "1px solid var(--border)",
                background: active ? `${accent}26` : "var(--bg-elevated)",
                color: active ? accent : "var(--text-2)",
                borderRadius: 999,
                padding: "7px 10px",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
        <Link
          href="/blog"
          className="pressable"
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid #38bdf8",
            background: "rgba(56,189,248,0.14)",
            color: "#38bdf8",
            borderRadius: 999,
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
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
            border: "1px solid #f472b6",
            background: "rgba(244,114,182,0.14)",
            color: "#f472b6",
            borderRadius: 999,
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Fun Sends
        </Link>
      </div>

      <div className="home-header-tabs home-header-tabs-mobile" style={{ display: "none", gap: 6, flexWrap: "nowrap", alignItems: "center", flex: 1, minWidth: 0 }}>
        <div ref={mobileToggleRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMobileCategoryOpen((v) => !v)}
            className="pressable home-tab-pill"
            style={{
              border: `2px solid ${TAB_COLOR[category]}`,
              background: `${TAB_COLOR[category]}26`,
              color: TAB_COLOR[category],
              borderRadius: 999,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {selectedCategoryLabel}
            <span aria-hidden style={{ fontSize: 10, opacity: 0.9 }}>{mobileCategoryOpen ? "▲" : "▼"}</span>
          </button>
          {mobileCategoryOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 30,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                minWidth: 156,
                background: "var(--bg-card)",
                border: "1px solid var(--border-md)",
                borderRadius: 12,
                padding: 6,
                boxShadow: "0 8px 24px rgba(0,0,0,0.32)",
              }}
            >
              {([
                { id: "all", label: "All" },
                { id: "brain", label: "Brain Tests" },
                { id: "game", label: "Games" },
                { id: "personality", label: "Personality" },
              ] as const).map((tab) => {
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
                      background: active ? `${accent}22` : "var(--bg-elevated)",
                      color: active ? accent : "var(--text-2)",
                      borderRadius: 9,
                      padding: "7px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-mono)",
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
        <Link
          href="/blog"
          className="pressable home-mobile-chip"
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid #38bdf8",
            background: "rgba(56,189,248,0.14)",
            color: "#38bdf8",
            borderRadius: 999,
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Blog
        </Link>
        <Link
          href="/send"
          className="pressable home-mobile-chip"
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid #f472b6",
            background: "rgba(244,114,182,0.14)",
            color: "#f472b6",
            borderRadius: 999,
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Fun Sends
        </Link>
      </div>

      <div className="home-header-sort" style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 999, overflow: "hidden", flexShrink: 0, marginLeft: "auto" }}>
        <button
          type="button"
          onClick={() => setQuery(category, "popular")}
          className="pressable"
          style={{
            border: "none",
            borderRight: "1px solid var(--border)",
            background: sort === "popular" ? "var(--bg-elevated)" : "transparent",
            color: sort === "popular" ? "#00FF94" : "var(--text-3)",
            padding: "7px 9px",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Popular
        </button>
        <button
          type="button"
          onClick={() => setQuery(category, "latest")}
          className="pressable"
          style={{
            border: "none",
            background: sort === "latest" ? "var(--bg-elevated)" : "transparent",
            color: sort === "latest" ? "#00FF94" : "var(--text-3)",
            padding: "7px 9px",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Latest
        </button>
      </div>
    </div>
    <style jsx>{`
      @media (max-width: 900px) {
        .home-header-controls {
          width: 100%;
          justify-content: space-between;
          gap: 8px !important;
        }
        .home-header-tabs-desktop {
          display: none !important;
        }
        .home-header-tabs-mobile {
          display: flex !important;
          flex-wrap: nowrap !important;
          flex: 1 1 auto;
          min-width: 0;
          gap: 4px !important;
          align-items: center;
        }
        .home-tab-pill {
          padding: 6px 8px !important;
          font-size: 10px !important;
        }
        .home-header-tabs-mobile .home-mobile-chip {
          padding: 6px 8px !important;
          font-size: 10px !important;
        }
        .home-header-sort {
          margin-left: auto !important;
        }
      }
    `}</style>
    </>
  );
}
