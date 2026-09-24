import type { CateringPackage } from "@/content/catering";
import type { ParseIssue, Parsed } from "./menu-text";

/**
 * Catering packages, edited as lines like the menu:
 *
 *   Hot Coffee / Tea | Drinks & breakfast | 30
 *
 * The price is what 10 guests costs; 20 and 40 are worked out from it, which is the rule
 * the estimator has always applied.
 */

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export function packagesToText(packages: CateringPackage[]): string {
  return packages.map((pkg) => `${pkg.name} | ${pkg.group} | ${pkg.base}`).join("\n");
}

export function parsePackages(raw: string): Parsed<CateringPackage[]> {
  const issues: ParseIssue[] = [];
  const value: CateringPackage[] = [];
  const seen = new Set<string>();

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index].trim();
    if (!text || text.startsWith("#")) continue;

    const [name, group, price] = text.split("|").map((cell) => cell.trim());
    if (!name || !group || !price) {
      issues.push({
        line: index + 1,
        text,
        message: "Needs a name, a group and a price — e.g. Fruit Tray | Trays & sides | 40",
      });
      continue;
    }

    const base = Number(price.replace(/[$,]/g, ""));
    if (!Number.isFinite(base) || base < 0) {
      issues.push({ line: index + 1, text, message: `"${price}" isn't a price.` });
      continue;
    }

    // Ids key the estimator's selection, so they follow the name and stay unique.
    let id = slug(name) || `package-${index + 1}`;
    let suffix = 2;
    while (seen.has(id)) id = `${slug(name)}-${suffix++}`;
    seen.add(id);

    value.push({ id, name, group, base });
  }

  return { value, issues };
}
