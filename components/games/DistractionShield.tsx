"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const TOTAL_ROUNDS = 20;
const TIME_LIMIT = 1800; // ms per round

// Flanker task: arrows pointing left/right
// Congruent:   ← ← ← ← ←  (all same)
// Incongruent: → → ← → →  (center differs)

type Direction = "left" | "right";
type Congruency = "congruent" | "incongruent";

function generateTrial(): { target: Direction; flankers: Direction[]; congruent: Congruency } {
  const target: Direction = Math.random() < 0.5 ? "left" : "right";
  const congruent: Congruency = Math.random() < 0.5 ? "congruent" : "incongruent";
  const flankerDir: Direction = congruent === "congruent" ? target : (target === "left" ? "right" : "left");
  return {
    target,
    flankers: [flankerDir, flankerDir, target, flankerDir, flankerDir],
    congruent,
  };
}

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
      const t2 = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile);
    }
  }
  return 50;
}

type Phase = "idle" | "playing" | "done";

export default function DistractionShield({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [trial, setTrial] = useState(generateTrial());
  const [correct, setCorrect] = useState(0);
  const [rts, setRts] = useState<number[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [trialStart, setTrialStart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const nextTrial = useCallback((newCorrect: number, newRts: number[]) => {
    setFeedback(null);
    const nextRound = round + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      const accuracy = Math.round((newCorrect / TOTAL_ROUNDS) * 100);
      const avgRt = newRts.length > 0 ? newRts.reduce((a, b) => a + b, 0) / newRts.length : 1000;
      const speedBonus = Math.max(0, Math.round((1000 - avgRt) / 20));
      const score = Math.min(100, accuracy + speedBonus);
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      activeRef.current = false;
      setPhase("done");
    } else {
      setRound(nextRound);
      setTrial(generateTrial());
      setTrialStart(Date.now());
      setTimeLeft(TIME_LIMIT);
    }
  }, [round, game.id]);

  // Timer per trial
  useEffect(() => {
    if (phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTrialStart(Date.now());
    setTimeLeft(TIME_LIMIT);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(timerRef.current!);
          // Timeout = wrong
          setFeedback("wrong");
          setTimeout(() => nextTrial(correct, rts), 300);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [round, phase]);

  const handleAnswer = useCallback((dir: Direction) => {
    if (!activeRef.current || feedback) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const rt = Date.now() - trialStart;
    const isCorrect = dir === trial.target;
    if (isCorrect) playBeep("tap");
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newRts = isCorrect ? [...rts, rt] : rts;
    setCorrect(newCorrect);
    setRts(newRts);
    setFeedback(isCorrect ? "correct" : "wrong");
    setTimeout(() => nextTrial(newCorrect, newRts), 250);
  }, [feedback, trial, correct, rts, trialStart, nextTrial]);

  const handleStart = () => {
    trackPlay(game.id);
    activeRef.current = true;
    setRound(0);
    setCorrect(0);
    setRts([]);
    setTrial(generateTrial());
    setFeedback(null);
    setPhase("playing");
    setTrialStart(Date.now());
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  if (phase === "done") {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="%"
        normalizedScore={normalized}
        percentile={pct}
        rank={rank}
        highScore={highScore}
        isNewBest={isNewBest}
        showAd={showAd}
        onAdDone={afterAd}
        onRetry={handleRetry}
        tone={resolveResultTone(game)}
      />
    );
  }

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🛡️</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Distraction Shield</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 360, margin: "0 auto 16px" }}>
        Five arrows appear. Focus only on the <strong>center arrow</strong> — ignore the others. Tap LEFT or RIGHT based on which way the center points.
      </p>
      <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "inline-block" }}>
        <div style={{ fontSize: 28, letterSpacing: 6, marginBottom: 8 }}>← ← ← ← ←</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>CONGRUENT → easy</div>
        <div style={{ fontSize: 28, letterSpacing: 6, margin: "12px 0 8px" }}>→ → ← → →</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>INCONGRUENT → harder</div>
      </div>
      <br />
      <button onClick={handleStart} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ PLAY</button>
    </div>
  );

  const arrows = trial.flankers.map(d => d === "left" ? "←" : "→");

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span>ROUND {round + 1} / {TOTAL_ROUNDS}</span>
        <span style={{ color: correct / Math.max(1, round) > 0.7 ? "#10B981" : "#EF4444" }}>{correct} CORRECT</span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
        <div style={{ height: "100%", width: `${(timeLeft / TIME_LIMIT) * 100}%`, background: timeLeft < 500 ? "#EF4444" : game.accent, borderRadius: 2, transition: "width 0.1s linear" }} />
      </div>

      {/* Flanker display */}
      <div style={{ textAlign: "center", padding: "40px 0", background: feedback ? (feedback === "correct" ? "#10B98112" : "#EF444412") : "var(--bg-card)", border: `1.5px solid ${feedback ? (feedback === "correct" ? "#10B981" : "#EF4444") : "var(--border)"}`, borderRadius: "var(--radius-xl)", marginBottom: 24, transition: "background 0.15s, border-color 0.15s" }}>
        <div style={{ fontSize: 52, letterSpacing: 12, fontFamily: "monospace" }}>
          {arrows.map((a, i) => (
            <span key={i} style={{ color: "var(--text-2)" }}>{a}</span>
          ))}
        </div>
        {feedback && (
          <div style={{ marginTop: 12, fontSize: 13, fontFamily: "var(--font-mono)", color: feedback === "correct" ? "#10B981" : "#EF4444" }}>
            {feedback === "correct" ? "✓ CORRECT" : "✗ WRONG"}
          </div>
        )}
      </div>

      {/* Answer buttons */}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => handleAnswer("left")} className="pressable" disabled={!!feedback}
          style={{ flex: 1, padding: "20px 0", background: "var(--bg-card)", border: "1.5px solid var(--border-md)", borderRadius: "var(--radius-lg)", fontSize: 32, cursor: "pointer", transition: "background 0.1s" }}>
          ←
        </button>
        <button onClick={() => handleAnswer("right")} className="pressable" disabled={!!feedback}
          style={{ flex: 1, padding: "20px 0", background: "var(--bg-card)", border: "1.5px solid var(--border-md)", borderRadius: "var(--radius-lg)", fontSize: 32, cursor: "pointer", transition: "background 0.1s" }}>
          →
        </button>
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 12 }}>WHICH WAY IS THE CENTER ARROW?</p>
    </>
  );
}
