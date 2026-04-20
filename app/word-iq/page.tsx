import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { GameCard } from "@/components/CategoryCards";

const games = (gamesData as GameData[]).filter(g => g.category === "word-iq");

export const metadata: Metadata = {
  title: "Free Your Language? Test | ZAZAZA",
  description: "Free word-iq tests with instant results. No signup ever.",
  openGraph: { title: "Free Your Language? Test | ZAZAZA", description: "Free tests. Instant results. No signup.", url: "https://zazaza.app/word-iq" },
};


const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is vocabulary age?", "acceptedAnswer": { "@type": "Answer", "text": "Vocabulary age estimates how large your lexical knowledge is relative to different age groups. Unlike most cognitive metrics that peak in the 20s, vocabulary continues growing throughout adulthood. An average educated adult knows approximately 40,000–60,000 word families." } },
    { "@type": "Question", "name": "How can I improve my vocabulary?", "acceptedAnswer": { "@type": "Answer", "text": "Wide reading across diverse genres is the single most effective vocabulary intervention. Studies show measurable vocabulary gains within weeks of consistent reading. Word games, flashcard apps, and writing regularly also accelerate lexical growth." } },
    { "@type": "Question", "name": "What is lexical decision speed?", "acceptedAnswer": { "@type": "Answer", "text": "Lexical decision speed measures how fast your brain accesses word meaning from written input. Skilled adult readers average 600–800ms per word. Faster access indicates more efficient mental lexicon organization and stronger orthographic representations." } },
    { "@type": "Question", "name": "Does being bilingual affect word IQ tests?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Bilingual individuals often show slightly slower lexical decision times due to cross-language competition, but typically have larger total vocabulary across both languages. Bilingualism is associated with stronger cognitive flexibility and delayed cognitive aging." } }
  ]
};

export default function Page() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ padding: "16px 0 0" }}><div className="ad-slot ad-banner">Advertisement</div></div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#F9731610", border: "1px solid #F9731625", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#F97316", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>VOCAB & WORD IQ</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          How Smart Is<br /><span style={{ background: "linear-gradient(135deg, #F97316 0%, #EAB308 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Language?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 12px", lineHeight: 1.65 }}>Vocabulary size, word recognition speed, and semantic association IQ. The verbal intelligence tests that reveal how your language brain compares to the world.</p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} tests · 3 free tests · Vocabulary age · Instant results</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {games.map(g => <GameCard key={g.id} g={g} basePath="word-iq" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #F97316", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>What Does Vocab Age Measure?</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>Vocabulary size is one of the strongest single predictors of verbal intelligence, academic achievement, and professional success. Unlike most cognitive abilities that peak in the mid-20s, vocabulary continues growing throughout adulthood. The average educated adult knows approximately 40,000–60,000 word families. ZAZAZA's Word IQ suite measures three distinct verbal dimensions: lexical breadth, lexical access speed, and semantic network richness.</p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>These tests are grounded in psycholinguistic research including Nation's Vocabulary Levels Test and Collins & Loftus's semantic network theory. Word IQ is particularly valuable for high-income professional contexts, driving premium advertising CPM rates in education and career development.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>Can I improve my vocabulary age?</strong><br />Yes. Vocabulary is the most trainable cognitive metric. Wide reading across diverse genres is the single most effective intervention. Gains are measurable within weeks.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>Does vocabulary age keep growing?</strong><br />Yes — unlike processing speed or working memory, vocabulary continues growing throughout adulthood. A 60-year-old typically has a larger vocabulary than a 25-year-old.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>Are Word IQ tests free?</strong><br />Yes. All ZAZAZA Word IQ tests are completely free. No account or signup required. Ever.</p>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}><div className="ad-slot ad-banner">Advertisement</div></div>
    </div>
  );
}
