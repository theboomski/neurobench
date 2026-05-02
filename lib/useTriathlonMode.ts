"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function triathlonFromWindow(): boolean {
  return new URLSearchParams(window.location.search).get("mode") === "triathlon";
}

/**
 * `?mode=triathlon` for in-flow triathlon games.
 * When `triathlonFromServer` is set (from the page’s request `searchParams`), use it so SSR,
 * hydration, and Vercel match the real URL — `useSearchParams()` alone can be empty on the server.
 * When omitted, fall back to the client URL and Next’s search params (e.g. embeds / tests).
 */
export function useTriathlonMode(triathlonFromServer?: boolean): boolean {
  const nextParams = useSearchParams();
  const fromNext = nextParams.get("mode") === "triathlon";
  const fromWindow = useSyncExternalStore(subscribe, triathlonFromWindow, () => false);

  return useMemo(() => {
    if (triathlonFromServer !== undefined) return triathlonFromServer;
    return fromNext || fromWindow;
  }, [triathlonFromServer, fromNext, fromWindow]);
}
