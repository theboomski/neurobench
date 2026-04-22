import { canonicalResultPath } from "@/lib/canonicalGamePaths";
import { gzipJsonToBase64Url } from "@/lib/resultShareCodec";
import type { ResultSharePayloadV1 } from "@/lib/resultShareTypes";
import { shareZazazaChallenge } from "@/lib/shareResultChallenge";
import type { GameData } from "@/lib/types";

const RANK_EMOJI: Record<string, string> = {
  S: "🧠",
  A: "⚡",
  B: "☕",
  C: "🤯",
  D: "🥔",
};

export function defaultRankEmoji(rankLabel: string): string {
  return RANK_EMOJI[rankLabel] ?? "⚡";
}

export type ShareReportStyleInput = {
  game: GameData;
  clinicalHeader: string;
  scoreNum: number;
  /** Shown immediately after score, e.g. "%", "/100", "🚩". */
  scoreSuffix: string;
  rank: { label: string; color: string; title: string; subtitle: string; percentileLabel?: string | undefined };
  percentile: number;
  /** Overrides brain-rank emoji when needed (e.g. love language). */
  emoji?: string;
  onCopied?: () => void;
};

export async function shareReportStyleResult(opts: ShareReportStyleInput): Promise<void> {
  const { game, clinicalHeader, scoreNum, scoreSuffix, rank, percentile } = opts;
  const emoji = opts.emoji ?? defaultRankEmoji(rank.label);
  const ogScore = `${scoreNum}${scoreSuffix}`;
  const ogLabel = rank.title;
  const ogPercentileLine = `TOP ${100 - percentile}% GLOBALLY on ZAZAZA.`;
  const payload: ResultSharePayloadV1 = {
    v: 1,
    kind: "quiz",
    category: game.category,
    id: game.id,
    clinicalHeader,
    scoreNum,
    scoreSuffix,
    rankLabel: rank.label,
    rankTitle: rank.title,
    rankSubtitle: rank.subtitle,
    rankColor: rank.color,
    rankPercentileLabel: rank.percentileLabel?.trim() ? rank.percentileLabel : "GLOBAL",
    percentile,
    accent: game.accent,
    ogScore,
    ogLabel,
    ogEmoji: emoji,
    ogPercentileLine,
    ogTestName: game.title,
  };
  const z = await gzipJsonToBase64Url(payload);
  const path = canonicalResultPath(game);
  const url = `https://zazaza.app${path}?z=${encodeURIComponent(z)}`;
  const text = `${emoji} I got ${rank.title} in ${game.title}! Score: ${ogScore}. ${ogPercentileLine} Can you beat me? ${url}`;
  await shareZazazaChallenge({
    title: `${emoji} ${rank.title} — ${game.title} | ZAZAZA`,
    text,
    url,
    onCopied: opts.onCopied,
  });
}
