import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ categories: [] });

  const { data, error } = await supabase
    .from("ugc_categories")
    .select("id,name,slug,is_active,order")
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error) return NextResponse.json({ categories: [] }, { status: 200 });
  return NextResponse.json({ categories: data ?? [] });
}
