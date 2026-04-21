"use client";

import { useMemo } from "react";
import type { GameData } from "@/lib/types";
import InterstitialAd from "@/components/InterstitialAd";

type AnalysisTone = "brain" | "office" | "focus" | "vocab";

interface Props {
  game: GameData;
  rawScore: number;
  rawUnit: string;
  normalizedScore: number;
  percentile: number;
  rank: { label: string; color: string; title: string; subtitle: string };
  highScore: number | null;
  isNewBest: boolean;
  showAd: boolean;
  onAdDone: () => void;
  onRetry: () => void;
  tone: AnalysisTone;
}

function getLevel(normalized: number) {
  if (normalized >= 90) return { label: "MAIN CHARACTER ENERGY ✨", tier: 1 };
  if (normalized >= 75) return { label: "BUILT DIFFERENT 💪", tier: 2 };
  if (normalized >= 55) return { label: "THE AVERAGE JOE 🧔", tier: 3 };
  if (normalized >= 30) return { label: "STILL LOADING... ⏳", tier: 4 };
  return { label: "NPC VIBES 🤖", tier: 5 };
}

function getScoreEmoji(normalized: number): string {
  if (normalized >= 90) return "👑";
  if (normalized >= 75) return "🦾";
  if (normalized >= 55) return "😎";
  if (normalized >= 30) return "🫠";
  return "💩";
}

function getKillerLine(tone: AnalysisTone, normalized: number): string {
  const tier = normalized >= 90 ? 1 : normalized >= 75 ? 2 : normalized >= 55 ? 3 : normalized >= 30 ? 4 : 5;
  if (tier === 1) return "This run has 'drop the screenshot and start a group chat fight' energy.";
  if (tier === 2) return "You are one hot streak away from becoming everyone else's worst nightmare.";
  if (tier === 3) return "Respectable baseline, but your villain arc clearly has better stats than this.";
  if (tier === 4) return "You are not losing. You are collecting data for a brutal comeback.";
  return "This is cinematic rock bottom. Perfect setup for the greatest redemption post.";

  // kept for future tone-specific variants
  if (tone === "focus") {
    if (normalized >= 96) return "Your attention span is sharper than a samurai blade.";
    if (normalized >= 86) return "You focus like deadlines are personal.";
    if (normalized >= 71) return "You stay locked in longer than most.";
    return "You are one streak away from a comeback arc.";
  }
  if (tone === "office") {
    if (normalized >= 96) return "You make decisions like a boardroom final boss.";
    if (normalized >= 86) return "Your office instincts are dangerously efficient.";
    if (normalized >= 71) return "You can outplay chaos in most work battles.";
    return "Your strategy patch is loading - big upgrade incoming.";
  }
  if (tone === "vocab") {
    if (normalized >= 96) return "Your vocabulary has executive aura.";
    if (normalized >= 86) return "You weaponize words better than most people argue.";
    if (normalized >= 71) return "Your language game is clean and competitive.";
    return "Your next reading streak could change this whole graph.";
  }
  if (normalized >= 96) return "You have the brain of a Silicon Valley founder.";
  if (normalized >= 86) return "Your processing speed is unfair to everyone else.";
  if (normalized >= 71) return "You are operating above the global default settings.";
  return "Your ceiling is much higher than this run.";
}

function getNeonByScore(normalized: number): string {
  if (normalized >= 90) return "radial-gradient(120% 90% at 25% 10%, rgba(250,204,21,0.45) 0%, rgba(59,130,246,0.28) 45%, rgba(2,6,23,0.95) 100%)";
  if (normalized >= 70) return "radial-gradient(120% 90% at 25% 10%, rgba(56,189,248,0.42) 0%, rgba(139,92,246,0.30) 45%, rgba(2,6,23,0.95) 100%)";
  if (normalized >= 50) return "radial-gradient(120% 90% at 25% 10%, rgba(168,85,247,0.35) 0%, rgba(37,99,235,0.25) 50%, rgba(2,6,23,0.96) 100%)";
  return "radial-gradient(120% 90% at 25% 10%, rgba(71,85,105,0.35) 0%, rgba(30,41,59,0.25) 50%, rgba(2,6,23,0.98) 100%)";
}

export default function CommonResult({
  game,
  rawScore,
  rawUnit,
  normalizedScore,
  percentile,
  rank,
  highScore,
  isNewBest,
  showAd,
  onAdDone,
  onRetry,
  tone,
}: Props) {
  const level = getLevel(normalizedScore);
  const scoreEmoji = getScoreEmoji(normalizedScore);
  const killerLine = getKillerLine(tone, normalizedScore);
  const WORLD_POP = 8_200_000_000;
  const higherThanPct = Math.max(0, Math.min(99.9, percentile));
  const peopleCount = Math.round((higherThanPct / 100) * WORLD_POP);
  const peopleBillions = (peopleCount / 1_000_000_000).toFixed(2);
  const shareText = useMemo(() => {
    const link = `https://zazaza.app/${game.category}/${game.id}`;
    return `I scored ${normalizedScore} points in ${game.title}. Can you beat me? 🕹️ ${link}`;
  }, [game.category, game.id, game.title, normalizedScore]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${game.title} - ZAZAZA`, text: shareText });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      alert("Copied challenge text to clipboard.");
    } catch {
      window.prompt("Copy this challenge text:", shareText);
    }
  };

  return (
    <>
      {showAd && <InterstitialAd onDone={onAdDone} />}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          className="anim-scale-in"
          style={{
            width: "min(92vw, 420px)",
            aspectRatio: "9 / 16",
            background: getNeonByScore(normalizedScore),
            border: "1px solid rgba(255,255,255,0.22)",
            borderTop: `2px solid ${rank.color}`,
            borderRadius: 24,
            padding: "20px 16px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 8,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: `0 20px 60px rgba(0,0,0,0.45), 0 0 50px ${rank.color}33`,
            overflow: "hidden",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          }}
        >
        <div style={{ fontSize: 106, lineHeight: 1, marginTop: 2, marginBottom: 2 }}>
          {scoreEmoji}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, fontFamily: "var(--font-mono)" }}>
          ZAZAZA Result
        </div>

        <div style={{ margin: "12px auto 8px", width: "100%", borderRadius: 18, padding: "16px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: `0 0 36px ${rank.color}66 inset` }}>
        <div style={{ fontSize: "clamp(72px,21vw,122px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "#fff", textShadow: `0 0 22px ${rank.color}, 0 10px 28px rgba(0,0,0,0.45)` }}>
          {normalizedScore}
          <span style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 700, color: "rgba(255,255,255,0.95)", marginLeft: 10, letterSpacing: "0.04em" }}>/100</span>
        </div>
        </div>

        <div style={{ fontSize: 38, color: "#fff", fontWeight: 900, marginBottom: 8, letterSpacing: "-0.01em", lineHeight: 1.03, textWrap: "balance" as never, textShadow: `2px 0 rgba(255,0,128,0.28), -2px 0 rgba(0,255,255,0.28), 0 0 18px ${rank.color}` }}>
          {level.label}
        </div>
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.96)", fontWeight: 700, marginBottom: 6, lineHeight: 1.3, textWrap: "balance" as never }}>
          You scored {normalizedScore} in {game.title}.
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.95)", marginBottom: 6, lineHeight: 1.3 }}>
          Your score is higher than {higherThanPct.toFixed(1)}% of the world - about {peopleBillions} billion people.
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "rgba(209,250,229,0.98)", marginBottom: 10, lineHeight: 1.25, textWrap: "balance" as never, textShadow: `0 0 18px ${rank.color}66`, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "10px 12px" }}>
          {killerLine}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "nowrap", marginTop: "auto" }}>
          <button onClick={onRetry} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "14px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", width: "50%", fontFamily: "inherit", letterSpacing: "0.01em" }}>
            ▶ PLAY AGAIN
          </button>
          <button onClick={handleShare} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 12px", fontSize: 12, fontWeight: 900, cursor: "pointer", width: "50%", fontFamily: "inherit", letterSpacing: "0.01em" }}>
            Share Result
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
