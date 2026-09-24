"use client";

import { useActionState } from "react";
import { saveEvent, type EventFormState } from "../actions";
import { SaveBar } from "../DirtyForm";
import type { EventRecord } from "@/lib/db";
import type { EventDefaults } from "@/lib/inquiry-events";

const initial: EventFormState = {};

const BLANK: EventDefaults = {
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "Liquid Lounge",
  kind: "public",
  description: "",
};

/** `defaults` seeds a new event (e.g. autofilled from an inquiry); `event` edits one. */
export function EventForm({
  event,
  defaults,
  inquiryId,
}: {
  event?: EventRecord;
  defaults?: EventDefaults;
  /** Set when the event is being created from an inquiry, so the two stay linked. */
  inquiryId?: number;
}) {
  const [state, formAction, pending] = useActionState(saveEvent, initial);

  const values: EventDefaults & { published: boolean } = event
    ? {
        title: event.title,
        date: event.starts_at.slice(0, 10),
        startTime: event.starts_at.slice(11, 16),
        endTime: event.ends_at?.slice(11, 16) ?? "",
        location: event.location,
        kind: event.kind,
        description: event.description ?? "",
        published: event.published === 1,
      }
    : { ...BLANK, ...defaults, published: true };

  const usesSpace = event ? event.uses_space === 1 : (defaults?.kind ?? "public") !== "catering";
  const hideTitle = event ? event.hide_title === 1 : (defaults?.kind ?? "public") === "private";

  return (
    <form action={formAction} className="max-w-[620px]">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      {inquiryId && !event ? <input type="hidden" name="inquiryId" value={inquiryId} /> : null}

      {state.conflicts?.length ? (
        <div
          role="alert"
          className="mb-5 p-4"
          style={{ border: "1px solid var(--gold)", background: "#fdf6e7", borderRadius: 2 }}
        >
          <p className="text-[16px] font-medium">That time isn&rsquo;t free.</p>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-[15px]">
            {state.conflicts.map((conflict) => (
              <li key={conflict}>{conflict}</li>
            ))}
          </ul>
          <p className="mt-3 text-[14px]" style={{ color: "var(--muted)" }}>
            Change the time and save again, or put it in the diary regardless:
          </p>
          {/* Only this button sends `force`, so an edited time is re-checked rather than
              being waved through by a flag left over from the last attempt. */}
          <button type="submit" name="force" value="1" className="btn btn-secondary mt-3">
            Save anyway
          </button>
        </div>
      ) : null}

      {state.message ? (
        <p role="alert" className="mb-5 p-3" style={{ border: "1px solid #8C2F20", color: "#8C2F20" }}>
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="field-label">
            Title
          </label>
          <input id="title" name="title" className="field-input" defaultValue={values.title} required />
          {state.errors?.title ? <p className="field-error">{state.errors.title}</p> : null}
        </div>

        <div>
          <label htmlFor="date" className="field-label">
            Date
          </label>
          <input id="date" name="date" type="date" className="field-input" defaultValue={values.date} required />
          {state.errors?.date ? <p className="field-error">{state.errors.date}</p> : null}
        </div>

        <div>
          <label htmlFor="kind" className="field-label">
            Kind
          </label>
          <select id="kind" name="kind" className="field-input" defaultValue={values.kind}>
            <option value="public">Open to all</option>
            <option value="private">Private event</option>
            <option value="catering">Off-site catering</option>
          </select>
        </div>

        <div>
          <label htmlFor="startTime" className="field-label">
            Start time
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            className="field-input"
            defaultValue={values.startTime}
            required
          />
          {state.errors?.startTime ? <p className="field-error">{state.errors.startTime}</p> : null}
        </div>

        <div>
          <label htmlFor="endTime" className="field-label">
            End time (optional)
          </label>
          <input id="endTime" name="endTime" type="time" className="field-input" defaultValue={values.endTime} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="location" className="field-label">
            Location
          </label>
          <input
            id="location"
            name="location"
            className="field-input"
            defaultValue={values.location}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="field-label">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="field-input"
            defaultValue={values.description}
          />
        </div>

        <div className="sm:col-span-2 grid gap-3">
          <label className="flex items-center gap-3 text-[16px]">
            <input
              type="checkbox"
              name="published"
              className="checkbox"
              defaultChecked={values.published}
            />
            Show on the public calendar
          </label>

          <label className="flex items-start gap-3 text-[16px]">
            <input type="checkbox" name="usesSpace" className="checkbox mt-1" defaultChecked={usesSpace} />
            <span>
              Takes up the room
              <span className="block text-[14px]" style={{ color: "var(--muted)" }}>
                Blocks other bookings at this time. Turn it off for catering we deliver
                somewhere else.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-[16px]">
            <input type="checkbox" name="hideTitle" className="checkbox mt-1" defaultChecked={hideTitle} />
            <span>
              Hide the title from visitors
              <span className="block text-[14px]" style={{ color: "var(--muted)" }}>
                The calendar says &ldquo;Private event&rdquo; instead of the name.
              </span>
            </span>
          </label>
        </div>
      </div>

      <SaveBar
        saveLabel={event ? "Save event" : "Create event"}
        status={pending ? "saving" : state.message && !state.conflicts ? "error" : "idle"}
        error={state.message ?? ""}
        always={!event || Boolean(state.conflicts?.length)}
      />
    </form>
  );
}
