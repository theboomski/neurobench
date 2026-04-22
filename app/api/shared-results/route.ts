import { NextRequest, NextResponse } from "next/server";
import { createSharedResult } from "@/lib/sharedResults";
import { isResultSharePayloadV1 } from "@/lib/resultShareTypes";

export async function POST(req: NextRequest) {
  let body: { payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isResultSharePayloadV1(body.payload)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const id = await createSharedResult(body.payload);
  if (!id) {
    return NextResponse.json({ error: "share_store_failed" }, { status: 500 });
  }

  return NextResponse.json({ id });
}
