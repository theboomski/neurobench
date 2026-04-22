import type { Metadata } from "next";
import { canonicalResultPath } from "@/lib/canonicalGamePaths";
import { buildOgImageUrl, payloadToOgParams } from "@/lib/buildOgImageUrl";
import { ALL_GAMES } from "@/lib/games";
import { gunzipBase64UrlToJson } from "@/lib/resultShareCodec";
import { gameForPayload, isResultSharePayloadV1, payloadMatchesRoute } from "@/lib/resultShareTypes";

const SITE = "https://zazaza.app";

const defaultMeta: Metadata = {
  title: "Test Result | ZAZAZA",
  description: "Play free brain tests on ZAZAZA — no signup.",
};

export async function buildResultShareMetadata(
  z: string | undefined,
  routeCategory: string,
  routeId: string,
): Promise<Metadata> {
  if (!z) return defaultMeta;

  const decoded = await gunzipBase64UrlToJson<unknown>(decodeURIComponent(z));
  if (!isResultSharePayloadV1(decoded) || !payloadMatchesRoute(decoded, routeCategory, routeId)) {
    return defaultMeta;
  }

  const og = buildOgImageUrl(payloadToOgParams(decoded));
  const game = gameForPayload(decoded, ALL_GAMES);
  const resultPath = game ? canonicalResultPath(game) : `/${routeCategory}/${routeId}/result`;
  const pageUrl = `${SITE}${resultPath}?z=${encodeURIComponent(z)}`;
  let title = "Test Result | ZAZAZA";
  let description = "Play free brain tests on ZAZAZA — no signup.";

  if (decoded.kind === "common") {
    title = `${decoded.scoreEmoji} ${decoded.levelLabel} — ${decoded.gameTitle} | ZAZAZA`;
    description = `I scored ${decoded.normalizedScore}/100. ${decoded.percentileSentence} Can you beat me?`;
  } else if (decoded.kind === "quiz") {
    title = `${decoded.ogEmoji} ${decoded.ogLabel} — ${decoded.ogTestName} | ZAZAZA`;
    description = `I scored ${decoded.ogScore}. ${decoded.ogPercentileLine} Can you beat me?`;
  } else {
    title = `${decoded.ogEmoji} ${decoded.ogLabel} — ${decoded.ogTestName} | ZAZAZA`;
    description = `Score: ${decoded.ogScore}. ${decoded.ogPercentileLine} Can you beat me?`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: pageUrl,
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og],
    },
  };
}

/** `/games/[id]/result` uses category from payload after decode. */
export async function buildResultShareMetadataGamesRoute(z: string | undefined, routeId: string): Promise<Metadata> {
  if (!z) return defaultMeta;
  const decoded = await gunzipBase64UrlToJson<unknown>(decodeURIComponent(z));
  if (!isResultSharePayloadV1(decoded) || decoded.id !== routeId) return defaultMeta;

  const og = buildOgImageUrl(payloadToOgParams(decoded));
  const pageUrl = `${SITE}/games/${routeId}/result?z=${encodeURIComponent(z)}`;
  let title = "Test Result | ZAZAZA";
  let description = "Play free brain tests on ZAZAZA — no signup.";

  if (decoded.kind === "common") {
    title = `${decoded.scoreEmoji} ${decoded.levelLabel} — ${decoded.gameTitle} | ZAZAZA`;
    description = `I scored ${decoded.normalizedScore}/100. ${decoded.percentileSentence} Can you beat me?`;
  } else if (decoded.kind === "quiz") {
    title = `${decoded.ogEmoji} ${decoded.ogLabel} — ${decoded.ogTestName} | ZAZAZA`;
    description = `I scored ${decoded.ogScore}. ${decoded.ogPercentileLine} Can you beat me?`;
  } else {
    title = `${decoded.ogEmoji} ${decoded.ogLabel} — ${decoded.ogTestName} | ZAZAZA`;
    description = `Score: ${decoded.ogScore}. ${decoded.ogPercentileLine} Can you beat me?`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: pageUrl,
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og],
    },
  };
}
