import type { SignatureGroup } from "@/content/menu";
import { Eyebrow } from "./Typography";

/** §5.2.5 — four columns on green, each headed by a gold hairline. */
export function SignatureGrid({ groups }: { groups: SignatureGroup[] }) {
  return (
    <ul className="grid list-none gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
      {groups.map((group) => (
        <li key={group.group} style={{ borderTop: "1px solid var(--gold)", paddingTop: 22 }}>
          <Eyebrow gold as="h3">
            {group.group}
          </Eyebrow>
          <p className="mt-2 text-[14px]" style={{ color: "var(--green-soft-text)" }}>
            {group.prices.map((p) => `${p.size} ${p.price}`).join(" · ")}
          </p>
          <ul className="mt-5 flex list-none flex-col gap-3">
            {group.drinks.map((drink) =>
              drink.story ? (
                <li key={drink.name}>
                  <details>
                    <summary className="display cursor-pointer" style={{ fontSize: 28, color: "var(--paper)" }}>
                      {drink.name}
                    </summary>
                    <p className="mt-2 text-[15px]" style={{ color: "var(--green-soft-text)" }}>
                      {drink.story}
                    </p>
                  </details>
                </li>
              ) : (
                <li key={drink.name} className="display" style={{ fontSize: 28, color: "var(--paper)", lineHeight: 1.1 }}>
                  {drink.name}
                </li>
              ),
            )}
          </ul>
        </li>
      ))}
    </ul>
  );
}
