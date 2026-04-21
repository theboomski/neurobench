"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const ROUNDS = 10;
const FLASH_MS = 500;
const MIN_DOTS = 5;
const MAX_DOTS = 20;

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

function makeDots(count: number): { x: number; y: number }[] {
  const dots: { x: number; y: number }[] = [];
  const attempts = count * 20;
  for (let i = 0; i < attempts && dots.length < count; i++) {
    const x = 8 + Math.random() * 84;
    const y = 8 + Math.random() * 84;
    // Avoid overlap
    const tooClose = dots.some(d => Math.hypot(d.x - x, d.y - y) < 10);
    if (!tooClose) dots.push({ x, y });
  }
  return dots;
}

type Phase = "idle"|"flashing"|"input"|"feedback"|"done";

export default function CountMaster({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [round, setRound]       = useState(1);
  const [dots, setDots]         = useState<{x:number;y:number}[]>([]);
  const [actual, setActual]     = useState(0);
  const [guess, setGuess]       = useState("");
  const [results, setResults]   = useState<{actual:number;guess:number;error:number}[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean|null>(null);
  const [showAd, setShowAd]     = useState(false);
  const [highScore, setHS]      = useState<number|null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalAcc, setFinalAcc] = useState(0);
  const [finalErr, setFinalErr] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const resultsRef = useRef<{actual:number;guess:number;error:number}[]>([]);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);
  const clearT = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  useEffect(() => () => clearT(), []);

  const finalize = useCallback((all: {actual:number;guess:number;error:number}[]) => {
    const acc = Math.round(all.reduce((s,r) => s + (r.error===0?100:Math.max(0,100-r.error/r.actual*100)), 0) / all.length);
    const avgErr = Math.round(all.reduce((s,r) => s+r.error, 0) / all.length * 10) / 10;
    setFinalAcc(acc); setFinalErr(avgErr);
    const isNew = saveHighScore(game.id, acc);
    setIsNewBest(isNew); if (isNew) setHS(acc);
    setPhase("done");
  }, [game.id]);

  const startRound = useCallback((r: number) => {
    const count = MIN_DOTS + Math.floor(Math.random() * (MAX_DOTS - MIN_DOTS + 1));
    const newDots = makeDots(count);
    setActual(count); setDots(newDots); setGuess(""); setLastCorrect(null);
    setPhase("flashing");
    timerRef.current = setTimeout(() => {
      setDots([]); setPhase("input");
    }, FLASH_MS);
  }, []);

  const startGame = () => { trackPlay(game.id); resultsRef.current = []; setResults([]); setRound(1); startRound(1); };

  const handleSubmit = useCallback(() => {
    if (phase !== "input" || guess === "") return;
    const g = parseInt(guess);
    const error = Math.abs(g - actual);
    const correct = error === 0;
    playBeep(error <= 2 ? "success" : "go");
    setLastCorrect(correct);
    const entry = { actual, guess: g, error };
    const next = [...resultsRef.current, entry]; resultsRef.current = next; setResults(next);
    setPhase("feedback");
    if (next.length >= ROUNDS) {
      timerRef.current = setTimeout(() => finalize(next), 1000);
    } else {
      timerRef.current = setTimeout(() => { setRound(r => r+1); startRound(next.length+1); }, 900);
    }
  }, [phase, guess, actual, finalize, startRound]);

  const handleKey = (k: string) => {
    if (phase !== "input") return;
    if (k === "DEL") { setGuess(g => g.slice(0,-1)); return; }
    if (k === "OK") { handleSubmit(); return; }
    if (guess.length >= 2) return;
    setGuess(g => g + k);
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = getRank(finalAcc, game);
  const pct  = getPercentile(finalAcc, game);

  if (phase === "done") {
    const normalized = normalizeTo100FromPercentile(pct, finalAcc);
    return (
      <CommonResult
        game={game}
        rawScore={finalAcc}
        rawUnit="% acc"
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
          <div style={{ fontSize:"clamp(40px,10vw,56px)", marginBottom:20 }}>🔢</div>
          <p style={{ fontSize:"clamp(16px,3.5vw,19px)", fontWeight:800, marginBottom:8 }}>Subitizing & Numerosity Assessment</p>
          <p style={{ fontSize:13, color:"var(--text-2)", fontFamily:"var(--font-mono)", marginBottom:4 }}>Dots flash for 0.5 seconds — how many were there?</p>
          <p style={{ fontSize:12, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:28 }}>10 rounds · 5–20 dots · accuracy % is your score</p>
          <button onClick={startGame} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"14px 36px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)" }}>ROUND {round}/{ROUNDS}</div>
            <div style={{ display:"flex", gap:3 }}>
              {Array.from({length:ROUNDS}).map((_,i) => {
                const r = results[i];
                return <div key={i} style={{ width:16, height:3, borderRadius:2, background: r ? (r.error<=2 ? game.accent : r.error<=5 ? "#F59E0B" : "#EF4444") : "var(--bg-elevated)" }} />;
              })}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)" }}>
              {results.length > 0 ? `${Math.round(results.reduce((s,r)=>s+(r.error===0?100:Math.max(0,100-r.error/r.actual*100)),0)/results.length)}%` : ""}
            </div>
          </div>

          {/* Dot display area */}
          <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", position:"relative", paddingBottom:"80%", marginBottom:16, overflow:"hidden" }}>
            {phase === "flashing" && dots.map((d,i) => (
              <div key={i} style={{ position:"absolute", left:`${d.x}%`, top:`${d.y}%`, width:10, height:10, borderRadius:"50%", background:game.accent, transform:"translate(-50%,-50%)", boxShadow:`0 0 6px ${game.accent}` }} />
            ))}
            {phase === "input" && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:48, fontWeight:900, fontFamily:"var(--font-mono)", color:game.accent, minHeight:64 }}>{guess || "?"}</div>
                  <div style={{ fontSize:11, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>HOW MANY DOTS?</div>
                </div>
              </div>
            )}
            {phase === "feedback" && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:36, fontWeight:900, fontFamily:"var(--font-mono)", color: results[results.length-1]?.error===0 ? game.accent : "#F59E0B" }}>
                    {results[results.length-1]?.guess} / {actual}
                  </div>
                  <div style={{ fontSize:13, color: results[results.length-1]?.error===0 ? game.accent : "#F59E0B", fontFamily:"var(--font-mono)", marginTop:4 }}>
                    {results[results.length-1]?.error===0 ? "PERFECT!" : `off by ${results[results.length-1]?.error}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Numpad */}
          {phase === "input" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, maxWidth:280, margin:"0 auto" }}>
              {["1","2","3","4","5","6","7","8","9","DEL","0","OK"].map(k => (
                <button key={k} onClick={() => handleKey(k)} className="pressable" style={{
                  background: k==="OK" ? game.accent : "var(--bg-elevated)",
                  color: k==="OK" ? "#000" : "var(--text-1)",
                  border: `1px solid ${k==="OK" ? game.accent : "var(--border)"}`,
                  borderRadius:"var(--radius-md)", padding:"14px 0",
                  fontSize: k==="DEL"||k==="OK" ? 13 : 18,
                  fontWeight:700, cursor:"pointer", fontFamily:"var(--font-mono)",
                  WebkitTapHighlightColor:"transparent",
                }}>
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
