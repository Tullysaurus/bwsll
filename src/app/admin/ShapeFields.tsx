import type { Group } from "@/lib/shape-form";

/**
 * Renders the fields that `groupsOf()` derived from a content object. Every input is
 * named by its path, which is how `parseShape()` puts the object back together.
 */
export function ShapeFields({ groups }: { groups: Group[] }) {
  return (
    <>
      {groups.map((group) => (
        <fieldset key={group.title} className="mt-10 border-0 p-0 first:mt-0">
          <legend className="display" style={{ fontSize: 22 }}>
            {group.title}
          </legend>
          <div className="mt-4 grid gap-5">
            {group.fields.map((field) => (
              <div key={field.path}>
                <label htmlFor={field.path} className="field-label">
                  {field.label}
                </label>
                {field.kind === "text" ? (
                  <input id={field.path} name={field.path} className="field-input" defaultValue={field.value} />
                ) : (
                  <textarea
                    id={field.path}
                    name={field.path}
                    rows={field.kind === "lines" ? Math.max(3, field.value.length + 1) : 3}
                    className="field-input"
                    defaultValue={field.kind === "lines" ? field.value.join("\n") : field.value}
                  />
                )}
                {field.kind === "lines" ? (
                  <p className="field-hint">One per line. Blank lines are ignored.</p>
                ) : null}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}
