import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const h = await headers();
  const raw = h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "US";
  const cc = raw.length === 2 && raw !== "XX" ? raw.toUpperCase() : "US";
  return NextResponse.json({ country_code: cc });
}
