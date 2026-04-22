import type { ResultSharePayloadV1 } from "@/lib/resultShareTypes";

const SITE = "https://zazaza.app";

export async function createSharedResultUrl(payload: ResultSharePayloadV1): Promise<string> {
  if (typeof window === "undefined") throw new Error("createSharedResultUrl must run in the browser");

  const res = await fetch("/api/shared-results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  if (!res.ok) throw new Error("Failed to create shared result URL");
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("Missing shared result ID");
  return `${SITE}/s/${json.id}`;
}
