"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { countryCodeToFlag, countryCodeToRegionName } from "@/lib/countryFlag";
import { TRASH_TALK_PRESETS } from "@/lib/leaderboardTrashTalk";
import { getLeaderboard, getLeaderboardWithPreviewRank, saveToLeaderboard, type LeaderboardEntry } from "@/lib/tracking";

function rankDisplay(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

const NICK_KEY = "zazaza_nickname";

const COUNTRY_OPTIONS = [
  "US", "GB", "CA", "AU", "DE", "FR", "JP", "KR", "IN", "BR", "MX", "ES", "IT", "NL", "SE", "NO", "FI", "PL", "IE", "NZ", "SG", "PH", "TH", "VN", "MY", "ID", "TW", "HK", "AR", "CL", "CO", "ZA", "AE", "CH", "AT", "BE", "PT", "DK", "CZ", "GR", "TR", "IL", "SA", "EG", "NG",
];

type Props = {
  gameId: string;
  rawScore: number;
  rawUnit: string;
  accent: string;
};

export default function LeaderboardSection({ gameId, rawScore, rawUnit, accent }: Props) {
  const [nickname, setNickname] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [geoLoaded, setGeoLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedTrashTalk, setSelectedTrashTalk] = useState<string | null>(null);
  const [podiumTrashTalk, setPodiumTrashTalk] = useState(false);
  const [podiumCheckLoading, setPodiumCheckLoading] = useState(false);

  const countrySelectOptions = useMemo(() => {
    const s = new Set(COUNTRY_OPTIONS);
    if (!s.has(countryCode)) s.add(countryCode);
    return [...s].sort((a, b) => countryCodeToRegionName(a).localeCompare(countryCodeToRegionName(b)));
  }, [countryCode]);

  useEffect(() => {
    try {
      const n = localStorage.getItem(NICK_KEY);
      if (n) setNickname(n.slice(0, 20));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!showForm || submitted) {
      setPodiumTrashTalk(false);
      setPodiumCheckLoading(false);
      return;
    }
    let cancelled = false;
    setPodiumCheckLoading(true);
    void getLeaderboardWithPreviewRank(gameId, rawScore).then(({ previewRank }) => {
      if (cancelled) return;
      const ok = typeof previewRank === "number" && previewRank <= 3;
      setPodiumTrashTalk(ok);
      if (!ok) setSelectedTrashTalk(null);
      setPodiumCheckLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [showForm, submitted, gameId, rawScore]);

  useEffect(() => {
    void fetch("/api/geo")
      .then(r => r.json())
      .then((d: { country_code?: string }) => {
        const c = (d?.country_code || "US").toUpperCase();
        setCountryCode(c.length === 2 ? c : "US");
      })
      .catch(() => setCountryCode("US"))
      .finally(() => setGeoLoaded(true));
  }, []);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    const data = await getLeaderboard(gameId);
    setRows(data);
    setLoadingList(false);
  }, [gameId]);

  const handleSeeLeaderboard = useCallback(() => {
    setListOpen(true);
    void refreshList();
  }, [refreshList]);

  const handleSubmit = async () => {
    const name = nickname.trim().slice(0, 20);
    if (!name) {
      setSubmitError("Enter a nickname (1–20 characters).");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      try {
        localStorage.setItem(NICK_KEY, name);
      } catch {
        /* ignore */
      }
      const result = await saveToLeaderboard(gameId, name, rawScore, countryCode, selectedTrashTalk);
      if (result.ok) {
        setSubmittedId(result.id);
        setSubmitted(true);
        setShowForm(false);
        setListOpen(true);
        void refreshList();
      } else {
        setSubmitError(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: "min(92vw, 420px)",
        marginTop: 16,
        padding: "16px 14px",
        borderRadius: 16,
        border: "1px solid var(--border-md)",
        background: "var(--bg-card)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
        Global leaderboard
      </div>

      {!showForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!submitted && (
            <button
              type="button"
              onClick={() => {
                setSubmitError(null);
                setSelectedTrashTalk(null);
                setShowForm(true);
              }}
              className="pressable"
              style={{
                background: accent,
                color: "#000",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              🏆 Submit to Leaderboard
            </button>
          )}
          {submitted && (
            <>
              <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 700, color: "var(--text-1)", textAlign: "center" }}>
                You&apos;re on the global leaderboard! 🌍
              </div>
              <button
                type="button"
                disabled
                className="pressable"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-3)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "default",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ✓ Submitted
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleSeeLeaderboard}
            className="pressable"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-1)",
              border: "1px solid var(--border-md)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            See Leaderboard
          </button>
        </div>
      )}

      {showForm && !submitted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <label style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
            Nickname (max 20)
            <input
              value={nickname}
              maxLength={20}
              onChange={e => setNickname(e.target.value)}
              placeholder="Your name"
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-1)",
                fontSize: 14,
              }}
            />
          </label>
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.45 }}>
            <span style={{ display: "block", marginBottom: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>Country</span>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }} aria-hidden>{geoLoaded ? countryCodeToFlag(countryCode) : "…"}</span>
              <span style={{ fontWeight: 600, color: "var(--text-1)" }}>
                {geoLoaded ? countryCodeToRegionName(countryCode) : "Detecting…"}
              </span>
            </div>
            <label style={{ display: "block", marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>
              Change
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                aria-label="Change country"
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-1)",
                  fontSize: 13,
                }}
              >
                {countrySelectOptions.map(c => (
                  <option key={c} value={c}>
                    {countryCodeToFlag(c)} {countryCodeToRegionName(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            Submitting score: <strong style={{ color: "var(--text-1)" }}>{rawScore}</strong> {rawUnit}
          </div>
          <div style={{ marginTop: 4 }}>
            {podiumCheckLoading && (
              <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>Checking podium…</p>
            )}
            {!podiumCheckLoading && podiumTrashTalk && (
              <>
                <span style={{ display: "block", marginBottom: 8, fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>Leave a message (top 3 only):</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {TRASH_TALK_PRESETS.map(preset => {
                    const on = selectedTrashTalk === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSelectedTrashTalk(on ? null : preset)}
                        className="pressable"
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: on ? `2px solid ${accent}` : "1px solid var(--border)",
                          background: on ? `${accent}22` : "var(--bg-elevated)",
                          color: "var(--text-1)",
                          fontSize: 12,
                          fontWeight: on ? 700 : 500,
                          cursor: "pointer",
                          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
                          lineHeight: 1.35,
                        }}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
                <span style={{ display: "block", marginTop: 6, fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Optional — tap again to clear</span>
              </>
            )}
            {!podiumCheckLoading && !podiumTrashTalk && (
              <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", lineHeight: 1.5, margin: 0 }}>
                Victory messages are only for global top 3 scores. Keep climbing — then you can talk trash. 😈
              </p>
            )}
          </div>
          {submitError && (
            <div
              role="alert"
              style={{
                fontSize: 11,
                color: "#fecaca",
                background: "rgba(127,29,29,0.35)",
                border: "1px solid rgba(248,113,113,0.45)",
                borderRadius: 8,
                padding: "8px 10px",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.45,
              }}
            >
              {submitError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
              setSelectedTrashTalk(null);
              setShowForm(false);
            }}
              className="pressable"
              style={{
                flex: 1,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-md)",
                borderRadius: "var(--radius-md)",
                padding: "10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                color: "var(--text-1)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="pressable"
              style={{
                flex: 1,
                background: accent,
                color: "#000",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px",
                fontSize: 12,
                fontWeight: 800,
                cursor: submitting ? "wait" : "pointer",
                fontFamily: "var(--font-mono)",
                opacity: submitting ? 0.75 : 1,
              }}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      )}

      {listOpen && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>TOP 10</div>
          {loadingList && <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Loading…</div>}
          {!loadingList && rows.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>No entries yet. Be the first.</div>
          )}
          {!loadingList &&
            rows.map((row, i) => {
              const mine = Boolean(submittedId && row.id === submittedId);
              const rank = i + 1;
              const countryName = countryCodeToRegionName(row.country_code);
              const msg = row.trash_talk?.trim();
              return (
                <div
                  key={row.id}
                  style={{
                    marginBottom: 8,
                    borderRadius: 8,
                    padding: "8px 6px",
                    background: mine ? `${accent}18` : "var(--bg-elevated)",
                    border: mine ? `1px solid ${accent}55` : "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 28,
                        flexShrink: 0,
                        fontFamily: "var(--font-mono)",
                        fontSize: rank <= 3 ? 14 : 11,
                        color: "var(--text-3)",
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                      aria-label={`Rank ${rank}`}
                    >
                      {rankDisplay(rank)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-2)",
                        minWidth: 0,
                        flex: "1 1 38%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={countryName}
                    >
                      {countryCodeToFlag(row.country_code)} {countryName}
                    </span>
                    <span
                      style={{
                        flex: "1 1 32%",
                        minWidth: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.nickname}
                    </span>
                    <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: mine ? accent : "var(--text-2)" }}>
                      {row.score}
                    </span>
                  </div>
                  {msg ? (
                    <div
                      style={{
                        marginTop: 8,
                        marginLeft: 36,
                        marginRight: 4,
                        padding: "8px 12px 10px",
                        borderRadius: 12,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-md)",
                        borderBottomLeftRadius: 4,
                        fontSize: 11,
                        fontStyle: "italic",
                        color: "var(--text-2)",
                        lineHeight: 1.45,
                        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                      }}
                    >
                      💬 &quot;{msg}&quot;
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
