import { ImageResponse } from "@vercel/og";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const score = searchParams.get("score") ?? "0";
  const label = searchParams.get("label") ?? "ZAZAZA";
  const percentile = searchParams.get("percentile") ?? "";
  const testName = searchParams.get("testName") ?? "Test";
  const primary_color = searchParams.get("primary_color") ?? "ff6b6b";
  const primary = `#${primary_color.replace(/^#/, "").slice(0, 6) || "ff6b6b"}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          position: "relative",
          padding: 48,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(80% 60% at 20% 0%, rgba(255,255,255,0.06) 0%, transparent 55%), radial-gradient(70% 50% at 100% 100%, rgba(255,255,255,0.04) 0%, transparent 50%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              marginBottom: 8,
            }}
          >
            {testName || "ZAZAZA"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 14,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: "9999px",
                background: `${primary}33`,
                border: `3px solid ${primary}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              OG
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                borderRadius: 24,
                padding: "20px 48px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: `0 0 60px ${primary}55`,
              }}
            >
              <span style={{ fontSize: 96, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff" }}>{score || "—"}</span>
            </div>
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              textAlign: "center",
              lineHeight: 1.1,
              color: "#fff",
              textShadow: `0 0 40px ${primary}99`,
              marginBottom: 16,
              maxWidth: 1040,
              alignSelf: "center",
            }}
          >
            {label || "RESULT"}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              textAlign: "center",
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.35,
              maxWidth: 1000,
              alignSelf: "center",
              flex: 1,
            }}
          >
            {percentile || "Share your score from ZAZAZA."}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "flex-end",
              marginTop: 12,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 800, color: primary }}>zazaza.app</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
