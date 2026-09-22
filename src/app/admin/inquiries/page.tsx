import Link from "next/link";
import { listInquiries, type InquiryStatus, type InquiryType } from "@/lib/db";
import { formatCreatedAt, longDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES: { value?: InquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "booked", label: "Booked" },
  { value: "closed", label: "Closed" },
  { label: "All" },
];

const TYPES: InquiryType[] = ["event", "catering", "club", "vendor", "workforce", "contact"];

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.find((s) => s.value === params.status)?.value;
  const type = TYPES.find((t) => t === params.type);
  const rows = await listInquiries({ status, type });

  const href = (next: { status?: string; type?: string }) => {
    const query = new URLSearchParams();
    const s = next.status ?? (status ?? "");
    const t = next.type ?? (type ?? "");
    if (s) query.set("status", s);
    if (t) query.set("type", t);
    const qs = query.toString();
    return qs ? `/admin/inquiries?${qs}` : "/admin/inquiries";
  };

  return (
    <div>
      <h1 className="display" style={{ fontSize: 32 }}>
        Inquiries
      </h1>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ul className="flex list-none flex-wrap gap-2">
          {STATUSES.map((item) => (
            <li key={item.label}>
              <Link
                href={href({ status: item.value ?? "" })}
                className="chip"
                style={{ minHeight: 38, padding: "8px 16px" }}
                aria-current={item.value === status || (!item.value && !status) ? "true" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <form method="get" className="ml-auto flex items-center gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="type" className="text-[14px]" style={{ color: "var(--muted)" }}>
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type ?? ""}
            className="field-input"
            style={{ minHeight: 38, width: 170, padding: "6px 10px" }}
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary" style={{ minHeight: 38, padding: "10px 14px" }}>
            Filter
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-[16px]" style={{ color: "var(--muted)" }}>
          Nothing here yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="price-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th scope="col" className="size-label">
                  Received
                </th>
                <th scope="col" className="size-label">
                  Type
                </th>
                <th scope="col" className="size-label">
                  Name
                </th>
                <th scope="col" className="size-label">
                  Event date
                </th>
                <th scope="col" className="size-label">
                  Guests
                </th>
                <th scope="col" className="size-label">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                let data: Record<string, unknown> = {};
                try {
                  data = JSON.parse(row.data) as Record<string, unknown>;
                } catch {
                  /* a malformed row still lists — the detail page shows the raw JSON */
                }
                const eventDate = typeof data.eventDate === "string" ? data.eventDate : "";
                const guests = typeof data.guests === "string" ? data.guests : "";
                return (
                  <tr key={row.id}>
                    <td style={{ fontSize: 15 }}>{formatCreatedAt(row.created_at)}</td>
                    <td>
                      <span className="pill" style={{ fontSize: 11, padding: "4px 10px" }}>
                        {row.type}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/inquiries/${row.id}`} className="link">
                        {row.name}
                      </Link>
                    </td>
                    <td style={{ fontSize: 15 }}>{eventDate ? longDate(eventDate) : "—"}</td>
                    <td style={{ fontSize: 15 }}>{guests || "—"}</td>
                    <td style={{ fontSize: 15, textTransform: "capitalize" }}>{row.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
