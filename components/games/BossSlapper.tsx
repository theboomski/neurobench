"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getRank, getPercentile, getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const TOTAL_TAPS = 10;
type Phase = "idle" | "active" | "done";

export default function BossSlapper({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [taps, setTaps]           = useState(0);
  const [ms, setMs]               = useState(0);
  const [showAd, setShowAd]       = useState(false);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [bossActive, setBossActive] = useState(false);
  const startRef = useRef<number>(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const handleBossTap = useCallback(() => {
    if (phase === "idle") {
      trackPlay(game.id);
      setPhase("active");
      setTaps(1);
      setBossActive(true);
      startRef.current = performance.now();
      playBeep("tap");
      setTimeout(() => setBossActive(false), 120);
      return;
    }
    if (phase === "active") {
      const next = taps + 1;
      playBeep("tap");
      setBossActive(true);
      setTimeout(() => setBossActive(false), 120);

      if (next >= TOTAL_TAPS) {
        const elapsed = Math.round(performance.now() - startRef.current);
        setMs(elapsed);
        setTaps(next);
        playBeep("success");
        const isNew = saveHighScore(game.id, elapsed);
        setIsNewBest(isNew);
        if (isNew) setHS(elapsed);
        setPhase("done");
      } else {
        setTaps(next);
      }
    }
  }, [phase, taps, game.id]);

  const rank = phase === "done" ? getRank(ms, game) : null;
  const pct  = phase === "done" ? getPercentile(ms, game) : 0;

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setTaps(0); setMs(0); setIsNewBest(false); };

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, ms);
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
  const remaining = TOTAL_TAPS - taps;
  const progress  = taps / TOTAL_TAPS;

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.1s ease" }} />
      </div>

      <div style={{ background: "var(--bg-card)", border: `1.5px solid ${phase === "active" ? game.accent + "60" : "var(--border)"}`, borderRadius: "var(--radius-xl)", minHeight: "clamp(280px,48vw,360px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", transition: "border-color 0.1s", userSelect: "none" }}>

        {phase === "idle" && (
          <div className="anim-fade-up" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(56px,14vw,80px)", marginBottom: 20 }}>👹</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 10 }}>Begin Stress-Relief Protocol</p>
            <p style={{ fontSize: "clamp(12px,2.5vw,14px)", color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Tap the stressor {TOTAL_TAPS}× · maximum velocity</p>
            <button onClick={handleBossTap} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              ▶ PLAY
            </button>
          </div>
        )}

        {phase === "active" && (
          <div style={{ textAlign: "center" }}>
            {/* Tap counter */}
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              {remaining} remaining
            </div>

            {/* Boss - the actual tap target */}
            <div
              onClick={handleBossTap}
              className="pressable"
              style={{
                fontSize: "clamp(64px,16vw,100px)",
                cursor: "pointer",
                display: "inline-block",
                filter: bossActive ? "brightness(1.4) saturate(1.5)" : "brightness(1)",
                transform: bossActive ? "scale(1.12) rotate(-4deg)" : "scale(1)",
                transition: "filter 0.08s, transform 0.08s",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              👹
            </div>

            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 16 }}>
              TAP {taps}/{TOTAL_TAPS}
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle" && `TAP THE BOSS ${TOTAL_TAPS}× AS FAST AS POSSIBLE`}
        {phase === "active" && `NEUTRALIZE THE STRESSOR — ${remaining} REMAINING`}
      </div>
    </>
  );
}
