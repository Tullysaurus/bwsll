import { addSubscriber, removeSubscriber } from "../actions";
import { guardPage } from "../Guard";
import { listSubscribers } from "@/lib/db";
import { formatCreatedAt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

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

      <form action={addSubscriber} className="mt-6 pb-6" style={{ borderBottom: "1px solid var(--line)" }}>
        <label htmlFor="email" className="field-label">
          Add a subscriber
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            className="field-input"
            style={{ flex: "1 1 280px" }}
          />
          <input type="hidden" name="source" value="added by hand" />
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </div>
        <p className="field-hint">
          Use this for people who signed up in person. Duplicates are ignored.
        </p>
      </form>

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
              <th scope="col" className="size-label">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.email}>
                <td style={{ fontSize: 15 }}>{row.email}</td>
                <td style={{ fontSize: 15 }}>{row.source ?? "—"}</td>
                <td style={{ fontSize: 15 }}>{formatCreatedAt(row.created_at)}</td>
                <td style={{ textAlign: "right" }}>
                  <form action={removeSubscriber}>
                    <input type="hidden" name="email" value={row.email} />
                    <button type="submit" className="link" style={{ fontSize: 14 }}>
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
