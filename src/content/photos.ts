/**
 * Every image on the site goes through `PhotoSlot` so real photos drop in here without
 * touching any layout. Add `src` (a WebP in /public/photos/) to replace a placeholder.
 */

export type PhotoTone = "light" | "light-2" | "dark" | "dark-2" | "green";
export type PhotoSlot = { id: string; src?: string; alt: string; label: string; tone: PhotoTone };

const slots: PhotoSlot[] = [
  {
    id: "hero",
    alt: "The Liquid Lounge bar in morning light",
    label: "Photo or short muted video loop — the bar in morning light, green couch in view",
    tone: "dark",
  },
  { id: "home-menu", alt: "A house signature drink on the bar", label: "Photo — a signature drink on the bar", tone: "light" },
  { id: "offer-events", alt: "The lounge set for a gathering", label: "Photo — the lounge set for a gathering", tone: "light" },
  { id: "offer-catering", alt: "A Liquid Lounge catering spread", label: "Photo — a catering spread", tone: "light" },
  { id: "offer-club", alt: "A bag of Roots Java beans", label: "Photo — a bag of Roots Java beans", tone: "light" },
  {
    id: "home-gem",
    alt: "The Greenwood Entrepreneurship at Moton building on Pine Street",
    label: "Photo — the GEM building on Pine St.",
    tone: "green",
    src: "/photos/home-gem.webp"
  },
  { id: "ig-1", alt: "Instagram post from @BWStLiquidLounge", label: "", tone: "light" },
  { id: "ig-2", alt: "Instagram post from @BWStLiquidLounge", label: "", tone: "light-2" },
  { id: "ig-3", alt: "Instagram post from @BWStLiquidLounge", label: "", tone: "light" },
  { id: "ig-4", alt: "Instagram post from @BWStLiquidLounge", label: "", tone: "light-2" },
  { id: "ig-5", alt: "Instagram post from @BWStLiquidLounge", label: "", tone: "light" },
  { id: "ig-6", alt: "Instagram post from @BWStLiquidLounge", label: "", tone: "light-2" },
  { id: "menu-food", alt: "A honey butter croissant", label: "Photo — honey butter croissant", tone: "light" },
  {
    id: "events-hero",
    alt: "The lounge set up for a private event",
    label: "Photo — the lounge set up for a private event",
    tone: "dark-2",
  },
  { id: "club", alt: "Liquid Love Club perks — coffee beans and a mug", label: "Photo — member perks: beans + mug", tone: "light" },
  {
    id: "workforce",
    alt: "Hands pulling a shot at the espresso machine",
    label: "Photo — hands at the espresso machine (no faces of minors without written parental consent)",
    tone: "light",
  },
  { id: "visit-exterior", alt: "The GEM entrance on Pine Street", label: "Photo — GEM entrance on Pine St.", tone: "light" },
  { id: "about-1", alt: "The Liquid Lounge interior", label: "Photo — the lounge interior", tone: "light" },
  { id: "about-2", alt: "Historic Greenwood wall display", label: "Photo — historic Greenwood wall display", tone: "light" },
];

const byId = new Map(slots.map((s) => [s.id, s]));

export function photo(id: string): PhotoSlot {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown photo slot: ${id}`);
  return found;
}

export const instagramSlots = ["ig-1", "ig-2", "ig-3", "ig-4", "ig-5", "ig-6"].map(photo);
