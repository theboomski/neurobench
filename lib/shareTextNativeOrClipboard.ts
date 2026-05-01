import { trackShareEvent } from "@/lib/analytics";

/**
 * Web Share API when available, else clipboard, else prompt.
 * Fires GA `share` with the given analytics on the path that completes (not on user cancel).
 */
export async function shareTextNativeOrClipboard(opts: {
  title: string;
  text: string;
  analytics: { content_type: string; item_id: string };
}): Promise<void> {
  const { title, text, analytics: a } = opts;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text });
      trackShareEvent({ ...a, method: "web_share" });
      return;
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return;
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      trackShareEvent({ ...a, method: "copy_link" });
      return;
    }
  } catch {
    // fall through to prompt
  }
  try {
    window.prompt("Copy this text:", text);
    trackShareEvent({ ...a, method: "copy_link" });
  } catch {
    // ignore
  }
}
