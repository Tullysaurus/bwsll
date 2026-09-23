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
export function EventForm({ event, defaults }: { event?: EventRecord; defaults?: EventDefaults }) {
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

  return (
    <form action={formAction} className="max-w-[620px]">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

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

        <div className="sm:col-span-2">
          <label className="flex items-center gap-3 text-[16px]">
            <input
              type="checkbox"
              name="published"
              className="checkbox"
              defaultChecked={values.published}
            />
            Show on the public calendar
          </label>
        </div>
      </div>

      <SaveBar
        saveLabel={event ? "Save event" : "Create event"}
        status={pending ? "saving" : state.message ? "error" : "idle"}
        error={state.message ?? ""}
        always={!event}
      />
    </form>
  );
}
