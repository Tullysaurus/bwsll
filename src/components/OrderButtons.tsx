import { getOrdering } from "@/lib/content";
import { TrackedLink } from "./TrackedLink";

/**
 * Order-ahead and delivery links. Each button appears only when the owner has filled in
 * that link on the Business details screen, so an empty setting leaves no dead button
 * behind (§4.2).
 */
export async function OrderButtons({ className = "" }: { className?: string }) {
  const ordering = await getOrdering();
  const links = [
    { label: "Order ahead", href: ordering.orderAhead, className: "btn btn-gold", event: "order_ahead" },
    { label: "DoorDash", href: ordering.doordash, className: "btn btn-secondary", event: "delivery" },
    { label: "Uber Eats", href: ordering.ubereats, className: "btn btn-secondary", event: "delivery" },
  ].filter((link) => link.href.trim());

  if (!links.length) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {links.map((link) => (
        <TrackedLink key={link.label} href={link.href} event={link.event} className={link.className}>
          {link.label}
        </TrackedLink>
      ))}
    </div>
  );
}
