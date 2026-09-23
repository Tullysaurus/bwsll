import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getLegal } from "@/lib/content";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply to bwsll.com, our menu, event requests and membership.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const legal = await getLegal();
  return (
    <LegalPage eyebrow="Legal" titleStart="Terms of" titleItalic="use." sections={legal.terms}
      lastUpdated={legal.lastUpdated} />
  );
}
