import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { SortedGrid, ComingSoonCard } from "@/components/GameCard";

const games = gamesData as GameData[];

export const metadata: Metadata = {
  title: "ZAZAZA – Free Brain Age Test. No Signup. Instant Results.",
  description: "Find out your brain age in 60 seconds. Free. No signup. Instant results. You might be shocked.",
  openGraph: {
    title: "ZAZAZA – What's Your Brain Age?",
    description: "Free brain age tests. Zero signup. Instant results. Can your friends beat you?",
    url: "https://zazaza.app",
  },
};

const COMING_SOON_OFFICE = [
  { title: "Meeting Escape Artist", clinicalTitle: "Cognitive Load Threshold Test", emoji: "🏃", accent: "#F59E0B", category: "Office Survival Test" },
  { title: "Inbox Zero Sprint",     clinicalTitle: "Decision Velocity Assessment",  emoji: "📧", accent: "#EC4899", category: "Office Survival Test" },
];

export default function HomePage() {
  const games_clinical = games.filter(g => g.category === "clinical");
  const games_office   = games.filter(g => g.category === "office");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      {/* Hero */}
      <section style={{ padding: "44px 0 40px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(32px,6.5vw,64px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 16 }}>
          Know Your<br />
          <span style={{ background: "linear-gradient(135deg, #00FF94 0%, #00B4DB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Brain Age.
          </span>
        </h1>

        <p style={{ fontSize: "clamp(15px,2vw,19px)", color: "var(--text-2)", marginBottom: 32, lineHeight: 1.5 }}>
          You might be shocked. 😳
        </p>

        {/* USP 3개 */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
          {[
            { icon: "🆓", label: "Free", sub: "Forever" },
            { icon: "✦",  label: "No Signup", sub: "Ever" },
            { icon: "⚡", label: "Instant", sub: "Results" },
          ].map(u => (
            <div key={u.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-lg)", padding: "14px 24px", minWidth: 100, textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{u.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>{u.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{u.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Brain Age Test */}
      <Section label="01" title="🧠 Brain Age Test" subtitle="Take the test. Find out. Share the shock." accent="#00FF94">
        <SortedGrid games={games} category="clinical" />
      </Section>

      {/* Office IQ Test */}
      <Section label="02" title="💼 Office IQ Test" subtitle="How well do you survive the office? Prove it." accent="#FF6B6B">
        <SortedGrid games={games} category="office" />
        {COMING_SOON_OFFICE.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 14 }}>
            {COMING_SOON_OFFICE.map(g => <ComingSoonCard key={g.title} {...g} />)}
          </div>
        )}
      </Section>

      {/* SEO block */}
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #00FF94", borderRadius: "var(--radius-lg)", padding: "28px 24px" }}>
          <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>About ZAZAZA</div>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Free Brain Tests — No Signup, No Payment, Ever.</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 14, marginBottom: 10 }}>
            ZAZAZA is a free global test hub. Unlike Lumosity or BrainHQ, we never charge you or make you create an account. Every test is free, every result is instant, and every score is globally ranked.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 14 }}>
            Find out your brain age, test your office IQ, and share your results. See if your friends can beat you.
          </p>
        </div>
      </section>

      <div style={{ paddingBottom: 24 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}

function Section({ label, title, subtitle, accent, children }: {
  label: string; title: string; subtitle: string; accent: string; children: React.ReactNode;
}) {
  return (
    <section style={{ paddingBottom: 56 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{label}</span>
        <div>
          <h2 style={{ fontSize: "clamp(17px,2.5vw,22px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 2 }}>{title}</h2>
          <p style={{ fontSize: 12, color: "var(--text-2)" }}>{subtitle}</p>
        </div>
        <div style={{ marginLeft: "auto", width: 32, height: 2, background: accent, borderRadius: 1, flexShrink: 0 }} />
      </div>
      {children}
    </section>
  );
}
