"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useMemo } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard, shuffleOptions, type QuizOption } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

interface Question { id: number; text: string; options: QuizOption[]; }

const RAW_QUESTIONS: Question[] = [
  { id: 1, text: "You check your partner's phone, location, or social media — or feel the urge to.", options: [
    { text: "Never", score: 0 }, { text: "Rarely", score: 1 }, { text: "Sometimes", score: 2 }, { text: "Often", score: 3 },
  ]},
  { id: 2, text: "You go cold and quiet when you're upset instead of saying what's wrong.", options: [
    { text: "Often", score: 3 }, { text: "Never", score: 0 }, { text: "Sometimes", score: 2 }, { text: "Rarely", score: 1 },
  ]},
  { id: 3, text: "You say 'fine' when you mean the opposite.", options: [
    { text: "Sometimes", score: 2 }, { text: "Often", score: 3 }, { text: "Never", score: 0 }, { text: "Rarely", score: 1 },
  ]},
  { id: 4, text: "You bring up old arguments during new ones.", options: [
    { text: "Rarely", score: 1 }, { text: "Often", score: 3 }, { text: "Never", score: 0 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 5, text: "You need to know where your partner is at all times.", options: [
    { text: "Never", score: 0 }, { text: "Often", score: 3 }, { text: "Rarely", score: 1 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 6, text: "You've made someone feel guilty for spending time with their friends.", options: [
    { text: "Often", score: 3 }, { text: "Sometimes", score: 2 }, { text: "Never", score: 0 }, { text: "Rarely", score: 1 },
  ]},
  { id: 7, text: "You get disproportionately upset over small things when you're actually upset about something else.", options: [
    { text: "Sometimes", score: 2 }, { text: "Never", score: 0 }, { text: "Often", score: 3 }, { text: "Rarely", score: 1 },
  ]},
  { id: 8, text: "You've convinced yourself you didn't say something that you definitely said.", options: [
    { text: "Never", score: 0 }, { text: "Sometimes", score: 2 }, { text: "Rarely", score: 1 }, { text: "Often", score: 3 },
  ]},
  { id: 9, text: "You use 'I was just joking' after saying something that landed badly.", options: [
    { text: "Often", score: 3 }, { text: "Never", score: 0 }, { text: "Rarely", score: 1 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 10, text: "You need constant reassurance that your partner still loves you.", options: [
    { text: "Rarely", score: 1 }, { text: "Never", score: 0 }, { text: "Often", score: 3 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 11, text: "You've threatened to leave during an argument without meaning it.", options: [
    { text: "Never", score: 0 }, { text: "Often", score: 3 }, { text: "Sometimes", score: 2 }, { text: "Rarely", score: 1 },
  ]},
  { id: 12, text: "You compare your relationship to other people's — out loud.", options: [
    { text: "Often", score: 3 }, { text: "Never", score: 0 }, { text: "Rarely", score: 1 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 13, text: "You make decisions about the relationship without asking how the other person feels.", options: [
    { text: "Sometimes", score: 2 }, { text: "Often", score: 3 }, { text: "Rarely", score: 1 }, { text: "Never", score: 0 },
  ]},
  { id: 14, text: "You've said 'you always' or 'you never' in an argument.", options: [
    { text: "Never", score: 0 }, { text: "Rarely", score: 1 }, { text: "Often", score: 3 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 15, text: "You feel uneasy when your partner is happy independently of you.", options: [
    { text: "Never", score: 0 }, { text: "Often", score: 3 }, { text: "Sometimes", score: 2 }, { text: "Rarely", score: 1 },
  ]},
  { id: 16, text: "You apologize mainly to end the argument rather than because you mean it.", options: [
    { text: "Often", score: 3 }, { text: "Rarely", score: 1 }, { text: "Never", score: 0 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 17, text: "You've dismissed your partner's feelings as overreacting.", options: [
    { text: "Sometimes", score: 2 }, { text: "Never", score: 0 }, { text: "Often", score: 3 }, { text: "Rarely", score: 1 },
  ]},
  { id: 18, text: "You've told your partner how to feel about something.", options: [
    { text: "Never", score: 0 }, { text: "Often", score: 3 }, { text: "Rarely", score: 1 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 19, text: "You expect your partner to read your mind and feel let down when they can't.", options: [
    { text: "Rarely", score: 1 }, { text: "Often", score: 3 }, { text: "Never", score: 0 }, { text: "Sometimes", score: 2 },
  ]},
  { id: 20, text: "You keep score in the relationship — who did what, who owes what.", options: [
    { text: "Never", score: 0 }, { text: "Sometimes", score: 2 }, { text: "Often", score: 3 }, { text: "Rarely", score: 1 },
  ]},
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

export default function RedFlagGreenFlag({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  const questions = useMemo(() =>
    RAW_QUESTIONS.map(q => ({ ...q, options: shuffleOptions(q.options) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shuffleKey]
  );

  const q = questions[current];
  const maxScore = RAW_QUESTIONS.reduce((a, q) => a + Math.max(...q.options.map(o => o.score)), 0);

  const handleAnswer = (score: number) => {
    const newTotal = totalScore + score;
    if (current + 1 >= questions.length) {
      const pct = Math.round((newTotal / maxScore) * 100);
      setFinalScore(pct);
      const isNew = saveHighScore(game.id, pct);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setTotalScore(newTotal);
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setTotalScore(0); setShareImg(null); setIsNewBest(false); setShuffleKey(k => k + 1); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "🚩", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `I rated my own red flags: ${rank.title} 🚩 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Red Flag Self-Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}15`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4, color: rank.color }}>
          {finalScore}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>/100</span>
        </div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% RED FLAG DENSITY</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: rank.color, marginBottom: 6 }}>{rank.title}</div>
        <div style={{ fontSize: 14, color: "var(--text-2)", fontStyle: "italic", marginBottom: 24 }}>&quot;{rank.subtitle}&quot;</div>
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
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Red Flag or Green Flag?</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 20px" }}>
        20 relationship behaviors. Rate how often you actually do them. Your ex already knows the score — now you will too.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Answers shuffle every time · Be honest</p>
      <button onClick={() => { trackPlay(game.id); setShuffleKey(k => k + 1); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ RATE YOURSELF</button>
    </div>
  );

  const optionColors: Record<number, string> = { 0: "#10B981", 1: "#58A6FF", 2: "#F59E0B", 3: "#EF4444" };

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {questions.length}</span>
          <span style={{ color: game.accent }}>HOW OFTEN?</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / questions.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderLeft: "3px solid #EF4444", borderRadius: "var(--radius-md)", padding: "20px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: "clamp(14px,2.5vw,17px)", lineHeight: 1.65, color: "var(--text-1)", fontWeight: 600, margin: 0 }}>🚩 {q.text}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => handleAnswer(opt.score)} className="pressable"
              style={{
                padding: "14px 18px",
                background: `${optionColors[opt.score]}10`,
                border: `1.5px solid ${optionColors[opt.score]}40`,
                borderRadius: "var(--radius-md)",
                fontSize: 14, fontWeight: 700,
                color: optionColors[opt.score],
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
