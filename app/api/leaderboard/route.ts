import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    .from("leaderboard")
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
  const { data, error } = await sb.from("leaderboard").insert(row).select("id").maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const id = data?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Insert did not return an id. Check RLS policies allow INSERT and SELECT on leaderboard." },
      { status: 500 },
    );
  }
  return NextResponse.json({ id });
}
