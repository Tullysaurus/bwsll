import Link from "next/link";
import { guardPage } from "../Guard";
import { getBusiness } from "@/lib/content";
import { credit } from "@/content/business";

export const dynamic = "force-dynamic";

/**
 * Written for whoever is sitting at the counter with a phone, not for whoever built the
 * site: every entry is something someone actually has to do, with the screen it happens
 * on one tap away.
 */
const HOW_TO: { question: string; answer: React.ReactNode }[] = [
  {
    question: "We're closed today — how do I say so?",
    answer: (
      <>
        Go to <Link href="/admin/hours" className="link">Hours &amp; closed days</Link>, scroll to
        &ldquo;Add a closed day&rdquo;, pick today&rsquo;s date and write the reason. A green bar
        appears across the top of every page. It clears itself when the day passes.
      </>
    ),
  },
  {
    question: "A price changed on the menu.",
    answer: (
      <>
        <Link href="/admin/menu" className="link">Menu</Link>. Each drink is one line:{" "}
        <code>House Coffee | 2.79 | 3.19</code> — the name, then the price for each size.
        Change the number, press Save. If the printable PDF is set to build itself, it
        updates too.
      </>
    ),
  },
  {
    question: "Someone asked to book the space.",
    answer: (
      <>
        Their request is in <Link href="/admin/inquiries" className="link">Messages</Link>. Reply
        by email from there, and when it&rsquo;s agreed press &ldquo;Add to calendar&rdquo; — the
        date, time and name are filled in for you. If the room is already taken at that
        time, the site says so before you save.
      </>
    ),
  },
  {
    question: "I want to change a photo.",
    answer: (
      <>
        <Link href="/admin/photos" className="link">Photos</Link> lists every spot on the site
        that holds one. Upload from your phone — big photos are shrunk automatically.
        Always describe what&rsquo;s in the photo: that text is read aloud to people using a
        screen reader. Never put up a recognisable photo of a child without written
        permission from their parent.
      </>
    ),
  },
  {
    question: "I made a mistake. Can I undo it?",
    answer: (
      <>
        Yes. Anything deleted goes to{" "}
        <Link href="/admin/trash" className="link">Deleted items</Link> and can be put back.
        Anything edited keeps its old versions — look for &ldquo;Past versions&rdquo; at the
        bottom of the screen you were on, and you can restore one.
      </>
    ),
  },
  {
    question: "Someone new needs to get in here.",
    answer: (
      <>
        An owner adds them on{" "}
        <Link href="/admin/team" className="link">Who can sign in</Link>. They&rsquo;ll need to
        sign in with the email address you add. New people start as staff, which is
        everything except the business details, the legal pages, the team and deleting
        things for good.
      </>
    ),
  },
  {
    question: "Why can't I see the workforce applications?",
    answer: (
      <>
        Only owners can. Those applications can come from people under 18, so they&rsquo;re
        kept to the smallest number of people — including in Deleted items and in the
        count on the menu.
      </>
    ),
  },
  {
    question: "What do the numbers on the home page mean?",
    answer: (
      <>
        How many times people did something on the website in the last six months — tapped
        the phone number, opened the menu, sent a request. They&rsquo;re counts and nothing
        else: the site doesn&rsquo;t record who anyone is.
      </>
    ),
  },
];

export default async function HelpPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const business = await getBusiness();

  return (
    <div className="max-w-[720px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        How to do the usual things
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        Nothing you change here goes live until you press Save, and almost everything can
        be undone.
      </p>

      <dl className="rule-top-ink mt-8">
        {HOW_TO.map((item) => (
          <div key={item.question} className="py-5" style={{ borderBottom: "1px solid var(--line)" }}>
            <dt className="display" style={{ fontSize: 20 }}>
              {item.question}
            </dt>
            <dd className="mt-2 text-[17px] leading-[1.7]">{item.answer}</dd>
          </div>
        ))}
      </dl>

      <h2 className="display mt-10" style={{ fontSize: 22 }}>
        Something&rsquo;s broken
      </h2>
      <p className="mt-2 text-[17px] leading-[1.7]">
        If a page won&rsquo;t load or something looks wrong, note what you were doing and
        email{" "}
        <a href={business.emailHref} className="link">
          {business.email}
        </a>
        . For the website itself,{" "}
        <a href={credit.url} target="_blank" rel="noreferrer" className="link">
          {credit.name}
        </a>{" "}
        built it.
      </p>
    </div>
  );
}
