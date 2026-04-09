import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { GameCard } from "@/components/CategoryCards";

const games = (gamesData as GameData[]).filter(g => g.category === "office-iq");

export const metadata: Metadata = {
  title: "Free You At Work? Test | ZAZAZA",
  description: "Free office-iq tests with instant results. No signup ever.",
  openGraph: { title: "Free You At Work? Test | ZAZAZA", description: "Free tests. Instant results. No signup.", url: "https://zazaza.app/office-iq" },
};


const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What does Office IQ measure?", "acceptedAnswer": { "@type": "Answer", "text": "Office IQ measures workplace-relevant cognitive skills: boundary recognition speed, selective inhibition, negotiation timing, and strategic decision-making under pressure — the skills that predict career advancement beyond raw IQ." } },
    { "@type": "Question", "name": "Is there a real test for workplace intelligence?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Organizational psychology uses go/no-go tasks, optimal stopping theory assessments, and emotional intelligence scales to measure workplace performance. ZAZAZA's Office IQ tests are grounded in these paradigms." } },
    { "@type": "Question", "name": "How can I improve my office IQ?", "acceptedAnswer": { "@type": "Answer", "text": "Deliberate practice in decision-making under time pressure, improving emotional regulation, and developing pattern recognition in social dynamics all measurably improve workplace performance metrics." } }
  ]
};

export default function Page() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ padding: "16px 0 0" }}><div className="ad-slot ad-banner">Advertisement</div></div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#FF6B6B10", border: "1px solid #FF6B6B25", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#FF6B6B", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>OFFICE IQ TEST</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          How Smart Are<br /><span style={{ background: "linear-gradient(135deg, #FF6B6B 0%, #F97316 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>You At Work?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 12px", lineHeight: 1.65 }}>Test your workplace survival instincts, negotiation timing, and professional boundary recognition. You might be more — or less — office-ready than you think.</p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} tests · S–D global ranking · Instant results</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {games.map(g => <GameCard key={g.id} g={g} basePath="office-iq" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #FF6B6B", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>What Is an Office IQ Test?</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>Office IQ measures the cognitive and behavioral skills that determine workplace performance beyond raw intelligence. It covers professional boundary recognition, selective attention under pressure, negotiation timing instinct, and strategic decision-making speed. Research in organizational psychology shows emotional intelligence, inhibitory control, and rapid categorical decision-making are stronger predictors of career advancement than IQ alone.</p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>ZAZAZA's Office IQ tests are grounded in real cognitive science paradigms — go/no-go tasks, optimal stopping theory, and professional boundary enforcement speed — wrapped in workplace humor.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>What does Office IQ measure?</strong><br />Workplace-specific cognitive skills: boundary recognition speed, selective inhibition, negotiation timing, and strategic navigation under increasing constraints.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>Are these tests scientifically valid?</strong><br />The underlying cognitive paradigms are scientifically validated. The workplace framing is for entertainment. Results are not professional assessments.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>Is the Office IQ Test free?</strong><br />Yes. All tests are completely free with no account required.</p>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}><div className="ad-slot ad-banner">Advertisement</div></div>
    </div>
  );
}
