import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getLegal } from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What Black Wall Street Liquid Lounge collects through bwsll.com and what we do with it.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
  const legal = await getLegal();
  return (
    <LegalPage
      eyebrow="Legal"
      titleStart="Privacy"
      titleItalic="notice."
      sections={legal.privacy}
      lastUpdated={legal.lastUpdated}
    />
  );
}
