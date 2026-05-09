"use client";

// Show interstitial every N plays
const AD_EVERY = 3;
const STORAGE_KEY = "zazaza_play_count";

export function shouldShowAd(): boolean {
  if (typeof window === "undefined") return false;
  const count = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10) + 1;
  localStorage.setItem(STORAGE_KEY, String(count));
  return count % AD_EVERY === 0;
}

export default function InterstitialAd({ onDone }: { onDone: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,13,11,0.94)", backdropFilter: "blur(16px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-md)",
        borderTop: "2px solid #D4823A", borderRadius: "var(--radius-xl)",
        padding: "28px 24px", width: "100%", maxWidth: 480, textAlign: "center",
      }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          Loading Next Test...
        </div>

        {/* ── AdSense unit (활성화 후 아래 주석 해제) ──────────────────────
          <ins className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client="ca-pub-5822666577768735"
            data-ad-slot="XXXXXXXXXX"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        ─────────────────────────────────────────────────────────────── */}
        <div className="ad-slot ad-interstitial" style={{ margin: "0 auto 20px", width: "100%", minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📺</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Advertisement</div>
          </div>
        </div>

        <button
          onClick={onDone}
          className="pressable"
          style={{
            width: "100%", padding: "14px 0", borderRadius: "var(--radius-md)",
            border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
            background: "#D4823A", color: "#0F0D0B", fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          ▶ PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
