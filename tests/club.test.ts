import { describe, expect, it } from "vitest";
import { addMonths, isLapsed, perksStart, PERKS_AFTER_MONTHS } from "@/lib/club";
import { inquirySchema, partnerInquirySchema } from "@/lib/schemas";
import type { ClubMemberRecord } from "@/lib/db";
import { cleanPath } from "@/lib/analytics";
import { isTracked } from "@/lib/analytics-names";

const member = (over: Partial<ClubMemberRecord> = {}): ClubMemberRecord => ({
  id: 1,
  name: "Ada",
  email: "ada@example.com",
  phone: null,
  status: "active",
  start_date: "2026-09-01",
  end_date: "2027-09-01",
  pay_link: null,
  notes: null,
  inquiry_id: null,
  created_at: "2026-09-01 12:00:00",
  deleted_at: null,
  ...over,
});

describe("club membership dates", () => {
  it("computes when perks begin rather than storing it", () => {
    expect(PERKS_AFTER_MONTHS).toBe(2);
    expect(perksStart(member())).toBe("2026-11-01");
    expect(perksStart(member({ start_date: null }))).toBeNull();
  });

  it("clamps to the end of a shorter month", () => {
    expect(addMonths("2026-12-31", 2)).toBe("2027-02-28");
    expect(addMonths("2027-12-31", 2)).toBe("2028-02-29");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("spots a membership still marked active past its end date", () => {
    expect(isLapsed(member({ end_date: "2026-09-01" }), "2026-09-20")).toBe(true);
    expect(isLapsed(member({ end_date: "2027-09-01" }), "2026-09-20")).toBe(false);
    // Already cancelled: not something to chase.
    expect(isLapsed(member({ end_date: "2026-01-01", status: "cancelled" }), "2026-09-20")).toBe(false);
  });
});

describe("partner inquiries", () => {
  const valid = {
    type: "partner" as const,
    name: "Ada Lovelace",
    email: "ada@example.com",
    organization: "Analytical Engines",
    partnerWebsite: "https://example.com",
    idea: "A monthly pop-up in the lounge.",
  };

  it("accepts a partner request through the shared union", () => {
    const parsed = inquirySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("asks for the organization and the idea", () => {
    const parsed = partnerInquirySchema.safeParse({ ...valid, organization: "", idea: "" });
    expect(parsed.success).toBe(false);
    const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."));
    expect(paths).toContain("organization");
    expect(paths).toContain("idea");
  });

  it("keeps the real website out of the honeypot field", () => {
    // `website` is the honeypot on every type: a partner filling it in would have their
    // message silently swallowed, so their real website is `partnerWebsite`.
    const parsed = partnerInquirySchema.parse(valid);
    expect(parsed.partnerWebsite).toBe("https://example.com");
    expect(parsed.website).toBe("");
  });
});

describe("analytics guards", () => {
  it("only accepts names from the allowlist", () => {
    expect(isTracked("menu_pdf")).toBe(true);
    expect(isTracked("page_view")).toBe(false);
    expect(isTracked("'; DROP TABLE analytics_events; --")).toBe(false);
  });

  it("keeps the path to something that could be a path", () => {
    expect(cleanPath("/menu?utm_source=instagram")).toBe("/menu");
    expect(cleanPath("https://elsewhere.example/menu")).toBe("/");
    expect(cleanPath("not-a-path")).toBe("/");
    expect(cleanPath(`/${"x".repeat(200)}`)).toBe("/");
  });
});
