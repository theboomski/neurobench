"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TRIATHLON_STORAGE_KEY, clearTriathlonCompletePageMemory, createInitialTriathlonSession } from "@/lib/triathlonSession";

export default function TriathlonStartPage() {
  const router = useRouter();

  useEffect(() => {
    clearTriathlonCompletePageMemory();
    sessionStorage.setItem(TRIATHLON_STORAGE_KEY, JSON.stringify(createInitialTriathlonSession()));
    router.replace("/brain-age/color-conflict");
  }, [router]);

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--text-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
      }}
    >
      Starting triathlon…
    </div>
  );
}
