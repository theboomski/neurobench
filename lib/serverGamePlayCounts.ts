import { createClient, type PostgrestError } from "@supabase/supabase-js";

function serializePostgrestError(err: PostgrestError): Record<string, string | undefined | number> {
  return {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
  };
}

/** Aggregated play counts (same data as GET /api/plays). Used by the API route and the home RSC. */
export async function fetchGamePlayCountsFromDb(): Promise<
  | { ok: true; counts: Record<string, number> }
  | { ok: false; httpStatus: number; body: Record<string, unknown> }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const key = serviceRoleKey ?? anonKey;

  if (!url || !key) {
    return {
      ok: false,
      httpStatus: 503,
      body: { error: "Plays tracking is not configured on the server (missing Supabase URL/key)." },
    };
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.rpc("get_game_play_counts");
  if (error) {
    return {
      ok: false,
      httpStatus: 500,
      body: {
        error: error.message,
        errorFull: serializePostgrestError(error),
      },
    };
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const r = row as { game_id?: string; play_count?: number | string };
    const gameId = r.game_id;
    if (!gameId) continue;
    counts[gameId] = Number(r.play_count ?? 0);
  }

  return { ok: true, counts };
}
