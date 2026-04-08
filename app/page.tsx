import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { SortedGrid, ComingSoonCard } from "@/components/GameCard";
import { dict } from "@/lib/i18n";

const t = dict.en;
const games = gamesData as GameData[];

const COMING_SOON = [
  { title:"Meeting Escape Artist", clinicalTitle:"Cognitive Load Threshold Test", emoji:"🏃", accent:"#F59E0B", category:"Office Survival Test" },
  { title:"Inbox Zero Sprint",     clinicalTitle:"Decision Velocity Assessment",  emoji:"📧", accent:"#EC4899", category:"Office Survival Test" },
];

export const metadata: Metadata = {
  title: "NeuroBench – The Cognitive Performance Lab",
  description: t.site.description,
};

export default function HomePage() {
  const comingSoonOffice = COMING_SOON.filter(g => g.category === "Office Survival Test");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      {/* Hero — compact */}
      <section style={{ padding: "36px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-card)", border: "1px solid var(--border-md)", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF94", display: "inline-block", boxShadow: "0 0 8px #00FF94" }} />
          <span style={{ fontSize: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Free · No Signup · Instant Results</span>
        </div>

        <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08, marginBottom: 12 }}>
          Know Your{" "}
          <span style={{ background: "linear-gradient(135deg, #00FF94 0%, #00B4DB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Neural Profile.
          </span>
        </h1>

        <p style={{ fontSize: "clamp(13px, 1.8vw, 15px)", color: "var(--text-2)", maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.6 }}>
          Clinical benchmarks meets office humor. Instant results, globally ranked.
        </p>

        {/* Compact stats */}
        <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { val: "9", label: "Games" },
            { val: "S–D", label: "Ranked" },
            { val: "Free", label: "Forever" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 900, color: "#00FF94", fontFamily: "var(--font-mono)" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Professional Benchmarks */}
      <Section label="01" title="Professional Benchmarks" subtitle="Clinical cognitive assessments. Serious metrics." accent="#00FF94">
        <SortedGrid games={games} category="clinical" />
      </Section>

      {/* Office Survival */}
      <Section label="02" title="Office Survival Tests" subtitle="Scientifically-flavored stress relief. HR-approved (probably)." accent="#FF6B6B">
        <SortedGrid games={games} category="office" />
        {comingSoonOffice.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 14 }}>
            {comingSoonOffice.map(g => <ComingSoonCard key={g.title} {...g} />)}
          </div>
        )}
      </Section>

      {/* SEO block */}
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #00FF94", borderRadius: "var(--radius-lg)", padding: "32px 28px" }}>
          <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>About</div>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>What Is NeuroBench?</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 14, marginBottom: 10 }}>
            NeuroBench is a free cognitive benchmark platform combining clinical neuroscience metrics with relatable office-life humor. Each test measures a single, real cognitive variable so your result actually means something.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 14 }}>
            Everything runs in your browser. No account needed. Results are ranked against global distributions using our S–D classification system — from Neural God to Fully Institutionalized.
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
          <h2 style={{ fontSize: "clamp(16px, 2vw, 20px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 2 }}>{title}</h2>
          <p style={{ fontSize: 12, color: "var(--text-2)" }}>{subtitle}</p>
        </div>
        <div style={{ marginLeft: "auto", width: 32, height: 2, background: accent, borderRadius: 1, flexShrink: 0 }} />
      </div>
      {children}
    </section>
  );
}
