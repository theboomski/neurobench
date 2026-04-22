import { ImageResponse } from "@vercel/og";

function sanitizeHex6(input: string | null): string {
  const cleaned = (input ?? "").replace(/^#/, "").replace(/[^0-9a-fA-F]/g, "");
  if (cleaned.length >= 6) return cleaned.slice(0, 6).toLowerCase();
  return "ff6b6b";
}

function hex6ToRgb(hex6: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex6.slice(0, 2), 16),
    g: Number.parseInt(hex6.slice(2, 4), 16),
    b: Number.parseInt(hex6.slice(4, 6), 16),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const score = searchParams.get("score") ?? "0";
    const label = searchParams.get("label") ?? "ZAZAZA";
    const percentile = searchParams.get("percentile") ?? "";
    const testName = searchParams.get("testName") ?? "Test";
    const primaryHex = sanitizeHex6(searchParams.get("primary_color"));
    const primary = `#${primaryHex}`;
    const rgb = hex6ToRgb(primaryHex);

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
                  background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
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
                  boxShadow: `0 0 60px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.33)`,
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
                textShadow: `0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
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
  } catch (error) {
    return new Response(String(error), {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
