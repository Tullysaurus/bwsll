import type { SimpleItem, SizedTable } from "@/content/menu";

/** §5.2.4 — a two-size price table with real table semantics. */
export function MenuTable({ table }: { table: SizedTable }) {
  return (
    <table className="price-table" id={table.id}>
      <caption className="sr-only">{table.title} drinks</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="h2 block" style={{ fontSize: 40 }}>
              {table.title}
            </span>
          </th>
          {table.sizes.map((size) => (
            <th key={size} scope="col" className="num size-label">
              {size}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.items.map((item) => (
          <tr key={item.name}>
            <th scope="row" style={{ fontWeight: 400 }}>
              {item.name}
            </th>
            <td className="num">{item.prices[0]}</td>
            <td className="num">{item.prices[1]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Single-price list used by Espresso and Food. */
export function SimpleTable({
  id,
  title,
  items,
  headingSize = 36,
}: {
  id?: string;
  title: string;
  items: SimpleItem[];
  headingSize?: number;
}) {
  return (
    <table className="price-table" id={id}>
      <caption className="text-left">
        <h3 className="display pb-3" style={{ fontSize: headingSize, borderBottom: "1px solid var(--ink)" }}>
          {title}
        </h3>
      </caption>
      <tbody>
        {items.map((item) => (
          <tr key={item.name}>
            <th scope="row" style={{ fontWeight: 400 }}>
              {item.name}
            </th>
            <td className="num">{item.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
