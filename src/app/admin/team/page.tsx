import { addTeamMember, setTeamActive, setTeamRole } from "../actions";
import { guardPage } from "../Guard";
import { configOwners, listAdminUsers } from "@/lib/auth";
import { DEFAULT_NEW_USER_ROLE, ROLES, ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/permissions";
import { formatCreatedAt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const guard = await guardPage("team.manage");
  if (!guard.ok) return guard.screen;

  const [users, permanent] = await Promise.all([listAdminUsers(), configOwners()]);

  return (
    <div className="max-w-[820px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Team
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        Anyone listed here can sign in at <code>/admin</code> with a one-time code sent to
        their email. Remove someone by making them inactive.
      </p>

      <form action={addTeamMember} className="mt-6 pb-6" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="grid gap-4 sm:grid-cols-[1fr_170px_auto] sm:items-end">
          <div>
            <label htmlFor="email" className="field-label">
              Add someone by email
            </label>
            <input id="email" name="email" type="email" required className="field-input" placeholder="name@example.com" />
          </div>
          <div>
            <label htmlFor="role" className="field-label">
              Role
            </label>
            <select id="role" name="role" defaultValue={DEFAULT_NEW_USER_ROLE} className="field-input">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </div>
        <ul className="mt-4 list-none text-[14px]" style={{ color: "var(--muted)" }}>
          {ROLES.map((role) => (
            <li key={role} className="mb-1">
              <strong style={{ color: "var(--ink)" }}>{ROLE_LABEL[role]}</strong> — {ROLE_DESCRIPTION[role]}
            </li>
          ))}
        </ul>
      </form>

      {permanent.length > 0 ? (
        <section className="mt-8">
          <h2 className="display" style={{ fontSize: 22 }}>
            Permanent owners
          </h2>
          <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
            Set in the site&rsquo;s configuration so there is always a way in. They can&rsquo;t be
            changed here.
          </p>
          <ul className="rule-top-ink mt-3 list-none">
            {permanent.map((email) => (
              <li key={email} className="py-3 text-[16px]" style={{ borderBottom: "1px solid var(--line)" }}>
                {email}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="display" style={{ fontSize: 22 }}>
          People
        </h2>
        {users.length === 0 ? (
          <p className="mt-3 text-[16px]" style={{ color: "var(--muted)" }}>
            Nobody added yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="price-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th scope="col" className="size-label">Email</th>
                  <th scope="col" className="size-label">Role</th>
                  <th scope="col" className="size-label">Added</th>
                  <th scope="col" className="size-label">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.email}>
                    <td style={{ fontSize: 15 }}>{row.email}</td>
                    <td>
                      <form action={setTeamRole} className="flex items-center gap-2">
                        <input type="hidden" name="email" value={row.email} />
                        <label htmlFor={`role-${row.email}`} className="sr-only">
                          Role for {row.email}
                        </label>
                        <select
                          id={`role-${row.email}`}
                          name="role"
                          defaultValue={row.role}
                          className="field-input"
                          style={{ minHeight: 36, width: 110, padding: "4px 8px", fontSize: 14 }}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABEL[role]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="link" style={{ fontSize: 14 }}>
                          Save
                        </button>
                      </form>
                    </td>
                    <td style={{ fontSize: 14, color: "var(--muted)" }}>
                      {formatCreatedAt(row.created_at)}
                      {row.added_by ? <><br />by {row.added_by}</> : null}
                    </td>
                    <td>
                      <form action={setTeamActive}>
                        <input type="hidden" name="email" value={row.email} />
                        <input type="hidden" name="active" value={row.active ? "0" : "1"} />
                        <button type="submit" className="link" style={{ fontSize: 14 }}>
                          {row.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                      {row.active ? null : (
                        <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                          inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
