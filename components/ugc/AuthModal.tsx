"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type AuthModalProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
};

export default function AuthModal({ open, onClose, title, description }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  if (!open) return null;

  const onGoogle = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    setBusy(false);
  };

  const onEmailSubmit = async () => {
    if (!supabase || !email || !password) return;
    setBusy(true);
    setMessage(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
      });
      setMessage(error ? error.message : "Check your inbox to verify your email.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMessage(error ? error.message : "Logged in.");
    }
    setBusy(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{title ?? "Log in to continue"}</h2>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6 }}>{description ?? "Create and track UGC games with your account."}</p>

        <button onClick={onGoogle} disabled={busy} style={{ width: "100%", marginTop: 12, border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontWeight: 700 }}>
          Continue with Google
        </button>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={() => setMode("login")} style={{ flex: 1, borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)", background: mode === "login" ? "#00FF9430" : "transparent" }}>
            Login
          </button>
          <button onClick={() => setMode("signup")} style={{ flex: 1, borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)", background: mode === "signup" ? "#00FF9430" : "transparent" }}>
            Sign up
          </button>
        </div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: "100%", marginTop: 10, borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)", background: "var(--bg-soft)" }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" style={{ width: "100%", marginTop: 8, borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)", background: "var(--bg-soft)" }} />

        <button onClick={onEmailSubmit} disabled={busy} style={{ width: "100%", marginTop: 10, borderRadius: 10, padding: "10px 12px", fontWeight: 800, background: "#00FF94", color: "#062313", border: "none" }}>
          {mode === "signup" ? "Create account" : "Login"}
        </button>

        {message && <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-2)" }}>{message}</p>}
        {onClose && (
          <button onClick={onClose} style={{ marginTop: 10, fontSize: 12, color: "var(--text-3)", textDecoration: "underline", background: "transparent", border: "none" }}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
