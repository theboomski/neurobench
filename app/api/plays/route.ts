import { NextRequest, NextResponse } from "next/server";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

const GAME_PLAYS_TABLE = "game_plays" as const;

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

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const key = serviceRoleKey ?? anonKey;

  if (!url || !key) {
    console.error("[plays GET] missing env", {
      hasUrl: Boolean(url),
      hasServiceRole: Boolean(serviceRoleKey),
      hasAnon: Boolean(anonKey),
    });
    return NextResponse.json({ error: "Plays tracking is not configured on the server (missing Supabase URL/key)." }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from(GAME_PLAYS_TABLE).select("game_id");
  if (error) {
    logSupabaseError("[plays GET] Supabase select error", error);
    return NextResponse.json(
      {
        error: error.message,
        errorFull: serializePostgrestError(error),
      },
      { status: 500 },
    );
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const gameId = (row as { game_id?: string }).game_id;
    if (!gameId) continue;
    counts[gameId] = (counts[gameId] ?? 0) + 1;
  }

  return NextResponse.json({ counts });
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const key = serviceRoleKey ?? anonKey;

  if (!url || !key) {
    console.error("[plays POST] missing env", {
      hasUrl: Boolean(url),
      hasServiceRole: Boolean(serviceRoleKey),
      hasAnon: Boolean(anonKey),
    });
    return NextResponse.json({ error: "Plays tracking is not configured on the server (missing Supabase URL/key)." }, { status: 503 });
  }

  const usingServiceRole = Boolean(serviceRoleKey);
  console.log("[plays POST] createClient (runtime)", {
    hasUrl: true,
    keyMode: usingServiceRole ? "SUPABASE_SERVICE_ROLE_KEY" : "anon_fallback",
  });

  const supabase = createClient(url, key);

  let body: { gameId?: string; countryCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const gameId = typeof body.gameId === "string" ? body.gameId.slice(0, 64) : "";
  const countryRaw = typeof body.countryCode === "string" ? body.countryCode : "US";
  const country_code = countryRaw.slice(0, 2).toUpperCase() || "US";
  const played_at = new Date().toISOString();

  if (!gameId) {
    return NextResponse.json({ error: "gameId is required" }, { status: 400 });
  }

  const row = { game_id: gameId, country_code, played_at };

  console.log(`[plays POST] insert → "${GAME_PLAYS_TABLE}"`, row);

  const { error } = await supabase.from(GAME_PLAYS_TABLE).insert(row);

  if (error) {
    logSupabaseError("[plays POST] Supabase insert error (exact)", error);
    return NextResponse.json(
      {
        error: error.message,
        errorFull: serializePostgrestError(error),
      },
      { status: 400 },
    );
  }

  console.log("[plays POST] insert OK", { table: GAME_PLAYS_TABLE, game_id: gameId });
  return NextResponse.json({ ok: true });
}
