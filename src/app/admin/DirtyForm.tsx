"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Unsaved-changes handling for admin forms.
 *
 * `SaveBar` drops into any existing form — it finds the form it sits in, watches it for
 * typing, and pins a bar to the bottom of the screen saying there are unsaved changes,
 * with Save and Discard. `DirtyForm` is the shorthand for the common case: a plain form
 * whose server action takes a FormData and returns nothing.
 *
 * Redirects and notFound() throw a framework error carrying a `digest` of "NEXT_…", so
 * those are rethrown rather than shown to the person as a failure.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "error";

function isFrameworkError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}

export function SaveBar({
  saveLabel = "Save changes",
  status = "idle",
  error = "",
  always = false,
  onDiscard,
}: {
  saveLabel?: string;
  status?: SaveStatus;
  error?: string;
  /** Keep Save available even before anything has been typed — for "create" forms. */
  always?: boolean;
  onDiscard?: () => void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);

  // Watching the surrounding form means every field counts, including ones added later,
  // and no field has to be wired up by hand.
  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const mark = () => setDirty(true);
    form.addEventListener("input", mark);
    form.addEventListener("change", mark);
    return () => {
      form.removeEventListener("input", mark);
      form.removeEventListener("change", mark);
    };
  }, []);

  useEffect(() => {
    if (!dirty || status === "saving") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, status]);

  // A successful save clears the dirty flag. Adjusting state during render on a changed
  // prop is React's own pattern for this — an effect here would run a render late.
  const [lastStatus, setLastStatus] = useState(status);
  if (lastStatus !== status) {
    setLastStatus(status);
    if (status === "saved") setDirty(false);
  }

  const active = dirty || always;
  const showBar = active || status === "saving" || status === "saved" || status === "error";

  const message =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved."
        : status === "error"
          ? error || "That didn't save."
          : dirty
            ? "You have unsaved changes."
            : always
              ? "Nothing is saved until you press Save."
              : "";

  return (
    <>
      <div ref={anchor} aria-hidden style={{ height: showBar ? 84 : 8 }} />
      <div
        className="fixed inset-x-0 bottom-0 z-40"
        style={{
          transform: showBar ? "translateY(0)" : "translateY(130%)",
          transition: "transform 160ms ease",
          background: "var(--ink)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -6px 18px rgba(0,0,0,0.12)",
        }}
      >
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <p
            aria-live="polite"
            className="text-[15px] font-medium"
            style={{ color: status === "error" ? "#ffb4a2" : "var(--paper)" }}
          >
            {message}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-on-dark-outline"
              style={{ minHeight: 40, padding: "10px 16px" }}
              disabled={!dirty || status === "saving"}
              onClick={() => {
                anchor.current?.closest("form")?.reset();
                setDirty(false);
                onDiscard?.();
              }}
            >
              Discard
            </button>
            <button
              type="submit"
              className="btn btn-on-dark-solid"
              style={{ minHeight: 40, padding: "10px 16px" }}
              disabled={!active || status === "saving"}
            >
              {status === "saving" ? "Saving…" : saveLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function DirtyForm({
  action,
  children,
  className,
  saveLabel = "Save changes",
  always = false,
}: {
  action: (formData: FormData) => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  saveLabel?: string;
  always?: boolean;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setStatus("saving");
    setError("");
    try {
      await action(formData);
      setStatus("saved");
      window.setTimeout(() => setStatus((current) => (current === "saved" ? "idle" : current)), 2500);
    } catch (caught) {
      if (isFrameworkError(caught)) throw caught;
      setError(caught instanceof Error ? caught.message : "That didn't save.");
      setStatus("error");
    }
  }

  return (
    <form action={submit} className={className}>
      {children}
      <SaveBar
        saveLabel={saveLabel}
        status={status}
        error={error}
        always={always}
        onDiscard={() => setStatus("idle")}
      />
    </form>
  );
}
