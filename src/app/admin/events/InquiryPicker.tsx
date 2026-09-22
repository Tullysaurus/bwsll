import type { InquiryRecord } from "@/lib/db";
import { inquiryPickerLabel } from "@/lib/inquiry-events";

/**
 * A plain GET form — picking an inquiry reloads /admin/events/new with `?from=<id>`, so
 * the prefill happens on the server and the page works without client JavaScript.
 */
export function InquiryPicker({
  inquiries,
  selectedId,
}: {
  inquiries: InquiryRecord[];
  selectedId?: number;
}) {
  if (inquiries.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: "var(--muted)" }}>
        No event or catering requests yet — once one arrives you can start an event from it.
      </p>
    );
  }

  return (
    <form method="get" className="max-w-[620px]">
      <label htmlFor="from" className="field-label">
        Autofill from a request
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <select
          id="from"
          name="from"
          defaultValue={selectedId ? String(selectedId) : ""}
          className="field-input"
          style={{ flex: "1 1 320px", minHeight: 44 }}
        >
          <option value="">Start from blank</option>
          {inquiries.map((inquiry) => (
            <option key={inquiry.id} value={inquiry.id}>
              {inquiryPickerLabel(inquiry)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary" style={{ minHeight: 44, padding: "12px 18px" }}>
          Autofill
        </button>
      </div>
      <p className="field-hint">
        Fills in the date, time, location and guest count from the request. You can edit
        everything before saving.
      </p>
    </form>
  );
}
