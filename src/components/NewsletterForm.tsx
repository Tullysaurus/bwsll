"use client";

import { useCallback, useState } from "react";
import { Turnstile } from "./Turnstile";

type State = "idle" | "sending" | "done" | "error";

export function NewsletterForm({ siteKey, source = "footer" }: { siteKey?: string; source?: string }) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [resetSignal, setResetSignal] = useState(0);

  const onToken = useCallback((value: string) => setToken(value), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, turnstileToken: token, website: honeypot }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Something went wrong. Please try again.");
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setResetSignal((n) => n + 1);
    }
  }

  if (state === "done") {
    return (
      <p className="mt-5 text-[17px]" style={{ color: "var(--paper)" }} role="status">
        You&rsquo;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5" noValidate>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={error ? "newsletter-error" : undefined}
          aria-invalid={state === "error" || undefined}
          className="w-full"
          style={{
            height: 48,
            background: "transparent",
            border: "1px solid var(--footer-input)",
            borderRadius: 2,
            padding: "0 14px",
            color: "var(--paper)",
            fontSize: 16,
          }}
        />
        <button type="submit" className="btn btn-gold shrink-0" disabled={state === "sending"}>
          {state === "sending" ? "Signing up…" : "Sign up"}
        </button>
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="newsletter-website">Website</label>
        <input
          id="newsletter-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <Turnstile siteKey={siteKey} onToken={onToken} resetSignal={resetSignal} />

      {error ? (
        <p id="newsletter-error" role="alert" className="mt-3 text-[14px]" style={{ color: "#F0B5A5" }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
