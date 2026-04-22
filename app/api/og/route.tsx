import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    <div style={{ background: "red", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 60 }}>
      HELLO
    </div>,
    { width: 1200, height: 630 }
  );
}
