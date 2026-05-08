"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type AuthModalProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  /** Optional content below the form (e.g. Cockpit quick links while logged out). */
  footer?: ReactNode;
};

export default function AuthModal({ open, onClose, title, description, footer }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

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
      if (error) {
        if (error.message.toLowerCase().includes("over_email_send_rate_limit")) {
          setMessage("Email limit reached. Wait a bit, then try again.");
        } else {
          setMessage(error.message);
        }
      } else {
        setMessage("Signup complete. Check your inbox and click verification link, then login.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setMessage("Email not confirmed yet. Open the latest verification email and confirm, then login again.");
        } else {
          setMessage(error.message);
        }
      } else {
        setMessage("Logged in.");
      }
    }
    setBusy(false);
  };

  const onForgotPassword = async () => {
    if (!supabase || !email) {
      setMessage("Enter your email first, then click reset.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    setMessage(error ? error.message : "Password reset email sent. Check your inbox.");
    setBusy(false);
  };

  return (
    <div
      onClick={() => {
        if (onClose && !busy) onClose();
      }}
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{title ?? "Log in to continue"}</h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "3px 8px", background: "transparent", color: "var(--text-2)", cursor: "pointer" }}
              aria-label="Close auth modal"
            >
              x
            </button>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6 }}>{description ?? "Create and track UGC games with your account."}</p>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={() => setMode("login")} style={{ flex: 1, borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)", background: mode === "login" ? "rgba(27,77,62,0.16)" : "transparent", cursor: "pointer" }}>
            Login
          </button>
          <button onClick={() => setMode("signup")} style={{ flex: 1, borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)", background: mode === "signup" ? "rgba(27,77,62,0.16)" : "transparent", cursor: "pointer" }}>
            Sign up
          </button>
        </div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: "100%", marginTop: 10, borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)", background: "var(--bg-soft)" }} />
        {!forgotMode && (
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" style={{ width: "100%", marginTop: 8, borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)", background: "var(--bg-soft)" }} />
        )}

        <button
          onClick={forgotMode ? onForgotPassword : onEmailSubmit}
          disabled={busy}
          style={{ width: "100%", marginTop: 10, borderRadius: 10, padding: "10px 12px", fontWeight: 800, background: "#1B4D3E", color: "#ffffff", border: "none", cursor: "pointer" }}
        >
          {forgotMode ? "Send reset link" : mode === "signup" ? "Create account" : "Login"}
        </button>
        {mode === "login" && (
          <button
            onClick={() => setForgotMode((v) => !v)}
            style={{ marginTop: 8, fontSize: 12, color: "var(--text-2)", textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}
          >
            {forgotMode ? "Back to login" : "Forgot password? Click here"}
          </button>
        )}

        {message && <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-2)" }}>{message}</p>}
        {footer ? <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>{footer}</div> : null}
      </div>
    </div>
  );
}
