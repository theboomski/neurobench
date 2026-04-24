import { createClient, type PostgrestError } from "@supabase/supabase-js";

const GAME_PLAYS_TABLE = "game_plays" as const;
const BATCH_SIZE = 1000;

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

  const counts: Record<string, number> = {};
  const supabase = createClient(url, key);
  let from = 0;
  while (true) {
    const to = from + BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from(GAME_PLAYS_TABLE)
      .select("game_id")
      .order("played_at", { ascending: true })
      .range(from, to);
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
    for (const row of data ?? []) {
      const gameId = (row as { game_id?: string }).game_id;
      if (!gameId) continue;
      counts[gameId] = (counts[gameId] ?? 0) + 1;
    }
    if (!data || data.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }

  return { ok: true, counts };
}
