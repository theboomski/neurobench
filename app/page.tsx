import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { SortedGrid, ComingSoonCard } from "@/components/GameCard";
import { dict } from "@/lib/i18n";

const t = dict.en;
const games = gamesData as GameData[];

const COMING_SOON = [
  { title:"Synaptic Accuracy Test", clinicalTitle:"Selective Attention Assessment", emoji:"🎯", accent:"#8B5CF6", category:"Professional Benchmark" },
  { title:"Memory Matrix",          clinicalTitle:"Working Memory Capacity Test",  emoji:"🧠", accent:"#3B82F6", category:"Professional Benchmark" },
  { title:"Meeting Escape Artist",  clinicalTitle:"Cognitive Load Threshold Test", emoji:"🏃", accent:"#F59E0B", category:"Office Survival Test" },
  { title:"Inbox Zero Sprint",      clinicalTitle:"Decision Velocity Assessment",  emoji:"📧", accent:"#EC4899", category:"Office Survival Test" },
];

export const metadata: Metadata = {
  title: "NeuroBench – The Cognitive Performance Lab",
  description: t.site.description,
};

export default function HomePage() {
  const clinical = games.filter(g => g.category === "clinical");
  const office   = games.filter(g => g.category === "office");
  const comingSoonClinical = COMING_SOON.filter(g => g.category === "Professional Benchmark");
  const comingSoonOffice   = COMING_SOON.filter(g => g.category === "Office Survival Test");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

      {/* Top Ad */}
      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      {/* Hero */}
      <section style={{ padding: "64px 0 56px", textAlign: "center" }}>
        {/* Lab badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--bg-card)", border: "1px solid var(--border-md)", borderRadius: 999, padding: "6px 16px", marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF94", display: "inline-block", boxShadow: "0 0 8px #00FF94" }} />
          <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Cognitive Assessment Platform · Est. 2025
          </span>
        </div>

        <h1 style={{ fontSize: "clamp(38px, 6.5vw, 80px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.04, marginBottom: 20 }}>
          Know Your<br />
          <span style={{ background: "linear-gradient(135deg, #00FF94 0%, #00B4DB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Neural Profile.
          </span>
        </h1>

        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 48px", lineHeight: 1.7 }}>
          Clinical-grade benchmarks. Office-survival humor.<br />Your cognitive report card — instant, free, shareable.
        </p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { val: "250ms", label: "Avg. Neural Latency" },
            { val: "2", label: "Active Protocols" },
            { val: "S–D", label: "Ranking System" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4, fontFamily: "var(--font-mono)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Professional Benchmarks */}
      <Section label="01" title="Professional Benchmarks" subtitle="Clinical cognitive assessments. Serious metrics. Shareable results." accent="#00FF94">
        <SortedGrid games={games} category="clinical" />
        {comingSoonClinical.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 14 }}>
            {comingSoonClinical.map(g => <ComingSoonCard key={g.title} {...g} />)}
          </div>
        )}
      </Section>

      {/* Section: Office Survival Tests */}
      <Section label="02" title="Office Survival Tests" subtitle="Scientifically-flavored stress relief. 100% cathartic. HR-approved (probably)." accent="#FF6B6B">
        <SortedGrid games={games} category="office" />
        {comingSoonOffice.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 14 }}>
            {comingSoonOffice.map(g => <ComingSoonCard key={g.title} {...g} />)}
          </div>
        )}
      </Section>

      {/* SEO block */}
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #00FF94", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>About This Platform</div>
          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 14 }}>What Is NeuroBench?</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 14, marginBottom: 12 }}>
            NeuroBench is a free cognitive benchmark platform combining clinical neuroscience metrics with relatable office-life humor. Each protocol is designed around a single, measurable cognitive variable — reaction time, motor tapping speed, attentional focus — so your result is actually meaningful, not just entertaining.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 14 }}>
            All protocols run entirely in your browser. No account needed. Personal records are stored locally on your device. Results are ranked against global statistical distributions and expressed using our proprietary S–D classification system — from Neural God to Fully Institutionalized.
          </p>
        </div>
      </section>

      {/* Bottom Ad */}
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
    <section style={{ paddingBottom: 64 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", paddingTop: 4 }}>{label}</span>
        <div>
          <h2 style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>{subtitle}</p>
        </div>
        <div style={{ marginLeft: "auto", width: 40, height: 2, background: accent, borderRadius: 1, marginTop: 10, flexShrink: 0 }} />
      </div>
      {children}
    </section>
  );
}
