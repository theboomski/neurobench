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
            background: "#0a0a0a",
            color: "#fafafa",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            padding: "42px 52px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 999,
                background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`,
                border: `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`,
                padding: "10px 22px",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: primary,
              }}
            >
              {testName || "ZAZAZA"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 152,
                  fontWeight: 900,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: "#ffffff",
                textShadow: `0 0 38px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`,
              }}
            >
              {score || "0"}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                maxWidth: 1080,
                fontSize: 74,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.03,
                color: "#ffffff",
                textTransform: "uppercase",
                textAlign: "center",
                textShadow: `0 0 56px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)`,
              }}
            >
              {label || "RESULT"}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                maxWidth: 1020,
                fontSize: 30,
                fontWeight: 500,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.68)",
                textAlign: "center",
              }}
            >
              {percentile || "Top players only."}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 54,
                fontWeight: 900,
                letterSpacing: "0.02em",
                lineHeight: 1.05,
                color: "#ffffff",
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              CAN YOU BEAT ME?
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              paddingTop: 14,
            }}
          >
            <span
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "0.02em",
                color: primary,
                }}
              >
              zazaza.app
            </span>
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
