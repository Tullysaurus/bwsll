import { getOrdering } from "@/lib/content";
import { Button } from "./Button";

/**
 * Order-ahead and delivery links. Each button appears only when the owner has filled in
 * that link on the Business details screen, so an empty setting leaves no dead button
 * behind (§4.2).
 */
export async function OrderButtons({ className = "" }: { className?: string }) {
  const ordering = await getOrdering();
  const links = [
    { label: "Order ahead", href: ordering.orderAhead, variant: "gold" as const },
    { label: "DoorDash", href: ordering.doordash, variant: "secondary" as const },
    { label: "Uber Eats", href: ordering.ubereats, variant: "secondary" as const },
  ].filter((link) => link.href.trim());

  if (!links.length) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {links.map((link) => (
        <Button key={link.label} href={link.href} variant={link.variant}>
          {link.label}
        </Button>
      ))}
    </div>
  );
}
