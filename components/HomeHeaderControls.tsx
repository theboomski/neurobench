"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

  if (pathname !== "/") return null;

  const categoryRaw = sp.get("category");
  const sortRaw = sp.get("sort");
  const category: HomeTypeFilter =
    categoryRaw === "brain" || categoryRaw === "game" || categoryRaw === "personality" ? categoryRaw : "all";
  const sort: HomeSort = sortRaw === "latest" ? "latest" : "popular";

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
      <div className="home-header-tabs" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
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
        .home-header-tabs {
          max-width: calc(100% - 145px);
          gap: 4px !important;
        }
        .home-tab-pill {
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
