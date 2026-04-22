/** Gzip + base64url JSON for compact share URLs (Edge + browser). */

export async function gzipJsonToBase64Url(obj: unknown): Promise<string> {
  const json = JSON.stringify(obj);
  const enc = new TextEncoder().encode(json);
  const cs = new CompressionStream("gzip");
  const stream = new Blob([enc]).stream().pipeThrough(cs);
  const buf = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function gunzipBase64UrlToJson<T>(z: string): Promise<T | null> {
  try {
    const b64 = z.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (b64.length % 4)) % 4;
    const padded = b64 + "=".repeat(padLen);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ds = new DecompressionStream("gzip");
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const out = await new Response(stream).arrayBuffer();
    const text = new TextDecoder().decode(out);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
