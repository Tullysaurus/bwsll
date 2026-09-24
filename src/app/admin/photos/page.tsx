import Link from "next/link";
import { guardPage } from "../Guard";
import { MediaUploader } from "../MediaUploader";
import { DirtyForm } from "../DirtyForm";
import { clearSlotMedia, saveAllSlotDetails } from "../media-actions";
import { photoSlotIds } from "@/content/photos";
import { getAllPhotoSlots } from "@/lib/photos";

export const dynamic = "force-dynamic";

/** Every slot's fields join this one form, so the page has a single Save. */
const SLOTS_FORM = "photo-slots";

/** Which page each slot belongs to, so the list reads like the site. */
const GROUPS: { title: string; ids: string[] }[] = [
  { title: "Home", ids: ["hero", "home-menu", "offer-events", "offer-catering", "offer-club", "home-gem"] },
  { title: "Menu", ids: ["menu-food"] },
  { title: "Private events & catering", ids: ["events-hero"] },
  { title: "Liquid Love Club", ids: ["club"] },
  { title: "Workforce", ids: ["workforce"] },
  { title: "Visit", ids: ["visit-exterior"] },
  { title: "Our story", ids: ["about-1", "about-2"] },
];

export default async function PhotosPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const slots = await getAllPhotoSlots(photoSlotIds);
  const bySlot = new Map(slots.map((slot) => [slot.id, slot]));

  return (
    <div className="max-w-[900px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>
          Photos
        </h1>
        <Link href="/admin/photos/library" className="btn btn-secondary">
          Photo library
        </Link>
      </div>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        Each spot on the site is listed below. A spot with no photo shows a placeholder
        block — the page looks the same either way, so you can add photos one at a time.
      </p>

      {GROUPS.map((group) => (
        <section key={group.title} className="mt-10">
          <h2 className="display" style={{ fontSize: 22 }}>
            {group.title}
          </h2>

          {group.ids.map((id) => {
            const slot = bySlot.get(id);
            if (!slot) return null;
            return (
              <article
                key={id}
                className="grid gap-5 py-6 md:grid-cols-[200px_1fr]"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <div>
                  {slot.src ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={slot.src}
                      alt={slot.alt}
                      className="h-[130px] w-full object-cover"
                      style={{ borderRadius: 2 }}
                    />
                  ) : (
                    <div
                      className="flex h-[130px] w-full items-center justify-center text-[12px]"
                      style={{ background: "var(--ph-light)", color: "var(--ph-label)", borderRadius: 2 }}
                    >
                      No photo yet
                    </div>
                  )}
                  <p className="mt-2 text-[12px]" style={{ color: "var(--muted)" }}>
                    {id}
                  </p>
                </div>

                <div>
                  <p className="text-[15px]" style={{ color: "var(--muted)" }}>
                    {slot.label || "Used on the site with no caption."}
                  </p>

                  {slot.src ? (
                    /* These fields belong to the one form at the bottom of the page via
                       `form="photo-slots"`: they can't be nested inside it, because each
                       card also holds the upload and remove forms. */
                    <div className="mt-4 grid gap-3">
                      <input type="hidden" name="slot" value={id} form={SLOTS_FORM} />
                      <input
                        type="hidden"
                        name={`mediaId__${id}`}
                        value={slot.mediaId ?? ""}
                        form={SLOTS_FORM}
                      />
                      <div>
                        <label htmlFor={`alt-field-${id}`} className="field-label">
                          What&rsquo;s in the photo?
                        </label>
                        <input
                          id={`alt-field-${id}`}
                          name={`alt__${id}`}
                          className="field-input"
                          defaultValue={slot.alt}
                          form={SLOTS_FORM}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`credit-${id}`} className="field-label">
                            Photo credit (optional)
                          </label>
                          <input
                            id={`credit-${id}`}
                            name={`creditText__${id}`}
                            className="field-input"
                            defaultValue={slot.credit?.text ?? ""}
                            placeholder="Photo: Name / Publication"
                            form={SLOTS_FORM}
                          />
                        </div>
                        <div>
                          <label htmlFor={`credit-url-${id}`} className="field-label">
                            Credit link (optional)
                          </label>
                          <input
                            id={`credit-url-${id}`}
                            name={`creditUrl__${id}`}
                            className="field-input"
                            defaultValue={slot.credit?.url ?? ""}
                            placeholder="https://"
                            form={SLOTS_FORM}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <MediaUploader
                    target={{ kind: "slot", slotId: id }}
                    currentAlt={slot.src ? slot.alt : ""}
                    label={slot.src ? "Replace photo" : "Add photo"}
                  />

                  {slot.src ? (
                    <form action={clearSlotMedia} className="mt-3">
                      <input type="hidden" name="slotId" value={id} />
                      <button type="submit" className="link" style={{ fontSize: 14 }}>
                        Remove photo from this spot
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ))}

      {/* The one form for the whole screen. It holds no fields of its own — every slot's
          inputs above point at it — so a single Save writes every photo that changed. */}
      <DirtyForm id={SLOTS_FORM} action={saveAllSlotDetails} saveLabel="Save photo details" />
    </div>
  );
}
