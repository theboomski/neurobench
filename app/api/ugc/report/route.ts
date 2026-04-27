import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

type Body = {
  gameId?: string;
  slug?: string;
  gameType?: "brackets" | "balance";
  reason?: string;
  details?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.gameId || !body.slug || !body.gameType || !body.reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ error: "Server unavailable" }, { status: 500 });

  const { error } = await supabase.from("ugc_reports").insert({
    game_id: body.gameId,
    game_slug: body.slug,
    game_type: body.gameType,
    reason: body.reason,
    details: body.details?.slice(0, 2000) ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
