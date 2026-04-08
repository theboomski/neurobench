"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;
const DURATION = 30;

function getRank(score: number, game: GameData) {
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(score: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (score >= pts[0].ms) return pts[0].percentile;
  if (score <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (score >= pts[i + 1].ms && score <= pts[i].ms) {
      const t2 = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

interface Target { x: number; y: number; size: number; }

function getTargetSize(hits: number) {
  return Math.max(32, 72 - hits * 1.5);
}

function newTarget(prevX: number, prevY: number, size: number): Target {
  let x: number, y: number;
  do {
    x = size / 2 + Math.random() * (100 - size);
    y = size / 2 + Math.random() * (100 - size);
  } while (Math.abs(x - prevX) < 15 && Math.abs(y - prevY) < 15);
  return { x, y, size };
}

type Phase = "idle" | "playing" | "done";

export default function AimTrainer({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [hits, setHits]         = useState(0);
  const [misses, setMisses]     = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [target, setTarget]     = useState<Target>({ x: 50, y: 50, size: 72 });
  const [showAd, setShowAd]     = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalHits, setFinalHits] = useState(0);
  const [finalMisses, setFinalMisses] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hitsRef     = useRef(0);
  const missesRef   = useRef(0);
  const phaseRef    = useRef<Phase>("idle");

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const endGame = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const h = hitsRef.current;
    const m = missesRef.current;
    setFinalHits(h);
    setFinalMisses(m);
    const isNew = saveHighScore(game.id, h);
    setIsNewBest(isNew);
    if (isNew) setHS(h);
    phaseRef.current = "done";
    setPhase("done");
  }, [game.id]);

  const handleStart = () => {
    hitsRef.current = 0;
    missesRef.current = 0;
    phaseRef.current = "playing";
    setHits(0);
    setMisses(0);
    setTimeLeft(DURATION);
    setTarget(newTarget(50, 50, 72));
    setPhase("playing");

    let tl = DURATION;
    intervalRef.current = setInterval(() => {
      tl--;
      setTimeLeft(tl);
      if (tl <= 0) endGame();
    }, 1000);
  };

  const handleTargetHit = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (phaseRef.current !== "playing") return;
    playBeep("tap");
    hitsRef.current++;
    setHits(hitsRef.current);
    const newSize = getTargetSize(hitsRef.current);
    setTarget(t => newTarget(t.x, t.y, newSize));
  }, []);

  const handleMiss = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    missesRef.current++;
    setMisses(missesRef.current);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalHits, game);
  const pct  = getPercentile(finalHits, game);
  const accuracy = finalHits + finalMisses > 0 ? Math.round((finalHits / (finalHits + finalMisses)) * 100) : 0;

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalHits, unit: "HITS", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My Brain Age is on ZAZAZA! ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
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
            {finalHits}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>hits</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
            Accuracy: <span style={{ color: accuracy >= 80 ? game.accent : accuracy >= 60 ? "#F59E0B" : "#ef4444" }}>{accuracy}%</span> · Misses: {finalMisses}
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>◆ New Personal Record</div>}
          {highScore !== null && !isNewBest && <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Personal best: <span style={{ color: game.accent }}>{highScore} hits</span></div>}
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

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>HITS: <span style={{ color: game.accent, fontWeight: 700 }}>{hits}</span></div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 900, color: timeLeft <= 5 ? "#ef4444" : "var(--text-1)" }}>{timeLeft}s</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>MISS: <span style={{ color: "#ef4444" }}>{misses}</span></div>
        </div>
      )}

      <div
        onClick={handleMiss}
        style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", position: "relative", overflow: "hidden", aspectRatio: "16/9", maxHeight: 340, cursor: phase === "playing" ? "crosshair" : "default", WebkitTapHighlightColor: "transparent" }}
      >
        {phase === "idle" && (
          <div className="anim-fade-up" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: "clamp(36px,8vw,52px)", marginBottom: 16 }}>🎯</div>
            <p style={{ fontSize: "clamp(15px,3vw,18px)", fontWeight: 800, marginBottom: 8 }}>Visuomotor Precision Assessment</p>
            <p style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 24 }}>30 seconds · Click every target · Targets shrink as you improve</p>
            <button onClick={(e) => { e.stopPropagation(); handleStart(); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "12px 32px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN</button>
          </div>
        )}

        {phase === "playing" && (
          <div
            onClick={handleTargetHit}
            className="pressable"
            style={{
              position: "absolute",
              left: `${target.x}%`,
              top: `${target.y}%`,
              width: target.size,
              height: target.size,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: `${game.accent}20`,
              border: `3px solid ${game.accent}`,
              boxShadow: `0 0 20px ${game.accent}60`,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          />
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
        {phase === "idle" && "30 SECONDS · TARGETS SHRINK WITH EACH HIT"}
        {phase === "playing" && "CLICK THE TARGET · DON'T MISS"}
      </div>
    </>
  );
}
