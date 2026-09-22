import { listSubscribers } from "@/lib/db";
import { formatCreatedAt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const rows = await listSubscribers();

  return (
    <div className="max-w-[720px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>
          Subscribers
        </h1>
        <a href="/api/admin/subscribers" className="btn btn-secondary" download="subscribers.csv">
          Export CSV
        </a>
      </div>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        {rows.length} {rows.length === 1 ? "address" : "addresses"}.
      </p>

      {rows.length === 0 ? null : (
        <table className="price-table mt-6">
          <thead>
            <tr>
              <th scope="col" className="size-label">
                Email
              </th>
              <th scope="col" className="size-label">
                Source
              </th>
              <th scope="col" className="size-label">
                Signed up
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.email}>
                <td style={{ fontSize: 15 }}>{row.email}</td>
                <td style={{ fontSize: 15 }}>{row.source ?? "—"}</td>
                <td style={{ fontSize: 15 }}>{formatCreatedAt(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
