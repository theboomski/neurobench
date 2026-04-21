"use client";

import { trackPlay } from "@/lib/tracking";

import { useState } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

const QUESTIONS = [
  // Contempt (Gottman)
  { id: 1,  text: "They mock or belittle you — even 'as a joke' — especially in front of others.", category: "Contempt" },
  { id: 2,  text: "They roll their eyes, sigh heavily, or use sarcasm when you express a need.", category: "Contempt" },
  { id: 3,  text: "You feel stupid or embarrassed around them more than you feel supported.", category: "Contempt" },
  // Criticism (Gottman)
  { id: 4,  text: "Arguments often turn into attacks on your character, not just the issue at hand.", category: "Criticism" },
  { id: 5,  text: "They use words like 'always' and 'never' about your behavior.", category: "Criticism" },
  { id: 6,  text: "You feel like you can never do anything right in their eyes.", category: "Criticism" },
  // Stonewalling (Gottman)
  { id: 7,  text: "When things get difficult, they shut down completely or walk away.", category: "Stonewalling" },
  { id: 8,  text: "You feel like you're always the one who has to bring things up and resolve them.", category: "Stonewalling" },
  // Defensiveness (Gottman)
  { id: 9,  text: "They rarely take responsibility — it's always someone else's fault.", category: "Defensiveness" },
  { id: 10, text: "When you raise a concern, they immediately counter-attack rather than listen.", category: "Defensiveness" },
  // Narcissistic patterns
  { id: 11, text: "In the beginning, everything felt too perfect — overwhelming affection and attention.", category: "Love Bombing" },
  { id: 12, text: "The relationship feels like a rollercoaster — highs that are euphoric, lows that are devastating.", category: "Intermittent Reinforcement" },
  { id: 13, text: "They need constant admiration and react badly when they don't get it.", category: "Narcissism" },
  { id: 14, text: "They seem to lack genuine empathy for your pain but expect you to be endlessly empathetic about theirs.", category: "Narcissism" },
  // Control patterns
  { id: 15, text: "They monitor your phone, location, or social media — or expect you to report your whereabouts.", category: "Control" },
  { id: 16, text: "They make you feel guilty for spending time with friends or family.", category: "Isolation" },
  { id: 17, text: "Major decisions — where you go, what you wear, who you see — feel like they require their approval.", category: "Control" },
  // Gaslighting
  { id: 18, text: "After arguments, you find yourself apologizing even when you did nothing wrong.", category: "Gaslighting" },
  { id: 19, text: "You sometimes question your own memory of events after they tell you what 'really' happened.", category: "Gaslighting" },
  { id: 20, text: "Your gut tells you something is wrong, but you can't quite explain it to others.", category: "Intuition" },
];

const OPTIONS = ["Never", "Rarely", "Sometimes", "Often", "Always"];

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

export default function RedFlagDetector({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [topCategory, setTopCategory] = useState("");
  const [isNewBest, setIsNewBest] = useState(false);

  const q = QUESTIONS[current];

  const handleAnswer = (val: number) => {
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);

    if (current + 1 >= QUESTIONS.length) {
      const total = Object.values(newAnswers).reduce((a, b) => a + b, 0);
      const maxScore = QUESTIONS.length * 4;
      const score = Math.round((total / maxScore) * 100);

      // Find top category
      const catScores: Record<string, number[]> = {};
      QUESTIONS.forEach(q => {
        if (!catScores[q.category]) catScores[q.category] = [];
        catScores[q.category].push(newAnswers[q.id] ?? 0);
      });
      const catAvgs = Object.entries(catScores).map(([cat, scores]) => ({
        cat, avg: scores.reduce((a, b) => a + b, 0) / scores.length
      })).sort((a, b) => b.avg - a.avg);
      setTopCategory(catAvgs[0]?.cat ?? "");

      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setAnswers({}); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "🚩", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My relationship red flag score: ${finalScore}% 🚩 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  const catColor: Record<string, string> = {
    "Contempt": "#EF4444", "Criticism": "#F97316", "Stonewalling": "#8B5CF6",
    "Defensiveness": "#F59E0B", "Love Bombing": "#EC4899", "Intermittent Reinforcement": "#EF4444",
    "Narcissism": "#A855F7", "Control": "#EF4444", "Isolation": "#F97316",
    "Gaslighting": "#8B5CF6", "Intuition": "#94A3B8",
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Relationship Risk Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}15`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4, color: rank.color }}>
          {finalScore}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>/ 100</span>
        </div>
        {topCategory && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${catColor[topCategory] ?? "#EF4444"}15`, border: `1px solid ${catColor[topCategory] ?? "#EF4444"}40`, borderRadius: 999, padding: "4px 14px", margin: "10px 0" }}>
            <span style={{ fontSize: 11, color: catColor[topCategory] ?? "#EF4444", fontFamily: "var(--font-mono)", fontWeight: 700 }}>PRIMARY PATTERN: {topCategory.toUpperCase()}</span>
          </div>
        )}
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)", marginTop: 8 }}>TOP {100 - pct}% RED FLAG DENSITY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 12 }}>&quot;{rank.subtitle}&quot;</div>
        <p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.7, marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" }}>
          Based on Gottman Institute research. These results are for self-reflection only — not clinical relationship advice.
        </p>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ RETAKE</button>
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚩</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Red Flag Detector</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        20 questions about your current or most recent relationship. Based on Gottman's Four Horsemen research and narcissistic abuse pattern recognition. Be honest.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {["🔴 Contempt", "🟠 Criticism", "🟣 Stonewalling", "🟡 Gaslighting"].map(t => (
          <div key={t} style={{ background: "var(--bg-elevated)", borderRadius: 999, padding: "4px 12px", fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{t}</div>
        ))}
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~4 minutes · Think of a specific relationship</p>
      <button onClick={() => { trackPlay(game.id); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN ASSESSMENT</button>
    </div>
  );

  const catCol = catColor[q.category] ?? "#EF4444";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {QUESTIONS.length}</span>
          <span style={{ color: catCol }}>{q.category.toUpperCase()}</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / QUESTIONS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderLeft: `3px solid ${catCol}`, borderRadius: "var(--radius-md)", padding: "20px 18px", marginBottom: 24, minHeight: 80, display: "flex", alignItems: "center" }}>
          <p style={{ fontSize: "clamp(13px,2.5vw,16px)", lineHeight: 1.65, color: "var(--text-1)", fontWeight: 500, margin: 0 }}>
            &quot;{q.text}&quot;
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {OPTIONS.map((label, i) => (
            <button key={i} onClick={() => handleAnswer(i)} className="pressable"
              style={{ padding: "13px 18px", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-2)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: i === 0 ? "#10B981" : i === 4 ? "#EF4444" : "var(--text-3)", minWidth: 14, fontWeight: 700 }}>{i}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
