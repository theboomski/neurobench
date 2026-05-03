"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameCard } from "@/components/GameCard";
import { ALL_GAMES } from "@/lib/games";
import { getDailyGames, type DailyTriathlonPick } from "@/lib/triathlonDailyGames";

const ACCENT = "#00FF94";
const GRID_BATCH = 16;

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

export default function HomePageClient() {
  const [utcNow, setUtcNow] = useState(() => new Date());
  const [dailyGames, setDailyGames] = useState<DailyTriathlonPick[] | null>(null);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(GRID_BATCH, ALL_GAMES.length));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const allGames = useMemo(() => ALL_GAMES, []);

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
    if (visibleCount >= allGames.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((v) => Math.min(v + GRID_BATCH, allGames.length));
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, allGames.length]);

  const utcLabel = formatUtcYmdDots(utcNow);
  const slice = allGames.slice(0, visibleCount);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      {/* Section 1 — Daily Brain Triathlon header */}
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

      {/* Section 2 — Today&apos;s 3 game cards (display only) */}
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
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-2)",
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
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

      {/* Section 3 — CTA */}
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

      {/* Section 4 — All games infinite scroll */}
      <section style={{ marginTop: 28, paddingBottom: 8 }}>
        <h2
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--text-1)",
            marginBottom: 6,
          }}
        >
          All games
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 18, lineHeight: 1.5 }}>
          Browse the full catalog — keep scrolling to load more.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {slice.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
        {visibleCount < allGames.length ? <div ref={sentinelRef} style={{ height: 24, marginTop: 16 }} aria-hidden /> : null}
      </section>
    </div>
  );
}
