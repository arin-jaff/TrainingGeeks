"use client";

import { useRouter } from "next/navigation";
import type { WellnessType } from "@/lib/metrics/wellness";

export default function TypeSelect({
  types,
  selected,
}: {
  types: WellnessType[];
  selected: string;
}) {
  const router = useRouter();
  const groups = [...new Set(types.map((t) => t.group))];
  return (
    <select
      value={selected}
      onChange={(e) => router.push(`/metrics?type=${e.target.value}`)}
      className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-accent"
    >
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {types
            .filter((t) => t.group === g)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
