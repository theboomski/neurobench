const SITE = "https://zazaza.app";

export type OgImageParams = {
  score: string;
  label: string;
  emoji: string;
  percentile: string;
  testName: string;
  primary_color: string;
};

function stripHash(hex: string): string {
  return hex.replace(/^#/, "").replace(/[^0-9a-fA-F]/g, "").slice(0, 6) || "00FF94";
}

export function buildOgImageUrl(p: OgImageParams): string {
  const sp = new URLSearchParams({
    score: p.score.slice(0, 80),
    label: p.label.slice(0, 120),
    emoji: p.emoji.slice(0, 20),
    percentile: p.percentile.slice(0, 400),
    testName: p.testName.slice(0, 120),
    primary_color: stripHash(p.primary_color),
  });
  return `${SITE}/api/og?${sp.toString()}`;
}

export function payloadToOgParams(p: import("@/lib/resultShareTypes").ResultSharePayloadV1): OgImageParams {
  if (p.kind === "common") {
    return {
      score: `${p.normalizedScore}/100`,
      label: p.levelLabel,
      emoji: p.scoreEmoji,
      percentile: p.percentileSentence,
      testName: p.gameTitle,
      primary_color: stripHash(p.primaryColor),
    };
  }
  if (p.kind === "quiz") {
    return {
      score: p.ogScore,
      label: p.ogLabel,
      emoji: p.ogEmoji,
      percentile: p.ogPercentileLine,
      testName: p.ogTestName,
      primary_color: stripHash(p.accent),
    };
  }
  return {
    score: p.ogScore,
    label: p.ogLabel,
    emoji: p.ogEmoji,
    percentile: p.ogPercentileLine,
    testName: p.ogTestName,
    primary_color: stripHash(p.accent),
  };
}
