import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { termsSections } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply to bwsll.com, our menu, event requests and membership.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" titleStart="Terms of" titleItalic="use." sections={termsSections} />
  );
}
