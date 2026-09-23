import { fieldsOf, humanize, type Field, type Group } from "./shape-form";
import type { Copy } from "./content";

/**
 * Plain-language names for the content fields.
 *
 * The shape editor can derive a form from any object, but `h1a` and `eyebrowMobile` mean
 * nothing to the person editing the site. This maps the key names to what they actually
 * are, groups the fields into the sections they appear in, and hides the few that are
 * wiring rather than words.
 */

/** Keys that are plumbing, not copy — never shown in the editor. */
const HIDDEN = new Set(["slot"]);

const FIELD_LABEL: Record<string, string> = {
  eyebrow: "Small label above the heading",
  eyebrowMobile: "Small label above the heading (on phones)",
  h1a: "Heading — first line",
  h1b: "Heading — second line, shown in italics",
  h2: "Heading",
  h3: "Heading",
  title: "Heading",
  intro: "Intro line",
  body: "Paragraph",
  quote: "Pull quote",
  caption: "Caption",
  empty: "Shown when there are no events yet",
  benefits: "What members get",
  requirements: "What a vendor needs",
  fine: "Small print",
  note: "Small print",
  rentalNote: "Deposit and payment note",
  detail: "Description",
  label: "Name",
  href: "Where the link goes",
  n: "Number",
  heading: "Heading",
  paragraphs: "Paragraphs",
  list: "Bullet points",
  lastUpdated: "Last updated",
};

const SECTION_LABEL: Record<string, string> = {
  "home.hero": "The big photo at the top",
  "home.menuTeaser": "Menu teaser",
  "home.offerings": "The three cards",
  "home.story": "Our story",
  "home.workforce": "Workforce development",
  about: "About page",
  club: "Liquid Love Club page",
  vendors: "Vendors page",
  events: "Events page",
  privateEvents: "Private events & catering page",
  visit: "Visit page",
  menuPage: "Menu page",
  workforceCurriculum: "What the programme covers",
  businessDevelopment: "Business development",
};

/** The pages of the site, in the order they appear in the menu. */
export type CopyPage = {
  slug: string;
  label: string;
  blurb: string;
  /** Where to see it on the site. */
  href: string;
  /** Which top-level copy keys this page owns. */
  keys: (keyof Copy)[];
};

export const COPY_PAGES: CopyPage[] = [
  {
    slug: "home",
    label: "Home page",
    blurb: "The headline, the three cards, the story and the workforce block.",
    href: "/",
    keys: ["home"],
  },
  {
    slug: "menu",
    label: "Menu page",
    blurb: "The words around the menu itself.",
    href: "/menu",
    keys: ["menuPage"],
  },
  {
    slug: "events",
    label: "Events page",
    blurb: "The heading, and what shows when nothing is booked.",
    href: "/events",
    keys: ["events"],
  },
  {
    slug: "private-events",
    label: "Private events & catering",
    blurb: "The heading and the deposit note.",
    href: "/private-events",
    keys: ["privateEvents"],
  },
  {
    slug: "club",
    label: "Liquid Love Club",
    blurb: "What members get, and the small print.",
    href: "/club",
    keys: ["club"],
  },
  {
    slug: "workforce",
    label: "Workforce",
    blurb: "The seven things the programme covers.",
    href: "/workforce",
    keys: ["workforceCurriculum", "businessDevelopment"],
  },
  {
    slug: "vendors",
    label: "Vendors",
    blurb: "What you ask of vendors, and how they're paid.",
    href: "/vendors",
    keys: ["vendors"],
  },
  {
    slug: "about",
    label: "About",
    blurb: "The story of the Lounge.",
    href: "/about",
    keys: ["about"],
  },
  {
    slug: "visit",
    label: "Visit",
    blurb: "Just the heading — hours and address come from Business details.",
    href: "/visit",
    keys: ["visit"],
  },
];

export function findCopyPage(slug: string): CopyPage | undefined {
  return COPY_PAGES.find((page) => page.slug === slug);
}

function lastSegment(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1];
}

export function fieldLabel(path: string): string {
  const key = lastSegment(path);
  return FIELD_LABEL[key] ?? humanize(key);
}

/**
 * The section a field belongs to: up to and including the first numbered item ("Card 2"),
 * otherwise the named section it sits in.
 */
function sectionOf(path: string): string {
  const parts = path.split(".");
  const numbered = parts.findIndex((part) => /^\d+$/.test(part));
  if (numbered > 0) return parts.slice(0, numbered + 1).join(".");
  return parts.length > 2 ? parts.slice(0, 2).join(".") : parts[0];
}

function sectionTitle(section: string): string {
  if (SECTION_LABEL[section]) return SECTION_LABEL[section];

  const parts = section.split(".");
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) {
    const parent = humanize(parts[parts.length - 2] ?? "Item").replace(/s$/, "");
    return `${parent} ${Number(last) + 1}`;
  }
  return humanize(last);
}

/** Fields for one page, grouped into the sections they appear in. */
export function pageGroups(copy: Copy, page: CopyPage): Group[] {
  const groups = new Map<string, Field[]>();

  for (const key of page.keys) {
    const fields = fieldsOf((copy as Record<string, unknown>)[key], key).filter(
      (field) => !HIDDEN.has(lastSegment(field.path)),
    );
    for (const field of fields) {
      const section = sectionOf(field.path);
      const bucket = groups.get(section);
      const named = { ...field, label: fieldLabel(field.path) };
      if (bucket) bucket.push(named);
      else groups.set(section, [named]);
    }
  }

  return [...groups].map(([section, fields]) => ({ title: sectionTitle(section), fields }));
}
