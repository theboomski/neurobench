export default function UgcBracketsGameLoading() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 56px" }}>
      <div style={{ width: 280, height: 34, borderRadius: 8, background: "rgba(148,163,184,0.18)" }} />
      <div style={{ width: 220, height: 14, borderRadius: 8, marginTop: 8, background: "rgba(148,163,184,0.14)" }} />
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 10, background: "var(--bg-card)" }}>
          <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 10, background: "rgba(148,163,184,0.16)" }} />
          <div style={{ width: "70%", height: 20, borderRadius: 8, margin: "10px auto 0", background: "rgba(148,163,184,0.16)" }} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: "var(--text-2)", textAlign: "center" }}>VS</div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 10, background: "var(--bg-card)" }}>
          <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 10, background: "rgba(148,163,184,0.16)" }} />
          <div style={{ width: "70%", height: 20, borderRadius: 8, margin: "10px auto 0", background: "rgba(148,163,184,0.16)" }} />
        </div>
      </div>
    </div>
  );
}
