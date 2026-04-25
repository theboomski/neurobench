"use client";

import { trackPlay } from "@/lib/tracking";

import { useState } from "react";
import type { GameData } from "@/lib/types";
import { saveHighScore } from "@/lib/gameUtils";
import { shareReportStyleResult } from "@/lib/shareReportStyleResult";
import { useShareCopiedToast } from "@/hooks/useShareCopiedToast";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

// Mixed: scenario-based (S) and self-report (R)
// Cognitive empathy (C) = understanding others' mental states
// Affective empathy (A) = sharing others' feelings
const QUESTIONS = [
  { id: 1,  text: "I can easily tell when a friend is upset, even if they don't say so.", type: "R", dim: "C" },
  { id: 2,  text: "I genuinely enjoy making other people feel better.", type: "R", dim: "A" },
  { id: 3,  text: "Your colleague makes a big mistake in a meeting and looks mortified. How do you feel?", type: "S", dim: "A", options: ["Nothing in particular — everyone makes mistakes", "Slightly uncomfortable on their behalf", "Genuinely embarrassed for them", "I feel their embarrassment almost physically"] },
  { id: 4,  text: "I find it hard to understand what makes people tick.", type: "R", dim: "C", reverse: true },
  { id: 5,  text: "Other people's feelings rarely affect me much.", type: "R", dim: "A", reverse: true },
  { id: 6,  text: "A stranger is crying alone on a bench. What do you instinctively feel?", type: "S", dim: "A", options: ["I don't really notice", "I notice but it's not my business", "I feel a pull to check on them", "I feel distressed and must help"] },
  { id: 7,  text: "I can often understand how someone is feeling before they tell me.", type: "R", dim: "C" },
  { id: 8,  text: "I am good at predicting how my actions will make others feel.", type: "R", dim: "C" },
  { id: 9,  text: "A friend is telling a story about being humiliated. Your reaction:", type: "S", dim: "A", options: ["I listen and offer logical advice", "I feel slightly bad for them", "I feel quite uncomfortable hearing this", "I feel almost as humiliated as they did"] },
  { id: 10, text: "I tend to get emotionally involved in my friends' problems.", type: "R", dim: "A" },
  { id: 11, text: "I find it difficult to imagine what it would be like to be someone else.", type: "R", dim: "C", reverse: true },
  { id: 12, text: "Seeing someone in pain doesn't particularly affect me.", type: "R", dim: "A", reverse: true },
  { id: 13, text: "You watch a film with a deeply sad ending. You:", type: "S", dim: "A", options: ["Feel nothing — it's fiction", "Acknowledge it was sad", "Feel genuinely moved", "Cry or feel upset for a long time after"] },
  { id: 14, text: "I can easily put myself in other people's shoes.", type: "R", dim: "C" },
  { id: 15, text: "I am good at picking up on how someone is feeling just from their tone of voice.", type: "R", dim: "C" },
  { id: 16, text: "Your manager delivers harsh feedback to a colleague unfairly. You:", type: "S", dim: "A", options: ["Think: 'that's tough, but it happens'", "Feel mildly uncomfortable", "Feel defensive on their behalf", "Feel genuinely upset and struggle to let it go"] },
  { id: 17, text: "I try to see things from other people's perspectives.", type: "R", dim: "C" },
  { id: 18, text: "I find it easy to understand what other people are feeling.", type: "R", dim: "C" },
  { id: 19, text: "I am not particularly affected by other people's emotions.", type: "R", dim: "A", reverse: true },
  { id: 20, text: "I sometimes feel overwhelmed by other people's emotions.", type: "R", dim: "A" },
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

const AGREE_LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
type Phase = "idle" | "playing" | "done";

export default function EmpathyScore({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const shareToast = useShareCopiedToast();
  const [scores, setScores] = useState({ C: 0, A: 0, total: 0 });
  const [isNewBest, setIsNewBest] = useState(false);

  const q = QUESTIONS[current];
  const isScenario = q.type === "S";

  const handleAnswer = (val: number) => {
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);
    if (current + 1 >= QUESTIONS.length) {
      let C = 0, Cc = 0, A = 0, Ac = 0;
      QUESTIONS.forEach(q => {
        const raw = newAnswers[q.id] ?? 2;
        // Scenario: 0-3 → 1-5 scale
        const score = q.type === "S" ? (raw + 1) : (q.reverse ? (6 - raw) : raw);
        if (q.dim === "C") { C += score; Cc++; }
        else { A += score; Ac++; }
      });
      const cPct = Math.round(((C - Cc) / (Cc * 4)) * 100);
      const aPct = Math.round(((A - Ac) / (Ac * 4)) * 100);
      const total = Math.round((cPct + aPct) / 2);
      setScores({ C: cPct, A: aPct, total });
      const isNew = saveHighScore(game.id, total);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setAnswers({}); setCurrent(0); setIsNewBest(false); };

  const rank = getRank(scores.total, game);
  const pct = getPercentile(scores.total, game);

  const handleShare = async () => {
    await shareReportStyleResult({
      game,
      clinicalHeader: "Empathy Quotient Assessment",
      scoreNum: scores.total,
      scoreSuffix: "/100",
      rank,
      percentile: pct,
      emoji: "🫀",
      onCopied: shareToast.onCopied,
    });
  };

  if (phase === "done") return (
    <>
      {shareToast.node}
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Empathy Quotient Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {scores.total}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>/100</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "20px 0" }}>
          {[
            { label: "Cognitive Empathy", val: scores.C, color: "#06B6D4", desc: "Reading minds" },
            { label: "Affective Empathy", val: scores.A, color: "#EC4899", desc: "Feeling feelings" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "14px 10px" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{s.desc}</div>
              <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginTop: 6 }}>
                <div style={{ height: "100%", width: `${s.val}%`, background: s.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ RETAKE</button>
          <button onClick={() => void handleShare()} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🫀</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Empathy Score</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        20 questions measuring cognitive empathy (understanding others) and affective empathy (feeling others). Answer instinctively — your first response is most accurate.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        <div style={{ background: "#06B6D420", border: "1px solid #06B6D4", borderRadius: 999, padding: "4px 12px", fontSize: 11, color: "#06B6D4", fontFamily: "var(--font-mono)" }}>🧠 Cognitive</div>
        <div style={{ background: "#EC489920", border: "1px solid #EC4899", borderRadius: 999, padding: "4px 12px", fontSize: 11, color: "#EC4899", fontFamily: "var(--font-mono)" }}>🫀 Affective</div>
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · No right answers</p>
      <button onClick={() => { trackPlay(game.id); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ PLAY</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {QUESTIONS.length}</span>
          <span style={{ color: q.dim === "C" ? "#06B6D4" : "#EC4899" }}>{q.dim === "C" ? "COGNITIVE" : "AFFECTIVE"}</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / QUESTIONS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "22px 20px", marginBottom: 24 }}>
          {isScenario && <div style={{ fontSize: 10, color: "#F59E0B", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 8 }}>SCENARIO</div>}
          <p style={{ fontSize: "clamp(13px,2.5vw,16px)", lineHeight: 1.65, color: "var(--text-1)", fontWeight: 500, margin: 0 }}>
            {isScenario ? q.text : `"${q.text}"`}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {isScenario
            ? (q.options || []).map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} className="pressable"
                  style={{ padding: "13px 18px", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-2)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 16 }}>{i + 1}</span>
                  {opt}
                </button>
              ))
            : AGREE_LABELS.map((label, i) => (
                <button key={i} onClick={() => handleAnswer(i + 1)} className="pressable"
                  style={{ padding: "13px 18px", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-2)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 16 }}>{i + 1}</span>
                  {label}
                </button>
              ))
          }
        </div>
      </div>
    </>
  );
}
