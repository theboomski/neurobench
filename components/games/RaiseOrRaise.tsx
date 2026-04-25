"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const ROUNDS = 5;
const BASE_SALARY = 80000;
const TICK_MS = 50;

function getRank(score: number, game: GameData) {
  // Higher score = better: S has highest threshold
  // Find the highest rank where score >= maxMs
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
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

function formatSalary(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

// Generate a smooth random curve: rises to peak then falls
function makeCurve(round: number) {
  // Much faster + harder each round
  const speedFactor = 1 + (round - 1) * 0.35; // rounds 1-5: 1x to 2.4x speed
  const duration = (3500 - round * 300 + Math.random() * 1000) / speedFactor;
  // Peak comes and goes very quickly — hard to catch
  const peakAt = Math.max(0.2, 0.45 - round * 0.05 + Math.random() * 0.15);
  const maxGain = (50000 + round * 20000 + Math.random() * 80000);
  return { duration, peakAt, maxGain };
}

type Phase = "idle" | "playing" | "accepted" | "done";

export default function RaiseOrRaise({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [round, setRound]       = useState(1);
  const [salary, setSalary]     = useState(BASE_SALARY);
  const [peak, setPeak]         = useState(BASE_SALARY);
  const [accepted, setAccepted] = useState<number[]>([]);
  const [lastAccepted, setLastAccepted] = useState<number|null>(null);
  const [showAd, setShowAd]     = useState(false);
  const [highScore, setHS]      = useState<number|null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const curveRef    = useRef(makeCurve(1));
  const startRef    = useRef<number>(0);
  const acceptedRef = useRef<number[]>([]);
  const peaksRef    = useRef<number[]>([]);
  const peakRef     = useRef(BASE_SALARY);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearT = () => { if (timerRef.current) clearInterval(timerRef.current); };
  useEffect(() => () => clearT(), []);

  const finalize = useCallback((all: number[], peaks: number[]) => {
    // Score = average % of peak caught across all rounds (0-100)
    const pcts = all.map((v, i) => Math.min(100, Math.round((v / peaks[i]) * 100)));
    const avgPct = Math.round(pcts.reduce((s,v) => s+v, 0) / pcts.length);
    setFinalScore(avgPct);
    const isNew = saveHighScore(game.id, avgPct);
    setIsNewBest(isNew); if (isNew) setHS(avgPct);
    setPhase("done");
  }, [game.id]);

  const startRound = useCallback((r: number, cur: number[]) => {
    const curve = makeCurve(r);
    curveRef.current = curve;
    startRef.current = performance.now();
    if (r === 1) peaksRef.current = [];
    peakRef.current = BASE_SALARY;
    setSalary(BASE_SALARY); setPeak(BASE_SALARY);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      const progress = elapsed / curve.duration;

      // Smooth bell curve: rise to peak then fall
      const bell = progress < curve.peakAt
        ? (progress / curve.peakAt)
        : (1 - (progress - curve.peakAt) / (1 - curve.peakAt));
      const clampedBell = Math.max(0, bell);
      const current = BASE_SALARY + curve.maxGain * clampedBell * clampedBell;

      setSalary(current);
      if (current > peakRef.current) {
        peakRef.current = current;
        setPeak(current);
      }

      // Auto-end round when salary drops back near base
      if (progress >= 1.0) {
        clearT();
        const locked = Math.round(current);
        const roundPeak = Math.round(peakRef.current);
        playBeep("fail");
        setLastAccepted(locked);
        const next = [...cur, locked];
        const nextPeaks = [...peaksRef.current, roundPeak];
        acceptedRef.current = next; setAccepted(next);
        peaksRef.current = nextPeaks;
        setPhase("accepted");
        if (next.length >= ROUNDS) {
          setTimeout(() => finalize(next, peaksRef.current), 1200);
        } else {
          setTimeout(() => { setRound(r+1); startRound(r+1, next); }, 1400);
        }
      }
    }, TICK_MS);
  }, [finalize]);

  const handleAccept = useCallback(() => {
    if (phase !== "playing") return;
    clearT();
    const locked = Math.round(salary);
    playBeep(locked > BASE_SALARY + 50000 ? "success" : "go");
    setLastAccepted(locked);
    const next = [...acceptedRef.current, locked];
    acceptedRef.current = next; setAccepted(next);
    setPhase("accepted");
    if (next.length >= ROUNDS) {
      setTimeout(() => finalize(next, peaksRef.current), 1200);
    } else {
      setTimeout(() => { setRound(r => r+1); startRound(next.length+1, next); }, 1400);
    }
  }, [phase, salary, finalize, startRound]);

  const startGame = () => {
    trackPlay(game.id);
    acceptedRef.current = []; setAccepted([]); setRound(1); setLastAccepted(null);
    startRound(1, []);
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const pct  = phase === "done" ? getPercentile(finalScore, game) : 0;
  const avgSalary = accepted.length > 0 ? Math.round(accepted.reduce((s,v)=>s+v,0)/accepted.length) : 0;

  // Progress bar: how far along the salary climb we are
  const progress = phase === "playing" ? Math.min(1, (performance.now() - startRef.current) / curveRef.current.duration) : 0;
  const salaryPct = Math.max(0, Math.min(100, ((salary - BASE_SALARY) / curveRef.current.maxGain) * 100));

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="% peak capture"
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
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", padding:"clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign:"center" }}>
          <div style={{ fontSize:"clamp(40px,10vw,56px)", marginBottom:20 }}>💰</div>
          <p style={{ fontSize:"clamp(16px,3.5vw,19px)", fontWeight:800, marginBottom:8 }}>Negotiation Timing Assessment</p>
          <p style={{ fontSize:13, color:"var(--text-2)", fontFamily:"var(--font-mono)", marginBottom:4 }}>Salary is rising — hit ACCEPT at the peak</p>
          <p style={{ fontSize:12, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:28 }}>5 rounds · US salaries · avg salary is your score</p>
          <button onClick={startGame} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"14px 36px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)" }}>▶ PLAY</button>
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)" }}>ROUND {round}/{ROUNDS}</div>
            <div style={{ display:"flex", gap:4 }}>
              {Array.from({length:ROUNDS}).map((_,i) => (
                <div key={i} style={{ width:20, height:3, borderRadius:2, background: i<accepted.length ? game.accent : "var(--bg-elevated)" }} />
              ))}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)" }}>
              {avgSalary > 0 ? formatSalary(avgSalary) : ""}
            </div>
          </div>

          {/* Salary display */}
          <div style={{ background:"var(--bg-card)", border:`2px solid ${phase==="accepted" ? `${game.accent}60` : "var(--border)"}`, borderRadius:"var(--radius-xl)", padding:"clamp(24px,5vw,40px) 20px", textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:11, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.1em" }}>Annual Offer</div>
            <div style={{ fontSize:"clamp(32px,8vw,56px)", fontWeight:900, letterSpacing:"-0.03em", color: salary > BASE_SALARY + 60000 ? game.accent : salary > BASE_SALARY + 20000 ? "#F59E0B" : "var(--text-1)", marginBottom:16, fontFamily:"var(--font-mono)", transition:"color 0.2s" }}>
              {formatSalary(salary)}
            </div>

            {/* Salary bar */}
            <div style={{ height:8, background:"var(--bg-elevated)", borderRadius:4, overflow:"hidden", marginBottom:8 }}>
              <div style={{ height:"100%", width:`${salaryPct}%`, background:game.accent, borderRadius:4, transition:`width ${TICK_MS}ms linear`, boxShadow:`0 0 12px ${game.accent}60` }} />
            </div>

            {phase === "accepted" && lastAccepted !== null && (
              <div style={{ fontSize:13, color:game.accent, fontFamily:"var(--font-mono)", marginTop:8 }}>
                Locked in: {formatSalary(lastAccepted)}
              </div>
            )}
          </div>

          {/* Accept button */}
          {phase === "playing" && (
            <button onClick={handleAccept} className="pressable" style={{ width:"100%", background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"18px 0", fontSize:18, fontWeight:900, cursor:"pointer", fontFamily:"var(--font-mono)", letterSpacing:"0.04em", WebkitTapHighlightColor:"transparent" }}>
              ✓ ACCEPT
            </button>
          )}
          {phase === "accepted" && (
            <div style={{ textAlign:"center", padding:"18px 0", fontSize:13, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
              {round < ROUNDS ? "Next round starting..." : "Calculating results..."}
            </div>
          )}
        </div>
      )}
    </>
  );
}
