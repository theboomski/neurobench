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
      return Math.round(
        pts[i].percentile - t * (pts[i].percentile - pts[i + 1].percentile)
      );
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

// ── Canvas Share Card ────────────────────────────────────────────────────────

export function generateShareCard(opts: {
  gameTitle: string;
  score: number;
  rankLabel: string;
  rankTitle: string;
  rankColor: string;
  percentile: number;
  accent: string;
  siteUrl: string;
}): string {
  const W = 800, H = 420;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a0a0f");
  bg.addColorStop(1, "#0f1720");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Accent glow
  const glow = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 250);
  glow.addColorStop(0, `${opts.accent}18`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Left card
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, 40, 40, 330, H - 80, 16); ctx.fill();
  ctx.strokeStyle = `${opts.accent}44`;
  ctx.lineWidth = 1;
  roundRect(ctx, 40, 40, 330, H - 80, 16); ctx.stroke();

  ctx.fillStyle = "rgba(148,163,184,0.7)";
  ctx.font = "600 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.gameTitle.toUpperCase(), 205, 92);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 80px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${opts.score}`, 205, 205);

  ctx.fillStyle = "rgba(148,163,184,0.6)";
  ctx.font = "500 16px -apple-system, sans-serif";
  ctx.fillText("milliseconds", 205, 240);

  ctx.fillStyle = opts.accent;
  ctx.font = "600 13px -apple-system, sans-serif";
  ctx.fillText(`TOP ${100 - opts.percentile}% WORLDWIDE`, 205, 290);

  // Right card
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, 410, 40, 350, H - 80, 16); ctx.fill();
  ctx.strokeStyle = `${opts.rankColor}44`;
  ctx.lineWidth = 1;
  roundRect(ctx, 410, 40, 350, H - 80, 16); ctx.stroke();

  ctx.fillStyle = "rgba(148,163,184,0.7)";
  ctx.font = "600 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("RANK", 585, 92);

  ctx.shadowColor = opts.rankColor;
  ctx.shadowBlur = 48;
  ctx.fillStyle = opts.rankColor;
  ctx.font = "bold 130px -apple-system, sans-serif";
  ctx.fillText(opts.rankLabel, 585, 222);
  ctx.shadowBlur = 0;

  ctx.fillStyle = opts.rankColor;
  ctx.font = "600 16px -apple-system, sans-serif";
  ctx.fillText(opts.rankTitle, 585, 260);

  // Footer
  ctx.fillStyle = "rgba(100,116,139,0.5)";
  ctx.font = "500 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(opts.siteUrl, W / 2, H - 18);

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

// ── Web Audio ────────────────────────────────────────────────────────────────

export function playBeep(type: "success" | "fail" | "go") {
  try {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    const cfg = {
      success: { freq: 880, dur: 0.12, type: "sine" as OscillatorType },
      fail:    { freq: 200, dur: 0.28, type: "sawtooth" as OscillatorType },
      go:      { freq: 660, dur: 0.09, type: "sine" as OscillatorType },
    }[type];
    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freq, ac.currentTime);
    gain.gain.setValueAtTime(0.25, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + cfg.dur);
    osc.start(); osc.stop(ac.currentTime + cfg.dur);
  } catch { /* silent */ }
}

// ── Click / Popularity Tracking ──────────────────────────────────────────────

export function recordGameClick(gameId: string) {
  if (typeof window === "undefined") return;
  const key = `nb_clicks_${gameId}`;
  const prev = parseInt(localStorage.getItem(key) ?? "0", 10);
  localStorage.setItem(key, String(prev + 1));
}

export function getGameClicks(gameId: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`nb_clicks_${gameId}`) ?? "0", 10);
}
