"use client";

import { trackPlay } from "@/lib/tracking";

import { useState } from "react";
import type { GameData } from "@/lib/types";
import { saveHighScore } from "@/lib/gameUtils";
import { shareReportStyleResult } from "@/lib/shareReportStyleResult";
import { useShareCopiedToast } from "@/hooks/useShareCopiedToast";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const QUESTIONS = [
  { id: 1,  text: "If I received an unexpected $5,000 today, my first instinct would be to save or invest it.", positive: true },
  { id: 2,  text: "I often feel like money is always tight, no matter how much I earn.", positive: false },
  { id: 3,  text: "I believe my financial situation is largely within my control.", positive: true },
  { id: 4,  text: "I frequently buy things to feel better emotionally.", positive: false },
  { id: 5,  text: "I have a clear idea of where my money goes each month.", positive: true },
  { id: 6,  text: "I find it hard to spend money on myself even when I can afford it.", positive: false },
  { id: 7,  text: "I believe building wealth is achievable for people like me.", positive: true },
  { id: 8,  text: "I avoid thinking about my finances because it causes anxiety.", positive: false },
  { id: 9,  text: "I regularly set aside money before spending, even in small amounts.", positive: true },
  { id: 10, text: "I often think 'I could never afford that' without actually checking.", positive: false },
  { id: 11, text: "I see financial education as one of the best investments of my time.", positive: true },
  { id: 12, text: "I feel guilty spending money on things I enjoy.", positive: false },
  { id: 13, text: "I believe my income will grow significantly over the next 5 years.", positive: true },
  { id: 14, text: "I often spend now and worry about saving later.", positive: false },
  { id: 15, text: "I track my net worth or financial progress at least occasionally.", positive: true },
  { id: 16, text: "I feel like wealthy people got lucky or had advantages I don't have.", positive: false },
  { id: 17, text: "I regularly learn about personal finance, investing, or economics.", positive: true },
  { id: 18, text: "I have a tendency to compare my financial situation to others and feel behind.", positive: false },
  { id: 19, text: "I believe delayed gratification is one of the most important financial skills.", positive: true },
  { id: 20, text: "I spend money impulsively and often regret it later.", positive: false },
];

const LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

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

export default function MoneyMindset({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showAd, setShowAd] = useState(false);
  const shareToast = useShareCopiedToast();
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const q = QUESTIONS[current];

  const handleAnswer = (val: number) => {
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);
    if (current + 1 >= QUESTIONS.length) {
      let total = 0;
      QUESTIONS.forEach(q => {
        const raw = newAnswers[q.id] ?? 3;
        total += q.positive ? raw - 1 : 5 - raw;
      });
      const score = Math.round((total / (QUESTIONS.length * 4)) * 100);
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setAnswers({}); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    await shareReportStyleResult({
      game,
      clinicalHeader: "Financial Psychology Assessment",
      scoreNum: finalScore,
      scoreSuffix: "/100",
      rank,
      percentile: pct,
      emoji: "💰",
      onCopied: shareToast.onCopied,
    });
  };

  if (phase === "done") return (
    <>
      {shareToast.node}
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Financial Psychology Assessment</div>
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
          <button onClick={() => void handleShare()} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>💰</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Money Mindset Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        20 questions about your financial attitudes and behaviors. Based on behavioral economics research: delay discounting, loss aversion, locus of control, and scarcity vs abundance mindset.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Be brutally honest</p>
      <button onClick={() => { trackPlay(game.id); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ PLAY</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {QUESTIONS.length}</span>
          <span style={{ color: q.positive ? "#10B981" : "#EF4444" }}>{q.positive ? "ABUNDANCE" : "SCARCITY"}</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / QUESTIONS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "22px 20px", marginBottom: 24, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "clamp(13px,2.5vw,16px)", lineHeight: 1.65, color: "var(--text-1)", fontWeight: 500, margin: 0, textAlign: "center" }}>
            &quot;{q.text}&quot;
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LABELS.map((label, i) => (
            <button key={i} onClick={() => handleAnswer(i + 1)} className="pressable"
              style={{ padding: "13px 18px", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-2)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 16 }}>{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
