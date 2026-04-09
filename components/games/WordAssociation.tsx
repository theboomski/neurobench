"use client";

import { useState, useCallback } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

// Word → best semantic associate (with distractors)
// Measured: accuracy + reaction time → semantic network richness
const PAIRS = [
  { word: "Ocean",      options: ["Wave", "Chair", "Pencil", "Tuesday"],    correct: 0 },
  { word: "Fire",       options: ["Carpet", "Smoke", "Piano", "Envelope"],  correct: 1 },
  { word: "Library",    options: ["Silence", "Engine", "Pebble", "Curtain"],correct: 0 },
  { word: "Hospital",   options: ["Laughter", "Scalpel", "Pillow", "Both B and C"], correct: 3 },
  { word: "Betrayal",   options: ["Trust", "Purple", "Window", "Silence"],  correct: 0 },
  { word: "Lightning",  options: ["Rain", "Sandcastle", "Folder", "Marble"],correct: 0 },
  { word: "Prison",     options: ["Freedom", "Stapler", "Candle", "Frost"], correct: 0 },
  { word: "Childhood",  options: ["Taxes", "Nostalgia", "Invoice", "Protocol"], correct: 1 },
  { word: "Science",    options: ["Experiment", "Curtain", "Marble", "Autumn"], correct: 0 },
  { word: "Sleep",      options: ["Monday", "Dream", "Invoice", "Bracket"], correct: 1 },
  { word: "Ambition",   options: ["Ladder", "Pillow", "Gravel", "Tuesday"], correct: 0 },
  { word: "Silence",    options: ["Forest", "Engine", "Invoice", "Bracket"], correct: 0 },
  { word: "Revolution", options: ["Change", "Carpet", "Stapler", "Pebble"], correct: 0 },
  { word: "Memory",     options: ["Photograph", "Envelope", "Marble", "Curtain"], correct: 0 },
  { word: "Danger",     options: ["Caution", "Tuesday", "Pillow", "Gravel"], correct: 0 },
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

export default function WordAssociation({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [rts, setRts] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [trialStart, setTrialStart] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [avgRT, setAvgRT] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const q = PAIRS[current];

  const handleAnswer = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const rt = Date.now() - trialStart;
    const isCorrect = idx === q.correct;
    if (isCorrect) playBeep("tap");
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newRTs = isCorrect ? [...rts, rt] : rts;

    setTimeout(() => {
      if (current + 1 >= PAIRS.length) {
        const accuracy = Math.round((newCorrect / PAIRS.length) * 100);
        const avgRt = newRTs.length > 0 ? Math.round(newRTs.reduce((a, b) => a + b, 0) / newRTs.length) : 2000;
        const speedScore = Math.max(0, Math.round((3000 - avgRt) / 25));
        const score = Math.min(100, Math.round(accuracy * 0.65 + speedScore * 0.35));
        setAvgRT(avgRt);
        setFinalScore(score);
        const isNew = saveHighScore(game.id, score);
        setIsNewBest(isNew);
        setPhase("done");
      } else {
        setCorrect(newCorrect);
        setRts(newRTs);
        setCurrent(c => c + 1);
        setSelected(null);
        setTrialStart(Date.now());
      }
    }, 600);
  }, [selected, q, correct, rts, current, trialStart, game.id]);

  const handleStart = () => {
    setCurrent(0); setCorrect(0); setRts([]); setSelected(null);
    setTrialStart(Date.now());
    setPhase("playing");
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "%", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My Word IQ: ${finalScore}%! 🕸️ Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Semantic Association Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>%</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>{correct}/{PAIRS.length} correct · avg {avgRT}ms</div>
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
      <div style={{ fontSize: 56, marginBottom: 16 }}>🕸️</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Word Association IQ</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        A word appears. Choose the option most closely associated with it. Speed and accuracy both count. Go with your first instinct.
      </p>
      <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "inline-block" }}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Ocean →</div>
        <div style={{ fontSize: 13, color: game.accent }}>Wave ✓</div>
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>Chair · Pencil · Tuesday</div>
      </div>
      <br />
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>15 words · ~2 minutes</p>
      <button onClick={handleStart} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {PAIRS.length}</span>
          <span style={{ color: "#10B981" }}>{correct} correct</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 28 }}>
          <div style={{ height: "100%", width: `${(current / PAIRS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: "clamp(32px,8vw,52px)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-1)", marginBottom: 8 }}>{q.word}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>What's most associated?</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrectOpt = i === q.correct;
            const showCorrect = selected !== null && isCorrectOpt;
            const showWrong = selected !== null && isSelected && !isCorrectOpt;
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null} className="pressable"
                style={{
                  padding: "16px 12px",
                  background: showCorrect ? "#10B98120" : showWrong ? "#EF444420" : "var(--bg-card)",
                  border: `1.5px solid ${showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--text-1)",
                  cursor: selected !== null ? "default" : "pointer",
                  transition: "all 0.15s",
                }}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
