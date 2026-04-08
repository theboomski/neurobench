import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { GameCard } from "@/components/CategoryCards";

const games = (gamesData as GameData[]).filter(g => g.category === "eye-age");

export const metadata: Metadata = {
  title: "Free Your Eyes? Test | ZAZAZA",
  description: "Free eye-age tests with instant results. No signup ever.",
  openGraph: { title: "Free Your Eyes? Test | ZAZAZA", description: "Free tests. Instant results. No signup.", url: "https://zazaza.app/eye-age" },
};

export default function Page() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ padding: "16px 0 0" }}><div className="ad-slot ad-banner">Advertisement</div></div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#06B6D410", border: "1px solid #06B6D425", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#06B6D4", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>EYE AGE TEST</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          How Old Are<br /><span style={{ background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Eyes?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 12px", lineHeight: 1.65 }}>Color vision, contrast sensitivity, and visual reaction speed. Find out your eye age in under 60 seconds. Free. No signup required.</p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} tests · 3 free tests · Globally compared · Instant results</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {games.map(g => <GameCard key={g.id} g={g} basePath="eye-age" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #06B6D4", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>What Is an Eye Age Test?</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>Eye age measures how well your visual system performs across three key domains: color vision accuracy, contrast sensitivity threshold, and visual processing speed. Unlike standard 20/20 acuity tests, eye age tests capture the full functional range of your visual system — including early signs of decline that standard optometry charts miss.</p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>Color blindness affects approximately 8% of males globally. Contrast sensitivity begins declining in the mid-30s. Visual reaction time increases measurably from age 25 onward. These tests provide a rapid, free, no-signup assessment across all three dimensions.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>Can I take a color blind test online?</strong><br />Yes. Our digital Ishihara-inspired color blind test provides a rapid screening for red-green color vision deficiency. It is not a clinical diagnosis — consult an optometrist for formal assessment.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>What affects eye age test results?</strong><br />Screen calibration, ambient lighting, and brightness affect results. For most accurate results, use maximum brightness in moderate ambient light.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>Is the eye age test free?</strong><br />Yes. All eye age tests are completely free. No account or signup required.</p>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}><div className="ad-slot ad-banner">Advertisement</div></div>
    </div>
  );
}
