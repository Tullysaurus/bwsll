"use client";

import { useCallback, useId, useRef, useState } from "react";
import { money } from "@/lib/format";
import type { InquiryFormType } from "@/lib/schemas";
import { useEstimate } from "./EstimateContext";
import { DayAvailability } from "./DayAvailability";
import { Turnstile } from "./Turnstile";

type Values = Record<string, string | boolean>;

const SUBMIT_LABEL: Record<InquiryFormType, string> = {
  event: "Send request",
  catering: "Send request",
  club: "Join the club",
  vendor: "Apply",
  partner: "Start the conversation",
  workforce: "Apply",
  contact: "Send message",
};

const INITIAL: Record<InquiryFormType, Values> = {
  event: { guests: "20", need: "rental" },
  catering: { guests: "20", need: "catering" },
  club: {},
  vendor: { hasLicense: false, hasInsurance: false },
  partner: {},
  workforce: { program: "workforce", isUnder18: false },
  contact: {},
};

function Field({
  id,
  label,
  error,
  hint,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="field-hint">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InquiryForm({
  type,
  siteKey,
  responseTime,
  heading,
  intro,
}: {
  type: InquiryFormType;
  siteKey?: string;
  responseTime: string;
  heading?: string;
  intro?: string;
}) {
  const uid = useId();
  const shared = useEstimate();
  const [values, setValues] = useState<Values>(() => ({ ...INITIAL[type] }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [formError, setFormError] = useState("");
  const [token, setToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);

  const onToken = useCallback((value: string) => setToken(value), []);
  const fid = (name: string) => `${uid}-${name}`;
  const set = (name: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [name]: value }));

  const isBooking = type === "event" || type === "catering";
  const need = (isBooking && shared ? shared.need : (values.need as string)) ?? "rental";
  const estimate = shared?.estimate ?? null;

  const text = (name: string) => ({
    id: fid(name),
    name,
    className: "field-input",
    value: (values[name] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(name, e.target.value),
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${fid(name)}-error` : undefined,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrors({});
    setFormError("");

    const payload: Record<string, unknown> = {
      ...values,
      type,
      turnstileToken: token,
    };
    if (isBooking) {
      payload.need = need;
      if (estimate) payload.estimate = estimate;
    }

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        errors?: Record<string, string>;
      };
      if (!res.ok || !json.ok) {
        setErrors(json.errors ?? {});
        setFormError(json.error ?? "Please check the highlighted fields and try again.");
        setStatus("error");
        setResetSignal((n) => n + 1);
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      setStatus("done");
    } catch {
      setFormError("We couldn't send that. Please try again, or call us at 918-851-1982.");
      setStatus("error");
      setResetSignal((n) => n + 1);
    }
  }

  if (status === "done") {
    return (
      <div className="rule-top-ink pt-8" role="status">
        <h3 className="h3">Thanks — we got it.</h3>
        <p className="mt-3 text-[17px]" style={{ color: "var(--muted)" }}>
          We&rsquo;ll reply by email within {responseTime}.
        </p>
      </div>
    );
  }

  return (
    <div>
      {heading ? <h2 className="h2">{heading}</h2> : null}
      {intro ? (
        <p className="mt-4 text-[17px]" style={{ color: "var(--muted)" }}>
          {intro}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8" noValidate>
        {formError ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="mb-6 p-4"
            style={{ border: "1px solid #8C2F20", background: "#F7E9E5", color: "#8C2F20", borderRadius: 2 }}
          >
            {formError}
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={fid("name")} label="Your name" error={errors.name}>
            <input {...text("name")} type="text" autoComplete="name" required />
          </Field>

          <Field id={fid("email")} label="Email" error={errors.email}>
            <input {...text("email")} type="email" autoComplete="email" required />
          </Field>

          <Field
            id={fid("phone")}
            label={isBooking ? "Phone" : "Phone (optional)"}
            error={errors.phone}
          >
            <input {...text("phone")} type="tel" autoComplete="tel" required={isBooking} />
          </Field>

          {isBooking ? (
            <>
              <Field id={fid("organization")} label="Organization (optional)" error={errors.organization}>
                <input {...text("organization")} type="text" autoComplete="organization" />
              </Field>

              <Field id={fid("eventDate")} label="Event date" error={errors.eventDate}>
                <input {...text("eventDate")} type="date" required />
                <DayAvailability date={String(values.eventDate ?? "")} />
              </Field>

              <Field id={fid("guests")} label="Guests" error={errors.guests}>
                <select {...text("guests")}>
                  <option value="10">Up to 10 guests</option>
                  <option value="20">Up to 20 guests</option>
                  <option value="40">Up to 40 guests</option>
                </select>
              </Field>

              <Field id={fid("startTime")} label="Start time (optional)" error={errors.startTime}>
                <input {...text("startTime")} type="time" />
              </Field>

              <Field id={fid("endTime")} label="End time (optional)" error={errors.endTime}>
                <input {...text("endTime")} type="time" />
              </Field>

              <Field id={fid("need")} label="What do you need?" error={errors.need} className="sm:col-span-2">
                <select
                  id={fid("need")}
                  name="need"
                  className="field-input"
                  value={need}
                  onChange={(e) => {
                    const value = e.target.value as "rental" | "catering" | "both";
                    set("need", value);
                    shared?.setNeed(value);
                  }}
                >
                  <option value="rental">Space rental at the Lounge</option>
                  <option value="catering">Catering</option>
                  <option value="both">Both</option>
                </select>
              </Field>

              {need !== "rental" ? (
                <Field
                  id={fid("venueAddress")}
                  label="Venue address"
                  error={errors.venueAddress}
                  hint={"Where should the catering go? Put “the Lounge” if we’re hosting."}
                  className="sm:col-span-2"
                >
                  <input {...text("venueAddress")} type="text" autoComplete="street-address" />
                </Field>
              ) : null}
            </>
          ) : null}

          {type === "club" ? (
            <Field id={fid("startDate")} label="Preferred start date (optional)" error={errors.startDate}>
              <input {...text("startDate")} type="date" />
            </Field>
          ) : null}

          {type === "vendor" ? (
            <>
              <Field id={fid("businessName")} label="Business name" error={errors.businessName}>
                <input {...text("businessName")} type="text" required />
              </Field>

              <Field id={fid("businessWebsite")} label="Website (optional)" error={errors.businessWebsite}>
                <input {...text("businessWebsite")} type="url" placeholder="https://" />
              </Field>

              <Field
                id={fid("productType")}
                label="What would you like to sell?"
                error={errors.productType}
                className="sm:col-span-2"
              >
                <input {...text("productType")} type="text" required />
              </Field>

              <div className="flex flex-col gap-3 sm:col-span-2">
                <label className="flex items-center gap-3 text-[16px]">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={Boolean(values.hasLicense)}
                    onChange={(e) => set("hasLicense", e.target.checked)}
                  />
                  I have a current business license.
                </label>
                <label className="flex items-center gap-3 text-[16px]">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={Boolean(values.hasInsurance)}
                    onChange={(e) => set("hasInsurance", e.target.checked)}
                  />
                  I have proof of insurance.
                </label>
              </div>
            </>
          ) : null}

          {type === "partner" ? (
            <>
              <Field id={fid("organization")} label="Organization" error={errors.organization}>
                <input {...text("organization")} type="text" required />
              </Field>

              <Field
                id={fid("partnerWebsite")}
                label="Website (optional)"
                error={errors.partnerWebsite}
              >
                <input {...text("partnerWebsite")} type="url" placeholder="https://" />
              </Field>

              <Field
                id={fid("idea")}
                label="What do you have in mind?"
                error={errors.idea}
                className="sm:col-span-2"
                hint="A partnership, a pop-up, sponsoring something — whatever you're thinking."
              >
                <textarea {...text("idea")} rows={4} required />
              </Field>
            </>
          ) : null}

          {type === "workforce" ? (
            <>
              <Field id={fid("program")} label="Which program?" error={errors.program}>
                <select {...text("program")}>
                  <option value="workforce">Workforce development</option>
                  <option value="business-development">Business development</option>
                </select>
              </Field>

              <Field id={fid("city")} label="City (optional)" error={errors.city}>
                <input {...text("city")} type="text" autoComplete="address-level2" />
              </Field>

              <Field id={fid("school")} label="School or program (optional)" error={errors.school}>
                <input {...text("school")} type="text" />
              </Field>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 text-[16px]">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={Boolean(values.isUnder18)}
                    onChange={(e) => set("isUnder18", e.target.checked)}
                  />
                  I&rsquo;m under 18.
                </label>
              </div>

              {values.isUnder18 ? (
                <>
                  <Field id={fid("guardianName")} label="Parent or guardian name" error={errors.guardianName}>
                    <input {...text("guardianName")} type="text" />
                  </Field>
                  <Field id={fid("guardianEmail")} label="Parent or guardian email" error={errors.guardianEmail}>
                    <input {...text("guardianEmail")} type="email" />
                  </Field>
                </>
              ) : null}
            </>
          ) : null}

          <Field
            id={fid("message")}
            label={type === "contact" ? "Message" : "Anything else? (optional)"}
            error={errors.message}
            className="sm:col-span-2"
          >
            <textarea {...text("message")} rows={5} maxLength={2000} required={type === "contact"} />
          </Field>
        </div>

        <div className="honeypot" aria-hidden="true">
          <label htmlFor={fid("website")}>Website</label>
          <input
            id={fid("website")}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={(values.website as string) ?? ""}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        {estimate ? (
          <div
            className="mt-6 flex flex-wrap items-center gap-3 p-4"
            style={{ background: "var(--paper)", border: "1px solid var(--line-strong)", borderRadius: 2 }}
          >
            <span className="text-[15px]">
              Catering estimate attached: <strong>{money(estimate.total)}</strong> for up to {estimate.guests}{" "}
              guests
            </span>
            <button type="button" onClick={() => shared?.clear()} className="link">
              remove
            </button>
          </div>
        ) : null}

        <Turnstile siteKey={siteKey} onToken={onToken} resetSignal={resetSignal} />

        <button type="submit" className="btn btn-primary mt-7" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : SUBMIT_LABEL[type]}
        </button>
      </form>
    </div>
  );
}
