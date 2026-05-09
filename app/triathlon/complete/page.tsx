"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ShareCopiedToast from "@/components/ShareCopiedToast";
import { shareContentTypeFromGameCategory } from "@/lib/analytics";
import { getSupabaseBrowser } from "@/lib/supabase";
import { getTriathlonNameForGameId, triathlonPillarForGameId, type TriathlonPillar } from "@/lib/triathlonDailyGames";
import { calculateZCI, readTriathlonSessionForCompletePage, type TriathlonSession } from "@/lib/triathlonSession";
import { shareZazazaChallenge } from "@/lib/shareResultChallenge";
import type { User } from "@supabase/supabase-js";

const ACCENT = "#D4823A";
const MEMORY_COLOR = "#8B6F47";
const SPEED_COLOR = "#c9a24d";
const SITE = "https://zazaza.app";
const CLIENT_LOG = "[triathlon/complete]";

const PILLAR_META: { pillar: TriathlonPillar; label: string; color: string }[] = [
  { pillar: "focus", label: "Focus", color: ACCENT },
  { pillar: "memory", label: "Memory", color: MEMORY_COLOR },
  { pillar: "speed", label: "Speed", color: SPEED_COLOR },
];

type SaveApiState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ok";
      rank: number;
      percentile_today: number;
      top_percent_today: number;
      total_today: number;
      zci_score: number;
    }
  | { status: "error"; message: string };

function scoreRowForPillar(session: TriathlonSession, pillar: TriathlonPillar) {
  const idx = session.games.findIndex((g) => triathlonPillarForGameId(g) === pillar);
  if (idx === -1) return null;
  return session.scores[idx] ?? null;
}

export default function TriathlonCompletePage() {
  const [session, setSession] = useState<TriathlonSession | null | "bad">(null);
  const [user, setUser] = useState<User | null | "pending">("pending");
  const [shareCopied, setShareCopied] = useState(false);
  const [displayZci, setDisplayZci] = useState(0);
  const [barFill, setBarFill] = useState<Record<TriathlonPillar, number>>({
    focus: 0,
    memory: 0,
    speed: 0,
  });
  const [saveApi, setSaveApi] = useState<SaveApiState>({ status: "idle" });
  const saveStarted = useRef(false);

  useEffect(() => {
    const data = readTriathlonSessionForCompletePage();
    if (!data) {
      setSession("bad");
    } else {
      setSession(data);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setUser(null);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  const zciTarget = useMemo(() => {
    if (!session || session === "bad") return 0;
    return calculateZCI(session.scores);
  }, [session]);

  useEffect(() => {
    if (!session || session === "bad" || zciTarget <= 0) return;
    const durationMs = 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayZci(Math.round(zciTarget * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [session, zciTarget]);

  useEffect(() => {
    if (!session || session === "bad") return;
    const delays: TriathlonPillar[] = ["focus", "memory", "speed"];
    const timers: number[] = [];
    delays.forEach((pillar, i) => {
      const row = scoreRowForPillar(session, pillar);
      const target = row ? Math.max(0, Math.min(100, row.normalizedScore)) : 0;
      timers.push(
        window.setTimeout(() => {
          const innerDuration = 520;
          const t0 = performance.now();
          const step = (now: number) => {
            const u = Math.min(1, (now - t0) / innerDuration);
            const eased = 1 - (1 - u) * (1 - u);
            setBarFill((prev) => ({ ...prev, [pillar]: Math.round(target * eased) }));
            if (u < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }, 280 + i * 160),
      );
    });
    return () => timers.forEach((id) => clearTimeout(id));
  }, [session]);

  useEffect(() => {
    if (!session || session === "bad") return;
    if (user === "pending") return;
    if (!user) return;
    if (session.scores.length !== 3) {
      console.error(CLIENT_LOG, "skip_save_incomplete_session", {
        scoreCount: session.scores.length,
        games: session.games,
      });
      setSaveApi({
        status: "error",
        message: `Could not save: expected 3 leg scores, got ${session.scores.length}.`,
      });
      return;
    }
    if (saveStarted.current) return;
    saveStarted.current = true;
    setSaveApi({ status: "loading" });

    void (async () => {
      let country_code: string | undefined;
      try {
        const geoRes = await fetch("/api/geo");
        if (geoRes.ok) {
          const geo = (await geoRes.json()) as { country_code?: string };
          if (typeof geo.country_code === "string" && geo.country_code.length === 2) {
            country_code = geo.country_code.toUpperCase();
          }
        }
      } catch {
        /* optional */
      }

      const supabase = getSupabaseBrowser();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      if (!token) {
        console.warn(CLIENT_LOG, "skip_save_no_access_token");
        setSaveApi({ status: "error", message: "No session" });
        return;
      }

      const payload = {
        games: [...session.games],
        scores: session.scores.map((s) => ({
          game: s.game,
          score: Number(s.score),
          normalizedScore: Number(s.normalizedScore),
        })),
        country_code,
      };

      console.info(CLIENT_LOG, "post_save", {
        games: payload.games,
        scores: payload.scores.map((s) => ({ game: s.game, score: s.score })),
        hasBearer: Boolean(token),
      });

      try {
        const res = await fetch("/api/triathlon/save", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          const detail = typeof json.detail === "string" ? ` (${json.detail})` : "";
          const msg = (typeof json.error === "string" ? json.error : "Save failed") + detail;
          console.error(CLIENT_LOG, "save_http_error", res.status, msg, json);
          setSaveApi({ status: "error", message: msg });
          return;
        }
        console.info(CLIENT_LOG, "save_ok", json);
        setSaveApi({
          status: "ok",
          rank: Number(json.rank),
          percentile_today: Number(json.percentile_today),
          top_percent_today: Number(json.top_percent_today),
          total_today: Number(json.total_today),
          zci_score: Number(json.zci_score),
        });
      } catch (e) {
        console.error(CLIENT_LOG, "save_fetch_throw", e);
        setSaveApi({ status: "error", message: e instanceof Error ? e.message : "Save failed" });
      }
    })();
  }, [session, user]);

  const handleShare = async () => {
    const text = `Daily Brain Triathlon — Today's ZCI: ${zciTarget}/100. Can you beat me? → zazaza.app`;
    await shareZazazaChallenge({
      title: "Daily Brain Triathlon | ZAZAZA",
      text,
      url: SITE,
      replaceUrlBeforeShare: false,
      analytics: {
        content_type: shareContentTypeFromGameCategory("brain-age"),
        item_id: "triathlon-complete",
      },
      onCopied: () => {
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2200);
      },
    });
  };

  if (session === null) {
    return (
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--text-3)",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  if (session === "bad") {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-2)", marginBottom: 20, lineHeight: 1.6 }}>
          No triathlon results found. Start a new run from the home page.
        </p>
        <Link href="/" style={{ color: ACCENT, fontWeight: 800, textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          Back to home →
        </Link>
      </div>
    );
  }

  const showSignup = user !== "pending" && !user;
  const topPct =
    saveApi.status === "ok" && Number.isFinite(saveApi.top_percent_today)
      ? saveApi.top_percent_today
      : null;

  return (
    <>
      <ShareCopiedToast show={shareCopied} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 56px" }}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--text-1)",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Triathlon Complete
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            marginBottom: 28,
          }}
        >
          Today&apos;s ZCI · ZAZAZA Cognitive Index
        </p>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderLeft: `3px solid ${ACCENT}`,
            borderRadius: "var(--radius-lg)",
            padding: "22px 18px 20px",
            marginBottom: 24,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-2)", letterSpacing: "0.06em", marginBottom: 6 }}>ZCI</div>
            <div
              style={{
                fontSize: "clamp(2.75rem, 10vw, 3.75rem)",
                fontWeight: 900,
                color: ACCENT,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {displayZci}
              <span style={{ fontSize: "clamp(1.1rem, 4vw, 1.35rem)", fontWeight: 800, color: "var(--text-2)", marginLeft: 6 }}>/100</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {PILLAR_META.map(({ pillar, label, color }) => {
              const row = scoreRowForPillar(session, pillar);
              const name = row ? getTriathlonNameForGameId(row.game) : "—";
              const norm = row ? row.normalizedScore : 0;
              const fill = barFill[pillar];
              return (
                <div key={pillar}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 10,
                      marginBottom: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-2)", minWidth: 64 }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", flex: 1, textAlign: "left" }}>{name}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "var(--font-mono)" }}>{norm}</span>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${fill}%`,
                        borderRadius: 999,
                        background: color,
                        boxShadow: `0 0 14px ${color}55`,
                        transition: "width 0.05s linear",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)", minHeight: 28 }}>
            {user !== "pending" && user && saveApi.status === "loading" && (
              <div
                style={{
                  height: 18,
                  borderRadius: 8,
                  background: "var(--bg-elevated)",
                  maxWidth: 220,
                  margin: "0 auto",
                }}
              />
            )}
            {user !== "pending" && user && saveApi.status === "error" && (
              <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-3)", margin: 0, fontFamily: "var(--font-mono)" }}>
                {saveApi.message}
              </p>
            )}
            {user !== "pending" && user && topPct != null && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--text-1)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Top {topPct}% today
              </p>
            )}
            {showSignup && (
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
                Log in to save your ZCI and see how you rank today.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="pressable"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: ACCENT,
              color: "#0a0a0f",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Share
          </button>
        </div>

        {showSignup && (
          <section
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "24px 20px",
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", marginBottom: 16, letterSpacing: "-0.02em" }}>
              Create a free account to:
            </h2>
            <ul style={{ margin: "0 0 20px", paddingLeft: 20, color: "var(--text-2)", fontSize: 14, lineHeight: 1.65 }}>
              <li>Save your daily ZCI and track progress</li>
              <li>See global triathlon rankings</li>
              <li>Create your own brackets</li>
            </ul>
            <Link
              href="/ugc/cockpit"
              className="pressable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background: `${ACCENT}18`,
                border: `1px solid ${ACCENT}`,
                color: ACCENT,
                fontSize: 14,
                fontWeight: 800,
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Create Free Account
            </Link>
          </section>
        )}

        <div style={{ textAlign: "center" }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>
            ← Home
          </Link>
        </div>
      </div>
    </>
  );
}
