import Link from "next/link";
import { checkAdmin, type AdminUser } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { business } from "@/content/business";

/**
 * Page-level authorization. Pages render the explanation instead of throwing:
 *
 *   const guard = await guardPage("team.manage");
 *   if (!guard.ok) return guard.screen;
 *
 * Server actions and API routes use `requireAdmin()` from `@/lib/auth` instead, which
 * throws — the layout never runs for those.
 */
export async function guardPage(
  permission?: Permission,
): Promise<{ ok: true; user: AdminUser } | { ok: false; screen: React.ReactNode }> {
  const result = await checkAdmin(permission);
  if (result.ok) return { ok: true, user: result.user };
  return {
    ok: false,
    screen: result.reason === "forbidden" ? <Forbidden email={result.email} /> : <NoAccess email={result.email} />,
  };
}

export function NoAccess({ email }: { email: string | null }) {
  return (
    <div className="max-w-[560px]">
      <h1 className="display" style={{ fontSize: 30 }}>
        You don&rsquo;t have access yet
      </h1>
      {email ? (
        <p className="mt-4 text-[17px]">
          You&rsquo;re signed in as <strong>{email}</strong>, but that address hasn&rsquo;t been
          added to this site&rsquo;s admin.
        </p>
      ) : (
        <p className="mt-4 text-[17px]">We couldn&rsquo;t tell who you are. Try signing in again.</p>
      )}
      <p className="mt-4 text-[17px]" style={{ color: "var(--muted)" }}>
        Ask the owner to add you on the Team page. If that&rsquo;s you, email{" "}
        <a href={business.emailHref} className="link">
          {business.email}
        </a>
        .
      </p>
      <p className="mt-6">
        <Link href="/" className="link">
          Back to the site
        </Link>
      </p>
    </div>
  );
}

export function Forbidden({ email }: { email: string | null }) {
  return (
    <div className="max-w-[560px]">
      <h1 className="display" style={{ fontSize: 30 }}>
        Owners only
      </h1>
      <p className="mt-4 text-[17px]">
        This page is limited to owners{email ? <> — you&rsquo;re signed in as <strong>{email}</strong></> : null}.
      </p>
      <p className="mt-4 text-[17px]" style={{ color: "var(--muted)" }}>
        An owner can change your role on the Team page.
      </p>
      <p className="mt-6">
        <Link href="/admin/inquiries" className="link">
          Back to inquiries
        </Link>
      </p>
    </div>
  );
}
