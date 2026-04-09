"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;
const TOTAL_TRIALS = 24;
const TIME_LIMIT = 3000; // ms per trial

// Two alternating rules
type Rule = "size" | "color";
type Answer = "A" | "B";

interface Stimulus {
  shape: "circle" | "square";
  color: "red" | "blue";
  size: "big" | "small";
  rule: Rule;
  isSwitch: boolean;
  correctAnswer: Answer; // A = left option, B = right option
  optionA: string;
  optionB: string;
}

function generateTrial(prevRule: Rule | null): Stimulus {
  const rule: Rule = prevRule === "size" ? "color" : "size";
  const isSwitch = prevRule !== null && rule !== prevRule;

  const color: "red" | "blue" = Math.random() < 0.5 ? "red" : "blue";
  const size: "big" | "small" = Math.random() < 0.5 ? "big" : "small";

  let correctAnswer: Answer;
  let optionA: string;
  let optionB: string;

  if (rule === "color") {
    // Classify by color: A=RED, B=BLUE
    optionA = "RED";
    optionB = "BLUE";
    correctAnswer = color === "red" ? "A" : "B";
  } else {
    // Classify by size: A=BIG, B=SMALL
    optionA = "BIG";
    optionB = "SMALL";
    correctAnswer = size === "big" ? "A" : "B";
  }

  return { shape: Math.random() < 0.5 ? "circle" : "square", color, size, rule, isSwitch, correctAnswer, optionA, optionB };
}

function getRank(score: number, game: GameData) {
  // Lower switch cost = better, score is inverted switch cost
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

export default function TaskSwitching({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [trialIdx, setTrialIdx] = useState(0);
  const [stimulus, setStimulus] = useState<Stimulus>(generateTrial(null));
  const [switchRTs, setSwitchRTs] = useState<number[]>([]);
  const [repeatRTs, setRepeatRTs] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const trialStart = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stimulusRef = useRef(stimulus);
  const trialIdxRef = useRef(0);
  const switchRTsRef = useRef<number[]>([]);
  const repeatRTsRef = useRef<number[]>([]);
  const correctRef = useRef(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const switchAvg = switchRTsRef.current.length > 0
      ? switchRTsRef.current.reduce((a, b) => a + b, 0) / switchRTsRef.current.length : 1500;
    const repeatAvg = repeatRTsRef.current.length > 0
      ? repeatRTsRef.current.reduce((a, b) => a + b, 0) / repeatRTsRef.current.length : 800;
    const switchCost = Math.max(0, switchAvg - repeatAvg);
    // Score: lower switch cost = higher score
    const score = Math.max(0, Math.min(100, Math.round(100 - switchCost / 15)));
    setFinalScore(score);
    const isNew = saveHighScore(game.id, score);
    setIsNewBest(isNew);
    if (isNew) setHS(score);
    setPhase("done");
  }, [game.id]);

  const advanceTrial = useCallback((newCorrect: number, newSwitchRTs: number[], newRepeatRTs: number[], currentStimulus: Stimulus) => {
    const nextIdx = trialIdxRef.current + 1;
    if (nextIdx >= TOTAL_TRIALS) {
      correctRef.current = newCorrect;
      switchRTsRef.current = newSwitchRTs;
      repeatRTsRef.current = newRepeatRTs;
      finishGame();
      return;
    }
    trialIdxRef.current = nextIdx;
    setTrialIdx(nextIdx);
    const next = generateTrial(currentStimulus.rule);
    stimulusRef.current = next;
    setStimulus(next);
    setFeedback(null);
    setTimeLeft(TIME_LIMIT);
    trialStart.current = Date.now();
  }, [finishGame]);

  // Per-trial timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 100;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          setFeedback("wrong");
          setTimeout(() => advanceTrial(correctRef.current, switchRTsRef.current, repeatRTsRef.current, stimulusRef.current), 300);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [trialIdx, phase, advanceTrial]);

  const handleAnswer = useCallback((ans: Answer) => {
    if (feedback || phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    const rt = Date.now() - trialStart.current;
    const stim = stimulusRef.current;
    const isCorrect = ans === stim.correctAnswer;
    if (isCorrect) playBeep("tap");

    const newCorrect = isCorrect ? correctRef.current + 1 : correctRef.current;
    correctRef.current = newCorrect;
    setCorrect(newCorrect);

    const newSwitchRTs = isCorrect && stim.isSwitch ? [...switchRTsRef.current, rt] : switchRTsRef.current;
    const newRepeatRTs = isCorrect && !stim.isSwitch ? [...repeatRTsRef.current, rt] : repeatRTsRef.current;
    switchRTsRef.current = newSwitchRTs;
    repeatRTsRef.current = newRepeatRTs;
    setSwitchRTs(newSwitchRTs);
    setRepeatRTs(newRepeatRTs);

    setFeedback(isCorrect ? "correct" : "wrong");
    setTimeout(() => advanceTrial(newCorrect, newSwitchRTs, newRepeatRTs, stim), 250);
  }, [feedback, phase, advanceTrial]);

  const handleStart = () => {
    trialIdxRef.current = 0;
    correctRef.current = 0;
    switchRTsRef.current = [];
    repeatRTsRef.current = [];
    const first = generateTrial(null);
    stimulusRef.current = first;
    setTrialIdx(0);
    setStimulus(first);
    setCorrect(0);
    setSwitchRTs([]);
    setRepeatRTs([]);
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
  const switchAvg = switchRTs.length > 0 ? Math.round(switchRTs.reduce((a, b) => a + b, 0) / switchRTs.length) : 0;
  const repeatAvg = repeatRTs.length > 0 ? Math.round(repeatRTs.reduce((a, b) => a + b, 0) / repeatRTs.length) : 0;

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "%", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My cognitive flexibility: ${finalScore}%! Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Cognitive Flexibility Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 20, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>%</span>
        </div>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: "#EF4444" }}>{switchAvg}ms</div><div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>SWITCH RT</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: "#10B981" }}>{repeatAvg}ms</div><div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>REPEAT RT</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: game.accent }}>{Math.max(0, switchAvg - repeatAvg)}ms</div><div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>SWITCH COST</div></div>
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
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔄</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Task Switch Speed</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 360, margin: "0 auto 16px" }}>
        The rule alternates every trial. One round: classify by <strong style={{ color: "#EF4444" }}>COLOR</strong>. Next round: classify by <strong style={{ color: "#06B6D4" }}>SIZE</strong>. Switch as fast as you can.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 300, margin: "0 auto 24px" }}>
        <div style={{ background: "#EF444420", border: "1px solid #EF4444", borderRadius: 8, padding: "10px", fontSize: 12, fontFamily: "var(--font-mono)", color: "#EF4444" }}>COLOR RULE<br />RED → A<br />BLUE → B</div>
        <div style={{ background: "#06B6D420", border: "1px solid #06B6D4", borderRadius: 8, padding: "10px", fontSize: 12, fontFamily: "var(--font-mono)", color: "#06B6D4" }}>SIZE RULE<br />BIG → A<br />SMALL → B</div>
      </div>
      <button onClick={handleStart} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  const shapeSize = stimulus.size === "big" ? 80 : 44;
  const shapeColor = stimulus.color === "red" ? "#EF4444" : "#3B82F6";
  const ruleColor = stimulus.rule === "color" ? "#EF4444" : "#06B6D4";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span>TRIAL {trialIdx + 1} / {TOTAL_TRIALS}</span>
        <span style={{ color: correct / Math.max(1, trialIdx) > 0.7 ? "#10B981" : "#EF4444" }}>{correct} CORRECT</span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 20 }}>
        <div style={{ height: "100%", width: `${(timeLeft / TIME_LIMIT) * 100}%`, background: timeLeft < 600 ? "#EF4444" : game.accent, borderRadius: 2, transition: "width 0.1s linear" }} />
      </div>

      {/* Rule indicator */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${ruleColor}15`, border: `1px solid ${ruleColor}40`, borderRadius: 999, padding: "5px 16px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: ruleColor }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: ruleColor, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
            CLASSIFY BY {stimulus.rule.toUpperCase()}
            {stimulus.isSwitch && " ← SWITCHED!"}
          </span>
        </div>
      </div>

      {/* Stimulus */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 140, background: feedback ? (feedback === "correct" ? "#10B98112" : "#EF444412") : "var(--bg-card)", border: `1.5px solid ${feedback ? (feedback === "correct" ? "#10B981" : "#EF4444") : "var(--border)"}`, borderRadius: "var(--radius-xl)", marginBottom: 20, transition: "background 0.15s, border-color 0.15s" }}>
        {stimulus.shape === "circle"
          ? <div style={{ width: shapeSize, height: shapeSize, borderRadius: "50%", background: shapeColor, transition: "all 0.2s" }} />
          : <div style={{ width: shapeSize, height: shapeSize, borderRadius: 8, background: shapeColor, transition: "all 0.2s" }} />
        }
      </div>

      {/* Answer buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button onClick={() => handleAnswer("A")} disabled={!!feedback} className="pressable"
          style={{ padding: "18px 0", background: "var(--bg-card)", border: "1.5px solid var(--border-md)", borderRadius: "var(--radius-lg)", fontSize: 15, fontWeight: 800, cursor: "pointer", color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
          A · {stimulus.optionA}
        </button>
        <button onClick={() => handleAnswer("B")} disabled={!!feedback} className="pressable"
          style={{ padding: "18px 0", background: "var(--bg-card)", border: "1.5px solid var(--border-md)", borderRadius: "var(--radius-lg)", fontSize: 15, fontWeight: 800, cursor: "pointer", color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
          B · {stimulus.optionB}
        </button>
      </div>
    </>
  );
}
