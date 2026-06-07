"use client";

import { saveSettings } from "@/app/actions/settings";

export interface PrefField {
  name: string;
  label: string;
  type: "toggle" | "select" | "number" | "text";
  options?: string[];
  default?: string; // "1"/"0" for toggles
}

const input =
  "rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent";

export default function PrefsForm({
  title,
  section,
  fields,
  prefs,
}: {
  title: string;
  section: string;
  fields: PrefField[];
  prefs: Record<string, string>;
}) {
  const raw = (f: PrefField) => prefs[`${section}.${f.name}`] ?? f.default ?? "";
  const checked = (f: PrefField) =>
    (prefs[`${section}.${f.name}`] ?? f.default ?? "0") === "1";

  return (
    <form action={saveSettings} className="max-w-md">
      <input type="hidden" name="_section" value={section} />
      <input type="hidden" name="_fields" value={fields.map((f) => f.name).join(",")} />
      <h2 className="mb-4 border-b border-line pb-1 text-lg text-ink">{title}</h2>

      <div className="space-y-2">
        {fields.map((f) =>
          f.type === "toggle" ? (
            <label
              key={f.name}
              className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm text-ink"
            >
              <span>{f.label}</span>
              <input
                type="checkbox"
                name={f.name}
                defaultChecked={checked(f)}
                className="h-4 w-4 accent-accent"
              />
            </label>
          ) : (
            <div key={f.name} className="grid grid-cols-[160px_1fr] items-center gap-3">
              <span className="text-sm text-ink">{f.label}</span>
              {f.type === "select" ? (
                <select name={f.name} defaultValue={raw(f)} className={input}>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.name}
                  type={f.type}
                  defaultValue={raw(f)}
                  className={input}
                />
              )}
            </div>
          ),
        )}
      </div>

      <button className="mt-4 rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
        Save
      </button>
    </form>
  );
}
