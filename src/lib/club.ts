import "server-only";
import { db, type ClubMemberRecord, type ClubMemberStatus } from "./db";

/**
 * Liquid Love Club members.
 *
 * "Perks start" is computed rather than stored: the fine print says perks begin two
 * months into an active membership, and a stored date would go stale the day that
 * changes. `end_date` *is* stored, because a membership can be cancelled or extended.
 */

export const CLUB_STATUSES: ClubMemberStatus[] = ["pending", "active", "expired", "cancelled"];

export const CLUB_STATUS_LABEL: Record<ClubMemberStatus, string> = {
  pending: "Waiting to start",
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
};

/** Months of active membership before the event and conference-room perks begin. */
export const PERKS_AFTER_MONTHS = 2;

/** Adds whole months to a "YYYY-MM-DD" date, clamping to the end of a short month. */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;

  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function perksStart(member: { start_date: string | null }): string | null {
  return member.start_date ? addMonths(member.start_date, PERKS_AFTER_MONTHS) : null;
}

/** A membership that has run past its end date, whatever the stored status says. */
export function isLapsed(member: ClubMemberRecord, today: string): boolean {
  return Boolean(member.end_date && member.end_date < today && member.status === "active");
}

export async function listClubMembers(): Promise<ClubMemberRecord[]> {
  const database = db();
  if (!database) return [];
  try {
    const { results } = await database
      .prepare(
        `SELECT * FROM club_members WHERE deleted_at IS NULL
         ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, name`,
      )
      .all<ClubMemberRecord>();
    return results ?? [];
  } catch {
    // An un-migrated database must not take the screen down.
    return [];
  }
}

export async function getClubMember(id: number): Promise<ClubMemberRecord | null> {
  const database = db();
  if (!database) return null;
  return (
    (await database
      .prepare("SELECT * FROM club_members WHERE id = ?1 AND deleted_at IS NULL")
      .bind(id)
      .first<ClubMemberRecord>()) ?? null
  );
}

/** Whether this inquiry already produced a member, so the button can say so. */
export async function memberForInquiry(inquiryId: number): Promise<ClubMemberRecord | null> {
  const database = db();
  if (!database) return null;
  try {
    return (
      (await database
        .prepare("SELECT * FROM club_members WHERE inquiry_id = ?1 AND deleted_at IS NULL")
        .bind(inquiryId)
        .first<ClubMemberRecord>()) ?? null
    );
  } catch {
    return null;
  }
}
