"use client";

import { useState, useCallback } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

// Words by difficulty level (A1=easy → C2=very hard)
const WORDS = [
  // A2 — common
  { word: "Ambiguous", level: "A2", options: ["Having more than one possible meaning", "Completely clear and obvious", "Relating to both sides", "Temporary or uncertain"], correct: 0 },
  { word: "Benevolent", level: "A2", options: ["Harmful or dangerous", "Well-meaning and kind", "Neutral or indifferent", "Strict and demanding"], correct: 1 },
  { word: "Concise", level: "A2", options: ["Long and detailed", "Brief and to the point", "Vague and unclear", "Repeated multiple times"], correct: 1 },
  { word: "Diligent", level: "B1", options: ["Lazy and careless", "Random and haphazard", "Hardworking and persistent", "Quick but inaccurate"], correct: 2 },
  { word: "Eloquent", level: "B1", options: ["Fluent and persuasive in speech", "Silent and reserved", "Loud and aggressive", "Confused and unclear"], correct: 0 },
  { word: "Frugal", level: "B1", options: ["Wasteful with money", "Sparing or careful with money", "Extremely wealthy", "Generous to a fault"], correct: 1 },
  { word: "Gregarious", level: "B2", options: ["Solitary and withdrawn", "Preferring to be alone", "Fond of the company of others", "Aggressively competitive"], correct: 2 },
  { word: "Hubris", level: "B2", options: ["Excessive pride or self-confidence", "Deep humility and modesty", "Fear of failure", "Lack of ambition"], correct: 0 },
  { word: "Inimitable", level: "B2", options: ["Easy to copy", "Impossible to imitate; unique", "Predictable and ordinary", "Frequently replicated"], correct: 1 },
  { word: "Juxtapose", level: "C1", options: ["To separate clearly", "To place side by side for contrast", "To combine into one", "To analyze in isolation"], correct: 1 },
  { word: "Laconic", level: "C1", options: ["Talkative and verbose", "Using very few words", "Emotionally expressive", "Scholarly and verbose"], correct: 1 },
  { word: "Mendacious", level: "C1", options: ["Honest and transparent", "Given to lying; dishonest", "Uncertain or doubtful", "Modest or self-effacing"], correct: 1 },
  { word: "Nefarious", level: "C1", options: ["Wicked or criminal", "Exceptionally virtuous", "Financially beneficial", "Legally complex"], correct: 0 },
  { word: "Obsequious", level: "C1", options: ["Stubborn and defiant", "Excessively compliant or fawning", "Honestly direct", "Quietly confident"], correct: 1 },
  { word: "Perfidious", level: "C2", options: ["Loyal and dependable", "Deceitful and untrustworthy", "Overly cautious", "Boldly adventurous"], correct: 1 },
  { word: "Querulous", level: "C2", options: ["Complaining in a petulant way", "Calm and undemanding", "Intellectually curious", "Decisively confident"], correct: 0 },
  { word: "Recalcitrant", level: "C2", options: ["Obediently compliant", "Stubbornly resistant to authority", "Eagerly cooperative", "Easily persuaded"], correct: 1 },
  { word: "Sycophant", level: "C2", options: ["An independent thinker", "A person who flatters to gain favor", "A vocal critic", "A neutral observer"], correct: 1 },
  { word: "Tendentious", level: "C2", options: ["Balanced and impartial", "Promoting a particular cause; biased", "Factual and objective", "Cautious and reserved"], correct: 1 },
  { word: "Verisimilitude", level: "C2", options: ["Complete falsehood", "The appearance of being true or real", "Scientific certainty", "Logical contradiction"], correct: 1 },
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

// Estimate vocab age from score
function vocabAge(score: number): number {
  if (score >= 95) return 18;
  if (score >= 85) return 25;
  if (score >= 70) return 32;
  if (score >= 55) return 42;
  if (score >= 40) return 55;
  return 65;
}

type Phase = "idle" | "playing" | "done";

export default function VocabularyAge({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const q = WORDS[current];

  const handleAnswer = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = idx === q.correct;
    if (isCorrect) playBeep("tap");
    const newCorrect = isCorrect ? correct + 1 : correct;
    setTimeout(() => {
      if (current + 1 >= WORDS.length) {
        const score = Math.round((newCorrect / WORDS.length) * 100);
        setFinalScore(score);
        const isNew = saveHighScore(game.id, score);
        setIsNewBest(isNew);
        setPhase("done");
      } else {
        setCorrect(newCorrect);
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 700);
  }, [selected, q, correct, current, game.id]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setCorrect(0); setSelected(null); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);
  const vAge = vocabAge(finalScore);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "%", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My vocabulary age is ${vAge}! 📚 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Vocabulary Age Assessment</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>YOUR VOCABULARY AGE</div>
        <div style={{ fontSize: "clamp(64px,16vw,96px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: rank.color, marginBottom: 4 }}>{vAge}</div>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "16px auto" }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{correct} / {WORDS.length} correct</div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ PLAY AGAIN</button>
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📚</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Vocabulary Age Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        {WORDS.length} words. Each has 4 possible definitions. Choose the correct one. Words get harder as you progress — from A2 to C2 level.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
        {["A2", "B1", "B2", "C1", "C2"].map(l => (
          <div key={l} style={{ background: "var(--bg-elevated)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{l}</div>
        ))}
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · 20 words</p>
      <button onClick={() => setPhase("playing")} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  const levelColors: Record<string, string> = { A2: "#10B981", B1: "#06B6D4", B2: "#F59E0B", C1: "#F97316", C2: "#EF4444" };

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {WORDS.length}</span>
          <span style={{ color: levelColors[q.level] ?? "var(--text-3)" }}>{q.level}</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 28 }}>
          <div style={{ height: "100%", width: `${(current / WORDS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: "clamp(28px,7vw,42px)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-1)", marginBottom: 8 }}>{q.word}</div>
          <div style={{ fontSize: 11, color: levelColors[q.level], fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>CEFR {q.level}</div>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 16 }}>Choose the correct definition:</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrectOpt = i === q.correct;
            const showCorrect = selected !== null && isCorrectOpt;
            const showWrong = selected !== null && isSelected && !isCorrectOpt;
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null} className="pressable"
                style={{
                  padding: "14px 18px",
                  background: showCorrect ? "#10B98120" : showWrong ? "#EF444420" : "var(--bg-card)",
                  border: `1.5px solid ${showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  color: showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--text-2)",
                  cursor: selected !== null ? "default" : "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 16 }}>{String.fromCharCode(65 + i)}</span>
                {opt}
                {showCorrect && <span style={{ marginLeft: "auto" }}>✓</span>}
                {showWrong && <span style={{ marginLeft: "auto" }}>✗</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
