import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { db, env } from "./db";
import { can, isRole, type Permission, type Role } from "./permissions";

/**
 * Authorization for /admin (v2 §3.1).
 *
 * `src/proxy.ts` has already verified the Cloudflare Access JWT and *overwritten* the
 * `x-access-email` header, so it cannot be spoofed by a client. This module decides
 * whether that verified identity is allowed in, and with what role.
 */

export type AdminUser = {
  email: string;
  role: Role;
  /** True when the role comes from the OWNER_EMAILS var rather than the database. */
  fromConfig: boolean;
};

export class NotAuthorizedError extends Error {
  constructor(
    readonly reason: "no-identity" | "not-allowed" | "forbidden",
    readonly email: string | null,
    readonly permission?: Permission,
  ) {
    super(
      reason === "forbidden"
        ? `${email} lacks permission ${permission}`
        : `${email ?? "anonymous"} is not an admin`,
    );
    this.name = "NotAuthorizedError";
  }
}

/** Emails that are always active owners, so a fresh deploy can always get in. */
export function configOwners(): string[] {
  return (env().OWNER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/** The verified email from the proxy, lowercased. Null when there is none. */
export const currentEmail = cache(async (): Promise<string | null> => {
  const value = (await headers()).get("x-access-email");
  const email = value?.trim().toLowerCase();
  return email ? email : null;
});

/**
 * The signed-in admin, or null when the visitor is verified but not allowed in.
 * Cached per request — the admin layout and the page both call it.
 */
export const currentAdmin = cache(async (): Promise<AdminUser | null> => {
  const email = await currentEmail();
  if (!email) return null;

  // Local development only: the proxy's NODE_ENV-keyed bypass sets this identity.
  // Gated the same way so a production build compiles the branch out entirely — the
  // deploy check in DEPLOY.md §5 greps the bundle for this string.
  if (process.env.NODE_ENV !== "production" && email === "dev@localhost") {
    return { email, role: "owner", fromConfig: true };
  }

  if (configOwners().includes(email)) return { email, role: "owner", fromConfig: true };

  const database = db();
  if (!database) return null;

  const row = await database
    .prepare("SELECT email, role, active FROM admin_users WHERE email = ?1")
    .bind(email)
    .first<{ email: string; role: string; active: number }>();

  if (!row || row.active !== 1 || !isRole(row.role)) return null;
  return { email: row.email, role: row.role, fromConfig: false };
});

/**
 * Throws unless the caller is an allowed admin holding `permission`.
 *
 * **Every server action and `/api/admin/*` route must call this.** The admin layout's
 * check does not protect server actions — they are separate POST endpoints that never
 * render a layout.
 */
export async function requireAdmin(permission?: Permission): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user) {
    const email = await currentEmail();
    throw new NotAuthorizedError(email ? "not-allowed" : "no-identity", email);
  }
  if (permission && !can(user.role, permission)) {
    throw new NotAuthorizedError("forbidden", user.email, permission);
  }
  return user;
}

/** Non-throwing variant for pages, which render an explanation instead. */
export async function checkAdmin(
  permission?: Permission,
): Promise<{ ok: true; user: AdminUser } | { ok: false; reason: "not-allowed" | "forbidden"; email: string | null }> {
  const user = await currentAdmin();
  if (!user) return { ok: false, reason: "not-allowed", email: await currentEmail() };
  if (permission && !can(user.role, permission)) {
    return { ok: false, reason: "forbidden", email: user.email };
  }
  return { ok: true, user };
}

/* --- admin_users management (Team page) --- */

export type AdminUserRow = {
  email: string;
  role: Role;
  active: number;
  added_by: string | null;
  created_at: string;
};

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const database = db();
  if (!database) return [];
  const { results } = await database
    .prepare("SELECT * FROM admin_users ORDER BY role ASC, email ASC")
    .all<AdminUserRow>();
  return results ?? [];
}
