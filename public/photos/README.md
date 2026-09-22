# Photos

Every image on the site is declared in `src/content/photos.ts`. To publish a real photo:

1. Export it as **WebP at 2× the display size** listed in the spec (hero ≤ 500 KB, everything
   else ≤ 300 KB).
2. Save it here, e.g. `public/photos/hero.webp`.
3. Add `src: "/photos/hero.webp"` to that slot in `src/content/photos.ts` and write real
   `alt` text.

Until a slot has a `src`, it renders as a labelled placeholder block — the layout is
identical either way, so photos can arrive one at a time.

**Rules:** only real photos of this business (no stock photos of other cafés, no
AI-generated food or people). Historic Greenwood images only if the owner holds the
rights. No identifiable minors without written parental consent.
