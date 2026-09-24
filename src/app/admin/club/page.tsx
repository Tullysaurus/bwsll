import Link from "next/link";
import { guardPage } from "../Guard";
import { expireLapsedMembers } from "../club-actions";
import { CLUB_STATUS_LABEL, isLapsed, listClubMembers, perksStart } from "@/lib/club";
import { todayLocal } from "@/lib/closures";
import { longDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  active: "var(--green)",
  pending: "var(--gold)",
  expired: "var(--muted)",
  cancelled: "var(--muted)",
};

export default async function ClubPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const members = await listClubMembers();
  const today = todayLocal();
  const lapsed = members.filter((member) => isLapsed(member, today));

  return (
    <div className="max-w-[820px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>
          Liquid Love Club
        </h1>
        <Link href="/admin/club/new" className="btn btn-primary">
          Add a member
        </Link>
      </div>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        {members.filter((member) => member.status === "active").length} active ·{" "}
        {members.length} in total. Perks begin two months after a membership starts.
      </p>

      {lapsed.length ? (
        <form
          action={expireLapsedMembers}
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[2px] p-4"
          style={{ border: "1px solid var(--gold)", background: "#fdf6e7" }}
        >
          <p className="text-[15px]">
            {lapsed.length} membership{lapsed.length === 1 ? "" : "s"} ran past the end date
            but still say active.
          </p>
          <button type="submit" className="btn btn-secondary">
            Mark them expired
          </button>
        </form>
      ) : null}

      {members.length === 0 ? (
        <p className="mt-8 text-[16px]" style={{ color: "var(--muted)" }}>
          Nobody has joined yet. A club request in Messages can be turned into a member
          with one button.
        </p>
      ) : (
        <ul className="rule-top-ink mt-6 list-none">
          {members.map((member) => (
            <li key={member.id} className="py-4" style={{ borderBottom: "1px solid var(--line)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-[17px]">
                  <Link href={`/admin/club/${member.id}`} className="link">
                    {member.name}
                  </Link>{" "}
                  <span style={{ color: "var(--muted)" }}>{member.email}</span>
                </p>
                <p className="text-[14px] font-medium" style={{ color: STATUS_COLOR[member.status] }}>
                  {CLUB_STATUS_LABEL[member.status]}
                </p>
              </div>
              <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
                {member.start_date ? (
                  <>
                    Started {longDate(`${member.start_date}T00:00`)} · perks from{" "}
                    {longDate(`${perksStart(member)}T00:00`)}
                    {member.end_date ? <> · renews {longDate(`${member.end_date}T00:00`)}</> : null}
                  </>
                ) : (
                  "No start date yet"
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
