"use client";

import { useState } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

const SCENARIOS = [
  {
    id: 1,
    setup: "You have $10,000 to invest. Option A guarantees you $11,000 in 3 years. Option B has a 60% chance of $15,000 and a 40% chance of $8,000 in 3 years.",
    options: ["Definitely Option A — guaranteed is guaranteed", "Probably A, but I'd think about it", "Probably B — the expected value is higher", "Definitely Option B — I'm comfortable with the risk"],
    scores: [0, 1, 2, 3],
  },
  {
    id: 2,
    setup: "Your investment portfolio drops 25% in one month due to market turbulence. The fundamentals haven't changed. What do you do?",
    options: ["Sell everything — I can't handle watching this", "Sell some to reduce exposure", "Hold — I'll wait it out", "Buy more — this is a sale"],
    scores: [0, 1, 2, 3],
  },
  {
    id: 3,
    setup: "You're offered a job with a $20,000 pay cut but significant equity in a Series A startup. The company has real potential but 70% of startups fail.",
    options: ["No chance — I need the salary stability", "Probably not — too risky", "Tempted — depends on the details", "I'd do it — asymmetric upside"],
    scores: [0, 1, 2, 3],
  },
  {
    id: 4,
    setup: "You can invest $5,000 in an index fund (avg 8%/yr) or in a friend's business that could 10x or go to zero. Your friend is competent but inexperienced.",
    options: ["Index fund — no question", "Mostly index, maybe a small amount to the friend", "Split it 50/50", "All to the friend — I believe in him"],
    scores: [0, 1, 2, 3],
  },
  {
    id: 5,
    setup: "How much of your monthly income are you comfortable having in volatile assets (stocks, crypto, etc.) that could drop 40%+ in value?",
    options: ["None — I don't invest in volatile assets", "Up to 10% of my income", "10–30% of my income", "More than 30% — I think long term"],
    scores: [0, 1, 2, 3],
  },
  {
    id: 6,
    setup: "Your best investment ever gained 200% in 18 months. How do you respond?",
    options: ["Sell everything immediately — lock in the gain", "Sell half to take some profit", "Hold — maybe it keeps growing", "Buy more — if it worked this well, I want more exposure"],
    scores: [0, 1, 2, 3],
  },
];

function getRank(score: number, game: GameData) {
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(score: number, game: GameData) {
  const pts = [...game.stats.percentiles].sort((a, b) => b.ms - a.ms);
  if (score >= pts[0].ms) return pts[0].percentile;
  if (score <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (score <= pts[i].ms && score >= pts[i + 1].ms) {
      const tt = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - tt * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

type Phase = "idle" | "playing" | "done";

export default function RiskTolerance({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const scenario = SCENARIOS[current];

  const handleAnswer = (optIdx: number) => {
    const points = scenario.scores[optIdx];
    const newTotal = totalScore + points;
    if (current + 1 >= SCENARIOS.length) {
      const maxScore = SCENARIOS.reduce((a, s) => a + Math.max(...s.scores), 0);
      const score = Math.round((newTotal / maxScore) * 100);
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setTotalScore(newTotal);
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setTotalScore(0); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "/100", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My Risk Tolerance: ${finalScore}/100 📈 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Risk Tolerance Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}15`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>/100</span>
        </div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ RETAKE</button>
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📈</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Risk Tolerance Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        6 real financial scenarios. How you react reveals your true risk tolerance — not the answer you think you should give. Based on Kahneman & Tversky's Prospect Theory.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Answer what you'd actually do</p>
      <button onClick={() => setPhase("playing")} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>SCENARIO {current + 1} / {SCENARIOS.length}</span>
          <span style={{ color: game.accent }}>RISK TOLERANCE</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / SCENARIOS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderLeft: `3px solid ${game.accent}`, borderRadius: "var(--radius-md)", padding: "20px 18px", marginBottom: 24, fontSize: 14, lineHeight: 1.75, color: "var(--text-1)" }}>
          {scenario.setup}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {scenario.options.map((opt, i) => (
            <button key={i} onClick={() => handleAnswer(i)} className="pressable"
              style={{ padding: "14px 18px", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-2)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, lineHeight: 1.55 }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 16 }}>{i + 1}</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
