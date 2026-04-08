"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;
const ROUNDS = 5;

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

function randomRefAngle() {
  // Avoid 0/90/180 (too obvious), pick interesting angles
  const options = [15, 30, 45, 60, 75, 105, 120, 135, 150, 165];
  return options[Math.floor(Math.random() * options.length)];
}

type Phase = "idle" | "playing" | "done";

export default function AnglePrecision({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [round, setRound]         = useState(1);
  const [refAngle, setRefAngle]   = useState(45);
  const [userAngle, setUserAngle] = useState(0);
  const [errors, setErrors]       = useState<number[]>([]);
  const [showAd, setShowAd]       = useState(false);
  const [shareImg, setShareImg]   = useState<string | null>(null);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const isDragging = useRef(false);
  const centerRef = useRef({ x: 0, y: 0 });
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const startRound = useCallback((r: number) => {
    setRefAngle(randomRefAngle());
    setUserAngle(Math.floor(Math.random() * 360));
    setRound(r);
  }, []);

  const startGame = () => { setErrors([]); startRound(1); setPhase("playing"); };

  const getAngleFromCenter = (clientX: number, clientY: number) => {
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return Math.round(angle) % 360;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (phase !== "playing") return;
    isDragging.current = true;
    const rect = lineRef.current!.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setUserAngle(getAngleFromCenter(e.clientX, e.clientY));
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setUserAngle(getAngleFromCenter(e.clientX, e.clientY));
  };
  const handlePointerUp = () => { isDragging.current = false; };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAngle(parseInt(e.target.value));
  };

  const handleSubmit = () => {
    // Calculate angular difference (minimum of clockwise / counterclockwise)
    let diff = Math.abs(refAngle - userAngle) % 360;
    if (diff > 180) diff = 360 - diff;
    const error = Math.round(diff * 10) / 10;
    playBeep(error < 5 ? "success" : "tap");

    const newErrors = [...errors, error];
    setErrors(newErrors);

    if (newErrors.length >= ROUNDS) {
      const avg = Math.round((newErrors.reduce((s, e) => s + e, 0) / newErrors.length) * 10) / 10;
      setFinalScore(avg);
      const isNew = saveHighScore(game.id, avg);
      setIsNewBest(isNew);
      if (isNew) setHS(avg);
      setPhase("done");
    } else {
      startRound(round + 1);
    }
  };

  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = finalScore > 0 ? getRank(finalScore, game) : getRank(999, game);
  const pct  = finalScore > 0 ? getPercentile(finalScore, game) : 0;

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "° AVG ERROR", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "NeuroBench", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "report.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  const lineStyle = (angle: number, color: string): React.CSSProperties => ({
    position: "absolute",
    width: "70%",
    height: 3,
    background: color,
    borderRadius: 2,
    top: "50%",
    left: "15%",
    transformOrigin: "center",
    transform: `translateY(-50%) rotate(${angle}deg)`,
    transition: "none",
  });

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
            {finalScore}°<span style={{ fontSize: "clamp(14px,3vw,20px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>avg error</span>
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 16 }}>&quot;{rank.subtitle}&quot;</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            {errors.map((e, i) => (
              <div key={i} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>R{i+1}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: e < 5 ? game.accent : e < 15 ? "#F59E0B" : "#ef4444", fontFamily: "var(--font-mono)" }}>{e}°</div>
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
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>📐</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Visuospatial Orientation Accuracy</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Rotate the line to match the reference</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>5 rounds · average error in degrees · lower is better</p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>ROUND {round}/{ROUNDS}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: ROUNDS }).map((_, i) => (
                <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i < errors.length ? game.accent : "var(--bg-elevated)" }} />
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
              {errors.length > 0 ? `AVG: ${(errors.reduce((s,e)=>s+e,0)/errors.length).toFixed(1)}°` : ""}
            </div>
          </div>

          {/* Reference line */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Reference</div>
            <div style={{ position: "relative", height: 80 }}>
              <div style={lineStyle(refAngle, "rgba(255,255,255,0.7)")} />
            </div>
          </div>

          {/* User line */}
          <div
            ref={lineRef}
            style={{ background: "var(--bg-card)", border: `1.5px solid ${game.accent}40`, borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 16, cursor: "grabbing", touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div style={{ fontSize: 10, color: game.accent, fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Your Line — Drag to Rotate</div>
            <div style={{ position: "relative", height: 80 }}>
              <div style={lineStyle(userAngle, game.accent)} />
            </div>
          </div>

          {/* Slider */}
          <input
            type="range" min={0} max={359} value={userAngle}
            onChange={handleSlider}
            style={{ width: "100%", marginBottom: 16, accentColor: game.accent }}
          />

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
              Your angle: {userAngle}° · Reference: {refAngle}°
            </div>
            <button
              onClick={handleSubmit}
              className="pressable"
              style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 40px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}
            >
              SUBMIT
            </button>
          </div>
        </div>
      )}
    </>
  );
}
