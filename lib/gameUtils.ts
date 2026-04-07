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

// ── Canvas Report Card ───────────────────────────────────────────────────────

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
  const W = 900, H = 480;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 45) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 45) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Top accent bar
  ctx.fillStyle = opts.accent;
  ctx.fillRect(0, 0, W, 3);

  // Header area
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 3, W, 70);

  // Header text
  ctx.fillStyle = opts.accent;
  ctx.font = "700 11px monospace";
  ctx.textAlign = "left";
  ctx.fillText("NEUROBENCH ASSESSMENT REPORT", 36, 32);

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "400 11px monospace";
  ctx.fillText(opts.clinicalTitle.toUpperCase(), 36, 54);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "400 11px monospace";
  ctx.textAlign = "right";
  ctx.fillText(new Date().toISOString().split("T")[0], W - 36, 32);
  ctx.fillText("SUBJECT: ANONYMOUS", W - 36, 54);

  // Left panel — score
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, 36, 95, 360, H - 131, 12); ctx.fill();
  ctx.strokeStyle = `${opts.accent}30`;
  ctx.lineWidth = 1;
  roundRect(ctx, 36, 95, 360, H - 131, 12); ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("MEASUREMENT RESULT", 216, 130);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 ${opts.score > 9999 ? 64 : 80}px -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${opts.score}`, 216, 235);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 16px monospace";
  ctx.fillText(opts.unit, 216, 262);

  // Percentile bar
  const barX = 60, barY = 290, barW = 312, barH = 6;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, barX, barY, barW, barH, 3); ctx.fill();
  ctx.fillStyle = opts.accent;
  roundRect(ctx, barX, barY, barW * (opts.percentile / 100), barH, 3); ctx.fill();

  ctx.fillStyle = opts.accent;
  ctx.font = "700 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`TOP ${100 - opts.percentile}% GLOBALLY`, 216, 322);

  // Game title
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "500 12px -apple-system, sans-serif";
  ctx.fillText(opts.gameTitle, 216, 360);

  // Right panel — rank
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, 420, 95, W - 456, H - 131, 12); ctx.fill();
  ctx.strokeStyle = `${opts.rankColor}40`;
  ctx.lineWidth = 1;
  roundRect(ctx, 420, 95, W - 456, H - 131, 12); ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("COGNITIVE CLASSIFICATION", 660, 130);

  // Rank letter
  ctx.shadowColor = opts.rankColor;
  ctx.shadowBlur = 48;
  ctx.fillStyle = opts.rankColor;
  ctx.font = "900 140px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.rankLabel, 660, 252);
  ctx.shadowBlur = 0;

  // Rank title
  ctx.fillStyle = opts.rankColor;
  ctx.font = "700 18px -apple-system, sans-serif";
  ctx.fillText(opts.rankTitle, 660, 286);

  // Rank subtitle (humorous)
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "italic 13px -apple-system, sans-serif";
  const words = opts.rankSubtitle.split(" ");
  let line = "", y = 316;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > 380 && line !== "") {
      ctx.fillText(line.trim(), 660, y); line = word + " "; y += 20;
    } else { line = test; }
  }
  ctx.fillText(line.trim(), 660, y);

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(0, H - 36, W, 1);
  ctx.font = "400 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${opts.siteUrl}  ·  Free Cognitive Assessment Platform`, W / 2, H - 14);

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

export function playBeep(type: "go" | "success" | "fail" | "tap") {
  try {
    const ac = new AudioContext();
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
