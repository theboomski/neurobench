"use client";

const TRENDING_PATHS = [
  "/brain-age/color-conflict",
  "/brain-age/sudoku",
  "/brain-age/instant-comparison",
  "/brain-age/sequence-memory",
];

export default function HeroActions() {
  const handleRandomTrending = () => {
    const next = TRENDING_PATHS[Math.floor(Math.random() * TRENDING_PATHS.length)];
    window.location.href = next;
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "nowrap", marginBottom: 28 }}>
      <button
        onClick={handleRandomTrending}
        className="pressable"
        style={{ background: "#A855F7", color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}
      >
        ▶ TAKE A TEST NOW
      </button>
      <a href="#categories" style={{ textDecoration: "none" }}>
        <button className="pressable" style={{ background: "var(--bg-card)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
          Browse all tests
        </button>
      </a>
    </div>
  );
}
