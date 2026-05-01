import type { Metadata } from "next";
import type { GameData } from "@/lib/types";
import { ALL_GAMES } from "@/lib/games";
import { GameCard } from "@/components/CategoryCards";

const games = ALL_GAMES.filter(g => g.category === "brain-age");

export const metadata: Metadata = {
  title: "Free Brain Tests – Reaction Time, Memory & Cognitive Tests | ZAZAZA",
  description:
    "Test your reaction time, working memory, attention span, and more. Free online brain benchmarks with global leaderboards. No signup needed.",
  openGraph: {
    title: "Free Brain Tests – Reaction Time, Memory & Cognitive Tests | ZAZAZA",
    description:
      "Test your reaction time, working memory, attention span, and more. Free online brain benchmarks with global leaderboards. No signup needed.",
    url: "https://zazaza.app/brain-age",
  },
};


const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is a normal brain age for a 30-year-old?", "acceptedAnswer": { "@type": "Answer", "text": "A neurologically healthy 30-year-old typically scores between brain age 28–35 across cognitive domains. Reaction time, working memory, and processing speed all peak in the mid-20s, so a brain age of 25–30 at age 30 is considered above average." } },
    { "@type": "Question", "name": "How accurate is a free online brain age test?", "acceptedAnswer": { "@type": "Answer", "text": "Free online brain age tests like ZAZAZA use validated cognitive paradigms — reaction time, digit span, Stroop effect — from peer-reviewed research. They provide reliable relative rankings but are designed for self-assessment, not clinical diagnosis." } },
    { "@type": "Question", "name": "Can you improve your brain age?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Working memory, reaction time, and processing speed are all trainable. Regular cognitive challenges, aerobic exercise, quality sleep, and reduced screen time show measurable improvement within weeks." } },
    { "@type": "Question", "name": "What is the average reaction time by age?", "acceptedAnswer": { "@type": "Answer", "text": "Average simple reaction time is approximately 250ms for young adults (18–25), increasing to 300–350ms by age 50 and 400ms+ after 70. Top performers score under 200ms regardless of age." } }
  ]
};

export default function BrainAgePage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ padding: "16px 0 0" }}><div className="ad-slot ad-banner">Advertisement</div></div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#00FF9410", border: "1px solid #00FF9425", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>BRAIN AGE TEST</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          How Old Is<br /><span style={{ background: "linear-gradient(135deg, #00FF94 0%, #00B4DB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Brain?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 12px", lineHeight: 1.65 }}>Take a clinically-inspired cognitive test and find your brain age in under 60 seconds. Free. No signup. Results you can share.</p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} free tests · S–D global ranking · Instant results</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {games.map(g => <GameCard key={g.id} g={g} basePath="brain-age" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #00FF94", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>What Is a Brain Age Test?</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>A brain age test measures how efficiently your cognitive functions perform compared to population norms. ZAZAZA's Brain Age Test suite covers processing speed, working memory, visual attention, inhibitory control, and temporal precision — all in under 60 seconds each. Percentile rankings are derived from peer-reviewed normative data including Wechsler Adult Intelligence Scale norms and reaction time population studies.</p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>Unlike paid platforms such as Lumosity or BrainHQ, ZAZAZA provides free, instant access to clinically-inspired cognitive benchmarks with no account required. A 35-year-old scoring in the top 5% has a brain age of approximately 18–22 for that cognitive domain.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>How accurate is the brain age test?</strong><br />Tests are based on validated cognitive science paradigms used in academic research. Designed for self-assessment and entertainment, not clinical diagnosis.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>How long does a brain age test take?</strong><br />Each test takes 30–90 seconds. You can take one or all {games.length} — there is no required sequence.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>Can I improve my brain age score?</strong><br />Yes. Reaction time and working memory are among the most trainable cognitive metrics. Regular practice shows measurable improvement within weeks.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>Is ZAZAZA free?</strong><br />Yes. Every Brain Age test is completely free. No account, no subscription, no payment. Ever.</p>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}><div className="ad-slot ad-banner">Advertisement</div></div>
    </div>
  );
}
