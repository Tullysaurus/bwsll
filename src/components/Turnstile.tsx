"use client";

import { useEffect, useId, useRef } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      appearance?: "always" | "execute" | "interaction-only";
      theme?: "auto" | "light" | "dark";
      size?: "normal" | "compact" | "flexible";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileLoading?: Promise<void>;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!window.__turnstileLoading) {
    window.__turnstileLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Turnstile failed to load"));
      document.head.appendChild(script);
    });
  }
  return window.__turnstileLoading;
}

/**
 * Managed / interaction-only Turnstile (§4.7) — it stays out of the layout unless
 * Cloudflare decides a visitor needs an interactive challenge. With no site key
 * configured the widget is skipped entirely and the server also skips verification.
 */
export function Turnstile({
  siteKey,
  onToken,
  resetSignal,
}: {
  siteKey?: string;
  onToken: (token: string) => void;
  /** Bump to reset the widget after a failed submit. */
  resetSignal?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const id = useId();

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    const container = ref.current;

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile || widgetId.current) return;
        widgetId.current = window.turnstile.render(container, {
          sitekey: siteKey,
          appearance: "interaction-only",
          size: "flexible",
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch(() => onToken(""));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
    // `onToken` is a stable callback from the parent form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, [resetSignal]);

  if (!siteKey) return null;
  return <div ref={ref} id={`turnstile-${id}`} className="mt-4 empty:mt-0" />;
}
