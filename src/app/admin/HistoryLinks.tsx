import Link from "next/link";
import { SETTING_LABEL } from "@/lib/history-format";

/** "Past versions: Opening hours" — every editable setting keeps its own history. */
export function HistoryLinks({ keys }: { keys: string[] }) {
  return (
    <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
      <span style={{ color: "var(--muted)" }}>Past versions:</span>
      {keys.map((key) => (
        <Link key={key} href={`/admin/history/setting/${key}`} className="link" style={{ fontSize: 14 }}>
          {SETTING_LABEL[key] ?? key.replace(/_/g, " ")}
        </Link>
      ))}
    </p>
  );
}
