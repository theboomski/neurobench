import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SESSION_TTL_MS = 3 * 60 * 60 * 1000;
const SESSION_TABLE = "leaderboard_sessions" as const;

function getSigningSecret() {
  return process.env.LEADERBOARD_SIGNING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

function signPayload(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Leaderboard session is not configured on the server." }, { status: 503 });
  }

  let body: { gameId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const gameId = typeof body.gameId === "string" ? body.gameId.slice(0, 64) : "";
  if (!gameId) return NextResponse.json({ error: "invalid_game" }, { status: 400 });

  const secret = getSigningSecret();
  if (!secret) return NextResponse.json({ error: "missing_signing_secret" }, { status: 503 });

  const supabase = createClient(url, serviceRoleKey);
  await supabase.from(SESSION_TABLE).delete().lt("expires_at", new Date().toISOString());

  const nonce = crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(8).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { error } = await supabase.from(SESSION_TABLE).insert({
    nonce,
    game_id: gameId,
    expires_at: expiresAt,
    used: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = `${nonce}.${gameId}.${expiresAt}`;
  const signature = signPayload(secret, payload);
  return NextResponse.json({ nonce, expiresAt, signature });
}
