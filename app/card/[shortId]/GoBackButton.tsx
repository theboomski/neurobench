"use client";

import { useRouter } from "next/navigation";

export default function GoBackButton() {
  const router = useRouter();
  const onGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/send");
  };
  return (
    <button
      type="button"
      onClick={onGoBack}
      className="pressable"
      style={{
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        border: "1px solid #f472b6",
        color: "#1a0510",
        background: "#f472b6",
        fontWeight: 900,
        padding: "12px 20px",
        fontSize: 14,
        fontFamily: "var(--font-mono)",
        cursor: "pointer",
      }}
    >
      Go Back
    </button>
  );
}
