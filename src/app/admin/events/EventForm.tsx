"use client";

import { useActionState } from "react";
import { saveEvent, type EventFormState } from "../actions";
import type { EventRecord } from "@/lib/db";

const initial: EventFormState = {};

export function EventForm({ event }: { event?: EventRecord }) {
  const [state, formAction, pending] = useActionState(saveEvent, initial);

  const date = event?.starts_at.slice(0, 10) ?? "";
  const startTime = event?.starts_at.slice(11, 16) ?? "";
  const endTime = event?.ends_at?.slice(11, 16) ?? "";

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
          <input id="title" name="title" className="field-input" defaultValue={event?.title ?? ""} required />
          {state.errors?.title ? <p className="field-error">{state.errors.title}</p> : null}
        </div>

        <div>
          <label htmlFor="date" className="field-label">
            Date
          </label>
          <input id="date" name="date" type="date" className="field-input" defaultValue={date} required />
          {state.errors?.date ? <p className="field-error">{state.errors.date}</p> : null}
        </div>

        <div>
          <label htmlFor="kind" className="field-label">
            Kind
          </label>
          <select id="kind" name="kind" className="field-input" defaultValue={event?.kind ?? "public"}>
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
            defaultValue={startTime}
            required
          />
          {state.errors?.startTime ? <p className="field-error">{state.errors.startTime}</p> : null}
        </div>

        <div>
          <label htmlFor="endTime" className="field-label">
            End time (optional)
          </label>
          <input id="endTime" name="endTime" type="time" className="field-input" defaultValue={endTime} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="location" className="field-label">
            Location
          </label>
          <input
            id="location"
            name="location"
            className="field-input"
            defaultValue={event?.location ?? "Liquid Lounge"}
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
            defaultValue={event?.description ?? ""}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-3 text-[16px]">
            <input
              type="checkbox"
              name="published"
              className="checkbox"
              defaultChecked={event ? event.published === 1 : true}
            />
            Show on the public calendar
          </label>
        </div>
      </div>

      <button type="submit" className="btn btn-primary mt-6" disabled={pending}>
        {pending ? "Saving…" : event ? "Save event" : "Create event"}
      </button>
    </form>
  );
}
