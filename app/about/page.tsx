import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://zazaza.app";

export function generateMetadata(): Metadata {
  const title = "About ZAZAZA | Free Science-Backed Brain Training & Cognitive Testing";
  const description =
    "ZAZAZA offers free daily brain training inspired by peer-reviewed cognitive science. No subscription. No signup required. Track your cognitive performance with the ZCI — ZAZAZA Cognitive Index.";
  const keywords = [
    "free brain training",
    "cognitive test",
    "Stroop Effect",
    "working memory test",
    "no signup brain test",
    "daily brain exercise",
    "ZCI score",
    "brain age test",
  ];
  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/about`,
    },
  };
}

const monoEyebrow: React.CSSProperties = {
  fontSize: 10,
  color: "#D4823A",
  fontFamily: "monospace",
  letterSpacing: "0.12em",
};

const bodyMuted: React.CSSProperties = {
  color: "rgba(160,160,160,1)",
  lineHeight: 1.9,
  fontSize: 14,
};

const Divider = () => (
  <div
    role="separator"
    style={{
      margin: "28px 0",
      borderTop: "1px solid var(--border)",
      opacity: 0.85,
    }}
  />
);

const S = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
      <span style={{ ...monoEyebrow, textTransform: "uppercase" }}>{n} /</span>
      <h2 style={{ fontSize: "clamp(17px, 4vw, 18px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{title}</h2>
    </div>
    <div style={bodyMuted}>{children}</div>
  </div>
);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3
    style={{
      fontSize: 15,
      fontWeight: 700,
      color: "var(--text-1)",
      marginTop: 22,
      marginBottom: 10,
      letterSpacing: "-0.02em",
      lineHeight: 1.35,
    }}
  >
    {children}
  </h3>
);

const OfferRow = ({ title, href, children }: { title: string; href: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>{title}</div>
    <div style={{ ...bodyMuted, marginBottom: 8 }}>{children}</div>
    <Link href={href} style={{ fontSize: 13, color: "#D4823A", textDecoration: "none", fontFamily: "monospace" }}>
      &rarr; {href}
    </Link>
  </div>
);

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Science Behind Brain Triathlon",
  description:
    "How ZAZAZA Brain Triathlon draws from peer-reviewed cognitive science research including the Stroop Effect, Baddeley's Working Memory Model, and Kyoto University primate cognition studies.",
  author: {
    "@type": "Organization",
    name: "ZAZAZA",
  },
  citation: [
    {
      "@type": "ScholarlyArticle",
      name: "Studies of interference in serial verbal reactions",
      author: "John Ridley Stroop",
      datePublished: "1935",
      publisher: "Journal of Experimental Psychology",
    },
    {
      "@type": "ScholarlyArticle",
      name: "Working memory",
      author: "Alan D. Baddeley, Graham Hitch",
      datePublished: "1974",
    },
    {
      "@type": "ScholarlyArticle",
      name: "Working memory of numerals in chimpanzees",
      author: "Sana Inoue, Tetsuro Matsuzawa",
      datePublished: "2007",
      publisher: "Current Biology",
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px clamp(16px, 4vw, 24px) 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ ...monoEyebrow, textTransform: "uppercase", marginBottom: 14 }}>About ZAZAZA</div>
          <h1
            style={{
              fontSize: "clamp(26px, 5vw, 42px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.12,
              marginBottom: 14,
              color: "var(--text-1)",
            }}
          >
            The internet&apos;s best free brain tests.
          </h1>
          <p style={{ fontSize: "clamp(15px, 3.5vw, 17px)", color: "rgba(160,160,160,1)", lineHeight: 1.75, maxWidth: 580 }}>
            No subscription. No friction. Just results.
          </p>
        </div>

        <Divider />

        <S n="01" title="Why ZAZAZA Exists">
          <p style={{ marginBottom: 14 }}>
            Most platforms that offer brain training or cognitive testing require an account, a free trial, or a monthly
            subscription before you can take a single test. We think that gets it backwards.
          </p>
          <p style={{ marginBottom: 14 }}>
            ZAZAZA was built on a different premise: the insight should come first. Every test is free. Most require no
            account. Results are instant. We then get out of the way so you can share, reflect, and come back tomorrow.
          </p>
          <p style={{ marginBottom: 14 }}>
            We are not here to sell you a subscription. We are here to give you an honest look at how your brain is
            performing today — and every day after that.
          </p>
        </S>

        <Divider />

        <S n="02" title="What We Offer">
          <OfferRow title="Daily Brain Triathlon" href="/triathlon">
            Three science-backed cognitive tests. Two minutes. Every day. Your ZCI score — ZAZAZA Cognitive Index —
            tracks how your inhibitory control, working memory, and processing speed perform over time. Free. No signup
            required to play. Create a free account to save your history and track progress.
          </OfferRow>
          <OfferRow title="Brain Tests" href="/brain-age">
            Reaction time, working memory, sequence memory, spatial recall, processing speed, and inhibitory control —
            adapted from validated cognitive science paradigms.
          </OfferRow>
          <OfferRow title="Games" href="/office-iq">
            Reflex games, strategy, and survival challenges inspired by Korean TV formats and classic game mechanics.
          </OfferRow>
          <OfferRow title="Personality" href="/dark-personality">
            Dark Triad, empathy quotient, attachment style, relationship patterns, money mindset, and more — based on
            established psychological scales.
          </OfferRow>
          <OfferRow title="Brackets" href="/bracket">
            Community-made bracket tournaments and balance games. Vote, create, and share your results.
          </OfferRow>
          <OfferRow title="Arena" href="/arena">
            Global country rankings, weekly leaderboards, and the Hall of Fame.
          </OfferRow>
          <OfferRow title="Blog" href="/blog">
            The science behind the tests — cognitive psychology, behavioral finance, and personality research in plain
            English.
          </OfferRow>
          <OfferRow title="Fun Sends" href="/send">
            Free personalized cards to challenge, thank, or reconnect with someone. No signup. Instant.
          </OfferRow>
        </S>

        <Divider />

        <S n="03" title="The Science Behind the Tests">
          <p style={{ marginBottom: 14 }}>
            Every ZAZAZA test is grounded in validated cognitive science paradigms, clinical psychology research, and
            behavioral economics literature. We do not invent metrics — we adapt established research instruments into
            accessible, free formats.
          </p>
          <p style={{ marginBottom: 14 }}>
            Our Brain Age suite uses reaction time norms from population research (mean 250ms, SD 40ms), Wechsler Adult
            Intelligence Scale digit span normative data (mean 7.2, SD 1.3), and Stroop Effect paradigms (Golden, 1978).
            Our Dark Personality tests are based on the NPI (narcissism), Mach-IV (Machiavellianism), and SRP scales. Our
            Relationship tests draw on Gottman Institute longitudinal research and the Experiences in Close Relationships
            scale (Brennan et al., 1998).
          </p>
          <p>
            Results are designed for self-assessment and personal insight. They are not clinical diagnoses. For formal
            psychological or medical assessment, consult a licensed professional.
          </p>
        </S>

        <Divider />

        <S n="04" title="The Science Behind Brain Triathlon">
          <p style={{ marginBottom: 14 }}>
            The Daily Brain Triathlon draws from cognitive science paradigms that have been studied, replicated, and
            peer-reviewed for decades. Each of the three daily tests targets a distinct cognitive domain. The goal is not
            to diagnose or predict — it is to measure, track, and build awareness of how your cognitive performance changes
            day to day.
          </p>

          <H3>What is the ZCI?</H3>
          <p style={{ marginBottom: 14 }}>
            The ZCI — ZAZAZA Cognitive Index — is a composite score from 0 to 100 that represents your overall cognitive
            performance on a given day&apos;s triathlon. It is calculated as the average of your three test scores: one from
            the Focus category, one from Memory, and one from Speed.
          </p>
          <p style={{ marginBottom: 14 }}>
            Each test score is normalized against a defined performance ceiling — a level achievable but rarely reached
            under real conditions. A score of 50 represents solid mid-range performance. A score above 70 indicates strong
            performance. A score above 90 is exceptional.
          </p>
          <p style={{ marginBottom: 14 }}>
            The ZCI is not a measure of intelligence. It is a daily snapshot of how three specific cognitive systems are
            performing on that day. Scores fluctuate with sleep, stress, time of day, and practice. Tracking your ZCI over
            time reveals patterns that a single session cannot.
          </p>

          <H3>Inhibitory Control — Color Conflict · Color Conflict 2</H3>
          <p style={{ marginBottom: 14 }}>
            In 1935, psychologist John Ridley Stroop published &quot;Studies of Interference in Serial Verbal Reactions&quot;
            in the Journal of Experimental Psychology (18(6), 643–662). His experiments demonstrated that when the meaning of
            a word conflicts with its visual presentation — for example, the word RED printed in blue ink — response time
            slows and errors increase. The paper has since become one of the most cited in the history of experimental
            psychology, with over 700 replications across different populations, languages, and conditions.
          </p>
          <p style={{ marginBottom: 14 }}>
            The interference Stroop identified reflects a core property of executive function: the brain&apos;s capacity to
            suppress an automatic, dominant response in favor of a deliberate one. This capacity — inhibitory control — is
            mediated by the prefrontal cortex and is associated with attention regulation, decision-making, and resistance
            to distraction.
          </p>
          <p style={{ marginBottom: 14 }}>
            Color Conflict and Color Conflict 2 are adapted from this paradigm. They measure how efficiently your brain
            resolves conflict between competing stimulus features under time pressure.
          </p>

          <H3>Working Memory — Sequence Memory · Number Memory</H3>
          <p style={{ marginBottom: 14 }}>
            In 1974, Alan Baddeley and Graham Hitch proposed a multi-component model of working memory in &quot;The Psychology
            of Learning and Motivation&quot; (Vol. 8, pp. 47–89, Academic Press). Their framework replaced the prevailing view
            of short-term memory as a single store, describing instead a system with distinct subsystems: the phonological
            loop for verbal and auditory information, the visuospatial sketchpad for visual and spatial information, and the
            central executive coordinating both.
          </p>
          <p style={{ marginBottom: 14 }}>
            Working memory capacity — the ability to hold and manipulate information in real time — is one of the strongest
            predictors of cognitive performance across domains including reasoning, reading comprehension, and mathematical
            ability. It is also among the cognitive functions most sensitive to fatigue, stress, and age-related change.
          </p>
          <p style={{ marginBottom: 14 }}>
            Sequence Memory and Number Memory test the capacity and fidelity of your working memory under progressive load,
            beginning at a level most adults can manage and scaling until the system reaches its limit.
          </p>

          <H3>Spatial Memory — Visual Memory · Chimp Test</H3>
          <p style={{ marginBottom: 14 }}>
            In 2007, Sana Inoue and Tetsuro Matsuzawa at the Primate Research Institute of Kyoto University published a
            finding that drew international attention (Current Biology, 17(23), R1004–R1005). A young chimpanzee named Ayumu
            consistently outperformed adult humans on a spatial memory task in which numbers appeared briefly on a
            touchscreen before being masked. Ayumu recalled the positions of up to nine numbers displayed for 210
            milliseconds — a performance level that university students could not match.
          </p>
          <p style={{ marginBottom: 14 }}>
            The researchers proposed that humans may have traded photographic visuospatial encoding capacity for the neural
            resources required by language. The finding remains debated, but it brought significant attention to a form of
            memory rarely isolated in everyday tasks: rapid spatial encoding — the speed at which the brain captures and
            retains the positions of objects before they disappear. The global average on this class of task is approximately
            six items.
          </p>
          <p style={{ marginBottom: 14 }}>
            Visual Memory and Chimp Test measure this capacity through grid pattern recall and sequential spatial encoding,
            targeting the visuospatial sketchpad described in Baddeley and Hitch&apos;s model.
          </p>

          <H3>Processing Speed — Instant Comparison</H3>
          <p style={{ marginBottom: 14 }}>
            Processing speed — the rate at which the brain perceives, evaluates, and responds to information — is among the
            most consistently measured dimensions of cognitive performance. It correlates with working memory capacity, fluid
            intelligence, and academic achievement, and shows reliable decline with age beginning in early adulthood.
          </p>
          <p style={{ marginBottom: 14 }}>
            Instant Comparison draws from research in numerical cognition, particularly work on the approximate number
            system — the brain&apos;s capacity to rapidly evaluate and compare quantities. As difficulty increases, the task
            shifts from simple magnitude comparison to multi-step arithmetic resolution under time pressure, engaging both
            processing speed and executive function.
          </p>

          <H3>Response Inhibition — Fish Frenzy</H3>
          <p style={{ marginBottom: 14 }}>
            The Go/No-Go paradigm is one of the most widely used experimental designs in cognitive neuroscience for measuring
            response inhibition — the ability to suppress a prepotent motor response when a rule requires it. The task
            requires rapid response to one class of stimuli while withholding response to another. Failures of inhibition in
            this paradigm are associated with impulsivity, attentional dysregulation, and fatigue.
          </p>
          <p style={{ marginBottom: 14 }}>
            Fish Frenzy measures this capacity in a directional format: rapid visual evaluation followed by selective
            inhibition of the incorrect response. Penalties for incorrect responses reflect the cognitive cost of inhibitory
            failure.
          </p>

          <H3>Recognition Memory — Verbal Memory</H3>
          <p style={{ marginBottom: 14 }}>
            Recognition memory — the ability to identify whether a stimulus has been encountered previously — is distinct
            from recall and relies primarily on structures in the medial temporal lobe, including the hippocampus and
            perirhinal cortex. It is one of the earliest cognitive domains to show measurable change in aging and is
            sensitive to sleep quality, stress, and attentional load.
          </p>
          <p style={{ marginBottom: 14 }}>
            Verbal Memory measures recognition memory for words across successive trials, tracking accuracy until errors
            accumulate to a defined threshold.
          </p>

          <H3>A note on interpretation</H3>
          <p style={{ marginBottom: 14 }}>
            Brain Triathlon results reflect performance on specific experimental paradigms on a given day. They are not
            clinical assessments, diagnostic tools, or measures of intelligence. Scores are influenced by sleep, stress,
            time of day, and familiarity with the task format. For formal cognitive or neuropsychological evaluation,
            consult a licensed professional.
          </p>

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 10 }}>References</div>
            <div
              style={{
                fontSize: 10,
                lineHeight: 1.75,
                fontFamily: "var(--font-mono)",
                color: "var(--text-3)",
              }}
            >
              <div style={{ marginBottom: 10 }}>
                Stroop, J. R. (1935). Studies of interference in serial verbal reactions. Journal of Experimental Psychology,
                18(6), 643–662.
              </div>
              <div style={{ marginBottom: 10 }}>
                Baddeley, A. D., &amp; Hitch, G. J. (1974). Working memory. In G. A. Bower (Ed.), The Psychology of Learning and
                Motivation (Vol. 8, pp. 47–89). Academic Press.
              </div>
              <div style={{ marginBottom: 10 }}>
                Inoue, S., &amp; Matsuzawa, T. (2007). Working memory of numerals in chimpanzees. Current Biology, 17(23),
                R1004–R1005.
              </div>
              <div>Dehaene, S. (1997). The Number Sense: How the Mind Creates Mathematics. Oxford University Press.</div>
            </div>
          </div>
        </S>

        <Divider />

        <S n="05" title="The ZAZAZA Standard">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
              gap: "14px 18px",
              marginTop: 8,
            }}
          >
            {[
              { t: "Free to play", d: "Every test, every result, every time. Core tests require no account." },
              { t: "No friction", d: "No mandatory signup. No email required. Start immediately." },
              { t: "Instant results", d: "From click to insight in under 60 seconds." },
              { t: "Globally ranked", d: "See how your score compares to players worldwide." },
              { t: "Science-backed", d: "Built on peer-reviewed research, not guesswork." },
              {
                t: "Track your progress",
                d: "Create a free account to save your ZCI history, track cognitive trends over time, and access your dashboard.",
              },
            ].map((item) => (
              <div key={item.t}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>{item.t}</div>
                <div style={{ fontSize: 11, color: "rgba(120,120,120,1)", lineHeight: 1.65 }}>{item.d}</div>
              </div>
            ))}
          </div>
        </S>

        <Divider />

        <S n="06" title="Contact">
          <p>
            Questions, feedback, or partnership enquiries:{" "}
            <a href="mailto:theboomski@gmail.com" style={{ color: "#D4823A", textDecoration: "none" }}>
              theboomski@gmail.com
            </a>
          </p>
          <p style={{ marginTop: 10 }}>
            For privacy-related requests:{" "}
            <a href="mailto:theboomski@gmail.com" style={{ color: "#D4823A", textDecoration: "none" }}>
              theboomski@gmail.com
            </a>
          </p>
        </S>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/privacy-policy" style={{ fontSize: 12, color: "rgba(100,100,100,1)", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" style={{ fontSize: 12, color: "rgba(100,100,100,1)", textDecoration: "none" }}>
            Terms of Service
          </Link>
          <Link href="/" style={{ fontSize: 12, color: "#D4823A", textDecoration: "none" }}>
            ← Back to Tests
          </Link>
        </div>
      </div>
    </>
  );
}
