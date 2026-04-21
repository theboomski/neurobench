import { NextRequest, NextResponse } from "next/server";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

const LEADERBOARD_TABLE = "leaderboard" as const;

function serializeSupabaseError(err: PostgrestError): Record<string, string | undefined | number> {
  return {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
  };
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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
  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ error: "not_configured", rows: [] }, { status: 503 });
  }
  const asc = ASC_SCORE.has(gameId);
  const { data, error } = await sb
    .from(LEADERBOARD_TABLE)
    .select("id, game_id, nickname, score, country_code, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: asc })
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) {
    return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ error: "Leaderboard is not configured on the server (missing Supabase URL/key)." }, { status: 503 });
  }
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

  console.log(`[leaderboard POST] inserting into "${LEADERBOARD_TABLE}"`, {
    game_id: row.game_id,
    nickname: row.nickname,
    score: row.score,
    country_code: row.country_code,
  });

  const { data, error } = await sb.from(LEADERBOARD_TABLE).insert(row).select("id");

  if (error) {
    const payload = serializeSupabaseError(error);
    console.error("[leaderboard POST] Supabase insert error (full):", JSON.stringify(payload, null, 2));
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
    console.error("[leaderboard POST] insert returned no rows / no id", {
      table: LEADERBOARD_TABLE,
      rawData: data,
      rowCount: inserted.length,
    });
    return NextResponse.json(
      {
        error:
          "Insert reported success but no id was returned. Usually RLS blocks SELECT after INSERT, or the row was not written. Check policies on table \"leaderboard\".",
        errorFull: { data, rowCount: inserted.length },
      },
      { status: 500 },
    );
  }

  console.log("[leaderboard POST] insert OK", { id, table: LEADERBOARD_TABLE });
  return NextResponse.json({ id });
}
