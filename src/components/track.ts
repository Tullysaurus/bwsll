"use client";

import { isTracked } from "@/lib/analytics-names";

/**
 * Counts an action from the browser. Uses `sendBeacon` so it survives the page being
 * unloaded by the link the visitor just clicked, and never blocks or delays that click.
 */
export function track(name: string): void {
  if (typeof window === "undefined" || !isTracked(name)) return;

  const body = JSON.stringify({ name, path: window.location.pathname });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/track", { method: "POST", body, keepalive: true });
  } catch {
    // Counting must never get in the way of the thing the visitor is doing.
  }
}
