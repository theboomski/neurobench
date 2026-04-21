import type { Metadata } from "next";
import { ALL_GAMES } from "@/lib/games";
import { GameCard } from "@/components/CategoryCards";

const games = ALL_GAMES.filter(g => g.category === "korean-tv");

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Are these Korean TV games like Squid Game?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "They are short reaction and timing challenges inspired by the tension of survival-style variety and drama formats. They are for entertainment only and are not affiliated with any broadcast show.",
      },
    },
    {
      "@type": "Question",
      "name": "How is Red Light Green Light scored?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You earn base points for each round cleared plus speed bonuses for reaching the finish quickly. Hesitation right before a real red light costs a small penalty. A perfect three-round run can reach 1000 points.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "Free Korean TV Challenges? | ZAZAZA",
  description: "Inspired by crazy Korean TV shows. Can you survive? Free mini-games with instant results. No signup.",
  openGraph: {
    title: "Free Korean TV Challenges? | ZAZAZA",
    description: "Timing, nerves, and reflexes. Can you beat the doll?",
    url: "https://zazaza.app/korean-tv",
  },
};

export default function Page() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#E11D4810", border: "1px solid #E11D4825", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#E11D48", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>KOREAN TV SHOWS</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          Can You Survive<br />
          <span style={{ background: "linear-gradient(135deg, #E11D48 0%, #F97316 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Korean TV Chaos?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 520, margin: "0 auto 12px", lineHeight: 1.65 }}>
          Inspired by crazy Korean TV shows — timing, nerves, and reflexes. One wrong move and you are out.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} challenges · Instant results · No signup</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {games.map(g => <GameCard key={g.id} g={g} basePath="korean-tv" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #E11D48", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Why these games hit different</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>
            Korean survival and variety formats are built on sudden rule changes, social pressure, and split-second decisions. These mini-games strip that down to pure reflex and risk: you know the rules, but the timing is never fully yours to control.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 0 }}>
            Play for bragging rights, share your score, and see if your friends can survive the same round.
          </p>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
