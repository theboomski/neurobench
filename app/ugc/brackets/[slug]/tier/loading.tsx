export default function UgcBracketsTierLoading() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 56px" }}>
      <div style={{ width: 360, height: 36, borderRadius: 10, background: "rgba(148,163,184,0.18)" }} />
      <div style={{ width: 520, maxWidth: "100%", height: 14, borderRadius: 8, marginTop: 8, background: "rgba(148,163,184,0.14)" }} />
      <div style={{ width: 220, height: 12, borderRadius: 8, marginTop: 8, background: "rgba(148,163,184,0.12)" }} />

      <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--bg-card)" }}>
        {["S", "A", "B", "C", "D"].map((tier, idx, all) => (
          <div
            key={tier}
            style={{
              display: "grid",
              gridTemplateColumns: "88px 1fr",
              gap: 12,
              alignItems: "start",
              padding: "12px 14px",
              borderBottom: idx === all.length - 1 ? "none" : "1px solid var(--border)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 900, color: "var(--text-2)", fontSize: 28, lineHeight: 1 }}>{tier}</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 112 }}>
                  <div style={{ width: 112, aspectRatio: "1 / 1", borderRadius: 10, background: "rgba(148,163,184,0.16)" }} />
                  <div style={{ marginTop: 6, width: 92, height: 12, borderRadius: 8, background: "rgba(148,163,184,0.14)" }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
