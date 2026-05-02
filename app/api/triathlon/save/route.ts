import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedTriathlonGameId, triathlonPillarForGameId } from "@/lib/triathlonDailyGames";
import { getSupabaseServer } from "@/lib/supabase";
import { calculateZCI, normalizeTriathlonRawScore, type TriathlonScore } from "@/lib/triathlonSession";

type BodyRow = { game?: unknown; score?: unknown };

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function isTriathlonBody(
  body: unknown,
): body is { games: string[]; scores: BodyRow[]; country_code?: string | null } {
  if (body == null || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  if (!Array.isArray(o.games) || o.games.length !== 3) return false;
  if (!Array.isArray(o.scores) || o.scores.length !== 3) return false;
  if (!o.games.every((g) => typeof g === "string" && isAllowedTriathlonGameId(g))) return false;
  for (let i = 0; i < 3; i++) {
    const row = o.scores[i];
    if (row == null || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    if (typeof r.game !== "string" || r.game !== o.games[i]) return false;
    if (typeof r.score !== "number" || !Number.isFinite(r.score)) return false;
  }
  const pillars = (o.games as string[]).map((g) => triathlonPillarForGameId(g));
  if (pillars.some((p) => p == null)) return false;
  if (new Set(pillars).size !== 3) return false;
  return true;
}

function rowsToDbFields(games: string[], scores: TriathlonScore[]) {
  const byPillar = { focus: null as TriathlonScore | null, memory: null as TriathlonScore | null, speed: null as TriathlonScore | null };
  for (let i = 0; i < 3; i++) {
    const g = games[i];
    const s = scores[i];
    const p = triathlonPillarForGameId(g);
    if (p === "focus") byPillar.focus = s;
    else if (p === "memory") byPillar.memory = s;
    else if (p === "speed") byPillar.speed = s;
  }
  if (!byPillar.focus || !byPillar.memory || !byPillar.speed) return null;
  return {
    focus_game_id: byPillar.focus.game,
    focus_score_raw: byPillar.focus.score,
    focus_score_normalized: byPillar.focus.normalizedScore,
    memory_game_id: byPillar.memory.game,
    memory_score_raw: byPillar.memory.score,
    memory_score_normalized: byPillar.memory.normalizedScore,
    speed_game_id: byPillar.speed.game,
    speed_score_raw: byPillar.speed.score,
    speed_score_normalized: byPillar.speed.normalizedScore,
  };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServer();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isTriathlonBody(body)) {
    return NextResponse.json({ error: "Invalid triathlon payload" }, { status: 400 });
  }

  const { games, scores: rawScores, country_code } = body;
  const scores: TriathlonScore[] = rawScores.map((r) => {
    const game = r.game as string;
    const raw = r.score as number;
    return {
      game,
      score: raw,
      normalizedScore: normalizeTriathlonRawScore(raw, game),
    };
  });

  const zci_score = calculateZCI(scores);
  const fields = rowsToDbFields(games, scores);
  if (!fields) {
    return NextResponse.json({ error: "Invalid pillar mix" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const played_date = utcDateString();
  const country =
    typeof country_code === "string" && country_code.length === 2 ? country_code.toUpperCase() : null;

  const { data: existing, error: exErr } = await supabase
    .from("triathlon_sessions")
    .select("id,zci_score")
    .eq("user_id", userId)
    .eq("played_date", played_date)
    .maybeSingle();

  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 500 });
  }

  const row = {
    user_id: userId,
    played_date,
    ...fields,
    zci_score,
    country_code: country,
  };

  if (existing?.id != null) {
    const prev = Number(existing.zci_score);
    if (Number.isFinite(prev) && prev >= zci_score) {
      // No row update; still return stats for current best ZCI today
    } else {
      const { error: upErr } = await supabase.from("triathlon_sessions").update(row).eq("id", existing.id);
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }
  } else {
    const { error: insErr } = await supabase.from("triathlon_sessions").insert(row);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  const { data: todayRows, error: todayErr } = await supabase
    .from("triathlon_sessions")
    .select("user_id,zci_score")
    .eq("played_date", played_date);

  if (todayErr || !todayRows) {
    return NextResponse.json({ error: todayErr?.message ?? "Rank query failed" }, { status: 500 });
  }

  const total = todayRows.length;
  const savedZci = existing?.id != null && Number(existing.zci_score) >= zci_score ? Number(existing.zci_score) : zci_score;

  const strictlyLower = todayRows.filter((r) => Number(r.zci_score) < savedZci).length;
  const percentile_today = total > 0 ? Math.round((strictlyLower / total) * 100) : 100;
  const betterCount = todayRows.filter((r) => Number(r.zci_score) > savedZci).length;
  const rank = betterCount + 1;
  const top_percent_today = total > 0 ? Math.max(1, Math.min(100, Math.ceil((rank / total) * 100))) : 1;

  return NextResponse.json({
    zci_score: savedZci,
    rank,
    percentile_today,
    top_percent_today,
    total_today: total,
  });
}
