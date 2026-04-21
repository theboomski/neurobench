"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const ROUNDS = 5;
const TIME_LIMIT = 5000; // 5 seconds per round

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
  const options = [20, 35, 50, 65, 80, 100, 115, 130, 145, 160];
  return options[Math.floor(Math.random() * options.length)];
}

type Phase = "idle" | "playing" | "done";

export default function AnglePrecision({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [round, setRound]         = useState(1);
  const [refAngle, setRefAngle]   = useState(45);
  const [userAngle, setUserAngle] = useState(0);
  const [errors, setErrors]       = useState<number[]>([]);
  const [timeLeft, setTimeLeft]   = useState(TIME_LIMIT);
  const [showAd, setShowAd]       = useState(false);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const isDragging  = useRef(false);
  const centerRef   = useRef({ x: 0, y: 0 });
  const lineRef     = useRef<HTMLDivElement>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorsRef   = useRef<number[]>([]);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRef.current) clearTimeout(autoRef.current);
  };

  const finalize = useCallback((finalErrors: number[]) => {
    clearTimers();
    const avg = Math.round((finalErrors.reduce((s, e) => s + e, 0) / finalErrors.length) * 10) / 10;
    setFinalScore(avg);
    const isNew = saveHighScore(game.id, avg);
    setIsNewBest(isNew);
    if (isNew) setHS(avg);
    setPhase("done");
  }, [game.id]);

  const startRound = useCallback((r: number, currentErrors: number[]) => {
    const ref = randomRefAngle();
    setRefAngle(ref);
    setUserAngle(Math.floor(Math.random() * 360));
    setRound(r);
    setTimeLeft(TIME_LIMIT);

    const startMs = performance.now();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, TIME_LIMIT - (performance.now() - startMs));
      setTimeLeft(remaining);
    }, 50);

    // Auto-submit when time runs out
    autoRef.current = setTimeout(() => {
      clearTimers();
      // Use current userAngle via ref - auto submit with whatever angle user has
      const submitAngle = errorsRef.current.length > 0 ? 180 : 0; // worst case if no input
      let diff = Math.abs(ref - submitAngle) % 360;
      if (diff > 180) diff = 360 - diff;
      const error = 90; // penalty for timeout
      playBeep("fail");
      const newErrors = [...currentErrors, error];
      errorsRef.current = newErrors;
      setErrors(newErrors);
      if (newErrors.length >= ROUNDS) {
        finalize(newErrors);
      } else {
        startRound(r + 1, newErrors);
      }
    }, TIME_LIMIT);
  }, [finalize]);

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

  const handleSubmit = useCallback(() => {
    if (phase !== "playing") return;
    clearTimers();
    // Line symmetry diff: 0°==180° (a line has no direction)
    // Step 1: circular diff 0-180
    let diff = ((refAngle - userAngle) % 360 + 360) % 360;
    if (diff > 180) diff = 360 - diff;
    // Step 2: fold at 90° — 178° away = 2° away on a line
    if (diff > 90) diff = 180 - diff;
    const error = Math.round(diff * 10) / 10;
    playBeep(error < 5 ? "success" : "tap");

    const newErrors = [...errors, error];
    errorsRef.current = newErrors;
    setErrors(newErrors);

    if (newErrors.length >= ROUNDS) {
      finalize(newErrors);
    } else {
      startRound(round + 1, newErrors);
    }
  }, [phase, refAngle, userAngle, errors, round, finalize, startRound]);

  const startGame = () => {
    trackPlay(game.id);
    errorsRef.current = [];
    setErrors([]);
    setPhase("playing");
    startRound(1, []);
  };

  useEffect(() => () => clearTimers(), []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = finalScore > 0 ? getRank(finalScore, game) : getRank(999, game);
  const pct  = finalScore > 0 ? getPercentile(finalScore, game) : 0;


  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timerPct > 60 ? game.accent : timerPct > 30 ? "#F59E0B" : "#EF4444";

  const lineStyle = (angle: number, color: string): React.CSSProperties => ({
    position: "absolute", width: "70%", height: 3, background: color,
    borderRadius: 2, top: "50%", left: "15%",
    transformOrigin: "center",
    transform: `translateY(-50%) rotate(${angle}deg)`,
  });

  if (phase === "done") {
    const normalized = normalizeTo100FromPercentile(pct, Math.max(1, 100 - finalScore));
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="deg error"
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

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>📐</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Visuospatial Orientation Accuracy</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Rotate the line to match · 5 seconds per round</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>5 rounds · average error in degrees · lower is better</p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          {/* Timer bar */}
          <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, borderRadius: 2, transition: "width 0.05s linear, background 0.3s" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>ROUND {round}/{ROUNDS}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: timerColor }}>{(timeLeft / 1000).toFixed(1)}s</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
              {errors.length > 0 ? `AVG: ${(errors.reduce((s,e)=>s+e,0)/errors.length).toFixed(1)}°` : ""}
            </div>
          </div>

          {/* Reference line */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Reference — Match This</div>
            <div style={{ position: "relative", height: 72 }}>
              <div style={lineStyle(refAngle, "rgba(255,255,255,0.75)")} />
            </div>
          </div>

          {/* User line — NO angle numbers shown */}
          <div
            ref={lineRef}
            style={{ background: "var(--bg-card)", border: `1.5px solid ${game.accent}40`, borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 14, cursor: "grabbing", touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div style={{ fontSize: 10, color: game.accent, fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Your Line — Drag to Rotate</div>
            <div style={{ position: "relative", height: 72 }}>
              <div style={lineStyle(userAngle, game.accent)} />
            </div>
          </div>

          {/* Slider only, no numeric display */}
          <input type="range" min={0} max={359} value={userAngle} onChange={e => setUserAngle(parseInt(e.target.value))} style={{ width: "100%", marginBottom: 14, accentColor: game.accent }} />

          <div style={{ textAlign: "center" }}>
            <button onClick={handleSubmit} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 40px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
              SUBMIT
            </button>
          </div>
        </div>
      )}
    </>
  );
}
