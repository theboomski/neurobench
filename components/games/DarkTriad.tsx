"use client";

import { trackPlay } from "@/lib/tracking";

import { useState } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

const QUESTIONS = [
  // Narcissism (N)
  { id: 1, text: "I know I am special because everyone keeps telling me so.", trait: "N" },
  { id: 2, text: "I like to be the center of attention.", trait: "N" },
  { id: 3, text: "I deserve more respect than the average person.", trait: "N" },
  { id: 4, text: "I am more capable than most people around me.", trait: "N" },
  { id: 5, text: "I find it easy to manipulate people.", trait: "M" },
  // Machiavellianism (M)
  { id: 6, text: "I tend to exploit others toward my own end.", trait: "M" },
  { id: 7, text: "Whatever it takes, you must get the important people on your side.", trait: "M" },
  { id: 8, text: "It's not wise to tell your secrets.", trait: "M" },
  { id: 9, text: "I like to use clever manipulation to get my way.", trait: "M" },
  { id: 10, text: "Most people can be manipulated.", trait: "M" },
  // Psychopathy (P)
  { id: 11, text: "People often say I'm out of control.", trait: "P" },
  { id: 12, text: "I've never felt guilty about hurting someone's feelings.", trait: "P" },
  { id: 13, text: "I enjoy having the power over other people.", trait: "N" },
  { id: 14, text: "I don't care much if I do something bad.", trait: "P" },
  { id: 15, text: "I tend to be callous or insensitive.", trait: "P" },
  { id: 16, text: "I am an average person.", trait: "N", reverse: true },
  { id: 17, text: "I believe in being completely honest with everyone.", trait: "M", reverse: true },
  { id: 18, text: "Payback needs to be quick and nasty.", trait: "P" },
  { id: 19, text: "I have used deceit or lied to get my way.", trait: "M" },
  { id: 20, text: "I feel little concern for others.", trait: "P" },
  { id: 21, text: "I enjoy leading and being in charge.", trait: "N" },
  { id: 22, text: "I tend to lack remorse.", trait: "P" },
  { id: 23, text: "I am highly capable in most situations.", trait: "N" },
  { id: 24, text: "I would do something bad if I knew no one would find out.", trait: "P" },
  { id: 25, text: "I enjoy a good debate to win arguments.", trait: "M" },
  { id: 26, text: "I crave status and power.", trait: "N" },
  { id: 27, text: "I avoid dangerous situations.", trait: "P", reverse: true },
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

export default function DarkTriad({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [scores, setScores] = useState({ N: 0, M: 0, P: 0, total: 0 });
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const q = QUESTIONS[current];

  const handleAnswer = (val: number) => {
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);
    if (current + 1 >= QUESTIONS.length) {
      // Calculate scores
      let N = 0, M = 0, P = 0;
      QUESTIONS.forEach(q => {
        const raw = newAnswers[q.id] ?? 3;
        const score = q.reverse ? (6 - raw) : raw;
        if (q.trait === "N") N += score;
        else if (q.trait === "M") M += score;
        else P += score;
      });
      const nCount = QUESTIONS.filter(q => q.trait === "N").length;
      const mCount = QUESTIONS.filter(q => q.trait === "M").length;
      const pCount = QUESTIONS.filter(q => q.trait === "P").length;
      const nPct = Math.round(((N - nCount) / (nCount * 4)) * 100);
      const mPct = Math.round(((M - mCount) / (mCount * 4)) * 100);
      const pPct = Math.round(((P - pCount) / (pCount * 4)) * 100);
      const total = Math.round((nPct + mPct + pPct) / 3);
      setScores({ N: nPct, M: mPct, P: pPct, total });
      const isNew = saveHighScore(game.id, total);
      setIsNewBest(isNew);
      if (isNew) setHS(total);
      setPhase("done");
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setAnswers({}); setCurrent(0); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(scores.total, game);
  const pct = getPercentile(scores.total, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: scores.total, unit: "/100", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My Dark Triad score: ${scores.total}/100 🌑 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Dark Triad Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {scores.total}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>/100</span>
        </div>
        {/* Sub-scores */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, margin: "20px 0" }}>
          {[
            { label: "Narcissism", val: scores.N, color: "#F59E0B" },
            { label: "Machiavellian", val: scores.M, color: "#EF4444" },
            { label: "Psychopathy", val: scores.P, color: "#8B5CF6" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 8px" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div>
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
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌑</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Dark Triad Assessment</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        27 statements. Rate each honestly — there are no right or wrong answers. Your Narcissism, Machiavellianism, and Psychopathy scores are calculated separately.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
        {["🟡 Narcissism", "🔴 Machiavellianism", "🟣 Psychopathy"].map(t => (
          <div key={t} style={{ background: "var(--bg-elevated)", borderRadius: 999, padding: "4px 12px", fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{t}</div>
        ))}
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~4 minutes · Answer honestly for accurate results</p>
      <button onClick={() => { trackPlay(game.id); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN ASSESSMENT</button>
    </div>
  );

  const progress = (current / QUESTIONS.length) * 100;

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {QUESTIONS.length}</span>
          <span style={{ color: q.trait === "N" ? "#F59E0B" : q.trait === "M" ? "#EF4444" : "#8B5CF6" }}>
            {q.trait === "N" ? "NARCISSISM" : q.trait === "M" ? "MACHIAVELLIANISM" : "PSYCHOPATHY"}
          </span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 28 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "24px 20px", marginBottom: 28, minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "clamp(14px,2.5vw,17px)", lineHeight: 1.65, textAlign: "center", color: "var(--text-1)", fontWeight: 500 }}>
            &quot;{q.text}&quot;
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LABELS.map((label, i) => {
            const val = i + 1;
            const isSelected = answers[q.id] === val;
            return (
              <button key={i} onClick={() => handleAnswer(val)} className="pressable"
                style={{
                  padding: "14px 20px",
                  background: isSelected ? `${game.accent}20` : "var(--bg-card)",
                  border: `1.5px solid ${isSelected ? game.accent : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? game.accent : "var(--text-2)",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 14 }}>{val}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
