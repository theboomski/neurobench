import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  gameId?: string;
  winnerItemId?: string | null;
  winnerOption?: "a" | "b" | null;
  itemMatchStats?: { id: string; won: boolean }[];
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.gameId) return NextResponse.json({ error: "Missing gameId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !serviceRole || !anon) return NextResponse.json({ ok: false }, { status: 500 });

  const admin = createClient(url, serviceRole);
  const authClient = createClient(url, anon);

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const user = token ? (await authClient.auth.getUser(token)).data.user : null;

  const { data: gameRow } = await admin
    .from("ugc_games")
    .select("id,visibility,play_count")
    .eq("id", body.gameId)
    .single();
  if (!gameRow?.id) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (gameRow.visibility === "closed") {
    return NextResponse.json({ error: "Game is closed" }, { status: 403 });
  }
  const currentPlayCount = Number(gameRow?.play_count ?? 0);
  await admin.from("ugc_games").update({ play_count: currentPlayCount + 1 }).eq("id", body.gameId);

  if (body.itemMatchStats?.length) {
    for (const stat of body.itemMatchStats) {
      const { data } = await admin
        .from("ugc_brackets_items")
        .select("match_count,win_count")
        .eq("id", stat.id)
        .single();
      const matchCount = Number(data?.match_count ?? 0) + 1;
      const winCount = Number(data?.win_count ?? 0) + (stat.won ? 1 : 0);
      await admin.from("ugc_brackets_items").update({ match_count: matchCount, win_count: winCount }).eq("id", stat.id);
    }
  }

  if (user?.id) {
    await admin.from("ugc_play_history").insert({
      user_id: user.id,
      game_id: body.gameId,
      winner_item_id: body.winnerItemId ?? null,
      winner_option: body.winnerOption ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
