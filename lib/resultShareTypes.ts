import type { GameData } from "@/lib/types";

export type ResultTone = "brain" | "office" | "focus" | "vocab";

/** Standardized ZAZAZA result share payload (v1). */
export type ResultSharePayloadV1 =
  | {
      v: 1;
      kind: "common";
      category: string;
      id: string;
      gameTitle: string;
      primaryColor: string;
      normalizedScore: number;
      rawScore: number;
      rawUnit: string;
      percentile: number;
      rank: { label: string; color: string; title: string; subtitle: string };
      levelLabel: string;
      scoreEmoji: string;
      percentileSentence: string;
      killerLine: string;
      benchmarkNote: string | null;
      tone: ResultTone;
    }
  | {
      v: 1;
      kind: "quiz";
      category: string;
      id: string;
      clinicalHeader: string;
      scoreNum: number;
      scoreSuffix: string;
      rankLabel: string;
      rankTitle: string;
      rankSubtitle: string;
      rankColor: string;
      rankPercentileLabel: string;
      percentile: number;
      accent: string;
      ogScore: string;
      ogLabel: string;
      ogEmoji: string;
      ogPercentileLine: string;
      ogTestName: string;
    }
  | {
      v: 1;
      kind: "sudoku";
      category: "brain-age";
      id: "sudoku";
      accent: string;
      totalScore: number;
      levelsCompleted: number;
      avgSec: number;
      difficultyLabel: string;
      outcomeLine: string;
      ogScore: string;
      ogLabel: string;
      ogEmoji: string;
      ogPercentileLine: string;
      ogTestName: string;
    };

export function isResultSharePayloadV1(x: unknown): x is ResultSharePayloadV1 {
  if (!x || typeof x !== "object") return false;
  const o = x as { v?: unknown; kind?: unknown };
  return o.v === 1 && (o.kind === "common" || o.kind === "quiz" || o.kind === "sudoku");
}

export function payloadMatchesRoute(
  p: ResultSharePayloadV1,
  category: string,
  id: string,
): boolean {
  return p.category === category && p.id === id;
}

export function gameForPayload(p: ResultSharePayloadV1, games: GameData[]): GameData | undefined {
  return games.find(g => g.category === p.category && g.id === p.id);
}
