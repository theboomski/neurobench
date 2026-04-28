export default function UgcBracketsGameLoading() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 56px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ width: 280, height: 34, borderRadius: 8, background: "rgba(148,163,184,0.18)" }} />
          <div style={{ width: 220, height: 14, borderRadius: 8, marginTop: 8, background: "rgba(148,163,184,0.14)" }} />
        </div>
        <div style={{ width: 112, height: 42, borderRadius: 10, background: "rgba(148,163,184,0.16)" }} />
      </div>

      <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
        <div style={{ height: 44, borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }} />
        {[0, 1, 2].map((row) => (
          <div key={row} style={{ display: "grid", gridTemplateColumns: "54px 134px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)", gap: 10, alignItems: "center", padding: "10px 12px", borderBottom: row === 2 ? "none" : "1px solid var(--border)" }}>
            <div style={{ width: 24, height: 12, borderRadius: 6, background: "rgba(148,163,184,0.18)" }} />
            <div style={{ width: 126, height: 126, borderRadius: 12, background: "rgba(148,163,184,0.16)" }} />
            <div style={{ width: "70%", height: 14, borderRadius: 8, background: "rgba(148,163,184,0.16)" }} />
            <div style={{ width: "88%", height: 8, borderRadius: 999, background: "rgba(148,163,184,0.16)" }} />
            <div style={{ width: "88%", height: 8, borderRadius: 999, background: "rgba(148,163,184,0.16)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
