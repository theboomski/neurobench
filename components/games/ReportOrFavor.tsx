"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;
const TIME_LIMIT = 1500;

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

type TaskType = "report" | "favor";
interface Task { text: string; type: TaskType; }

const TASKS: Task[] = [
  // REPORTS — clear work tasks
  { text: "Please review the Q3 financial report by EOD.", type: "report" },
  { text: "Update the client presentation for tomorrow.", type: "report" },
  { text: "Send the meeting minutes to the team.", type: "report" },
  { text: "Prepare the budget forecast for next quarter.", type: "report" },
  { text: "Review the new hire's onboarding documents.", type: "report" },
  { text: "Compile the weekly sales numbers.", type: "report" },
  { text: "Draft the project proposal for the client.", type: "report" },
  { text: "Schedule the all-hands meeting for Friday.", type: "report" },
  { text: "Fix the bug in the production deployment.", type: "report" },
  { text: "Submit the expense report before the deadline.", type: "report" },
  { text: "Proofread the press release before it goes out.", type: "report" },
  { text: "Update the project timeline in the shared doc.", type: "report" },
  { text: "Prepare the slides for the board presentation.", type: "report" },
  { text: "Review the vendor contract before we sign.", type: "report" },
  { text: "Send the weekly status update to stakeholders.", type: "report" },
  // FAVORS — obviously personal, increasingly absurd
  { text: "Can you help me move my couch this Saturday?", type: "favor" },
  { text: "Watch my dog this weekend while I'm at a wedding?", type: "favor" },
  { text: "Can you pick up my dry cleaning on your way in?", type: "favor" },
  { text: "My kid needs help with algebra homework tonight.", type: "favor" },
  { text: "Can you water my plants while I'm on vacation?", type: "favor" },
  { text: "Drive me to the airport at 4am on Sunday?", type: "favor" },
  { text: "Help me assemble my new IKEA wardrobe this weekend.", type: "favor" },
  { text: "Can you lend me $200 until my next paycheck?", type: "favor" },
  { text: "Watch my kids for a couple hours tonight?", type: "favor" },
  { text: "Write a Yelp review for my wife's restaurant.", type: "favor" },
  { text: "Can you feed my cat every day while I'm in Bali?", type: "favor" },
  { text: "Help me move apartments next weekend?", type: "favor" },
  { text: "Teach my nephew to drive this Sunday.", type: "favor" },
  { text: "Edit my personal Instagram bio for me?", type: "favor" },
  { text: "Can you plan my surprise birthday party?", type: "favor" },
];

type Phase = "idle" | "playing" | "done";

export default function ReportOrFavor({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [score, setScore]         = useState(0);
  const [task, setTask]           = useState<Task>(TASKS[0]);
  const [timeLeft, setTimeLeft]   = useState(TIME_LIMIT);
  const [feedback, setFeedback]   = useState<"correct"|"wrong"|"timeout"|null>(null);
  const [showAd, setShowAd]       = useState(false);
  const [shareImg, setShareImg]   = useState<string|null>(null);
  const [highScore, setHS]        = useState<number|null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const roundRef  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const scoreRef  = useRef(0);
  const usedRef   = useRef<number[]>([]);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (roundRef.current) clearTimeout(roundRef.current);
  };

  const endGame = useCallback((s: number) => {
    clearTimers();
    const isNew = saveHighScore(game.id, s);
    setIsNewBest(isNew); if (isNew) setHS(s);
    setFinalScore(s); setPhase("done");
  }, [game.id]);

  const getRandomTask = () => {
    // ensure mix — pick from unused, reset when exhausted
    if (usedRef.current.length >= TASKS.length) usedRef.current = [];
    let idx: number;
    do { idx = Math.floor(Math.random() * TASKS.length); } while (usedRef.current.includes(idx));
    usedRef.current.push(idx);
    return TASKS[idx];
  };

  const startRound = useCallback((currentScore: number) => {
    setTask(getRandomTask());
    setFeedback(null);
    setTimeLeft(TIME_LIMIT);

    const startMs = performance.now();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, TIME_LIMIT - (performance.now() - startMs));
      setTimeLeft(remaining);
    }, 30);

    roundRef.current = setTimeout(() => {
      clearTimers(); playBeep("fail");
      setFeedback("timeout");
      setTimeout(() => endGame(currentScore), 800);
    }, TIME_LIMIT);
  }, [endGame]);

  const startGame = () => {
    scoreRef.current = 0; usedRef.current = [];
    setScore(0); setFeedback(null);
    setPhase("playing");
    startRound(0);
  };

  const handleAnswer = useCallback((answer: "accept"|"dodge") => {
    if (phase !== "playing" || feedback !== null) return;
    clearTimers();
    const correct = (answer === "accept" && task.type === "report") || (answer === "dodge" && task.type === "favor");
    if (correct) {
      playBeep("success"); setFeedback("correct");
      scoreRef.current++; setScore(scoreRef.current);
      setTimeout(() => startRound(scoreRef.current), 300);
    } else {
      playBeep("fail"); setFeedback("wrong");
      setTimeout(() => endGame(scoreRef.current), 800);
    }
  }, [phase, feedback, task, startRound, endGame]);

  useEffect(() => () => clearTimers(), []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct  = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "STREAK", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
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
          {finalScore}<span style={{ fontSize:"clamp(16px,3vw,22px)", fontWeight:400, color:"var(--text-3)", marginLeft:6, fontFamily:"var(--font-mono)" }}>streak</span>
        </div>
        <div style={{ fontSize:13, color:game.accent, fontWeight:700, marginBottom:6, fontFamily:"var(--font-mono)" }}>TOP {100-pct}% GLOBALLY</div>
        <div style={{ fontSize:15, fontWeight:700, color:rank.color, marginBottom:4 }}>{rank.title}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", fontStyle:"italic", marginBottom:20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display:"inline-block", background:`${game.accent}12`, border:`1px solid ${game.accent}30`, color:game.accent, fontSize:11, fontWeight:700, padding:"3px 14px", borderRadius:999, marginBottom:16, fontFamily:"var(--font-mono)", textTransform:"uppercase" }}>◆ New Personal Record</div>}
        {highScore!==null && !isNewBest && <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:16, fontFamily:"var(--font-mono)" }}>Personal best: <span style={{ color:game.accent }}>{highScore} streak</span></div>}
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

  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timerPct > 60 ? game.accent : timerPct > 30 ? "#F59E0B" : "#EF4444";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", padding:"clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign:"center" }}>
          <div style={{ fontSize:"clamp(40px,10vw,56px)", marginBottom:20 }}>📋</div>
          <p style={{ fontSize:"clamp(16px,3.5vw,19px)", fontWeight:800, marginBottom:8 }}>Professional Boundary Assessment</p>
          <p style={{ fontSize:13, color:"var(--text-2)", fontFamily:"var(--font-mono)", marginBottom:4 }}>Work task → ACCEPT · Personal favor → DODGE</p>
          <p style={{ fontSize:12, color:"var(--text-3)", fontFamily:"var(--font-mono)", marginBottom:28 }}>1.5 seconds per request · one wrong = game over</p>
          <button onClick={startGame} className="pressable" style={{ background:game.accent, color:"#000", border:"none", borderRadius:"var(--radius-md)", padding:"14px 36px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          {/* Timer bar */}
          <div style={{ height:4, background:"var(--bg-elevated)", borderRadius:2, marginBottom:14, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${timerPct}%`, background:timerColor, borderRadius:2, transition:"width 0.03s linear, background 0.3s" }} />
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--text-2)" }}>STREAK: <span style={{ color:game.accent, fontWeight:700 }}>{score}</span></div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:timerColor }}>{(timeLeft/1000).toFixed(1)}s</div>
          </div>

          {/* Falling request */}
          <div style={{
            background:"var(--bg-card)",
            border:`2px solid ${feedback==="correct" ? `${game.accent}60` : feedback==="wrong"||feedback==="timeout" ? "#EF444460" : "var(--border)"}`,
            borderRadius:"var(--radius-xl)",
            minHeight:"clamp(140px,28vw,180px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:"24px 20px", marginBottom:16, textAlign:"center",
            transition:"border-color 0.1s",
          }}>
            <p style={{ fontSize:"clamp(15px,3vw,19px)", fontWeight:600, lineHeight:1.5, color:"var(--text-1)" }}>
              {task.text}
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <button onClick={() => handleAnswer("accept")} className="pressable" style={{ background:`${game.accent}15`, color:game.accent, border:`2px solid ${game.accent}40`, borderRadius:"var(--radius-md)", padding:"18px 0", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)", letterSpacing:"0.04em", WebkitTapHighlightColor:"transparent" }}>
              ✓ ACCEPT
            </button>
            <button onClick={() => handleAnswer("dodge")} className="pressable" style={{ background:"var(--bg-elevated)", color:"var(--text-1)", border:"2px solid var(--border-md)", borderRadius:"var(--radius-md)", padding:"18px 0", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"var(--font-mono)", letterSpacing:"0.04em", WebkitTapHighlightColor:"transparent" }}>
              ✗ DODGE
            </button>
          </div>
          {feedback==="timeout" && <div style={{ textAlign:"center", marginTop:12, fontSize:13, color:"#EF4444", fontFamily:"var(--font-mono)" }}>TOO SLOW — YOU&apos;RE FIRED</div>}
        </div>
      )}
    </>
  );
}
