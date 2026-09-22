import { ArrowLink } from "./Button";
import { PhotoSlot } from "./PhotoSlot";
import { Eyebrow } from "./Typography";

export function OfferCard({
  slot,
  eyebrow,
  title,
  body,
  link,
}: {
  slot: string;
  eyebrow: string;
  title: string;
  body: string;
  link: { label: string; href: string };
}) {
  return (
    <article className="flex flex-col">
      <PhotoSlot id={slot} className="h-[210px] md:h-[300px]" sizeHint={{ width: 379, height: 300 }} />
      <Eyebrow className="mt-6">{eyebrow}</Eyebrow>
      <h3 className="h3 mt-3">{title}</h3>
      <p className="mt-3 flex-1 text-[17px]" style={{ color: "var(--muted)" }}>
        {body}
      </p>
      <p className="mt-5">
        <ArrowLink href={link.href}>{link.label}</ArrowLink>
      </p>
    </article>
  );
}
