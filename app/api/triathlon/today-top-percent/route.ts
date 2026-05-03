import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedTriathlonGameId } from "@/lib/triathlonDailyGames";

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Leg score for this game from a row, or null if this session did not include the game. */
function legNormalizedForGame(
  row: {
    focus_game_id: string;
    memory_game_id: string;
    speed_game_id: string;
    focus_score_normalized: number;
    memory_score_normalized: number;
    speed_score_normalized: number;
  },
  gameId: string,
): number | null {
  if (row.focus_game_id === gameId) return Number(row.focus_score_normalized);
  if (row.memory_game_id === gameId) return Number(row.memory_score_normalized);
  if (row.speed_game_id === gameId) return Number(row.speed_score_normalized);
  return null;
}

/**
 * GET ?gameId=&normalizedScore=
 * Returns whether to show "Top X% among today's triathlon players" for this leg score,
 * using triathlon_sessions for today's UTC date only.
 */
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("gameId");
  const normalizedParam = req.nextUrl.searchParams.get("normalizedScore");

  if (!gameId || !isAllowedTriathlonGameId(gameId)) {
    return NextResponse.json({ error: "Invalid gameId" }, { status: 400 });
  }

  const myScore = normalizedParam != null ? Number(normalizedParam) : NaN;
  if (!Number.isFinite(myScore)) {
    return NextResponse.json({ error: "Invalid normalizedScore" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ show: false });
  }

  const supabase = createClient(url, anon);
  const playedDate = utcDateString();

  const { data, error } = await supabase
    .from("triathlon_sessions")
    .select(
      "focus_game_id,memory_game_id,speed_game_id,focus_score_normalized,memory_score_normalized,speed_score_normalized",
    )
    .eq("played_date", playedDate);

  if (error || !data?.length) {
    return NextResponse.json({ show: false });
  }

  type Row = {
    focus_game_id: string;
    memory_game_id: string;
    speed_game_id: string;
    focus_score_normalized: number;
    memory_score_normalized: number;
    speed_score_normalized: number;
  };

  const peerScores: number[] = [];
  for (const row of data as Row[]) {
    const v = legNormalizedForGame(row, gameId);
    if (v != null && Number.isFinite(v)) peerScores.push(v);
  }

  // No other completions today that included this game → nothing to compare.
  if (peerScores.length === 0) {
    return NextResponse.json({ show: false });
  }

  const allScores = [...peerScores, myScore];
  const rank = allScores.filter((s) => s > myScore).length + 1;
  const n = allScores.length;
  const topPercent = Math.max(1, Math.min(100, Math.round((100 * rank) / n)));

  return NextResponse.json({ show: true, topPercent });
}
