import { getOrdering } from "@/lib/content";
import { AnnouncementBar } from "./AnnouncementBar";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Shared page chrome. The home page uses the full footer, inner pages the compact one. */
export async function SiteChrome({
  children,
  compactFooter,
}: {
  children: React.ReactNode;
  compactFooter?: boolean;
}) {
  const ordering = await getOrdering();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AnnouncementBar />
      <SiteHeader orderAhead={ordering.orderAhead} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter compact={compactFooter} />
    </div>
  );
}
