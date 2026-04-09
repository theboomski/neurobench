"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

// Real words vs pseudowords (pronounceable but not real)
const STIMULI = [
  { word: "table",      isReal: true },
  { word: "blick",      isReal: false },
  { word: "freedom",    isReal: true },
  { word: "trabel",     isReal: false },
  { word: "garden",     isReal: true },
  { word: "flurp",      isReal: false },
  { word: "thought",    isReal: true },
  { word: "smave",      isReal: false },
  { word: "journal",    isReal: true },
  { word: "printh",     isReal: false },
  { word: "language",   isReal: true },
  { word: "glome",      isReal: false },
  { word: "mirror",     isReal: true },
  { word: "crumple",    isReal: true },
  { word: "taving",     isReal: false },
  { word: "justice",    isReal: true },
  { word: "flurble",    isReal: false },
  { word: "ancient",    isReal: true },
  { word: "strale",     isReal: false },
  { word: "whisper",    isReal: true },
  { word: "brimstone",  isReal: true },
  { word: "glorping",   isReal: false },
  { word: "threshold",  isReal: true },
  { word: "mave",       isReal: false },
  { word: "eloquent",   isReal: true },
  { word: "snurgle",    isReal: false },
  { word: "twilight",   isReal: true },
  { word: "plonk",      isReal: true },
  { word: "frimble",    isReal: false },
  { word: "labyrinth",  isReal: true },
];

const TIME_LIMIT = 2500; // ms per word

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

export default function WordSpeed({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [rts, setRts] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [finalScore, setFinalScore] = useState(0);
  const [avgRT, setAvgRT] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trialStart = useRef(0);
  const correctRef = useRef(0);
  const rtsRef = useRef<number[]>([]);
  const currentRef = useRef(0);
  const activeRef = useRef(false);

  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    activeRef.current = false;
    const avgRt = rtsRef.current.length > 0
      ? Math.round(rtsRef.current.reduce((a, b) => a + b, 0) / rtsRef.current.length)
      : 1200;
    const accuracy = Math.round((correctRef.current / STIMULI.length) * 100);
    const speedScore = Math.max(0, Math.round((2000 - avgRt) / 15));
    const score = Math.min(100, Math.round(accuracy * 0.6 + speedScore * 0.4));
    setAvgRT(avgRt);
    setFinalScore(score);
    const isNew = saveHighScore(game.id, score);
    setIsNewBest(isNew);
    setPhase("done");
  }, [game.id]);

  const advanceTrial = useCallback((newCorrect: number, newRTs: number[]) => {
    const next = currentRef.current + 1;
    if (next >= STIMULI.length) {
      correctRef.current = newCorrect;
      rtsRef.current = newRTs;
      finishGame();
      return;
    }
    currentRef.current = next;
    setCurrent(next);
    setFeedback(null);
    setTimeLeft(TIME_LIMIT);
    trialStart.current = Date.now();
  }, [finishGame]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 100;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          setFeedback("wrong");
          setTimeout(() => advanceTrial(correctRef.current, rtsRef.current), 300);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, phase, advanceTrial]);

  const handleAnswer = useCallback((isReal: boolean) => {
    if (!activeRef.current || feedback) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const rt = Date.now() - trialStart.current;
    const stim = STIMULI[currentRef.current];
    const isCorrect = isReal === stim.isReal;
    if (isCorrect) playBeep("tap");
    const newCorrect = isCorrect ? correctRef.current + 1 : correctRef.current;
    const newRTs = isCorrect ? [...rtsRef.current, rt] : rtsRef.current;
    correctRef.current = newCorrect;
    rtsRef.current = newRTs;
    setCorrect(newCorrect);
    setRts(newRTs);
    setFeedback(isCorrect ? "correct" : "wrong");
    setTimeout(() => advanceTrial(newCorrect, newRTs), 250);
  }, [feedback, advanceTrial]);

  const handleStart = () => {
    correctRef.current = 0;
    rtsRef.current = [];
    currentRef.current = 0;
    activeRef.current = true;
    setCurrent(0);
    setCorrect(0);
    setRts([]);
    setFeedback(null);
    setTimeLeft(TIME_LIMIT);
    trialStart.current = Date.now();
    setPhase("playing");
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "%", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My word speed: ${avgRT}ms avg! Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  const stim = STIMULI[current];

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Lexical Decision Speed Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {avgRT}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>ms</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>avg · {correct}/{STIMULI.length} correct</div>
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
      <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Word Recognition Speed</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        Words flash on screen. Decide as fast as possible: is it a <strong style={{ color: "#10B981" }}>real word</strong> or a <strong style={{ color: "#EF4444" }}>made-up word</strong>? Your reaction time is your score.
      </p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24 }}>
        <div style={{ background: "#10B98120", border: "1px solid #10B981", borderRadius: 10, padding: "12px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#10B981", fontFamily: "var(--font-mono)" }}>REAL</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>e.g. "table"</div>
        </div>
        <div style={{ background: "#EF444420", border: "1px solid #EF4444", borderRadius: 10, padding: "12px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#EF4444", fontFamily: "var(--font-mono)" }}>FAKE</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>e.g. "blick"</div>
        </div>
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>30 words · ~2 minutes</p>
      <button onClick={handleStart} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span>{current + 1} / {STIMULI.length}</span>
        <span style={{ color: "#10B981" }}>{correct} correct</span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
        <div style={{ height: "100%", width: `${(timeLeft / TIME_LIMIT) * 100}%`, background: timeLeft < 600 ? "#EF4444" : game.accent, borderRadius: 2, transition: "width 0.1s linear" }} />
      </div>

      <div style={{ textAlign: "center", padding: "40px 20px", background: feedback ? (feedback === "correct" ? "#10B98112" : "#EF444412") : "var(--bg-card)", border: `1.5px solid ${feedback ? (feedback === "correct" ? "#10B981" : "#EF4444") : "var(--border)"}`, borderRadius: "var(--radius-xl)", marginBottom: 20, minHeight: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        <div style={{ fontSize: "clamp(28px,7vw,44px)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
          {stim.word}
        </div>
        {feedback && (
          <div style={{ marginTop: 12, fontSize: 12, fontFamily: "var(--font-mono)", color: feedback === "correct" ? "#10B981" : "#EF4444" }}>
            {feedback === "correct" ? "✓" : "✗"} {stim.isReal ? "REAL WORD" : "MADE-UP WORD"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => handleAnswer(true)} disabled={!!feedback} className="pressable"
          style={{ flex: 1, padding: "18px 0", background: "#10B98120", border: "2px solid #10B981", borderRadius: "var(--radius-lg)", fontSize: 15, fontWeight: 800, color: "#10B981", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
          ✓ REAL
        </button>
        <button onClick={() => handleAnswer(false)} disabled={!!feedback} className="pressable"
          style={{ flex: 1, padding: "18px 0", background: "#EF444420", border: "2px solid #EF4444", borderRadius: "var(--radius-lg)", fontSize: 15, fontWeight: 800, color: "#EF4444", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
          ✗ FAKE
        </button>
      </div>
    </>
  );
}
