/**
 * Who may do what in /admin (v2 §3.2).
 *
 * Pure and dependency-free so it can be unit-tested and imported from anywhere.
 * Cloudflare Access proves *identity*; this map decides *authority*.
 */

export const ROLES = ["owner", "staff"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const PERMISSIONS = [
  /** Reach /admin at all. */
  "admin.access",
  /** Add, promote, deactivate admin users. */
  "team.manage",
  /** Purge a trashed record and its R2 objects for good. */
  "trash.purge",
  /** Edit business identity: name, address, phone, legal entity, links. */
  "settings.business",
  /** Edit the privacy notice and terms. */
  "settings.legal",
  /** View or export workforce applications — applicants can be minors. */
  "inquiries.workforce",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Owner-only. Everything not listed here is available to staff.
 *
 * `inquiries.workforce` is the reason the role split exists at all: the workforce form
 * is the one place the site collects data about people who may be under 18.
 */
const OWNER_ONLY: readonly Permission[] = [
  "team.manage",
  "trash.purge",
  "settings.business",
  "settings.legal",
  "inquiries.workforce",
];

export function can(role: Role, permission: Permission): boolean {
  if (role === "owner") return true;
  return !OWNER_ONLY.includes(permission);
}

/**
 * Role given to someone the owner adds on the Team page.
 *
 * Deliberately `staff`: the Cloudflare Access policy is Include-Everyone (v2 §3.3), so
 * this constant is the only thing standing between "the owner typed an email" and
 * "that person can read minors' applications". Promote deliberately instead.
 */
export const DEFAULT_NEW_USER_ROLE: Role = "staff";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  staff: "Staff",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "Full access, including the team, business details, legal pages and workforce applications.",
  staff: "Day-to-day work: inquiries, events, menu, hours, photos and the mailing list.",
};
