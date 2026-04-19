import type { GameData, GameRank } from "./types";

// ── Rank & Percentile ────────────────────────────────────────────────────────

export function getRank(ms: number, game: GameData): GameRank {
  return (
    game.stats.ranks.find((r) => ms <= r.maxMs) ??
    game.stats.ranks[game.stats.ranks.length - 1]
  );
}

export function getPercentile(ms: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (ms <= pts[0].ms) return pts[0].percentile;
  if (ms >= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (ms >= pts[i].ms && ms <= pts[i + 1].ms) {
      const t = (ms - pts[i].ms) / (pts[i + 1].ms - pts[i].ms);
      return Math.round(pts[i].percentile - t * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

// ── LocalStorage ─────────────────────────────────────────────────────────────

export function getHighScore(gameId: string): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(`nb_hs_${gameId}`);
  return v ? parseInt(v, 10) : null;
}

export function saveHighScore(gameId: string, ms: number): boolean {
  if (typeof window === "undefined") return false;
  const prev = getHighScore(gameId);
  if (prev === null || ms < prev) {
    localStorage.setItem(`nb_hs_${gameId}`, String(ms));
    return true;
  }
  return false;
}

export function recordClick(gameId: string) {
  if (typeof window === "undefined") return;
  const key = `nb_clicks_${gameId}`;
  localStorage.setItem(key, String(parseInt(localStorage.getItem(key) ?? "0", 10) + 1));
}

export function getClicks(gameId: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`nb_clicks_${gameId}`) ?? "0", 10);
}

// ── Brain Age & Rank Mappings ─────────────────────────────────────────────────

const RANK_EMOJI: Record<string, string> = {
  S: "🧠", A: "⚡", B: "☕", C: "🤯", D: "🥔",
};

const BRAIN_AGE: Record<string, { age: number; label: string }> = {
  S: { age: 18, label: "Peak Performance" },
  A: { age: 25, label: "Sharp & Fast" },
  B: { age: 35, label: "Above Average" },
  C: { age: 50, label: "Room to Improve" },
  D: { age: 72, label: "Time to Train 🥔" },
};

export function getBrainAge(rankLabel: string): { age: number; label: string } {
  return BRAIN_AGE[rankLabel] ?? BRAIN_AGE["C"];
}

// ── Canvas Viral Report Card (9:16 stories format) ───────────────────────────

export function generateReportCard(opts: {
  gameTitle: string;
  clinicalTitle: string;
  score: number;
  unit: string;
  rankLabel: string;
  rankTitle: string;
  rankSubtitle: string;
  rankColor: string;
  percentile: number;
  accent: string;
  siteUrl: string;
}): string {
  const W = 540, H = 960;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0A0A0F";
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Top accent bar
  ctx.fillStyle = opts.accent;
  ctx.fillRect(0, 0, W, 4);

  // Logo
  ctx.fillStyle = opts.accent;
  ctx.font = "900 18px monospace";
  ctx.textAlign = "center";
  ctx.fillText("ZAZAZA", W / 2, 52);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "400 10px monospace";
  ctx.fillText(opts.clinicalTitle.toUpperCase(), W / 2, 70);

  // Brain Age — BIG headline
  const brainAgeMap: Record<string, number> = { S: 18, A: 25, B: 35, C: 50, D: 72 };
  const brainAge = brainAgeMap[opts.rankLabel] ?? 50;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "500 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText("MY BRAIN AGE IS", W / 2, 138);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 120px -apple-system, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${brainAge}`, W / 2, 256);
  ctx.fillStyle = opts.accent;
  ctx.font = "700 16px monospace";
  ctx.fillText("CAN YOU BEAT ME?", W / 2, 284);

  // Percentile bar
  const bx = 60, by = 268, bw = W - 120, bh = 4;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, bx, by, bw, bh, 2); ctx.fill();
  ctx.fillStyle = opts.accent;
  roundRect(ctx, bx, by, bw * (opts.percentile / 100), bh, 2); ctx.fill();
  ctx.fillStyle = opts.accent;
  ctx.font = "700 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`TOP ${100 - opts.percentile}% GLOBALLY`, W / 2, 300);

  // Big emoji (150px+)
  const emoji = RANK_EMOJI[opts.rankLabel] ?? "⚡";
  if (opts.rankLabel === "D") {
    // Glitch effect for D
    ctx.globalAlpha = 0.25;
    ctx.font = "160px serif";
    ctx.fillStyle = "#FF0000";
    ctx.fillText(emoji, W / 2 - 5, 490);
    ctx.fillStyle = "#00FFFF";
    ctx.fillText(emoji, W / 2 + 5, 490);
    ctx.globalAlpha = 1;
    ctx.shadowColor = "#EF4444";
    ctx.shadowBlur = 40;
  } else {
    ctx.shadowColor = opts.accent;
    ctx.shadowBlur = 24;
  }
  ctx.font = "160px serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(emoji, W / 2, 490);
  ctx.shadowBlur = 0;

  // Rank
  ctx.shadowColor = opts.rankColor;
  ctx.shadowBlur = 40;
  ctx.fillStyle = opts.rankColor;
  ctx.font = "900 80px -apple-system, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`RANK ${opts.rankLabel}`, W / 2, 596);
  ctx.shadowBlur = 0;

  ctx.fillStyle = opts.rankColor;
  ctx.font = "700 18px -apple-system, Arial, sans-serif";
  ctx.fillText(opts.rankTitle.toUpperCase(), W / 2, 634);

  // Subtitle word wrap
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "italic 15px -apple-system, Arial, sans-serif";
  const words = opts.rankSubtitle.split(" ");
  let line = "", sy = 668;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > 400 && line !== "") {
      ctx.fillText(line.trim(), W / 2, sy); line = word + " "; sy += 22;
    } else line = test;
  }
  ctx.fillText(line.trim(), W / 2, sy);

  // CTA button
  const btnY = H - 120, btnW = 420, btnH = 54, btnX = (W - btnW) / 2;
  ctx.fillStyle = opts.accent;
  roundRect(ctx, btnX, btnY, btnW, btnH, 12); ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.font = "700 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`WHAT'S YOUR BRAIN AGE? → ${opts.siteUrl}`, W / 2, btnY + 32);

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(0, H - 38, W, 1);
  ctx.font = "400 10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillText(opts.siteUrl, W / 2, H - 16);

  return canvas.toDataURL("image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Audio ────────────────────────────────────────────────────────────────────
// Singleton AudioContext — avoids "suspended" on first interaction
let _ac: AudioContext | null = null;
function getAC(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ac) _ac = new AudioContext();
    if (_ac.state === "suspended") _ac.resume();
    return _ac;
  } catch { return null; }
}

export function playBeep(type: "go" | "success" | "fail" | "tap") {
  try {
    const ac = getAC();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    const cfg = {
      go:      { freq: 660, dur: 0.08, type: "sine" as OscillatorType, vol: 0.2 },
      success: { freq: 880, dur: 0.15, type: "sine" as OscillatorType, vol: 0.25 },
      fail:    { freq: 180, dur: 0.3,  type: "sawtooth" as OscillatorType, vol: 0.2 },
      tap:     { freq: 440, dur: 0.04, type: "sine" as OscillatorType, vol: 0.12 },
    }[type];
    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freq, ac.currentTime);
    gain.gain.setValueAtTime(cfg.vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + cfg.dur);
    osc.start(); osc.stop(ac.currentTime + cfg.dur);
  } catch { /* silent */ }
}

// ── Quiz Option Shuffler ──────────────────────────────────────────────────────
export interface QuizOption {
  text: string;
  score: number;
}

export function shuffleOptions(options: QuizOption[]): QuizOption[] {
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
