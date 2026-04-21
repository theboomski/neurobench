"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { countryCodeToFlag } from "@/lib/countryFlag";
import { getLeaderboard, saveToLeaderboard, type LeaderboardEntry } from "@/lib/tracking";

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

  const countrySelectOptions = useMemo(() => {
    const s = new Set(COUNTRY_OPTIONS);
    if (!s.has(countryCode)) s.add(countryCode);
    return [...s].sort();
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
    if (!name) return;
    try {
      localStorage.setItem(NICK_KEY, name);
    } catch {
      /* ignore */
    }
    const id = await saveToLeaderboard(gameId, name, rawScore, countryCode);
    if (id) {
      setSubmittedId(id);
      setSubmitted(true);
      setShowForm(false);
      setListOpen(true);
      void refreshList();
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
              onClick={() => setShowForm(true)}
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
          <div style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
            Country: {countryCodeToFlag(countryCode)} {geoLoaded ? countryCode : "…"}{" "}
            <span style={{ color: "var(--text-3)" }}>·</span>{" "}
            <select
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
              aria-label="Change country"
              style={{
                marginLeft: 4,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-1)",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            >
              {countrySelectOptions.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            Submitting score: <strong style={{ color: "var(--text-1)" }}>{rawScore}</strong> {rawUnit}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
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
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              Submit
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
              return (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 6px",
                    borderRadius: 8,
                    marginBottom: 4,
                    background: mine ? `${accent}18` : "var(--bg-elevated)",
                    border: mine ? `1px solid ${accent}55` : "1px solid var(--border)",
                  }}
                >
                  <span style={{ width: 22, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ fontSize: 16 }}>{countryCodeToFlag(row.country_code)}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.nickname}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: mine ? accent : "var(--text-2)" }}>
                    {row.score}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
