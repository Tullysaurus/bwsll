/** Catering packages — §5.3. `base` is the price for up to 10 guests; ×2 for 20, ×4 for 40. */

export type GuestTier = 10 | 20 | 40;
export const guestTiers: GuestTier[] = [10, 20, 40];
export const tierMultiplier: Record<GuestTier, number> = { 10: 1, 20: 2, 40: 4 };

export type CateringPackage = { id: string; name: string; group: string; base: number };

export const cateringPackages: CateringPackage[] = [
  { id: "hot-coffee-tea", name: "Hot Coffee / Tea", group: "Drinks & breakfast", base: 30 },
  { id: "cold-drinks", name: "Cold Drink Package", group: "Drinks & breakfast", base: 30 },
  { id: "muffins-croissants", name: "Muffins & Croissants", group: "Drinks & breakfast", base: 30 },
  { id: "bagels", name: "Bagels & Cream Cheese", group: "Drinks & breakfast", base: 30 },
  { id: "ll-bundle", name: "Liquid Lounge Bundle", group: "Drinks & breakfast", base: 60 },
  { id: "fruit-tray", name: "Fruit Tray", group: "Trays & sides", base: 40 },
  { id: "veggie-tray", name: "Veggie Tray", group: "Trays & sides", base: 45 },
  { id: "cheese-crackers", name: "Cheese & Crackers", group: "Trays & sides", base: 50 },
  { id: "chicken-salad", name: "Chicken Salad & Crackers", group: "Trays & sides", base: 50 },
  { id: "beef-kabobs", name: "Beef Kabobs", group: "Entrées", base: 75 },
  { id: "chicken-wings", name: "Chicken Wings", group: "Entrées", base: 80 },
  { id: "charcuterie", name: "Charcuterie Tray", group: "Entrées", base: 95 },
  // TBD: Veggie / Chicken Kabobs — price sheet says "$50–$70 per tier". Confirm with the
  // owner, then add here; the estimator picks them up with no other changes.
];

/** Default estimator state — §5.3. */
export const defaultSelected = ["hot-coffee-tea", "muffins-croissants"];
export const defaultTier: GuestTier = 20;

export const addOnNote =
  "Add-on drinks: beer $4, wine spritzers $6, mocktails $7, mimosas $8 (12 oz). Bottled wine $18–$45. Bartenders, glassware, linens and AV quoted on request.";

export const packagePrice = (pkg: CateringPackage, tier: GuestTier) => pkg.base * tierMultiplier[tier];

export const rentalRows = [
  { id: "business", title: "During business hours", sub: "7am–4pm" },
  { id: "after", title: "After hours", sub: "5pm–9pm" },
] as const;

export const rentalTiers = [
  { id: "g10", label: "Up to 10 guests" },
  { id: "g20", label: "Up to 20 guests" },
  { id: "g40", label: "Up to 40 guests" },
] as const;

export const goodToKnow = [
  "A $100 non-refundable deposit reserves your date.",
  "Please leave the space as you found it — decorations down, trash out, furniture back.",
  "Alcohol needs our written approval and licensed service.",
  "Bringing your own caterer? A $50–$200 fee applies by group size.",
  "Political events, fundraisers and campaigns can’t be hosted.",
];
