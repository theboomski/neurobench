"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;
const GRID = 18;
const BASE_SPEED = 180; // ms per tick
const MIN_SPEED = 70;
const GOOD = ["🏆", "☕"];
const BAD  = ["📋", "😤"];

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

type Dir = "U"|"D"|"L"|"R";
type Pos = { x: number; y: number };
type ItemType = "good"|"bad";
interface Item { pos: Pos; emoji: string; type: ItemType; }

function rnd(max: number) { return Math.floor(Math.random() * max); }
function eq(a: Pos, b: Pos) { return a.x === b.x && a.y === b.y; }

function spawnItem(snake: Pos[], items: Item[]): Item {
  let pos: Pos;
  do { pos = { x: rnd(GRID), y: rnd(GRID) }; }
  while (snake.some(s => eq(s, pos)) || items.some(i => eq(i.pos, pos)));
  const isBad = Math.random() < 0.35;
  const pool = isBad ? BAD : GOOD;
  return { pos, emoji: pool[Math.floor(Math.random() * pool.length)], type: isBad ? "bad" : "good" };
}

type Phase = "idle"|"playing"|"done";

export default function CorporateClimber({ game }: { game: GameData }) {
  const [phase, setPhase]     = useState<Phase>("idle");
  const [snake, setSnake]     = useState<Pos[]>([]);
  const [items, setItems]     = useState<Item[]>([]);
  const [dir, setDir]         = useState<Dir>("R");
  const [score, setScore]     = useState(0);
  const [showAd, setShowAd]   = useState(false);
  const [shareImg, setShareImg] = useState<string|null>(null);
  const [highScore, setHS]    = useState<number|null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const snakeRef  = useRef<Pos[]>([]);
  const itemsRef  = useRef<Item[]>([]);
  const dirRef    = useRef<Dir>("R");
  const nextDirRef = useRef<Dir>("R");
  const scoreRef  = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  // Keyboard controls
  useEffect(() => {
    const MAP: Record<string, Dir> = { ArrowUp:"U", ArrowDown:"D", ArrowLeft:"L", ArrowRight:"R", w:"U", s:"D", a:"L", d:"R" };
    const OPPOSITE: Record<Dir, Dir> = { U:"D", D:"U", L:"R", R:"L" };
    const handle = (e: KeyboardEvent) => {
      const d = MAP[e.key];
      if (d && d !== OPPOSITE[dirRef.current]) { nextDirRef.current = d; e.preventDefault(); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  const endGame = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    playBeep("fail");
    const isNew = saveHighScore(game.id, scoreRef.current);
    setIsNewBest(isNew); if (isNew) setHS(scoreRef.current);
    setFinalScore(scoreRef.current); setPhase("done");
  }, [game.id]);

  const tick = useCallback(() => {
    if (!activeRef.current) return;
    const curDir = nextDirRef.current;
    dirRef.current = curDir;
    setDir(curDir);

    const head = snakeRef.current[0];
    const delta = { U:{x:0,y:-1}, D:{x:0,y:1}, L:{x:-1,y:0}, R:{x:1,y:0} }[curDir];
    const newHead = { x: head.x + delta.x, y: head.y + delta.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) { endGame(); return; }
    // Self collision
    if (snakeRef.current.some(s => eq(s, newHead))) { endGame(); return; }

    // Check items
    const hitItem = itemsRef.current.find(i => eq(i.pos, newHead));
    let grow = false;
    let newItems = [...itemsRef.current];

    if (hitItem) {
      if (hitItem.type === "bad") { endGame(); return; }
      playBeep("tap");
      scoreRef.current++; setScore(scoreRef.current);
      grow = true;
      newItems = newItems.filter(i => !eq(i.pos, newHead));
      // Spawn replacement good item
      newItems.push(spawnItem([newHead, ...snakeRef.current], newItems));
    }

    const newSnake = grow ? [newHead, ...snakeRef.current] : [newHead, ...snakeRef.current.slice(0,-1)];
    snakeRef.current = newSnake;
    itemsRef.current = newItems;
    setSnake([...newSnake]);
    setItems([...newItems]);

    const speed = Math.max(MIN_SPEED, BASE_SPEED - scoreRef.current * 4);
    timerRef.current = setTimeout(tick, speed);
  }, [endGame]);

  const startGame = () => {
    const start: Pos[] = [{ x:8, y:9 },{ x:7, y:9 },{ x:6, y:9 }];
    const startItems: Item[] = [];
    for (let i = 0; i < 4; i++) startItems.push(spawnItem(start, startItems));
    snakeRef.current = start; itemsRef.current = startItems;
    dirRef.current = "R"; nextDirRef.current = "R";
    scoreRef.current = 0;
    setSnake(start); setItems(startItems); setDir("R"); setScore(0);
    activeRef.current = true;
    setPhase("playing");
    timerRef.current = setTimeout(tick, BASE_SPEED);
  };

  // Swipe controls
  const touchStart = useRef<{x:number;y:number}|null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = { x:e.touches[0].clientX, y:e.touches[0].clientY }; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const OPPOSITE: Record<Dir, Dir> = { U:"D", D:"U", L:"R", R:"L" };
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    let d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U");
    if (d !== OPPOSITE[dirRef.current]) nextDirRef.current = d;
    touchStart.current = null;
  };

  useEffect(() => () => { activeRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct  = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "PROMOTIONS", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title:"NeuroBench", text:t.share.text(game.title,rank.label,rank.subtitle,t.site.url), files:[new File([blob],"report.png",{type:"image/png"})] }); return; } catch { } }
    window.open(url, "_blank");
  };

  const cellSize = `${100/GRID}%`;

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
          {finalScore}<span style={{ fontSize:"clamp(16px,3vw,22px)", fontWeight:400, color:"var(--text-3)", marginLeft:6, fontFamily:"var(--font-mono)" }}>promotions</span>
        </div>
        <div style={{ fontSize:13, color:game.accent, fontWeight:700, marginBottom:6, fontFamily:"var(--font-mono)" }}>TOP {100-pct}% GLOBALLY</div>
        <div style={{ fontSize:15, fontWeight:700, color:rank.color, marginBottom:4 }}>{rank.title}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", fontStyle:"italic", marginBottom:20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display:"inline-block", background:`${game.accent}12`, border:`1px solid ${game.accent}30`, color:game.accent, fontSize:11, fontWeight:700, padding:"3px 14px", borderRadius:999, marginBottom:16, fontFamily:"var(--font-mono)", textTransform:"uppercase" }}>◆ New Personal Record</div>}
        {highScore!==null && !isNewBest && <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:16, fontFamily:"var(--font-mono)" }}>Personal best: <span style={{ color:game.accent }}>{highScore} promotions</span></div>}
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
          <div style={{ fontSize:"clamp(40px,10vw,56px)", marginBottom:20 }}>🐍</div>
          <p style={{ fontSize:"clamp(16px,3.5vw,19px)", fontWeight:800, marginBottom:8 }}>Corporate Ladder Navigation</p>
          <p style={{ fontSize:13, color:"var(--text-2)", fontFamily:"var(--font-mono)", marginBottom:4 }}>Collect 🏆 ☕ · Avoid 📋 😤</p>
          <p style={{ fontSize:12, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:28 }}>Arrow keys or swipe · speed increases · don&apos;t trap yourself</p>
          <button onClick={startGame} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"14px 36px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--text-2)" }}>PROMOTIONS: <span style={{ color:game.accent, fontWeight:700 }}>{score}</span></div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)" }}>Collect 🏆 ☕ · Avoid 📋 😤</div>
          </div>

          {/* Game grid */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", position:"relative", aspectRatio:"1", touchAction:"none", userSelect:"none", overflow:"hidden" }}
          >
            {/* Snake body */}
            {snake.map((s, i) => (
              <div key={i} style={{
                position:"absolute",
                left:`${(s.x/GRID)*100}%`, top:`${(s.y/GRID)*100}%`,
                width:cellSize, height:cellSize,
                background: i===0 ? game.accent : `${game.accent}${Math.max(20, 80 - i*3).toString(16)}`,
                borderRadius: i===0 ? "30%" : "20%",
                transition:"none",
              }} />
            ))}
            {/* Items */}
            {items.map((item, i) => (
              <div key={i} style={{ position:"absolute", left:`${(item.pos.x/GRID)*100}%`, top:`${(item.pos.y/GRID)*100}%`, width:cellSize, height:cellSize, display:"flex", alignItems:"center", justifyContent:"center", fontSize:`clamp(12px,${100/GRID * 0.6}vw,20px)` }}>
                {item.emoji}
              </div>
            ))}
          </div>

          {/* D-pad for mobile */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gridTemplateRows:"1fr 1fr 1fr", gap:4, maxWidth:160, margin:"12px auto 0", height:120 }}>
            {[
              {label:"↑",d:"U",col:2,row:1},{label:"←",d:"L",col:1,row:2},
              {label:"↓",d:"D",col:2,row:3},{label:"→",d:"R",col:3,row:2},
            ].map(btn => (
              <button key={btn.d} onTouchStart={e=>{e.preventDefault();const OPPOSITE:Record<Dir,Dir>={U:"D",D:"U",L:"R",R:"L"};if(btn.d as Dir!==OPPOSITE[dirRef.current])nextDirRef.current=btn.d as Dir;}} onMouseDown={()=>{const OPPOSITE:Record<Dir,Dir>={U:"D",D:"U",L:"R",R:"L"};if(btn.d as Dir!==OPPOSITE[dirRef.current])nextDirRef.current=btn.d as Dir;}} style={{ gridColumn:btn.col, gridRow:btn.row, background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:8, fontSize:16, cursor:"pointer", WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
