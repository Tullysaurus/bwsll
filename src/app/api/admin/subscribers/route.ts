import { requireAdmin } from "@/lib/auth";
import { listSubscribers } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * CSV export for the admin subscribers screen. The proxy proves identity; this route
 * checks authorization itself, because route handlers never render the admin layout.
 */
export async function GET() {
  await requireAdmin();
  const rows = await listSubscribers();
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = [
    "email,source,created_at",
    ...rows.map((row) => [row.email, row.source ?? "", row.created_at].map(escape).join(",")),
  ].join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="liquid-lounge-subscribers.csv"',
      "cache-control": "no-store",
    },
  });
}
