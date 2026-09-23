/**
 * Turns a plain content object into a form, and a submitted form back into the same
 * shape. The defaults in `src/content/*` are the template: every field the editor shows
 * comes from walking them, and rebuilding reads only the paths that template contains,
 * so a stray form field can never add a key or change a type.
 *
 * Paths look like `home.hero.title` or `club.benefits.2`.
 */

export type Field =
  | { kind: "text" | "textarea"; path: string; label: string; value: string }
  | { kind: "lines"; path: string; label: string; value: string[] };

export type Group = { title: string; fields: Field[] };

const LONG = 90;

/** "menuTeaser" / "h1a" → "Menu teaser" / "H1a". */
export function humanize(segment: string): string {
  const spaced = segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function fieldsOf(value: unknown, path = "", label = ""): Field[] {
  if (typeof value === "string") {
    return [
      {
        kind: value.length > LONG || value.includes("\n") ? "textarea" : "text",
        path,
        label,
        value,
      },
    ];
  }

  if (isStringArray(value)) {
    return [{ kind: "lines", path, label, value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      fieldsOf(item, path ? `${path}.${index}` : String(index), `${label} ${index + 1}`),
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      fieldsOf(child, path ? `${path}.${key}` : key, humanize(key)),
    );
  }

  return [];
}

/** One group per top-level key, so a long content object edits page by page. */
export function groupsOf(value: Record<string, unknown>): Group[] {
  return Object.entries(value).map(([key, child]) => ({
    title: humanize(key),
    fields: fieldsOf(child, key, humanize(key)),
  }));
}

/**
 * Rebuilds the object from FormData, walking the defaults. Anything missing from the
 * form keeps its default value.
 */
export function parseShape<T>(defaults: T, form: { get(name: string): unknown }, path = ""): T {
  if (typeof defaults === "string") {
    const raw = form.get(path);
    return (typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : defaults) as T;
  }

  if (isStringArray(defaults)) {
    const raw = form.get(path);
    if (typeof raw !== "string") return defaults;
    const lines = raw
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return lines as unknown as T;
  }

  if (Array.isArray(defaults)) {
    return defaults.map((item, index) =>
      parseShape(item, form, path ? `${path}.${index}` : String(index)),
    ) as unknown as T;
  }

  if (defaults && typeof defaults === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(defaults)) {
      out[key] = parseShape(child, form, path ? `${path}.${key}` : key);
    }
    return out as T;
  }

  return defaults;
}
