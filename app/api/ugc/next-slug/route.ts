import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { slugifyTitle } from "@/lib/ugc";

/** Resolve a globally unique `ugc_games.slug`: kebab-case title, then `-2`, `-3`, … on collision (no random tail). */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });

  const title = req.nextUrl.searchParams.get("title")?.trim() ?? "";
  const base = slugifyTitle(title) || "untitled";

  for (let suffix = 0; suffix < 500; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const { data, error } = await supabase.from("ugc_games").select("id").eq("slug", candidate).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ slug: candidate });
  }

  return NextResponse.json({ error: "Too many slug collisions" }, { status: 409 });
}
