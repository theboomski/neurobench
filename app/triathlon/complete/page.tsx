"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ShareCopiedToast from "@/components/ShareCopiedToast";
import { shareContentTypeFromGameCategory } from "@/lib/analytics";
import { getSupabaseBrowser } from "@/lib/supabase";
import { getTriathlonNameForGameId } from "@/lib/triathlonDailyGames";
import { brainScoreFromTriathlonScores, readTriathlonSessionForCompletePage, type TriathlonSession } from "@/lib/triathlonSession";
import { shareZazazaChallenge } from "@/lib/shareResultChallenge";
import type { User } from "@supabase/supabase-js";

const ACCENT = "#00FF94";
const SITE = "https://zazaza.app";

export default function TriathlonCompletePage() {
  const [session, setSession] = useState<TriathlonSession | null | "bad">(null);
  const [user, setUser] = useState<User | null | "pending">("pending");
  const [shareCopied, setShareCopied] = useState(false);

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

  const brainScore = useMemo(() => {
    if (!session || session === "bad") return 0;
    return brainScoreFromTriathlonScores(session.scores);
  }, [session]);

  const handleShare = async () => {
    const text = `Daily Brain Triathlon — Brain Score: ${brainScore}. Can you beat me? → zazaza.app`;
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
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px", textAlign: "center", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (session === "bad") {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-2)", marginBottom: 20, lineHeight: 1.6 }}>No triathlon results found. Start a new run from the home page.</p>
        <Link href="/" style={{ color: ACCENT, fontWeight: 800, textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          Back to home →
        </Link>
      </div>
    );
  }

  const showSignup = user !== "pending" && !user;

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
            marginBottom: 28,
          }}
        >
          Triathlon Complete
        </h1>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderLeft: `3px solid ${ACCENT}`,
            borderRadius: "var(--radius-lg)",
            padding: "20px 18px",
            marginBottom: 24,
          }}
        >
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {session.scores.map((row, i) => (
              <li
                key={`${row.game}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{getTriathlonNameForGameId(row.game)}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT, fontFamily: "var(--font-mono)" }}>{row.score}</span>
              </li>
            ))}
          </ul>
          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 700 }}>Brain Score</span>
            <span style={{ fontSize: "clamp(1.75rem, 5vw, 2.25rem)", fontWeight: 900, color: ACCENT, letterSpacing: "-0.03em" }}>{brainScore}</span>
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
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", marginBottom: 16, letterSpacing: "-0.02em" }}>Create a free account to:</h2>
            <ul style={{ margin: "0 0 20px", paddingLeft: 20, color: "var(--text-2)", fontSize: 14, lineHeight: 1.65 }}>
              <li>Track your Brain Score daily</li>
              <li>See global rankings</li>
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
