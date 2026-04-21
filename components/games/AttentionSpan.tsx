"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const DURATION = 90; // seconds
const TARGET = "●"; // target stimulus
const DISTRACTORS = ["■", "▲", "◆", "★", "✦", "⬟"];
const STIMULUS_INTERVAL = 1500; // ms between stimuli
const STIMULUS_SHOW = 800; // ms stimulus visible

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
      return Math.round(pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

type Phase = "idle" | "playing" | "done";

export default function AttentionSpan({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [stimulus, setStimulus] = useState<string | null>(null);
  const [isTarget, setIsTarget] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [feedback, setFeedback] = useState<"hit" | "miss" | "fa" | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stimulusRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const isTargetRef = useRef(false);
  const stimulusVisible = useRef(false);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stimulusRef.current) clearInterval(stimulusRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);

    const h = hitsRef.current;
    const m = missesRef.current;
    const fa = falseAlarmsRef.current;
    const totalTargets = h + m;
    const accuracy = totalTargets > 0 ? Math.round((h / totalTargets) * 100) : 0;
    const faPenalty = Math.min(fa * 3, 20);
    const score = Math.max(0, accuracy - faPenalty);

    setFinalScore(score);
    const isNew = saveHighScore(game.id, score);
    setIsNewBest(isNew);
    if (isNew) setHS(score);
    setPhase("done");
  }, [game.id]);

  const showNextStimulus = useCallback(() => {
    // 70% chance of distractor, 30% target
    const isT = Math.random() < 0.30;
    const sym = isT ? TARGET : DISTRACTORS[Math.floor(Math.random() * DISTRACTORS.length)];
    isTargetRef.current = isT;
    stimulusVisible.current = true;
    setIsTarget(isT);
    setStimulus(sym);
    setFeedback(null);

    hideRef.current = setTimeout(() => {
      if (stimulusVisible.current && isTargetRef.current) {
        // Miss — target disappeared without response
        missesRef.current++;
        setMisses(missesRef.current);
        setFeedback("miss");
      }
      stimulusVisible.current = false;
      setStimulus(null);
    }, STIMULUS_SHOW);
  }, []);

  const handleStart = () => {
    trackPlay(game.id);
    hitsRef.current = 0;
    missesRef.current = 0;
    falseAlarmsRef.current = 0;
    setHits(0); setMisses(0); setFalseAlarms(0);
    setTimeLeft(DURATION);
    setPhase("playing");

    let tl = DURATION;
    timerRef.current = setInterval(() => {
      tl--;
      setTimeLeft(tl);
      if (tl <= 0) finishGame();
    }, 1000);

    stimulusRef.current = setInterval(showNextStimulus, STIMULUS_INTERVAL);
  };

  const handleTap = useCallback(() => {
    if (phase !== "playing") return;
    if (stimulusVisible.current) {
      if (isTargetRef.current) {
        // Hit
        hitsRef.current++;
        setHits(hitsRef.current);
        setFeedback("hit");
        stimulusVisible.current = false;
        if (hideRef.current) clearTimeout(hideRef.current);
        setStimulus(null);
      } else {
        // False alarm — tapped distractor
        falseAlarmsRef.current++;
        setFalseAlarms(falseAlarmsRef.current);
        setFeedback("fa");
      }
    }
    // Tapping blank = no penalty (only false alarm on distractor)
  }, [phase]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stimulusRef.current) clearInterval(stimulusRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
  }, []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const pct = phase === "done" ? getPercentile(finalScore, game) : 0;

  if (phase === "done" && rank) {
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
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Attention Span Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 8, lineHeight: 1.7, maxWidth: 360, margin: "0 auto 8px" }}>
        Symbols flash on screen. Tap <strong style={{ color: game.accent }}>{TARGET}</strong> only — ignore everything else. 90 seconds. Stay focused.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", margin: "20px 0", flexWrap: "wrap" }}>
        <div style={{ background: "#10B98120", border: "1px solid #10B981", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#10B981", fontFamily: "var(--font-mono)" }}>TAP {TARGET} = HIT ✓</div>
        <div style={{ background: "#EF444420", border: "1px solid #EF4444", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#EF4444", fontFamily: "var(--font-mono)" }}>MISS {TARGET} = -1</div>
        <div style={{ background: "#F59E0B20", border: "1px solid #F59E0B", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#F59E0B", fontFamily: "var(--font-mono)" }}>TAP ■▲◆ = FALSE ALARM</div>
      </div>
      <button onClick={handleStart} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", marginTop: 12 }}>▶ BEGIN TEST</button>
    </div>
  );

  const feedbackColor = feedback === "hit" ? "#10B981" : feedback === "fa" ? "#EF4444" : "#F59E0B";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ color: timeLeft <= 10 ? "#EF4444" : "var(--text-2)" }}>{timeLeft}s</span>
        <span>✓{hits} ✗{misses} ⚠{falseAlarms}</span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
        <div style={{ height: "100%", width: `${(timeLeft / DURATION) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 1s linear" }} />
      </div>

      {/* Tap zone */}
      <div onClick={handleTap} style={{ background: "var(--bg-card)", border: `2px solid ${feedback ? feedbackColor : "var(--border)"}`, borderRadius: "var(--radius-xl)", minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color 0.1s", WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
        {stimulus ? (
          <div style={{ fontSize: 72, color: isTarget ? game.accent : "var(--text-2)", transition: "color 0.1s", lineHeight: 1 }}>{stimulus}</div>
        ) : (
          <div style={{ fontSize: 14, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>— WAITING —</div>
        )}
        {feedback && (
          <div style={{ marginTop: 16, fontSize: 12, fontFamily: "var(--font-mono)", color: feedbackColor }}>
            {feedback === "hit" ? "✓ HIT" : feedback === "fa" ? "✗ FALSE ALARM" : "✗ MISSED"}
          </div>
        )}
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 12 }}>TAP WHEN YOU SEE {TARGET}</p>
    </>
  );
}
