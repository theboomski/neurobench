"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { canonicalGamePath } from "@/lib/canonicalGamePaths";
import { ALL_GAMES } from "@/lib/games";
import { getPlayCounts } from "@/lib/tracking";
import type { GameData } from "@/lib/types";
import { getDailyGames, type DailyTriathlonPick } from "@/lib/triathlonDailyGames";

const ACCENT = "#00F0FF";
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

const CATEGORY_PILL_LABEL: Record<Exclude<HomeTypeFilter, "all">, string> = {
  brain: "Brain Test",
  game: "Game",
  personality: "Personality",
};

/** Matches `BracketHubClient` mobile play-count pill. */
const PLAY_COUNT_PILL_STYLE: CSSProperties = {
  flexShrink: 0,
  fontSize: "clamp(9px, 2.2vw, 10px)",
  color: "var(--text-3)",
  fontFamily: "var(--font-mono)",
  background: "transparent",
  border: "1px solid var(--border)",
  padding: "3px 6px",
  borderRadius: 999,
};

const PLAY_FORMATTER = new Intl.NumberFormat("en-US");

const TRIATHLON_CARD_SHELL: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--card-shadow)",
  borderRadius: "var(--radius-lg)",
  padding: "24px 20px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 10,
  minHeight: 0,
};

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

/** Ms from `now` until next UTC 00:00:00 (exclusive upper bound of “today” UTC). */
function msUntilNextUtcMidnight(now: Date): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return Math.max(0, next.getTime() - now.getTime());
}

function formatHms(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const [midnightCountdownMs, setMidnightCountdownMs] = useState(() => msUntilNextUtcMidnight(new Date()));

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
    const tick = () => {
      const now = new Date();
      let ms = msUntilNextUtcMidnight(now);
      if (ms <= 0) {
        setDailyGames(getDailyGames());
        setUtcNow(new Date());
        const now2 = new Date();
        ms = msUntilNextUtcMidnight(now2);
      }
      setMidnightCountdownMs(ms);
    };
    tick();
    const id = window.setInterval(tick, 1000);
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
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.035em",
            lineHeight: 1.15,
            color: "var(--text-1)",
            marginBottom: 12,
          }}
        >
          Today&apos;s Brain Triathlon: {utcLabel}
        </h1>
        <div
          style={{
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <p
            style={{
              fontSize: "clamp(14px, 2.2vw, 16px)",
              color: "var(--text-2)",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            2-minute daily brain exercise. Different challenge every day.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.5,
              margin: 0,
              marginTop: 8,
            }}
            suppressHydrationWarning
          >
            Next challenge in {formatHms(midnightCountdownMs)}
          </p>
        </div>
      </section>

      {/* Mobile: 2×2 grid — 3 daily games + Start card (md = 768px) */}
      <section className="block md:hidden" style={{ paddingTop: 10, paddingBottom: 8 }}>
        <div className="grid grid-cols-2 gap-4">
          {dailyGames
            ? (
                <>
                  {dailyGames.map((pick) => (
                    <article key={pick.id} style={TRIATHLON_CARD_SHELL}>
                      <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 4 }} aria-hidden>
                        {triathlonEmojiForPick(pick)}
                      </div>
                      <h2
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          fontFamily: "var(--font-display)",
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
                          color: "var(--text-3)",
                          margin: 0,
                        }}
                      >
                        {pick.category}
                      </p>
                      <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
                        {TRIATHLON_CARD_BLURB[pick.id] ?? pick.cognitiveCategory}
                      </p>
                    </article>
                  ))}
                  <Link
                    href="/triathlon"
                    className="pressable home-mobile-triathlon-cta"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      textDecoration: "none",
                      height: "100%",
                      minHeight: 0,
                    }}
                  >
                    <span
                      style={{
                        color: "#0F0D0B",
                        fontWeight: 700,
                        fontSize: 15,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.3,
                      }}
                    >
                      Start Today&apos;s Triathlon →
                    </span>
                  </Link>
                </>
              )
            : [0, 1, 2, 3].map((i) => (
                <article
                  key={`triathlon-skel-m-${i}`}
                  style={{
                    ...TRIATHLON_CARD_SHELL,
                    gap: 8,
                    opacity: 0.5,
                  }}
                >
                  {i < 3 ? (
                    <>
                      <div style={{ height: 40, borderRadius: 8, background: "var(--bg-overlay)", maxWidth: 48 }} />
                      <div style={{ height: 26, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "85%" }} />
                      <div style={{ height: 14, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "40%" }} />
                      <div style={{ height: 52, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "100%" }} />
                    </>
                  ) : (
                    <div style={{ height: 24, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "80%", margin: "auto" }} />
                  )}
                </article>
              ))}
        </div>
      </section>

      {/* Desktop: 3 cards in a row (unchanged) */}
      <section className="hidden md:block" style={{ paddingTop: 10, paddingBottom: 8 }}>
        <div className="grid grid-cols-3 gap-5">
          {dailyGames
            ? dailyGames.map((pick) => (
                <article key={pick.id} style={TRIATHLON_CARD_SHELL}>
                  <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 4 }} aria-hidden>
                    {triathlonEmojiForPick(pick)}
                  </div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      fontFamily: "var(--font-display)",
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
                      color: "var(--text-3)",
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
                    ...TRIATHLON_CARD_SHELL,
                    gap: 8,
                    minHeight: 0,
                    opacity: 0.5,
                  }}
                >
                  <div style={{ height: 40, borderRadius: 8, background: "var(--bg-overlay)", maxWidth: 48 }} />
                  <div style={{ height: 26, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "85%" }} />
                  <div style={{ height: 14, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "40%" }} />
                  <div style={{ height: 52, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "100%" }} />
                </article>
              ))}
        </div>
      </section>

      <section className="hidden md:block" style={{ paddingTop: 28, paddingBottom: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Link
            href="/triathlon"
            className="pressable"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 28px",
              borderRadius: 6,
              background: ACCENT,
              color: "#051318",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              textDecoration: "none",
              boxShadow: "var(--card-shadow)",
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

      <section className="block md:hidden" style={{ paddingTop: 8, paddingBottom: 8 }}>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            fontFamily: "var(--font-body)",
            textAlign: "center",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          No signup required · Track progress free with account
        </p>
      </section>

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
            const catLabel = CATEGORY_PILL_LABEL[game.type];
            return (
              <Link key={game.id} href={canonicalGamePath(game)} style={{ textDecoration: "none", display: "block", minWidth: 0 }}>
                <article
                  className="pressable"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "14px 12px 12px",
                    minHeight: 168,
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    boxShadow: "var(--card-shadow)",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "var(--card-shadow-hover)";
                    e.currentTarget.style.borderColor = "var(--border-md)";
                    e.currentTarget.style.filter = "brightness(1.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--card-shadow)";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.filter = "";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        maxWidth: "58%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: "var(--font-body)",
                        textTransform: "uppercase",
                        color: "var(--text-3)",
                        letterSpacing: "0.14em",
                      }}
                    >
                      {catLabel}
                    </span>
                    <span style={PLAY_COUNT_PILL_STYLE}>{PLAY_FORMATTER.format(plays)}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
                    <h3 style={{ fontSize: 22, color: "var(--text-1)", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.01em", lineHeight: 1.2, margin: 0 }}>
                      {game.title}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.45, margin: 0 }}>{game.shortDescription}</p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, paddingTop: 4 }}>
                    <span
                      style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-body)", textTransform: "uppercase" }}
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

      <div style={{ marginTop: 20 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
