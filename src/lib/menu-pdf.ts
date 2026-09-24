import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { MenuDocument } from "@/content/menu";
import type { Business } from "./content";
import type { WeekHours } from "./hours";
import { weeklyLabels } from "./hours";
import { r2 } from "./db";
import { sha256Hex } from "./media";

/**
 * The printable menu, built from the same menu the website shows — so a price is changed
 * once and the PDF follows.
 *
 * The brand faces are fetched from R2 (`fonts/*.ttf`, put there by `seed-files`) rather
 * than bundled: a variable TTF is far larger than the whole Worker. When they aren't
 * there the standard PDF faces are used instead, so the download always works.
 */

const PAGE = { width: 612, height: 792 };
const MARGIN = 48;
const GUTTER = 28;
const COLUMN = (PAGE.width - MARGIN * 2 - GUTTER) / 2;

const INK = rgb(0.13, 0.12, 0.11);
const MUTED = rgb(0.42, 0.39, 0.36);
const RULE = rgb(0.85, 0.83, 0.79);
const GOLD = rgb(0.72, 0.55, 0.22);

type Faces = { display: PDFFont; body: PDFFont; bodyBold: PDFFont };

/** The two brand faces, when they've been uploaded; otherwise the built-in ones. */
async function loadFaces(pdf: PDFDocument): Promise<Faces> {
  const bucket = r2();
  const fetchFont = async (key: string) => {
    if (!bucket) return null;
    try {
      const object = await bucket.get(key);
      return object ? await object.arrayBuffer() : null;
    } catch {
      return null;
    }
  };

  const [displayBytes, bodyBytes, bodyBoldBytes] = await Promise.all([
    fetchFont("fonts/menu-display.ttf"),
    fetchFont("fonts/menu-body.ttf"),
    fetchFont("fonts/menu-body-bold.ttf"),
  ]);

  const body = bodyBytes
    ? await pdf.embedFont(bodyBytes, { subset: true })
    : await pdf.embedFont(StandardFonts.Helvetica);
  const display = displayBytes
    ? await pdf.embedFont(displayBytes, { subset: true })
    : await pdf.embedFont(StandardFonts.TimesRoman);

  // The brand faces ship as one variable file each, at regular weight. Rather than mix a
  // system bold into them, a featured line is set in the display face.
  const bodyBold = bodyBoldBytes
    ? await pdf.embedFont(bodyBoldBytes, { subset: true })
    : bodyBytes
      ? display
      : await pdf.embedFont(StandardFonts.HelveticaBold);

  return { display, body, bodyBold };
}

/** A two-column flow: text is appended, and the cursor moves on when a column fills. */
class Flow {
  private column = 0;
  private y = 0;
  page: PDFPage;

  constructor(
    private pdf: PDFDocument,
    private faces: Faces,
    private top: number,
  ) {
    this.page = pdf.addPage([PAGE.width, PAGE.height]);
    this.y = top;
  }

  private get x() {
    return MARGIN + this.column * (COLUMN + GUTTER);
  }

  /** Makes room for `height`, starting a new column or page when this one is full. */
  private reserve(height: number) {
    if (this.y - height >= MARGIN) return;
    if (this.column === 0) {
      this.column = 1;
      this.y = this.top;
      return;
    }
    this.page = this.pdf.addPage([PAGE.width, PAGE.height]);
    this.column = 0;
    this.y = PAGE.height - MARGIN;
  }

  space(height: number) {
    this.y -= height;
  }

  heading(text: string) {
    this.reserve(34);
    this.page.drawText(text, { x: this.x, y: this.y - 16, size: 17, font: this.faces.display, color: INK });
    this.y -= 22;
    this.page.drawLine({
      start: { x: this.x, y: this.y },
      end: { x: this.x + COLUMN, y: this.y },
      thickness: 0.8,
      color: GOLD,
    });
    this.y -= 12;
  }

  /** The "12 oz / 16 oz" line above a priced table. */
  columnsLabel(left: string, right: string) {
    this.reserve(14);
    const size = 8;
    const rightWidth = this.faces.body.widthOfTextAtSize(right, size);
    const leftWidth = this.faces.body.widthOfTextAtSize(left, size);
    this.page.drawText(left, {
      x: this.x + COLUMN - rightWidth - 18 - leftWidth,
      y: this.y - size,
      size,
      font: this.faces.body,
      color: MUTED,
    });
    this.page.drawText(right, {
      x: this.x + COLUMN - rightWidth,
      y: this.y - size,
      size,
      font: this.faces.body,
      color: MUTED,
    });
    this.y -= 14;
  }

  row(name: string, prices: string[], options: { emphasis?: boolean } = {}) {
    this.reserve(16);
    const size = 10;
    const font = options.emphasis ? this.faces.bodyBold : this.faces.body;
    this.page.drawText(name, { x: this.x, y: this.y - size, size, font, color: INK });

    let right = this.x + COLUMN;
    for (const price of [...prices].reverse()) {
      const width = this.faces.body.widthOfTextAtSize(price, size);
      this.page.drawText(price, {
        x: right - width,
        y: this.y - size,
        size,
        font: this.faces.body,
        color: INK,
      });
      right -= Math.max(width, 26) + 18;
    }
    this.y -= 16;
  }

  paragraph(text: string, options: { size?: number; color?: typeof INK } = {}) {
    const size = options.size ?? 9;
    const color = options.color ?? MUTED;
    for (const line of wrap(text, this.faces.body, size, COLUMN)) {
      this.reserve(size + 4);
      this.page.drawText(line, { x: this.x, y: this.y - size, size, font: this.faces.body, color });
      this.y -= size + 3;
    }
    this.y -= 4;
  }
}

/** Greedy word wrap against the real measured width of the face. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderMenuPdf(input: {
  menu: MenuDocument;
  business: Business;
  hours: WeekHours;
}): Promise<Uint8Array> {
  const { menu, business, hours } = input;

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const faces = await loadFaces(pdf);

  pdf.setTitle(`${business.name} — Menu`);
  pdf.setAuthor(business.name);
  pdf.setProducer(business.name);
  pdf.setCreationDate(new Date());

  // Masthead across the full width; the two columns start beneath it.
  const flow = new Flow(pdf, faces, PAGE.height - MARGIN - 92);
  const page = flow.page;
  const top = PAGE.height - MARGIN;

  page.drawText(business.shortName.toUpperCase(), {
    x: MARGIN,
    y: top - 22,
    size: 24,
    font: faces.display,
    color: INK,
  });
  page.drawText(business.tagline, { x: MARGIN, y: top - 45, size: 11, font: faces.body, color: MUTED });
  page.drawText(`${business.addressLine} · ${business.phone}`, {
    x: MARGIN,
    y: top - 63,
    size: 9,
    font: faces.body,
    color: MUTED,
  });
  page.drawLine({
    start: { x: MARGIN, y: top - 76 },
    end: { x: PAGE.width - MARGIN, y: top - 76 },
    thickness: 1,
    color: RULE,
  });

  for (const table of menu.sizedTables) {
    flow.heading(table.title);
    flow.columnsLabel(table.sizes[0], table.sizes[1]);
    for (const item of table.items) {
      flow.row(item.name, [`$${item.prices[0]}`, `$${item.prices[1]}`], { emphasis: item.featured });
    }
    flow.space(10);
  }

  flow.heading("House signatures");
  flow.paragraph("Drinks named for the people who built Greenwood.");
  for (const group of menu.signatureGroups) {
    flow.row(group.group, [group.prices[0].price, group.prices[1].price], { emphasis: true });
    flow.paragraph(group.drinks.map((drink) => drink.name).join(" · "));
  }
  flow.space(6);

  flow.heading("Espresso");
  for (const item of menu.espresso) flow.row(item.name, [item.price]);
  flow.space(10);

  flow.heading("Food");
  for (const item of menu.food) flow.row(item.name, [item.price]);
  flow.space(10);

  flow.heading("Flavor shots");
  flow.paragraph(menu.flavorShots.price);
  for (const group of menu.flavorShots.groups) {
    flow.row(group.label, []);
    flow.paragraph(group.items);
  }
  flow.space(10);

  flow.heading("Hours");
  for (const row of weeklyLabels(hours)) flow.row(row.label, [row.value]);

  flow.paragraph("Prices and availability may change.", { size: 8 });

  return pdf.save();
}

/** Content-addressed, so a menu that hasn't changed is never rendered twice. */
export async function menuPdfKey(menu: MenuDocument, business: Business): Promise<string> {
  const payload = JSON.stringify({ menu, business: { name: business.name, addressLine: business.addressLine, phone: business.phone, tagline: business.tagline } });
  const hash = await sha256Hex(new TextEncoder().encode(payload).buffer as ArrayBuffer);
  return `generated/menu-${hash.slice(0, 32)}.pdf`;
}
