"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;

function getRank(score: number, game: GameData) {
  const ranks = [...game.stats.ranks].reverse();
  return ranks.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
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

function getGridCount(level: number) {
  return Math.min(80 + level * 30, 400);
}

type Phase = "idle" | "playing" | "wrong" | "done";

export default function RapidScan({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [level, setLevel]       = useState(1);
  const [grid, setGrid]         = useState<string[]>([]);
  const [targetIdx, setTargetIdx] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [score, setScore]       = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [times, setTimes]       = useState<number[]>([]);
  const [showAd, setShowAd]     = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const makeGrid = useCallback((lvl: number) => {
    const count = getGridCount(lvl);
    const arr = Array(count).fill("O");
    const qi = Math.floor(Math.random() * count);
    arr[qi] = "Q";
    setGrid(arr);
    setTargetIdx(qi);
    setWrongIdx(null);
    setStartTime(performance.now());
  }, []);

  const startGame = () => {
    setLevel(1); setScore(0); setTimes([]);
    makeGrid(1);
    setPhase("playing");
  };

  const handleClick = useCallback((idx: number) => {
    if (phase !== "playing") return;
    if (idx === targetIdx) {
      const elapsed = Math.round(performance.now() - startTime);
      playBeep("success");
      const newScore = score + 1;
      const newTimes = [...times, elapsed];
      setScore(newScore);
      setTimes(newTimes);
      const nextLevel = level + 1;
      setLevel(nextLevel);
      makeGrid(nextLevel);
    } else {
      playBeep("fail");
      setWrongIdx(idx);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      setFinalScore(score);
      timerRef.current = setTimeout(() => setPhase("done"), 1200);
    }
  }, [phase, targetIdx, startTime, score, times, level, game.id, makeGrid]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct  = getPercentile(finalScore, game);
  const avgTime = times.length > 0 ? Math.round(times.reduce((s,v) => s+v, 0) / times.length) : 0;

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "ROUNDS", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "NeuroBench", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "report.png", { type: "image/png" })] }); return; } catch { } }
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
            {finalScore}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>rounds</span>
          </div>
          {avgTime > 0 && <div style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>Avg scan time: <span style={{ color: game.accent }}>{avgTime}ms</span></div>}
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>◆ New Personal Record</div>}
          {highScore !== null && !isNewBest && <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Personal best: <span style={{ color: game.accent }}>{highScore} rounds</span></div>}
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

  const cols = Math.ceil(Math.sqrt(grid.length * 1.6));
  const fontSize = Math.max(10, Math.min(18, 300 / cols));

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>🔍</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Visual Search Efficiency</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Find the Q among the O&apos;s — click it</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Grid gets denser each round · wrong click ends it</p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>LEVEL <span style={{ color: game.accent, fontWeight: 700 }}>{level}</span></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>SCORE: <span style={{ color: game.accent, fontWeight: 700 }}>{score}</span></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)" }}>{grid.length} chars</div>
          </div>

          <div style={{
            background: "var(--bg-card)",
            border: `1.5px solid ${wrongIdx !== null ? "#ef444460" : "var(--border)"}`,
            borderRadius: "var(--radius-xl)",
            padding: "16px",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 2,
            userSelect: "none",
            transition: "border-color 0.15s",
            maxHeight: "60vh",
            overflow: "hidden",
          }}>
            {grid.map((char, idx) => (
              <span
                key={idx}
                onClick={() => handleClick(idx)}
                style={{
                  fontSize,
                  fontFamily: "monospace",
                  fontWeight: char === "Q" ? 900 : 400,
                  color: idx === wrongIdx ? "#ef4444" : char === "Q" && wrongIdx !== null ? game.accent : "var(--text-2)",
                  cursor: "pointer",
                  textAlign: "center",
                  lineHeight: 1.4,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {char}
              </span>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>FIND AND CLICK THE Q</div>
        </div>
      )}
    </>
  );
}
