"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;
const ROUNDS = 10;
const FLASH_MS = 500;
const MIN_DOTS = 5;
const MAX_DOTS = 20;

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
  const [shareImg, setShareImg] = useState<string|null>(null);
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

  const startGame = () => { resultsRef.current = []; setResults([]); setRound(1); startRound(1); };

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

  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalAcc, game);
  const pct  = getPercentile(finalAcc, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalAcc, unit: "% ACCURACY", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title:"NeuroBench", text:t.share.text(game.title,rank.label,rank.subtitle,t.site.url), files:[new File([blob],"report.png",{type:"image/png"})] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background:"var(--bg-card)", border:"1px solid var(--border-md)", borderTop:`2px solid ${rank.color}`, borderRadius:"var(--radius-xl)", padding:"clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign:"center" }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--text-3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:28 }}>Assessment Complete · {game.clinicalTitle}</div>
        <div style={{ width:110, height:110, borderRadius:"50%", background:`${rank.color}12`, border:`2px solid ${rank.color}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:`0 0 48px ${rank.color}25` }}>
          <span style={{ fontSize:48, fontWeight:900, color:rank.color, lineHeight:1 }}>{rank.label}</span>
          <span style={{ fontSize:9, color:rank.color, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.1em", marginTop:2, fontFamily:"var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize:"clamp(44px,11vw,72px)", fontWeight:900, letterSpacing:"-0.05em", lineHeight:1, marginBottom:4 }}>
          {finalAcc}<span style={{ fontSize:"clamp(14px,3vw,20px)", fontWeight:400, color:"var(--text-3)", marginLeft:6, fontFamily:"var(--font-mono)" }}>% acc</span>
        </div>
        <div style={{ fontSize:13, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:8 }}>
          Avg error: <span style={{ color: finalErr<=2 ? game.accent : finalErr<=5 ? "#F59E0B" : "#EF4444" }}>{finalErr} dots</span>
        </div>
        <div style={{ fontSize:13, color:game.accent, fontWeight:700, marginBottom:6, fontFamily:"var(--font-mono)" }}>TOP {100-pct}% GLOBALLY</div>
        <div style={{ fontSize:15, fontWeight:700, color:rank.color, marginBottom:4 }}>{rank.title}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", fontStyle:"italic", marginBottom:20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display:"inline-block", background:`${game.accent}12`, border:`1px solid ${game.accent}30`, color:game.accent, fontSize:11, fontWeight:700, padding:"3px 14px", borderRadius:999, marginBottom:16, fontFamily:"var(--font-mono)", textTransform:"uppercase" }}>◆ New Personal Record</div>}
        {highScore!==null && !isNewBest && <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:16, fontFamily:"var(--font-mono)" }}>Personal best: <span style={{ color:game.accent }}>{highScore}%</span></div>}
        <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", margin:"16px 0 24px" }}>
          {game.stats.ranks.map(r => (<div key={r.label} style={{ padding:"4px 11px", borderRadius:6, fontSize:12, fontWeight:800, fontFamily:"var(--font-mono)", background:r.label===rank.label?`${r.color}18`:"var(--bg-elevated)", color:r.label===rank.label?r.color:"var(--text-3)", border:`1px solid ${r.label===rank.label?r.color+"40":"transparent"}` }}>{r.label}</div>))}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={handleRetry} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"13px 28px", fontSize:13, fontWeight:800, cursor:"pointer", minWidth:140, fontFamily:"var(--font-mono)" }}>▶ PLAY AGAIN</button>
          <button onClick={handleShare} className="pressable" style={{ background:"var(--bg-elevated)", color:"var(--text-1)", border:"1px solid var(--border-md)", borderRadius:"var(--radius-md)", padding:"13px 28px", fontSize:13, fontWeight:700, cursor:"pointer", minWidth:140, fontFamily:"var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop:28 }}><img src={shareImg} alt="Report" style={{ maxWidth:"100%", borderRadius:"var(--radius-lg)", border:"1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

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
