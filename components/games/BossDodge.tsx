"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
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
    trackPlay(game.id);
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
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const pct  = phase === "done" ? getPercentile(finalScore, game) : 0;

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="caught"
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
          <button onClick={startGame} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"14px 36px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)" }}>▶ PLAY</button>
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
                onTouchStart={(e) => { e.preventDefault(); handleTap(obj); }}
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
