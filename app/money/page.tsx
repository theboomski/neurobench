import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { GameCard } from "@/components/CategoryCards";

const games = (gamesData as GameData[]).filter(g => g.category === "money");

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is financial literacy and why does it matter?", "acceptedAnswer": { "@type": "Answer", "text": "Financial literacy is the ability to understand and apply financial concepts: compound interest, inflation, diversification, risk/return tradeoffs. The OECD finds that only 52% of adults globally can answer basic compound interest questions. This gap costs households an estimated $1,200/year in avoidable fees and suboptimal decisions." } },
    { "@type": "Question", "name": "What is loss aversion?", "acceptedAnswer": { "@type": "Answer", "text": "Loss aversion — identified by Kahneman and Tversky — is the psychological tendency to feel losses approximately twice as intensely as equivalent gains. This causes investors to sell winners too early, hold losers too long, and systematically underinvest in growth assets. Recognizing it is the first step to overriding it." } },
    { "@type": "Question", "name": "What is the difference between risk capacity and risk appetite?", "acceptedAnswer": { "@type": "Answer", "text": "Risk Capacity is your objective ability to absorb financial losses (based on income stability, time horizon, and liquidity). Risk Appetite is your subjective psychological comfort with uncertainty. Most people have a risk appetite significantly below their optimal risk capacity, leading to systematic underinvestment in growth assets." } }
  ]
};

export const metadata: Metadata = {
  title: "Free Millionaire's Mindset? | ZAZAZA",
  description: "Free money tests with instant results. No signup ever.",
  openGraph: { title: "Free Millionaire's Mindset? | ZAZAZA", description: "Money mindset, risk tolerance, financial literacy. The tests that reveal whether your relationship with money is building wealth — or quietly destroying it.", url: "https://zazaza.app/money" },
};

export default function Page() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ padding: "16px 0 0" }}><div className="ad-slot ad-banner">Advertisement</div></div>
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#F59E0B10", border: "1px solid #F59E0B25", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#F59E0B", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>MONEY IQ</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5.5vw,56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 14 }}>
          Do You Have a<br /><span style={{ background: "linear-gradient(135deg, #F59E0B 0%, #10B981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Millionaire's Mindset?</span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto 12px", lineHeight: 1.65 }}>Money mindset, risk tolerance, financial literacy. The tests that reveal whether your relationship with money is building wealth — or quietly destroying it.</p>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{games.length} tests · Behavioral economics · Prospect Theory · Instant results</p>
      </section>
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {games.map(g => <GameCard key={g.id} g={g} basePath="money" />)}
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #F59E0B", borderRadius: "var(--radius-lg)", padding: "36px 32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Why Financial Psychology Tests Matter</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 14 }}>Financial literacy predicts wealth accumulation more reliably than income. Research across 140 countries (Lusardi & Mitchell) shows that people in the top quartile of financial literacy accumulate three times more wealth than those in the bottom quartile — at identical income levels. The gap isn't about money. It's about knowledge and mindset.</p>
          <p style={{ color: "var(--text-2)", lineHeight: 1.9, fontSize: 14, marginBottom: 24 }}>Behavioral economics research (Kahneman & Tversky, Thaler) identifies systematic psychological biases — loss aversion, present bias, sunk cost fallacy — that cause even intelligent people to make consistently poor financial decisions. ZAZAZA's Money IQ tests measure these dimensions and reveal where your financial psychology is working for or against you.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h3>
          <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>What is financial literacy and why does it matter?</strong><br />Financial literacy is the ability to understand and apply financial concepts: compound interest, inflation, diversification, risk/return tradeoffs. The OECD finds that only 52% of adults globally can answer basic compound interest questions. This gap costs households an estimated $1,200/year in avoidable fees and suboptimal decisions.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "var(--text-1)" }}>What is loss aversion?</strong><br />Loss aversion — identified by Kahneman and Tversky — is the psychological tendency to feel losses approximately twice as intensely as equivalent gains. This causes investors to sell winners too early, hold losers too long, and systematically underinvest in growth assets. Recognizing it is the first step to overriding it.</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-1)" }}>What is the difference between risk capacity and risk appetite?</strong><br />Risk Capacity is your objective ability to absorb financial losses (based on income stability, time horizon, and liquidity). Risk Appetite is your subjective psychological comfort with uncertainty. Most people have a risk appetite significantly below their optimal risk capacity, leading to systematic underinvestment in growth assets.</p>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 24 }}><div className="ad-slot ad-banner">Advertisement</div></div>
    </div>
  );
}
