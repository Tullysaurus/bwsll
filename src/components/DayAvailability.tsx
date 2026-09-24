"use client";

import { useEffect, useState } from "react";

/**
 * What's left on the date someone just picked, checked against the same availability the
 * calendar above draws from. It's guidance, not a gate: a full day can still be asked
 * about, because the answer might be "we can do the following week".
 */

type Day = { date: string; free: { open: string; close: string }[]; closed: boolean };

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
};

export function DayAvailability({ date }: { date: string }) {
  // The answer is kept with the date it belongs to, so a stale reply for a date the
  // person has already changed is simply not rendered — and nothing is set during the
  // effect itself, only when a response arrives.
  const [answer, setAnswer] = useState<{ date: string; day: Day | null } | null>(null);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

    const controller = new AbortController();

    fetch(`/api/availability?month=${date.slice(0, 7)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("unavailable"))))
      .then((json: { days: Day[] }) => {
        setAnswer({ date, day: json.days.find((entry) => entry.date === date) ?? null });
      })
      .catch(() => {
        // The form works without this; staying quiet beats a scary message.
        if (!controller.signal.aborted) setAnswer({ date, day: null });
      });

    return () => controller.abort();
  }, [date]);

  if (!answer || answer.date !== date || !answer.day) return null;

  const { day } = answer;
  const message = day.closed
    ? "We're closed that day — pick another, or tell us below and we'll see what we can do."
    : day.free.length === 0
      ? "That day is fully booked. Send the request anyway and we'll suggest the nearest date."
      : `Free that day: ${day.free.map((window) => `${clock(window.open)}–${clock(window.close)}`).join(", ")}.`;

  return (
    <p className="field-hint" aria-live="polite">
      {message}
    </p>
  );
}
