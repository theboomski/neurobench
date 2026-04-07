"use client";

// AdSense/AdMob 정책 기준:
// - 강제 카운트다운 금지
// - 유저가 언제든 닫기(Skip) 가능해야 함
// - 광고 영역은 실제 AdSense 코드로 교체

export default function InterstitialAd({ onDone }: { onDone: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-md)",
        borderRadius: "var(--radius-xl)", padding: "28px 24px", width: "100%",
        maxWidth: 480, textAlign: "center",
      }}>
        <p style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 16 }}>
          Advertisement
        </p>

        {/* ── 실제 AdSense 교체 영역 ──────────────────────────────────
            <ins className="adsbygoogle"
              style={{ display: "block" }}
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot="XXXXXXXXXX"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
            <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        ─────────────────────────────────────────────────────────── */}
        <div className="ad-slot ad-slot-interstitial" style={{ margin: "0 auto 20px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📺</div>
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>Ad Placeholder</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, opacity: 0.6 }}>Replace with Google AdSense</div>
          </div>
        </div>

        {/* Skip 버튼 — AdSense 정책상 즉시 닫기 가능해야 함 */}
        <button
          onClick={onDone}
          style={{
            width: "100%", padding: "14px 0", borderRadius: "var(--radius-md)",
            border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
            background: "#1DB954", color: "#000",
          }}
        >
          ▶ Play Again
        </button>

        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12 }}>
          Tap to continue
        </p>
      </div>
    </div>
  );
}
