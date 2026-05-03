"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { canonicalGamePath } from "@/lib/canonicalGamePaths";
import { ALL_GAMES } from "@/lib/games";
import { getPlayCounts } from "@/lib/tracking";
import type { GameData } from "@/lib/types";
import { getDailyGames, type DailyTriathlonPick } from "@/lib/triathlonDailyGames";

const ACCENT = "#00FF94";
const INITIAL_PAGE_SIZE = 12;

const TRIATHLON_CARD_BLURB: Record<string, string> = {
  "color-conflict": "Tests inhibitory control · Trains your cognitive flexibility",
  "color-conflict-2": "Tests cognitive interference · Trains your mental clarity",
  "sequence-memory": "Tests working memory · Trains your recall capacity",
  "number-memory": "Tests digit span · Trains your short-term memory",
  "visual-memory": "Tests spatial memory · Trains your pattern recognition",
  "chimp-test": "Tests visuospatial memory · Trains your visual processing",
  "verbal-memory": "Tests recognition memory · Trains your word retention",
  "instant-comparison": "Tests processing speed · Trains your rapid decision making",
  "fish-frenzy": "Tests response inhibition · Trains your reaction control",
};

type HomeTypeFilter = "all" | "brain" | "game" | "personality";
type HomeSort = "popular" | "latest";

const BORDER_COLOR: Record<Exclude<HomeTypeFilter, "all">, string> = {
  brain: "#10b981",
  game: "#f97316",
  personality: "#8b5cf6",
};

const PLAY_FORMATTER = new Intl.NumberFormat("en-US");

function mapGameType(category: GameData["category"]): Exclude<HomeTypeFilter, "all"> {
  if (category === "office-iq" || category === "korean-tv") return "game";
  if (category === "dark-personality" || category === "relationship" || category === "money") return "personality";
  return "brain";
}

function readInitialQuery(): { category: HomeTypeFilter; sort: HomeSort } {
  if (typeof window === "undefined") return { category: "all", sort: "popular" };
  const sp = new URLSearchParams(window.location.search);
  const categoryRaw = sp.get("category");
  const sortRaw = sp.get("sort");
  const category: HomeTypeFilter =
    categoryRaw === "brain" || categoryRaw === "game" || categoryRaw === "personality" ? categoryRaw : "all";
  const sort: HomeSort = sortRaw === "latest" ? "latest" : "popular";
  return { category, sort };
}

function formatUtcYmdDots(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function triathlonEmojiForPick(pick: DailyTriathlonPick): string {
  const g = ALL_GAMES.find((x) => x.id === pick.id);
  return g?.emoji ?? "🧠";
}

export type HomePageClientProps = {
  /** Server-fetched so Popular sort matches before client hydration (avoids list flash). */
  initialPlayCounts: Record<string, number>;
};

export default function HomePageClient({ initialPlayCounts }: HomePageClientProps) {
  const [utcNow, setUtcNow] = useState(() => new Date());
  const [dailyGames, setDailyGames] = useState<DailyTriathlonPick[] | null>(null);

  const [queryState, setQueryState] = useState<{ category: HomeTypeFilter; sort: HomeSort }>(() => readInitialQuery());
  const category = queryState.category;
  const sort = queryState.sort;
  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => ({ ...initialPlayCounts }));
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const games = useMemo(
    () =>
      ALL_GAMES.map((g, idx) => ({
        ...g,
        type: mapGameType(g.category),
        latestIndex: idx,
        releasedAtMs: g.releasedAt ? Date.parse(g.releasedAt) : Number.NaN,
      })),
    [],
  );

  useEffect(() => {
    const tick = () => {
      setUtcNow(new Date());
      setDailyGames(getDailyGames());
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const refreshFromUrl = () => setQueryState(readInitialQuery());
    const onQueryChange = (event: Event) => {
      const detail = (event as CustomEvent<{ category?: HomeTypeFilter; sort?: HomeSort }>).detail;
      const nextCategory = detail?.category;
      const nextSort = detail?.sort;
      if (
        (nextCategory === "all" || nextCategory === "brain" || nextCategory === "game" || nextCategory === "personality") &&
        (nextSort === "popular" || nextSort === "latest")
      ) {
        setQueryState({ category: nextCategory, sort: nextSort });
        return;
      }
      refreshFromUrl();
    };
    refreshFromUrl();
    window.addEventListener("popstate", refreshFromUrl);
    window.addEventListener("zazaza-home-query-change", onQueryChange);
    return () => {
      window.removeEventListener("popstate", refreshFromUrl);
      window.removeEventListener("zazaza-home-query-change", onQueryChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const counts = await getPlayCounts();
      if (cancelled) return;
      setPlayCounts(counts);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [games]);

  const filteredSortedGames = useMemo(() => {
    const filtered = category === "all" ? games : games.filter((g) => g.type === category);
    if (sort === "latest") {
      return [...filtered].sort((a, b) => {
        const aHasDate = Number.isFinite(a.releasedAtMs);
        const bHasDate = Number.isFinite(b.releasedAtMs);
        if (aHasDate || bHasDate) {
          if (!aHasDate) return 1;
          if (!bHasDate) return -1;
          if (b.releasedAtMs !== a.releasedAtMs) return b.releasedAtMs - a.releasedAtMs;
        }
        return b.latestIndex - a.latestIndex;
      });
    }
    return [...filtered].sort((a, b) => {
      const aCount = playCounts[a.id] ?? 0;
      const bCount = playCounts[b.id] ?? 0;
      if (aCount === 0 && bCount > 0) return 1;
      if (bCount === 0 && aCount > 0) return -1;
      if (bCount !== aCount) return bCount - aCount;
      return a.latestIndex - b.latestIndex;
    });
  }, [games, category, sort, playCounts]);

  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [category, sort]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setVisibleCount((prev) => Math.min(prev + INITIAL_PAGE_SIZE, filteredSortedGames.length));
        window.setTimeout(() => {
          loadingMoreRef.current = false;
        }, 80);
      },
      { rootMargin: "220px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredSortedGames.length]);

  const visibleGames = filteredSortedGames.slice(0, visibleCount);
  const filterLabel = category === "all" ? "All" : category === "brain" ? "Brain Tests" : category === "game" ? "Games" : "Personality";
  const sortLabel = sort === "popular" ? "Popular" : "Latest";
  const utcLabel = formatUtcYmdDots(utcNow);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <section style={{ paddingTop: 8, paddingBottom: 10, textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(1.35rem, 3.5vw + 0.35rem, 2.25rem)",
            fontWeight: 900,
            letterSpacing: "-0.035em",
            lineHeight: 1.15,
            color: "var(--text-1)",
            marginBottom: 12,
          }}
        >
          Today&apos;s Brain Triathlon: {utcLabel}
        </h1>
        <p
          style={{
            fontSize: "clamp(14px, 2.2vw, 16px)",
            color: "var(--text-2)",
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          2-minute daily exercise for your brain.
        </p>
      </section>

      <section style={{ paddingTop: 10, paddingBottom: 8 }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {dailyGames
            ? dailyGames.map((pick) => (
                <article
                  key={pick.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${ACCENT}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "24px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 10,
                    minHeight: 0,
                  }}
                >
                  <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 4 }} aria-hidden>
                    {triathlonEmojiForPick(pick)}
                  </div>
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      color: "var(--text-1)",
                      lineHeight: 1.2,
                      margin: 0,
                    }}
                  >
                    {pick.name}
                  </h2>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: ACCENT,
                      margin: 0,
                    }}
                  >
                    {pick.category}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
                    {TRIATHLON_CARD_BLURB[pick.id] ?? pick.cognitiveCategory}
                  </p>
                </article>
              ))
            : [0, 1, 2].map((i) => (
                <article
                  key={`triathlon-skel-${i}`}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${ACCENT}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "24px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    minHeight: 0,
                    opacity: 0.5,
                  }}
                >
                  <div style={{ height: 40, borderRadius: 8, background: "var(--bg-elevated)", maxWidth: 48 }} />
                  <div style={{ height: 26, borderRadius: 6, background: "var(--bg-elevated)", maxWidth: "85%" }} />
                  <div style={{ height: 14, borderRadius: 6, background: "var(--bg-elevated)", maxWidth: "40%" }} />
                  <div style={{ height: 52, borderRadius: 6, background: "var(--bg-elevated)", maxWidth: "100%" }} />
                </article>
              ))}
        </div>
      </section>

      <section style={{ paddingTop: 28, paddingBottom: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Link
            href="/triathlon"
            className="pressable"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 28px",
              borderRadius: "var(--radius-lg)",
              background: ACCENT,
              color: "#0a0a0f",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              textDecoration: "none",
              boxShadow: `0 0 0 1px ${ACCENT}, 0 12px 40px ${ACCENT}33`,
            }}
          >
            Start Today&apos;s Triathlon →
          </Link>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              textAlign: "center",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 420,
            }}
          >
            No signup required · Track progress free with account
          </p>
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <section style={{ marginTop: 28, marginBottom: 48 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            fontSize: 11,
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>
            {filterLabel} · {sortLabel}
          </span>
          <span>{filteredSortedGames.length} games</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {visibleGames.map((game) => {
            const plays = playCounts[game.id] ?? 0;
            const border = BORDER_COLOR[game.type];
            return (
              <Link key={game.id} href={canonicalGamePath(game)} style={{ textDecoration: "none" }}>
                <article
                  className="pressable"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderLeft: `4px solid ${border}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "16px 12px",
                    minHeight: 160,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h3 style={{ fontSize: 18, color: "var(--text-1)", fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                      {game.title}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4 }}>{game.shortDescription}</p>
                    <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                      {PLAY_FORMATTER.format(plays)} plays
                    </p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: border,
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                      }}
                    >
                      PLAY →
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
        <div ref={loaderRef} style={{ height: 30 }} />
        {visibleCount < filteredSortedGames.length && (
          <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", fontFamily: "var(--font-mono)" }}>Loading more games…</p>
        )}
        {filteredSortedGames.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", fontFamily: "var(--font-mono)" }}>No games found in this filter.</p>
        )}
      </section>
    </div>
  );
}
