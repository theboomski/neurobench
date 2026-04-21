import type { GameData } from "@/lib/types";

// Standardized 100-point scale:
// - 0 raw performance always maps to 0
// - Percentile is the main signal
// - Small raw-score precision bonus avoids flat ties at low levels
export function normalizeTo100FromPercentile(percentile: number, rawScore: number): number {
  if (rawScore <= 0) return 0;
  const p = Math.max(0, Math.min(100, percentile));
  const precisionBonus = Math.min(4, Math.log10(rawScore + 1) * 2);
  return Math.round(Math.max(0, Math.min(100, p + precisionBonus)));
}

export function resolveResultTone(game: GameData): "brain" | "office" | "focus" | "vocab" {
  if (game.category === "office-iq") return "office";
  if (game.category === "focus-test") return "focus";
  if (game.category === "word-iq") return "vocab";
  if (game.category === "korean-tv") return "focus";
  return "brain";
}
