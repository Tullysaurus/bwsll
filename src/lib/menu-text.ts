import type { MenuDocument, SimpleItem, SizedItem } from "@/content/menu";

/**
 * The menu is edited as lines of text, one drink per line:
 *
 *   House Coffee | 2.79 | 3.19
 *   *Golden Chai Tea | 5.07 | 6.21
 *
 * Adding, removing and reordering a drink is then just editing a line, which works on a
 * phone and needs no drag handles. A leading `*` marks a drink as featured on the home
 * page. Everything here is pure and unit-tested; prices stay strings so they print
 * exactly as typed.
 */

export type ParseIssue = { line: number; text: string; message: string };
export type Parsed<T> = { value: T; issues: ParseIssue[] };

function rows(raw: string): { line: number; text: string }[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((text, index) => ({ line: index + 1, text: text.trim() }))
    .filter((row) => row.text && !row.text.startsWith("#"));
}

function cells(text: string): string[] {
  return text.split("|").map((cell) => cell.trim());
}

/* --- sized items: name + two prices ---------------------------------------- */

export function sizedItemsToText(items: SizedItem[]): string {
  return items
    .map((item) => `${item.featured ? "*" : ""}${item.name} | ${item.prices[0]} | ${item.prices[1]}`)
    .join("\n");
}

export function parseSizedItems(raw: string, group: string): Parsed<SizedItem[]> {
  const issues: ParseIssue[] = [];
  const value: SizedItem[] = [];

  for (const row of rows(raw)) {
    const parts = cells(row.text);
    if (parts.length < 3) {
      issues.push({
        line: row.line,
        text: row.text,
        message: "Needs a name and two prices, separated by | — e.g. House Coffee | 2.79 | 3.19",
      });
      continue;
    }

    const featured = parts[0].startsWith("*");
    const name = (featured ? parts[0].slice(1) : parts[0]).trim();
    if (!name) {
      issues.push({ line: row.line, text: row.text, message: "This line has no drink name." });
      continue;
    }

    value.push({
      name,
      prices: [parts[1], parts[2]],
      ...(featured ? { featured: true, group } : {}),
    });
  }

  return { value, issues };
}

/* --- simple items: name + one price ---------------------------------------- */

export function simpleItemsToText(items: SimpleItem[]): string {
  return items.map((item) => `${item.name} | ${item.price}`).join("\n");
}

export function parseSimpleItems(raw: string): Parsed<SimpleItem[]> {
  const issues: ParseIssue[] = [];
  const value: SimpleItem[] = [];

  for (const row of rows(raw)) {
    const parts = cells(row.text);
    if (parts.length < 2 || !parts[0]) {
      issues.push({
        line: row.line,
        text: row.text,
        message: "Needs a name and a price, separated by | — e.g. Muffins | $2.79",
      });
      continue;
    }
    value.push({ name: parts[0], price: parts[1] });
  }

  return { value, issues };
}

/* --- signature drinks: one name per line ----------------------------------- */

export function drinksToText(drinks: { name: string; story?: string }[]): string {
  return drinks.map((drink) => (drink.story ? `${drink.name} | ${drink.story}` : drink.name)).join("\n");
}

export function parseDrinks(raw: string): Parsed<{ name: string; story?: string }[]> {
  const value = rows(raw).map((row) => {
    const [name, story] = cells(row.text);
    return story ? { name, story } : { name };
  });
  return { value, issues: [] };
}

/**
 * The home page teaser reads the drinks marked with `*`, so a featured drink is marked
 * once, where it's priced, rather than kept in a second list that can drift.
 */
export type FeaturedItem = { name: string; group: string; price: string };

export function featuredFrom(menu: MenuDocument): FeaturedItem[] {
  const items: FeaturedItem[] = [];

  for (const group of menu.signatureGroups) {
    for (const drink of group.drinks) {
      if (drink.featured) {
        items.push({ name: drink.name, group: group.group, price: group.prices[0].price });
      }
    }
  }

  for (const table of menu.sizedTables) {
    for (const item of table.items) {
      if (item.featured) {
        items.push({ name: item.name, group: item.group ?? table.title, price: `$${item.prices[0]}` });
      }
    }
  }

  return items;
}
