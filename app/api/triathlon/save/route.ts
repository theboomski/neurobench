import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedTriathlonGameId, triathlonPillarForGameId } from "@/lib/triathlonDailyGames";
import { calculateZCI, normalizeTriathlonRawScore, type TriathlonScore } from "@/lib/triathlonSession";

const LOG_PREFIX = "[triathlon/save]";

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Ensure each leg has a score row; tolerate wrong play order by game id. */
function normalizeBodyScores(
  games: string[],
  rawScores: unknown[],
): { ok: true; scores: TriathlonScore[] } | { ok: false; reason: string } {
  if (games.length !== 3 || rawScores.length !== 3) {
    return { ok: false, reason: "games_or_scores_length" };
  }
  const rows: { game: string; score: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const row = rawScores[i];
    if (row == null || typeof row !== "object") {
      return { ok: false, reason: `score_row_${i}_not_object` };
    }
    const r = row as Record<string, unknown>;
    const game = r.game;
    const raw = toFiniteNumber(r.score);
    if (typeof game !== "string" || !isAllowedTriathlonGameId(game)) {
      return { ok: false, reason: `score_row_${i}_bad_game` };
    }
    if (raw == null) {
      return { ok: false, reason: `score_row_${i}_bad_score` };
    }
    rows.push({ game, score: raw });
  }

  const byGame = new Map(rows.map((x) => [x.game, x]));
  const aligned: TriathlonScore[] = [];
  for (const g of games) {
    const hit = byGame.get(g);
    if (!hit) {
      return { ok: false, reason: `missing_score_for_game_${g}` };
    }
    aligned.push({
      game: g,
      score: hit.score,
      normalizedScore: normalizeTriathlonRawScore(hit.score, g),
    });
  }

  const pillars = games.map((g) => triathlonPillarForGameId(g));
  if (pillars.some((p) => p == null)) {
    return { ok: false, reason: "unknown_pillar_game" };
  }
  if (new Set(pillars).size !== 3) {
    return { ok: false, reason: "pillar_set_not_three" };
  }

  return { ok: true, scores: aligned };
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
    console.warn(LOG_PREFIX, "missing_bearer_token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error(LOG_PREFIX, "missing_supabase_url_or_anon_key");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const supabaseUser = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData.user) {
    console.warn(LOG_PREFIX, "auth_get_user_failed", userErr?.message ?? "no_user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch (e) {
    console.warn(LOG_PREFIX, "invalid_json", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body == null || typeof body !== "object") {
    console.warn(LOG_PREFIX, "body_not_object");
    return NextResponse.json({ error: "Invalid triathlon payload" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  if (!Array.isArray(o.games) || o.games.length !== 3 || !o.games.every((g) => typeof g === "string" && isAllowedTriathlonGameId(g))) {
    console.warn(LOG_PREFIX, "invalid_games", { games: o.games });
    return NextResponse.json({ error: "Invalid triathlon payload" }, { status: 400 });
  }
  const games = o.games as string[];
  if (!Array.isArray(o.scores) || o.scores.length !== 3) {
    console.warn(LOG_PREFIX, "invalid_scores_array", { len: Array.isArray(o.scores) ? o.scores.length : null });
    return NextResponse.json({ error: "Invalid triathlon payload" }, { status: 400 });
  }

  const normalized = normalizeBodyScores(games, o.scores);
  if (!normalized.ok) {
    console.warn(LOG_PREFIX, "normalize_scores_failed", normalized.reason, {
      games,
      scoreGames: (o.scores as unknown[]).map((r) =>
        r && typeof r === "object" ? (r as Record<string, unknown>).game : null,
      ),
    });
    return NextResponse.json({ error: "Invalid triathlon payload", detail: normalized.reason }, { status: 400 });
  }

  const { scores } = normalized;
  const zci_score = calculateZCI(scores);
  const fields = rowsToDbFields(games, scores);
  if (!fields) {
    console.warn(LOG_PREFIX, "rowsToDbFields_failed", { games });
    return NextResponse.json({ error: "Invalid pillar mix" }, { status: 400 });
  }

  const played_date = utcDateString();
  const countryRaw = o.country_code;
  const country =
    typeof countryRaw === "string" && countryRaw.length === 2 ? countryRaw.toUpperCase() : null;

  const row = {
    user_id: userId,
    played_date,
    ...fields,
    zci_score,
    country_code: country,
  };

  const { data: existing, error: exErr } = await supabaseUser
    .from("triathlon_sessions")
    .select("id,zci_score")
    .eq("user_id", userId)
    .eq("played_date", played_date)
    .maybeSingle();

  if (exErr) {
    console.error(LOG_PREFIX, "select_existing_failed", exErr.message, exErr.code);
    return NextResponse.json({ error: exErr.message }, { status: 500 });
  }

  if (existing?.id != null) {
    const prev = Number(existing.zci_score);
    if (Number.isFinite(prev) && prev >= zci_score) {
      // keep existing row
    } else {
      const { error: upErr } = await supabaseUser.from("triathlon_sessions").update(row).eq("id", existing.id);
      if (upErr) {
        console.error(LOG_PREFIX, "update_failed", upErr.message, upErr.code, { userId: userId.slice(0, 8) });
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }
  } else {
    const { error: insErr } = await supabaseUser.from("triathlon_sessions").insert(row);
    if (insErr) {
      const code = (insErr as { code?: string }).code;
      if (code === "23505") {
        const { data: raced, error: raceReadErr } = await supabaseUser
          .from("triathlon_sessions")
          .select("id,zci_score")
          .eq("user_id", userId)
          .eq("played_date", played_date)
          .maybeSingle();
        if (raceReadErr || !raced?.id) {
          console.error(LOG_PREFIX, "insert_duplicate_but_reread_failed", insErr.message, raceReadErr?.message);
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
        const prev = Number(raced.zci_score);
        if (!Number.isFinite(prev) || prev < zci_score) {
          const { error: upErr2 } = await supabaseUser.from("triathlon_sessions").update(row).eq("id", raced.id);
          if (upErr2) {
            console.error(LOG_PREFIX, "post_race_update_failed", upErr2.message);
            return NextResponse.json({ error: upErr2.message }, { status: 500 });
          }
        }
      } else {
        console.error(LOG_PREFIX, "insert_failed", insErr.message, code, { userId: userId.slice(0, 8) });
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }
  }

  const { data: todayRows, error: todayErr } = await supabaseUser
    .from("triathlon_sessions")
    .select("user_id,zci_score")
    .eq("played_date", played_date);

  if (todayErr || !todayRows) {
    console.error(LOG_PREFIX, "today_rank_query_failed", todayErr?.message);
    return NextResponse.json({ error: todayErr?.message ?? "Rank query failed" }, { status: 500 });
  }

  const { data: finalRow, error: finalErr } = await supabaseUser
    .from("triathlon_sessions")
    .select("zci_score")
    .eq("user_id", userId)
    .eq("played_date", played_date)
    .maybeSingle();

  if (finalErr) {
    console.error(LOG_PREFIX, "final_row_read_failed", finalErr.message);
  }

  const savedZci = Number(finalRow?.zci_score);
  const zciOut = Number.isFinite(savedZci) ? savedZci : zci_score;

  const total = todayRows.length;
  const strictlyLower = todayRows.filter((r) => Number(r.zci_score) < zciOut).length;
  const percentile_today = total > 0 ? Math.round((strictlyLower / total) * 100) : 100;
  const betterCount = todayRows.filter((r) => Number(r.zci_score) > zciOut).length;
  const rank = betterCount + 1;
  const top_percent_today = total > 0 ? Math.max(1, Math.min(100, Math.ceil((rank / total) * 100))) : 1;

  console.info(LOG_PREFIX, "ok", { userId: userId.slice(0, 8), played_date, zci_score: zciOut, rank, total });

  return NextResponse.json({
    zci_score: zciOut,
    rank,
    percentile_today,
    top_percent_today,
    total_today: total,
  });
}
