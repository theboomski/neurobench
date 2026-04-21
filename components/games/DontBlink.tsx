"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
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
  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = finalScore > 0 ? getRank(finalScore, game) : getRank(9999, game);
  const pct  = finalScore > 0 ? getPercentile(finalScore, game) : 0;
  const hits = results.filter(r => r < MISS_PENALTY).length;
  const accuracy = results.length > 0 ? Math.round((hits/results.length)*100) : 0;


  const display = config.type === "color"
    ? <div style={{ width:110, height:110, borderRadius:"50%", background: changed ? config.after : config.before, boxShadow:`0 0 40px ${changed ? config.after : config.before}60` }} />
    : config.type === "number"
    ? <div style={{ fontSize:96, fontWeight:900, fontFamily:"var(--font-mono)", color:game.accent, letterSpacing:"-0.05em" }}>{changed ? config.after : config.before}</div>
    : <div style={{ fontSize:96, lineHeight:1, color:game.accent }}>{changed ? config.after : config.before}</div>;

  if (phase === "done") {
    const normalized = normalizeTo100FromPercentile(pct, Math.max(1, 1000 - finalScore));
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="ms avg"
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
