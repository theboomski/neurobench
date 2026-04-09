import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { GameCard } from "@/components/CategoryCards";

const games = (gamesData as GameData[]).filter(g => g.category === "focus-test");

export const metadata: Metadata = {
  title: "Free Focus? Test | ZAZAZA",
  description: "Free focus-test tests with instant results. No signup ever.",
  openGraph: { title: "Free Focus? Test | ZAZAZA", description: "Free tests. Instant results. No signup.", url: "https://zazaza.app/focus-test" },
};


const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is a normal attention span?", "acceptedAnswer": { "@type": "Answer", "text": "Average sustained attention duration for adults is approximately 20 minutes before performance degrades. However, selective attention — filtering distractors — is measured differently. ZAZAZA's attention tests measure vigilance, not duration preference." } },
    { "@type": "Question", "name": "Can an online test screen for ADHD?", "acceptedAnswer": { "@type": "Answer", "text": "Online attention tests can measure ADHD-relevant cognitive metrics like sustained vigilance, false alarm rate, and task-switching cost. They are not diagnostic tools. A formal ADHD diagnosis requires clinical assessment by a licensed psychologist or psychiatrist." } },
    { "@type": "Question", "name": "How can I improve my attention span?", "acceptedAnswer": { "@type": "Answer", "text": "Mindfulness meditation, aerobic exercise, and reducing digital multitasking measurably improve sustained attention within weeks. Single-tasking practice and sleep optimization are the highest-impact interventions." } },
    { "@type": "Question", "name": "What is task-switching cost?", "acceptedAnswer": { "@type": "Answer", "text": "Task-switching cost is the additional reaction time incurred when switching between tasks versus repeating the same task. It measures cognitive flexibility. Average switching cost is 200–400ms. Top performers show costs below 100ms." } }
  ]
};

export default function Page() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ padding: "16px 0 0" }}><div className="ad-slot ad-banner">Advertisement</div></div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#F59E0B10", border: "1px solid #F59E0B25", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#F59E0B", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>FOCUS & ATTENTION</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          Can You Actually<br /><span style={{ background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Focus?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 12px", lineHeight: 1.65 }}>Attention span, distraction resistance, and cognitive flexibility. The focus tests that reveal whether your brain is built for the modern world — or broken by it.</p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} tests · 3 free tests · ADHD insights · Instant results</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {games.map(g => <GameCard key={g.id} g={g} basePath="focus-test" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #F59E0B", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>What Do Focus & Attention Tests Measure?</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>Attention is not a single ability — it comprises sustained attention (vigilance over time), selective attention (filtering distractors), and divided attention (switching between tasks). ZAZAZA's focus tests target each component separately using paradigms from clinical neuropsychology, including the Continuous Performance Test (CPT) and flanker task.</p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>ADHD affects approximately 5-7% of adults globally. These tests are not diagnostic but provide ADHD-relevant insights into attentional performance. High scores do not rule out ADHD; low scores do not confirm it.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>Can these tests screen for ADHD?</strong><br />These tests measure attention-relevant cognitive abilities and provide ADHD-related insights. They are not clinical ADHD screening tools. For formal ADHD assessment, consult a licensed psychologist.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>What affects attention test performance?</strong><br />Sleep, caffeine, stress, and time of day all affect attention. For most accurate results, test when rested and in a quiet environment.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>Are focus tests free?</strong><br />Yes. All ZAZAZA focus and attention tests are completely free with no account required.</p>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}><div className="ad-slot ad-banner">Advertisement</div></div>
    </div>
  );
}
