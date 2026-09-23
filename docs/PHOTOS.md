# Photos

Every image on the site is declared in `src/content/photos.ts`. To publish a real photo:

1. Export it as **WebP at 2× the display size** listed in the spec (hero ≤ 500 KB, everything
   else ≤ 300 KB).
2. Save it here, e.g. `public/photos/hero.webp`.
3. Add `src: "/photos/hero.webp"` to that slot in `src/content/photos.ts` and write real
   `alt` text.

Until a slot has a `src`, it renders as a labelled placeholder block — the layout is
identical either way, so photos can arrive one at a time.

## Licensed photos

If a photo came from someone else — a newspaper, a hired photographer, anyone but the
business — add a `credit` to its slot:

```ts
credit: { text: "Photo: Jane Doe / Publication", url: "https://example.com/article" }
```

`PhotoSlot` overlays it in the bottom-right corner of the image, so the attribution
travels with the photo wherever the slot is used and never changes the layout. Add `url`
when the licence asks for a link back.

**Credit is not permission.** Attribution does not license an image — get written
permission (email is fine) before adding someone else's photo, and keep it on file.
Being the subject of a photo gives the business no rights in it.

**Rules:** only real photos of this business (no stock photos of other cafés, no
AI-generated food or people). Historic Greenwood images only if the owner holds the
rights. No identifiable minors without written parental consent.
