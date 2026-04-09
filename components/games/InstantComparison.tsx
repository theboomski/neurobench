"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;
const TIME_LIMIT = 3000;

function getRank(score: number, game: GameData) {
  // Higher score = better: S has highest threshold
  // Find the highest rank where score >= maxMs
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(score: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (score >= pts[0].ms) return pts[0].percentile;
  if (score <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (score <= pts[i].ms && score >= pts[i + 1].ms) {
      const t2 = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

type Op = "+" | "-" | "×" | "÷";
interface Expr { value: number; display: string; }

function makeExpr(difficulty: number): Expr {
  // Difficulty 1-3: +/-, small numbers
  // Difficulty 4-6: ×, bigger numbers  
  // Difficulty 7+: mixed, close values
  const maxN = Math.min(10 + difficulty * 5, 50);
  
  const ops: Op[] = difficulty < 3 ? ["+", "-"] : difficulty < 6 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  
  let a: number, b: number, value: number;
  
  if (op === "+") {
    a = Math.floor(Math.random() * maxN) + 2;
    b = Math.floor(Math.random() * maxN) + 2;
    value = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * maxN) + 10;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    value = a - b;
  } else if (op === "×") {
    a = Math.floor(Math.random() * Math.min(difficulty + 4, 12)) + 2;
    b = Math.floor(Math.random() * Math.min(difficulty + 4, 12)) + 2;
    value = a * b;
  } else {
    b = Math.floor(Math.random() * 9) + 2;
    value = Math.floor(Math.random() * 10) + 2;
    a = b * value;
  }
  
  return { value, display: `${a} ${op} ${b}` };
}

function makePair(difficulty: number) {
  let left: Expr, right: Expr, attempts = 0;
  do {
    left = makeExpr(difficulty);
    right = makeExpr(difficulty);
    attempts++;
    // At higher difficulties, force close values
    if (difficulty >= 5 && attempts < 20) {
      const diff = Math.abs(left.value - right.value);
      if (diff > Math.max(5, left.value * 0.2)) continue;
    }
  } while (left.value === right.value && attempts < 30);
  
  return { left, right, correct: left.value > right.value ? "left" : "right" as "left" | "right" };
}

type Phase = "idle" | "playing" | "done";

export default function InstantComparison({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [score, setScore]         = useState(0);
  const [pair, setPair]           = useState(makePair(1));
  const [feedback, setFeedback]   = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [timeLeft, setTimeLeft]   = useState(TIME_LIMIT);
  const [showAd, setShowAd]       = useState(false);
  const [shareImg, setShareImg]   = useState<string | null>(null);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef  = useRef(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (roundRef.current) clearTimeout(roundRef.current);
  };

  const endGame = useCallback((s: number) => {
    clearTimers();
    const isNew = saveHighScore(game.id, s);
    setIsNewBest(isNew);
    if (isNew) setHS(s);
    setFinalScore(s);
    setPhase("done");
  }, [game.id]);

  const startRound = useCallback((currentScore: number) => {
    const difficulty = Math.floor(currentScore / 4) + 1;
    setPair(makePair(difficulty));
    setFeedback(null);
    setTimeLeft(TIME_LIMIT);

    const startMs = performance.now();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, TIME_LIMIT - (performance.now() - startMs));
      setTimeLeft(remaining);
    }, 50);

    roundRef.current = setTimeout(() => {
      clearTimers();
      playBeep("fail");
      setFeedback("timeout");
      setTimeout(() => endGame(currentScore), 800);
    }, TIME_LIMIT);
  }, [endGame]);

  const startGame = () => {
    scoreRef.current = 0;
    setScore(0);
    setFeedback(null);
    setPhase("playing");
    startRound(0);
  };

  const handleAnswer = useCallback((side: "left" | "right") => {
    if (phase !== "playing" || feedback !== null) return;
    clearTimers();
    const correct = side === pair.correct;
    if (correct) {
      playBeep("success");
      setFeedback("correct");
      scoreRef.current++;
      setScore(scoreRef.current);
      setTimeout(() => startRound(scoreRef.current), 280);
    } else {
      playBeep("fail");
      setFeedback("wrong");
      setTimeout(() => endGame(scoreRef.current), 800);
    }
  }, [phase, feedback, pair, startRound, endGame]);

  useEffect(() => () => clearTimers(), []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct  = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "CORRECT", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "report.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>Assessment Complete · {game.clinicalTitle}</div>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>
          <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
            {finalScore}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>correct</span>
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>◆ New Personal Record</div>}
          {highScore !== null && !isNewBest && <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Personal best: <span style={{ color: game.accent }}>{highScore}</span></div>}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 24px" }}>
            {game.stats.ranks.map(r => (<div key={r.label} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>{r.label}</div>))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ PLAY AGAIN</button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
          </div>
          {shareImg && <div style={{ marginTop: 28 }}><img src={shareImg} alt="Report" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
        </div>
      </>
    );
  }

  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timerPct > 60 ? game.accent : timerPct > 30 ? "#F59E0B" : "#EF4444";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>⚖️</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Numerical Magnitude Processing</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Click the LARGER value · 3 seconds per round</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Gets harder as you score · wrong or timeout = game over</p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, borderRadius: 2, transition: "width 0.05s linear, background 0.3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>SCORE: <span style={{ color: game.accent, fontWeight: 700 }}>{score}</span></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: timerColor, fontWeight: 700 }}>{(timeLeft / 1000).toFixed(1)}s</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(["left", "right"] as const).map(side => (
              <button key={side} onClick={() => handleAnswer(side)} className="pressable" style={{
                background: feedback === "correct" && side === pair.correct ? "#22c55e18" : feedback === "wrong" && side === pair.correct ? "#22c55e18" : feedback === "wrong" && side !== pair.correct ? "#ef444418" : "var(--bg-card)",
                border: `2px solid ${feedback === "correct" && side === pair.correct ? "#22c55e" : feedback !== null && side === pair.correct ? "#22c55e" : feedback === "wrong" && side !== pair.correct ? "#ef4444" : "var(--border-md)"}`,
                borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,40px) 16px", cursor: "pointer", textAlign: "center", transition: "all 0.12s", WebkitTapHighlightColor: "transparent",
              }}>
                <div style={{ fontSize: "clamp(20px,4.5vw,32px)", fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                  {pair[side].display}
                </div>
              </button>
            ))}
          </div>
          {feedback === "timeout" && <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#EF4444", fontFamily: "var(--font-mono)" }}>TIME&apos;S UP!</div>}
        </div>
      )}
    </>
  );
}
