"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;
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
function makeCurve() {
  const duration = 4000 + Math.random() * 4000; // 4-8 seconds total
  const peakAt = 0.3 + Math.random() * 0.5; // peak at 30-80% of duration
  const maxGain = 30000 + Math.random() * 80000; // $30k-$110k gain at peak
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
  const [shareImg, setShareImg] = useState<string|null>(null);
  const [highScore, setHS]      = useState<number|null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const curveRef    = useRef(makeCurve());
  const startRef    = useRef<number>(0);
  const acceptedRef = useRef<number[]>([]);
  const peakRef     = useRef(BASE_SALARY);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearT = () => { if (timerRef.current) clearInterval(timerRef.current); };
  useEffect(() => () => clearT(), []);

  const finalize = useCallback((all: number[]) => {
    const avg = Math.round(all.reduce((s,v) => s+v, 0) / all.length);
    setFinalScore(avg);
    const isNew = saveHighScore(game.id, avg);
    setIsNewBest(isNew); if (isNew) setHS(avg);
    setPhase("done");
  }, [game.id]);

  const startRound = useCallback((r: number, cur: number[]) => {
    const curve = makeCurve();
    curveRef.current = curve;
    startRef.current = performance.now();
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
        playBeep("fail");
        setLastAccepted(locked);
        const next = [...cur, locked];
        acceptedRef.current = next; setAccepted(next);
        setPhase("accepted");
        if (next.length >= ROUNDS) {
          setTimeout(() => finalize(next), 1200);
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
      setTimeout(() => finalize(next), 1200);
    } else {
      setTimeout(() => { setRound(r => r+1); startRound(next.length+1, next); }, 1400);
    }
  }, [phase, salary, finalize, startRound]);

  const startGame = () => {
    acceptedRef.current = []; setAccepted([]); setRound(1); setLastAccepted(null);
    startRound(1, []);
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct  = getPercentile(finalScore, game);
  const avgSalary = accepted.length > 0 ? Math.round(accepted.reduce((s,v)=>s+v,0)/accepted.length) : 0;

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "AVG SALARY", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title:"ZAZAZA", text:t.share.text(game.title,rank.label,rank.subtitle,t.site.url), files:[new File([blob],"report.png",{type:"image/png"})] }); return; } catch { } }
    window.open(url, "_blank");
  };

  // Progress bar: how far along the salary climb we are
  const progress = phase === "playing" ? Math.min(1, (performance.now() - startRef.current) / curveRef.current.duration) : 0;
  const salaryPct = Math.max(0, Math.min(100, ((salary - BASE_SALARY) / curveRef.current.maxGain) * 100));

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background:"var(--bg-card)", border:"1px solid var(--border-md)", borderTop:`2px solid ${rank.color}`, borderRadius:"var(--radius-xl)", padding:"clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign:"center" }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--text-3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:28 }}>Assessment Complete · {game.clinicalTitle}</div>
        <div style={{ width:110, height:110, borderRadius:"50%", background:`${rank.color}12`, border:`2px solid ${rank.color}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:`0 0 48px ${rank.color}25` }}>
          <span style={{ fontSize:48, fontWeight:900, color:rank.color, lineHeight:1 }}>{rank.label}</span>
          <span style={{ fontSize:9, color:rank.color, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.1em", marginTop:2, fontFamily:"var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize:"clamp(28px,7vw,48px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1, marginBottom:4 }}>
          {formatSalary(finalScore)}<span style={{ fontSize:"clamp(12px,2.5vw,16px)", fontWeight:400, color:"var(--text-3)", marginLeft:6, fontFamily:"var(--font-mono)" }}>avg</span>
        </div>
        <div style={{ fontSize:13, color:game.accent, fontWeight:700, marginBottom:6, fontFamily:"var(--font-mono)" }}>TOP {100-pct}% GLOBALLY</div>
        <div style={{ fontSize:15, fontWeight:700, color:rank.color, marginBottom:4 }}>{rank.title}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", fontStyle:"italic", marginBottom:16 }}>&quot;{rank.subtitle}&quot;</div>
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginBottom:20 }}>
          {accepted.map((s,i) => (
            <div key={i} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:8, padding:"6px 12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>R{i+1}</div>
              <div style={{ fontSize:13, fontWeight:700, color: s>120000 ? game.accent : s>95000 ? "#F59E0B" : "#EF4444", fontFamily:"var(--font-mono)" }}>{formatSalary(s)}</div>
            </div>
          ))}
        </div>
        {isNewBest && <div style={{ display:"inline-block", background:`${game.accent}12`, border:`1px solid ${game.accent}30`, color:game.accent, fontSize:11, fontWeight:700, padding:"3px 14px", borderRadius:999, marginBottom:16, fontFamily:"var(--font-mono)", textTransform:"uppercase" }}>◆ New Personal Record</div>}
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
          <div style={{ fontSize:"clamp(40px,10vw,56px)", marginBottom:20 }}>💰</div>
          <p style={{ fontSize:"clamp(16px,3.5vw,19px)", fontWeight:800, marginBottom:8 }}>Negotiation Timing Assessment</p>
          <p style={{ fontSize:13, color:"var(--text-2)", fontFamily:"var(--font-mono)", marginBottom:4 }}>Salary is rising — hit ACCEPT at the peak</p>
          <p style={{ fontSize:12, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:28 }}>5 rounds · US salaries · avg salary is your score</p>
          <button onClick={startGame} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"14px 36px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
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
