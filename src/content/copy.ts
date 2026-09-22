/** Page copy. Strings marked PLACEHOLDER are waiting on the owner's own wording. */

export const home = {
  hero: {
    eyebrow: "Historic Greenwood District · Tulsa, Oklahoma",
    eyebrowMobile: "Greenwood District · Tulsa",
    h1a: "Beyond coffee,",
    h1b: "the culture.",
    body: "A café and community space serving Roots Java coffee from the Motherland — now on the first floor of the Greenwood Entrepreneurship at Moton.",
  },
  menuTeaser: {
    eyebrow: "The menu",
    h2: "Drinks named for the people who built Greenwood.",
    body: "Espresso, teas, blends and tonics made to order — every house signature carries the name of a Greenwood figure.",
  },
  offerings: {
    h2: "More than a coffee shop.",
    intro: "Host your next gathering here, bring the Lounge to your event, or make it your regular spot.",
    cards: [
      {
        slot: "offer-events",
        eyebrow: "Private events",
        h3: "Rent the Lounge",
        body: "Meetings, showers, celebrations and workshops for groups of 10, 20 or 40 — during business hours or after 5pm.",
        link: { label: "Request a date", href: "/private-events#inquire" },
      },
      {
        slot: "offer-catering",
        eyebrow: "Catering",
        h3: "We bring the Lounge to you",
        body: "Coffee service, breakfast trays, kabobs, wings and charcuterie — here or at your venue.",
        link: { label: "See catering packages", href: "/private-events#catering" },
      },
      {
        slot: "offer-club",
        eyebrow: "Membership",
        h3: "Liquid Love Club",
        body: "$250 a year: a bag of coffee every month, 10% off, a complimentary private event and monthly conference room time.",
        link: { label: "Join the club", href: "/club" },
      },
    ],
  },
  story: {
    eyebrow: "Our story",
    quote: "“100 plus years of grit, resilience and community.”",
    body: "Black Wall Street Liquid Lounge began on Greenwood Avenue as a gathering place for the neighborhood. In June 2026 we reopened inside the Greenwood Entrepreneurship at Moton — the former Moton Hospital — alongside Tulsa’s next generation of builders.",
  },
  workforce: {
    eyebrow: "Workforce development",
    h2: "Learning the business, one shift at a time.",
    body: "We equip program participants with employability skills through on-the-job training — from the espresso bar to inventory, marketing and AI-powered operations.",
  },
};

export const workforceCurriculum = [
  { n: "01", label: "Customer engagement", detail: "professional communication, brand representation and service excellence" },
  { n: "02", label: "Food & beverage prep", detail: "food safety, preparation and front-of-house operations" },
  { n: "03", label: "Cleaning & maintenance", detail: "sanitation standards, health compliance and facility upkeep" },
  { n: "04", label: "Inventory management", detail: "ordering, tracking and waste reduction" },
  { n: "05", label: "Sales & marketing", detail: "market research, customer acquisition and brand positioning" },
  { n: "06", label: "Product development", detail: "ideation, design and micro-manufacturing" },
  { n: "07", label: "AI & technology", detail: "AI-powered operations, automation and digital sales tools" },
];

export const club = {
  eyebrow: "Membership",
  h1a: "Liquid Love",
  h1b: "Club.",
  intro: "$250 a year for the regulars.",
  benefits: [
    { title: "A bag of coffee every month", body: "Whole bean or ground — your pick, every month of your membership." },
    { title: "10% off food and drinks", body: "Every visit, on everything we pour and serve." },
    { title: "One complimentary private event", body: "Plus member rates on any additional bookings." },
    { title: "The small conference room once a month", body: "Reserved time to work, meet or record." },
  ],
  fine: "Three-year membership, billed $250 annually. Event and conference room perks begin after two months of active membership. Perks don’t roll over and aren’t transferable.",
};

export const vendors = {
  eyebrow: "Vendors",
  h1a: "Sell at",
  h1b: "the Lounge.",
  intro:
    "We partner with established businesses and startups offering pastries, snacks, packaged goods, apparel and more.",
  requirements: [
    "A current business license.",
    "Proof of insurance.",
    "Product details — allergens and permits on request.",
    "Wholesale pricing for the products you’d like us to carry.",
  ],
  note: "Vendors set wholesale pricing; we set the retail price. Invoices are paid within 30 days of receiving conforming products.",
};

export const about = {
  eyebrow: "Our story",
  h1a: "Beyond coffee,",
  h1b: "the culture.",
  // PLACEHOLDER: owner to provide the full story text. Intentionally name-free —
  // do not add any individual's name without the owner's own wording.
  body: [
    "Black Wall Street Liquid Lounge began on Greenwood Avenue as a gathering place for the neighborhood. In June 2026 we reopened inside the Greenwood Entrepreneurship at Moton — the former Moton Hospital — alongside Tulsa’s next generation of builders.",
    "Our walls, our menu and our programs honor the legacy of Black Wall Street — and invest in the people building what comes next.",
  ],
};

export const events = {
  eyebrow: "Events",
  h1a: "What’s",
  h1b: "happening.",
  intro: "Live music, conversations and community gatherings at the Lounge.",
  empty: "No upcoming events posted — follow @BWStLiquidLounge for updates.",
};

export const privateEvents = {
  eyebrow: "Private events & catering",
  h1a: "Host it at",
  h1b: "the Lounge.",
  body: "Book the space for meetings, workshops, showers and celebrations — or have us cater your event anywhere in Tulsa.",
  rentalNote: "A $100 non-refundable deposit reserves your date. The balance is due by the invoice deadline.",
};

export const visit = {
  h1a: "Come",
  h1b: "see us.",
};

export const menuPage = {
  eyebrow: "Menu",
  h1a: "What we’re",
  h1b: "pouring.",
  intro:
    "Roots Java coffee from the Motherland, made to order. Our house signatures are named for the people who made Greenwood.",
  caption: "Prices and availability may change.",
};

/** PLACEHOLDER: owner's business-development program description. */
export const businessDevelopment =
  "Support for entrepreneurs building their next venture. Details coming soon.";
