"use client";

export default function InterstitialAd({ onDone }: { onDone: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-md)",
        borderTop: "2px solid #00FF94", borderRadius: "var(--radius-xl)",
        padding: "28px 24px", width: "100%", maxWidth: 480, textAlign: "center",
      }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          Initiating Next Protocol...
        </div>

        {/* ── Replace with real AdSense unit ──────────────────────────────
          <ins className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
            data-ad-slot="XXXXXXXXXX"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        ─────────────────────────────────────────────────────────────── */}
        <div className="ad-slot ad-interstitial" style={{ margin: "0 auto 20px", width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📺</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Ad Placeholder</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, opacity: 0.5 }}>→ Replace with Google AdSense</div>
          </div>
        </div>

        {/* AdSense policy: user must be able to skip immediately */}
        <button
          onClick={onDone}
          className="pressable"
          style={{
            width: "100%", padding: "14px 0", borderRadius: "var(--radius-md)",
            border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
            background: "#00FF94", color: "#000", fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          ▶ RUN AGAIN
        </button>
      </div>
    </div>
  );
}
