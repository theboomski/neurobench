import type { ResultSharePayloadV1 } from "@/lib/resultShareTypes";
import { isResultSharePayloadV1 } from "@/lib/resultShareTypes";
import { getSupabaseServer } from "@/lib/supabase";

const SHARED_RESULTS_TABLE = "shared_results";
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 8;

function generateShortId(): string {
  let out = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    const idx = Math.floor(Math.random() * ID_ALPHABET.length);
    out += ID_ALPHABET[idx];
  }
  return out;
}

export async function createSharedResult(payload: ResultSharePayloadV1): Promise<string | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  // Retry a few times in case of short-id collision.
  for (let i = 0; i < 5; i++) {
    const id = generateShortId();
    const { error } = await supabase.from(SHARED_RESULTS_TABLE).insert({ id, payload });
    if (!error) return id;
  }
  return null;
}

export async function getSharedResultPayload(shortId: string): Promise<ResultSharePayloadV1 | null> {
  if (!/^[a-z0-9]{8}$/.test(shortId)) return null;
  const supabase = getSupabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase.from(SHARED_RESULTS_TABLE).select("payload").eq("id", shortId).maybeSingle();
  if (error || !data) return null;
  const payload = (data as { payload?: unknown }).payload;
  if (!isResultSharePayloadV1(payload)) return null;
  return payload;
}
