"use client";

import Link from "next/link";

const ACCENT = "#00FF94";

const TRIATHLON_GAMES = [
  {
    title: "Color Conflict",
    cognitive: "Reflex & Control",
    href: "/brain-age/color-conflict",
  },
  {
    title: "Sequence Memory",
    cognitive: "Working Memory",
    href: "/brain-age/sequence-memory",
  },
  {
    title: "Neural Latency",
    cognitive: "Reaction Speed",
    href: "/brain-age/reaction-time",
  },
] as const;

const TRIATHLON_START_HREF = TRIATHLON_GAMES[0].href;

export default function HomePageClient() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <section style={{ paddingTop: 8, paddingBottom: 8 }}>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw + 0.5rem, 2.75rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--text-1)",
            textAlign: "center",
            marginBottom: 36,
          }}
        >
          Daily Brain Triathlon
        </h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {TRIATHLON_GAMES.map((game) => (
            <article
              key={game.href}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${ACCENT}`,
                borderRadius: "var(--radius-lg)",
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 8,
                minHeight: 0,
              }}
            >
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
                {game.title}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-2)",
                  lineHeight: 1.45,
                  margin: 0,
                  flex: 1,
                }}
              >
                {game.cognitive}
              </p>
              <div style={{ marginTop: 12 }}>
                <Link
                  href={game.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${ACCENT}`,
                    background: `${ACCENT}14`,
                    color: ACCENT,
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    textDecoration: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Play
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Link
            href={TRIATHLON_START_HREF}
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
    </div>
  );
}
