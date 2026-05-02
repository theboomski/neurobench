"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";
import { getTriathlonNameForGameId } from "@/lib/triathlonDailyGames";
import type { User } from "@supabase/supabase-js";

const ACCENT = "#00FF94";
const PAGE_SIZE = 20;

type TriathlonRow = {
  id: string;
  played_date: string;
  focus_game_id: string;
  focus_score_raw: number | string;
  focus_score_normalized: number | string;
  memory_game_id: string;
  memory_score_raw: number | string;
  memory_score_normalized: number | string;
  speed_game_id: string;
  speed_score_raw: number | string;
  speed_score_normalized: number | string;
  zci_score: number | string;
};

function n(v: number | string | null | undefined): number {
  const x = typeof v === "string" ? Number(v) : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function parseIsoDateUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

/** `sortedDesc` = newest first; counts consecutive calendar days from most recent play. */
function consecutiveStreakDays(sortedDescDates: string[]): number {
  const uniq = [...new Set(sortedDescDates)].sort((a, b) => b.localeCompare(a));
  if (uniq.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < uniq.length; i++) {
    const diff = (parseIsoDateUtc(uniq[i - 1]) - parseIsoDateUtc(uniq[i])) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function legCell(gameId: string, raw: number | string, norm: number | string) {
  const name = getTriathlonNameForGameId(gameId);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: "var(--text-1)", fontSize: 13, lineHeight: 1.35, wordBreak: "break-word" }}>{name}</div>
      <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
        {Math.round(n(raw))} <span style={{ color: "var(--text-3)" }}>({Math.round(n(norm))})</span>
      </div>
    </div>
  );
}

export default function TriathlonDashboardPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null | "pending">("pending");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [bestZci, setBestZci] = useState<number | null>(null);
  const [latest, setLatest] = useState<TriathlonRow | null>(null);
  const [streak, setStreak] = useState(0);
  const [trend7, setTrend7] = useState<TriathlonRow[]>([]);
  const [rows, setRows] = useState<TriathlonRow[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const load = useCallback(async () => {
    if (!supabase || !user || user === "pending") return;
    setLoadError(null);
    const uid = user.id;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [countRes, bestRes, datesRes, latestRes, pageRes, trendRes] = await Promise.all([
      supabase.from("triathlon_sessions").select("*", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("triathlon_sessions").select("zci_score").eq("user_id", uid).order("zci_score", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("triathlon_sessions").select("played_date").eq("user_id", uid).order("played_date", { ascending: false }).limit(5000),
      supabase.from("triathlon_sessions").select("*").eq("user_id", uid).order("played_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("triathlon_sessions").select("*").eq("user_id", uid).order("played_date", { ascending: false }).range(from, to),
      supabase.from("triathlon_sessions").select("*").eq("user_id", uid).order("played_date", { ascending: false }).limit(7),
    ]);

    const err =
      countRes.error?.message ??
      bestRes.error?.message ??
      datesRes.error?.message ??
      latestRes.error?.message ??
      pageRes.error?.message ??
      trendRes.error?.message;
    if (err) {
      setLoadError(err);
      return;
    }

    setTotalCount(countRes.count ?? 0);
    setBestZci(bestRes.data?.zci_score != null ? n(bestRes.data.zci_score) : null);
    setLatest((latestRes.data as TriathlonRow | null) ?? null);
    const dates = (datesRes.data ?? []).map((r) => (r as { played_date: string }).played_date);
    setStreak(consecutiveStreakDays(dates));
    setTrend7(((trendRes.data ?? []) as TriathlonRow[]).slice().reverse());
    setRows((pageRes.data ?? []) as TriathlonRow[]);
  }, [supabase, user, page]);

  useEffect(() => {
    if (user === "pending" || user === null) return;
    void load();
  }, [load, user]);

  if (!supabase) {
    return (
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "40px 20px", color: "var(--text-2)" }}>
        Supabase is not configured in this build.
      </div>
    );
  }

  if (user === "pending") {
    return (
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "40px 20px", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-1)", marginBottom: 12 }}>Brain Triathlon</h1>
        <p style={{ color: "var(--text-2)", lineHeight: 1.6, marginBottom: 24 }}>Log in to see your ZCI dashboard and history.</p>
        <Link
          href="/ugc/cockpit"
          style={{
            display: "inline-flex",
            padding: "14px 20px",
            borderRadius: "var(--radius-md)",
            background: ACCENT,
            color: "#0a0a0f",
            fontWeight: 900,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Open Cockpit
        </Link>
      </div>
    );
  }

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const maxTrend = Math.max(1, ...trend7.map((r) => n(r.zci_score)));

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 56px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <Link href="/ugc/cockpit" style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>
          ← Cockpit
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <Link href="/triathlon" style={{ fontSize: 13, color: ACCENT, fontFamily: "var(--font-mono)", textDecoration: "none" }}>
          Start triathlon →
        </Link>
      </div>

      <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-1)", marginBottom: 6 }}>
        Brain Triathlon
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>ZCI history, streaks, and performance at a glance.</p>

      {loadError && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-2)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
          }}
        >
          {loadError}
        </div>
      )}

      {total === 0 && !loadError ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderLeft: `3px solid ${ACCENT}`,
            borderRadius: "var(--radius-lg)",
            padding: "28px 22px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--text-2)", lineHeight: 1.65, marginBottom: 20 }}>You haven&apos;t completed a triathlon yet.</p>
          <Link
            href="/triathlon"
            className="pressable"
            style={{
              display: "inline-flex",
              padding: "14px 22px",
              borderRadius: "var(--radius-md)",
              background: ACCENT,
              color: "#0a0a0f",
              fontWeight: 900,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Start Daily Triathlon
          </Link>
        </div>
      ) : (
        <>
          <section
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${ACCENT}`,
              borderRadius: "var(--radius-lg)",
              padding: "22px 18px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", letterSpacing: "0.08em", marginBottom: 8 }}>LATEST ZCI</div>
            <div style={{ fontSize: "clamp(2.5rem, 9vw, 3.25rem)", fontWeight: 900, color: ACCENT, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {latest ? Math.round(n(latest.zci_score)) : "—"}
              <span style={{ fontSize: "clamp(1rem, 3.5vw, 1.2rem)", fontWeight: 700, color: "var(--text-2)", marginLeft: 8 }}>/100</span>
            </div>
            {latest?.played_date && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{latest.played_date} UTC</div>
            )}
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <StatCard label="Best ZCI ever" value={bestZci != null ? String(Math.round(bestZci)) : "—"} sub="/100" />
            <StatCard label="Total completed" value={String(total)} sub="sessions" />
            <StatCard label="Current streak" value={String(streak)} sub="consecutive days" />
          </div>

          <section
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "18px 14px",
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-1)", marginBottom: 14, letterSpacing: "-0.02em" }}>7-day trend</h2>
            {trend7.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>No sessions yet.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, minHeight: 140, paddingTop: 8 }}>
                {trend7.map((r) => {
                  const z = n(r.zci_score);
                  const hPct = Math.round((z / maxTrend) * 100);
                  return (
                    <div key={r.id} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, fontFamily: "var(--font-mono)" }}>{z}</div>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 44,
                          height: 110,
                          borderRadius: 8,
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          padding: 4,
                          boxSizing: "border-box",
                        }}
                      >
                        <div
                          title={`${r.played_date}: ${z}`}
                          style={{
                            width: "100%",
                            height: `${Math.max(8, hPct)}%`,
                            borderRadius: 6,
                            background: ACCENT,
                            boxShadow: `0 0 12px ${ACCENT}44`,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                        {r.played_date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "16px 0",
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-1)", marginBottom: 12, paddingLeft: 16, paddingRight: 16 }}>Full history</h2>
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Date</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Focus</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Memory</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Speed</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>ZCI</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px", verticalAlign: "top", fontFamily: "var(--font-mono)", color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {r.played_date}
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>{legCell(r.focus_game_id, r.focus_score_raw, r.focus_score_normalized)}</td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>{legCell(r.memory_game_id, r.memory_score_raw, r.memory_score_normalized)}</td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>{legCell(r.speed_game_id, r.speed_score_raw, r.speed_score_normalized)}</td>
                      <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 900, color: ACCENT, fontFamily: "var(--font-mono)", fontSize: 14 }}>
                        {Math.round(n(r.zci_score))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > PAGE_SIZE && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px 0",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="pressable"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: page <= 0 ? "var(--bg-elevated)" : "var(--bg-card)",
                    color: "var(--text-1)",
                    fontWeight: 700,
                    cursor: page <= 0 ? "not-allowed" : "pointer",
                    opacity: page <= 0 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  className="pressable"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: page >= totalPages - 1 ? "var(--bg-elevated)" : "var(--bg-card)",
                    color: "var(--text-1)",
                    fontWeight: 700,
                    cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                    opacity: page >= totalPages - 1 ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 14px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text-1)", letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{sub}</div>
    </div>
  );
}
