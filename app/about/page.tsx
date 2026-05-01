import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About ZAZAZA – Free Brain Age Tests & Self-Discovery Platform",
  description: "ZAZAZA is a free global test hub for brain age, personality, relationships, and financial psychology. No signup. No payment. Instant results.",
  openGraph: {
    title: "About ZAZAZA – Play the Test, Discover the World",
    description: "Free cognitive tests, personality assessments, and financial IQ tools. No signup ever. Built on peer-reviewed science.",
    url: "https://zazaza.app/about",
  },
};

const CATEGORIES = [
  { emoji: "🧠", name: "Brain Tests", href: "/brain-age", desc: "Reaction time, working memory, sequence memory, attention span, and cognitive processing speed." },
  { emoji: "🎮", name: "Games", href: "/office-iq", desc: "Survival instincts, reflexes, straregies, and more." },
  { emoji: "🌑", name: "Personality", href: "/dark-personality", desc: "Dark Triad, empathy quotient, manipulation pattern recognition, main character syndrome, and more." },
  { emoji: "🏆", name: "Brackets", href: "/bracket", desc: "Community-made bracket tournaments and balance games. Vote, create, and share your results." },
  { emoji: "🌍", name: "Arena", href: "/arena", desc: "Global country rankings, weekly leaderboards, and the Hall of Fame. Where do you stand?" },
  { emoji: "📝", name: "Blog", href: "/blog", desc: "The science behind the tests. Brain age, cognitive psychology, behavioral finance, and dark personality research — in plain English." },
  { emoji: "💌", name: "Fun Sends", href: "/send", desc: "Send a fun, free personalized card to someone you love, miss, or want to challenge. No signup. Instant." },
];

const S = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 10, color: "#00FF94", fontFamily: "monospace", letterSpacing: "0.12em" }}>{n} /</span>
      <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h2>
    </div>
    <div style={{ color: "rgba(160,160,160,1)", lineHeight: 1.9, fontSize: 14 }}>{children}</div>
  </div>
);

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

      {/* Hero */}
      <div style={{ marginBottom: 52 }}>
        <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>About ZAZAZA</div>
        <h1 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 18 }}>
          Play the Test.<br />
          <span style={{ background: "linear-gradient(135deg, #00FF94 0%, #00B4DB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Discover the World.
          </span>
        </h1>
        <p style={{ fontSize: 16, color: "rgba(160,160,160,1)", lineHeight: 1.85, maxWidth: 580 }}>
          At ZAZAZA, we believe self-discovery should be as instant as a click. Our name represents a journey of infinite curiosity — from Z to A.
        </p>
      </div>

      <S n="01" title="Why ZAZAZA Exists">
        <p style={{ marginBottom: 14 }}>
          Most platforms that offer brain training, personality tests, or financial literacy tools make you create an account, start a free trial, or pay a subscription before you can take a single test. We think that&apos;s backwards.
        </p>
        <p style={{ marginBottom: 14 }}>
          ZAZAZA was built on a simple premise: the insight should come first. Every test on ZAZAZA is completely free, requires no account, and delivers results instantly. We then get out of the way so you can share, reflect, and explore.
        </p>
        <p>
          We aren&apos;t just here to give you a score. We&apos;re here to spark that &quot;Aha!&quot; moment — where you learn something new about yourself, the fascinating science behind a simple reaction time test, or the psychology woven into a color perception puzzle.
        </p>
      </S>

      <S n="02" title="The Philosophy: Three Aha! Moments">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, margin: "16px 0" }}>
          {[
            { za: "ZA", title: "Aha! — Self", desc: "Discover what you didn't know about yourself. Your brain age. Your attachment style. Your money mindset." },
            { za: "ZA", title: "Awareness — World", desc: "The science inside every test: Stroop Effect, Prospect Theory, Gottman's Four Horsemen. Tests as windows into how the world works." },
            { za: "ZA", title: "Alignment — Connection", desc: "Share your results. Challenge your friends. See where you stand globally. Grow your world — one test at a time." },
          ].map((z, i) => (
            <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "2px solid #00FF94", borderRadius: 10, padding: "16px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#00FF94", fontFamily: "monospace", marginBottom: 6 }}>{z.za} —</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>{z.title}</div>
              <div style={{ fontSize: 12, color: "rgba(140,140,140,1)", lineHeight: 1.7 }}>{z.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 14 }}>
          ZAZAZA is a bridge — between complex neuroscience and daily curiosity, and between people. Compare your results, challenge the people around you, and grow your world one test at a time.
        </p>
      </S>

      <S n="03" title="The Science Behind the Tests">
        <p style={{ marginBottom: 14 }}>
          Every ZAZAZA test is grounded in validated cognitive science paradigms, clinical psychology research, and behavioral economics literature. We don&apos;t invent metrics — we adapt established research instruments into accessible, free formats.
        </p>
        <p style={{ marginBottom: 14 }}>
          Our Brain Age suite uses reaction time norms from population research (mean 250ms, SD 40ms), Wechsler Adult Intelligence Scale digit span normative data (mean 7.2, SD 1.3), and Stroop Effect paradigms (Golden, 1978). Our Dark Personality tests are based on the NPI (narcissism), Mach-IV (Machiavellianism), and SRP scales. Our Relationship tests draw on Gottman Institute longitudinal research and the Experiences in Close Relationships scale (Brennan et al., 1998).
        </p>
        <p>
          Results are designed for self-assessment and entertainment. They are not clinical diagnoses. For formal psychological or medical assessment, we always recommend consulting a licensed professional.
        </p>
      </S>

      <S n="04" title="What We Offer">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, margin: "16px 0" }}>
          {CATEGORIES.map(cat => (
            <Link key={cat.href} href={cat.href} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 12px", transition: "border-color 0.2s" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{cat.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>{cat.name}</div>
                <div style={{ fontSize: 11, color: "rgba(120,120,120,1)", lineHeight: 1.6 }}>{cat.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </S>

      <S n="05" title="The ZAZAZA Standard">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "14px 0" }}>
          {[
            ["🆓", "Free forever", "Every test, every result, every time. No exceptions."],
            ["✦", "No signup", "No account. No email. No friction. Ever."],
            ["⚡", "Instant results", "Under 60 seconds from click to insight."],
            ["🌍", "Globally ranked", "Your score compared to real population norms."],
            ["🔬", "Science-backed", "Built on peer-reviewed research, not guesswork."],
            ["🔒", "Privacy first", "Scores stay in your browser. We collect no personal data."],
          ].map(([emoji, title, desc]) => (
            <div key={title as string} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 11, color: "rgba(120,120,120,1)", lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </S>

      <S n="06" title="Contact">
        <p>
          Questions, feedback, or partnership enquiries:{" "}
          <a href="mailto:theboomski@gmail.com" style={{ color: "#00FF94", textDecoration: "none" }}>theboomski@gmail.com</a>
        </p>
        <p style={{ marginTop: 10 }}>
          For privacy-related requests:{" "}
          <a href="mailto:theboomski@gmail.com" style={{ color: "#00FF94", textDecoration: "none" }}>theboomski@gmail.com</a>
        </p>
      </S>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/privacy-policy" style={{ fontSize: 12, color: "rgba(100,100,100,1)", textDecoration: "none" }}>Privacy Policy</Link>
        <Link href="/terms-of-service" style={{ fontSize: 12, color: "rgba(100,100,100,1)", textDecoration: "none" }}>Terms of Service</Link>
        <Link href="/" style={{ fontSize: 12, color: "#00FF94", textDecoration: "none" }}>← Back to Tests</Link>
      </div>
    </div>
  );
}
