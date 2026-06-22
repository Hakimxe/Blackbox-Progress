"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/manager";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid credentials");
        setSubmitting(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 relative overflow-hidden">
      {/* corner crosshairs */}
      <Corners />

      <div className="w-full max-w-md relative">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        <div className="bbx-panel animate-slide-up">
          <div className="bbx-panel-header">
            <div className="flex items-center gap-2">
              <span className="bbx-dot bg-bbx-accent animate-pulse-dot" />
              <span>secure // sign-in</span>
            </div>
            <span className="text-bbx-dim">v0.1</span>
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-semibold tracking-tight text-bbx-text">
              WELCOME BACK<span className="text-bbx-accent">.</span>
            </h1>
            <p className="text-xs text-bbx-subtext mt-2 tracking-wide">
              Sign in to manage the team&apos;s daily progress.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field
                label="USERNAME"
                value={username}
                onChange={setUsername}
                autoFocus
              />
              <Field
                label="PASSWORD"
                type="password"
                value={password}
                onChange={setPassword}
              />

              {error && (
                <div className="text-xs text-bbx-bad bg-bbx-bad/10 border border-bbx-bad/30 px-3 py-2 font-mono">
                  ! {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !username || !password}
                className="bbx-btn w-full"
              >
                {submitting ? "AUTH…" : "SIGN IN ▶"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[10px] text-bbx-dim mt-6 tracking-[0.18em] uppercase">
          Progress BBX // internal team dashboard
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="bbx-label block mb-1.5 flex items-center gap-1.5">
        <span className="text-bbx-accent">▸</span>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete={type === "password" ? "current-password" : "username"}
        className="bbx-input"
      />
    </div>
  );
}

function Corners() {
  return (
    <>
      {/* top-left */}
      <div className="absolute top-6 left-6 w-6 h-6 border-l border-t border-bbx-line" />
      {/* top-right */}
      <div className="absolute top-6 right-6 w-6 h-6 border-r border-t border-bbx-line" />
      {/* bottom-left */}
      <div className="absolute bottom-6 left-6 w-6 h-6 border-l border-b border-bbx-line" />
      {/* bottom-right */}
      <div className="absolute bottom-6 right-6 w-6 h-6 border-r border-b border-bbx-line" />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
