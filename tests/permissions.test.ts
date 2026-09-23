import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEW_USER_ROLE,
  PERMISSIONS,
  ROLES,
  can,
  isRole,
  type Permission,
} from "@/lib/permissions";

/**
 * The Cloudflare Access policy is Include-Everyone (v2 §3.3), so this map is the real
 * gate on /admin. These tests pin it down deliberately — a change here should be a
 * conscious decision, not a side effect.
 */

const OWNER_ONLY: Permission[] = [
  "team.manage",
  "trash.purge",
  "settings.business",
  "settings.legal",
  "inquiries.workforce",
];

describe("permissions", () => {
  it("lets owners do everything", () => {
    for (const permission of PERMISSIONS) {
      expect(can("owner", permission), permission).toBe(true);
    }
  });

  it("withholds exactly the owner-only permissions from staff", () => {
    for (const permission of PERMISSIONS) {
      expect(can("staff", permission), permission).toBe(!OWNER_ONLY.includes(permission));
    }
  });

  it("keeps workforce applications away from staff", () => {
    // The workforce form is the one place the site collects data about people who may
    // be under 18. If this ever flips, it must be on purpose.
    expect(can("staff", "inquiries.workforce")).toBe(false);
  });

  it("lets staff reach the admin at all", () => {
    expect(can("staff", "admin.access")).toBe(true);
  });

  it("defaults new users to the least privilege that is useful", () => {
    expect(DEFAULT_NEW_USER_ROLE).toBe("staff");
    expect(can(DEFAULT_NEW_USER_ROLE, "inquiries.workforce")).toBe(false);
    expect(can(DEFAULT_NEW_USER_ROLE, "team.manage")).toBe(false);
  });

  it("validates roles from untrusted input", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);
    for (const bad of ["admin", "OWNER", "", null, undefined, 1, {}]) {
      expect(isRole(bad)).toBe(false);
    }
  });
});
