import { SiteChrome } from "@/components/SiteChrome";

// The header and footer read hours and the announcement from D1 on every page (§7.4).
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome compactFooter>{children}</SiteChrome>;
}
