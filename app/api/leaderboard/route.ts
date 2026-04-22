import { NextRequest, NextResponse } from "next/server";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

const LEADERBOARD_TABLE = "leaderboard" as const;

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

const ASC_SCORE = new Set([
  "reaction-time",
  "temporal-pulse",
  "dont-blink",
  "angle-precision",
  "boss-slapper",
]);

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

  const asc = ASC_SCORE.has(gameId);
  const { data, error } = await supabase
    .from(LEADERBOARD_TABLE)
    .select("id, game_id, nickname, score, country_code, created_at")
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
  return NextResponse.json({ rows: data ?? [] });
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

  let body: { gameId?: string; nickname?: string; score?: number; countryCode?: string };
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

  if (!gameId || !nickname) {
    return NextResponse.json({ error: "gameId and nickname are required" }, { status: 400 });
  }
  if (!Number.isFinite(score)) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  const row = { game_id: gameId, nickname, score, country_code };

  console.log(`[leaderboard POST] insert → "${LEADERBOARD_TABLE}"`, {
    game_id: row.game_id,
    nickname: row.nickname,
    score: row.score,
    country_code: row.country_code,
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
