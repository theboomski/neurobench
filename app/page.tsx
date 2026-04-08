import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { CategoryCard, TrendingCard } from "@/components/CategoryCards";

const games = gamesData as GameData[];

export const metadata: Metadata = {
  title: "ZAZAZA – Free Brain Age, IQ & Personality Tests. No Signup.",
  description: "Free brain age tests, office IQ, eye age, focus, dark personality and vocab tests. No signup. Instant results. Globally ranked.",
  openGraph: {
    title: "ZAZAZA – What's Your Brain Age?",
    description: "Free tests. Zero signup. Instant results. Can your friends beat you?",
    url: "https://zazaza.app",
  },
};

const TRENDING = [
  { id: "reaction-time",   category: "brain-age",       emoji: "⚡", title: "Neural Latency",  desc: "How fast is your brain? Test your reaction speed.",         accent: "#00FF94" },
  { id: "report-or-favor", category: "office-iq",       emoji: "📋", title: "Report or Favor", desc: "Work task or personal favor? You have 1.5 seconds.",        accent: "#EF4444" },
  { id: "dark-triad",      category: "dark-personality", emoji: "🌑", title: "Dark Triad Score","desc": "How dark is your personality? Be honest.",                accent: "#A855F7" },
];

const CATEGORIES = [
  { slug: "brain-age",       emoji: "🧠", title: "Brain Age Test",      desc: "Memory, reaction time, attention & processing speed. Find your cognitive brain age.",       accent: "#00FF94", count: games.filter(g => g.category === "brain-age").length },
  { slug: "office-iq",       emoji: "💼", title: "Office IQ Test",      desc: "Workplace survival instincts, negotiation timing & professional boundary recognition.",     accent: "#FF6B6B", count: games.filter(g => g.category === "office-iq").length },
  { slug: "eye-age",         emoji: "👁️", title: "Eye Age Test",        desc: "Color vision, contrast sensitivity & visual reaction speed. How old are your eyes?",       accent: "#06B6D4", count: games.filter(g => g.category === "eye-age").length },
  { slug: "focus-test",      emoji: "🎯", title: "Focus & Attention",   desc: "Attention span, distraction resistance & cognitive flexibility. ADHD insights included.",   accent: "#F59E0B", count: games.filter(g => g.category === "focus-test").length },
  { slug: "dark-personality",emoji: "🌑", title: "Dark Personality",    desc: "Dark Triad score, empathy index & manipulation detection. Are you ready for the truth?",   accent: "#A855F7", count: games.filter(g => g.category === "dark-personality").length },
  { slug: "word-iq",         emoji: "📚", title: "Vocab & Word IQ",     desc: "Vocabulary age, word recognition speed & semantic intelligence. How smart is your language?",accent: "#F97316", count: games.filter(g => g.category === "word-iq").length },
];

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      {/* Hero */}
      <section style={{ padding: "44px 0 36px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(32px,6.5vw,64px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 14 }}>
          Know Your<br />
          <span style={{ background: "linear-gradient(135deg, #00FF94 0%, #00B4DB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>True Self.</span>
        </h1>
        <p style={{ fontSize: "clamp(14px,2vw,18px)", color: "var(--text-2)", marginBottom: 28, lineHeight: 1.6 }}>You might be shocked. 😳</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {["🆓 Free Forever", "✦ No Signup", "⚡ Instant Results"].map(b => (
            <div key={b} style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderRadius: 999, padding: "5px 14px", fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{b}</div>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          <h2 style={{ fontSize: "clamp(16px,2.5vw,20px)", fontWeight: 800, letterSpacing: "-0.02em" }}>Trending Now</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {TRENDING.map(t => <TrendingCard key={t.id} {...t} />)}
        </div>
      </section>

      {/* Categories */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>01</span>
          <h2 style={{ fontSize: "clamp(16px,2.5vw,20px)", fontWeight: 800, letterSpacing: "-0.02em" }}>All Test Categories</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {CATEGORIES.map(cat => <CategoryCard key={cat.slug} {...cat} />)}
        </div>
      </section>

      {/* SEO */}
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #00FF94", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>About ZAZAZA</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>The Free Test Hub That Doesn&apos;t Make You Sign Up First.</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>ZAZAZA is a free global test hub covering brain age, office IQ, eye age, focus & attention, dark personality, and vocabulary intelligence. Every test is free, every result is instant, and no account is ever required. Unlike Lumosity and BrainHQ, ZAZAZA never charges you or makes you create an account.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, marginTop: 20 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 10 }}><strong style={{ color: "var(--text-1)" }}>Is ZAZAZA really free?</strong><br />Yes. Every test is completely free. No subscription, no trial, no hidden fees. Ever.</p>
            <p style={{ marginBottom: 10 }}><strong style={{ color: "var(--text-1)" }}>Do I need to create an account?</strong><br />No. Take any test instantly without signing up. Your scores are saved locally in your browser.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>How do I share my results?</strong><br />After any test, tap SHARE to generate a shareable image card with your score, rank, and brain age.</p>
          </div>
        </div>
      </section>

      <div style={{ paddingBottom: 24 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
