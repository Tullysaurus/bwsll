# Fonts for the printable menu

`seed-files` uploads these to R2 under fixed keys, and `src/lib/menu-pdf.ts` fetches them
when it builds the menu PDF:

| File | R2 key | Face |
|---|---|---|
| `menu-display.ttf` | `fonts/menu-display.ttf` | Fraunces — headings |
| `menu-body.ttf` | `fonts/menu-body.ttf` | Work Sans — everything else |

They live in R2 rather than in the Worker because each is ~350 KB — larger than the whole
bundle — and the PDF is the only thing that needs them. If they're missing the PDF still
builds, using the standard PDF faces instead.

Both are variable fonts at their default weight, the same two families the website uses.
Both are licensed under the SIL Open Font License 1.1; the full text of each licence is
beside them (`OFL-Fraunces.txt`, `OFL-WorkSans.txt`), which is what the licence requires
when the fonts are redistributed.

Downloaded from the Google Fonts repository:
- https://github.com/google/fonts/tree/main/ofl/fraunces
- https://github.com/google/fonts/tree/main/ofl/worksans
