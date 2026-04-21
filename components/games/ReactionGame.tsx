"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getRank, getPercentile, getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const MIN_WAIT = 1500;
const MAX_WAIT = 5500;
type Phase = "idle" | "waiting" | "go" | "toosoon" | "done";

export default function ReactionGame({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [ms, setMs]               = useState(0);
  const [showAd, setShowAd]       = useState(false);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearT = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const beginWait = useCallback(() => {
    setPhase("waiting");
    timerRef.current = setTimeout(() => {
      setPhase("go");
      startRef.current = performance.now();
      playBeep("go");
    }, MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT));
  }, []);

  const handleTap = useCallback(() => {
    if (phase === "idle")    { beginWait(); return; }
    if (phase === "waiting") { clearT(); playBeep("fail"); setPhase("toosoon"); return; }
    if (phase === "toosoon") { beginWait(); return; }
    if (phase === "done")    { return; }
    if (phase === "go") {
      const elapsed = Math.round(performance.now() - startRef.current);
      setMs(elapsed);
      playBeep("success");
      const isNew = saveHighScore(game.id, elapsed);
      setIsNewBest(isNew);
      if (isNew) setHS(elapsed);
      setPhase("done");
    }
  }, [phase, beginWait, game.id]);

  useEffect(() => () => clearT(), []);

  const rank = phase === "done" ? getRank(ms, game) : null;
  const pct  = phase === "done" ? getPercentile(ms, game) : 0;

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  // Zone styles
  const zoneBg: Record<Phase, string> = { idle: "var(--bg-card)", waiting: "#1a0808", go: "#071509", toosoon: "#1a0808", done: "var(--bg-card)" };
  const zoneBorder: Record<Phase, string> = { idle: "var(--border)", waiting: "rgba(239,68,68,0.4)", go: game.accent, toosoon: "rgba(239,68,68,0.6)", done: "var(--border-md)" };

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, Math.max(1, 1000 - ms));
    return (
      <CommonResult
        game={game}
        rawScore={ms}
        rawUnit="ms"
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

  // ── GAME ZONE ────────────────────────────────────────────────────────────────
  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div onClick={handleTap} style={{ background: zoneBg[phase], border: `1.5px solid ${zoneBorder[phase]}`, boxShadow: phase === "go" ? `0 0 80px ${game.accent}20` : "none", borderRadius: "var(--radius-xl)", minHeight: "clamp(280px,48vw,360px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", userSelect: "none", transition: "background 0.1s, border-color 0.12s, box-shadow 0.15s", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>

        {phase === "idle" && (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: "clamp(40px,10vw,60px)", marginBottom: 20 }}>{game.emoji}</div>
            <p style={{ fontSize: "clamp(17px,3.5vw,20px)", fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 10 }}>Initiate Protocol</p>
            <p style={{ fontSize: "clamp(12px,2.5vw,14px)", color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>Click when the stimulus turns green</p>
          </div>
        )}

        {phase === "waiting" && (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.5)", margin: "0 auto 20px", animation: "pulseRing 1.2s ease infinite" }} />
            <p style={{ fontSize: "clamp(14px,3vw,18px)", fontWeight: 600, color: "rgba(239,68,68,0.8)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>STANDBY...</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Await stimulus · Do not interact</p>
          </div>
        )}

        {phase === "go" && (
          <div className="anim-scale-in" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: game.accent, margin: "0 auto 20px", boxShadow: `0 0 60px ${game.accent}` }} />
            <p style={{ fontSize: "clamp(22px,5vw,32px)", fontWeight: 900, color: game.accent, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>RESPOND NOW</p>
          </div>
        )}

        {phase === "toosoon" && (
          <div className="anim-shake" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: "clamp(32px,8vw,48px)", marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: "clamp(15px,3vw,18px)", fontWeight: 700, color: "#ef4444", marginBottom: 8, fontFamily: "var(--font-mono)" }}>Pre-emptive Response</p>
            <p style={{ fontSize: 13, color: "var(--text-2)" }}>Tap to re-initiate protocol</p>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle" && "TAP ANYWHERE TO BEGIN"}
        {phase === "waiting" && "AWAITING STIMULUS..."}
        {phase === "go" && "RESPOND IMMEDIATELY"}
        {phase === "toosoon" && "PROTOCOL INTERRUPTED — TAP TO RETRY"}
      </div>
    </>
  );
}
