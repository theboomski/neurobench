import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UGC_CATEGORY_PAGE_SIZE, fetchUgcCategoryHub, ugcBalanceCategoryMetadata } from "@/lib/ugcSeo";
import { getSupabaseServer } from "@/lib/supabase";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const { page: pageRaw } = await searchParams;
  const supabase = getSupabaseServer();
  if (!supabase) return {};
  const pageNum = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const hub = await fetchUgcCategoryHub(supabase, categorySlug, "balance", pageNum);
  if (!hub) notFound();
  const totalPages = Math.max(1, Math.ceil(hub.total / UGC_CATEGORY_PAGE_SIZE));
  if (pageNum > totalPages) notFound();
  return ugcBalanceCategoryMetadata(hub.category.name, hub.category.slug, pageNum);
}

export default async function UgcBalanceCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { categorySlug } = await params;
  const { page: pageRaw } = await searchParams;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();
  const pageNum = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const hub = await fetchUgcCategoryHub(supabase, categorySlug, "balance", pageNum);
  if (!hub) notFound();
  const totalPages = Math.max(1, Math.ceil(hub.total / UGC_CATEGORY_PAGE_SIZE));
  if (pageNum > totalPages) notFound();

  const basePath = `/ugc/balance/category/${hub.category.slug}`;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 56px" }}>
      <nav style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>
        <Link href="/">Home</Link>
        {" / "}
        <Link href="/ugc">UGC</Link>
        {" / "}
        <span style={{ color: "var(--text-1)" }}>{hub.category.name}</span>
      </nav>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Best {hub.category.name} Balance</h1>
      <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 14 }}>Public balance games in this category, sorted by plays.</p>
      <ul style={{ marginTop: 20, listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {hub.games.map((g) => (
          <li key={g.id}>
            <Link
              href={`/ugc/balance/${g.slug}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ fontWeight: 700 }}>{g.title}</span>
              <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{g.play_count} plays</span>
            </Link>
          </li>
        ))}
      </ul>
      {hub.games.length === 0 && <p style={{ marginTop: 16, color: "var(--text-2)" }}>No public games in this category yet.</p>}
      {totalPages > 1 && (
        <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {pageNum > 1 && (
            <Link
              href={pageNum === 2 ? basePath : `${basePath}?page=${pageNum - 1}`}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
            >
              Previous
            </Link>
          )}
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
            Page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link
              href={`${basePath}?page=${pageNum + 1}`}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
            >
              Next
            </Link>
          )}
        </div>
      )}
      <p style={{ marginTop: 20, fontSize: 12, color: "var(--text-3)" }}>
        <Link href="/ugc" style={{ color: "var(--text-2)" }}>
          All UGC
        </Link>
      </p>
    </div>
  );
}
