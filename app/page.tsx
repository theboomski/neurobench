"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import postsData from "@/content/blog/posts.json";
import { ALL_GAMES } from "@/lib/games";
import { canonicalGamePath } from "@/lib/canonicalGamePaths";
import { getPlayCounts } from "@/lib/tracking";
import type { GameData } from "@/lib/types";

const INITIAL_PAGE_SIZE = 12;

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

export default function HomePage() {
  const [queryState, setQueryState] = useState<{ category: HomeTypeFilter; sort: HomeSort }>(() => readInitialQuery());
  const category = queryState.category;
  const sort = queryState.sort;
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const games = useMemo(
    () =>
      ALL_GAMES.map((g, idx) => ({
        ...g,
        type: mapGameType(g.category),
        latestIndex: idx,
      })),
    [],
  );

  useEffect(() => {
    const refreshFromUrl = () => setQueryState(readInitialQuery());
    refreshFromUrl();
    window.addEventListener("popstate", refreshFromUrl);
    window.addEventListener("zazaza-home-query-change", refreshFromUrl);
    return () => {
      window.removeEventListener("popstate", refreshFromUrl);
      window.removeEventListener("zazaza-home-query-change", refreshFromUrl);
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
      return [...filtered].sort((a, b) => a.latestIndex - b.latestIndex);
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
  const sortLabel = sort === "popular" ? "Most Popular" : "Latest";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <section style={{ marginBottom: 48 }}>
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
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h3 style={{ fontSize: 18, color: "var(--text-1)", fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                      {game.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-2)",
                        lineHeight: 1.4,
                      }}
                    >
                      {game.shortDescription}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                      🔥 {PLAY_FORMATTER.format(plays)} plays
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
          <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
            Loading more games...
          </p>
        )}
        {filteredSortedGames.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
            No games found in this filter.
          </p>
        )}
      </section>

      {/* Latest from the Blog */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>The Science Blog</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em" }}>Latest from the Blog</h2>
          </div>
          <Link href="/blog" style={{ fontSize: 11, color: "#00FF94", fontFamily: "var(--font-mono)", fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>SEE ALL →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {(postsData as typeof postsData).slice(0, 12).map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
              <article style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${post.accent}`,
                borderRadius: "var(--radius-lg)",
                padding: "20px 16px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{post.emoji}</span>
                  <span style={{ fontSize: 9, color: post.accent, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{post.category}</span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.4, marginBottom: 8, color: "var(--text-1)", flex: 1, letterSpacing: "-0.01em" }}>
                  {post.title}
                </h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{post.readTime} min read</span>
                  <span style={{ fontSize: 10, color: post.accent, fontFamily: "var(--font-mono)", fontWeight: 700 }}>READ →</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* SEO */}
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #00FF94", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Why ZAZAZA?</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>Play the Test. Discover the World.</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>
            At ZAZAZA, we believe self-discovery should be as instant as a click. Our name represents a journey of infinite curiosity — from Z to A.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>
            We aren&apos;t just here to give you a score. We&apos;re here to spark that "Aha!" moment — where you learn something new about yourself, the fascinating science behind a simple reaction time test, or the psychology woven into a color perception puzzle. Every test on ZAZAZA is a window into how the world actually works.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>
            ZAZAZA is a bridge. Between complex neuroscience and daily curiosity. Between your score and your friend&apos;s score. Compare your results, challenge the people around you, and grow your world — one test at a time. Unlike Lumosity or BrainHQ, we never charge you, never make you sign up, and never stand between you and the insight.
          </p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
            {[
              { letter: "ZA", title: "Aha! (Self)", desc: "Discover what you didn't know about yourself." },
              { letter: "ZA", title: "Awareness (World)", desc: "Understand the science hidden inside every test." },
              { letter: "ZA", title: "Alignment (Connection)", desc: "Share, compare, and connect with people around you." },
            ].map((z, i) => (
              <div key={i} style={{ flex: "1 1 180px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#00FF94", fontFamily: "var(--font-mono)", marginBottom: 4 }}>{z.letter} —</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>{z.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{z.desc}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 10 }}><strong style={{ color: "var(--text-1)" }}>Is ZAZAZA really free?</strong><br />Yes. Every test is completely free. No subscription, no trial, no hidden fees. Ever.</p>
            <p style={{ marginBottom: 10 }}><strong style={{ color: "var(--text-1)" }}>Do I need to create an account?</strong><br />No. Take any test instantly without signing up. Your scores are saved locally in your browser.</p>
            <p style={{ marginBottom: 10 }}><strong style={{ color: "var(--text-1)" }}>How do I share my results?</strong><br />After any test, tap SHARE to generate a shareable image card with your score, rank, and brain age. Challenge your friends and see who comes out on top.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>What does ZAZAZA mean?</strong><br />ZAZAZA represents our core mission: Zero-friction, Absolute insight, from Z to A. Three Aha! moments in one — discovering yourself, understanding the world, and connecting with others.</p>
          </div>
        </div>
      </section>
      <footer style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
        <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>© {new Date().getFullYear()} ZAZAZA. All rights reserved.</p>
        <p style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
          Disclaimer: tests are for entertainment and self-reflection and are not medical or psychological diagnoses.
        </p>
      </footer>
      <div style={{ marginTop: 16 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
