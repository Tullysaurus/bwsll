import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "../../ConfirmButton";
import { DirtyForm } from "../../DirtyForm";
import { guardPage } from "../../Guard";
import { createClubMember, deleteClubMember, saveClubMember } from "../../club-actions";
import { CLUB_STATUS_LABEL, CLUB_STATUSES, getClubMember, perksStart } from "@/lib/club";
import { getInquiry } from "@/lib/db";
import { longDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * One member — or a blank form at /admin/club/new, optionally prefilled from the club
 * request it came from (`?from=<inquiry id>`), which is also what links the two.
 */
export default async function ClubMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const isNew = id === "new";

  const member = isNew ? null : await getClubMember(Number(id));
  if (!isNew && !member) notFound();

  const source = isNew && from ? await getInquiry(Number(from)) : null;
  const usable = source?.type === "club" ? source : null;

  const values = member ?? {
    id: 0,
    name: usable?.name ?? "",
    email: usable?.email ?? "",
    phone: usable?.phone ?? "",
    status: "pending" as const,
    start_date: "",
    end_date: "",
    pay_link: "",
    notes: "",
    inquiry_id: usable?.id ?? null,
  };

  const perks = perksStart(values as { start_date: string | null });

  return (
    <div className="max-w-[720px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/club" className="link">
          ← All members
        </Link>
        {member ? (
          <Link href={`/admin/history/club_member/${member.id}`} className="link">
            History
          </Link>
        ) : null}
      </div>

      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        {member ? member.name : "Add a member"}
      </h1>

      {usable ? (
        <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
          Prefilled from{" "}
          <Link href={`/admin/inquiries/${usable.id}`} className="link">
            their club request
          </Link>
          .
        </p>
      ) : null}

      {member?.inquiry_id ? (
        <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
          Joined from{" "}
          <Link href={`/admin/inquiries/${member.inquiry_id}`} className="link">
            their club request
          </Link>
          .
        </p>
      ) : null}

      {perks ? (
        <p className="mt-4 text-[16px]">
          Perks begin <strong>{longDate(`${perks}T00:00`)}</strong> — two months after the
          start date, worked out from the date rather than stored.
        </p>
      ) : null}

      <DirtyForm
        action={member ? saveClubMember : createClubMember}
        className="mt-8"
        saveLabel={member ? "Save member" : "Add member"}
        always={!member}
      >
        {member ? <input type="hidden" name="id" value={member.id} /> : null}
        {usable ? <input type="hidden" name="inquiry_id" value={usable.id} /> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="field-label">
              Name
            </label>
            <input id="name" name="name" className="field-input" defaultValue={values.name} required />
          </div>

          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="field-input"
              defaultValue={values.email}
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="field-label">
              Phone (optional)
            </label>
            <input id="phone" name="phone" className="field-input" defaultValue={values.phone ?? ""} />
          </div>

          <div>
            <label htmlFor="status" className="field-label">
              Where they&rsquo;re up to
            </label>
            <select id="status" name="status" className="field-input" defaultValue={values.status}>
              {CLUB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CLUB_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="start_date" className="field-label">
              Membership starts
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              className="field-input"
              defaultValue={values.start_date ?? ""}
            />
            <p className="field-hint">Leave the end date blank and we&rsquo;ll set it a year on.</p>
          </div>

          <div>
            <label htmlFor="end_date" className="field-label">
              Renews / ends
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              className="field-input"
              defaultValue={values.end_date ?? ""}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="pay_link" className="field-label">
              Payment link (optional)
            </label>
            <input
              id="pay_link"
              name="pay_link"
              type="url"
              className="field-input"
              placeholder="https://"
              defaultValue={values.pay_link ?? ""}
            />
            <p className="field-hint">
              Wherever you sent them to pay — Square, an invoice. The site never takes
              payments itself.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="field-label">
              Private notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="field-input"
              defaultValue={values.notes ?? ""}
            />
            <p className="field-hint">Only ever seen here.</p>
          </div>
        </div>
      </DirtyForm>

      {member ? (
        <form action={deleteClubMember} className="mt-10">
          <input type="hidden" name="id" value={member.id} />
          <ConfirmButton
            className="link"
            confirm="Move this member to Deleted items? You can put them back."
            style={{ fontSize: 15 }}
          >
            Delete this member
          </ConfirmButton>
        </form>
      ) : null}
    </div>
  );
}
