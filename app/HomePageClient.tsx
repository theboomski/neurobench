"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CountryRankRow, HallOfFameRow, WeeklyLeaderRow } from "@/lib/arenaLeaderboardData";
import { canonicalGamePath } from "@/lib/canonicalGamePaths";
import { countryCodeToFlag, countryCodeToRegionName } from "@/lib/countryFlag";
import { ALL_GAMES } from "@/lib/games";
import { getPlayCounts } from "@/lib/tracking";
import type { GameData } from "@/lib/types";
import { resolveHomeDailySpotlight, spotlightPlayPath } from "@/lib/homeDailySpotlight";
import { getDailyGames, type DailyTriathlonPick } from "@/lib/triathlonDailyGames";

const INITIAL_PAGE_SIZE = 12;

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

const TRIATHLON_LEFT_CARD: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--card-shadow)",
  borderRadius: "var(--radius-lg)",
  padding: "clamp(16px, 3.5vw, 24px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 12,
  minWidth: 0,
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

/** Ms until next UTC midnight (when daily triathlon lineup rotates). */
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

const HOME_SECTION_LABEL: CSSProperties = {
  fontSize: 10,
  color: "var(--accent)",
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 800,
};

export type HomePageClientProps = {
  /** Server-fetched so Popular sort matches before client hydration (avoids list flash). */
  initialPlayCounts: Record<string, number>;
  /** Top rows for home triathlon column (same source as /arena). */
  arenaPreview: {
    countryRankings: CountryRankRow[];
    weeklyLeaders: WeeklyLeaderRow[];
    hallOfFame: HallOfFameRow[];
  };
};

function ArenaSeeAllLink({ label }: { label: string }) {
  return (
    <Link
      href="/arena"
      className="pressable"
      aria-label={label}
      style={{
        flexShrink: 0,
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        fontWeight: 800,
        color: "var(--accent)",
        textDecoration: "none",
        letterSpacing: "0.04em",
        padding: "4px 8px",
        borderRadius: 6,
        border: "1px solid var(--border)",
      }}
    >
      See all
    </Link>
  );
}

export default function HomePageClient({ initialPlayCounts, arenaPreview }: HomePageClientProps) {
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
      const now = new Date();
      setUtcNow(now);
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
        ms = msUntilNextUtcMidnight(new Date());
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

  const spotlightGame = useMemo(() => resolveHomeDailySpotlight(utcNow, playCounts), [utcNow, playCounts]);
  const spotlightHref = useMemo(() => spotlightPlayPath(spotlightGame), [spotlightGame]);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <section style={{ paddingTop: 4, paddingBottom: 14, textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw + 0.35rem, 2.5rem)",
            fontWeight: 900,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--text-1)",
            margin: 0,
          }}
        >
          Global Brain War
        </h1>
      </section>

      {/* Left: Today&apos;s Test + Today&apos;s triathlon · Right: Arena preview — equal-height columns */}
      <section style={{ paddingTop: 4, paddingBottom: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "clamp(10px, 2.5vw, 22px)",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...TRIATHLON_LEFT_CARD,
              display: "flex",
              flexDirection: "column",
              gap: 0,
              height: "100%",
              minHeight: 0,
            }}
          >
            <div
              style={{
                flex: "1 1 50%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 0,
                paddingBottom: 18,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={HOME_SECTION_LABEL}>Today&apos;s Test</div>
              <Link
                href={spotlightHref}
                className="pressable home-spotlight-card"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  textDecoration: "none",
                  color: "inherit",
                  minHeight: 0,
                  boxSizing: "border-box",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  padding: "clamp(14px, 3vw, 20px)",
                  gap: 10,
                  boxShadow: "var(--card-shadow)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(8px, 2vw, 12px)",
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: "clamp(28px, 7vw, 40px)", lineHeight: 1, flexShrink: 0 }} aria-hidden>
                    {spotlightGame.emoji}
                  </span>
                  <h2
                    style={{
                      fontSize: "clamp(17px, 4vw, 22px)",
                      fontWeight: 900,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "-0.02em",
                      color: "var(--text-1)",
                      lineHeight: 1.2,
                      margin: 0,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {spotlightGame.title}
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, margin: 0, flex: 1 }}>
                  {spotlightGame.shortDescription}
                </p>
                <span className="home-spotlight-play-cta">Play now</span>
              </Link>
            </div>

            <div
              style={{
                flex: "1 1 50%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 0,
                paddingTop: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  rowGap: 4,
                }}
              >
                <span style={HOME_SECTION_LABEL}>Today&apos;s triathlon</span>
                <span style={HOME_SECTION_LABEL} suppressHydrationWarning>
                  {formatHms(midnightCountdownMs)}
                </span>
              </div>
              {dailyGames ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 14px)" }}>
                  {dailyGames.map((pick) => (
                    <div
                      key={pick.id}
                      style={{
                        fontSize: "clamp(15px, 3.6vw, 22px)",
                        fontWeight: 800,
                        fontFamily: "var(--font-display)",
                        letterSpacing: "-0.02em",
                        color: "var(--text-1)",
                        lineHeight: 1.2,
                      }}
                    >
                      {pick.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.45 }}>
                  <div style={{ height: 22, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "92%" }} />
                  <div style={{ height: 22, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "88%" }} />
                  <div style={{ height: 22, borderRadius: 6, background: "var(--bg-overlay)", maxWidth: "78%" }} />
                </div>
              )}
              <Link
                href="/triathlon"
                className="pressable home-triathlon-start-cta"
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  textDecoration: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                Start Triathlon
              </Link>
              <p
                style={{
                  fontSize: "clamp(10px, 2.4vw, 12px)",
                  color: "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                No signup required · Track progress free with account
              </p>
            </div>
          </div>

          <div
            style={{
              ...TRIATHLON_LEFT_CARD,
              display: "flex",
              flexDirection: "column",
              gap: "clamp(8px, 2vw, 12px)",
              minWidth: 0,
              height: "100%",
              minHeight: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--accent)",
                borderRadius: "var(--radius-md)",
                padding: "clamp(8px, 2vw, 12px)",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h3 style={{ fontSize: "clamp(10px, 2.4vw, 12px)", fontWeight: 800, margin: 0, lineHeight: 1.25, color: "var(--text-1)" }}>
                  Weekly country rankings
                </h3>
                <ArenaSeeAllLink label="See all weekly country rankings on Arena" />
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "22px 1fr 36px",
                    gap: 4,
                    fontSize: 9,
                    color: "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                  }}
                >
                  <span>#</span>
                  <span>Country</span>
                  <span style={{ textAlign: "right" }}>Pts</span>
                </div>
                {[0, 1, 2].map((slot) => {
                  const row = arenaPreview.countryRankings[slot];
                  return (
                    <div
                      key={row?.countryCode ?? `country-rank-slot-${slot}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "22px 1fr 36px",
                        gap: 4,
                        alignItems: "center",
                        padding: "4px 0",
                        borderTop: "1px solid var(--border)",
                        fontSize: "clamp(10px, 2.3vw, 12px)",
                        minHeight: "1.35em",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-2)" }}>{slot + 1}</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: row ? "var(--text-1)" : "var(--text-3)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                        }}
                      >
                        {row ? (
                          <>
                            <span aria-hidden>{countryCodeToFlag(row.countryCode)}</span>
                            <span style={{ marginLeft: 2 }}>{countryCodeToRegionName(row.countryCode)}</span>
                          </>
                        ) : (
                          "\u00a0"
                        )}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 800,
                          color: row ? "var(--accent)" : "var(--text-3)",
                          textAlign: "right",
                        }}
                      >
                        {row ? row.points : "\u00a0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid #22d3ee",
                borderRadius: "var(--radius-md)",
                padding: "clamp(8px, 2vw, 12px)",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h3 style={{ fontSize: "clamp(10px, 2.4vw, 12px)", fontWeight: 800, margin: 0, lineHeight: 1.25, color: "var(--text-1)" }}>
                  Weekly leaders
                </h3>
                <ArenaSeeAllLink label="See all weekly leaders on Arena" />
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.75fr) 20px 40px",
                    gap: 4,
                    fontSize: 9,
                    color: "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                  }}
                >
                  <span>Game</span>
                  <span>Player</span>
                  <span />
                  <span style={{ textAlign: "right" }}>Scr</span>
                </div>
                {arenaPreview.weeklyLeaders.map((row) => (
                  <div
                    key={row.gameId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.75fr) 20px 40px",
                      gap: 4,
                      alignItems: "center",
                      padding: "4px 0",
                      borderTop: "1px solid var(--border)",
                      fontSize: "clamp(10px, 2.3vw, 12px)",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{row.gameTitle}</span>
                    <span style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{row.nickname ?? "—"}</span>
                    <span style={{ fontSize: 14, lineHeight: 1 }} aria-hidden>
                      {row.countryCode ? countryCodeToFlag(row.countryCode) : "—"}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "#22d3ee", textAlign: "right", whiteSpace: "nowrap" }}>{row.score ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid #38bdf8",
                borderRadius: "var(--radius-md)",
                padding: "clamp(8px, 2vw, 12px)",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h3 style={{ fontSize: "clamp(10px, 2.4vw, 12px)", fontWeight: 800, margin: 0, lineHeight: 1.25, color: "var(--text-1)" }}>
                  Hall of fame
                </h3>
                <ArenaSeeAllLink label="See all Hall of Fame on Arena" />
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.75fr) 20px 40px",
                    gap: 4,
                    fontSize: 9,
                    color: "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                  }}
                >
                  <span>Game</span>
                  <span>Player</span>
                  <span />
                  <span style={{ textAlign: "right" }}>Scr</span>
                </div>
                {arenaPreview.hallOfFame.map((row) => (
                  <div
                    key={row.gameId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.75fr) 20px 40px",
                      gap: 4,
                      alignItems: "center",
                      padding: "4px 0",
                      borderTop: "1px solid var(--border)",
                      fontSize: "clamp(10px, 2.3vw, 12px)",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{row.gameTitle}</span>
                    <span style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{row.nickname ?? "—"}</span>
                    <span style={{ fontSize: 14, lineHeight: 1 }} aria-hidden>
                      {row.countryCode ? countryCodeToFlag(row.countryCode) : "—"}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "#38bdf8", textAlign: "right", whiteSpace: "nowrap" }}>{row.score ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
