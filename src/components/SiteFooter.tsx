import Link from "next/link";
import { credit } from "@/content/business";
import { getBusiness, getHours, socialLinksOf } from "@/lib/content";
import { weeklyLabels } from "@/lib/hours";
import { turnstileSiteKey } from "@/lib/turnstile";
import { Eyebrow } from "./Typography";
import { NewsletterForm } from "./NewsletterForm";

const legal = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const quickLinks = [
  { label: "About", href: "/about" },
  { label: "Vendors", href: "/vendors" },
];

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <Eyebrow gold as="h2" className="mb-5">
      {children}
    </Eyebrow>
  );
}

/** §4.6 — `compact` drops the newsletter column on inner pages. */
export async function SiteFooter({ compact }: { compact?: boolean }) {
  const [business, hours] = await Promise.all([getBusiness(), getHours()]);
  const socialLinks = socialLinksOf(business);
  const siteKey = turnstileSiteKey();
  const year = new Date().getFullYear();

  return (
    <footer
      className="on-dark mt-auto"
      style={{ background: "var(--ink)", color: "var(--footer-text)" }}
    >
      <div className="shell gutter" style={{ paddingTop: compact ? 64 : 96, paddingBottom: 48 }}>
        <div
          className={
            compact
              ? "grid gap-10 md:grid-cols-3 md:gap-14"
              : "grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-14"
          }
        >
          {compact ? null : (
            <div>
              <p className="display" style={{ fontSize: 34, color: "var(--paper)", lineHeight: 1.1 }}>
                Liquid Lounge
              </p>
              <p className="mt-4 max-w-[380px] text-[16px]" style={{ color: "var(--footer-text)" }}>
                New drinks, events and open dates — straight to your inbox.
              </p>
              <NewsletterForm siteKey={siteKey} />
            </div>
          )}

          {compact ? (
            <div>
              <p className="display" style={{ fontSize: 30, color: "var(--paper)", lineHeight: 1.1 }}>
                Liquid Lounge
              </p>
            </div>
          ) : null}

          <div>
            <FooterHeading>Visit</FooterHeading>
            <address className="not-italic text-[16px] leading-[1.8]">
              {business.address.street}
              <br />
              {business.address.city}, {business.address.state} {business.address.zip}
              <br />
              <span style={{ color: "var(--footer-muted)" }}>
                Inside the Greenwood Entrepreneurship at Moton
              </span>
            </address>
          </div>

          <div>
            <FooterHeading>Hours</FooterHeading>
            <ul className="space-y-1 text-[16px] leading-[1.8]">
              {weeklyLabels(hours).map((row) => (
                <li key={row.label}>
                  {row.value === "Closed" ? (
                    <span style={{ color: "var(--footer-muted)" }}>Closed {row.label}</span>
                  ) : (
                    <>
                      {row.label}
                      <br />
                      {row.value}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <FooterHeading>Say hello</FooterHeading>
            <ul className="space-y-2 text-[16px]">
              <li>
                <a href={business.phoneHref} className="link link-on-dark">
                  {business.phone}
                </a>
              </li>
              <li>
                <a href={business.emailHref} className="link link-on-dark">
                  {business.email}
                </a>
              </li>
            </ul>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[15px]">
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${business.shortName} on ${social.label}`}
                    className="link link-on-dark"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
            {compact ? null : (
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[15px]">
                {quickLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="link" style={{ color: "var(--footer-muted)" }}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid var(--footer-rule)", color: "var(--footer-muted)", fontSize: 13 }}
        >
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              © {year} {business.legalEntity}
            </span>
            <span aria-hidden="true">·</span>
            <a href={credit.url} target="_blank" rel="noreferrer" className="link-quiet">
              {credit.label}
            </a>
          </p>
          <p className="flex gap-3">
            {legal.map((item, i) => (
              <span key={item.href}>
                {i > 0 ? <span aria-hidden="true" className="mr-3">·</span> : null}
                <Link href={item.href} className="link-quiet">
                  {item.label}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
