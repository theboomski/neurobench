export async function GET() {
  // 1x1 red pixel PNG
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  return new Response(pixel, {
    headers: { "Content-Type": "image/png" },
  });
}
