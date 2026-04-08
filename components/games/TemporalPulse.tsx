"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;
const INTERVAL_MS = 1000;
const ROUNDS = 5;
const FLASH_BEATS = 3;

// Lower error = better
function getRank(error: number, game: GameData) {
  return game.stats.ranks.find(r => error <= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(error: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (error <= pts[0].ms) return pts[0].percentile;
  if (error >= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (error >= pts[i].ms && error <= pts[i + 1].ms) {
      const t2 = (error - pts[i].ms) / (pts[i + 1].ms - pts[i].ms);
      return Math.round(pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

type Phase = "idle" | "flashing" | "waiting" | "result" | "done";

export default function TemporalPulse({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [beat, setBeat]           = useState(0);          // 1-3 flashed, 0 = dark
  const [round, setRound]         = useState(1);
  const [errors, setErrors]       = useState<number[]>([]);
  const [lastError, setLastError] = useState<number | null>(null);
  const [flash, setFlash]         = useState(false);
  const [showAd, setShowAd]       = useState(false);
  const [shareImg, setShareImg]   = useState<string | null>(null);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const expectedTapRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);
  const clearT = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  useEffect(() => () => clearT(), []);

  const startRound = useCallback(() => {
    setFlash(false);
    setBeat(0);
    setPhase("flashing");
    let b = 0;
    const tick = () => {
      b++;
      setBeat(b);
      setFlash(true);
      playBeep("tap");
      timerRef.current = setTimeout(() => {
        setFlash(false);
        if (b < FLASH_BEATS) {
          timerRef.current = setTimeout(tick, INTERVAL_MS - 80);
        } else {
          // After last flash, wait for 4th beat
          expectedTapRef.current = performance.now() + INTERVAL_MS;
          timerRef.current = setTimeout(() => setPhase("waiting"), 80);
        }
      }, 80);
    };
    timerRef.current = setTimeout(tick, 500);
  }, []);

  const startGame = () => {
    setErrors([]);
    setRound(1);
    setLastError(null);
    startRound();
  };

  const handleTap = useCallback(() => {
    if (phase !== "waiting") return;
    const now = performance.now();
    const error = Math.abs(Math.round(now - expectedTapRef.current));
    setLastError(error);
    playBeep(error < 30 ? "success" : "go");

    const newErrors = [...errors, error];
    setErrors(newErrors);
    setPhase("result");

    if (newErrors.length >= ROUNDS) {
      const avg = Math.round(newErrors.reduce((s, e) => s + e, 0) / newErrors.length);
      setFinalScore(avg);
      const isNew = saveHighScore(game.id, avg);
      setIsNewBest(isNew);
      if (isNew) setHS(avg);
      timerRef.current = setTimeout(() => setPhase("done"), 1500);
    } else {
      timerRef.current = setTimeout(() => {
        setRound(r => r + 1);
        startRound();
      }, 1200);
    }
  }, [phase, errors, game.id, startRound]);

  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = finalScore > 0 ? getRank(finalScore, game) : getRank(999, game);
  const pct  = finalScore > 0 ? getPercentile(finalScore, game) : 0;

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "ms AVG DELTA", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
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
          <div style={{ fontSize: "clamp(44px,11vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
            {finalScore}<span style={{ fontSize: "clamp(14px,3vw,20px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>ms avg</span>
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 16 }}>&quot;{rank.subtitle}&quot;</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            {errors.map((e, i) => (
              <div key={i} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>R{i+1}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: e < 30 ? game.accent : e < 80 ? "#F59E0B" : "#ef4444", fontFamily: "var(--font-mono)" }}>{e}ms</div>
              </div>
            ))}
          </div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>◆ New Personal Record</div>}
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
      {phase === "idle" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>⏱️</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Internal Timing Precision</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>3 flashes at 1000ms · Tap the hidden 4th beat</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>{ROUNDS} rounds · lower ms error = higher rank</p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>ROUND {round}/{ROUNDS}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: ROUNDS }).map((_, i) => (
                <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i < errors.length ? game.accent : "var(--bg-elevated)" }} />
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
              {errors.length > 0 ? `AVG: ${Math.round(errors.reduce((s,e)=>s+e,0)/errors.length)}ms` : "1000ms beat"}
            </div>
          </div>

          {/* Main tap area */}
          <div
            onClick={handleTap}
            style={{
              background: flash ? `${game.accent}20` : "var(--bg-card)",
              border: `2px solid ${flash ? game.accent : phase === "waiting" ? `${game.accent}60` : "var(--border)"}`,
              borderRadius: "var(--radius-xl)",
              minHeight: "clamp(260px,45vw,340px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              cursor: phase === "waiting" ? "pointer" : "default",
              transition: "background 0.05s, border-color 0.05s",
              boxShadow: flash ? `0 0 60px ${game.accent}30` : "none",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {/* Beat dots */}
            <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
              {[1,2,3].map(b => (
                <div key={b} style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: beat >= b ? game.accent : "var(--bg-elevated)",
                  border: `2px solid ${beat >= b ? game.accent : "var(--border)"}`,
                  boxShadow: beat === b && flash ? `0 0 20px ${game.accent}` : "none",
                  transition: "all 0.05s",
                }} />
              ))}
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "transparent", border: `2px dashed ${phase === "waiting" ? game.accent : "var(--text-3)"}`, opacity: 0.6 }} />
            </div>

            {/* Pulse indicator */}
            <div style={{
              width: "clamp(80px,20vw,120px)", height: "clamp(80px,20vw,120px)",
              borderRadius: "50%",
              background: flash ? game.accent : phase === "waiting" ? `${game.accent}15` : "var(--bg-elevated)",
              border: `3px solid ${flash ? game.accent : phase === "waiting" ? `${game.accent}50` : "var(--border)"}`,
              boxShadow: flash ? `0 0 60px ${game.accent}` : "none",
              transition: "all 0.05s",
              marginBottom: 20,
            }} />

            <p style={{ fontSize: "clamp(13px,3vw,16px)", fontWeight: 600, color: phase === "waiting" ? game.accent : "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              {phase === "flashing" && beat > 0 ? `BEAT ${beat}` : ""}
              {phase === "waiting" ? "TAP NOW" : ""}
              {phase === "result" ? (lastError !== null ? `${lastError}ms off` : "") : ""}
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
            {phase === "flashing" && "INTERNALIZE THE RHYTHM"}
            {phase === "waiting" && "TAP THE 4TH BEAT — NOW!"}
            {phase === "result" && lastError !== null && (lastError < 30 ? "🎯 EXCELLENT TIMING" : lastError < 80 ? "GOOD — NEXT ROUND" : "KEEP PRACTICING")}
          </div>
        </div>
      )}
    </>
  );
}
