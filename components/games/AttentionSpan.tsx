"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;
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
  const [shareImg, setShareImg] = useState<string | null>(null);
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
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "%", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My attention score: ${finalScore}%! Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Sustained Attention Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 20, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>%</span>
        </div>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#10B981" }}>{hits}</div><div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>HITS</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#EF4444" }}>{misses}</div><div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>MISSES</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#F59E0B" }}>{falseAlarms}</div><div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>FALSE ALARMS</div></div>
        </div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ PLAY AGAIN</button>
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

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
