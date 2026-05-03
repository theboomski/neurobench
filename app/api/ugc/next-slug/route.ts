import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { slugifyTitle } from "@/lib/ugc";

/**
 * Resolve a globally unique `ugc_games.slug`: kebab-case title, then `-2`, `-3`, … on collision.
 * Uses RPC `ugc_slug_taken` (security definer) so visibility/RLS does not hide existing slugs
 * (e.g. `closed` games) — otherwise anon would get false availability and insert fails on unique slug.
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });

  const title = req.nextUrl.searchParams.get("title")?.trim() ?? "";
  const base = slugifyTitle(title) || "untitled";

  for (let suffix = 0; suffix < 500; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;

    const { data: taken, error: rpcErr } = await supabase.rpc("ugc_slug_taken", { p_slug: candidate });
    if (rpcErr) {
      // Backward compatibility if migration not applied yet: direct select (may miss closed games under RLS+anon)
      const { data, error } = await supabase.from("ugc_games").select("id").eq("slug", candidate).maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data) return NextResponse.json({ slug: candidate });
      continue;
    }
    if (taken === true) continue;
    if (taken === false) return NextResponse.json({ slug: candidate });
  }

  return NextResponse.json({ error: "Too many slug collisions" }, { status: 409 });
}
