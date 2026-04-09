import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { GameCard } from "@/components/CategoryCards";

const games = (gamesData as GameData[]).filter(g => g.category === "dark-personality");

export const metadata: Metadata = {
  title: "Free Your Personality? Test | ZAZAZA",
  description: "Free dark-personality tests with instant results. No signup ever.",
  openGraph: { title: "Free Your Personality? Test | ZAZAZA", description: "Free tests. Instant results. No signup.", url: "https://zazaza.app/dark-personality" },
};


const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is the Dark Triad?", "acceptedAnswer": { "@type": "Answer", "text": "The Dark Triad is a cluster of three subclinical personality traits: narcissism (entitlement and grandiosity), Machiavellianism (strategic manipulation), and psychopathy (callousness and impulsivity). Identified by Paulhus and Williams (2002), these traits exist on a continuum in the general population." } },
    { "@type": "Question", "name": "Is a high Dark Triad score bad?", "acceptedAnswer": { "@type": "Answer", "text": "Not necessarily. Subclinical narcissism correlates with leadership emergence and confidence. Machiavellianism predicts strategic thinking. Context determines whether Dark Triad traits are adaptive or maladaptive. Most successful professionals score moderately on at least one dimension." } },
    { "@type": "Question", "name": "What is the difference between cognitive and affective empathy?", "acceptedAnswer": { "@type": "Answer", "text": "Cognitive empathy is the ability to understand another person's mental state (theory of mind). Affective empathy is sharing another's emotional experience (emotional contagion). High cognitive empathy without affective empathy is associated with Machiavellianism. High affective empathy can lead to empathy fatigue." } },
    { "@type": "Question", "name": "How do I know if someone is manipulating me?", "acceptedAnswer": { "@type": "Answer", "text": "Common manipulation tactics include flattery to create obligation, artificial urgency, social proof exploitation, reciprocity pressure, and guilt-tripping. ZAZAZA's Manipulation Detector tests your ability to identify these patterns in real social scenarios." } }
  ]
};

export default function Page() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ padding: "16px 0 0" }}><div className="ad-slot ad-banner">Advertisement</div></div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#A855F710", border: "1px solid #A855F725", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#A855F7", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>DARK PERSONALITY</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          How Dark Is<br /><span style={{ background: "linear-gradient(135deg, #A855F7 0%, #EF4444 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Personality?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 12px", lineHeight: 1.65 }}>Narcissism. Machiavellianism. Psychopathy. Empathy. The personality dimensions most people pretend don't exist — but science measures them precisely. Are you ready for the truth?</p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} tests · 3 free tests · Science-backed · Instant results</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {games.map(g => <GameCard key={g.id} g={g} basePath="dark-personality" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #A855F7", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>What Is the Dark Triad?</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>The Dark Triad is a cluster of three subclinical personality traits — narcissism, Machiavellianism, and psychopathy — identified by psychologists Paulhus and Williams in 2002. Unlike clinical personality disorders, these are normal personality dimensions found throughout the general population. Most people score somewhere on each scale.</p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>High narcissism correlates with leadership emergence and confidence. High Machiavellianism predicts strategic thinking and negotiation skill. These tests are grounded in validated academic instruments including the NPI, Mach-IV, and SRP scales.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>Is a high Dark Triad score bad?</strong><br />Not necessarily. Subclinical levels of these traits are found throughout successful populations. Context determines whether these traits are adaptive or maladaptive.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>Are these tests clinically validated?</strong><br />Our tests are based on validated research scales. They are designed for self-insight and entertainment, not clinical diagnosis.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>Are dark personality tests free?</strong><br />Yes. All ZAZAZA dark personality tests are completely free. No account or signup required.</p>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}><div className="ad-slot ad-banner">Advertisement</div></div>
    </div>
  );
}
