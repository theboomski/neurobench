import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { GameCard } from "@/components/CategoryCards";

const games = (gamesData as GameData[]).filter(g => g.category === "relationship");

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What are the Four Horsemen of relationship failure?", "acceptedAnswer": { "@type": "Answer", "text": "Gottman's research identified four communication patterns that predict relationship failure: contempt (the most toxic), criticism, defensiveness, and stonewalling. Contempt — treating a partner as inferior — predicts divorce with 93% accuracy in longitudinal studies." } },
    { "@type": "Question", "name": "What is an attachment style?", "acceptedAnswer": { "@type": "Answer", "text": "Attachment styles — Secure, Anxious-Preoccupied, Dismissive-Avoidant, and Fearful-Avoidant — describe how people behave in close relationships based on childhood caregiving experiences. Research shows they are moderately stable but changeable through secure relationship experiences and therapy." } },
    { "@type": "Question", "name": "What are the five love languages?", "acceptedAnswer": { "@type": "Answer", "text": "Gary Chapman's Five Love Languages are: Words of Affirmation, Quality Time, Receiving Gifts, Acts of Service, and Physical Touch. Research supports that mismatched love languages — giving love in ways a partner doesn't register — is a primary driver of relationship dissatisfaction." } }
  ]
};

export const metadata: Metadata = {
  title: "Free Relationship Reveal? | ZAZAZA",
  description: "Free relationship tests with instant results. No signup ever.",
  openGraph: { title: "Free Relationship Reveal? | ZAZAZA", description: "Red flags, attachment styles, love languages. The tests that explain why your relationships work — or don't. Based on Gottman Institute research and attachment theory.", url: "https://zazaza.app/relationship" },
};

export default function Page() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ padding: "16px 0 0" }}><div className="ad-slot ad-banner">Advertisement</div></div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#EC489910", border: "1px solid #EC489925", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#EC4899", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>RELATIONSHIP IQ</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          What Does Your<br /><span style={{ background: "linear-gradient(135deg, #EC4899 0%, #EF4444 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Relationship Reveal?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 12px", lineHeight: 1.65 }}>Red flags, attachment styles, love languages. The tests that explain why your relationships work — or don't. Based on Gottman Institute research and attachment theory.</p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} tests · Gottman-based · ECR Scale · Instant results</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {games.map(g => <GameCard key={g.id} g={g} basePath="relationship" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #EC4899", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Why Relationship Psychology Tests Matter</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>Relationships are the single strongest predictor of long-term wellbeing — more than income, health, or career success (Harvard Study of Adult Development, 75 years). Yet most people navigate them without any psychological framework. ZAZAZA's Relationship IQ suite brings evidence-based tools — Gottman's Four Horsemen, Hazan & Shaver's attachment theory, and Chapman's love languages — into a free, instant format.</p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>Research shows that the difference between healthy and unhealthy relationships isn't conflict frequency — it's conflict pattern. Contempt, in particular, predicts divorce with 93% accuracy in Gottman's longitudinal research. Knowing your patterns is the first step to changing them.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>What are the Four Horsemen of relationship failure?</strong><br />Gottman's research identified four communication patterns that predict relationship failure: contempt (the most toxic), criticism, defensiveness, and stonewalling. Contempt — treating a partner as inferior — predicts divorce with 93% accuracy in longitudinal studies.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>What is an attachment style?</strong><br />Attachment styles — Secure, Anxious-Preoccupied, Dismissive-Avoidant, and Fearful-Avoidant — describe how people behave in close relationships based on childhood caregiving experiences. Research shows they are moderately stable but changeable through secure relationship experiences and therapy.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>What are the five love languages?</strong><br />Gary Chapman's Five Love Languages are: Words of Affirmation, Quality Time, Receiving Gifts, Acts of Service, and Physical Touch. Research supports that mismatched love languages — giving love in ways a partner doesn't register — is a primary driver of relationship dissatisfaction.</p>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}><div className="ad-slot ad-banner">Advertisement</div></div>
    </div>
  );
}
