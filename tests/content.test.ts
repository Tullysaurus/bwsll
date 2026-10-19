import { beforeEach, describe, expect, it, vi } from "vitest";
import { business } from "@/content/business";
import { addOnNote, goodToKnow } from "@/content/catering";

let rows = new Map<string, string>();

// The getters only need the settings rows; nothing else here touches the database.
vi.mock("@/lib/settings", () => ({ settingRows: async () => rows }));

const { getBusiness, getCatering } = await import("@/lib/content");

beforeEach(() => {
  rows = new Map();
});

/**
 * The admin edits only some of the business and catering fields; the rest come from the
 * code. A row saved before a field was locked must not keep it alive on the site.
 */
describe("locked content", () => {
  it("takes contact details from the saved row and everything else from the code", async () => {
    rows.set(
      "business",
      JSON.stringify({
        name: "Renamed in the admin",
        legalEntity: "Someone Else, LLC",
        phone: "918-555-0100",
        address: { street: "1 Main St.", building: "Somewhere else" },
        social: { instagram: "https://www.instagram.com/NewHandle/" },
      }),
    );

    const info = await getBusiness();
    expect(info.phone).toBe("918-555-0100");
    expect(info.phoneHref).toBe("tel:+19185550100");
    expect(info.address.street).toBe("1 Main St.");
    expect(info.addressLine).toBe(`1 Main St., ${business.address.city}, ${business.address.state} ${business.address.zip}`);
    expect(info.instagramHandle).toBe("@NewHandle");

    expect(info.name).toBe(business.name);
    expect(info.legalEntity).toBe(business.legalEntity);
    expect(info.address.building).toBe(business.address.building);
  });

  it("keeps the default Instagram handle when the link has no account in it", async () => {
    rows.set("business", JSON.stringify({ social: { instagram: "" } }));
    expect((await getBusiness()).instagramHandle).toBe(business.instagramHandle);
  });

  it("takes catering packages from the saved row but the wording from the code", async () => {
    const packages = [{ id: "fruit-tray", name: "Fruit Tray", group: "Trays & sides", base: 42 }];
    rows.set(
      "catering",
      JSON.stringify({ packages, addOnNote: "Old note", goodToKnow: ["Old rule"], defaultSelected: [] }),
    );

    const catering = await getCatering();
    expect(catering.packages).toEqual(packages);
    expect(catering.defaultSelected).toEqual([]);
    expect(catering.addOnNote).toBe(addOnNote);
    expect(catering.goodToKnow).toEqual(goodToKnow);
  });
});
