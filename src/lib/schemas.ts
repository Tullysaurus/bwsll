import { z } from "zod";

/**
 * Shared by the client form and the API route (§7.2).
 *
 * Note: the spec lists a `website` field for both the honeypot and the vendor's own
 * website. They would collide on one payload, so the vendor's real field is
 * `businessWebsite` and `website` stays the honeypot on every type.
 */

const NAME_MAX = 120;
const MESSAGE_MAX = 2000;

const trimmed = (max: number) => z.string().trim().max(max);

/** A required string whose "missing" and "empty" cases share one friendly message. */
const requiredText = (max: number, message: string) =>
  z.string({ error: message }).trim().min(1, message).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const base = {
  name: requiredText(NAME_MAX, "Please tell us your name."),
  email: requiredText(180, "Please enter a valid email address.").pipe(
    z.email("Please enter a valid email address."),
  ),
  phone: optionalText(40),
  message: optionalText(MESSAGE_MAX),
  // Anti-spam: Turnstile token + a hidden field real people never fill in.
  turnstileToken: z.string().default(""),
  website: z.string().max(200).optional().default(""),
};

export const guestsEnum = z.enum(["10", "20", "40"], { error: "Pick a group size." });
export const needEnum = z.enum(["rental", "catering", "both"], { error: "Tell us what you need." });
export const programEnum = z.enum(["workforce", "business-development"], {
  error: "Pick a program.",
});

export const estimateSchema = z.object({
  guests: guestsEnum,
  items: z.array(z.object({ name: trimmed(120), price: z.number().nonnegative() })).max(40),
  total: z.number().nonnegative(),
});
export type Estimate = z.infer<typeof estimateSchema>;

const bookingFields = {
  ...base,
  phone: requiredText(40, "A phone number helps us confirm faster.").min(
    7,
    "A phone number helps us confirm faster.",
  ),
  organization: optionalText(NAME_MAX),
  eventDate: requiredText(20, "Pick a date."),
  startTime: optionalText(20),
  endTime: optionalText(20),
  guests: guestsEnum,
  need: needEnum,
  venueAddress: optionalText(240),
  estimate: estimateSchema.optional(),
};

/** `venueAddress` is required whenever catering is involved (§7.2). */
const requireVenue = (
  val: { need: "rental" | "catering" | "both"; venueAddress?: string },
  ctx: z.RefinementCtx,
) => {
  if (val.need !== "rental" && !val.venueAddress) {
    ctx.addIssue({
      code: "custom",
      path: ["venueAddress"],
      message: "Tell us where the catering should go (the Lounge is fine).",
    });
  }
};

export const eventInquirySchema = z
  .object({ type: z.literal("event"), ...bookingFields })
  .superRefine(requireVenue);

export const cateringInquirySchema = z
  .object({ type: z.literal("catering"), ...bookingFields })
  .superRefine(requireVenue);

export const clubInquirySchema = z.object({
  type: z.literal("club"),
  ...base,
  startDate: optionalText(20),
});

export const vendorInquirySchema = z.object({
  type: z.literal("vendor"),
  ...base,
  businessName: requiredText(NAME_MAX, "What's the business called?"),
  businessWebsite: optionalText(200),
  productType: requiredText(300, "Tell us what you'd like to sell."),
  hasLicense: z.coerce.boolean().default(false),
  hasInsurance: z.coerce.boolean().default(false),
});

export const workforceInquirySchema = z
  .object({
    type: z.literal("workforce"),
    ...base,
    program: programEnum,
    city: optionalText(NAME_MAX),
    school: optionalText(NAME_MAX),
    isUnder18: z.coerce.boolean().default(false),
    guardianName: optionalText(NAME_MAX),
    guardianEmail: optionalText(180),
  })
  .superRefine((val, ctx) => {
    if (!val.isUnder18) return;
    if (!val.guardianName) {
      ctx.addIssue({ code: "custom", path: ["guardianName"], message: "We need a parent or guardian's name." });
    }
    if (!val.guardianEmail) {
      ctx.addIssue({ code: "custom", path: ["guardianEmail"], message: "We need a parent or guardian's email." });
    } else if (!z.email().safeParse(val.guardianEmail).success) {
      ctx.addIssue({ code: "custom", path: ["guardianEmail"], message: "Please enter a valid email address." });
    }
  });

export const contactInquirySchema = z.object({
  type: z.literal("contact"),
  ...base,
  message: requiredText(MESSAGE_MAX, "What can we help with?"),
});

export const inquirySchema = z.discriminatedUnion("type", [
  eventInquirySchema,
  cateringInquirySchema,
  clubInquirySchema,
  vendorInquirySchema,
  workforceInquirySchema,
  contactInquirySchema,
]);

export type InquiryInput = z.infer<typeof inquirySchema>;
export type InquiryFormType = InquiryInput["type"];

export const subscribeSchema = z.object({
  email: trimmed(180).pipe(z.email("Please enter a valid email address.")),
  source: optionalText(60),
  turnstileToken: z.string().default(""),
  website: z.string().max(200).optional().default(""),
});

/** Admin — event create/edit. */
export const eventSchema = z.object({
  title: requiredText(200, "A title is required."),
  date: requiredText(20, "A date is required."),
  startTime: requiredText(10, "A start time is required."),
  endTime: optionalText(10),
  location: trimmed(200).default("Liquid Lounge"),
  kind: z.enum(["public", "private", "catering"]),
  description: optionalText(MESSAGE_MAX),
  published: z.coerce.boolean().default(true),
  usesSpace: z.coerce.boolean().default(true),
  hideTitle: z.coerce.boolean().default(false),
  inquiryId: z.coerce.number().int().positive().optional(),
});

/** Flatten zod issues into `{ fieldName: message }` for the form UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
