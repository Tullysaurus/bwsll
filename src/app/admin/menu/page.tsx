import Link from "next/link";
import { DirtyForm } from "../DirtyForm";
import { guardPage } from "../Guard";
import { HistoryLinks } from "../HistoryLinks";
import { saveMenu } from "../content-actions";
import { getMenu } from "@/lib/content";
import { drinksToText, featuredFrom, simpleItemsToText, sizedItemsToText } from "@/lib/menu-text";

export const dynamic = "force-dynamic";

function Lines({
  name,
  label,
  hint,
  value,
}: {
  name: string;
  label: string;
  hint: string;
  value: string;
}) {
  return (
    <div className="mt-4">
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        className="field-input"
        rows={Math.max(4, value.split("\n").length + 1)}
        defaultValue={value}
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 15 }}
      />
      <p className="field-hint">{hint}</p>
    </div>
  );
}

function Small({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input id={name} name={name} className="field-input" defaultValue={value} />
    </div>
  );
}

export default async function AdminMenuPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const menu = await getMenu();
  const featured = featuredFrom(menu);

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Menu
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        One drink per line, with a <strong>|</strong> between the name and each price. Add
        a line to add a drink, delete a line to remove it, move a line to reorder it.
        Start a line with <strong>*</strong> to show that drink on the home page.
      </p>
      <p className="mt-3 text-[15px]">
        <Link href="/menu" className="link" target="_blank">
          See the menu page
        </Link>{" "}
        ·{" "}
        <Link href="/admin/documents" className="link">
          The printable PDF
        </Link>
      </p>

      <div
        className="mt-5 rounded-[2px] p-4"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      >
        <p
          className="text-[13px] font-semibold uppercase"
          style={{ letterSpacing: "0.1em", color: "var(--muted)" }}
        >
          On the home page right now
        </p>
        <p className="mt-2 text-[16px]">
          {featured.length
            ? featured.map((item) => `${item.name} (${item.price})`).join(" · ")
            : "Nothing marked with * yet."}
        </p>
      </div>

      <DirtyForm action={saveMenu} className="mt-8" saveLabel="Save menu">
        {menu.sizedTables.map((table, index) => (
          <fieldset key={table.id} className="mt-10 border-0 p-0 first:mt-0">
            <legend className="display" style={{ fontSize: 22 }}>
              {table.title}
            </legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Small name={`table_${index}_title`} label="Section name" value={table.title} />
              <Small name={`table_${index}_size0`} label="Smaller size" value={table.sizes[0]} />
              <Small name={`table_${index}_size1`} label="Larger size" value={table.sizes[1]} />
            </div>
            <Lines
              name={`table_${index}_items`}
              label="Drinks"
              hint={`Name | ${table.sizes[0]} price | ${table.sizes[1]} price`}
              value={sizedItemsToText(table.items)}
            />
          </fieldset>
        ))}

        {menu.signatureGroups.map((group, index) => (
          <fieldset key={group.group} className="mt-10 border-0 p-0">
            <legend className="display" style={{ fontSize: 22 }}>
              {group.group}
            </legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
              <Small name={`sig_${index}_name`} label="Group name" value={group.group} />
              <Small name={`sig_${index}_size0`} label="Smaller size" value={group.prices[0].size} />
              <Small name={`sig_${index}_price0`} label="Its price" value={group.prices[0].price} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
              <span />
              <Small name={`sig_${index}_size1`} label="Larger size" value={group.prices[1].size} />
              <Small name={`sig_${index}_price1`} label="Its price" value={group.prices[1].price} />
            </div>
            <Lines
              name={`sig_${index}_drinks`}
              label="Drinks in this group"
              hint="One name per line. Add | and a sentence to tell the story behind it."
              value={drinksToText(group.drinks)}
            />
          </fieldset>
        ))}

        <fieldset className="mt-10 border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Espresso
          </legend>
          <Lines
            name="espresso"
            label="Items"
            hint="Name | price — e.g. Double shot | $2.79"
            value={simpleItemsToText(menu.espresso)}
          />
        </fieldset>

        <fieldset className="mt-10 border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Food
          </legend>
          <Lines
            name="food"
            label="Items"
            hint="Name | price — e.g. Muffins | $2.79"
            value={simpleItemsToText(menu.food)}
          />
        </fieldset>

        <fieldset className="mt-10 border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Flavor shots
          </legend>
          <div className="mt-4">
            <Small name="flavor_price" label="What a shot costs" value={menu.flavorShots.price} />
          </div>
          {menu.flavorShots.groups.map((group, index) => (
            <div key={group.label} className="mt-4">
              <Small name={`flavor_${index}_label`} label="Goes with" value={group.label} />
              <div className="mt-3">
                <label htmlFor={`flavor_${index}_items`} className="field-label">
                  Flavors
                </label>
                <textarea
                  id={`flavor_${index}_items`}
                  name={`flavor_${index}_items`}
                  className="field-input"
                  rows={3}
                  defaultValue={group.items}
                />
                <p className="field-hint">Separated by · (or commas — whatever you type is printed).</p>
              </div>
            </div>
          ))}
        </fieldset>
      </DirtyForm>

      <HistoryLinks keys={["menu"]} />
    </div>
  );
}
