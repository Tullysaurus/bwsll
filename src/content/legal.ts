import { business } from "./business";

/**
 * PLACEHOLDER LEGAL COPY — a plain-language notice covering what this site actually
 * collects (inquiry forms + newsletter). TBD: the owner's lawyer should review and
 * replace this before launch (§5, §13.11).
 */

export type LegalSection = { heading: string; paragraphs: string[]; list?: string[] };

export const lastUpdated = "September 2026";

export const privacySections: LegalSection[] = [
  {
    heading: "What this notice covers",
    paragraphs: [
      `This notice explains what ${business.name} ("we") collects through bwsll.com and what we do with it. It does not cover anything you give us in person or over the phone.`,
    ],
  },
  {
    heading: "What we collect",
    paragraphs: ["We only collect what you type into a form on this site:"],
    list: [
      "Inquiry forms (private events, catering, membership, vendors, workforce, contact): your name, email, phone number and whatever details you include — event dates, group size, business details, or your message.",
      "Newsletter sign-up: your email address.",
      "If you are under 18 and apply to the workforce program, a parent or guardian's name and email.",
    ],
  },
  {
    heading: "What we do with it",
    paragraphs: [
      "We use your details to reply to you, to plan the event or arrangement you asked about, and to keep a record of the request. Newsletter addresses are used to send occasional updates about drinks, events and open dates — every email has an unsubscribe link.",
      "We do not sell your information, and we do not share it with anyone except the service providers listed below.",
    ],
  },
  {
    heading: "Who else handles it",
    paragraphs: ["Three services process data on our behalf:"],
    list: [
      "Cloudflare — hosts this site, stores form submissions and provides the spam protection (Turnstile) on each form.",
      "Resend — delivers the notification email that tells us a new inquiry has arrived.",
      "Our own email provider, which receives that notification.",
    ],
  },
  {
    heading: "Cookies and tracking",
    paragraphs: [
      "This site sets no advertising or analytics cookies. Cloudflare Turnstile may set a short-lived token in your browser to confirm you are not a bot. That is all.",
    ],
  },
  {
    heading: "How long we keep it",
    paragraphs: [
      "Inquiry records are kept as long as they are useful for running the business. Newsletter addresses are kept until you unsubscribe or ask us to remove you.",
    ],
  },
  {
    heading: "Your choices",
    paragraphs: [
      `Email ${business.email} or call ${business.phone} to see what we hold about you, correct it, or ask us to delete it. We will respond as quickly as we can.`,
    ],
  },
  {
    heading: "Children",
    paragraphs: [
      "This site is not directed at children under 13, and we do not knowingly collect their information. Workforce applicants under 18 must give a parent or guardian's contact details.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: ["If this notice changes, the date at the top of this page changes with it."],
  },
];

export const termsSections: LegalSection[] = [
  {
    heading: "Using this site",
    paragraphs: [
      `bwsll.com is run by ${business.legalEntity}, doing business as ${business.shortName}. You are welcome to use it to read about us, browse the menu and send us a request. Please do not attempt to disrupt it, scrape it in bulk, or use it to send unsolicited messages.`,
    ],
  },
  {
    heading: "Menu, prices and hours",
    paragraphs: [
      "Prices, menu items and hours shown here can change without notice, and items sometimes sell out. Nothing on this site is an offer to sell at a stated price.",
    ],
  },
  {
    heading: "Requests are not bookings",
    paragraphs: [
      "Submitting an event, catering, membership, vendor or workforce form starts a conversation — it does not reserve a date, confirm a price or create a contract. A private event date is reserved only once we confirm it in writing and the $100 non-refundable deposit has been paid. Catering estimates built on this site cover food and beverage only; space rental, staffing and delivery are quoted separately.",
    ],
  },
  {
    heading: "Event rules",
    paragraphs: [
      "Private events are subject to our rental agreement, which we send with your confirmation. In short: leave the space as you found it, alcohol requires our written approval and licensed service, an outside-caterer fee applies by group size, and we cannot host political events, fundraisers or campaigns.",
    ],
  },
  {
    heading: "Membership",
    paragraphs: [
      "Liquid Love Club membership is billed $250 annually on a three-year term. Event and conference room perks begin after two months of active membership. Perks do not roll over and are not transferable. Full terms are in the member agreement.",
    ],
  },
  {
    heading: "Our content",
    paragraphs: [
      `The text, photographs, logos and drink names on this site belong to ${business.legalEntity} unless noted otherwise. Please ask before reusing them.`,
    ],
  },
  {
    heading: "Links to other sites",
    paragraphs: [
      "We link to maps, social profiles and other services we do not control, and we are not responsible for their content.",
    ],
  },
  {
    heading: "Questions",
    paragraphs: [`Email ${business.email} or call ${business.phone}.`],
  },
];
