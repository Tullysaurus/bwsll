import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import { business } from "@/content/business";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-work-sans",
});

const siteUrl = process.env.SITE_URL || "https://bwsll.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Black Wall Street Liquid Lounge — Coffee in Tulsa's Greenwood District",
    template: "%s | Black Wall Street Liquid Lounge",
  },
  description:
    "A café and community space in Tulsa's Historic Greenwood District serving Roots Java coffee from the Motherland. Private events, catering and membership.",
  applicationName: business.name,
  openGraph: {
    type: "website",
    siteName: business.name,
    locale: "en_US",
    url: siteUrl,
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: business.name }],
  },
  twitter: { card: "summary_large_image" },
  manifest: "/site.webmanifest",
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#24493A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
