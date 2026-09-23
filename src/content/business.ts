/** Business facts — §0 of the build spec. Single source of truth for NAP data. */

export const business = {
  name: "Black Wall Street Liquid Lounge",
  shortName: "Liquid Lounge",
  legalEntity: "BWS Enterprises, LLC",
  tagline: "Beyond coffee, the culture.",
  address: {
    street: "609 E. Pine St.",
    city: "Tulsa",
    state: "OK",
    zip: "74106",
    building: "Inside the Greenwood Entrepreneurship at Moton",
  },
  addressLine: "609 E. Pine St., Tulsa, OK 74106",
  phone: "918-851-1982",
  phoneHref: "tel:+19188511982",
  email: "info@bwsll.com",
  emailHref: "mailto:info@bwsll.com",
  coffee: "Roots Java coffee from the Motherland",
  mapUrl: "https://goo.gl/maps/4G2zQnHmupiZEikm6",
  social: {
    instagram: "https://www.instagram.com/BWStLiquidLounge",
    facebook: "https://www.facebook.com/profile.php?id=61591530473609",
    tiktok: "https://www.tiktok.com/@BWStLiquidLounge",
    x: "https://www.x.com/BWStLiquidLounge",
  },
  instagramHandle: "@BWStLiquidLounge",
} as const;

export const socialLinks = [
  { label: "Instagram", href: business.social.instagram },
  { label: "Facebook", href: business.social.facebook },
  { label: "TikTok", href: business.social.tiktok },
  { label: "X", href: business.social.x },
] as const;

/** Site credit — rendered in the footer bottom row and as the `author` metadata. */
export const credit = {
  name: "Tully",
  url: "https://tully.sh",
  label: "Site by Tully",
} as const;

/**
 * Public PDF links. These are the URLs the site has always used; since v2 they are served
 * by `src/app/files/[name]/route.ts` out of R2, so the owner can replace a document at
 * /admin/documents without any link changing. The slug is the filename without `.pdf`.
 */
export const files = {
  menu: "/files/liquid-lounge-menu.pdf",
  rentalAgreement: "/files/private-event-rental-agreement.pdf",
  vendorAgreement: "/files/vendor-agreement.pdf",
  foodPricing: "/files/food-and-beverage-pricing.pdf",
  memberAgreement: "/files/liquid-love-member-agreement.pdf",
  traineeMou: "/files/workforce-trainee-mou.pdf",
} as const;

export const nav = [
  { label: "Menu", href: "/menu" },
  { label: "Events", href: "/events" },
  { label: "Private Events & Catering", href: "/private-events" },
  { label: "Liquid Love Club", href: "/club" },
  { label: "Workforce", href: "/workforce" },
  { label: "Visit", href: "/visit" },
] as const;
