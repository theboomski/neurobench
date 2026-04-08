"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;
const ROUNDS = 10;
const MISS_PENALTY = 1500;

function getRank(ms: number, game: GameData) {
  return game.stats.ranks.find(r => ms <= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(ms: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (ms <= pts[0].ms) return pts[0].percentile;
  if (ms >= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (ms >= pts[i].ms && ms <= pts[i + 1].ms) {
      const t2 = (ms - pts[i].ms) / (pts[i + 1].ms - pts[i].ms);
      return Math.round(pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

const COLOR_PAIRS_EASY = [
  ["#EF4444","#3B82F6"],["#22C55E","#A855F7"],["#F97316","#06B6D4"],["#EAB308","#EC4899"],
];
const COLOR_PAIRS_HARD = [
  ["#EF4444","#F97316"],["#3B82F6","#06B6D4"],["#22C55E","#10B981"],["#A855F7","#8B5CF6"],
];
const SHAPES = ["●","■","▲","◆","★","⬟"];

type ChangeType = "color"|"number"|"shape";
interface RoundConfig { type: ChangeType; before: string; after: string; label: string; }

function makeRound(roundNum: number): RoundConfig {
  const diff = Math.floor((roundNum - 1) / 2);
  const types: ChangeType[] = ["color","number","shape"];
  const type = types[Math.floor(Math.random() * types.length)];
  if (type === "color") {
    const pairs = diff >= 3 ? COLOR_PAIRS_HARD : COLOR_PAIRS_EASY;
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    return { type, before: pair[0], after: pair[1], label: "color" };
  }
  if (type === "number") {
    const range = diff >= 3 ? 1 : diff >= 2 ? 2 : 5;
    const before = Math.floor(Math.random() * 80) + 10;
    const delta = (Math.floor(Math.random() * range) + 1) * (Math.random() > 0.5 ? 1 : -1);
    return { type, before: String(before), after: String(before + delta), label: "number" };
  }
  let a = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  let b = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  while (b === a) b = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return { type, before: a, after: b, label: "shape" };
}

type Phase = "idle"|"watching"|"changed"|"feedback"|"done";

export default function DontBlink({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [round, setRound]       = useState(1);
  const [config, setConfig]     = useState<RoundConfig>(makeRound(1));
  const [changed, setChanged]   = useState(false);
  const [results, setResults]   = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<number|null>(null);
  const [missed, setMissed]     = useState(false);
  const [showAd, setShowAd]     = useState(false);
  const [shareImg, setShareImg] = useState<string|null>(null);
  const [highScore, setHS]      = useState<number|null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const changeTimeRef = useRef<number>(0);
  const timerRef      = useRef<ReturnType<typeof setTimeout>|null>(null);
  const resultsRef    = useRef<number[]>([]);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);
  const clearT = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  useEffect(() => () => clearT(), []);

  const finalize = useCallback((all: number[]) => {
    const avg = Math.round(all.reduce((s,v) => s+v, 0) / all.length);
    setFinalScore(avg);
    const isNew = saveHighScore(game.id, avg);
    setIsNewBest(isNew); if (isNew) setHS(avg);
    setPhase("done");
  }, [game.id]);

  const startRound = useCallback((r: number, cur: number[]) => {
    const cfg = makeRound(r);
    setConfig(cfg); setChanged(false); setMissed(false); setLastResult(null);
    setPhase("watching");
    const delay = 1000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      changeTimeRef.current = performance.now();
      setChanged(true); setPhase("changed");
      // 2s to react before miss
      timerRef.current = setTimeout(() => {
        playBeep("fail"); setMissed(true); setLastResult(MISS_PENALTY);
        const next = [...cur, MISS_PENALTY]; resultsRef.current = next; setResults(next);
        setPhase("feedback");
        if (next.length >= ROUNDS) { timerRef.current = setTimeout(() => finalize(next), 1200); }
        else { timerRef.current = setTimeout(() => { setRound(r+1); startRound(r+1, next); }, 1200); }
      }, 2000);
    }, delay);
  }, [finalize]);

  const handleTap = useCallback(() => {
    if (phase === "watching") return; // false alarm — ignore
    if (phase !== "changed") return;
    clearT();
    const rt = Math.round(performance.now() - changeTimeRef.current);
    playBeep("success"); setLastResult(rt);
    const next = [...resultsRef.current, rt]; resultsRef.current = next; setResults(next);
    setPhase("feedback");
    if (next.length >= ROUNDS) { timerRef.current = setTimeout(() => finalize(next), 1000); }
    else { timerRef.current = setTimeout(() => { setRound(r => r+1); startRound(next.length+1, next); }, 800); }
  }, [phase, startRound, finalize]);

  const startGame = () => { resultsRef.current = []; setResults([]); setRound(1); startRound(1, []); };
  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = finalScore > 0 ? getRank(finalScore, game) : getRank(9999, game);
  const pct  = finalScore > 0 ? getPercentile(finalScore, game) : 0;
  const hits = results.filter(r => r < MISS_PENALTY).length;
  const accuracy = results.length > 0 ? Math.round((hits/results.length)*100) : 0;

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "ms AVG", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title:"NeuroBench", text:t.share.text(game.title,rank.label,rank.subtitle,t.site.url), files:[new File([blob],"report.png",{type:"image/png"})] }); return; } catch { } }
    window.open(url, "_blank");
  };

  const display = config.type === "color"
    ? <div style={{ width:110, height:110, borderRadius:"50%", background: changed ? config.after : config.before, boxShadow:`0 0 40px ${changed ? config.after : config.before}60` }} />
    : config.type === "number"
    ? <div style={{ fontSize:96, fontWeight:900, fontFamily:"var(--font-mono)", color:game.accent, letterSpacing:"-0.05em" }}>{changed ? config.after : config.before}</div>
    : <div style={{ fontSize:96, lineHeight:1, color:game.accent }}>{changed ? config.after : config.before}</div>;

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
          {finalScore}<span style={{ fontSize:"clamp(14px,3vw,20px)", fontWeight:400, color:"var(--text-3)", marginLeft:6, fontFamily:"var(--font-mono)" }}>ms avg</span>
        </div>
        <div style={{ fontSize:13, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:8 }}>
          Accuracy: <span style={{ color: accuracy>=80 ? game.accent : "#F59E0B" }}>{accuracy}%</span> · Hits: {hits}/{ROUNDS}
        </div>
        <div style={{ fontSize:13, color:game.accent, fontWeight:700, marginBottom:6, fontFamily:"var(--font-mono)" }}>TOP {100-pct}% GLOBALLY</div>
        <div style={{ fontSize:15, fontWeight:700, color:rank.color, marginBottom:4 }}>{rank.title}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", fontStyle:"italic", marginBottom:20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display:"inline-block", background:`${game.accent}12`, border:`1px solid ${game.accent}30`, color:game.accent, fontSize:11, fontWeight:700, padding:"3px 14px", borderRadius:999, marginBottom:16, fontFamily:"var(--font-mono)", textTransform:"uppercase" }}>◆ New Personal Record</div>}
        {highScore!==null && !isNewBest && <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:16, fontFamily:"var(--font-mono)" }}>Personal best: <span style={{ color:game.accent }}>{highScore}ms</span></div>}
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
          <div style={{ fontSize:"clamp(40px,10vw,56px)", marginBottom:20 }}>👁️</div>
          <p style={{ fontSize:"clamp(16px,3.5vw,19px)", fontWeight:800, marginBottom:8 }}>Change Detection Assessment</p>
          <p style={{ fontSize:13, color:"var(--text-2)", fontFamily:"var(--font-mono)", marginBottom:4 }}>Something will change — tap the instant you notice</p>
          <p style={{ fontSize:12, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:28 }}>10 rounds · color, number & shape · gets more subtle each round</p>
          <button onClick={startGame} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"14px 36px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)" }}>ROUND {round}/{ROUNDS}</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)", textTransform:"uppercase" }}>{config.label}</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)" }}>
              {results.filter(r=>r<MISS_PENALTY).length > 0 ? `AVG: ${Math.round(results.filter(r=>r<MISS_PENALTY).reduce((s,v)=>s+v,0)/results.filter(r=>r<MISS_PENALTY).length)}ms` : ""}
            </div>
          </div>
          <div style={{ display:"flex", gap:3, marginBottom:16 }}>
            {Array.from({length:ROUNDS}).map((_,i) => (
              <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i<results.length ? (results[i]<MISS_PENALTY ? game.accent : "#EF4444") : "var(--bg-elevated)" }} />
            ))}
          </div>
          <div onClick={handleTap} style={{ background:"var(--bg-card)", border:`2px solid ${phase==="feedback" ? (missed?"#EF444460":`${game.accent}60`) : "var(--border)"}`, borderRadius:"var(--radius-xl)", minHeight:"clamp(260px,45vw,340px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor: phase==="changed" ? "pointer" : "default", WebkitTapHighlightColor:"transparent", touchAction:"manipulation", gap:24 }}>
            {display}
            <p style={{ fontSize:13, fontFamily:"var(--font-mono)", letterSpacing:"0.06em", color:"var(--text-3)" }}>
              {phase==="watching" && "WATCH CLOSELY..."}
              {phase==="changed" && <span style={{ color:game.accent, fontWeight:700 }}>TAP!</span>}
              {phase==="feedback" && !missed && lastResult!==null && <span style={{ color:game.accent }}>{lastResult}ms ✓</span>}
              {phase==="feedback" && missed && <span style={{ color:"#EF4444" }}>MISSED — {MISS_PENALTY}ms penalty</span>}
            </p>
          </div>
          <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
            {phase==="watching" && "DON'T BLINK — TAP WHEN SOMETHING CHANGES"}
            {phase==="changed" && "CHANGE DETECTED — HOW FAST ARE YOU?"}
          </div>
        </div>
      )}
    </>
  );
}
