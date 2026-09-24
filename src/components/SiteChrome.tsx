import { getOrdering } from "@/lib/content";
import { AnnouncementBar } from "./AnnouncementBar";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Shared page chrome — the same header and footer on every page. */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
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
      <SiteFooter />
    </div>
  );
}
