import { NextRequest, NextResponse } from "next/server";
import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { TRASH_TALK_ALLOWLIST } from "@/lib/leaderboardTrashTalk";
import { leaderboardUsesAscendingScore } from "@/lib/leaderboardConfig";

const LEADERBOARD_TABLE = "leaderboard" as const;
const SESSION_TABLE = "leaderboard_sessions" as const;
const NICKNAME_HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

type ScoreRange = { min: number; max: number };
const SCORE_LIMITS_BY_GAME_ID: Record<string, ScoreRange> = {
  // Reported abuse targets (quick hard guardrails).
  "color-conflict": { min: 0, max: 300 },
  "color-conflict-2": { min: 0, max: 300 },
  "sequence-memory": { min: 0, max: 100 },
  "number-memory": { min: 1, max: 100 },
  "instant-comparison": { min: 0, max: 300 },
  "visual-memory": { min: 0, max: 100 },
  "typing-speed": { min: 1, max: 300 },
  "angle-precision": { min: 0, max: 180 },
};

/**
 * Rank a new row would get (1 = best) before insert: all existing ties rank ahead of the newcomer
 * (same as `.order(created_at, { ascending: true })` for equal scores).
 */
async function placementRankForNewScore(
  supabase: SupabaseClient,
  gameId: string,
  score: number,
  scoreAsc: boolean,
): Promise<number> {
  if (scoreAsc) {
    const { count: cLt } = await supabase
      .from(LEADERBOARD_TABLE)
      .select("*", { head: true, count: "exact" })
      .eq("game_id", gameId)
      .lt("score", score);
    const { count: cEq } = await supabase
      .from(LEADERBOARD_TABLE)
      .select("*", { head: true, count: "exact" })
      .eq("game_id", gameId)
      .eq("score", score);
    return 1 + (cLt ?? 0) + (cEq ?? 0);
  }
  const { count: cGt } = await supabase
    .from(LEADERBOARD_TABLE)
    .select("*", { head: true, count: "exact" })
    .eq("game_id", gameId)
    .gt("score", score);
  const { count: cEq } = await supabase
    .from(LEADERBOARD_TABLE)
    .select("*", { head: true, count: "exact" })
    .eq("game_id", gameId)
    .eq("score", score);
  return 1 + (cGt ?? 0) + (cEq ?? 0);
}

/** Log every enumerable field + common PostgREST fields (no secrets). */
function logSupabaseError(context: string, err: unknown) {
  if (!err || typeof err !== "object") {
    console.error(context, String(err));
    return;
  }
  const o = err as Record<string, unknown> & PostgrestError;
  const snapshot = {
    message: o.message,
    code: o.code,
    details: o.details,
    hint: o.hint,
    status: (o as { status?: number }).status,
    statusCode: (o as { statusCode?: number }).statusCode,
    name: (o as { name?: string }).name,
    raw: JSON.stringify(o, Object.getOwnPropertyNames(o)),
  };
  console.error(context, JSON.stringify(snapshot, null, 2));
}

function serializePostgrestError(err: PostgrestError): Record<string, string | undefined | number> {
  return {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
  };
}

function getSigningSecret() {
  return process.env.LEADERBOARD_SIGNING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

function signPayload(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("gameId");
  if (!gameId || gameId.length > 64) {
    return NextResponse.json({ error: "invalid_game" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const key = serviceRoleKey ?? anonKey;

  if (!url || !key) {
    console.error("[leaderboard GET] missing env", {
      hasUrl: Boolean(url),
      hasServiceRole: Boolean(serviceRoleKey),
      hasAnon: Boolean(anonKey),
    });
    return NextResponse.json({ error: "not_configured", rows: [] }, { status: 503 });
  }

  const usingServiceRole = Boolean(serviceRoleKey);
  console.log("[leaderboard GET] createClient (runtime)", {
    hasUrl: true,
    keyMode: usingServiceRole ? "SUPABASE_SERVICE_ROLE_KEY" : "anon_fallback",
  });

  const supabase = createClient(url, key);

  const asc = leaderboardUsesAscendingScore(gameId);
  const { data, error } = await supabase
    .from(LEADERBOARD_TABLE)
    .select("id, game_id, nickname, score, country_code, created_at, trash_talk")
    .eq("game_id", gameId)
    .order("score", { ascending: asc })
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    logSupabaseError("[leaderboard GET] Supabase select error (exact)", error);
    return NextResponse.json(
      {
        error: error.message,
        errorFull: serializePostgrestError(error),
      },
      { status: 500 },
    );
  }

  const previewRaw = req.nextUrl.searchParams.get("previewRankForScore");
  let previewRank: number | undefined;
  if (previewRaw != null && previewRaw !== "") {
    const pv = Number(previewRaw);
    if (Number.isFinite(pv)) {
      previewRank = await placementRankForNewScore(supabase, gameId, Math.round(pv), asc);
    }
  }

  const payload: { rows: NonNullable<typeof data>; previewRank?: number } = { rows: data ?? [] };
  if (previewRank !== undefined) payload.previewRank = previewRank;
  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const key = serviceRoleKey ?? anonKey;

  if (!url || !key) {
    console.error("[leaderboard POST] missing env", {
      hasUrl: Boolean(url),
      hasServiceRole: Boolean(serviceRoleKey),
      hasAnon: Boolean(anonKey),
    });
    return NextResponse.json({ error: "Leaderboard is not configured on the server (missing Supabase URL/key)." }, { status: 503 });
  }

  const usingServiceRole = Boolean(serviceRoleKey);
  console.log("[leaderboard POST] createClient (runtime)", {
    hasUrl: true,
    keyMode: usingServiceRole ? "SUPABASE_SERVICE_ROLE_KEY" : "anon_fallback",
  });

  /**
   * supabase-js passes this key as Authorization: Bearer <key> (and apikey header).
   * Prefer SUPABASE_SERVICE_ROLE_KEY on the server so RLS does not block inserts.
   */
  const supabase = createClient(url, key);

  let body: {
    gameId?: string;
    nickname?: string;
    score?: number;
    countryCode?: string;
    trashTalk?: string | null;
    nonce?: string;
    expiresAt?: string;
    signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const gameId = typeof body.gameId === "string" ? body.gameId.slice(0, 64) : "";
  const nickname = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 20) : "";
  const score = typeof body.score === "number" && Number.isFinite(body.score) ? Math.round(body.score) : NaN;
  const countryRaw = typeof body.countryCode === "string" ? body.countryCode : "US";
  const country_code = countryRaw.slice(0, 2).toUpperCase() || "US";
  const nonce = typeof body.nonce === "string" ? body.nonce.trim() : "";
  const expiresAt = typeof body.expiresAt === "string" ? body.expiresAt.trim() : "";
  const signature = typeof body.signature === "string" ? body.signature.trim().toLowerCase() : "";

  let trash_talk: string | null = null;
  if (body.trashTalk != null && body.trashTalk !== "") {
    const raw = typeof body.trashTalk === "string" ? body.trashTalk.trim() : "";
    if (raw && !TRASH_TALK_ALLOWLIST.has(raw)) {
      return NextResponse.json({ error: "Invalid trash talk selection" }, { status: 400 });
    }
    trash_talk = raw || null;
  }

  if (!gameId || !nickname) {
    return NextResponse.json({ error: "gameId and nickname are required" }, { status: 400 });
  }
  if (!Number.isFinite(score)) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }
  if (!nonce || !expiresAt || !signature) {
    return NextResponse.json({ error: "Missing leaderboard session proof" }, { status: 400 });
  }
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
    return NextResponse.json({ error: "Leaderboard session expired" }, { status: 400 });
  }
  const secret = getSigningSecret();
  if (!secret) return NextResponse.json({ error: "missing_signing_secret" }, { status: 503 });
  const expectedSignature = signPayload(secret, `${nonce}.${gameId}.${expiresAt}`);
  if (!safeEqualHex(signature, expectedSignature)) {
    return NextResponse.json({ error: "Invalid leaderboard session signature" }, { status: 400 });
  }
  if (!NICKNAME_HAS_LETTER_OR_NUMBER.test(nickname)) {
    return NextResponse.json({ error: "Nickname must contain at least one letter or number" }, { status: 400 });
  }

  const asc = leaderboardUsesAscendingScore(gameId);
  const fallbackRange: ScoreRange = asc
    ? { min: 1, max: 3_600_000 } // timing-based leaderboards (ms). 1h cap.
    : { min: 0, max: 10_000 }; // score-based leaderboards.
  const allowedRange = SCORE_LIMITS_BY_GAME_ID[gameId] ?? fallbackRange;
  if (score < allowedRange.min || score > allowedRange.max) {
    return NextResponse.json(
      {
        error: `Score out of allowed range for this game (${allowedRange.min}..${allowedRange.max})`,
      },
      { status: 400 },
    );
  }

  if (trash_talk != null) {
    const rank = await placementRankForNewScore(supabase, gameId, score, asc);
    if (rank > 3) {
      return NextResponse.json(
        { error: "Trash talk is only allowed when your score reaches the global top 3." },
        { status: 400 },
      );
    }
  }

  const row: { game_id: string; nickname: string; score: number; country_code: string; trash_talk?: string | null } = {
    game_id: gameId,
    nickname,
    score,
    country_code,
  };
  if (trash_talk != null) row.trash_talk = trash_talk;

  const { data: sessionClaim, error: sessionClaimError } = await supabase
    .from(SESSION_TABLE)
    .update({ used: true })
    .eq("nonce", nonce)
    .eq("game_id", gameId)
    .eq("expires_at", expiresAt)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select("nonce")
    .limit(1);
  if (sessionClaimError) {
    return NextResponse.json({ error: "Failed to verify leaderboard session" }, { status: 500 });
  }
  if (!sessionClaim?.length) {
    return NextResponse.json({ error: "Leaderboard session is invalid or already used" }, { status: 400 });
  }

  console.log(`[leaderboard POST] insert → "${LEADERBOARD_TABLE}"`, {
    game_id: row.game_id,
    nickname: row.nickname,
    score: row.score,
    country_code: row.country_code,
    has_trash_talk: Boolean(trash_talk),
  });

  const { data, error } = await supabase.from(LEADERBOARD_TABLE).insert(row).select("id");

  if (error) {
    logSupabaseError("[leaderboard POST] Supabase insert error (exact)", error);
    const payload = serializePostgrestError(error);
    return NextResponse.json(
      {
        error: error.message,
        errorFull: payload,
      },
      { status: 400 },
    );
  }

  const inserted = Array.isArray(data) ? data : [];
  const id = inserted[0]?.id;

  if (!id) {
    console.error("[leaderboard POST] insert returned no rows / no id (exact)", {
      table: LEADERBOARD_TABLE,
      rawData: data,
      rowCount: inserted.length,
    });
    return NextResponse.json(
      {
        error:
          "Insert reported success but no id was returned. Usually RLS blocks SELECT after INSERT, or the row was not written. Prefer SUPABASE_SERVICE_ROLE_KEY on Vercel. Table: \"leaderboard\".",
        errorFull: { data, rowCount: inserted.length },
      },
      { status: 500 },
    );
  }

  console.log("[leaderboard POST] insert OK", { id, table: LEADERBOARD_TABLE });
  return NextResponse.json({ id });
}
