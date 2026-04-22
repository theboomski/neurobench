import { ImageResponse } from "next/og";

export const runtime = "edge";

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

    const image = new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, #0b0b0b 0%, #111111 100%)",
            color: "#fafafa",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            padding: "44px 52px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              {testName || "ZAZAZA"}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 24,
                  padding: "18px 44px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <span style={{ fontSize: 96, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>{score || "—"}</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: 44,
                fontWeight: 900,
                textAlign: "center",
                lineHeight: 1.1,
                color: "#fff",
                textShadow: `0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                maxWidth: 1040,
                alignSelf: "center",
              }}
            >
              {label || "RESULT"}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 500,
                textAlign: "center",
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.35,
                maxWidth: 1000,
                alignSelf: "center",
              }}
            >
              {percentile || "Share your score from ZAZAZA."}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: primary }}>zazaza.app</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );

    // Force render inside try/catch so Satori/runtime errors return diagnostics.
    const png = await image.arrayBuffer();
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    });
  } catch (error) {
    return new Response(String(error), {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
