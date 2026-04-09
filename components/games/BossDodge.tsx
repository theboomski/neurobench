"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;
const GAME_DURATION = 30000;
const LANES = 4;
const CATCHABLE = ["📋", "☕"];
const AVOID = ["👹", "📅"];

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

interface FallingObj {
  id: number;
  lane: number;
  emoji: string;
  y: number; // 0-110 %
  speed: number;
  caught: boolean;
  missed: boolean;
  hit: boolean;
}

let nextId = 1;

type Phase = "idle" | "playing" | "done";

export default function BossDodge({ game }: { game: GameData }) {
  const [phase, setPhase]     = useState<Phase>("idle");
  const [objects, setObjects] = useState<FallingObj[]>([]);
  const [score, setScore]     = useState(0);
  const [lives, setLives]     = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [showAd, setShowAd]   = useState(false);
  const [shareImg, setShareImg] = useState<string|null>(null);
  const [highScore, setHS]    = useState<number|null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const rafRef    = useRef<number>(0);
  const lastRef   = useRef<number>(0);
  const spawnRef  = useRef<number>(0);
  const scoreRef  = useRef(0);
  const livesRef  = useRef(3);
  const objectsRef = useRef<FallingObj[]>([]);
  const startRef  = useRef<number>(0);
  const activeRef = useRef(false);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const endGame = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const isNew = saveHighScore(game.id, scoreRef.current);
    setIsNewBest(isNew); if (isNew) setHS(scoreRef.current);
    setFinalScore(scoreRef.current); setPhase("done");
  }, [game.id]);

  const gameLoop = useCallback((ts: number) => {
    if (!activeRef.current) return;
    const dt = lastRef.current ? Math.min(ts - lastRef.current, 50) : 16;
    lastRef.current = ts;
    const elapsed = ts - startRef.current;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    setTimeLeft(remaining);
    if (remaining <= 0) { endGame(); return; }

    const speedMult = 1 + elapsed / 50000; // very gentle speed increase

    // Spawn new object
    spawnRef.current += dt;
    const spawnInterval = Math.max(1200, 2200 - elapsed / 60);
    if (spawnRef.current >= spawnInterval) {
      spawnRef.current = 0;
      const isCatch = Math.random() < 0.6;
      const pool = isCatch ? CATCHABLE : AVOID;
      const emoji = pool[Math.floor(Math.random() * pool.length)];
      // pick lane not already occupied at top
      const occupiedLanes = objectsRef.current.filter(o => o.y < 15).map(o => o.lane);
      const freeLanes = Array.from({length:LANES},(_,i)=>i).filter(l => !occupiedLanes.includes(l));
      const lane = freeLanes.length > 0 ? freeLanes[Math.floor(Math.random() * freeLanes.length)] : Math.floor(Math.random() * LANES);
      const obj: FallingObj = { id: nextId++, lane, emoji, y: -10, speed: (0.7 + Math.random() * 0.5) * speedMult, caught: false, missed: false, hit: false };
      objectsRef.current = [...objectsRef.current, obj];
    }

    // Update positions
    let livesLost = 0;
    objectsRef.current = objectsRef.current
      .map(o => {
        if (o.caught || o.hit) return o;
        const newY = o.y + o.speed * (dt / 16);
        if (newY > 110 && !o.missed) {
          if (CATCHABLE.includes(o.emoji)) { /* missed catchable — no penalty */ }
          return { ...o, y: newY, missed: true };
        }
        return { ...o, y: newY };
      })
      .filter(o => o.y < 120 && !o.caught && !o.hit);

    if (livesLost > 0) {
      livesRef.current = Math.max(0, livesRef.current - livesLost);
      setLives(livesRef.current);
      if (livesRef.current <= 0) { endGame(); return; }
    }

    setObjects([...objectsRef.current]);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [endGame]);

  const startGame = () => {
    scoreRef.current = 0; livesRef.current = 3; objectsRef.current = [];
    setScore(0); setLives(3); setObjects([]); setTimeLeft(GAME_DURATION);
    setPhase("playing");
    activeRef.current = true;
    lastRef.current = 0; spawnRef.current = 0;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
  };

  const handleTap = useCallback((obj: FallingObj) => {
    if (phase !== "playing") return;
    if (CATCHABLE.includes(obj.emoji)) {
      playBeep("tap");
      scoreRef.current++; setScore(scoreRef.current);
      objectsRef.current = objectsRef.current.map(o => o.id === obj.id ? {...o, caught: true} : o);
    } else {
      playBeep("fail");
      livesRef.current = Math.max(0, livesRef.current - 1);
      setLives(livesRef.current);
      objectsRef.current = objectsRef.current.map(o => o.id === obj.id ? {...o, hit: true} : o);
      if (livesRef.current <= 0) { endGame(); }
    }
  }, [phase, endGame]);

  useEffect(() => () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); }, []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct  = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "CAUGHT", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title:"ZAZAZA", text:t.share.text(game.title,rank.label,rank.subtitle,t.site.url), files:[new File([blob],"report.png",{type:"image/png"})] }); return; } catch { } }
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
        <div style={{ fontSize:"clamp(52px,13vw,80px)", fontWeight:900, letterSpacing:"-0.05em", lineHeight:1, marginBottom:4 }}>
          {finalScore}<span style={{ fontSize:"clamp(16px,3vw,22px)", fontWeight:400, color:"var(--text-3)", marginLeft:6, fontFamily:"var(--font-mono)" }}>caught</span>
        </div>
        <div style={{ fontSize:13, color:game.accent, fontWeight:700, marginBottom:6, fontFamily:"var(--font-mono)" }}>TOP {100-pct}% GLOBALLY</div>
        <div style={{ fontSize:15, fontWeight:700, color:rank.color, marginBottom:4 }}>{rank.title}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", fontStyle:"italic", marginBottom:20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display:"inline-block", background:`${game.accent}12`, border:`1px solid ${game.accent}30`, color:game.accent, fontSize:11, fontWeight:700, padding:"3px 14px", borderRadius:999, marginBottom:16, fontFamily:"var(--font-mono)", textTransform:"uppercase" }}>◆ New Personal Record</div>}
        {highScore!==null && !isNewBest && <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:16, fontFamily:"var(--font-mono)" }}>Personal best: <span style={{ color:game.accent }}>{highScore} caught</span></div>}
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

  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const laneWidth = 100 / LANES;

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", padding:"clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign:"center" }}>
          <div style={{ fontSize:"clamp(40px,10vw,56px)", marginBottom:20 }}>👹</div>
          <p style={{ fontSize:"clamp(16px,3.5vw,19px)", fontWeight:800, marginBottom:8 }}>Selective Response Protocol</p>
          <p style={{ fontSize:13, color:"var(--text-2)", fontFamily:"var(--font-mono)", marginBottom:4 }}>Tap 📋 ☕ to catch · Avoid 👹 📅 or lose a life</p>
          <p style={{ fontSize:12, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:28 }}>30 seconds · 3 lives · speed increases</p>
          <button onClick={startGame} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"14px 36px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          {/* Timer */}
          <div style={{ height:4, background:"var(--bg-elevated)", borderRadius:2, marginBottom:12, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${timerPct}%`, background: timerPct>40 ? game.accent : timerPct>20 ? "#F59E0B" : "#EF4444", borderRadius:2, transition:"width 0.1s linear" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--text-2)" }}>SCORE: <span style={{ color:game.accent, fontWeight:700 }}>{score}</span></div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:14, fontWeight:700, color: timerPct>40 ? "var(--text-1)" : "#EF4444" }}>{(timeLeft/1000).toFixed(0)}s</div>
            <div style={{ display:"flex", gap:4 }}>
              {[0,1,2].map(i => <span key={i} style={{ fontSize:16 }}>{i < lives ? "❤️" : "🖤"}</span>)}
            </div>
          </div>

          {/* Game field */}
          <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", position:"relative", height:"clamp(320px,55vw,420px)", overflow:"hidden" }}>
            {/* Lane dividers */}
            {[1,2,3].map(i => (
              <div key={i} style={{ position:"absolute", left:`${i*laneWidth}%`, top:0, bottom:0, width:1, background:"var(--border)", opacity:0.3 }} />
            ))}
            {/* Objects */}
            {objects.map(obj => (
              <div
                key={obj.id}
                onClick={() => handleTap(obj)}
                style={{
                  position:"absolute",
                  left:`${obj.lane * laneWidth + laneWidth/2}%`,
                  top:`${obj.y}%`,
                  transform:"translate(-50%,-50%)",
                  // Extra large tap area for mobile
                  width:"clamp(72px,18vw,88px)",
                  height:"clamp(72px,18vw,88px)",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  fontSize:"clamp(32px,8vw,44px)",
                  cursor:"pointer",
                  WebkitTapHighlightColor:"transparent",
                  touchAction:"manipulation",
                  userSelect:"none",
                  filter: obj.caught || obj.hit ? "opacity(0.3)" : "none",
                  transition:"filter 0.1s",
                  borderRadius:"50%",
                }}
              >
                {obj.emoji}
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center", marginTop:8, fontSize:11, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
            TAP 📋 ☕ · IGNORE 👹 📅
          </div>
        </div>
      )}
    </>
  );
}
